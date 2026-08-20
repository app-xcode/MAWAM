import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { formatWaktu, useCountdown } from '@/constants/countDown'
import { ekstrakEstimasi, Estimasi } from '@/constants/Estimasi'
import { nohptowa } from '@/constants/isNoHp'
import { rupiah } from '@/constants/rupiah'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import { Link, Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, SectionList, StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ModalScreen() {
    const { tab } = useLocalSearchParams() || 'Semua';
    const { user } = useAuth();
    const [data, setData] = useState<any>(null)
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [filterPro, setFilterPro] = useState<string>(tab?.toString() ?? "Semua");
    const scrollRef = useRef<ScrollView>(null);
    const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});


    useEffect(() => {
        setTimeout(() => {
            const layout = Object.entries(tabLayouts.current);
            layout.map(([name, pos]) => {
                if (name == filterPro) {
                    scrollRef.current?.scrollTo({
                        x: Math.max(pos.x - 20, 0),
                        animated: true,
                    });
                }
            })
        }, 300);

        if (user) {
            fetchOrders();
        }
    }, [filterPro, user, tab]);

    useEffect(() => {
        if (user === null) {
            router.replace('produk');
        }
    }, [user]);


    if (!data) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Pesanan...</ThemedText>
            </View>
        )
    }

    async function fetchOrders() {
        let query = supabase
            .from("mawam_orders")
            .select(`
                *,
                mawam_payments(*),
                mawam_profile:buyer_id(*),
                mawam_order_items(
                    *,
                    mawam_produk(
                    id,
                    nama_produk,
                    gambar_produk,
                    harga,
                    satuan
                    )
                ),
                 mawam_pengiriman(*),
                 mawam_order_cancellations(*)
                `)
            .order("created_at", { ascending: false })
            .eq("seller_id", user?.id);

        switch (filterPro) {
            case "Belum Bayar":
                query = query.in("status", ["pending_payment", "pending"]);
                break;

            case "Perlu Kirim":
                query = query.in("status", ["paid", "processed", "settlement"]);
                break;

            case "Pengiriman":
                query = query.eq("status", "shipped");
                break;

            case "Penilaian":
                query = query.eq("status", "completed");
                break;

            case "Pembatalan":
                query = query.eq("status", "cancelled");
                break;

            default:
                break;
        }

        const { data, error } = await query;

        if (error) {
            console.log(error);
            return;
        }

        const sections = data.map((order: any) => ({
            id: order.id,
            invoice: order.invoice,
            status: order.status,
            total: order.total,
            created_at: order.created_at,

            pembeli: order?.mawam_profile,
            payment: order.mawam_payments,

            data: order.mawam_order_items.slice(0, 1),
            allItems: order.mawam_order_items,
            cancellation: order.mawam_order_cancellations ? (Array.isArray(order.mawam_order_cancellations) ? order.mawam_order_cancellations[0] : order.mawam_order_cancellations) : null,
            pengiriman: order.mawam_pengiriman,
            expanded: order.mawam_order_items?.length > 1 ? true : false, // nanti untuk toggle
        }));
        // console.log('----');
        // console.log(JSON.stringify(sections))
        setData(sections ?? []);
    }

    function toggleOrder(orderId: string) {
        setData((prev: any) =>
            prev.map((section: any) => {
                if (section.id !== orderId) return section;

                const expanded = !section.expanded;

                return {
                    ...section,
                    expanded,
                    data: expanded
                        ? section.allItems
                        : section.allItems.slice(0, 2),
                };
            })
        );
    }

    function Countdown({ expiredAt }: { expiredAt: string }) {
        const time = useCountdown(expiredAt, true);

        return (
            <ThemedText style={{ fontWeight: "600" }}>
                {time}
            </ThemedText>
        );
    }

    const statusConfig: Record<OrderStatus, { text: string; color: string }> = {
        pending_payment: {
            text: "Belum Bayar",
            color: "#EF4444",
        },
        paid: {
            text: "Perlu Kirim",
            color: "#F59E0B",
        },
        processed: {
            text: "Perlu Kirim",
            color: "#F59E0B",
        },
        shipped: {
            text: "Pengiriman",
            color: "#3B82F6",
        },
        completed: {
            text: "Penilaian",
            color: "#22C55E",
        },
        cancelled: {
            text: "Pembatalan",
            color: "#6B7280",
        },
    };
    type OrderStatus =
        | "pending_payment"
        | "paid"
        | "processed"
        | "shipped"
        | "completed"
        | "cancelled";

    const tabs = ['Semua', 'Belum Bayar', 'Perlu Kirim', 'Pengiriman', 'Penilaian', 'Pembatalan']

    return (
        <React.Fragment>
            <Stack.Screen options={{ title: 'Penjualan Saya', }} />
            <View>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onLayout={(e) => {
                                tabLayouts.current[tab] = e.nativeEvent.layout;
                            }}
                            onPress={() => setFilterPro(tab)}
                            style={[{ alignItems: 'center', width: '25%', paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#8b8b8b7c', }, filterPro == tab ? { borderBottomWidth: 3, borderBottomColor: iconColor } : undefined]}
                        >
                            <ThemedText style={{ fontWeight: filterPro == tab ? '600' : undefined, fontSize: 14 }} numberOfLines={1}>{tab}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <ScrollView

            >
                <View style={styles.container}>
                    <SectionList
                        sections={data}
                        keyExtractor={(item) => item.id}
                        renderSectionHeader={({ section }) => {
                            const status = (section.status.trim() ?? "pending_payment") as OrderStatus;
                            return (
                                <ThemedView style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingHorizontal: 8, paddingVertical: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <ImageLoad source={{ uri: section.pembeli.avatar_url ?? gambarDefault }} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                            <ThemedText style={{ fontWeight: '600' }}>
                                                {section.pembeli.nama}
                                            </ThemedText>
                                        </View>
                                        <ThemedText style={{ color: statusConfig[status]?.color }}>
                                            {statusConfig[status]?.text}
                                        </ThemedText>
                                    </View>
                                </ThemedView>
                            )
                        }}
                        renderItem={({ item, section }) => {
                            return (
                                <ThemedView>
                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 4, padding: 8 }} onPress={() => {
                                        router.navigate({ pathname: 'prod/detail', params: { id: item.mawam_produk.id } })
                                    }}>
                                        <ImageLoad source={{ uri: item.mawam_produk.gambar_produk ?? gambarDefault }} style={{ width: 65, height: 65, borderRadius: 4 }} />
                                        <View style={{ justifyContent: 'space-between', width: '83%' }}>
                                            <ThemedText numberOfLines={1}>
                                                {item.mawam_produk.nama_produk}
                                            </ThemedText>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', opacity: 0.7 }}>
                                                <View>
                                                    <ThemedText>
                                                        {item.qty + item.mawam_produk.satuan}
                                                    </ThemedText>
                                                </View>
                                                <ThemedText>{item.qty}x</ThemedText>
                                            </View>
                                            <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                                                <ThemedText>{rupiah(item.subtotal)}</ThemedText>
                                            </View>
                                            {section.expanded && <View style={{ alignItems: 'center' }}>
                                                <TouchableOpacity style={{ flexDirection: 'row', gap: 2, opacity: 0.7, marginVertical: 2 }} onPress={() => {
                                                    toggleOrder(section.id)
                                                }}>
                                                    <ThemedText>
                                                        Lihat Semua
                                                    </ThemedText>
                                                    <Ionicons name="chevron-down" size={18} color={iconColor} />
                                                </TouchableOpacity>
                                            </View>}
                                        </View>
                                    </TouchableOpacity>
                                </ThemedView>)
                        }}
                        renderSectionFooter={({ section }) => {
                            let jumlah_produk = 0;
                            section.allItems.forEach((item: any) => {
                                jumlah_produk += item.qty;
                            });
                            const status = (section.status ?? "pending_payment") as OrderStatus;
                            return (
                                <ThemedView style={{ borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                                    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                            <ThemedText>
                                                Total {jumlah_produk} produk:
                                            </ThemedText>
                                            <ThemedText style={{ fontWeight: '600' }}>
                                                {rupiah(section.total)}
                                            </ThemedText>
                                        </View>
                                    </View>
                                    {statusConfig[status]?.text == 'Belum Bayar' && <TouchableOpacity style={{ backgroundColor: '#cccccc18', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between' }}
                                        onPress={() => {
                                            router.navigate({
                                                pathname: 'pesanan/rincian',
                                                params: { orderId: section.id }
                                            })
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', gap: 2 }}>
                                            <ThemedText style={{ opacity: 0.8 }}>
                                                Bayar dalam
                                            </ThemedText>
                                            <Countdown expiredAt={section.payment.expired_at} />
                                            <ThemedText style={{ opacity: 0.8 }}>
                                                dengan {section.payment?.payment_method == 'bank_transfer' ? 'Bank ' + (section.payment?.bank) : section.payment?.payment_method}
                                            </ThemedText>
                                        </View>
                                        <Ionicons name="chevron-forward-circle" size={18} color={iconColor} />
                                    </TouchableOpacity>}
                                    {statusConfig[status]?.text == 'Perlu Kirim' && <View style={{ paddingVertical: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <ThemedText style={{ opacity: 0.8 }}>
                                            Mohon atur pengiriman segera
                                        </ThemedText>
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, }} onPress={() => {
                                            router.navigate({ pathname: '/toko/atur-pengiriman/' + section.id })
                                        }}>
                                            <ThemedText>
                                                Atur Pengiriman
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>}

                                    {statusConfig[status]?.text == 'Perlu Kirim' && section.cancellation && (section.cancellation.seller_decision === 'pending' || section.cancellation.request_status === 'requested') && (
                                        <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <ThemedText style={{ color: '#b91c1c', fontWeight: '600' }}>Permintaan pembatalan diterima</ThemedText>
                                                <TouchableOpacity onPress={() => router.navigate({ pathname: '/toko/pembatalan/' + section.id })} style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                                                    <ThemedText>Rincian Pembatalan</ThemedText>
                                                </TouchableOpacity>
                                            </View>
                                            <ThemedText style={{ opacity: 0.8, marginTop: 6 }}>Pembeli mengajukan pembatalan — mohon konfirmasi.</ThemedText>
                                        </View>
                                    )}

                                    {(statusConfig[status]?.text == 'Perlu Kirim' || statusConfig[status]?.text == 'Pengiriman') && <View style={{ paddingVertical: 4, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <ThemedText style={{ opacity: 0.8 }}>
                                            No. Pesanan
                                        </ThemedText>
                                        <ThemedText style={{ fontWeight: 600 }}>
                                            {section.invoice}
                                        </ThemedText>
                                    </View>}

                                    {statusConfig[status]?.text == 'Pengiriman' && <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, }} onPress={() => {
                                            router.navigate({
                                                pathname: '/toko/pesanan/' + section.id
                                            })
                                        }} >
                                            <ThemedText>
                                                Rincian Pesanan
                                            </ThemedText>
                                        </TouchableOpacity>
                                        {section.pengiriman?.[0]?.id && <TouchableOpacity style={{ borderWidth: 1, borderColor: '#ff4a1c', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }} onPress={() => {
                                            router.navigate({ pathname: '/toko/pengiriman/[pengirimanId]', params: { pengirimanId: String(section.pengiriman[0].id) } });
                                        }}>
                                            <ThemedText style={{ color: '#ff4a1c' }}>Update Drop Point</ThemedText>
                                        </TouchableOpacity>}
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ColorDark }} onPress={() => {
                                            router.navigate({ pathname: 'pesanan/lacak', params: { orderId: section.id } })
                                        }}>
                                            <ThemedText style={{ color: ColorLight }}>
                                                Lacak
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>}



                                    {statusConfig[status]?.text == 'Belum Bayar' && <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                        {/* <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, }}
                                            onPress={() => {
                                                Alerts('Baik, akan segera hadir')
                                            }}
                                        >
                                            <ThemedText>
                                                Ubah Pembayaran
                                            </ThemedText>
                                        </TouchableOpacity> */}
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ColorDark }} onPress={() => {
                                            router.navigate({
                                                pathname: 'pembayaran/pembayaran',
                                                params: {
                                                    paymentId: section.payment?.id,
                                                    payment_type: section.payment?.payment_method,
                                                    bank: section.payment?.bank
                                                }
                                            })
                                        }} >
                                            <ThemedText style={{ color: ColorLight }}>
                                                Bayar
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>}
                                    {statusConfig[status]?.text == 'Penilaian' && <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, }} onPress={() => {
                                            router.navigate({ pathname: '/toko/pesanan/' + section.id })
                                        }}>
                                            <ThemedText>
                                                Rincian Pesanan
                                            </ThemedText>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ColorDark }} onPress={() => {
                                            router.navigate({
                                                pathname: '/toko/review/' + section.id
                                            })
                                        }}>
                                            <ThemedText style={{ color: ColorLight }}>
                                                Lihat Penilaian
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>}
                                    {statusConfig[status]?.text == 'Pembatalan' && <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                        <TouchableOpacity style={{ borderWidth: 1, borderColor: iconColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, }} onPress={() => {
                                            router.navigate({ pathname: '/toko/pembatalan/'+section.id })
                                        }}>
                                            <ThemedText>
                                                Rincian Pembatalan
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>}
                                </ThemedView>

                            )
                        }}
                    />
                    {data.length == 0 && <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <Ionicons
                            name="bag-outline"
                            size={80}
                            color="#9CA3AF"
                        />

                        <ThemedText style={{ marginTop: 12, fontSize: 18, fontWeight: "600" }}>
                            Belum ada penjualan
                        </ThemedText>

                        <ThemedText style={{ color: "#6B7280", textAlign: "center", marginTop: 4 }}>
                            Penjualan yang kamu jual akan muncul di sini.
                        </ThemedText>
                    </View>}
                </View>
            </ScrollView>
        </React.Fragment>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 8,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    image: {
        width: '100%',
        height: 250,
        backgroundColor: 'transparent',
        objectFit: 'contain',
    },

    button: {
        marginTop: 10,
        backgroundColor: ColorDark,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    buttonText: {
        color: ColorLight,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12
    },
    label: {
        marginVertical: 4,
        fontWeight: '600'
    }
})
