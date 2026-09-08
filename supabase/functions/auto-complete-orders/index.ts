import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method tidak diizinkan." }), { status: 405, headers });
  }

  try {
    const now = new Date().toISOString();
    const { data: eligible, error: findError } = await supabase
      .from("mawam_orders")
      .select("id,status,delivered_at,auto_complete_at")
      .not("auto_complete_at", "is", null)
      .lte("auto_complete_at", now)
      .not("delivered_at", "is", null)
      .not("status", "in", "(completed,cancelled,canceled)");

    if (findError) throw findError;

    if (!eligible?.length) {
      return new Response(JSON.stringify({ success: true, completed: 0, skipped: 0, message: "Tidak ada pesanan yang perlu diselesaikan otomatis." }), { status: 200, headers });
    }

    const ids = eligible.map((row) => row.id);
    const completedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("mawam_orders")
      .update({ status: "completed", completed_time: completedAt, updated_at: completedAt })
      .in("id", ids)
      .not("status", "in", "(completed,cancelled,canceled)")
      .select("id,status");

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      completed: updated?.length ?? 0,
      skipped: ids.length - (updated?.length ?? 0),
      order_ids: (updated ?? []).map((row) => row.id),
    }), { status: 200, headers });
  } catch (error: any) {
    console.error("auto-complete-orders error:", error);
    return new Response(JSON.stringify({ success: false, message: error?.message ?? "Gagal menyelesaikan pesanan otomatis." }), { status: 500, headers });
  }
});
