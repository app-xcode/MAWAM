import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

// Converts the merchant's EMVCo static QRIS payload into a dynamic one.
// The merchant payload is configured as a Supabase secret, never in the app.
function createDynamicQris(staticPayload: string, amount: number, reference: string) {
  const clean = staticPayload.replace(/\s/g, "");
  if (!/^[\x20-\x7E]+$/.test(clean) || clean.length < 12 || !clean.endsWith("6304" + clean.slice(-4))) {
    throw new Error("QRIS_MERCHANT_PAYLOAD bukan payload QRIS EMVCo yang valid.");
  }
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Nominal QRIS tidak valid.");

  let payload = clean.slice(0, -8); // remove CRC tag and checksum
  const poi = payload.indexOf("0102");
  if (poi < 0) throw new Error("Tag Point of Initiation QRIS tidak ditemukan.");
  payload = `${payload.slice(0, poi)}010212${payload.slice(poi + 6)}`;

  // Remove any existing transaction amount / additional data template so a
  // configured static payload cannot override the order's amount/reference.
  const withoutDynamicFields: string[] = [];
  for (let i = 0; i < payload.length;) {
    const tag = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    const value = payload.slice(i + 4, i + 4 + length);
    if (!Number.isInteger(length) || value.length !== length) throw new Error("Format payload QRIS tidak valid.");
    if (tag !== "54" && tag !== "62") withoutDynamicFields.push(tlv(tag, value));
    i += 4 + length;
  }
  payload = withoutDynamicFields.join("");
  const amountTag = tlv("54", String(amount));
  const referenceTag = tlv("62", tlv("05", reference.slice(0, 25)));
  const countryIndex = payload.indexOf("5802ID");
  const dynamicPayload = countryIndex >= 0
    ? `${payload.slice(0, countryIndex)}${amountTag}${referenceTag}${payload.slice(countryIndex)}`
    : `${payload}${amountTag}${referenceTag}`;
  return `${dynamicPayload}6304${crc16(`${dynamicPayload}6304`)}`;
}

async function getAuthenticatedClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Sesi tidak ditemukan.");
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Sesi tidak valid.");
  return { client, user };
}

