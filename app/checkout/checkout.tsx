import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { cekOngkir } from '@/constants/cekOngkir'
import hitungDimensiBawang from '@/constants/hitungDimensiBawang'
// import { formatService } from '@/constants/opsiPengiriman'
import { rupiah } from '@/constants/rupiah'
import { getKodeWilayah } from '@/constants/setKodeOngkir'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import {
    notifyOrderCreatedToBuyer,
    notifyOrderCreatedToSeller,
} from '@/services/notification/notificationTriggers'
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
    const [subtotalKurir, setSubtotalKurir] = useState(0);
    const [total, setTotal] = useState(0);
    const [biayaLayanan, setBiayaLayanan] = useState(2000);
    const [metodeBayar, setMetodeBayar] = useState('manual_qris');
    const [bankBayar, setBankBayar] = useState('manual_qris');
    const [toggleMethod, setToggleMethod] = useState(true);
    const [pilihKurir, setpilihKurir] = useState<any>(null);
    const [pengiriman, setPengiriman] = useState<any[]>([]);

    interface Kurir {
        code: string,
        name: string,
        estimated: string,
        price: number,
        service: string,
        type: string,
        description:string
    }
    interface Pengiriman {
        target_toko: string,
        order_id: string,

        courier_code: string,
        courier_name: string,
        service: string,
        shipping_cost: number,
        estimated_days: string,

        tracking_number: string,

        status: string,

        type: string,

        weight: string,
        origin: string,
        destination: string,
        penerima: string,
        telepon_penerima: string,
        alamat_penerima: string
    }

    function decodeHTML(teks: string) {
        let hasil = teks.replaceAll("&qlt;", "<");
        hasil = hasil.replaceAll("&lt;", "<");
        hasil = hasil.replaceAll("&gt;", ">");
        return hasil;
    }

    function normalizePrice(item: any) {
        if (/jne/i.test(item.name) && item.type === "Paket") {
            return /130|200/.test(item.service)
                ? item.price
                : item.price / 100;
        }

        if (/pos/i.test(item.type)) {
            return item.price / 100;
        }

        if (item.name === "SiCepat" && /paket besar/i.test(item.type)) {
            return item.price / 100;
        }

        return item.price / 1000;
    }
    const loadOngkir = async (alamat_penjual: string, alamat_pembeli: string, target_toko: string, items: any, weight: number) => {
        const origin = alamat_penjual.includes('.') ? await getKodeWilayah(alamat_penjual) : { kode: alamat_penjual };
        const destination = alamat_pembeli.includes('.') ? await getKodeWilayah(alamat_pembeli) : { kode: alamat_pembeli };
        const dataOngkir = await cekOngkir(origin?.kode, destination?.kode, items);
        setPengiriman(prev => {
            const data = { origin, destination, weight };
            return prev.some(p => p.target_toko === target_toko)
                ? prev.map(p => p.target_toko === target_toko ? { ...p, ...data } : p)
                : [...prev, data];
        });

        if (dataOngkir) {
            const getKurirs = dataOngkir.map((item: any) => {
                return {
                    ...item,
                    service: decodeHTML(item.service),
                    // price: normalizePrice(item)
                }
            })
            const sortedKurirs = [...getKurirs].sort((a, b) => a.price - b.price);
            if (sortedKurirs) {
                const autoSelect = sortedKurirs[0];
                setDataCart((prev: any[]) =>
                    prev.map((s) =>
                        s.kurirs == null && s.title.id == target_toko
                            ? {
                                ...s,
                                kurirs: sortedKurirs,
                                kurir: autoSelect,
                                shipping: autoSelect?.price,
                                pengiriman: null
                            }
                            : s
                    )
                );
                setPengiriman(prev => {
                    const data = { courier_code: autoSelect?.code, courier_name: autoSelect?.name, service: autoSelect?.service, type: autoSelect?.type, shipping_cost: autoSelect?.price, estimated_days: autoSelect?.estimated };

                    return prev.some(p => p.target_toko === target_toko)
                        ? prev.map(p => p.target_toko === target_toko ? { ...p, ...data } : p)
                        : [...prev, data];
                });
                setpilihKurir(true);
            }

        }

    }

    useEffect(() => {
        if (dataCart) {
            dataCart.forEach((toko: any) => {
                if (!toko.pengiriman) {
                    const [kiriman] = pengiriman.filter((p: Pengiriman) => p.target_toko == toko.title.id)
                    setDataCart((prev: any) =>
                        prev.map((item: any) => {
                            return item.title.id == toko.title.id ?
                                ({
                                    ...item,
                                    pengiriman: kiriman
                                })
                                : item
                        }
                        )
                    )
                }
            });
        }
    }, [pengiriman])
    useEffect(() => {
        if (!dataCart || !dataUser) return;
        if (dataCart && !pilihKurir) {
            if (!dataUser?.kode_alamat) {
                Alerts('Kamu belum atur alamat', 'error');
                return;
            }
            for (const toko of dataCart) {
                const [alamat_toko] = toko.data?.map((item: any) => {
                    return item?.mawam_toko?.mawam_profile?.kode_pos || item?.mawam_toko?.mawam_profile?.kode_alamat;
                });
                let berat = 0;
                const items: any = [];
                toko.data?.map((item: any) => {
                    berat += item?.satuan.toLowerCase() == 'kg' ? item?.jumlah * 1000 : item.jumlah;
                    const harga_akhir = item.discount ? item.harga - (item.harga * (item.discount / 100)) : item.harga;
                    const weight = item?.satuan.toLowerCase() == 'kg' ? 1000 : item.jumlah;
                    const jumlah = item?.satuan.toLowerCase() == 'g' ? item.jumlah / 1000 : item.jumlah;
                    const dimensi = hitungDimensiBawang((weight * jumlah)/1000);
                    items.push(
                        {
                            name: item.nama_produk,
                            description: `${item.nama_produk}, total berat ${(weight * jumlah)/1000} ${item.satuan} `,
                            value: harga_akhir * jumlah,
                            weight: weight * jumlah,
                            ...dimensi
                            // quantity: jumlah

                        })
                });
                const target_toko = toko?.title.id;
                loadOngkir(alamat_toko, dataUser?.kode_pos || dataUser?.kode_alamat, target_toko, items, berat);
                setPengiriman(prev => {
                    const data = {
                        target_toko,
                        penerima: dataUser.nama,
                        telepon_penerima: dataUser.no_hp,
                        alamat_penerima: dataUser.alamat.replace("\n", ", "),
                    };

                    return prev.some(p => p.target_toko === target_toko)
                        ? prev.map(p => p.target_toko === target_toko ? { ...p, ...data } : p)
                        : [...prev, data];
                });
            }
        }
        let sub = 0;
        let subkurir = 0;
        dataCart.forEach((toko: any) => {
            toko?.data?.forEach((item: any) => {
                const harga_akhir = item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
                sub += item.jumlah * harga_akhir;
            });
            subkurir += toko.shipping;
            if (toko.kurir) {
                setPengiriman(prev => {
                    const data = { courier_code: toko.kurir?.code, courier_name: toko.kurir?.name, service: toko.kurir?.service, type: toko.kurir?.type, shipping_cost: toko.kurir?.price, estimated_days: toko.kurir?.estimated };

                    return prev.some(p => p.target_toko === toko.title.id)
                        ? prev.map(p => p.target_toko === toko.title.id ? { ...p, ...data } : p)
                        : [...prev, data];
                });
            }
        });
        setSubtotalKurir(subkurir);
        setSubtotal(sub);

        setTotal(sub + subkurir);

    }, [dataCart, dataUser])

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
                        alamat_toko: item?.mawam_toko?.mawam_profile?.alamat?.replace(/\n/g, ' ') || item?.mawam_toko?.alamat_toko,
                        user_id: item?.mawam_toko?.user_id,
                    },
                    data: [],
                    seller_note: null,
                    toggle_note: null,
                    kurirs: null,
                    kurir: null,
                    shipping: null,
                    discount: 0,
                    toggle_kurir: null
                };
            }

            acc[tokoId].data.push(item);
            const harga_akhir = item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
            const subasli = item.harga * item.jumlah;
            const subtotal = harga_akhir * item.jumlah;
            const diskon = subasli - subtotal;
            acc[tokoId].discount += diskon;

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
                const harga_akhir = item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
                sub += item.jumlah * harga_akhir;
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
            fetchCart();
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
    const fetchCart = async () => {
        const { data, error } = await supabase
            .from("mawam_cart")
            .select(`
               id,
                qty,
                mawam_produk (
                    *,
                    mawam_toko:toko_id (
                    nama_toko,
                    alamat_toko,
                    user_id,
                        mawam_profile:user_id(alamat,kode_pos,kode_alamat)
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
                payment_method: metodeBayar ?? 'manual_qris',
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
                const harga_akhir = item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
                toko.subtotal += item.jumlah * harga_akhir;
            });
            toko.total = toko.subtotal + toko.shipping;
            const { data: order, error } = await supabase
                .from("mawam_orders")
                .insert({
                    payment_id: paymentId,

                    invoice,

                    buyer_id: auth.user.id,
                    seller_id: toko.title.user_id,
                    toko_id: toko.title.id,

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
                pengiriman: toko.pengiriman,
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
                discount: item.discount
                    ? (item.jumlah * item.harga) -
                    (item.jumlah * (item.harga - (item.harga * (item.discount / 100))))
                    : 0,
                subtotal: item.discount
                    ? item.jumlah * (item.harga - (item.harga * (item.discount / 100)))
                    : item.jumlah * item.harga,
            }));

            const { error } = await supabase
                .from("mawam_order_items")
                .insert(items);

            if (error) throw error;
        }
        return true;
    }
    async function createPengiriman(orders: any[]) {
        for (const order of orders) {
            const p = order.pengiriman;
            const kirim = {
                order_id: order.id,
                courier_code: p.courier_code,
                courier_name: p.courier_name,
                service: p.service,
                shipping_cost: p.shipping_cost,
                estimated_days: p.estimated_days,
                tracking_number: `Resi-Test-${Date.now()}`,
                status: "diproses",
                type: p.type,
                weight: p.weight,
                origin: p.origin?.kode ?? p.origin,
                destination: p.destination?.kode ?? p.destination,
                penerima: p.penerima,
                telepon_penerima: p.telepon_penerima,
                alamat_penerima: p.alamat_penerima,
            };

            const { error } = await supabase
                .from("mawam_pengiriman")
                .insert(kirim);

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
            id: "manual_qris",
            type: "manual_qris",
            title: "Bayar dengan QRIS",
            icon: "qr-code-outline",
        },
         {
            id: "manual_transfer",
            type: "manual_transfer",
            title: "Transfer Manual",
            icon: "card-outline",
        },
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
                            router.navigate({ pathname: 'akun/alamat', params: { cart } })
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
                                        {dataUser?.alamat?.replace("\n", ' ') ?? 'Anda belum mengatur alamat'}
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
                                    <View style={{ flexDirection: "row", gap: 8, justifyContent: 'space-between' }}>
                                        <View
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}
                                        >
                                            <ThemedText
                                                style={{
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                <Ionicons name="storefront-outline" size={18} color={iconColor} /> {section.title.nama_toko}
                                            </ThemedText>
                                        </View>
                                        <View
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}
                                        >
                                            <ThemedText numberOfLines={1} style={{ fontSize: 12 }}>
                                                <Ionicons name="location-outline" size={18} color={iconColor} /> {section.title.alamat_toko}
                                            </ThemedText>
                                        </View>
                                    </View>
                                </ThemedView>
                            );
                        }}
                        renderItem={({ item }) => {
                            const harga_akhir = item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
                            return (
                                <ThemedView
                                    style={{
                                        padding: 8,
                                    }}
                                >
                                    <ThemedView style={{}}>
                                        <View style={{ flexDirection: 'row', gap: 4, }}>
                                            <ImageLoad source={{ uri: item.gambar_produk ?? gambarDefault }} style={{ width: 65, height: 65, borderRadius: 4 }} />
                                            <View style={{ justifyContent: 'space-between', width: '83%', flex: 1 }}>
                                                <ThemedText numberOfLines={1}>
                                                    {item.nama_produk}
                                                </ThemedText>
                                                <ThemedText numberOfLines={1} style={{ fontSize: 12, opacity: 0.6 }}>{item.jumlah + item.satuan}</ThemedText>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <ThemedText>{rupiah(harga_akhir * item.jumlah)}</ThemedText>
                                                    <ThemedText>{item.jumlah}x</ThemedText>
                                                </View>
                                            </View>
                                        </View>
                                    </ThemedView>
                                </ThemedView>
                            )
                        }}
                        renderSectionFooter={({ section }) => {
                            let jumlah_produk = 0;
                            let subtotal_produk = 0;
                            section.data.forEach((item: any) => {
                                const harga_akhir = item.discount ? (item.harga - (item.harga * (item.discount / 100))) : item.harga;
                                jumlah_produk += item.jumlah;
                                subtotal_produk += item.jumlah * harga_akhir;
                                //hitung juga dengan ongkir
                            });
                            subtotal_produk += section.shipping;

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
                                    {!section.kurirs && <View style={{ paddingVertical: 8 }}><ActivityIndicator size="small" color={iconColor} /></View>}
                                    {section.kurirs && <FlatList
                                        data={section.toggle_kurir ? section.kurirs : [...section.kurirs.filter((i: any) => i == section.kurir), ...section.kurirs.filter((i: any) => i != section.kurir).slice(0, 1)]
                                        }
                                        keyExtractor={(item: any) => item.code + item.name + item.service}
                                        renderItem={({ item }: { item: Kurir }) => {
                                            const terpilih = section.kurir == item;
                                            return (<TouchableOpacity style={{ borderWidth: 1, borderRadius: 4, borderColor: terpilih ? borderKirim : '#cccccc1a', padding: 8, marginBottom: 8 }}
                                                onPress={() => {
                                                    setDataCart((prev: any[]) =>
                                                        prev.map((s) =>
                                                            s.title.id === section.title.id
                                                                ? {
                                                                    ...s,
                                                                    kurir: item,
                                                                    shipping: item.price,
                                                                    pengiriman: null
                                                                }
                                                                : s
                                                        )
                                                    );

                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                        <View style={{ backgroundColor: terpilih ? borderKirim : '', borderRadius: '50%', width: 15, height: 15 }}>
                                                            <Ionicons name={terpilih ? 'checkmark' : 'chevron-forward'} color={terpilih ? '#fff' : iconColor} size={15} />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                                <ThemedText style={{ fontWeight: 600 }} numberOfLines={1}>
                                                                    {item.name}
                                                                </ThemedText>
                                                                <ThemedText style={{ fontSize: 12 }}>
                                                                    {`~ ${item.service} (${item.type})`}
                                                                </ThemedText>
                                                            </View>
                                                            <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                                                                Estimasi pengiriman {item.estimated}
                                                            </ThemedText>
                                                            <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                                                                {item.description}
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
                                    />}
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
                                        {rupiah(subtotal_produk)}
                                    </ThemedText>
                                </View>
                            </ThemedView>
                        }}

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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, opacity: .8 }}>
                            <ThemedText>
                                Subtotal Pengiriman
                            </ThemedText>
                            <ThemedText>
                                {rupiah(subtotalKurir)}
                            </ThemedText>
                        </View>
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
                            if (!pilihKurir) {
                                Alerts('Belum atur pengiriman', 'error');
                                return
                            }
                            if (!metodeBayar) {
                                Alerts('Belum atur metode pembayaran', 'error');
                                return
                            }
                            if (!bankBayar) {
                                Alerts('Belum pilih bank', 'error');
                                return
                            }
                            const payment = await createPayment(total);
                            const orders = payment ? await createOrders(payment.id) : false;
                            const success1 = orders ? await createOrderItems(orders) : false;
                            const success2 = orders ? await createPengiriman(orders) : false;
                            if (success1 && success2) {
                                console.log(orders)
                               if(orders && orders.length>0){ for (const order of orders) {
                                    try {
                                        await notifyOrderCreatedToBuyer(order.buyer_id, order.id);
                                        await notifyOrderCreatedToSeller(order.seller_id, order.id);
                                    } catch (error) {
                                        console.log('Order notification error', error);
                                    }
                                }}
                                const del = await deleteCart(cartIds);
                                if (del) {
                                    router.replace({
                                        pathname: "pembayaran/pembayaran",
                                        params: {
                                            paymentId: payment.id,
                                            payment_type: ['cod', 'qris', 'manual_transfer', 'manual_qris'].indexOf(metodeBayar) == -1 ? 'bank_transfer' : metodeBayar,
                                            bank: bankBayar
                                        },
                                    });
                                }
                            } else {
                                Alerts('Gagal buat pesanan', 'error')
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
