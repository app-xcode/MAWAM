import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const mayarApiKey = Deno.env.get("MAYAR_API_KEY_TEST")!;
const mayarApiUrl = Deno.env.get("MAYAR_API_URL_TEST") || "https://api.mayar.io/hl/v2";
const mayarWebhookSecret = Deno.env.get("MAYAR_WEBHOOK_SECRET_TEST")!;

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

    const { paymentId } = body;

    const payment = await loadPayment(paymentId);

    if (!payment?.id) {
        return new Response(
            JSON.stringify({
                success: false,
                message: "Payment tidak ditemukan atau ID invalid",
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }

    // Jika pembayaran sudah selesai, gunakan data yang ada
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

    // Ambil profile pembeli
    const {
        data: { user },
        error: error2,
    } = await supabase.auth.admin.getUserById(payment.buyer_id);

    if (error2) throw error2;

    // Ambil order
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

    if (!orders || orders.length === 0) {
        return new Response(
            JSON.stringify({
                success: false,
                message: "Order tidak ditemukan",
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }

    // =========================
    // BUILD ITEMS & CALCULATION
    // =========================

    const items: any[] = [];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalShipping = 0;

    for (const order of orders) {
        const discount = Number(order.discount ?? 0);

        totalDiscount += discount;

        // Total harga produk sebelum discount
        let orderProductTotal = 0;

        for (const item of order.mawam_order_items ?? []) {
            const quantity = Number(item.qty ?? 1);

            const rate = Math.round(
                Number(item.price ?? item.subtotal ?? 0)
            );

            if (rate <= 0) continue;

            orderProductTotal += rate * quantity;
        }

        // Hitung persentase discount terhadap produk
        const discountRate =
            orderProductTotal > 0
                ? discount / orderProductTotal
                : 0;

        // Produk setelah discount
        for (const item of order.mawam_order_items ?? []) {
            const quantity = Number(item.qty ?? 1);

            const originalRate = Math.round(
                Number(item.price ?? item.subtotal ?? 0)
            );

            if (originalRate <= 0) continue;

            const finalRate = Math.round(
                originalRate * (1 - discountRate)
            );

            items.push({
                quantity,
                rate: finalRate,
                description:
                    item.mawam_produk?.nama_produk?.substring(0, 100) ||
                    "Item",
            });

            subtotal += finalRate * quantity;
        }

        // Ongkos kirim TIDAK terkena discount
        const shipping = Number(order.shipping ?? 0);

        if (shipping > 0) {
            totalShipping += shipping;

            items.push({
                quantity: 1,
                rate: Math.round(shipping),
                description: "Ongkos Kirim",
            });
        }
    }

    const totalAmount = Math.max(
        0,
        Math.round(subtotal + totalShipping)
    );

    console.log("Payment Calculation:", {
        subtotal,
        totalShipping,
        totalDiscount,
        totalAmount,
    });

    // =========================
    // MAYAR PAYLOAD
    // =========================

    const payload = {
        name:
            orders[0]?.mawam_profile?.nama ||
            "Customer",

        email:
            user?.email ||
            "customer@example.com",

        mobile:
            orders[0]?.mawam_profile?.no_hp ||
            "",

        description:
            `Pembayaran untuk order ${payment.reference}`,

        expiredAt:
            new Date(
                Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),

        items,

        extraData: {
            paymentId: String(payment.id),
            reference: String(payment.reference),

            discount: String(totalDiscount),
            subtotal: String(subtotal),
            shipping: String(totalShipping),
            total: String(totalAmount),
        },
    };

    console.log("Mayar Payload:", payload);

    // =========================
    // CREATE MAYAR INVOICE
    // =========================

    const mayarRes = await fetch(
        `${mayarApiUrl}/invoices/create`,
        {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${mayarApiKey}`,

                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify(payload),
        }
    );

    const result = await mayarRes.json();

    console.log(
        "Mayar Invoice Response:",
        result
    );

    const invoice = result?.data;

    if (
        result?.statusCode !== 200 ||
        !invoice?.id ||
        !invoice?.link
    ) {
        return new Response(
            JSON.stringify({
                success: false,

                message:
                    result?.messages ||
                    "Gagal membuat invoice Mayar",

                error: result,
            }),
            {
                status: 400,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Access-Control-Allow-Origin":
                        "*",
                },
            }
        );
    }

    // =========================
    // UPDATE PAYMENT
    // =========================

    const { error: updateError } =
        await supabase
            .from("mawam_payments")
            .update({
                mayar_checkout_id:
                    invoice.id,

                payment_method:
                    "mayar",

                status:
                    "pending_payment",

                expired_at:
                    invoice.expiredAt,

                payment_url:
                    invoice.link,

                updated_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                payment.id
            );

    if (updateError) {
        console.error(
            "Update payment error:",
            updateError
        );

        throw updateError;
    }

    const updatedPayment =
        await loadPayment(paymentId);

    return new Response(
        JSON.stringify({
            success: true,
            data: updatedPayment,
        }),
        {
            headers: {
                "Content-Type":
                    "application/json",

                "Access-Control-Allow-Origin":
                    "*",
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