async function analyzeProof(signedUrl: string, amount: number, reference: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { verdict: "perlu_pemeriksaan_manual", confidence: null, reason: "AI belum dikonfigurasi; bukti menunggu pemeriksaan admin.", raw: null };
  const prompt = `Analisis bukti pembayaran Indonesia ini. Nominal yang diharapkan adalah Rp${amount} dan referensinya ${reference}. Bandingkan nominal, referensi, dan penerima bila terlihat. Jangan menyatakan pembayaran final. Balas JSON saja: {verdict: valid|tidak_valid|perlu_pemeriksaan_manual, confidence: 0..1, reason: string}.`;
  const result = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4.1-mini", input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: signedUrl }] }], text: { format: { type: "json_object" } } }),
  });
  if (!result.ok) throw new Error("AI tidak dapat memeriksa bukti pembayaran.");
  const raw = await result.json();
  const text = raw.output_text || "{}";
  const parsed = JSON.parse(text);
  const verdict = ["valid", "tidak_valid", "perlu_pemeriksaan_manual"].includes(parsed.verdict) ? parsed.verdict : "perlu_pemeriksaan_manual";
  return { verdict, confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, reason: String(parsed.reason || "Perlu pemeriksaan admin."), raw };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ success: false, message: "Method tidak diizinkan." }, 405);
  try {
    const { client, user } = await getAuthenticatedClient(req);
    const body = await req.json();
    const paymentId = String(body.paymentId || "");
    const { data: payment, error } = await client.from("mawam_payments").select("id, buyer_id, amount, reference, payment_method, bank, verification_status").eq("id", paymentId).single();
    if (error || !payment || payment.buyer_id !== user.id) return response({ success: false, message: "Pembayaran tidak ditemukan." }, 404);

    if (body.action === "details") {
      if (!["manual_transfer", "manual_qris"].includes(payment.payment_method)) return response({ success: false, message: "Bukan pembayaran manual." }, 400);
      const bankName = Deno.env.get("MANUAL_PAYMENT_BANK_NAME");
      const accountNumber = Deno.env.get("MANUAL_PAYMENT_ACCOUNT_NUMBER");
      const accountHolder = Deno.env.get("MANUAL_PAYMENT_ACCOUNT_HOLDER");
      if (!bankName || !accountNumber || !accountHolder) throw new Error("Rekening pembayaran manual belum dikonfigurasi.");
      const data: Record<string, unknown> = { amount: payment.amount, reference: payment.reference, verificationStatus: payment.verification_status, bank: { name: bankName, accountNumber, accountHolder } };
      if (payment.payment_method === "manual_qris") data.qrisPayload = createDynamicQris(Deno.env.get("QRIS_MERCHANT_PAYLOAD") || "", Number(payment.amount), payment.reference);
      return response({ success: true, data });
    }

    if (body.action === "verify-proof") {
      if (!["manual_transfer", "manual_qris"].includes(payment.payment_method)) return response({ success: false, message: "Bukti hanya untuk pembayaran manual." }, 400);
      const proofId = String(body.proofId || "");
      const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: proof, error: proofError } = await service.from("mawam_payment_proofs").select("id, storage_path, buyer_id").eq("id", proofId).eq("payment_id", payment.id).single();
      if (proofError || !proof || proof.buyer_id !== user.id) return response({ success: false, message: "Bukti pembayaran tidak ditemukan." }, 404);
      const { count, error: countError } = await service.from("mawam_payment_proofs").select("id", { count: "exact", head: true }).eq("payment_id", payment.id);
      if (countError) throw countError;
      if ((count ?? 0) > 3) return response({ success: false, message: "Maksimal upload bukti pembayaran adalah 3 kali." }, 400);
      const { data: signed, error: signedError } = await service.storage.from("payment-proofs").createSignedUrl(proof.storage_path, 300);
      if (signedError || !signed?.signedUrl) throw new Error("Bukti pembayaran tidak dapat diakses.");
      const ai = await analyzeProof(signed.signedUrl, Number(payment.amount), payment.reference);
      await service.from("mawam_payment_proofs").update({ status: "menunggu_verifikasi_admin", ai_verdict: ai.verdict, ai_confidence: ai.confidence, ai_reason: ai.reason, ai_raw: ai.raw }).eq("id", proof.id);
      await service.from("mawam_payments").update({ verification_status: "menunggu_verifikasi_admin", verification_updated_at: new Date().toISOString() }).eq("id", payment.id);
      return response({ success: true, data: ai });
    }

    if (body.action === "admin-review") {
      const allowedAdmins = (Deno.env.get("MANUAL_PAYMENT_ADMIN_USER_IDS") || "").split(",").map((id) => id.trim()).filter(Boolean);
      if (!allowedAdmins.includes(user.id)) return response({ success: false, message: "Hanya admin pembayaran yang dapat mengonfirmasi." }, 403);
      const proofId = String(body.proofId || "");
      const approved = body.approved === true;
      const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: proof, error: proofError } = await service.from("mawam_payment_proofs").select("id").eq("id", proofId).eq("payment_id", payment.id).single();
      if (proofError || !proof) return response({ success: false, message: "Bukti pembayaran tidak ditemukan." }, 404);
      const { data: latestProof } = await service.from("mawam_payment_proofs").select("id").eq("payment_id", payment.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (latestProof?.id !== proof.id) return response({ success: false, message: "Hanya bukti pembayaran terbaru yang dapat diputuskan." }, 409);
      const now = new Date().toISOString();
      await service.from("mawam_payment_proofs").update({ status: approved ? "dikonfirmasi" : "ditolak", reviewed_by: user.id, reviewed_at: now }).eq("id", proof.id);
      await service.from("mawam_payments").update({ verification_status: approved ? "dikonfirmasi" : "ditolak", verification_updated_at: now, ...(approved ? { status: "paid", paid_at: now } : {}) }).eq("id", payment.id);
      if (approved) await service.from("mawam_orders").update({ status: "paid" }).eq("payment_id", payment.id).eq("status", "pending_payment");
      return response({ success: true });
    }
    return response({ success: false, message: "Aksi tidak valid." }, 400);
  } catch (error) {
    return response({ success: false, message: error instanceof Error ? error.message : "Terjadi kesalahan." }, 500);
  }
});
