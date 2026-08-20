const API_KEY = Deno.env.get("BITESHIP_API_KEY_TEST");
const BASE_URL = "https://api.biteship.com/v2";
const V1_BASE_URL = "https://api.biteship.com/v1";

const headers = {
  Authorization: API_KEY!,
  "Content-Type": "application/json",
};
// Bearer ${Biteship_API_KEY}
// export async function getRates(payload: any) {
//   const res = await fetch(`${BASE_URL}/rates/couriers`, {
//     method: "POST",
//     headers,
//     body: JSON.stringify(payload),
//   });

//   return await parseBiteshipResponse(res);
// }

export async function getRates(payload: any) {
  const res = await fetch(
    `${BASE_URL}/rates/couriers?channel=web_dashboard`,
    {
      method: "POST",
      headers: {
        Authorization: API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body:JSON.stringify(payload)
      // body: JSON.stringify({
      //   origin_postal_code: payload.origin_postal_code,
      //   origin_country_id: "ID",
      //   destination_postal_code: payload.destination_postal_code,
      //   destination_country_id: "ID",
      //   couriers: payload.couriers,
      //   items: payload.items,
      // }),
    }
  );

  return await parseBiteshipResponse(res);
}

export async function getLocations(keyword: string) {
  const res = await fetch(
    `${BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(keyword)}&type=single`,
    {
      method: "GET",
      headers: {
        Authorization: API_KEY!,
      },
    }
  );

  return await parseBiteshipResponse(res);
}

export async function createDraftOrder(payload: any) {
  const res = await fetch(`${V1_BASE_URL}/draft_orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      draft: true,
    }),
  });

  console.log({
      ...payload,
      draft: true,
    });
  console.log(res);

  return await parseBiteshipResponse(res);
}

export async function confirmDraftOrder(draftOrderId: string) {
  if (!draftOrderId?.trim()) {
    throw new Error("ID draft Biteship wajib diisi.");
  }

  const res = await fetch(
    `${V1_BASE_URL}/draft_orders/${encodeURIComponent(draftOrderId)}/confirm`,
    {
      method: "POST",
      headers,
    },
  );

  return await parseBiteshipResponse(res);
}

export async function getTracking(courier: string, waybill: string) {
  const params = new URLSearchParams({
    courier,
    waybill_id: waybill,
  });

  const res = await fetch(`${BASE_URL}/trackings/${courier}/${waybill}`, {
    headers: {
      Authorization: API_KEY!,
    },
  });

  return await parseBiteshipResponse(res);
}

async function parseBiteshipResponse(res: Response) {
  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.error ||
      json?.message ||
      `Biteship Error (${res.status})`
    );
  }

  return json;
}
