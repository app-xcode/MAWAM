import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { copyText } from '@/constants/copyText'
import { formatTanggal } from '@/constants/countDown'
import { isNoHp } from '@/constants/isNoHp'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, View } from 'react-native'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

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
            .select('*,mawam_profile:user_id(no_hp)')
            .eq('id', toko)
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
                <ThemedText>Rincian Toko...</ThemedText>
            </View>
        )
    }


    return (
        <React.Fragment>
            <Stack.Screen options={{ title: 'Rincian Toko', }} />
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
                                    <ThemedText style={{ fontWeight: '500', fontSize: 15, marginBottom: 4 }} numberOfLines={1}>{data.nama_toko}</ThemedText>
                                    <ThemedText style={{ fontSize: 11 }}>Aktif 1 jam lalu</ThemedText>
                                    <ThemedText style={{ fontSize: 11 }}>{data.alamat_toko}</ThemedText>
                                </View>
                            </View>
                            <View style={{ gap: 4, flexDirection: 'row', justifyContent: 'flex-end', }}>
                                {pemilik && <TouchableOpacity onPress={() => { router.replace('toko/form') }} style={{ borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderColor: iconColor, flexDirection: 'row', gap: 2 }}>
                                    <Ionicons name="storefront-outline" size={18} color={iconColor} />
                                    <ThemedText style={{ textAlign: 'center' }} numberOfLines={1}>Edit Toko</ThemedText>
                                </TouchableOpacity>}
                            </View>
                        </View>
                    </ThemedView>
                    <ThemedView style={{ borderRadius: 8, padding: 8, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="star-outline" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Penilaian
                                </ThemedText>
                            </View>
                            <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
                                <View style={{ flexDirection: 'row', gap: 2, width: '90%' }}>
                                    <ThemedText numberOfLines={1}>
                                        {data?.rating_toko} dari 5
                                    </ThemedText>
                                    <ThemedText style={{ opacity: 0.6 }} numberOfLines={1}>
                                        {/* (2,5RB Penilaian) */}
                                        {/* (2 Penilaian) */}
                                    </ThemedText>
                                </View>
                                {/* <Ionicons name="chevron-forward" size={18} color={iconColor} /> */}
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="cart-outline" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Orderan
                                </ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 4, flex: 2 }}>
                                <ThemedText>
                                    {data.orderan}
                                </ThemedText>
                                <ThemedText style={{ opacity: 0.6 }}>
                                    Orderan
                                </ThemedText>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="storefront-outline" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Produk
                                </ThemedText>
                            </View>
                            <View style={{ flex: 2 }}>
                                <ThemedText>
                                    {data?.total_produk ?? 0}
                                </ThemedText>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="people-outline" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Bergabung
                                </ThemedText>
                            </View>
                            <View style={{ flex: 2 }}>
                                <ThemedText>
                                    {/* 6 Tahun */}
                                    {formatTanggal(data?.created_at)}
                                </ThemedText>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="list" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Keterangan
                                </ThemedText>
                            </View>
                            <View style={{ flex: 2 }}>
                                <ThemedText>
                                    {data?.deskripsi}
                                </ThemedText>
                            </View>
                        </View>
                    </ThemedView>
                    <ThemedView style={{ borderRadius: 8, padding: 8, marginBottom: 8 }}>
                        <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8, }}
                            onPress={() => {
                                copyText('https://mawam.expo.app/toko/detail?toko=' + data?.id, 'Berhasil salin tautan')
                            }}
                        >
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="location-outline" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Tautan Toko
                                </ThemedText>
                            </View>
                            <View style={{ flex: 2 }}>
                                <ThemedText>
                                    {'https://mawam.expo.app/toko/detail?toko=' + data?.id}
                                </ThemedText>
                            </View>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, borderBottomWidth: 1, borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <View style={{
                                flexDirection: 'row', gap:
                                    8, flex: 1
                            }}>
                                <Ionicons name="shield-checkmark-outline" size={18} color={iconColor} />
                                <ThemedText numberOfLines={1}>
                                    Akun Terverifikasi
                                </ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 2, width: '65%', alignItems: 'center', flex: 2 }}>
                                <Ionicons name="mail-outline" size={16} color={iconColor} />
                                {isNoHp(data.mawam_profile.no_hp ?? '0') && <Ionicons name="phone-portrait-outline" size={15} color={iconColor} />}
                            </View>
                        </View>
                    </ThemedView>
                    <View style={{ padding: 8 }}>
                        <TouchableOpacity style={styles.button} onPress={() => {
                            router.back()
                        }}>
                            <ThemedText style={styles.buttonText}>
                                Lihat Semua Produk
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
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
    button: {
        backgroundColor: ColorDark,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    buttonText: {
        color: ColorLight,
        fontWeight: '600',
    },
})