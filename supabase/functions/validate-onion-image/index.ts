import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Sesi tidak ditemukan.");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Konfigurasi Supabase belum lengkap.");

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) throw new Error("Sesi tidak valid.");
  return user;
}

function isUserTempPath(storagePath: string, userId: string) {
  const expectedPrefix = `temp/${userId}/`;
  return storagePath.startsWith(expectedPrefix) && !storagePath.includes("..");
}

async function analyzeOnionImage(signedUrl: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY belum dikonfigurasi.");

  const prompt = `
Tugas Anda adalah memvalidasi apakah gambar merupakan PRODUK BAWANG MERAH.

Yang BOLEH diterima:
- bawang merah Indonesia / shallot berkulit
- bawang merah yang sudah dikupas
- satu atau banyak bawang merah
- bawang merah di dalam karung, keranjang, wadah, atau tumpukan, selama bawang merah cukup terlihat untuk diidentifikasi

Yang HARUS ditolak:
- bawang putih
- bawang bombay / onion biasa / varietas bawang selain bawang merah
- daun bawang / spring onion
- tomat, cabai, kentang, sayuran atau buah lain
- orang, wajah, hewan, kendaraan, pemandangan, dan objek yang tidak relevan
- screenshot, dokumen, nota, poster, gambar aplikasi, atau gambar non-produk
- gambar yang terlalu blur, terlalu gelap, terlalu kecil, tertutup, atau ambigu sehingga bawang merah tidak dapat dipastikan

PENTING:
- Jangan mempercayai nama file, metadata, atau konteks teks.
- Bedakan bawang merah dari bawang bombay dan bawang putih berdasarkan tampilan objek pada gambar.
- Jika objek tidak dapat dipastikan sebagai bawang merah, anggap TIDAK VALID.
- Jangan menebak.

Balas JSON saja dengan format:
{
  "valid": true atau false,
  "confidence": angka 0 sampai 1,
  "reason": "alasan singkat"
}
`;

  const result = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: signedUrl },
          ],
        },
      ],
      text: { format: { type: "json_object" } },
    }),
  });

  if (!result.ok) {
    const errorText = await result.text();
    console.error("OpenAI validation error:", errorText);
    throw new Error("AI tidak dapat memeriksa gambar.");
  }

  const raw = await result.json();
  const text = raw.output_text || "{}";
  const parsed = JSON.parse(text);

  return {
    valid: parsed.valid === true,
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0,
    reason: String(parsed.reason || "Gambar tidak dapat divalidasi."),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response(
      { success: false, message: "Method tidak diizinkan." },
      405,
    );
  }

  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const storagePath = String(body.storagePath || "").trim();

    if (!storagePath) {
      return response(
        { success: false, message: "storagePath wajib dikirim." },
        400,
      );
    }

    if (!isUserTempPath(storagePath, user.id)) {
      return response(
        { success: false, message: "Path gambar tidak diizinkan." },
        403,
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Konfigurasi server Supabase belum lengkap.");
    }

    const service = createClient(supabaseUrl, serviceRoleKey);
    const bucket = service.storage.from("mawam");

    const { data: signed, error: signedError } = await bucket.createSignedUrl(
      storagePath,
      300,
    );

    if (signedError || !signed?.signedUrl) {
      throw new Error("Gambar sementara tidak dapat diakses.");
    }

    const ai = await analyzeOnionImage(signed.signedUrl);

    if (!ai.valid) {
      const { error: deleteError } = await bucket.remove([storagePath]);
      if (deleteError) {
        console.error("Gagal menghapus gambar tidak valid:", deleteError);
      }

      return response({
        success: true,
        data: {
          valid: false,
          confidence: ai.confidence,
          reason: ai.reason,
          deleted: !deleteError,
        },
      });
    }

    return response({
      success: true,
      data: {
        valid: true,
        confidence: ai.confidence,
        reason: ai.reason,
        storagePath,
        deleted: false,
      },
    });
  } catch (error) {
    console.error("validate-onion-image error:", error);
    return response(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memvalidasi gambar.",
      },
      500,
    );
  }
});
