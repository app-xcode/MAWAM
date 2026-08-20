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
import {
    notifyPaymentReceivedToBuyer,
    notifyPaymentVerificationToSeller,
} from '@/services/notification/notificationTriggers'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from "expo-clipboard"
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
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
    const [manualDetails, setManualDetails] = useState<any>(null);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
    const manualMethod = payment_type === 'manual_transfer' || payment_type === 'manual_qris';

    const loadPaymentProofs = async () => {
        if (!manualMethod || !paymentId) return;
        const { data, error } = await supabase
            .from('mawam_payment_proofs')
            .select('id, storage_path, status, ai_verdict, ai_confidence, ai_reason, reviewed_at, created_at')
            .eq('payment_id', paymentId)
            .order('created_at', { ascending: false });
        if (error || !data) {
            console.log(error);
            return;
        }
        const proofs = await Promise.all(data.map(async (proof: any) => {
            const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 60 * 60);
            return { ...proof, imageUrl: signed?.signedUrl ?? null };
        }));
        setPaymentProofs(proofs);
        if (proofs[0]?.ai_verdict) setAiResult({ verdict: proofs[0].ai_verdict, confidence: proofs[0].ai_confidence, reason: proofs[0].ai_reason });
    };

    const loadPayment = async () => {
        if (manualMethod) {
            const { data, error } = await supabase.functions.invoke('manual-payment', {
                body: { action: 'details', paymentId },
            });
            if (error || !data?.success) {
                console.log(error ?? data?.message);
                Alerts(data?.message ?? 'Gagal memuat pembayaran manual', 'error');
                return;
            }
            setManualDetails(data.data);
            setDataPayment(data.data);
            await loadPaymentProofs();
            return;
        }
        const { data, error } = await supabase.functions.invoke("mawam-mayar", {
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
        if (user === null) {
            router.replace('produk');
        }
    }, [user]);

    const notifyPaymentLifecycle = async (status: string) => {
        if (!paymentId || !status || status.includes('pending')) return;

        try {
            const { data: orders, error } = await supabase
                .from('mawam_orders')
                .select('id, buyer_id, seller_id')
                .eq('payment_id', paymentId);

            if (error) {
                console.log('Payment notification fetch error', error);
                return;
            }

            for (const order of orders || []) {
                if (order.buyer_id) {
                    await notifyPaymentReceivedToBuyer(order.buyer_id, order.id);
                }
                if (order.seller_id) {
                    await notifyPaymentVerificationToSeller(order.seller_id, order.id);
                }
            }
        } catch (notificationError) {
            console.log('Payment lifecycle notification error', notificationError);
        }
    };

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

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

        channel = supabase
            .channel(`payment-${paymentId}-${Date.now()}`)
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

                    if (manualMethod) {
                        void loadPayment();
                        void loadPaymentProofs();
                    }

                    if (status && !status.includes("pending")) {
                        void notifyPaymentLifecycle(status);
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
            if (channel) {
                supabase.removeChannel(channel);
                channel = null;
            }
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

    const uploadProof = async () => {
        if (!user || !paymentId) return;
        if (paymentProofs.length >= 3) {
            Alerts('Maksimal upload bukti pembayaran adalah 3 kali.', 'error');
            return;
        }
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return Alerts('Izinkan akses galeri untuk mengunggah bukti pembayaran.', 'error');
        const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (picked.canceled) return;
        try {
            setUploadingProof(true);
            const asset = picked.assets[0];
            const image = await ImageManipulator.manipulateAsync(asset.uri, asset.width > 1600 ? [{ resize: { width: 1600 } }] : [], { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP });
            const file = await (await fetch(image.uri)).arrayBuffer();
            if (file.byteLength > 5 * 1024 * 1024) throw new Error('Ukuran bukti maksimal 5 MB.');
            const path = `${user.id}/${paymentId}/${Date.now()}.webp`;
            const { error: storageError } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: 'image/webp', upsert: false });
            if (storageError) throw storageError;
            const { data: proof, error: proofError } = await supabase.from('mawam_payment_proofs')
                .insert({ payment_id: paymentId, buyer_id: user.id, storage_path: path, mime_type: 'image/webp', file_size: file.byteLength })
                .select('id').single();
            if (proofError) throw proofError;
            const { data, error } = await supabase.functions.invoke('manual-payment', { body: { action: 'verify-proof', paymentId, proofId: proof.id } });
            if (error || !data?.success) throw new Error(data?.message ?? 'Bukti tersimpan, tetapi verifikasi awal belum dapat diproses.');
            setAiResult(data.data);
            setManualDetails((current: any) => ({ ...current, verificationStatus: 'menunggu_verifikasi_admin' }));
            await loadPaymentProofs();
            Alerts('Bukti telah diteruskan untuk verifikasi admin.', 'success');
        } catch (error: any) {
            Alerts(error.message ?? 'Gagal mengunggah bukti pembayaran.', 'error');
        } finally {
            setUploadingProof(false);
        }
    };

    if (manualMethod) {
        const isQris = payment_type === 'manual_qris';
        const status = manualDetails?.verificationStatus ?? 'menunggu_pembayaran';
        const latestProof = paymentProofs[0];
        const proofLimitReached = paymentProofs.length >= 3;
        const statusLabel: Record<string, string> = { menunggu_pembayaran: 'Menunggu pembayaran', bukti_diupload: 'Bukti diupload', verifikasi_ai: 'Verifikasi AI', menunggu_verifikasi_admin: 'Menunggu verifikasi admin', dikonfirmasi: 'Pembayaran dikonfirmasi', ditolak: 'Bukti ditolak' };
        return <React.Fragment>
            <Stack.Screen options={{ title: 'Pembayaran', }} />
            <ScrollView style={{ flex: 1 }}><View style={styles.container}>
                <ThemedView style={styles.card}>
                    <ThemedText style={{ opacity: 0.7 }}>Total Pembayaran</ThemedText>
                    <ThemedText style={{ fontWeight: '700', fontSize: 20 }}>{rupiah(manualDetails?.amount ?? 0)}</ThemedText>
                    <View style={styles.statusRow}><Ionicons name="time-outline" size={18} color={iconColor} /><ThemedText>{statusLabel[status] ?? status}</ThemedText></View>
                </ThemedView>
                {isQris ? <ThemedView style={styles.card}>
                    <ThemedText style={{ fontWeight: '700' }}>Bayar dengan QRIS</ThemedText>
                    <ThemedText style={{ opacity: 0.7 }}>Scan QRIS berikut. Nominal sudah sesuai total pesanan.</ThemedText>
                    <ImageLoad style={styles.qris} source={{ uri: `https://qrcode-image-xcode.vercel.app/qrcode.png?text=${encodeURIComponent(manualDetails?.qrisPayload ?? '')}&w=500` }} />
                </ThemedView> : <ThemedView style={styles.card}>
                    <ThemedText style={{ fontWeight: '700' }}>Transfer Manual</ThemedText>
                    <ThemedText style={{ opacity: 0.7 }}>Transfer tepat sejumlah {rupiah(manualDetails?.amount ?? 0)} ke rekening admin.</ThemedText>
                    <ThemedText style={styles.accountText}>{manualDetails?.bank?.name}</ThemedText>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><ThemedText style={styles.accountText}>{manualDetails?.bank?.accountNumber}</ThemedText><TouchableOpacity onPress={() => copyText(manualDetails?.bank?.accountNumber)}><ThemedText style={{ opacity: 0.7 }}>Salin</ThemedText></TouchableOpacity></View>
                    <ThemedText>a.n. {manualDetails?.bank?.accountHolder}</ThemedText>
                </ThemedView>}
                <ThemedView style={styles.card}>
                    <ThemedText style={{ fontWeight: '700' }}>Upload bukti pembayaran</ThemedText>
                    <ThemedText style={{ opacity: 0.7 }}>AI melakukan pemeriksaan awal; keputusan akhir tetap oleh admin.</ThemedText>
                    {latestProof?.imageUrl && <View style={styles.proofContainer}>
                        <ThemedText style={{ fontWeight: '600' }}>Bukti pembayaran terakhir</ThemedText>
                        <ImageLoad style={styles.proofImage} source={{ uri: latestProof.imageUrl }} />
                        <ThemedText style={{ opacity: 0.7 }}>Diunggah {formatWaktu(latestProof.created_at)}</ThemedText>
                    </View>}
                    {aiResult && <View style={styles.aiResult}><ThemedText style={{ fontWeight: '600' }}>Hasil review AI: {aiResult.verdict}</ThemedText>{aiResult.confidence != null && <ThemedText>Keyakinan: {Math.round(aiResult.confidence * 100)}%</ThemedText>}<ThemedText style={{ opacity: 0.7 }}>{aiResult.reason}</ThemedText></View>}
                    {latestProof?.status === 'dikonfirmasi' && <View style={styles.adminApproved}><ThemedText style={{ fontWeight: '600' }}>Keputusan admin: pembayaran dikonfirmasi</ThemedText>{latestProof.reviewed_at && <ThemedText>{formatWaktu(latestProof.reviewed_at)}</ThemedText>}</View>}
                    {latestProof?.status === 'ditolak' && <View style={styles.adminRejected}><ThemedText style={{ fontWeight: '600' }}>Keputusan admin: bukti ditolak</ThemedText><ThemedText>Silakan unggah bukti pembayaran yang benar.</ThemedText></View>}
                    {status !== 'dikonfirmasi' && !proofLimitReached && <TouchableOpacity disabled={uploadingProof} style={[styles.button, uploadingProof && { opacity: 0.6 }]} onPress={uploadProof}>{uploadingProof ? <ActivityIndicator color={ColorLight} /> : <ThemedText style={styles.buttonText}>{latestProof ? 'Ganti Bukti Pembayaran' : 'Upload Bukti Pembayaran'}</ThemedText>}</TouchableOpacity>}
                    {status !== 'dikonfirmasi' && <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>{proofLimitReached ? 'Batas maksimal 3 kali upload bukti pembayaran telah tercapai.' : `Upload ${paymentProofs.length}/3. Bukti lama tetap disimpan sebagai riwayat pemeriksaan.`}</ThemedText>}
                </ThemedView>
            </View></ScrollView>
            <ThemedView style={{ padding: 20, paddingTop: 10 }}><TouchableOpacity style={styles.button} onPress={() => router.navigate({ pathname: 'pesanan/pesanan', params: { tab: status === 'dikonfirmasi' ? 'Dikemas' : 'Belum Bayar' } })}><ThemedText style={styles.buttonText}>Lihat Pesanan</ThemedText></TouchableOpacity></ThemedView>
        </React.Fragment>
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
                                <TouchableOpacity onPress={() => { dataPayment && copyText(dataPayment?.va_number) }} style={{ padding: 8 }}>
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
    card: { borderRadius: 8, padding: 12, marginBottom: 8, gap: 8 },
    statusRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 },
    qris: { width: 260, height: 260, alignSelf: 'center', marginTop: 8 },
    accountText: { fontSize: 18, fontWeight: '600', marginTop: 2 },
    aiResult: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#cccccc18', gap: 4 },
    proofContainer: { marginTop: 8, gap: 6 },
    proofImage: { width: '100%', height: 260, borderRadius: 8, backgroundColor: '#cccccc18', objectFit: 'contain' },
    adminApproved: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#22c55e22', gap: 4 },
    adminRejected: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#ef444422', gap: 4 },
})
