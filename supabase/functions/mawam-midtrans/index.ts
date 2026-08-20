import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const auth = btoa(`${serverKey}:`);


async function loadPayment(paymentId) {
  const { data: payment, error } = await supabase
    .from("mawam_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (error) throw error;
  return payment ?? {};
}

async function cekStatus(midtrans_order_id, paymentId) {
  const res = await fetch(
    `https://api.sandbox.midtrans.com/v2/${midtrans_order_id}/status`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  const result = await res.json();
  console.log('Result Status');
  console.log(result);
  const payment = await loadPayment(paymentId);
  const va = result.va_numbers?.[0];
  const qr_string = result.qr_string;
  await supabase
    .from("mawam_payments")
    .update({
      payment_method: result.payment_type ?? payment.payment_method ?? "bank_transfer",
      status: getOrderStatus(result.transaction_status),
      expired_at: result.expiry_time,
      va_number: va?.va_number ?? payment.va_number ?? qr_string ?? null,
      bank: va?.bank ?? payment.bank ?? null,
      updated_at: new Date().toISOString(),
      paid_at: result.transaction_status == 'settlement' ? (result.settlement_time || result.transaction_time) : null
    })
    .eq("midtrans_order_id", midtrans_order_id);

  let status = "pending";
  status = result.transaction_status;

  const payment2 = await loadPayment(paymentId);
  status = getOrderStatus(payment2.status);
  if (payment2 && status != "pending") {
    await supabase
      .from("mawam_orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", payment2.id);
  }


  return payment2;
}
async function handleCreatePayment(req) {

  const body = await req.json();
  console.log("Request")
  console.log(body)
  const { paymentId, payment_type, bank } = body;
  let payload = {};

  const item_details: any[] = [];

  const payment = await loadPayment(paymentId);

  if (!payment?.id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Payment tidak ditemukan atau ID invalid",
      }),
      { status: 400 }
    );
  }

  if ((payment?.midtrans_order_id && payment?.status === "pending") || payment?.status !== "pending") {
    return new Response(
      JSON.stringify({
        success: true,
        data: await cekStatus(payment.midtrans_order_id, paymentId),
        message: "Already created, reuse existing payment",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  if (payment) {
    const {
      data: { user },
      error: error2,
    } = await supabase.auth.admin.getUserById(payment.buyer_id);
    if (error2) throw error2;
    const { data: orders, error: error3 } = await supabase
      .from("mawam_orders")
      .select(`
            *,
            mawam_order_items(
              *,
              mawam_produk(
                id,
                nama_produk,
                harga
              )
            ),
            mawam_profile:buyer_id(
              nama,
              no_hp
            )
          `)
      .eq("payment_id", payment.id);

    if (error3) throw error3;
    if (orders) {
      for (const order of orders) {
        for (const item of order.mawam_order_items) {

          item_details.push({
            id: item.produk_id,
            price: item.price ?? item.subtotal ?? 0,
            quantity: item.qty,
            name: item.mawam_produk?.nama_produk?.substring(0, 50),
          });
        }
        if (order.discount && order.discount != 0) {
          item_details.push({
            "id": "DISCOUNT",
            "name": "Diskon",
            "price": -order.discount,
            "quantity": 1
          });
        }
        if (order.shipping && order.shipping != 0) {
          item_details.push({
            "id": "SHIPPING",
            "name": "Ongkos Kirim",
            "price": order.shipping,
            "quantity": 1
          });
        }
      }
      const gross_amount = item_details.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
      payload = {
        payment_type: payment_type ?? "bank_transfer",
        transaction_details: {
          order_id: payment.reference,
          gross_amount,
        },
        bank_transfer: bank != 'qris' || payment_type == 'bank_transfer' ? {
          bank: bank || "bri",
        } : null,
        customer_details: {
          first_name: orders[0]?.mawam_profile?.nama ?? "Customer",
          email: user?.email ?? undefined,
          phone: orders[0]?.mawam_profile?.no_hp ?? undefined,
        },
        item_details,
      };

    }
  }

  console.log('Playload');
  console.log(payload);

  const midtransRes = await fetch(
    "https://api.sandbox.midtrans.com/v2/charge",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    }
  );

  const result = await midtransRes.json();
  console.log('Result');
  console.log(result);

  const va = result.va_numbers?.[0];
  const qr_string = result.qr_string;

  if (result) {
    await supabase
      .from("mawam_payments")
      .update({
        payment_method: result.payment_type ?? payment.payment_method ?? "bank_transfer",
        midtrans_order_id: result.transaction_id,
        status: getOrderStatus(result.transaction_status),
        expired_at: result.expiry_time,
        va_number: va?.va_number ?? payment.va_number ?? qr_string ?? null,
        bank: va?.bank ?? payment.bank ?? bank ?? null,
      })
      .eq("id", payment.id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: await loadPayment(paymentId),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processed"
  | "shipped"
  | "completed"
  | "cancelled";

function getOrderStatus(transaction_status: string): OrderStatus {
  switch (transaction_status) {
    case "settlement":
    case "capture":
      return "paid";

    case "pending":
      return "pending_payment";

    case "expire":
    case "cancel":
    case "deny":
      return "cancelled";

    default:
      return "pending_payment";
  }
}


function bulatkanKeKelipatanLima(angka: number) {
  const integer = Math.ceil(angka);
  const sisa = integer % 10;

  if (sisa >= 1 && sisa <= 2) {
    return integer - sisa;
  } else if (sisa >= 3 && sisa <= 6) {
    return integer - sisa + 5;
  } else if (sisa >= 7 && sisa <= 9) {
    return integer - sisa + 10;
  }

  return integer;
}

function hitungDimensiBawang(berat: number) {
  if (berat <= 0) {
    return {
      length: 0,
      width: 0,
      height: 0,
    };
  }

  const faktorSkala = Math.cbrt(berat);

  const widthDasar = 15;
  const lengthDasar = 20;
  const heightDasar = 10;

  return {
    length: bulatkanKeKelipatanLima(lengthDasar * faktorSkala),
    width: bulatkanKeKelipatanLima(widthDasar * faktorSkala),
    height: bulatkanKeKelipatanLima(heightDasar * faktorSkala),
  };
}

async function handleWebhook(req: Request) {
  const body = await req.json();
  console.log('Webhook')
  console.log(body)
  const {
    order_id,
    transaction_status,
    payment_type,
    fraud_status,
    settlement_time,
    transaction_time
  } = body;

  let status = getOrderStatus(transaction_status)

  // update payment
  await supabase
    .from("mawam_payments")
    .update({
      status,
      payment_method: payment_type,
      paid_at: settlement_time ?? transaction_time
    })
    .eq("reference", order_id);

  const { data: payment3 } = await supabase
    .from("mawam_payments")
    .select("id")
    .eq("reference", order_id)
    .single();
  status = getOrderStatus(transaction_status);
  if (payment3 && status != "pending") {
    await supabase
      .from("mawam_orders")
      .update({
        status,
      })
      .eq("payment_id", payment3.id);
  }
  if (status == "paid") {

    const { data: order } = await supabase
      .from("mawam_orders")
      .select(`
    *,
    seller:mawam_profile!seller_id(
      *,
      toko:mawam_toko(*)
    ),
    pengiriman:mawam_pengiriman(*),
    items:mawam_order_items(
      *,
      produk:mawam_produk(*)
    )
  `)
      .eq("payment_id", payment3.id)
      .single();

    let bodys: {};

    if (!order) {
      console.log('Data order null');
    } else {
      const seller = order.seller;
      const shipping = order.pengiriman[0];

      if (shipping.biteship_draft_id == null) {
        bodys = {
          type: "draft_order",
          data: {

            reference_id: order.id,
            shipper_contact_name: seller.nama,
            shipper_contact_phone: seller.no_hp,
            // shipper_contact_email: seller.email,
            shipper_organization: seller.toko[0]?.nama_toko,

            origin_contact_name: seller.nama,
            origin_contact_phone: seller.no_hp,
            origin_address: seller.alamat,
            origin_postal_code: shipping.origin,

            destination_contact_name: shipping.penerima,
            destination_contact_phone: shipping.telepon_penerima,
            destination_address: shipping.alamat_penerima,
            destination_postal_code: shipping.destination,

            courier_company: shipping.courier_code,
            courier_type: shipping.type,

            delivery_type: "now",

            items: order.items.map((item: any) => {

              const dimensi = hitungDimensiBawang(shipping.weight / 1000);

              return {

                name: item.produk.nama_produk,

                description:
                  item.produk.deskripsi?.length ? item.produk.deskripsi :
                    `${item.produk.nama_produk}, total berat ${item.qty} ${item.produk.satuan}`,

                value: item.subtotal,

                // quantity: item.qty,

                weight: shipping.weight,
                length: dimensi.length,
                width: dimensi.width,
                height: dimensi.height,
                // category:'Bahan Makanan'

              };
            }),

          },
        };
        const response = await fetch(
          "https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/biteship",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bodys),
          }
        );
        const result = await response.json();

        if (result && result.success) {
          const draft = result.data;

          const { error: updateError } = await supabase
            .from("mawam_pengiriman")
            .update({
              biteship_draft_id: draft.id,
              biteship_status: draft.status,
              biteship_invoice_id: draft.invoice_id,
              draft_ready_at: draft.ready_at,
              draft_price: draft.price,
            })
            .eq("order_id", order.id);

          if (updateError) {
            console.error("Gagal menyimpan draft Biteship:", updateError);
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", } });
      }


    }
  }



  return new Response(JSON.stringify({ success: true }), { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", } });
}

Deno.serve(async (req) => {
  try {
    // Handle preflight request
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    const url = new URL(req.url);
    // 1. WEBHOOK dari Midtrans
    console.log(req.method);
    console.log(req.headers.get("user-agent"));
    if (req.method === "POST"
      && req.headers.get("user-agent")?.includes("Veritrans")
    ) {
      return handleWebhook(req);
    }
    // 2. CREATE PAYMENT dari app
    return handleCreatePayment(req);

  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        message: err.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});