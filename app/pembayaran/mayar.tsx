import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    View,
} from 'react-native'
import { WebView } from 'react-native-webview'

import { ThemedText } from '@/components/themed-text'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/utils/theme'
import { ScrollView } from 'react-native-gesture-handler'
import { Image } from 'expo-image'
import { rupiah } from '@/constants/rupiah'

export default function MayarScreen() {
    const { paymentId } = useLocalSearchParams<{
        paymentId?: string
    }>();
    const [data, setdata] = useState<any>(null)
    const { isDark } = useTheme()
    const colorScheme = isDark ? 'dark' : 'light'
    const iconColor = Colors[colorScheme].icon

    const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true;

        const loadPayment = async () => {
            const url =
                "https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/mawam-mayar";

            if (!paymentId) {
                setError("Payment ID tidak tersedia.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const { data, error } = await supabase
                    .from("mawam_payments")
                    .select("*")
                    .eq("id", paymentId)
                    .single();

                if (error) {
                    console.log("Load Mayar payment error:", error);

                    if (mounted) {
                        setError("Gagal mengambil data pembayaran.");
                        setLoading(false);
                    }

                    return;
                }
                if(data){
                    setdata(data)
                }

                // ==========================================
                // Sudah punya payment URL
                // ==========================================
                if (data?.payment_url) {
                    if (mounted) {
                        setPaymentUrl(data.payment_url);
                        setLoading(false);
                    }

                    return;
                }

                // ==========================================
                // Mayar Checkout
                // ==========================================
                if (data?.mayar_checkout_id) {
                    const response = await fetch(
                        `${url}?paymentId=${paymentId}&mayarCheckoutId=${data.mayar_checkout_id}`
                    );

                    const result = await response.json();

                    console.log("Mayar status:", result);

                    if (!response.ok || !result?.success) {
                        throw new Error(
                            result?.message ||
                            "Gagal mengecek status pembayaran."
                        );
                    }

                    const paymentUrl =
                        result?.data?.payment_url;

                    if (paymentUrl) {
                        if (mounted) {
                            setPaymentUrl(paymentUrl);
                            setLoading(false);
                        }

                        return;
                    }
                }

                // ==========================================
                // QRIS Dinamis
                // ==========================================
                if (data?.payment_method === "qris_dinamis") {
                    const response = await fetch(
                        `${url}?action=create-qris`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                amount: data.amount,
                                paymentId,
                            }),
                        }
                    );

                    const result = await response.json();

                    console.log("Mayar QRIS:", result);

                    if (!response.ok || !result?.success) {
                        throw new Error(
                            result?.message ||
                            "Gagal membuat QRIS."
                        );
                    }

                    const qrUrl = result?.data?.url;

                    if (!qrUrl) {
                        throw new Error(
                            "URL QRIS tidak ditemukan."
                        );
                    }

                    if (mounted) {
                        setPaymentUrl(qrUrl);
                        setLoading(false);
                    }

                    return;
                }

                // ==========================================
                // Create Mayar Invoice
                // ==========================================
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        paymentId,
                    }),
                });

                const result = await response.json();

                console.log("Create Mayar:", result);

                if (!response.ok || !result?.success) {
                    throw new Error(
                        result?.message ||
                        "Gagal membuat pembayaran Mayar."
                    );
                }

                const paymentUrl =
                    result?.data?.payment_url;

                if (!paymentUrl) {
                    throw new Error(
                        "URL pembayaran Mayar belum tersedia."
                    );
                }

                if (mounted) {
                    setPaymentUrl(paymentUrl);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error("Load payment error:", err);

                if (mounted) {
                    setError(
                        err?.message ||
                        "Gagal memproses pembayaran."
                    );
                    setLoading(false);
                }
            }
        };

        loadPayment();

        return () => {
            mounted = false;
        };
    }, [paymentId]);

    if (loading) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: 'Pembayaran Mayar',
                    }}
                />

                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color={iconColor}
                    />

                    <ThemedText style={styles.text}>
                        Menyiapkan pembayaran...
                    </ThemedText>
                </View>
            </>
        )
    }

    if (error || !paymentUrl) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: 'Pembayaran Mayar',
                    }}
                />

                <View style={styles.center}>
                    <ThemedText>
                        {error ?? 'Pembayaran tidak tersedia.'}
                    </ThemedText>
                </View>
            </>
        )
    }

    return (
        <React.Fragment>
            <Stack.Screen
                options={{
                    title:
                        data?.payment_method === "qris_dinamis"
                            ? "Pembayaran QRIS"
                            : "Pembayaran Mayar",
                }}
            />

            {data?.payment_method === "qris_dinamis" ? (
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                >
                    {/* TOTAL PEMBAYARAN */}
                    <View style={styles.card}>
                        <View style={styles.rowBorder}>
                            <ThemedText style={styles.label}>
                                Total Pembayaran
                            </ThemedText>

                            <ThemedText style={styles.value}>
                                Rp
                                {rupiah((data?.payment_method === "qris_dinamis" && data?.amount_unik ?  data?.amount_unik : data?.amount) || 0)}
                            </ThemedText>
                        </View>
                        <View style={styles.rowBorder}>
                            <ThemedText></ThemedText>
                            <ThemedText style={styles.infoText}>Nominal + kode unik untuk verifikasi lebih cepat.</ThemedText>
                        </View>

                        <View style={styles.row}>
                            <ThemedText style={styles.label}>
                                Bayar Dalam
                            </ThemedText>

                            <View style={{ alignItems: "flex-end" }}>
                                <ThemedText style={styles.value}>
                                    Menunggu Pembayaran
                                </ThemedText>

                                {data?.expired_at && (
                                    <ThemedText style={styles.expiredText}>
                                        Jatuh tempo{" "}
                                        {new Date(
                                            data.expired_at
                                        ).toLocaleString("id-ID")}
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* QRIS */}
                    <View style={styles.cardQris}>
                        <View style={styles.qrisHeader}>
                            <ThemedText style={styles.qrisTitle}>
                                QRIS Payment
                            </ThemedText>
                        </View>

                        <ThemedText style={styles.qrisDescription}>
                            Scan kode QR ini untuk melakukan pembayaran
                        </ThemedText>

                        <View style={styles.qrContainer}>
                            {paymentUrl ? (
                                <Image
                                    source={{
                                        uri: paymentUrl,
                                    }}
                                    style={styles.qrImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <ActivityIndicator
                                    size="large"
                                    color={iconColor}
                                />
                            )}
                        </View>

                        <View style={styles.infoContainer}>
                            <ThemedText style={styles.infoText}>
                                Proses verifikasi kurang dari 10 menit
                                setelah pembayaran berhasil.
                            </ThemedText>

                            <ThemedText style={styles.infoText}>
                                Pastikan nominal pembayaran sesuai dengan
                                total pesanan.
                            </ThemedText>

                            <ThemedText style={styles.infoText}>
                                Hanya menerima pembayaran melalui QRIS.
                            </ThemedText>
                        </View>
                    </View>

                    {/* PETUNJUK */}
                    <View style={styles.card}>
                        <ThemedText style={styles.instructionTitle}>
                            Petunjuk Pembayaran QRIS
                        </ThemedText>

                        {[
                            "Buka aplikasi mobile banking / e-wallet.",
                            "Pilih menu Scan QR.",
                            "Scan QRIS yang ditampilkan.",
                            "Periksa nominal pembayaran.",
                            "Konfirmasi pembayaran.",
                        ].map((text, index) => (
                            <View
                                key={index}
                                style={styles.instructionRow}
                            >
                                <View style={styles.number}>
                                    <ThemedText>
                                        {index + 1}
                                    </ThemedText>
                                </View>

                                <ThemedText style={styles.instructionText}>
                                    {text}
                                </ThemedText>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : Platform.OS === "web" ? (
                <iframe
                    src={paymentUrl}
                    style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                    }}
                    allow="payment"
                />
            ) : (
                <WebView
                    source={{
                        uri: paymentUrl,
                    }}
                    style={styles.webview}
                    startInLoadingState
                    javaScriptEnabled
                    domStorageEnabled
                    allowsInlineMediaPlayback
                    setSupportMultipleWindows={false}
                    renderLoading={() => (
                        <View style={styles.loading}>
                            <ActivityIndicator
                                size="large"
                                color={iconColor}
                            />
                            <ThemedText style={styles.text}>
                                Membuka pembayaran...
                            </ThemedText>
                        </View>
                    )}
                    onError={(event) => {
                        console.log(
                            "Mayar WebView Error:",
                            event.nativeEvent
                        );
                    }}
                    onHttpError={(event) => {
                        console.log(
                            "Mayar HTTP Error:",
                            event.nativeEvent
                        );
                    }}
                />
            )}
        </React.Fragment>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
        padding: 8,
        paddingBottom: 30,
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },

    cardQris: {
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },

    rowBorder: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(204,204,204,0.1)",
        paddingBottom: 8,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 8,
    },

    label: {
        opacity: 0.7,
    },

    value: {
        fontWeight: "600",
    },

    expiredText: {
        opacity: 0.7,
        fontSize: 12,
        marginTop: 2,
    },

    qrisHeader: {
        borderBottomWidth: 1,
        borderBottomColor: "rgba(204,204,204,0.1)",
        paddingBottom: 8,
    },

    qrisTitle: {
        fontWeight: "600",
    },

    qrisDescription: {
        opacity: 0.5,
        fontSize: 11,
        marginTop: 10,
        marginBottom: 8,
    },

    qrContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
    },

    qrImage: {
        width: 250,
        height: 250,
    },

    infoContainer: {
        gap: 8,
        marginTop: 8,
    },

    infoText: {
        opacity: 0.7,
        fontSize: 13,
    },

    instructionTitle: {
        fontWeight: "600",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(204,204,204,0.1)",
    },

    instructionRow: {
        flexDirection: "row",
        gap: 8,
        paddingVertical: 6,
        paddingLeft: 10,
    },

    number: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(204,204,204,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },

    instructionText: {
        flex: 1,
        opacity: 0.7,
    },

    webview: {
        flex: 1,
    },

    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },

    loading: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },

    text: {
        marginTop: 12,
        opacity: 0.7,
    },
})