import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, View } from 'react-native'
import { useAuth } from '@/utils/auth'
import { copyText } from '@/constants/copyText'

export default function ModalScreen() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null)
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';

    useEffect(() => {
        fetchToko(user?.id);
    }, [user]);

    const fetchToko = async (user_id: string) => {
        const { data, error } = await supabase
            .from('mawam_toko')
            .select('*,mawam_profile:user_id(*)')
            .eq('user_id', user_id)
            .maybeSingle();

        if (error) {
            console.log(error);
            return;
        }

        if (data) {
            const { count, error } = await supabase
                .from('mawam_produk')
                .select('*', { count: 'exact', head: true })
                .eq('toko_id', data?.id);
            const dataTotal = {
                ...data,
                total_produk: count ?? 0
            };

            const { count: orderan, error: er2 } = await supabase
                .from('mawam_orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', dataTotal?.user_id);
            const dataOrder = {
                ...dataTotal,
                orderan: orderan
            };
            setData(dataOrder);
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
                <ThemedText>Toko Saya...</ThemedText>
            </View>
        )
    }


    return (
        <React.Fragment>
            <Stack.Screen options={{ title: 'Toko Saya', }} />
            <ScrollView
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <ThemedView style={{ borderRadius: 8, padding: 8, marginBottom: 8, }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 8, }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <ImageLoad style={{ width: 60, height: 60, borderRadius: '50%' }} contentFit="contain"
                                    source={{
                                        uri: data.gambar_toko || gambarDefault
                                    }} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={{ fontWeight: '500', fontSize: 15, marginBottom: 4 }} numberOfLines={1}>{data.nama_toko}</ThemedText>
                                    <TouchableOpacity onPress={() => {
                                        copyText('https://mawam.expo.app/toko/detail?toko=' + data?.id, 'Berhasil salin tautan')
                                    }}
                                        style={{ flexDirection: 'row' }}
                                    >
                                        <ThemedText style={{ fontSize: 11 }} numberOfLines={1}>
                                            {'https://mawam.expo.app/toko/detail?toko=' + data?.id}
                                        </ThemedText>
                                        <Ionicons name='copy-outline' color={iconColor} size={12} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={{ gap: 4, flexDirection: 'row', }}>
                                <TouchableOpacity onPress={() => { router.navigate({ pathname: 'toko/detail', params: { toko: data.id } }) }} style={{ borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderColor: iconColor, }}>
                                    <ThemedText style={{ textAlign: 'center' }} numberOfLines={1}>Kunjungi Toko</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ThemedView>
                    <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <ThemedText style={{ fontWeight: '600' }}>
                                Status Pesanan
                            </ThemedText>
                            <TouchableOpacity style={{ flexDirection: 'row', gap: 2, opacity: 0.7, alignItems: 'center' }} >
                                <ThemedText style={{ fontSize: 12 }}>
                                    Riwayat Penjualan
                                </ThemedText>
                                <Ionicons name="chevron-forward" size={18} color={iconColor} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-evenly', flexWrap: 'wrap', flex:1, marginVertical:10 }}>
                            <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-evenly', flexWrap: 'wrap', flex:1 }}>
                                <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', paddingVertical:8,paddingHorizontal:2 }}>
                                    <ThemedText style={{ fontWeight: 600, fontSize:18 }}>0</ThemedText>
                                    <ThemedText style={{ opacity: 0.7 }} numberOfLines={1}>Perlu Kirim</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', paddingVertical:8,paddingHorizontal:2 }}>
                                    <ThemedText style={{ fontWeight: 600, fontSize:18 }}>0</ThemedText>
                                    <ThemedText style={{ opacity: 0.7 }} numberOfLines={1}>Pembatalan</ThemedText>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-evenly', flexWrap: 'wrap', flex:1 }}>
                                <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', paddingVertical:8,paddingHorizontal:2 }}>
                                    <ThemedText style={{ fontWeight: 600, fontSize:18 }}>0</ThemedText>
                                    <ThemedText style={{ opacity: 0.7 }} numberOfLines={1}>Pengembalian</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', paddingVertical:8,paddingHorizontal:2 }}>
                                    <ThemedText style={{ fontWeight: 600, fontSize:18 }}>0</ThemedText>
                                    <ThemedText style={{ opacity: 0.7 }} numberOfLines={1}>Penilaian</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ThemedView>
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