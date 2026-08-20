import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const mayarApiKey = Deno.env.get("MAYAR_API_KEY")!;
const mayarApiUrl = Deno.env.get("MAYAR_API_URL") || "https://api.mayar.id/hl/v1";
const mayarWebhookSecret = Deno.env.get("MAYAR_WEBHOOK_SECRET")!;

async function loadPayment(paymentId: string) {
  const { data: payment, error } = await supabase
    .from("mawam_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (error) throw error;
  return payment ?? {};
}

async function cekStatus(mayarCheckoutId: string, paymentId: string) {
  const res = await fetch(`${mayarApiUrl}/checkouts/${mayarCheckoutId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${mayarApiKey}`,
      "Content-Type": "application/json",
    },
  });

  const result = await res.json();
  console.log("Mayar Status Check Result:");
  console.log(result);

  const payment = await loadPayment(paymentId);
  const orderStatus = getMayarOrderStatus(result.status);

  let vaNumber = null;
  let bankName = null;
  let paymentMethod = "bank_transfer";

  // Extract payment details from Mayar response
  if (result.payment_channels && result.payment_channels.length > 0) {
    const channel = result.payment_channels[0];
    if (channel.account_number) {
      vaNumber = channel.account_number;
      bankName = channel.bank_code;
    }
    if (channel.type) {
      paymentMethod = channel.type;
    }
  }

  // Handle QRIS
  if (result.qr_string || result.qr_image_url) {
    vaNumber = result.qr_string || result.qr_image_url;
    paymentMethod = "qris";
  }

  const paidAt = result.status === "paid" ? result.paid_at || new Date().toISOString() : null;

  await supabase
    .from("mawam_payments")
    .update({
      payment_method: paymentMethod,
      status: orderStatus,
      expired_at: result.expired_at,
      va_number: vaNumber,
      bank: bankName,
      updated_at: new Date().toISOString(),
      paid_at: paidAt,
    })
    .eq("id", paymentId);

  if (orderStatus !== "pending_payment") {
    await supabase
      .from("mawam_orders")
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", paymentId);
  }

  const updatedPayment = await loadPayment(paymentId);
  return updatedPayment;
}

