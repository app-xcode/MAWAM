import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import Alerts from "@/constants/Alerts";
import { rupiah } from "@/constants/rupiah";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

const ColorDark = Colors.light.tint;
const ColorLight = Colors.dark.tint;

function cancellationInfo(status?: string) {
  if (status?.includes("pending")) return {
    title: "Batalkan pesanan yang belum dibayar?",
    description: "Pesanan ini belum dibayar dan akan langsung dibatalkan.",
    consequence: "Anda tidak perlu melakukan pembayaran untuk pesanan ini.",
    icon: "card-outline" as const,
  };
  if (status === "shipped") return {
    title: "Ajukan pembatalan pesanan?",
    description: "Pesanan sudah dalam pengiriman. Permintaan pembatalan akan diteruskan untuk diproses.",
    consequence: "Pengiriman mungkin tidak dapat dihentikan. Hubungi penjual bila membutuhkan bantuan terkait pesanan atau pengembalian dana.",
    icon: "car-outline" as const,
  };
  return {
    title: "Batalkan pesanan yang sedang dikemas?",
    description: "Pesanan telah dibayar dan sedang disiapkan oleh penjual.",
    consequence: "Pembatalan akan diproses sesuai kebijakan penjual. Pengembalian dana, jika berlaku, mengikuti metode pembayaran Anda.",
    icon: "cube-outline" as const,
  };
}

export default function BatalkanPesananScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const scheme = isDark ? "dark" : "light";
  const [order, setOrder] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    const { data, error } = await supabase.from("mawam_orders").select(`
      id, invoice, status, total,
      mawam_profile:seller_id(nama, mawam_toko(nama_toko)),
      mawam_order_items(qty, subtotal, mawam_produk(nama_produk, satuan))
    `).eq("id", orderId).maybeSingle();
    if (error) {
      console.log(error);
      Alerts("Pesanan tidak dapat dimuat.", "error");
      return;
    }
    setOrder(data);
  }, [orderId]);

  useEffect(() => {
    if (!user) {
      router.replace("/produk");
      return;
    }
    fetchOrder();
  }, [fetchOrder, user]);

  const cancelOrder = async () => {
    if (!order || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("mawam_orders").update({
      status: "cancelled",
      cancelled_by: "buyer",
      cancellation_reason: reason.trim() || "Dibatalkan oleh pembeli",
    }).eq("id", order.id).neq("status", "cancelled");
    setSubmitting(false);
    if (error) {
      console.log(error);
      Alerts("Pembatalan pesanan gagal. Silakan coba lagi.", "error");
      return;
    }
    Alerts("Pesanan berhasil dibatalkan.", "success");
    router.replace({ pathname: "/pesanan/rincian", params: { orderId: order.id } });
  };

  if (!order) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors[scheme].icon} /><ThemedText>Memuat pesanan...</ThemedText></View>;

  const info = cancellationInfo(order.status);
  const storeName = order.mawam_profile?.mawam_toko?.[0]?.nama_toko || order.mawam_profile?.nama || "Penjual";
  const askConfirmation = () => Alert.alert("Konfirmasi pembatalan", "Pesanan yang sudah dibatalkan tidak dapat dipulihkan. Lanjutkan?", [
    { text: "Kembali", style: "cancel" },
    { text: "Ya, batalkan", style: "destructive", onPress: cancelOrder },
  ]);

  return <>
    <Stack.Screen options={{ title: "Konfirmasi Pembatalan" }} />
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.icon}><Ionicons name={info.icon} size={24} color={ColorLight} /></View>
          <View style={styles.flex}><ThemedText style={styles.title}>{info.title}</ThemedText><ThemedText style={styles.desc}>{info.description}</ThemedText></View>
        </View>
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={19} color={Colors[scheme].icon} /><ThemedText style={styles.noticeText}>{info.consequence}</ThemedText></View>
      </ThemedView>
      <ThemedView style={styles.card}>
        <ThemedText style={styles.bold}>Pesanan yang dibatalkan</ThemedText>
        <View style={styles.row}><ThemedText style={styles.muted}>No. Pesanan</ThemedText><ThemedText>{order.invoice}</ThemedText></View>
        <View style={styles.row}><ThemedText style={styles.muted}>Toko</ThemedText><ThemedText>{storeName}</ThemedText></View>
        {order.mawam_order_items?.map((item: any, index: number) => <View key={index} style={styles.item}>
          <View style={styles.flex}><ThemedText numberOfLines={1}>{item.mawam_produk?.nama_produk}</ThemedText><ThemedText style={styles.muted}>{item.qty} {item.mawam_produk?.satuan}</ThemedText></View>
          <ThemedText>{rupiah(item.subtotal)}</ThemedText>
        </View>)}
        <View style={[styles.row, styles.total]}><ThemedText style={styles.bold}>Total Pesanan</ThemedText><ThemedText style={styles.bold}>{rupiah(order.total)}</ThemedText></View>
      </ThemedView>
      <ThemedView style={styles.card}>
        <ThemedText style={styles.bold}>Alasan pembatalan</ThemedText>
        <ThemedText style={styles.desc}>Opsional. Informasi ini membantu penjual memahami pembatalan Anda.</ThemedText>
        <TextInput value={reason} onChangeText={setReason} placeholder="Contoh: ingin mengubah alamat pengiriman" placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"} multiline maxLength={300} textAlignVertical="top" style={[styles.input, { color: Colors[scheme].text, borderColor: Colors[scheme].icon }]} />
        <ThemedText style={styles.count}>{reason.length}/300</ThemedText>
      </ThemedView>
    </ScrollView>
    <ThemedView style={styles.footer}>
      <TouchableOpacity disabled={submitting} onPress={() => router.back()} style={styles.back}><ThemedText style={styles.backText}>Kembali</ThemedText></TouchableOpacity>
      <TouchableOpacity disabled={submitting} onPress={askConfirmation} style={[styles.cancel, submitting && styles.disabled]}>
        {submitting ? <ActivityIndicator color={ColorLight} /> : <ThemedText style={styles.cancelText}>Batalkan Pesanan</ThemedText>}
      </TouchableOpacity>
    </ThemedView>
  </>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  container: { padding: 12, gap: 10 }, card: { borderRadius: 10, padding: 14, gap: 10 },
  heading: { flexDirection: "row", gap: 12, alignItems:'flex-start'}, flex: { flex: 1 }, icon: { backgroundColor: ColorDark, padding: 9, borderRadius: 24 },
  title: { fontSize: 17, fontWeight: "700" }, bold: { fontWeight: "700" }, desc: { opacity: 0.72, lineHeight: 20 },
  notice: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 8, backgroundColor: "#8888881A" }, noticeText: { flex: 1, opacity: 0.8, lineHeight: 19 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, muted: { opacity: 0.65 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#88888855", paddingTop: 10, flexDirection: "row", gap: 12 },
  total: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#88888855", paddingTop: 10 },
  input: { minHeight: 92, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 }, count: { alignSelf: "flex-end", opacity: 0.55, fontSize: 12, marginTop: -5 },
  footer: { flexDirection: "row", gap: 10, padding: 12, paddingBottom: 20 }, back: { flex: 1, borderColor: ColorDark, borderWidth: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  backText: { color: ColorDark, fontWeight: "700" }, cancel: { flex: 1.45, backgroundColor: ColorDark, paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelText: { color: ColorLight, fontWeight: "700" }, disabled: { opacity: 0.55 },
});