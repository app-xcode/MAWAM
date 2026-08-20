import { jsonResponse } from "./utils/response.ts";
import { getCache, saveCache } from "./_shared/cache.ts";
import { getRates, getTracking, getLocations, createDraftOrder, confirmDraftOrder } from "./_shared/biteship.ts";

const ONGKIR_EXPIRE = 24 * 60 * 60 * 1000;
const RESI_EXPIRE = 30 * 60 * 1000;

async function handleRates(body: any) {
  const request = JSON.stringify(body);

  const cache = await getCache("ongkir_cache", request);

  if (cache && new Date(cache.expired_at) > new Date()) {
    return jsonResponse({
      success: true,
      source: "cache",
      data: cache.response,
    });
  } else {

    const response = await getRates(body);
    // const response = {};

    await saveCache("ongkir_cache", {
      cache_key: Date.now(),
      request,
      response,
      expired_at: new Date(Date.now() + ONGKIR_EXPIRE).toISOString(),
    });

    return jsonResponse({
      success: true,
      source: "biteship",
      data: response,
    });
  }

}

async function handleLocations(body: any) {
  const response = await getLocations(body.keyword);

  return jsonResponse({
    success: true,
    data: response,
  });
}

export async function handleDraftOrder(data: any) {
  try {
    const result = await createDraftOrder(data);
    return jsonResponse({
      success: true,
      data: result,
    });
  } catch (e: any) {
    return jsonResponse({
      success: false,
      message: e.message,
    }, 400);
  }
}

export async function handleConfirmOrder(data: any) {
  const draftOrderId = data?.draft_order_id ?? data?.id;

  if (typeof draftOrderId !== "string" || !draftOrderId.trim()) {
    return jsonResponse({
      success: false,
      message: "ID draft Biteship wajib diisi.",
    }, 400);
  }

  try {
    const result = await confirmDraftOrder(draftOrderId);
    return jsonResponse({
      success: true,
      data: result,
    });
  } catch (e: any) {
    return jsonResponse({
      success: false,
      message: e.message ?? "Gagal mengonfirmasi draft Biteship.",
    }, 400);
  }
}

async function handleTracking(body: any) {
  const { courier, waybill } = body;

  const cacheKey = `${courier}-${waybill}`;

  const cache = await getCache("resi_cache", cacheKey);

  if (cache && new Date(cache.expired_at) > new Date()) {
    return jsonResponse({
      success: true,
      source: "cache",
      data: cache.response,
    });
  } else {
    const response = await getTracking(courier, waybill);

    await saveCache("resi_cache", {
      cache_key: cacheKey,
      courier,
      awb: waybill,
      response,
      request: cacheKey,
      expired_at: new Date(Date.now() + RESI_EXPIRE).toISOString(),
    });

    return jsonResponse({
      success: true,
      source: "biteship",
      data: response,
    });
  }


}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, message: "Method tidak diizinkan." },
        405
      );
    }

    const body = await req.json();
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
        return jsonResponse(
          { success: false, message: "Type tidak valid." },
          400
        );
    }
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        message: err.message,
      },
      500
    );
  }
});
