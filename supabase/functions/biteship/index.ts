import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "./utils/response.ts";
import { getCache, saveCache } from "./_shared/cache.ts";
import { getRates, getTracking, getLocations, createDraftOrder, confirmDraftOrder } from "./_shared/biteship.ts";

const ONGKIR_EXPIRE = 24 * 60 * 60 * 1000;
const RESI_EXPIRE = 30 * 60 * 1000;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SIGNATURE_KEY = Deno.env.get("BITESHIP_WEBHOOK_SIGNATURE_KEY");
const WEBHOOK_SIGNATURE_SECRET = Deno.env.get("BITESHIP_WEBHOOK_SIGNATURE_SECRET");

const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function getWebhookEvent(body: any) {
  return body?.event ?? body?.type ?? body?.data?.event ?? "";
}

function getWebhookData(body: any) {
  return body?.data && typeof body.data === "object" ? body.data : body;
}

function getBiteshipOrderId(data: any) {
  return data?.order_id ?? data?.id ?? data?.data?.order_id ?? data?.data?.id ?? null;
}

function getWaybillId(data: any) {
  return data?.courier_waybill_id
    ?? data?.waybill_id
    ?? data?.courier?.waybill_id
    ?? data?.courier?.waybillId
    ?? null;
}

function getPrice(data: any) {
  const value = data?.price ?? data?.shipping_price ?? data?.courier?.price ?? null;
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getStatus(data: any) {
  return data?.status ?? data?.order_status ?? null;
}

function getWebhookSignature(req: Request) {
  if (!WEBHOOK_SIGNATURE_KEY) return null;
  return req.headers.get(WEBHOOK_SIGNATURE_KEY);
}

async function verifyWebhook(req: Request) {
  if (!WEBHOOK_SIGNATURE_KEY || !WEBHOOK_SIGNATURE_SECRET) return true;
  return getWebhookSignature(req) === WEBHOOK_SIGNATURE_SECRET;
}

async function findShipment(orderId: string) {
  if (!admin || !orderId) return null;

  const byBiteship = await admin
    .from("mawam_pengiriman")
    .select("id,order_id,biteship_order_id,biteship_draft_id,biteship_status,tracking_number,shipping_cost,draft_price")
    .eq("biteship_order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (byBiteship.data) return byBiteship.data;
  if (byBiteship.error) throw byBiteship.error;

  const byDraft = await admin
    .from("mawam_pengiriman")
    .select("id,order_id,biteship_order_id,biteship_draft_id,biteship_status,tracking_number,shipping_cost,draft_price")
    .eq("biteship_draft_id", orderId)
    .limit(1)
    .maybeSingle();

  if (byDraft.error) throw byDraft.error;
  return byDraft.data;
}

async function handleWebhook(req: Request, body: any) {
  if (!admin) {
    return jsonResponse({ success: false, message: "Konfigurasi Supabase server belum tersedia." }, 500);
  }

  if (!(await verifyWebhook(req))) {
    return jsonResponse({ success: false, message: "Signature webhook tidak valid." }, 401);
  }

  const event = getWebhookEvent(body);
  const data = getWebhookData(body);
  const orderId = getBiteshipOrderId(data);

  if (!["order.status", "order.waybill_id", "order.price"].includes(event)) {
    return jsonResponse({ success: true, ignored: true, event });
  }

  if (!orderId) {
    return jsonResponse({ success: false, message: "Biteship order_id tidak ditemukan." }, 400);
  }

  const shipment = await findShipment(orderId);
  if (!shipment) {
    return jsonResponse({ success: true, ignored: true, reason: "shipment_not_found", order_id: orderId });
  }

  const patch: Record<string, any> = {};
  const historyStatus = event === "order.status" ? getStatus(data) : null;
  const waybill = getWaybillId(data);
  const price = getPrice(data);

  if (event === "order.status" && historyStatus) {
    patch.biteship_status = String(historyStatus);
  }

  if (event === "order.waybill_id" && waybill) {
    patch.tracking_number = String(waybill);
  }

  if (event === "order.price" && price !== null) {
    patch.shipping_cost = price;
    patch.draft_price = price;
  }

  if (Object.keys(patch).length) {
    const { error } = await admin
      .from("mawam_pengiriman")
      .update(patch)
      .eq("id", shipment.id);

    if (error) throw error;
  }

  if (event === "order.status" && historyStatus && shipment.biteship_status !== String(historyStatus)) {
    const note = data?.note ?? data?.courier?.note ?? `Status Biteship diperbarui menjadi ${historyStatus}.`;
    const { error } = await admin.from("mawam_pengiriman_lokasi").insert({
      pengiriman_id: shipment.id,
      status: `Biteship: ${String(historyStatus)}`,
      catatan: String(note),
      updated_by: null,
    });

    if (error) throw error;
  }

  return jsonResponse({
    success: true,
    event,
    order_id: orderId,
    pengiriman_id: shipment.id,
    updated: patch,
  });
}

async function handleRates(body: any) {
  const request = JSON.stringify(body);
  const cache = await getCache("ongkir_cache", request);

  if (cache && new Date(cache.expired_at) > new Date()) {
    return jsonResponse({ success: true, source: "cache", data: cache.response });
  }

  const response = await getRates(body);
  await saveCache("ongkir_cache", {
    cache_key: Date.now(),
    request,
    response,
    expired_at: new Date(Date.now() + ONGKIR_EXPIRE).toISOString(),
  });

  return jsonResponse({ success: true, source: "biteship", data: response });
}

async function handleLocations(body: any) {
  const response = await getLocations(body.keyword);
  return jsonResponse({ success: true, data: response });
}

export async function handleDraftOrder(data: any) {
  try {
    const result = await createDraftOrder(data);
    return jsonResponse({ success: true, data: result });
  } catch (e: any) {
    return jsonResponse({ success: false, message: e.message }, 400);
  }
}

export async function handleConfirmOrder(data: any) {
  const draftOrderId = data?.draft_order_id ?? data?.id;

  if (typeof draftOrderId !== "string" || !draftOrderId.trim()) {
    return jsonResponse({ success: false, message: "ID draft Biteship wajib diisi." }, 400);
  }

  try {
    const result = await confirmDraftOrder(draftOrderId);
    return jsonResponse({ success: true, data: result });
  } catch (e: any) {
    return jsonResponse({ success: false, message: e.message ?? "Gagal mengonfirmasi draft Biteship." }, 400);
  }
}

async function handleTracking(body: any) {
  const { courier, waybill } = body;
  const cacheKey = `${courier}-${waybill}`;
  const cache = await getCache("resi_cache", cacheKey);

  if (cache && new Date(cache.expired_at) > new Date()) {
    return jsonResponse({ success: true, source: "cache", data: cache.response });
  }

  const response = await getTracking(courier, waybill);
  await saveCache("resi_cache", {
    cache_key: cacheKey,
    courier,
    awb: waybill,
    response,
    expired_at: new Date(Date.now() + RESI_EXPIRE).toISOString(),
  });

  return jsonResponse({ success: true, source: "biteship", data: response });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Method tidak diizinkan." }, 405);
    }

    // Biteship validates a newly installed webhook by sending an empty
    // application/json POST. Accept it with 200 OK before parsing JSON.
    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return jsonResponse({ success: true, validation: true });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ success: false, message: "Body JSON tidak valid." }, 400);
    }

    if (body?.event === "order.status" || body?.event === "order.waybill_id" || body?.event === "order.price") {
      return await handleWebhook(req, body);
    }

    const { type, ...payload } = body;

    switch (type) {
      case "rates":
        return await handleRates(payload);
      case "location":
        return await handleLocations(payload);
      case "draft_order":
        return handleDraftOrder(body.data);
      case "confirm_order":
        return handleConfirmOrder(body.data);
      case "tracking":
        return await handleTracking(payload);
      default:
        return jsonResponse({ success: false, message: "Type tidak valid." }, 400);
    }
  } catch (err: any) {
    return jsonResponse({ success: false, message: err.message }, 500);
  }
});
