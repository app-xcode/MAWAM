import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const mayarApiKey = Deno.env.get("MAYAR_API_KEY_TEST")!;
const mayarApiUrl = Deno.env.get("MAYAR_API_URL_TEST") || "https://api.mayar.io/hl/v2";
const mayarWebhookSecret = Deno.env.get("MAYAR_WEBHOOK_SECRET_TEST")!;

async function generateAmountUnik(amount: number) {
    for (let code = 1; code <= 999; code++) {
        const amountUnik = amount + code;

        const { data, error } = await supabase
            .from("mawam_payments")
            .select("id")
            .eq("amount_unik", amountUnik)
            .eq("status", "pending_payment")
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return amountUnik;
        }
    }

    throw new Error(
        "Tidak tersedia kode unik untuk nominal pembayaran ini."
    );
}

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
    const res = await fetch(
        `${mayarApiUrl}/invoices/${mayarCheckoutId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${mayarApiKey}`,
                "Content-Type": "application/json",
            },
        }
    );

    const result = await res.json();

    console.log("Mayar Status Check Result:");
    console.log(result);

    const payment = await loadPayment(paymentId);

    // Mayar SUCCESS = pembayaran berhasil
    const orderStatus = getMayarOrderStatus(result?.data?.status);

    let vaNumber = null;
    let bankName = null;
    let paymentMethod = "bank_transfer";


    const paidAt =
        result.data.status === "paid"
            ? new Date().toISOString()
            : null;

    const { error: paymentError } = await supabase
        .from("mawam_payments")
        .update({
            status: orderStatus,
            paid_at: paidAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

    if (paymentError) {
        console.error(
            "Update payment error:",
            paymentError
        );
        throw paymentError;
    }

    // Update order hanya jika sudah dibayar
    if (orderStatus === "paid") {
        const { error: orderError } = await supabase
            .from("mawam_orders")
            .update({
                status: "paid",
                updated_at: new Date().toISOString(),
            })
            .eq("payment_id", paymentId);

        if (orderError) {
            console.error(
                "Update order error:",
                orderError
            );
        }
    }

    return await loadPayment(paymentId);
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

                bank:
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


async function handleCreateQris(req: Request) {
    try {
        const body = await req.json();

        const {
            amount,
            paymentId,
        } = body;

        if (!amount) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "amount wajib diisi",
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

        const amountUnik = await generateAmountUnik(Number(amount));

        const response = await fetch(
            `${mayarApiUrl}/qr-codes/create`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${mayarApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: amountUnik,
                }),
            }
        );

        const result = await response.json();

        await supabase
            .from("mawam_payments")
            .update({
                amount_unik: amountUnik,
            })
            .eq("id", paymentId);

        console.log("Mayar QRIS:", result);

        if (!response.ok || result?.statusCode !== 200) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message:
                        result?.messages ||
                        "Gagal membuat QRIS Mayar",
                    data: result,
                }),
                {
                    status: response.status || 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        const qrUrl = result?.data?.url;

        if (!qrUrl) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "URL QRIS tidak ditemukan",
                    data: result,
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

        // Simpan QRIS ke payment
        if (paymentId) {
            const { error } = await supabase
                .from("mawam_payments")
                .update({
                    payment_url: qrUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", paymentId);

            if (error) {
                console.error(
                    "Gagal menyimpan QRIS:",
                    error
                );
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    url: qrUrl,
                    amount: result.data?.amount,
                },
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error: any) {
        console.error(
            "Create QRIS error:",
            error
        );

        return new Response(
            JSON.stringify({
                success: false,
                message: error.message,
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
}

function getMayarOrderStatus(status: string) {
    switch (status?.toUpperCase()) {
        case "SUCCESS":
            return "paid";

        case "PENDING":
            return "pending";

        case "FAILED":
        case "EXPIRED":
            return "failed";

        default:
            return status;
    }
}

async function handleWebhook(req: Request) {
    const body = await req.json();

    console.log("Mayar Webhook:", body);

    const event = body?.event;
    const data = body?.data;

    if (!data) {
        console.error("Invalid Mayar webhook: data tidak ditemukan");
        return new Response(
            JSON.stringify({ success: false, message: "Invalid webhook data" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    const status = data.status;
    const paidAt = data.updatedAt || new Date().toISOString();

    const paymentId = data.extraData?.paymentId;
    const reference = data.extraData?.reference;

    console.log("Mayar Event:", event);
    console.log("Mayar Status:", status);
    console.log("Mayar Payment ID:", paymentId);
    console.log("Mayar Reference:", reference);

    if (event != "payment.received") {
        console.log('Bukan terima pembayaran')
    }
    // Hanya proses pembayaran sukses
    const orderStatus = getMayarOrderStatus(status);

    // Cari payment berdasarkan ID internal terlebih dahulu
    let payment = null;

    if (paymentId) {
        const { data: paymentById, error } = await supabase
            .from("mawam_payments")
            .select("id, status")
            .eq("id", paymentId)
            .maybeSingle();

        if (error) {
            console.error("Error finding payment by ID:", error);
        }

        payment = paymentById;
    }

    // Fallback berdasarkan reference
    if (!payment && reference) {
        const { data: paymentByReference, error } = await supabase
            .from("mawam_payments")
            .select("id, status")
            .eq("reference", reference)
            .maybeSingle();

        if (error) {
            console.error("Error finding payment by reference:", error);
        }

        payment = paymentByReference;
    }

    if (!payment) {
        console.log(
            "Payment not found:",
            paymentId || reference
        );

        return new Response(
            JSON.stringify({
                success: false,
                message: "Payment not found",
            }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    // Hindari webhook duplicate
    if (payment.status === "paid") {
        console.log("Payment already paid:", payment.id);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Payment already processed",
            }),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    // Update payment
    const { error: paymentError } = await supabase
        .from("mawam_payments")
        .update({
            status: orderStatus,
            paid_at:
                orderStatus === "paid"
                    ? paidAt
                    : null,
            updated_at: new Date().toISOString(),
            payment_method: data?.paymentMethod,
            bank: data?.paymentMethod
        })
        .eq("id", payment.id);

    if (paymentError) {
        console.error("Failed update payment:", paymentError);

        return new Response(
            JSON.stringify({
                success: false,
                message: "Failed to update payment",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    console.log(
        `Payment ${payment.id} updated to ${orderStatus}`
    );

    // Update orders jika pembayaran berhasil
    if (orderStatus === "paid") {
        const { error: orderError } = await supabase
            .from("mawam_orders")
            .update({
                status: orderStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("payment_id", payment.id);

        if (orderError) {
            console.error("Failed update orders:", orderError);
        }

        // lanjutkan kode shipping Biteship kamu di sini
    }

    return new Response(
        JSON.stringify({
            success: true,
            payment_id: payment.id,
            status: orderStatus,
        }),
        {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        }
    );
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

        // =========================
        // MAYAR WEBHOOK
        // =========================
        if (
            req.method === "POST" &&
            req.headers
                .get("x-callback-token")
                ?.toLowerCase() === mayarWebhookSecret
        ) {
            return handleWebhook(req);
        }

        // =========================
        // CEK STATUS PEMBAYARAN
        // =========================
        const mayarCheckoutId =
            url.searchParams.get("mayarCheckoutId");

        const paymentId =
            url.searchParams.get("paymentId");

        if (
            req.method === "POST" &&
            url.searchParams.get("action") === "create-qris"
        ) {
            return handleCreateQris(req);
        }

        if (
            req.method === "GET" &&
            mayarCheckoutId &&
            paymentId
        ) {
            const payment = await cekStatus(
                mayarCheckoutId,
                paymentId
            );

            return new Response(
                JSON.stringify({
                    success: true,
                    data: payment,
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // =========================
        // CREATE PAYMENT
        // =========================
        if (req.method === "POST") {
            return handleCreatePayment(req);
        }

        return new Response(
            JSON.stringify({
                success: false,
                message: "Endpoint tidak ditemukan",
            }),
            {
                status: 404,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );

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