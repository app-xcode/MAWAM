import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { cekOngkir } from '@/constants/cekOngkir'
import { formatService, getOpsiPengiriman } from '@/constants/opsiPengiriman'
import { rupiah } from '@/constants/rupiah'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, SectionList, StyleSheet, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ModalScreen() {
    const { cart } = useLocalSearchParams();
    const cartIds = JSON.parse(cart as string);
    const { user } = useAuth();
    const [data, setData] = useState<any>(null)
    const [dataUser, setDataUser] = useState<any>(null)
    const [dataCart, setDataCart] = useState<any>(null)
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const borderKirim = Colors[colorScheme].success;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [subtotal, setSubtotal] = useState(0);
    const [total, setTotal] = useState(0);
    const [biayaLayanan, setBiayaLayanan] = useState(2000);
    const [metodeBayar, setMetodeBayar] = useState('bank_transfer');
    const [bankBayar, setBankBayar] = useState('bri');
    const [kurirs, setKurirs] = useState<Kurir[]>([]);
    const [toggleMethod, setToggleMethod] = useState(true);
    const [pilihKurir, setpilihKurir] = useState<any>(null);

    interface Kurir { courier: string, etd: string, price: number, service: string }

    const getKurir = async () => {
        const getKurirs: Kurir[] = await getOpsiPengiriman();
        if (getKurirs) {
            const sortedKurirs = [...getKurirs].sort((a, b) => a.price - b.price);
            setKurirs([...sortedKurirs]);
            setpilihKurir(false);
        }
    }

    useEffect(() => {
        if (kurirs && dataCart && !pilihKurir) {
            setDataCart((prev: any[]) =>
                prev.map((s) =>
                    s.kurir == null
                        ? {
                            ...s,
                            kurir: kurirs[0]?.courier,
                        }
                        : s
                )
            );
            setpilihKurir(true)
        }

    }, [pilihKurir])

    useEffect(() => {
        getKurir();
    }, [])

    useEffect(() => {
        if (!data) return;
        setpilihKurir(false)
        const grouped = data?.reduce((acc: any, item: any) => {
            const tokoId = item.toko_id;

            if (!acc[tokoId]) {
                acc[tokoId] = {
                    title: {
                        id: item.toko_id,
                        nama_toko: item?.mawam_toko?.nama_toko,
                        user_id: item?.mawam_toko?.user_id,
                    },
                    data: [],
                    seller_note: null,
                    toggle_note: null,
                    kurir: null,
                    toggle_kurir: null
                };
            }

            acc[tokoId].data.push(item);

            return acc;
        }, {});
        const result = grouped ? Object.values(grouped) : null;

        if (!result?.length) {
            setSubtotal(0);
            setTotal(0);
            return;
        } else {
            setDataCart(result)
        }

        let sub = 0;

        result.forEach((toko: any) => {
            toko?.data?.forEach((item: any) => {
                sub += item.jumlah * item.harga;
            });
        });

        setSubtotal(sub);

        // sementara belum ada ongkir & diskon
        // setTotal(sub + biayaLayanan);
        setTotal(sub);

    }, [data]);

    useEffect(() => {
        if (user === null) {
            router.replace('produk');
        }

        if (user) {
            fetchToko();
            fetchDataUser();
        }
    }, [user]);

    const fetchDataUser = async () => {
        const { data: pembeli, error } = await supabase
            .from("mawam_profile")
            .select(`*`)
            .eq("id", user.id);

        if (error) {
            console.log(error);
            return;
        }

        if (pembeli && pembeli[0]) {
            setDataUser(pembeli[0])
        } else {
            // harus lengkapi data
        }
    };
    const fetchToko = async () => {
        const { data, error } = await supabase
            .from("mawam_cart")
            .select(`
               id,
                qty,
                mawam_produk (
                    *,
                    mawam_toko:toko_id (
                    nama_toko,
                    user_id
                    )
                )
            `)
            .in("id", cartIds);

        if (error) {
            console.log(error);
            return;
        }

        if (data) {
            const flatData =
                data.map((item) => ({
                    cart_id: item.id,
                    jumlah: item.qty,
                    ...item.mawam_produk,
                })) || [];

            setData(flatData);
        } else {
            router.push('/cart');
        }
    };


    if (!dataCart) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Checkout...</ThemedText>
            </View>
        )
    }

    async function createPayment(amount: number) {
        const { data: auth } = await supabase.auth.getUser();

        if (!auth.user) throw new Error("User belum login");

        const reference = `PAY-${Date.now()}`;

        const { data, error } = await supabase
            .from("mawam_payments")
            .insert({
                buyer_id: auth.user.id,
                reference,
                amount,
                status: "pending",
                payment_method: metodeBayar ?? 'bank_transfer',
                bank: bankBayar ?? 'bri',
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    }

    async function createOrders(paymentId: string) {
        const { data: auth } = await supabase.auth.getUser();

        if (!auth.user) throw new Error("User belum login");

        const orders = [];

        for (const toko of dataCart) {
            const invoice = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            if (toko.subtotal == undefined) {
                toko.subtotal = 0;
            }
            if (toko.discount == undefined) {
                toko.discount = 0;
            }
            if (toko.shipping == undefined) {
                toko.shipping = 0;
            }
            if (toko.total == undefined) {
                toko.total = 0;
            }
            toko?.data?.forEach((item: any) => {
                toko.subtotal += item.jumlah * item.harga;
            });
            toko.total = toko.subtotal + toko.shipping - toko.discount;
            const { data: order, error } = await supabase
                .from("mawam_orders")
                .insert({
                    payment_id: paymentId,

                    invoice,

                    buyer_id: auth.user.id,
                    seller_id: toko.title.user_id,

                    subtotal: toko.subtotal,
                    discount: toko.discount,
                    shipping: toko.shipping,
                    total: toko.total,
                    seller_note: toko.seller_note ?? null,
                    status: "pending_payment",
                })
                .select()
                .single();

            if (error) throw error;

            orders.push({
                ...order,
                items: toko.data,
            });
        }

        return orders;
    }

    async function createOrderItems(orders: any[]) {
        for (const order of orders) {
            const items = order.items.map((item: any) => ({
                order_id: order.id,
                produk_id: item.id,
                qty: item.jumlah,
                price: item.harga,
                discount: 0,
                subtotal: item.jumlah * item.harga,
            }));

            const { error } = await supabase
                .from("mawam_order_items")
                .insert(items);

            if (error) throw error;
        }
        return true;
    }

    async function deleteCart(cartIds: string[]) {
        const { error } = await supabase
            .from("mawam_cart")
            .delete()
            .in("id", cartIds);

        if (error) throw error;
        return true;
    }
    type PaymentMethod = {
        id: string;
        type: string;
        title: string;
        icon: keyof typeof Ionicons.glyphMap;
    };
    const methods: PaymentMethod[] = [
        {
            id: "bri",
            type: "bank_transfer",
            title: "Transfer Bank BRI",
            icon: "repeat-outline",
        },
        {
            id: "bni",
            type: "bank_transfer",
            title: "Transfer Bank BNI",
            icon: "repeat-outline",
        },
        {
            id: "bca",
            type: "bank_transfer",
            title: "Transfer Bank BCA",
            icon: "repeat-outline",
        },
        {
            id: "qris",
            type: "qris",
            title: "QRIS",
            icon: "qr-code-outline",
        },
        // {
        //     id: "cod",
        //     type: "cod",
        //     title: "Bayar di Tempat (COD)",
        //     icon: "cash-outline",
        // },
    ];

    return (
        <React.Fragment>
            <Stack.Screen options={{ title: 'Checkout', }} />
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                        <TouchableOpacity style={{ flexDirection: 'row', }} onPress={() => {
                            router.navigate({ pathname: 'checkout/alamat', params: { cart } })
                        }}>
                            <View style={{ flexDirection: 'row', gap: 8, width: '95%' }}>
                                <Ionicons name="location" size={18} color={iconColor} />
                                <View style={{ width: '90%' }}>
                                    <View style={{ gap: 4, flexDirection: 'row', marginBottom: 4 }}>
                                        <ThemedText style={{ fontWeight: '600' }}>
                                            {dataUser?.nama ?? 'Penerima'}
                                        </ThemedText>
                                        <ThemedText style={{ opacity: 0.6 }}>{
                                            dataUser?.no_hp ?? ''
                                        }</ThemedText>
                                    </View>
                                    <ThemedText style={{ fontSize: 11 }} numberOfLines={3}>
                                        {dataUser?.alamat.replace("\n", ' ') ?? 'Anda belum mengatur alamat'}
                                    </ThemedText>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="chevron-forward" size={18} color={iconColor} />
                            </View>
                        </TouchableOpacity>
                    </ThemedView>
                    <SectionList
                        sections={dataCart}
                        keyExtractor={(item) => item.id}
                        renderSectionHeader={({ section }) => {
                            return (
                                <ThemedView
                                    style={{
                                        padding: 8,
                                        borderTopLeftRadius: 8,
                                        borderTopRightRadius: 8,
                                        borderBottomWidth: 1,
                                        borderColor: '#88888828',
                                    }}
                                >
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <View
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                                        >
                                            <ThemedText
                                                style={{
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                <Ionicons name="storefront-outline" size={18} color={iconColor} /> {section.title.nama_toko}
                                            </ThemedText>
                                        </View>
                                    </View>
                                </ThemedView>
                            );
                        }}
                        renderSectionFooter={({ section }) => {
                            let jumlah_produk = 0;
                            let subtotal = 0;
                            section.data.forEach((item: any) => {
                                jumlah_produk += item.jumlah;
                                subtotal += item.jumlah * item.harga;
                                //hitung juga dengan ongkir
                            });

                            return <ThemedView
                                style={{
                                    padding: 8,
                                    borderTopWidth: 1,
                                    borderColor: '#88888828',
                                    marginBottom: 8,
                                    borderBottomLeftRadius: 8,
                                    borderBottomRightRadius: 8
                                }}
                            >
                                {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <ThemedText>
                                        Voucer Toko
                                    </ThemedText>
                                    <TouchableOpacity style={{ opacity: 0.6, flexDirection: 'row', gap: 2 }}>
                                        <ThemedText>
                                            Gunakan/masukan kode
                                        </ThemedText>
                                        <Ionicons name="chevron-forward" size={18} color={iconColor} />
                                    </TouchableOpacity>
                                </View> */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <ThemedText style={{ fontWeight: section.toggle_note ? '600' : 'normal' }}>
                                        Pesan untuk Penjual
                                    </ThemedText>
                                    <TouchableOpacity style={{ opacity: 0.6, flexDirection: 'row', gap: 2 }} onPress={() => {
                                        setDataCart((prev: any[]) =>
                                            prev.map((s) =>
                                                s.title.id === section.title.id
                                                    ? {
                                                        ...s,
                                                        toggle_note: !s.toggle_note,
                                                        seller_note: !s.toggle_note ? '' : null
                                                    }
                                                    : s
                                            )
                                        );
                                    }}>
                                        <ThemedText>
                                            {section.toggle_note ? 'Batal' : 'Tinggalkan pesan'}
                                        </ThemedText>
                                        <Ionicons name={section.toggle_note ? "chevron-up" : "chevron-down"} size={18} color={iconColor} />
                                    </TouchableOpacity>
                                </View>
                                {section.toggle_note && <View>
                                    <ThemedInput value={section.seller_note} onChangeText={(text: string) => {
                                        setDataCart((prev: any[]) =>
                                            prev.map((s) =>
                                                s.title.id === section.title.id
                                                    ? {
                                                        ...s,
                                                        seller_note: text
                                                    }
                                                    : s
                                            )
                                        );
                                    }} placeholder="Tulis catatan untuk penjual..." style={{ height: 70, textAlignVertical: 'top', }} multiline />
                                </View>}
                                <View style={{ borderTopWidth: 1, borderColor: '#cccccc16', marginVertical: 4 }}></View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <ThemedText>
                                        Opsi Pengiriman
                                    </ThemedText>
                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 2, opacity: 0.7 }}
                                        onPress={() => {
                                            setDataCart((prev: any[]) =>
                                                prev.map((s) =>
                                                    s.title.id === section.title.id
                                                        ? {
                                                            ...s,
                                                            toggle_kurir: !s.toggle_kurir,
                                                        }
                                                        : s
                                                )
                                            );
                                        }}
                                    >
                                        <ThemedText>
                                            {section.toggle_kurir ? 'Batal' : 'Lihat Semua'}
                                        </ThemedText>
                                        <Ionicons name={section.toggle_kurir ? "chevron-up" : "chevron-down"} size={18} color={iconColor} />
                                    </TouchableOpacity>
                                </View>
                                <View>
                                    <FlatList
                                        data={section.toggle_kurir ? kurirs : [...kurirs.filter((i) => i.courier == section.kurir), ...kurirs.filter((i) => i.courier != section.kurir).slice(0, 1)]
                                        }
                                        keyExtractor={(item: any) => item.courier}
                                        renderItem={({ item }: { item: Kurir }) => {
                                            const terpilih = section.kurir == item.courier;
                                            return (<TouchableOpacity style={{ borderWidth: 1, borderRadius: 4, borderColor: terpilih ? borderKirim : '#cccccc1a', padding: 8, marginBottom: 8 }}
                                                onPress={() => {
                                                    setDataCart((prev: any[]) =>
                                                        prev.map((s) =>
                                                            s.title.id === section.title.id
                                                                ? {
                                                                    ...s,
                                                                    kurir: item.courier,
                                                                }
                                                                : s
                                                        )
                                                    );
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <View style={{ backgroundColor: terpilih ? borderKirim : '', borderRadius: '50%', width: 15, height: 15 }}>
                                                            <Ionicons name={terpilih ? 'checkmark' : 'chevron-forward'} color={terpilih ? '#fff' : iconColor} size={13} />
                                                        </View>
                                                        <View>
                                                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                                <ThemedText style={{ fontWeight: 600 }}>
                                                                    {item.courier.toUpperCase()}
                                                                </ThemedText>
                                                                <ThemedText style={{ fontSize: 12 }}>
                                                                    ~ {formatService(item.service)}
                                                                </ThemedText>
                                                            </View>
                                                            <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                                                                Estimasi pengiriman {item.etd}
                                                            </ThemedText>
                                                        </View>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                        {/* <ThemedText style={{ opacity: 0.7, textDecorationLine: 'line-through', fontSize: 11 }}>
                                                    {rupiah(37200)}
                                                </ThemedText> */}
                                                        <ThemedText>
                                                            {rupiah(item.price)}
                                                        </ThemedText>
                                                        {/* <Ionicons name='ticket-outline' color={iconColor} size={13} /> */}
                                                    </View>
                                                </View>
                                            </TouchableOpacity>)
                                        }}
                                    />
                                </View>
                                <View style={{
                                    flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1,
                                    borderColor: '#88888828', paddingTop: 8,
                                }}>
                                    <ThemedText
                                    >
                                        Total {jumlah_produk} Produk
                                    </ThemedText>
                                    <ThemedText style={{ fontWeight: '600' }}
                                    >
                                        {rupiah(subtotal)}
                                    </ThemedText>
                                </View>
                            </ThemedView>
                        }}
                        renderItem={({ item }) => (
                            <ThemedView
                                style={{
                                    padding: 8,
                                }}
                            >
                                <ThemedView style={{}}>
                                    <View style={{ flexDirection: 'row', gap: 4, }}>
                                        <ImageLoad source={{ uri: item.gambar_produk ?? gambarDefault }} style={{ width: 65, height: 65, borderRadius: 4 }} />
                                        <View style={{ justifyContent: 'space-between', width: '83%' }}>
                                            <ThemedText numberOfLines={1}>
                                                {item.nama_produk}
                                            </ThemedText>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <ThemedText>{rupiah(item.harga * item.jumlah)}</ThemedText>
                                                <ThemedText>{item.jumlah}x</ThemedText>
                                            </View>
                                        </View>
                                    </View>
                                </ThemedView>
                            </ThemedView>
                        )}
                    />

                    <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <ThemedText style={{ fontWeight: '600' }}>
                                Metode Pembayaran
                            </ThemedText>
                            <TouchableOpacity style={{ flexDirection: 'row', gap: 2 }} onPress={() => {
                                setToggleMethod(!toggleMethod)
                            }}>
                                {/* <ThemedText>
                                    Lihat Semua
                                </ThemedText> */}
                                <Ionicons name={toggleMethod ? "chevron-up" : "chevron-down"} size={18} color={iconColor} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={toggleMethod ? methods : methods.filter(item => item.type == metodeBayar && item.id == bankBayar)}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                return (<TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#cccccc18' }} onPress={() => {
                                    setMetodeBayar(item.type)
                                    setBankBayar(item.id)
                                }}>
                                    <View style={{ flexDirection: 'row', gap: 4 }}>
                                        <Ionicons name={item.icon ?? 'wallet-outline'} size={18} color={iconColor} />
                                        <ThemedText>
                                            {item.title}
                                        </ThemedText>
                                    </View>
                                    <View>
                                        <Ionicons name={bankBayar == item.id ? "checkbox" : "square-outline"} size={18} color={iconColor} />
                                    </View>
                                </TouchableOpacity>)
                            }}
                        />
                    </ThemedView>

                    <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                        <View style={{ marginBottom: 8 }}>
                            <ThemedText style={{ fontWeight: '600' }}>
                                Rincian Pembayaran
                            </ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, opacity: .8 }}>
                            <ThemedText>
                                Subtotal Pemesanan
                            </ThemedText>
                            <ThemedText>
                                {rupiah(subtotal)}
                            </ThemedText>
                        </View>
                        {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, opacity: .8 }}>
                            <ThemedText>
                                Subtotal Pengiriman
                            </ThemedText>
                            <ThemedText>
                                {rupiah(37200)}
                            </ThemedText>
                        </View> */}
                        {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, opacity: .8 }}>
                            <ThemedText>
                                Biaya Layanan
                            </ThemedText>
                            <ThemedText>
                                {rupiah(biayaLayanan)}
                            </ThemedText>
                        </View> */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderColor: '#cccccc18' }}>
                            <ThemedText>
                                Total Pembayaran
                            </ThemedText>
                            <ThemedText style={{ fontWeight: '600' }}>
                                {rupiah(total)}
                            </ThemedText>
                        </View>
                    </ThemedView>
                </View>
            </KeyboardAwareScrollView>
            {
                dataUser && dataUser.alamat && dataUser.no_hp && <ThemedView style={{ padding: 20, paddingTop: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <View>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                <ThemedText style={{ opacity: 0.7 }}>Total</ThemedText>
                                <ThemedText style={{ fontWeight: '600' }}>{rupiah(total)}</ThemedText>
                            </View>
                            {/* <View style={{ flexDirection: 'row', gap: 2 }}>
                                <ThemedText style={{ opacity: 0.7 }}>Hemat</ThemedText>
                                <ThemedText>-{rupiah(15000)}</ThemedText>
                            </View> */}
                        </View>
                        <TouchableOpacity style={{ backgroundColor: ColorDark, padding: 8, borderRadius: 4 }} onPress={async () => {
                            if (!metodeBayar) {
                                Alerts('Belum atur metode pembayaran');
                                return
                            }
                            if (!bankBayar) {
                                Alerts('Belum pilih bank');
                                return
                            }
                            const payment = await createPayment(total);
                            const orders = await createOrders(payment.id);
                            const success = await createOrderItems(orders);
                            if (success) {
                                const del = await deleteCart(cartIds);
                                if (del) {
                                    router.replace({
                                        pathname: "pembayaran/pembayaran",
                                        params: {
                                            paymentId: payment.id,
                                            payment_type: ['cod', 'qris'].indexOf(metodeBayar) == -1 ? 'bank_transfer' : metodeBayar,
                                            bank: bankBayar
                                        },
                                    });
                                }
                            }
                        }}>
                            <ThemedText style={{ color: ColorLight }}>
                                Buat Pesanan
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </ThemedView>
            }

        </React.Fragment >
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
