import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { ImageLoad } from '@/components/ui/Imageload'
import Alerts from '@/constants/Alerts'
import { copyText } from '@/constants/copyText'
import { formatWaktu, useCountdown } from '@/constants/countDown'
import { paymentGuide } from '@/constants/paymentGuide'
import { rupiah } from '@/constants/rupiah'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from "expo-clipboard"
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, StyleSheet, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;

export default function ModalScreen() {
    const { paymentId, payment_type, bank } = useLocalSearchParams();
    const { user } = useAuth();
    const [dataPayment, setDataPayment] = useState<any>(null)
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const timeLeft = useCountdown(dataPayment?.expired_at)
    const methodKey = dataPayment?.bank;
    const stepsM = paymentGuide[methodKey]?.mbanking;
    const stepsA = paymentGuide[methodKey]?.atm || paymentGuide[methodKey]?.ewallet;
    const isStepAtm = paymentGuide[methodKey]?.atm ?? null;
    const paymentTitle = paymentGuide[methodKey]?.title + (['cod', 'qris'].indexOf(methodKey) == -1 ? ' Virtual Account' : '');
    const paymentBank = (['cod', 'qris'].indexOf(methodKey) == -1 ? 'bank ' : ' ') + paymentGuide[methodKey]?.title;
    const [stepM, setstepM] = useState(true);
    const [stepA, setstepA] = useState(true);
    const [statusBayar, setStatusBayar] = useState('pending');


    const loadPayment = async () => {
        const { data, error } = await supabase.functions.invoke("mawam-midtrans", {
            body: {
                paymentId,
                payment_type,
                bank
            },
        });
        if (error) {
            console.log(error)
        }
        else {
            if (data.success) {
                setDataPayment(data.data)
            }
        }
    }


    useEffect(() => {
        loadPayment();
    }, [])


    useEffect(() => {
        if (!user) {
            router.replace('produk');
        }
    }, [user]);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from("mawam_payments")
                .select("status")
                .eq("id", paymentId)
                .single();

            if (!error && data) {
                setStatusBayar(data.status);
            }
        };

        load();

        const channel = supabase
            .channel(`payment-${paymentId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "mawam_payments",
                    filter: `id=eq.${paymentId}`,
                },
                (payload) => {
                    const status = payload.new.status;

                    setStatusBayar(status);

                    if (!status.includes("pending")) {
                        Alerts("Pembayaran diperbaharui", "info");

                        router.replace({
                            pathname: "pesanan/pesanan",
                            params: {
                                tab:
                                    status === "paid" || status === "settlement"
                                        ? "Dikemas"
                                        : "Semua",
                            },
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [paymentId]);



    if (!dataPayment) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Pembayaran...</ThemedText>
            </View>
        )
    }

    const UIStep = ({ stepx }: any) => {
        return stepx?.map((step: string, index: number) => {
            return <View key={index} style={{ flexDirection: "row", gap: 8, paddingVertical: 6, marginBottom: 4, paddingLeft: 10, flex: 1 }}>

                <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#cccccc1a",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <ThemedText>{index + 1}</ThemedText>
                </View>

                <View style={{ flexDirection: 'row', flex: 1, flexWrap: 'wrap' }}>
                    <ThemedText style={{ opacity: 0.7 }}>
                        {step}
                    </ThemedText>
                    {
                        step.includes('nomor VA') &&
                        <ThemedText style={{ marginLeft: 4, fontWeight: '600', marginBottom: 8 }}>
                            {dataPayment?.va_number}
                        </ThemedText>
                    }
                </View>

            </View>
        })
    }

    return (
        <React.Fragment>
            <Stack.Screen options={{ title: 'Pembayaran', }} />
            <ScrollView
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: '#cccccc1a', borderBottomWidth: 1, paddingBottom: 8 }}>
                            <ThemedText style={{ opacity: 0.7, }}>Total Pembayaran</ThemedText>
                            <ThemedText style={{ fontWeight: '600' }}>
                                {rupiah(dataPayment ? dataPayment.amount : 0)}
                            </ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: '#cccccc1a', paddingVertical: 8 }}>
                            <ThemedText style={{ opacity: 0.7, }}>Bayar Dalam</ThemedText>
                            <View style={{ alignItems: 'flex-end' }}>
                                <ThemedText style={{ fontWeight: '600' }}>
                                    {timeLeft}
                                </ThemedText>
                                <ThemedText>
                                    Jatuh tempo {formatWaktu(dataPayment?.expired_at)}
                                </ThemedText>
                            </View>
                        </View>
                    </ThemedView>
                    <ThemedView style={{ borderRadius: 8, paddingRight: 8, paddingVertical: 10, marginBottom: 8, paddingLeft: 32 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: '#cccccc1a', borderBottomWidth: 1, paddingBottom: 8 }}>
                            <ThemedText>{
                                paymentTitle
                                ?? ''}</ThemedText>
                        </View>
                        {methodKey != 'qris' && <View style={{ borderBottomColor: '#cccccc1a', borderBottomWidth: 1, paddingBottom: 8 }}>
                            <ThemedText style={{ opacity: 0.5 }}>No. Rek/Virtual Account</ThemedText>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <ThemedText style={{ fontWeight: '600', fontSize: 18, }}>{
                                    dataPayment ? dataPayment.va_number : ''
                                }</ThemedText>
                                <TouchableOpacity onPress={() => { dataPayment && copyText(dataPayment?.va_number) }}>
                                    <ThemedText style={{ opacity: 0.5 }}>
                                        Salin
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>}
                        {methodKey == 'qris' && <View style={{ borderBottomColor: '#cccccc1a', borderBottomWidth: 1, paddingBottom: 8 }}>
                            <ThemedText style={{ opacity: 0.5, marginBottom: 4, fontSize: 11 }}>Scan kode Qr ini / Salin untuk simulasi bayar </ThemedText>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ImageLoad style={{ width: 200, height: 200 }} source={{ uri: dataPayment?.va_number ? 'https://qrcode-image-xcode.vercel.app/qrcode.png?text=' + dataPayment?.va_number + '&w=500' : gambarDefault }} />
                                <TouchableOpacity onPress={() => { dataPayment && copyText('https://api.sandbox.midtrans.com/v2/qris/' + dataPayment?.midtrans_order_id + '/qr-code') }} style={{ padding: 8 }}>
                                    <ThemedText style={{ opacity: 0.5 }}>
                                        Salin
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>}
                        <View style={{ gap: 8 }}>
                            <ThemedText style={{ opacity: 0.7 }}>Proses verifikasi kurang dari 10 menit setelah pembayaran berhasil</ThemedText>
                            <ThemedText>Bayar pesanan ke Virtual Account di atas sebelum membuat pesanan kembali dengan Virtual Account agar nomor tetap sama.</ThemedText>
                            <ThemedText>Hanya menerima dari {paymentBank}</ThemedText>
                        </View>
                    </ThemedView>
                    <ThemedView style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8, }}>
                        <TouchableOpacity onPress={() => { setstepM(!stepM) }} style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: '#cccccc1a', borderBottomWidth: 1, paddingVertical: 8 }}>
                            <ThemedText style={{ fontWeight: '600' }}>Petunjuk Transfer mBanking</ThemedText>
                            <Ionicons name={stepM ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={iconColor} />
                        </TouchableOpacity>
                        {stepM && <UIStep stepx={stepsM} />}
                        <TouchableOpacity onPress={() => { setstepA(!stepA) }} style={{ flexDirection: 'row', justifyContent: 'space-between', borderColor: '#cccccc1a', borderBottomWidth: stepA ? 1 : 0, borderTopWidth: !stepA ? 1 : 0, paddingVertical: 8 }}>
                            <ThemedText style={{ fontWeight: '600' }}>{isStepAtm ? 'Petunjuk Transfer ATM' : 'Petunjuk Transfer E-Wallet'}</ThemedText>
                            <Ionicons name={!stepA ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={iconColor} />
                        </TouchableOpacity>
                        {stepA && <UIStep stepx={stepsA} />}
                    </ThemedView>
                </View>
            </ScrollView>
            <ThemedView style={{ padding: 20, paddingTop: 10 }}>
                <TouchableOpacity style={styles.button} onPress={() => {
                    router.navigate({
                        pathname: 'pesanan/pesanan', params: {
                            tab:
                                statusBayar == 'paid' || statusBayar == 'settlement' ? "Dikemas" :
                                    statusBayar == 'pending' ? "Belum Bayar" :
                                        "Semua"
                        },
                    })
                }}>
                    <ThemedText style={styles.buttonText}>
                        OK
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>
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