async function handleCreatePayment(req: Request) {
  const body = await req.json();
  console.log("Create Payment Request:", body);

  const { paymentId, payment_type, bank } = body;
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

  // If payment already has checkout_id and is still pending, check status
  if (payment?.mayar_checkout_id && payment?.status === "pending_payment") {
    return new Response(
      JSON.stringify({
        success: true,
        data: await cekStatus(payment.mayar_checkout_id, paymentId),
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

  // If payment is not pending, return existing
  if (payment?.status !== "pending_payment") {
    return new Response(
      JSON.stringify({
        success: true,
        data: payment,
        message: "Payment already processed",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const {
    data: { user },
    error: error2,
  } = await supabase.auth.admin.getUserById(payment.buyer_id);
  if (error2) throw error2;

  const { data: orders, error: error3 } = await supabase
    .from("mawam_orders")
    .select(
      `
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
    `
    )
    .eq("payment_id", payment.id);

  if (error3) throw error3;
  if (!orders || orders.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Order tidak ditemukan",
      }),
      { status: 400 }
    );
  }

  // Build line items for Mayar
  const line_items: any[] = [];
  let totalAmount = 0;

  for (const order of orders) {
    for (const item of order.mawam_order_items) {
      const itemTotal = (item.price ?? item.subtotal ?? 0) * item.qty;
      line_items.push({
        name: item.mawam_produk?.nama_produk?.substring(0, 100) || "Item",
        quantity: item.qty,
        price: Math.round(item.price ?? item.subtotal ?? 0),
      });
      totalAmount += itemTotal;
    }

    if (order.discount && order.discount > 0) {
      totalAmount -= order.discount;
    }

    if (order.shipping && order.shipping > 0) {
      line_items.push({
        name: "Ongkos Kirim",
        quantity: 1,
        price: Math.round(order.shipping),
      });
      totalAmount += order.shipping;
    }
  }

  totalAmount = Math.max(0, totalAmount);

  const payload = {
    reference_id: payment.reference,
    email: user?.email || "customer@example.com",
    customer_name: orders[0]?.mawam_profile?.nama || "Customer",
    customer_phone: orders[0]?.mawam_profile?.no_hp || "",
    amount: Math.round(totalAmount),
    line_items,
    payment_channels: bank && bank !== "qris" ? [{ type: "bank_transfer", bank_code: bank }] : ["all"],
    expiration: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    notes: `Pembayaran untuk order ${payment.reference}`,
  };

  console.log("Mayar Payload:", payload);

  const mayarRes = await fetch(`${mayarApiUrl}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mayarApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await mayarRes.json();
  console.log("Mayar Create Checkout Response:", result);

  if (!result.id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: result.message || "Gagal membuat checkout Mayar",
        error: result,
      }),
      { status: 400 }
    );
  }

  // Extract payment details
  let vaNumber = null;
  let bankName = null;
  let paymentMethod = "bank_transfer";

  if (result.payment_channels && result.payment_channels.length > 0) {
    const channel = result.payment_channels[0];
    if (channel.account_number) {
      vaNumber = channel.account_number;
      bankName = channel.bank_code;
    }
    if (channel.type) {
      paymentMethod = channel.type;
    }
  }

  if (result.qr_string) {
    vaNumber = result.qr_string;
    paymentMethod = "qris";
  }

  // Update payment in database
  await supabase
    .from("mawam_payments")
    .update({
      mayar_checkout_id: result.id,
      payment_method: paymentMethod,
      status: "pending_payment",
      expired_at: result.expired_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      va_number: vaNumber,
      bank: bankName,
      payment_url: result.checkout_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  const updatedPayment = await loadPayment(paymentId);
  return new Response(
    JSON.stringify({
      success: true,
      data: updatedPayment,
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

function getMayarOrderStatus(mayarStatus: string): OrderStatus {
  switch (mayarStatus?.toLowerCase()) {
    case "paid":
    case "settlement":
    case "completed":
      return "paid";
    case "pending":
    case "waiting_payment":
      return "pending_payment";
    case "expired":
    case "cancelled":
    case "failed":
      return "cancelled";
    default:
      return "pending_payment";
  }
}

async function handleWebhook(req: Request) {
  const body = await req.json();
  console.log("Mayar Webhook:", body);

  const { data: checkout, reference_id, status, paid_at } = body;

  const orderStatus = getMayarOrderStatus(status);

  // Find payment by reference_id
  const { data: payment } = await supabase
    .from("mawam_payments")
    .select("id")
    .eq("reference", reference_id)
    .single();

  if (!payment) {
    console.log("Payment not found for reference:", reference_id);
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  }

  // Update payment status
  await supabase
    .from("mawam_payments")
    .update({
      status: orderStatus,
      paid_at: orderStatus === "paid" ? paid_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  // Update orders if payment is paid
  if (orderStatus === "paid") {
    await supabase
      .from("mawam_orders")
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", payment.id);

    // Handle shipping integration if payment is successful
    const { data: orders } = await supabase
      .from("mawam_orders")
      .select(
        `
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
      `
      )
      .eq("payment_id", payment.id);

    if (orders && orders.length > 0) {
      const order = orders[0];
      const shipping = order.pengiriman?.[0];

      if (shipping && !shipping.biteship_draft_id) {
        try {
          const dimensi = hitungDimensiBawang((shipping.weight || 1000) / 1000);

          const bodys = {
            type: "draft_order",
            data: {
              reference_id: order.id,
              shipper_contact_name: order.seller?.nama,
              shipper_contact_phone: order.seller?.no_hp,
              shipper_organization: order.seller?.toko?.[0]?.nama_toko,

              origin_contact_name: order.seller?.nama,
              origin_contact_phone: order.seller?.no_hp,
              origin_address: order.seller?.alamat,
              origin_postal_code: shipping.origin,

              destination_contact_name: shipping.penerima,
              destination_contact_phone: shipping.telepon_penerima,
              destination_address: shipping.alamat_penerima,
              destination_postal_code: shipping.destination,

              courier_company: shipping.courier_code,
              courier_type: shipping.type,

              delivery_type: "now",

              items: order.items.map((item: any) => ({
                name: item.produk?.nama_produk,
                description: item.produk?.deskripsi || item.produk?.nama_produk,
                value: item.subtotal,
                weight: shipping.weight,
                length: dimensi.length,
                width: dimensi.width,
                height: dimensi.height,
              })),
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

          if (result?.success && result?.data) {
            const draft = result.data;
            await supabase
              .from("mawam_pengiriman")
              .update({
                biteship_draft_id: draft.id,
                biteship_status: draft.status,
                biteship_invoice_id: draft.invoice_id,
                draft_ready_at: draft.ready_at,
                draft_price: draft.price,
              })
              .eq("order_id", order.id);
          }
        } catch (error) {
          console.error("Error processing shipping:", error);
        }
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
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

Deno.serve(async (req) => {
  try {
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

    // Handle Mayar webhook
    if (
      req.method === "POST" &&
      req.headers.get("user-agent")?.toLowerCase().includes("mayar")
    ) {
      return handleWebhook(req);
    }

    // Handle create payment
    return handleCreatePayment(req);
  } catch (err: any) {
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
