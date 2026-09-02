import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ImageLoad } from "@/components/ui/Imageload";
import Alerts from "@/constants/Alerts";
import { ekstrakEstimasi, Estimasi } from "@/constants/Estimasi";
import { rupiah } from "@/constants/rupiah";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, TouchableOpacity, ScrollView, SectionList, StyleSheet, View } from "react-native";
import { formatTanggal, formatWaktu } from "@/constants/countDown";
import { formatService } from "@/constants/opsiPengiriman";
import { copyText } from "@/constants/copyText";
import { nohptowa } from "@/constants/isNoHp";
import { addToCart } from "@/constants/kelolaCart";
import ConfirmModal from "@/components/ui/ConfirmModal";
const ColorDark = Colors["light"].tint;
const ColorLight = Colors["dark"].tint;

export default function ModalScreen() {
  const { orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [infoTotal, setInfoTotal] = useState(true);
  const [infoPesanan, setInfoPesanan] = useState(true);
  const [showCancelRequestConfirmation, setShowCancelRequestConfirmation] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const { isDark } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const iconColor = Colors[colorScheme].icon;
  const gambarDefault = "https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp";

  useEffect(() => {
    if (user === null) {
      router.replace("produk");
    }
    if (user) {
      fetchOrders();
    }
  }, [user]);

  async function fetchOrders() {
    let query = supabase
      .from("mawam_orders")
      .select(`
                 *,
                 mawam_payments:payment_id(*),
                 mawam_profile:seller_id(
                     nama,
                     no_hp,
                     mawam_toko(
                     id,
                     nama_toko,
                     gambar_toko
                     )
                 ),
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
                 mawam_order_cancellations(
                   id,
                   seller_decision,
                   seller_rejection_reason,
                   refund_status
                 )
                 `)
      .order("created_at", { ascending: false });
    query = query.eq("id", orderId);


    const { data, error } = await query;

    if (error) {
      console.log(error);
      return;
    }
    const [sections] = data.map((order: any) => ({
      ...order,
      data: order.mawam_order_items,
      payment: order.mawam_payments,
      pengiriman: order.mawam_pengiriman
    }));
    setData(sections ?? null);
  }

  if (!data) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={iconColor} />
        <ThemedText>Rincian Pesanan...</ThemedText>
      </View>
    );
  }

  const cancellation = Array.isArray(data?.mawam_order_cancellations)
    ? data.mawam_order_cancellations[0]
    : data?.mawam_order_cancellations;
  const isShipped = data?.status === "shipped";
  const hasActiveCancellation = Boolean(cancellation && cancellation.seller_decision !== "cancelled");
  const canCancelCancellationRequest = cancellation?.seller_decision === "pending";
  const cancellationMessage = cancellation?.seller_decision === "pending"
    ? "Pengajuan pembatalan sudah dikirim dan sedang menunggu persetujuan penjual."
    : cancellation?.seller_decision === "rejected"
      ? cancellation.seller_rejection_reason || "Pengajuan pembatalan ditolak oleh penjual."
      : cancellation
        ? "Pembatalan telah disetujui dan refund sedang diproses oleh admin."
        : null;

  const cancelCancellationRequest = async () => {
    if (!cancellation?.id || cancellingRequest) return;

    setCancellingRequest(true);
    const { error } = await supabase.rpc("cancel_order_cancellation", {
      p_cancellation_id: cancellation.id,
    });
    setCancellingRequest(false);

    if (error) {
      console.log(error);
      Alerts("Pengajuan pembatalan tidak dapat dibatalkan.", "error");
      return;
    }

    setShowCancelRequestConfirmation(false);
    Alerts("Pengajuan pembatalan berhasil dibatalkan.", "success");
    await fetchOrders();
  };

  const completeOrder = async () => {
    if (!orderId || completingOrder) return;
    setCompletingOrder(true);
    const { error } = await supabase.rpc("complete_order", { p_order_id: orderId });
    setCompletingOrder(false);

    if (error) {
      console.log(error);
      Alerts(error.message || "Pesanan belum dapat diselesaikan.", "error");
      return;
    }

    setShowCompleteConfirmation(false);
    Alerts("Pesanan berhasil diselesaikan.", "success");
    await fetchOrders();
  };

  const handleReorder = async () => {
    if (isReordering) return;
    setIsReordering(true);
    try {
      const items = data?.mawam_order_items ?? [];
      const results = await Promise.allSettled(
        items.map((item: any) => addToCart(item.mawam_produk.id, item.qty, false))
      );
      const failed = results.filter((result) => result.status === "rejected").length;

      if (failed > 0) {
        Alerts(`${failed} produk gagal ditambahkan ke keranjang.`, "error");
        return;
      }

      Alerts("Produk berhasil ditambahkan ke keranjang.", "success");
      router.navigate('cart/');
    } catch (error) {
      console.log(error);
      Alerts("Gagal menambahkan produk ke keranjang.", "error");
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <React.Fragment>
      <Stack.Screen options={{ title: data?.status == 'cancelled' ? "Rincian Pembatalan" : "Rincian Pesanan" }} />
      <ConfirmModal
        visible={showCancelRequestConfirmation}
        title="Batalkan pengajuan?"
        message="Penjual tidak akan memproses pembatalan ini. Anda dapat mengajukan pembatalan kembali bila diperlukan."
        confirmText="Ya, Batalkan"
        cancelText="Kembali"
        variant="warning"
        loading={cancellingRequest}
        onCancel={() =>
          setShowCancelRequestConfirmation(false)
        }
        onConfirm={cancelCancellationRequest}
      />

      <ConfirmModal
        visible={showCompleteConfirmation}
        title="Pesanan sudah diterima?"
        message="Pastikan produk telah Anda terima dengan baik. Setelah dikonfirmasi, pesanan akan ditandai selesai."
        confirmText="Ya, Pesanan Selesai"
        cancelText="Kembali"
        variant="success"
        loading={completingOrder}
        onCancel={() =>
          setShowCompleteConfirmation(false)
        }
        onConfirm={completeOrder}
      />
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <ThemedView
            style={{
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 10,
              marginBottom: 8,
            }}
          >
            {data?.status != 'cancelled' && <View style={{ backgroundColor: ColorDark, padding: 10, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              {hasActiveCancellation && <Ionicons name={canCancelCancellationRequest ? "time-outline" : "information-circle-outline"} size={20} color={ColorLight} />}
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: "600", color: ColorLight }}>
                  {hasActiveCancellation
                    ? canCancelCancellationRequest ? "Pengajuan pembatalan sudah dilakukan" : "Status pengajuan pembatalan"
                    : data?.status?.includes('pending') ? 'Belum bayar pesanan' : 'Estimasi Tiba ' + Estimasi(data?.mawam_payments?.paid_at, ekstrakEstimasi(data?.pengiriman.map((item: any) => item.estimated_days)))}
                </ThemedText>
                <ThemedText style={{ opacity: 0.7, color: ColorLight }}>
                  {hasActiveCancellation
                    ? cancellationMessage
                    : data?.status?.includes('pending') ? 'Silakan lakukan pembayaran' :
                      data?.status == 'shipped' ? 'Pesanan sedang dikirim' :
                        data?.status == 'paid' ? 'Pesanan sedang disiapkan' : '...'}
                </ThemedText>
              </View>
            </View>}
            {data?.status == 'cancelled' && <View style={{ backgroundColor: ColorDark, padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <ThemedText style={{ fontWeight: "600", color: ColorLight }}>Pesanan Dibatalkan pada {formatTanggal(data.payment.expired_at)}</ThemedText>
                <ThemedText style={{ opacity: 0.7, color: ColorLight }}>Dibatalkan oleh {data?.cancelled_by}</ThemedText>
                <ThemedText style={{ opacity: 0.7, color: ColorLight }}>Alasan: {data?.cancellation_reason}</ThemedText>
              </View>
              <ThemedText style={{ opacity: 0.7, color: ColorLight, paddingRight: 10 }}><Ionicons name="reload" size={20} /></ThemedText>
            </View>}
            <View style={{ borderBottomWidth: 1, borderColor: '#cccccc1a', paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontWeight: '600' }}>
                  Info Pengiriman
                </ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>
                  {/* <Ionicons name="chevron-forward" size={16} /> */}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText>
                  <Ionicons name="cube-outline" size={16} />
                </ThemedText>
                <View>
                  <ThemedText style={{ opacity: 0.7, marginTop: 4 }}>
                    {data?.pengiriman.map((item: any) => item.courier_name + ' ~ ' + (item.service))}
                  </ThemedText>
                  {data?.status != 'cancelled' && <ThemedText style={{ opacity: 0.7, marginTop: 4 }}>
                    Estimasi {data?.pengiriman.map((item: any) => item.estimated_days)}
                  </ThemedText>}
                </View>
              </View>
            </View>
            <View style={{ paddingVertical: 8 }}>
              <ThemedText style={{ fontWeight: '600', marginBottom: 8 }}>
                Alamat Pengiriman
              </ThemedText>
              <TouchableOpacity onPress={() => {
                copyText(data?.pengiriman.map((item: any) => item.penerima + ', ' + item.telepon_penerima + ', ' + item.alamat_penerima))
              }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 }}>
                  <ThemedText style={{ opacity: 0.7, }}>
                    <Ionicons name="location-outline" size={16} />
                  </ThemedText>
                  <View style={{ gap: 4, flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <ThemedText>
                        {data?.pengiriman.map((item: any) => item.penerima)}
                      </ThemedText>
                      <ThemedText style={{ opacity: 0.7 }}>
                        {data?.pengiriman.map((item: any) => item.telepon_penerima)}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ opacity: 0.7, }}>
                      {data?.pengiriman.map((item: any) => item.alamat_penerima)}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </ThemedView>
          <SectionList
            sections={[data]}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => {
              return (
                <ThemedView style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingHorizontal: 8, paddingVertical: 10 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }} onPress={() => {
                    router.navigate({
                      pathname: 'toko/detail/',
                      params: {
                        toko: section?.mawam_profile?.mawam_toko[0]?.id
                      }
                    })
                  }}>
                    <Ionicons name="storefront-outline" size={18} color={iconColor} />
                    <ThemedText style={{ fontWeight: '600' }}>
                      {section?.mawam_profile?.mawam_toko[0]?.nama_toko}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={16} color={iconColor} />
                  </TouchableOpacity>
                </ThemedView>
              )
            }}
            renderItem={({ item, section }) => {
              return (
                <ThemedView>
                  <TouchableOpacity style={{ flexDirection: 'row', gap: 4, padding: 8 }} onPress={() => {
                    router.navigate({
                      pathname: 'prod/detail',
                      params: { id: item.mawam_produk.id }
                    })
                  }}>
                    <ImageLoad source={{ uri: item.mawam_produk.gambar_produk ?? gambarDefault }} style={{ width: 65, height: 65, borderRadius: 4 }} />
                    <View style={{ justifyContent: 'space-between', flex: 1 }}>
                      <ThemedText numberOfLines={1}>
                        {item.mawam_produk.nama_produk}
                      </ThemedText>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', opacity: 0.7 }}>
                        <View>
                          <ThemedText>{item.qty + ' ' + item.mawam_produk.satuan}</ThemedText>
                        </View>
                        <ThemedText>{item.qty}x</ThemedText>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                        <ThemedText>{rupiah(item.subtotal)}</ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                </ThemedView>)
            }}
            renderSectionFooter={({ section }) => {
              return (
                <ThemedView style={{ borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 8, }}>
                  {infoTotal && <View style={{ borderTopColor: '#cccccc1a', borderTopWidth: 1, paddingTop: 8 }}>
                    <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: "space-between" }}>
                      <ThemedText>Subtotal Produk</ThemedText>
                      <ThemedText>{rupiah(parseInt(section.subtotal))}</ThemedText>
                    </View>
                    <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: "space-between" }}>
                      <ThemedText>Subtotal Pengiriman</ThemedText>
                      <ThemedText>{rupiah(parseInt(section.shipping))}</ThemedText>
                    </View>
                  </View>}

                  <View style={{ alignItems: 'flex-end', marginBottom: 8, borderTopColor: '#cccccc1a', borderTopWidth: 1, paddingTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 4, }}>
                      <ThemedText>
                        Total Pesanan:
                      </ThemedText>
                      <ThemedText style={{ fontWeight: '600' }}>
                        {rupiah(section.total)}
                        {/* <Ionicons name={infoTotal ? "chevron-up" : "chevron-down"} size={16} color={iconColor} /> */}
                      </ThemedText>
                    </View>
                  </View>
                </ThemedView>
              )
            }}
          />
          {false && <ThemedView style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
            <View>
              <ThemedText style={{ fontWeight: "600" }}>Butuh Bantuan?</ThemedText>
            </View>
            <View style={{ marginTop: 4 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                  justifyContent: "space-between",
                  borderBottomColor: '#cccccc1a', borderBottomWidth: 1
                }}
              >
                <View style={{ flexDirection: "row", gap: 8, }}>
                  <ThemedText>
                    <Ionicons name="chatbox-outline" size={18} />
                  </ThemedText>
                  <ThemedText>Hubungi Penjual</ThemedText>
                </View>
                <ThemedText style={{ opacity: 0.7 }}>
                  <Ionicons name="chevron-forward" size={16} />
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <ThemedText>
                    <Ionicons name="help-circle-outline" size={18} />
                  </ThemedText>
                  <ThemedText>Pusat Bantuan</ThemedText>
                </View>
                <ThemedText style={{ opacity: 0.7 }}>
                  <Ionicons name="chevron-forward" size={16} />
                </ThemedText>
              </TouchableOpacity>

            </View>
          </ThemedView>}
          <ThemedView style={{ padding: 8, borderRadius: 4, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }}>
              <ThemedText style={{ fontWeight: "600", flex: 1 }}>No. Pesanan</ThemedText>
              <TouchableOpacity style={{ flexDirection: 'row', gap: 8, opacity: 0.8, flexWrap: 'wrap', flex: 2, justifyContent: "flex-end" }} onPress={() => {
                copyText(data?.invoice)
              }}>
                <ThemedText>{data?.invoice}</ThemedText>
                <View style={{ paddingHorizontal: 8, borderWidth: 1, borderColor: '#cccccca1', borderRadius: 4, }}>
                  <ThemedText>Salin</ThemedText>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 4 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                  justifyContent: "space-between",
                }}
              >
                <ThemedText>Metode Pembayaran</ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>
                  {data?.mawam_payments?.payment_method == 'bank_transfer' ? 'Transfer Bank ' + data?.mawam_payments?.bank?.toUpperCase() : data?.mawam_payments?.bank?.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
              {data?.mawam_payments?.verification_status && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, justifyContent: 'space-between' }}>
                <ThemedText>Status Verifikasi</ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>{data.mawam_payments.verification_status.replaceAll('_', ' ')}</ThemedText>
              </View>}
              {infoPesanan && <View>
                {/* <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 8,
                    justifyContent: "space-between",
                    borderBottomColor: '#cccccc1a', borderBottomWidth: 1
                  }}
                >
                  <ThemedText>Nota Pesanan / Faktur</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    Lihat <Ionicons name="chevron-forward" size={16} />
                  </ThemedText>
                </TouchableOpacity> */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 4,
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText>Waktu Pemesanan</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    {formatWaktu(data?.created_at)}
                  </ThemedText>
                </View>
                {data?.mawam_payments?.paid_at && <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 4,
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText>Waktu Pembayaran</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    {formatWaktu(data?.mawam_payments?.paid_at)}
                  </ThemedText>
                </View>}
                {data?.delivery_time && <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 4,
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText>Waktu Pengiriman</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    {formatWaktu(data?.delivery_time)}
                  </ThemedText>
                </View>}
                {data?.completed_time && <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 4,
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText>Waktu Pemesanan Selesai</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    {formatWaktu(data?.completed_time)}
                  </ThemedText>
                </View>}
              </View>}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                  justifyContent: "center",
                  borderTopColor: '#cccccc1a', borderTopWidth: 1,
                  marginTop: 8,
                }}
                onPress={() => {
                  // setInfoPesanan(!infoPesanan)
                }}
              >
                {/* <ThemedText>
                  Lihat {infoPesanan ? 'Lebih Sedikit' : 'Semua'} <Ionicons name={infoPesanan ? "chevron-up" : "chevron-down"} size={16} />
                </ThemedText> */}
              </TouchableOpacity>

            </View>
          </ThemedView>
        </View>
      </ScrollView>
      <ThemedView style={{ padding: 20, paddingTop: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {data?.status == 'cancelled' && <TouchableOpacity disabled={isReordering} style={[styles.button, { width: "49%", opacity: isReordering ? 0.7 : 1 }]}
            onPress={handleReorder}
          >
            {isReordering ? <ActivityIndicator color={ColorLight} /> : <ThemedText style={styles.buttonText}>Beli Lagi</ThemedText>}
          </TouchableOpacity>}

          {data?.status != 'cancelled' && data?.status != 'completed' && !isShipped && !hasActiveCancellation && <TouchableOpacity style={[styles.button, { width: "49%", opacity: 0.7 }]}
            onPress={() => {
              router.navigate({
                pathname: '/pesanan/batalkan/',
                params: {
                  orderId
                }
              })
            }}
          >
            <ThemedText style={styles.buttonText}>Batalkan Pesanan</ThemedText>
          </TouchableOpacity>}

          {(isShipped || data?.status == 'completed') && <TouchableOpacity
            style={[styles.button, { width: "49%", opacity: data?.status == 'completed' ? 1 : 0.7 }]}
            onPress={() => router.navigate({ pathname: "/pesanan/lacak", params: { orderId: String(orderId) } })}
          >
            <ThemedText style={styles.buttonText}>{data?.status == 'completed' ? 'Riwayat Pengiriman' : 'Lacak Pesanan'}</ThemedText>
          </TouchableOpacity>}

          {isShipped && <TouchableOpacity
            style={[styles.button, { width: "49%" }]}
            onPress={() => setShowCompleteConfirmation(true)}
          >
            <ThemedText style={styles.buttonText}>Pesanan Selesai</ThemedText>
          </TouchableOpacity>}

          {data?.status != 'cancelled' && canCancelCancellationRequest && <TouchableOpacity style={[styles.button, { width: "49%", opacity: 0.7 }]}
            onPress={() => setShowCancelRequestConfirmation(true)}
          >
            <ThemedText style={styles.buttonText}>Batalkan Pengajuan</ThemedText>
          </TouchableOpacity>}

          {data && data?.status.includes('pending') && <TouchableOpacity style={[styles.button, { width: "49%" }]}
            onPress={() => {
              router.navigate({
                pathname: 'pembayaran/mayar',
                params: {
                  paymentId: data.payment?.id
                }
              })
            }}
          >
            <ThemedText style={styles.buttonText}>Bayar</ThemedText>
          </TouchableOpacity>}
          {data && !data?.status.includes('pending') && data?.status != 'shipped' && <Link style={[styles.button, { width: "49%", display: 'flex', justifyContent: 'center', flexDirection: 'row' }]}
            target="_blank"
            href={encodeURI('https://api.whatsapp.com/send?phone=' + nohptowa(data.mawam_profile?.no_hp) + '&text=Halo Admin, Saya mau menanyakan tentang pesanan saya. Invoice: ' + data.invoice)}
          >
            <ThemedText style={styles.buttonText}>Hubungi Penjual</ThemedText>
          </Link>}
        </View>
      </ThemedView>
    </React.Fragment>
  );
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
    alignItems: "center",
  },

  buttonText: {
    color: ColorLight,
    fontWeight: "600",
  },
  disabled: { opacity: 0.55 },
});
