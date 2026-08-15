import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import { Link, Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, View } from 'react-native'
import Produks from './Produks'
import { useAuth } from '@/utils/auth'
import { isNoHp, nohptowa } from '@/constants/isNoHp'

export default function ModalScreen() {
    const { user } = useAuth();
    const { toko } = useLocalSearchParams();
    const [data, setData] = useState<any>(null)
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [pemilik, setPemilik] = useState(false);


    useEffect(() => {
        fetchToko();
    }, []);

    useEffect(() => {
        if (user && data) {
            setPemilik(user.id == data.user_id)
        }
    }, [user, data])

    const fetchToko = async () => {
        const { data, error } = await supabase
            .from('mawam_toko')
            .select('*,mawam_profile:user_id(*)')
            .eq('id', toko)
            .maybeSingle();

        if (error) {
            console.log(error);
            router.navigate('/toko');
            return;
        }

        if (data) {
            const { count: total_produk } = await supabase
                .from('mawam_produk')
                .select('*', { count: 'exact', head: true })
                .eq('toko_id', data?.id);

            const { count: orderan } = await supabase
                .from('mawam_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', data?.user_id);

            const { count: perlu_kirim } = await supabase
                .from('mawam_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', data?.user_id)
                .in('status', ["paid", "processed", "settlement"]);

            const { count: pembatalan } = await supabase
                .from('mawam_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', data?.user_id)
                .eq('status', "cancelled");

            const { count: pengiriman } = await supabase
                .from('mawam_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', data?.user_id)
                .eq('status', "shipped");

            const { count: penilaian } = await supabase
                .from('mawam_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', data?.user_id)
                .eq('status', "completed");


            const dataAkhir = {
                ...data,
                total_produk,
                orderan,
                perlu_kirim,
                pembatalan,
                pengiriman,
                penilaian
            };

            setData(dataAkhir);
        } else {
            router.push('/toko/form');
        }
    };


    if (!data) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Detail Toko...</ThemedText>
            </View>
        )
    }

    const BtnStatus = ({ text, angka, href }: any) => {
        return (<TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', padding: 2, }}
        onPress={()=>{
           href && router.navigate(href)
        }}
        >
            <ThemedText style={{ fontWeight: 600, fontSize: 18 }}>{angka??0}</ThemedText>
            <ThemedText style={{ opacity: 0.7, fontSize: 14 }} numberOfLines={1}>{text??'Text'}</ThemedText>
        </TouchableOpacity>)
    }

    return (
        <React.Fragment>
            <Stack.Screen options={{ title: pemilik ? 'Toko Saya' : 'Detail Toko', }} />
            <ScrollView
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <ThemedView style={{ borderRadius: 8, padding: 8, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                                <ImageLoad style={{ width: 60, height: 60, borderRadius: '50%' }} contentFit="contain"
                                    source={{
                                        uri: data.gambar_toko || gambarDefault
                                    }} />
                                <View>
                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }} onPress={() => {
                                        router.navigate({ pathname: 'toko/rincian', params: { toko: data?.id } })
                                    }}>
                                        <ThemedText style={{ fontWeight: '500', fontSize: 15, marginBottom: 4 }} numberOfLines={1}>{data.nama_toko}</ThemedText>
                                        <Ionicons name="chevron-forward" size={18} color={iconColor} />
                                    </TouchableOpacity>
                                    <ThemedText style={{ fontSize: 11 }}>Aktif 1 jam lalu</ThemedText>
                                </View>
                            </View>
                            <View style={{ gap: 4, flexDirection: 'row' }}>
                                {pemilik && <TouchableOpacity onPress={() => { router.navigate('prod/form') }} style={{ borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderColor: iconColor, flexDirection: 'row', gap: 2 }}>
                                    <Ionicons name="add" size={18} color={iconColor} />
                                    <ThemedText style={{ textAlign: 'center' }}>Produk</ThemedText>
                                </TouchableOpacity>}
                                {
                                    !pemilik &&
                                    data?.mawam_profile?.no_hp && isNoHp(data?.mawam_profile?.no_hp) && <Link target="_blank" href={encodeURI('https://api.whatsapp.com/send?phone=' + nohptowa(data?.mawam_profile?.no_hp) + '&text=Halo Admin, Saya mau menanyakan tentang ')} style={{ borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderColor: iconColor, flexDirection: 'row', gap: 2 }}>
                                        <Ionicons name="logo-whatsapp" size={18} color={iconColor} />
                                        <ThemedText style={{ textAlign: 'center' }}>Chat</ThemedText>
                                    </Link>}
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8 }}>
                            <View style={{ alignItems: 'center', width: '33.3%', }}>
                                <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{data.rating_toko}</ThemedText>
                                <ThemedText style={{ fontSize: 12 }}>Penilaian</ThemedText>
                            </View>
                            <View style={{ alignItems: 'center', width: '33.3%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#8b8b8b7c' }}>
                                <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{data.total_produk ?? 0}</ThemedText>
                                <ThemedText style={{ fontSize: 12 }}>Produk</ThemedText>
                            </View>
                            <View style={{ alignItems: 'center', width: '33.3%', }}>
                                <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{data.orderan}</ThemedText>
                                <ThemedText style={{ fontSize: 12, textAlign: 'center' }} numberOfLines={1}>Orderan</ThemedText>
                            </View>
                        </View>
                    </ThemedView>
                    {pemilik && <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <ThemedText style={{ fontWeight: '600' }}>
                                Status Pesanan
                            </ThemedText>
                            <TouchableOpacity style={{ flexDirection: 'row', gap: 2, opacity: 0.7, alignItems: 'center' }}
                            onPress={()=>{
                                router.navigate('toko/penjualan')
                            }}
                            >
                                <ThemedText style={{ fontSize: 12 }}>
                                    Riwayat Penjualan
                                </ThemedText>
                                <Ionicons name="chevron-forward" size={18} color={iconColor} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-evenly', flexWrap: 'wrap', flex: 1, marginVertical: 10 }}>
                            <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-evenly', flexWrap: 'wrap', flex: 1 }}>
                                <BtnStatus text='Perlu Kirim' angka={data?.perlu_kirim} href='toko/penjualan/?tab=Perlu Kirim' />
                                <BtnStatus text='Pengiriman' angka={data.pengiriman} href='toko/penjualan/?tab=Pengiriman'/>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-evenly', flexWrap: 'wrap', flex: 1 }}>
                                <BtnStatus text='Penilaian' angka={data.penilaian} href='toko/penjualan/?tab=Penilaian'/>
                                <BtnStatus text='Pembatalan' angka={data.pembatalan} href='toko/penjualan/?tab=Pembatalan' />
                            </View>
                        </View>
                    </ThemedView>}
                    <Produks id_toko={data?.id} nama_toko={data.nama_toko} pemilik={pemilik} />
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
})