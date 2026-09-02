import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Alerts from '@/constants/Alerts'
import { rupiah } from '@/constants/rupiah'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'

const ColorDark = Colors.light.tint;
const ColorLight = Colors.dark.tint;

export default function SellerCancellationDetail() {
  const { orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const iconColor = Colors[scheme].icon;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.replace('produk');
      return;
    }
    fetchOrder();
  }, [user]);

  async function fetchOrder() {
    if (!orderId) return;
    setLoading(true);
    const { data, error } = await supabase.from('mawam_orders').select(`
      *,
      mawam_profile:buyer_id(nama, no_hp, avatar_url),
      mawam_order_items(*, mawam_produk(id, nama_produk, gambar_produk, harga, satuan)),
      mawam_order_cancellations(*)
    `).eq('id', orderId).maybeSingle();

    setLoading(false);
    if (error) {
      console.log(error);
      Alerts('Pesanan tidak dapat dimuat.', 'error');
      return;
    }
    setData(data ?? null);
  }

  const cancellation = Array.isArray(data?.mawam_order_cancellations) ? data.mawam_order_cancellations[0] : data?.mawam_order_cancellations;
  const eligibleStatuses = ['paid', 'processed', 'settlement'];
  const orderCreatedAt = data?.created_at || data?.mawam_payments?.created_at;
  const paymentCreatedAt = data?.mawam_payments?.created_at || data?.paid_at || data?.created_at;
  const oldestReferenceTime = new Date(orderCreatedAt || paymentCreatedAt || Date.now()).getTime();
  const isLateForReview = Date.now() - oldestReferenceTime > 60 * 60 * 1000;
  const isAutoExpiredCancellation = !cancellation && eligibleStatuses.includes(data?.status) && isLateForReview;
  const reviewReason = cancellation?.reason || data?.cancellation_reason || (isAutoExpiredCancellation ? 'Pembatalan otomatis karena pembayaran / proses pesanan melewati batas waktu 1 jam.' : 'Tidak ada alasan yang dicatat.');
  const hasPendingSellerDecision = cancellation?.seller_decision === 'pending';
  const canRespondToCancellationRequest = Boolean(isAutoExpiredCancellation || hasPendingSellerDecision);

  const approveCancellation = async () => {
    if (processing || !cancellation?.id) return;
    setProcessing(true);

    const { error } = await supabase.rpc('seller_decide_cancellation', {
      p_cancellation_id: cancellation.id,
      p_decision: 'approved',
      p_rejection_reason: null,
    });

    setProcessing(false);
    if (error) {
      console.log(error);
      Alerts(error.message || 'Gagal menyetujui pembatalan.', 'error');
      return;
    }

    Alerts('Pembatalan disetujui. Refund menunggu proses admin.', 'success');
    router.replace({ pathname: 'toko/penjualan' });
  };

  const rejectCancellation = async () => {
    if (processing || !cancellation?.id) return;
    if (!rejectReason.trim()) {
      Alerts('Tuliskan alasan penolakan.', 'info');
      return;
    }
    setProcessing(true);

    const { error } = await supabase.rpc('seller_decide_cancellation', {
      p_cancellation_id: cancellation.id,
      p_decision: 'rejected',
      p_rejection_reason: rejectReason.trim(),
    });

    setProcessing(false);
    if (error) {
      console.log(error);
      Alerts(error.message || 'Gagal menolak pembatalan.', 'error');
      return;
    }

    Alerts('Pengajuan pembatalan telah ditolak.', 'success');
    setShowRejectModal(false);
    setRejectReason('');
    await fetchOrder();
  };

  if (loading || !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={iconColor} />
        <ThemedText>Memuat rincian pembatalan...</ThemedText>
      </View>
    );
  }

  return (
    <React.Fragment>
      <Stack.Screen options={{ title: 'Rincian Pembatalan' }} />
      <ConfirmModal
        visible={showRejectModal}
        title="Alasan penolakan"
        confirmText="Tolak"
        cancelText="Batal"
        variant="destructive"
        loading={processing}
        onCancel={() => setShowRejectModal(false)}
        onConfirm={rejectCancellation}
      >
        <ThemedInput
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder="Tulis alasan kenapa ditolak"
          multiline
          textAlignVertical="top"
          style={[styles.input, { color: Colors[scheme].text }]}
        />
      </ConfirmModal>
      <ConfirmModal
        visible={showApproveModal}
        title="Setujui pembatalan?"
        message="Status permintaan pembatalan akan diproses secara aman dan pembeli akan menerima notifikasi. Refund selanjutnya diproses admin."
        confirmText="Setujui"
        cancelText="Batal"
        variant="success"
        loading={processing}
        onCancel={() => setShowApproveModal(false)}
        onConfirm={async () => {
          setShowApproveModal(false);
          await approveCancellation();
        }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
        <ThemedView style={{ borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <ThemedText style={{ fontWeight: '700' }}>Permintaan Pembatalan</ThemedText>
          {hasPendingSellerDecision && (
            <ThemedView style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#f59e0b20', borderWidth: 1, borderColor: '#f59e0b55' }}>
              <ThemedText style={{ fontWeight: '600', color: '#b45309' }}>Status: Menunggu konfirmasi penjual</ThemedText>
              <ThemedText style={{ opacity: 0.8, marginTop: 4, color: '#92400e' }}>Anda perlu menilai permintaan ini dan memilih setujui atau tolak.</ThemedText>
            </ThemedView>
          )}
          <ThemedText style={{ opacity: 0.8, marginTop: 6 }}>{reviewReason}</ThemedText>
          {isAutoExpiredCancellation && (
            <ThemedText style={{ opacity: 0.75, marginTop: 8, color: '#f59e0b' }}>
              Pesanan ini masuk status dibayar/dikemas dan sudah melewati batas waktu 1 jam, sehingga dapat diproses sebagai pembatalan yang perlu persetujuan penjual.
            </ThemedText>
          )}
          <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: '#cccccc1a', paddingTop: 10 }}>
            <ThemedText style={{ fontWeight: '600' }}>Pembeli</ThemedText>
            <ThemedText style={{ opacity: 0.8 }}>{data?.mawam_profile?.nama}</ThemedText>
            <ThemedText style={{ opacity: 0.8 }}>{data?.mawam_profile?.no_hp}</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={{ borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <ThemedText style={{ fontWeight: '600' }}>Rincian Pesanan</ThemedText>
          {data?.mawam_order_items?.map((item: any, idx: number) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <ThemedText>{item.mawam_produk?.nama_produk} · {item.qty} {item.mawam_produk?.satuan}</ThemedText>
              <ThemedText>{data.total ? rupiah(data.total) : ''}</ThemedText>
            </View>
          ))}
        </ThemedView>

        {canRespondToCancellationRequest && cancellation?.id && (
          <ThemedView style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: iconColor }]} onPress={() => router.back()}>
              <ThemedText style={{ color: iconColor }}>Kembali</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity disabled={processing} style={[styles.button, { backgroundColor: '#f97c16' }]} onPress={() => setShowRejectModal(true)}>
              <ThemedText style={styles.buttonText}>Tolak</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity disabled={processing} style={styles.button} onPress={() => setShowApproveModal(true)}>
              {processing ? <ActivityIndicator color={ColorLight} /> : <ThemedText style={styles.buttonText}>Setujui</ThemedText>}
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: ColorDark, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: ColorLight, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 14, padding: 20, alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalDescription: { opacity: 0.72, lineHeight: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  modalBackButton: { flex: 1, borderColor: ColorDark, borderWidth: 1, borderRadius: 9, paddingVertical: 12, alignItems: 'center' },
  modalBackText: { color: ColorDark, fontWeight: '700' },
  modalConfirmButton: { flex: 1, backgroundColor: ColorDark, borderRadius: 9, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, width: '100%', minHeight: 90, marginTop: 8 }
});
