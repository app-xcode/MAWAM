import ThemedInput from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Alerts from '@/constants/Alerts';
import { rupiah } from '@/constants/rupiah';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { notifyOrderShippedToBuyer } from '@/services/notification/notificationTriggers';
import { useAuth } from '@/utils/auth';
import { useTheme } from '@/utils/theme';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const BITESHIP_ENDPOINT = 'https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/biteship';

const COURIER_OPTIONS = [
    { code: 'jne', name: 'JNE' },
    { code: 'jnt', name: 'J&T' },
    { code: 'sicepat', name: 'SiCepat' },
    // { code: 'anteraja', name: 'AnterAja' },
    // { code: 'pos', name: 'POS Indonesia' },
    // { code: 'tiki', name: 'TIKI' },
    // { code: 'lion', name: 'Lion Parcel' },
    // { code: 'sap', name: 'SAP Express' },
];

const SERVICE_OPTIONS: Record<string, { code: string; name: string }[]> = {
    jne: [
        { code: 'REG', name: 'JNE REG' },
        { code: 'YES', name: 'JNE YES' },
        { code: 'OKE', name: 'JNE OKE' },
    ],
    jnt: [
        { code: 'EZ', name: 'J&T EZ' },
    ],
    sicepat: [
        { code: 'REG', name: 'SiCepat REG' },
        { code: 'BEST', name: 'SiCepat BEST' },
        { code: 'HALU', name: 'SiCepat HALU' },
    ],
};

function getBiteshipTrackingNumber(data: any) {
    return data?.courier?.waybill_id
        ?? data?.courier?.awb
        ?? data?.awb
        ?? data?.waybill
        ?? data?.tracking_number
        ?? data?.data?.courier?.waybill_id
        ?? data?.data?.awb
        ?? data?.data?.waybill_id
        ?? null;
}

function getBiteshipOrderId(data: any) {
    return data?.id ?? data?.order_id ?? data?.data?.id ?? null;
}

function toNumber(value: any) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function formatWeight(weight: number) {
    if (!Number.isFinite(weight)) {
        return '-';
    }
    return `${weight.toLocaleString('id-ID')} g`;
}

export default function AturPengirimanSeller() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const scheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[scheme].icon;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'idle' | 'biteship' | 'manual'>('idle');

    const [useBuyerChoice, setUseBuyerChoice] = useState(true);

    const [courierCode, setCourierCode] = useState('');
    const [service, setService] = useState('');
    const [weight, setWeight] = useState<string>('0');

    const [selectedCourierCode, setSelectedCourierCode] = useState('');
    const [selectedCourierName, setSelectedCourierName] = useState('');

    const [manualCourierCode, setManualCourierCode] = useState('');
    const [manualCourierName, setManualCourierName] = useState('');
    const [manualResi, setManualResi] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user === null) {
            router.replace('produk');
            return;
        }
        if (orderId) void fetchOrder();
    }, [user, orderId]);

    async function fetchOrder() {
        setLoading(true);

        const { data, error } = await supabase
            .from('mawam_orders')
            .select(`
            *,
            seller:mawam_profile!seller_id(
                *,
                toko:mawam_toko(*)
            ),
            pengiriman:mawam_pengiriman(*),
            items:mawam_order_items(
                *,
                produk:mawam_produk(*)
            )
        `)
            .eq('id', orderId)
            .maybeSingle();

        if (error) {
            console.log(error);
            setLoading(false);
            return;
        }

        setOrder(data ?? null);
        setLoading(false);
    }

    useEffect(() => {
        const items = order?.items ?? [];
        const total = items.reduce((sum: number, item: any) => {
            const qty = toNumber(item.qty);
            const berat = item.produk?.satuan == 'kg' ? item.produk?.berat_per_unit * 1000 : item.produk?.berat_per_unit;
            const beratPerUnit = toNumber(berat);
            return sum + (qty * beratPerUnit);
        }, 0);

        setWeight(String(total));
    }, [order]);

    const totalWeight = useMemo(() => toNumber(weight), [weight]);

    const [overwriteOpen, setOverwriteOpen] = useState(false);

    async function submitManual(skipOverwrite = false) {
        if (!manualCourierCode || !manualCourierName || !manualResi) {
            Alerts('Pilih kurir dan masukkan nomor resi.');
            return;
        }
        if (!orderId) return;
        setSubmitting(true);

        try {
            const { data: existing } = await supabase.from('mawam_pengiriman').select('*').eq('order_id', orderId);
            if (existing && existing.length > 0 && !skipOverwrite) {
                setOverwriteOpen(true);
                setSubmitting(false);
                return;
            }

            const payload = {
                order_id: orderId,
                provider: 'manual',
                courier_code: manualCourierCode,
                courier_name: manualCourierName,
                tracking_number: manualResi,
                status: 'shipped',
            };

            if (existing && existing.length > 0) {
                const { error } = await supabase.from('mawam_pengiriman').update(payload).eq('order_id', orderId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('mawam_pengiriman').insert(payload);
                if (error) throw error;
            }

            const { error: err2 } = await supabase.from('mawam_orders').update({ status: 'shipped' }).eq('id', orderId);
            if (err2) throw err2;

            try {
                const { data: orderData } = await supabase.from('mawam_orders').select('buyer_id').eq('id', orderId).single();
                if (orderData?.buyer_id) {
                    await notifyOrderShippedToBuyer(orderData.buyer_id, orderId);
                }
            } catch (notificationError) {
                console.log('Manual shipping notification error', notificationError);
            }

            Alerts('Resi manual tersimpan.', 'success');
            void fetchOrder();
            router.back();
        } catch (e: any) {
            console.log(e);
            Alerts(e.message ?? 'Gagal menyimpan resi.', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    function bulatkanKeKelipatanLima(angka: number) {
        const integer = Math.ceil(angka);
        const sisa = integer % 10;

        if (sisa >= 1 && sisa <= 2) {
            return integer - sisa;
        }

        if (sisa >= 3 && sisa <= 6) {
            return integer - sisa + 5;
        }

        if (sisa >= 7 && sisa <= 9) {
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

        return {
            length: bulatkanKeKelipatanLima(20 * faktorSkala),
            width: bulatkanKeKelipatanLima(15 * faktorSkala),
            height: bulatkanKeKelipatanLima(10 * faktorSkala),
        };
    }

    async function confirmBiteshipDraft(shipping: any) {
        if (!orderId) return;
        setSubmitting(true);

        try {
            const res = await fetch(BITESHIP_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'confirm_order',
                    data: { draft_order_id: shipping.biteship_draft_id },
                }),
            });

            const result = await res.json();
            if (!res.ok || !result?.success) {
                throw new Error(result?.message ?? 'Gagal mengonfirmasi draft Biteship.');
            }

            const biteshipData = result.data ?? {};
            const biteshipOrderId = getBiteshipOrderId(biteshipData);
            const trackingNumber = getBiteshipTrackingNumber(biteshipData);

            if (!biteshipOrderId) {
                throw new Error('Biteship tidak mengembalikan ID pesanan setelah draft dikonfirmasi.');
            }

            const { error: shippingError } = await supabase
                .from('mawam_pengiriman')
                .update({
                    provider: 'biteship',
                    biteship_order_id: biteshipOrderId,
                    tracking_number: trackingNumber,
                    status: trackingNumber ? 'shipped' : 'diproses',
                    weight: totalWeight,
                })
                .eq('id', shipping.id);
            if (shippingError) throw shippingError;

            if (trackingNumber) {
                const { error: orderError } = await supabase
                    .from('mawam_orders')
                    .update({ status: 'shipped' })
                    .eq('id', orderId);
                if (orderError) throw orderError;

                try {
                    const { data: orderData } = await supabase.from('mawam_orders').select('buyer_id').eq('id', orderId).single();
                    if (orderData?.buyer_id) {
                        await notifyOrderShippedToBuyer(orderData.buyer_id, orderId);
                    }
                } catch (notificationError) {
                    console.log('Biteship shipping notification error', notificationError);
                }
            }

            Alerts(
                trackingNumber
                    ? 'Draft Biteship berhasil dikonfirmasi dan resi sudah tersimpan.'
                    : 'Draft Biteship berhasil dikonfirmasi. Resi belum tersedia.',
                'success',
            );
            await fetchOrder();
            router.back();
        } catch (e: any) {
            console.log(e);
            Alerts(e.message ?? 'Gagal mengonfirmasi draft Biteship.', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function submitBiteship() {
        let finalCourierCode = courierCode;
        let finalCourierName = selectedCourierName || courierCode;
        let finalService = service;

        const shipping = order?.pengiriman?.[0] ?? null;

        if (shipping?.biteship_order_id) {
            Alerts('Pesanan Biteship ini sudah dikonfirmasi.', 'info');
            return;
        }

        if (shipping?.biteship_draft_id) {
            await confirmBiteshipDraft(shipping);
            return;
        }

        if (useBuyerChoice) {
            if (!shipping) {
                Alerts('Pilihan pengiriman pembeli tidak tersedia. Silakan atur manual.', 'error');
                return;
            }

            if (!shipping.courier_code || !shipping.service || (shipping.shipping_cost == null && shipping.shipping_cost !== 0)) {
                Alerts('Pilihan pengiriman pembeli tidak lengkap. Silakan atur manual.', 'error');
                return;
            }

            finalCourierCode = shipping.courier_code ?? finalCourierCode;
            finalCourierName = shipping.courier_name ?? shipping.courier_code ?? finalCourierName;
            finalService = shipping.service ?? finalService;
        } else {
            if (!finalCourierCode || !finalCourierName) {
                Alerts('Pilih kurir terlebih dahulu.');
                return;
            }
        }

        if (!orderId) return;
        setSubmitting(true);

        try {
            const seller = order?.seller;
            const items = order?.items ?? [];

            if (!seller || !shipping) {
                Alerts('Data penjual atau pengiriman tidak ditemukan.', 'error');
                return;
            }

            if (totalWeight <= 0) {
                Alerts('Berat pengiriman belum tersedia dari database.', 'error');
                return;
            }

            const dimensi = hitungDimensiBawang(totalWeight / 1000);

            const data = {
                reference_id: order.id,

                shipper_contact_name: seller.nama,
                shipper_contact_phone: seller.no_hp,
                shipper_organization: seller.toko?.[0]?.nama_toko,

                origin_contact_name: seller.nama,
                origin_contact_phone: seller.no_hp,
                origin_address: seller.alamat,
                origin_postal_code: shipping.origin,

                destination_contact_name: shipping.penerima,
                destination_contact_phone: shipping.telepon_penerima,
                destination_address: shipping.alamat_penerima,
                destination_postal_code: shipping.destination,

                courier_company: finalCourierCode,
                courier_type: finalService || shipping.type,

                delivery_type: 'now',

                items: items.map((item: any) => ({
                    name: item.produk?.nama_produk,
                    description:
                        item.produk?.deskripsi?.length
                            ? item.produk.deskripsi
                            : `${item.produk?.nama_produk}, total berat ${item.qty} ${item.produk?.satuan}`,

                    value: Number(item.subtotal ?? 0),

                    weight: totalWeight,
                    length: dimensi.length,
                    width: dimensi.width,
                    height: dimensi.height,
                })),
            };

            const res = await fetch(BITESHIP_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'draft_order', data }),
            });

            const result = await res.json();
            if (!res.ok || !result?.success) {
                throw new Error(result?.message ?? 'Gagal membuat pengiriman via Biteship');
            }

            const biteshipData = result.data ?? {};
            const biteshipDraftId = biteshipData.id || biteshipData.draft_order_id || biteshipData.data?.id || null;

            if (!biteshipDraftId) {
                throw new Error('Biteship tidak mengembalikan ID draft pengiriman.');
            }

            const payload: any = {
                order_id: orderId,
                provider: 'biteship',
                courier_code: finalCourierCode,
                courier_name: finalCourierName,
                service: finalService || null,
                tracking_number: null,
                biteship_draft_id: biteshipDraftId,
                biteship_order_id: null,
                status: 'diproses',
                weight: totalWeight,
            };

            const { data: existingShipping } = await supabase.from('mawam_pengiriman').select('*').eq('order_id', orderId);
            if (existingShipping && existingShipping.length > 0) {
                const { error } = await supabase.from('mawam_pengiriman').update(payload).eq('order_id', orderId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('mawam_pengiriman').insert(payload);
                if (error) throw error;
            }

            Alerts('Draft pengiriman Biteship berhasil dibuat. Konfirmasi untuk membuat pesanan pengiriman.', 'success');
            await fetchOrder();
        } catch (e: any) {
            console.log(e);
            Alerts(e.message ?? 'Gagal membuat pengiriman via Biteship.', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    const selectedManualCourier = COURIER_OPTIONS.find(item => item.code === manualCourierCode) ?? null;
    const selectedBiteshipCourier = COURIER_OPTIONS.find(item => item.code === courierCode) ?? null;
    const selectedServices = SERVICE_OPTIONS[courierCode] ?? [];
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Memuat data...</ThemedText>
            </View>
        );
    }

    const shipping = order?.pengiriman?.[0] ?? null;
    const biteshipButtonLabel = shipping?.biteship_order_id
        ? 'Pengiriman Sudah Dikonfirmasi'
        : shipping?.biteship_draft_id
            ? 'Konfirmasi Pengiriman'
            : 'Buat Draft Pengiriman';

    return (
        <>
            <Stack.Screen options={{ title: 'Atur Pengiriman' }} />
            <ConfirmModal
                visible={overwriteOpen}
                title="Timpa pengiriman?"
                message="Data pengiriman lama akan diganti dengan data baru."
                confirmText="Lanjut"
                loading={submitting}
                onCancel={() => setOverwriteOpen(false)}
                onConfirm={async () => {
                    setOverwriteOpen(false);
                    await submitManual(true);
                }}
            />
            <ScrollView contentContainerStyle={styles.container}>
                <ThemedView style={styles.card}>
                    <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Informasi Pesanan</ThemedText>
                    <ThemedText style={{ opacity: 0.8 }}>No. Pesanan: {order?.invoice}</ThemedText>
                    {shipping ? (
                        <ThemedText style={{ opacity: 0.8 }}>
                            Pengiriman sudah ada: {shipping.courier_name} • {shipping.tracking_number ?? shipping.tracking}
                        </ThemedText>
                    ) : (
                        <ThemedText style={{ opacity: 0.7 }}>Belum ada data pengiriman untuk pesanan ini.</ThemedText>
                    )}
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#cccccc1a' }}>
                        <ThemedText style={{ fontWeight: '700' }}>Berat total dari database</ThemedText>
                        <ThemedText style={{ opacity: 0.8, marginTop: 4 }}>{formatWeight(totalWeight)}</ThemedText>
                    </View>
                </ThemedView>

                <ThemedView style={styles.card}>
                    <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Pilih Metode</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                            style={[styles.option, mode === 'biteship' ? { borderColor: '#ff491c' } : undefined]}
                            onPress={() => {
                                setMode('biteship');
                                setUseBuyerChoice(true);
                            }}
                        >
                            <ThemedText>Buat via Biteship</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.option, mode === 'manual' ? { borderColor: '#ff491c' } : undefined]}
                            onPress={() => setMode('manual')}
                        >
                            <ThemedText>Input Resi Manual</ThemedText>
                        </TouchableOpacity>
                    </View>
                </ThemedView>

                {mode === 'biteship' && (
                    <ThemedView style={styles.card}>
                        <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Buat Pengiriman (Biteship)</ThemedText>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity style={[styles.option, useBuyerChoice ? { borderColor: '#ff491c' } : undefined]} onPress={() => setUseBuyerChoice(true)}>
                                <ThemedText>Gunakan pilihan pembeli</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.option, !useBuyerChoice ? { borderColor: '#ff491c' } : undefined]} onPress={() => setUseBuyerChoice(false)}>
                                <ThemedText>Atur manual</ThemedText>
                            </TouchableOpacity>
                        </View>

                        {useBuyerChoice ? (
                            (() => {
                                const shipping = order?.pengiriman?.[0] ?? null;
                                if (!shipping || !shipping.courier_code) {
                                    return (
                                        <View style={{ marginTop: 12 }}>
                                            <ThemedText style={{ opacity: 0.8 }}>Data pilihan pengiriman pembeli tidak tersedia atau tidak lengkap.</ThemedText>
                                            <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={() => setUseBuyerChoice(false)}>
                                                <ThemedText style={styles.buttonText}>Atur Manual</ThemedText>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                }

                                return (
                                    <View style={{ marginTop: 12 }}>
                                        <View style={styles.row}>
                                            <ThemedText style={styles.label}>Kurir :</ThemedText>
                                            <ThemedText>{shipping.courier_name ?? shipping.courier_code}</ThemedText>
                                        </View>
                                        <View style={styles.row}>
                                            <ThemedText style={styles.label}>Layanan :</ThemedText>
                                            <ThemedText>{shipping.service}</ThemedText>
                                        </View>
                                        <View style={styles.row}>
                                            <ThemedText style={styles.label}>Berat (gram) :</ThemedText>
                                            <ThemedText>{shipping.weight != null ? String(shipping.weight) + ' g' : '-'}</ThemedText>
                                        </View>
                                        <View style={styles.row}>
                                            <ThemedText style={styles.label}>Ongkir :</ThemedText>
                                            <ThemedText>{shipping.shipping_cost != null ? rupiah(shipping.shipping_cost) : '-'}</ThemedText>
                                        </View>
                                        <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={submitBiteship} disabled={submitting || Boolean(shipping?.biteship_order_id)}>
                                            <ThemedText style={styles.buttonText}>{submitting ? 'Menyimpan...' : biteshipButtonLabel}</ThemedText>
                                        </TouchableOpacity>
                                        {Boolean(shipping?.biteship_order_id) && (
                                            <TouchableOpacity
                                                style={[styles.button, { backgroundColor: '#ff4a1c', marginTop: 10 }]}
                                                onPress={() => router.push({ pathname: '/toko/pengiriman/[pengirimanId]', params: { pengirimanId: String(shipping.id) } })}
                                            >
                                                <ThemedText style={styles.buttonText}>Update Perjalanan Paket</ThemedText>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })()
                        ) : (
                            <View style={{ marginTop: 12 }}>
                                <ThemedText style={styles.label}>Kurir</ThemedText>
                                <View style={styles.selectBox}>
                                    {COURIER_OPTIONS.map((item) => (
                                        <TouchableOpacity
                                            key={item.code}
                                            style={[styles.option, selectedBiteshipCourier?.code === item.code ? styles.selectItemActive : undefined]}
                                            onPress={() => {
                                                setCourierCode(item.code);
                                                setSelectedCourierCode(item.code);
                                                setService('');
                                                setSelectedCourierName(item.name);
                                            }}
                                        >
                                            <ThemedText style={selectedBiteshipCourier?.code === item.code ? styles.selectItemTextActive : undefined}>
                                                {item.name}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {selectedBiteshipCourier &&
                                    <ThemedInput
                                        value={selectedBiteshipCourier ? `${selectedBiteshipCourier.name} (${selectedBiteshipCourier.code})` : ''}
                                        style={styles.input}
                                        editable={false}
                                        placeholder="Pilih kurir"
                                        label={<ThemedText style={styles.label}>Kurir terpilih</ThemedText>}
                                    />}

                                {courierCode !== '' && (
                                    <View style={{ marginTop: 10 }}>
                                        <ThemedText style={{ marginBottom: 6, fontWeight: 600 }}>
                                            Pilih Layanan
                                        </ThemedText>

                                        <View style={{ gap: 8, flexDirection: 'row' }}>
                                            {selectedServices.map((item) => (
                                                <TouchableOpacity
                                                    key={item.code}
                                                    style={[
                                                        styles.option,
                                                        service === item.code
                                                            ? { borderColor: '#ff491c' }
                                                            : undefined,
                                                    ]}
                                                    onPress={() => setService(item.code)}
                                                >
                                                    <ThemedText>{item.name}</ThemedText>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <ThemedInput value={String(totalWeight)} style={styles.input} editable={false}
                                label={<ThemedText style={styles.label}>Berat</ThemedText>}
                                />
                                <TouchableOpacity style={styles.button} onPress={submitBiteship} disabled={submitting || Boolean(shipping?.biteship_order_id)}>
                                    <ThemedText style={styles.buttonText}>{submitting ? 'Menyimpan...' : biteshipButtonLabel}</ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ThemedView>
                )}

                {mode === 'manual' && (
                    <ThemedView style={styles.card}>
                        <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Input Resi Manual</ThemedText>

                        <ThemedText style={styles.label}>Kurir</ThemedText>
                        <View style={styles.selectBox}>
                            {COURIER_OPTIONS.map((item) => (
                                <TouchableOpacity
                                    key={item.code}
                                    style={[styles.option, selectedManualCourier?.code === item.code ? styles.selectItemActive : undefined]}
                                    onPress={() => {
                                        setManualCourierCode(item.code);
                                        setManualCourierName(item.name);
                                    }}
                                >
                                    <ThemedText style={selectedManualCourier?.code === item.code ? styles.selectItemTextActive : undefined}>
                                        {item.name}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <ThemedInput
                            value={selectedManualCourier ? `${selectedManualCourier.name} (${selectedManualCourier.code})` : ''}
                            style={styles.input}
                            editable={false}
                            placeholder="Pilih kurir"
                            label={<ThemedText style={styles.label}>Kurir terpilih</ThemedText>}
                        />

                        <ThemedInput value={manualResi} onChangeText={setManualResi} style={styles.input} placeholder="1234567890"
                        label={<ThemedText style={styles.label}>Nomor Resi</ThemedText>}
                        />

                        <TouchableOpacity style={styles.button} onPress={() => void submitManual()} disabled={submitting}>
                            <ThemedText style={styles.buttonText}>{submitting ? 'Menyimpan...' : 'Simpan Resi'}</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                )}

                <TouchableOpacity style={[styles.button, { backgroundColor: '#86868642' }]} onPress={() => router.back()}>
                    <ThemedText style={[styles.buttonText, { fontWeight: '700' }]}>Batal</ThemedText>
                </TouchableOpacity>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { padding: 12, gap: 12 },
    card: { borderRadius: 10, padding: 12 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
    row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    label: { marginVertical: 4, fontWeight: '600' },
    option: { borderWidth: 1, borderColor: '#8d8d8d', padding: 10, borderRadius: 8 },
    button: { backgroundColor: '#ff330054', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    buttonText: { fontWeight: '700' },
    selectBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    selectItemActive: { borderColor: '#ff491c', backgroundColor: '#ff491c22' },
    selectItemTextActive: { fontWeight: '700' },
});