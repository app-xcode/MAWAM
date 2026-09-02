import { ThemedText } from "@/components/themed-text";
import ThemedInput from "@/components/themed-input";
import { ThemedView } from "@/components/themed-view";
import Alerts from "@/constants/Alerts";
import { rupiah } from "@/constants/rupiah";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import {
  notifyCancellationRequestedToBuyer,
  notifyCancellationRequestedToSeller,
} from "@/services/notification/notificationTriggers";
import { useAuth } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

const ColorDark = Colors.light.tint;
const ColorLight = Colors.dark.tint;
const commonCancellationReasons = [
  "Ingin mengubah alamat pengiriman",
  "Penjual tidak membalas chat",
  "Ingin mengubah rincian pesanan",
];

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

function cancellationProgressInfo(cancellation: any) {
  if (cancellation.seller_decision === "pending") return {
    title: "Anda sudah mengajukan pembatalan",
    description: "Pengajuan Anda sedang menunggu persetujuan penjual. Selama belum diputuskan, Anda dapat membatalkan pengajuan ini.",
    icon: "time-outline" as const,
  };
  if (cancellation.seller_decision === "rejected") return {
    title: "Pembatalan ditolak penjual",
    description: cancellation.seller_rejection_reason || "Penjual menolak permintaan pembatalan ini.",
    icon: "close-circle-outline" as const,
  };
  if (cancellation.refund_status === "processing") return {
    title: "Refund sedang diproses admin",
    description: "Admin sedang mentransfer dana ke rekening refund yang Anda pilih.",
    icon: "swap-horizontal-outline" as const,
  };
  if (cancellation.refund_status === "completed") return {
    title: "Refund berhasil diproses",
    description: "Dana refund telah ditransfer oleh admin.",
    icon: "checkmark-circle-outline" as const,
  };
  if (cancellation.refund_status === "failed") return {
    title: "Refund perlu ditindaklanjuti",
    description: "Transfer refund belum berhasil. Admin akan menindaklanjuti proses ini.",
    icon: "alert-circle-outline" as const,
  };
  return {
    title: "Menunggu refund dari admin",
    description: "Pembatalan telah disetujui. Admin akan memproses transfer refund ke rekening Anda.",
    icon: "wallet-outline" as const,
  };
}

export default function BatalkanPesananScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const scheme = isDark ? "dark" : "light";
  const [order, setOrder] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | "other" | null>(null);
  const [refundAccounts, setRefundAccounts] = useState<any[]>([]);
  const [selectedRefundAccountId, setSelectedRefundAccountId] = useState<string | null>(null);
  const [isAddingRefundAccount, setIsAddingRefundAccount] = useState(false);
  const [editingRefundAccountId, setEditingRefundAccountId] = useState<string | null>(null);
  const [accountPendingDeletion, setAccountPendingDeletion] = useState<any>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCancelRequestConfirmation, setShowCancelRequestConfirmation] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    const { data, error } = await supabase.from("mawam_orders").select(`
      id, invoice, seller_id, status, total, cancellation_status,
      mawam_profile:seller_id(nama, mawam_toko(nama_toko)),
      mawam_payments:payment_id(paid_at),
      mawam_order_cancellations(id, seller_decision, seller_rejection_reason, refund_status, refund_proof_path),
      mawam_order_items(qty, subtotal, mawam_produk(nama_produk, satuan))
    `).eq("id", orderId).maybeSingle();
    if (error) {
      console.log(error);
      Alerts("Pesanan tidak dapat dimuat.", "error");
      return;
    }
    setOrder(data);
  }, [orderId]);

  const fetchRefundAccounts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("mawam_refund_accounts")
      .select("id, bank_name, account_number, account_holder_name, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.log(error);
      Alerts("Rekening refund tidak dapat dimuat.", "error");
      return;
    }
    setRefundAccounts(data || []);
    const defaultAccount = data?.find((item) => item.is_default) || data?.[0];
    if (defaultAccount) setSelectedRefundAccountId(defaultAccount.id);
  }, [user]);

  useEffect(() => {
    if (user === null) {
      router.replace("/produk");
      return;
    }
    const loadTimer = setTimeout(() => {
      void fetchOrder();
      void fetchRefundAccounts();
    }, 0);
    return () => clearTimeout(loadTimer);
  }, [fetchOrder, fetchRefundAccounts, user]);

  const saveRefundAccount = async () => {
    if (!user || !bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      Alerts("Lengkapi data rekening refund.", "error");
      return;
    }
    const isEditing = Boolean(editingRefundAccountId);
    setSavingAccount(true);
    const accountData = {
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      account_holder_name: accountHolderName.trim(),
    };
    const request = editingRefundAccountId
      ? supabase.from("mawam_refund_accounts").update(accountData).eq("id", editingRefundAccountId).eq("user_id", user.id)
      : supabase.from("mawam_refund_accounts").insert({ ...accountData, user_id: user.id, is_default: refundAccounts.length === 0 });
    const { data, error } = await request.select("id, bank_name, account_number, account_holder_name, is_default").single();
    setSavingAccount(false);
    if (error) {
      console.log(error);
      Alerts(editingRefundAccountId ? "Rekening refund gagal diperbarui." : "Rekening refund gagal disimpan.", "error");
      return;
    }
    setRefundAccounts((current) => editingRefundAccountId
      ? current.map((account) => account.id === data.id ? data : account)
      : [data, ...current]);
    setSelectedRefundAccountId(data.id);
    setIsAddingRefundAccount(false);
    setEditingRefundAccountId(null);
    setBankName("");
    setAccountNumber("");
    setAccountHolderName("");
    Alerts(isEditing ? "Rekening refund berhasil diperbarui." : "Rekening refund berhasil ditambahkan.", "success");
  };

  const resetRefundAccountForm = () => {
    setIsAddingRefundAccount(false);
    setEditingRefundAccountId(null);
    setBankName("");
    setAccountNumber("");
    setAccountHolderName("");
  };

  const startEditRefundAccount = (account: any) => {
    setEditingRefundAccountId(account.id);
    setBankName(account.bank_name);
    setAccountNumber(account.account_number);
    setAccountHolderName(account.account_holder_name);
    setIsAddingRefundAccount(true);
  };

  const deleteRefundAccount = async () => {
    if (!user || !accountPendingDeletion) return;
    const deletedAccountId = accountPendingDeletion.id;
    setAccountPendingDeletion(null);
    const { error } = await supabase.from("mawam_refund_accounts").delete().eq("id", deletedAccountId).eq("user_id", user.id);
    if (error) {
      console.log(error);
      Alerts("Rekening tidak dapat dihapus. Rekening yang sudah dipakai untuk refund harus tetap disimpan.", "error");
      return;
    }
    const remainingAccounts = refundAccounts.filter((account) => account.id !== deletedAccountId);
    setRefundAccounts(remainingAccounts);
    if (selectedRefundAccountId === deletedAccountId) setSelectedRefundAccountId(remainingAccounts[0]?.id || null);
    Alerts("Rekening refund berhasil dihapus.", "success");
  };

  const cancelOrder = async () => {
    if (!order || submitting) return;
    setSubmitting(true);
    try {
      if (order.status === "pending_payment") {
        const { data, error } = await supabase.functions.invoke("mawam-cancel", {
          body: {
            orderId: order.id,
            reason: reason.trim(),
          },
        });
        if (error) {
          console.log("Cancel unpaid order error:", error);
          Alerts(error.message || "Pesanan gagal dibatalkan.", "error");
          return;
        }
        if (!data?.success) {
          Alerts(data?.message || "Pesanan gagal dibatalkan.", "error");
          return;
        }
        Alerts(
          data?.mayar?.closed === false
            ? "Pesanan dibatalkan. Invoice pembayaran perlu ditutup kembali."
            : "Pesanan berhasil dibatalkan.",
          data?.mayar?.closed === false ? "info" : "success"
        );
        router.replace({ pathname: "/pesanan/rincian/", params: { orderId: order.id } });
        return;
      }

      if (!selectedRefundAccountId) {
        Alerts("Pilih rekening tujuan refund terlebih dahulu.", "error");
        return;
      }
      const { error } = await supabase.rpc("request_order_cancellation", {
        p_order_id: order.id,
        p_reason: reason.trim(),
        p_refund_account_id: selectedRefundAccountId,
      });
      if (error) {
        console.log(error);
        Alerts("Pembatalan pesanan gagal. Silakan coba lagi.", "error");
        return;
      }
      try {
        if (user?.id) await notifyCancellationRequestedToBuyer(user.id, order.id);
        if (order.seller_id) await notifyCancellationRequestedToSeller(order.seller_id, order.id);
      } catch (notificationError) {
        console.log("Cancellation notification error", notificationError);
      }
      Alerts("Permintaan pembatalan berhasil dikirim.", "success");
      await fetchOrder();
    } finally {
      setSubmitting(false);
    }
  };

  const cancelCancellationRequest = async () => {
    if (!cancellation || cancellingRequest) return;
    setCancellingRequest(true);
    const { error } = await supabase.rpc("cancel_order_cancellation", { p_cancellation_id: cancellation.id });
    setCancellingRequest(false);
    setShowCancelRequestConfirmation(false);
    if (error) {
      console.log(error);
      Alerts("Pengajuan pembatalan tidak dapat dibatalkan.", "error");
      return;
    }
    Alerts("Pengajuan pembatalan berhasil dibatalkan.", "success");
    router.replace({ pathname: "/pesanan/rincian/", params: { orderId } });
  };

  if (!order) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors[scheme].icon} /><ThemedText>Memuat pesanan...</ThemedText></View>;

  const info = cancellationInfo(order.status);
  const storeName = order.mawam_profile?.mawam_toko?.[0]?.nama_toko || order.mawam_profile?.nama || "Penjual";
  const cancellation = order.mawam_order_cancellations?.[0];
  const isActiveCancellation = Boolean(cancellation && cancellation.seller_decision !== "cancelled");
  const isUnpaidOrder = order.status === "pending_payment";
  const isPackedOrder = ["paid", "processed", "settlement"].includes(order.status);
  const canCancel = isUnpaidOrder
    ? !isActiveCancellation
    : isPackedOrder && !isActiveCancellation && Boolean(selectedRefundAccountId) && selectedReason !== null && (selectedReason !== "other" || Boolean(reason.trim()));
  const askConfirmation = () => {
    if (!isUnpaidOrder && selectedReason === "other" && !reason.trim()) {
      Alerts("Tulis alasan pembatalan terlebih dahulu.", "info");
      return;
    }
    setShowConfirmation(true);
  };

  return <>
    <Stack.Screen options={{ title: "Konfirmasi Pembatalan" }} />
    <Modal transparent visible={showConfirmation} animationType="fade" onRequestClose={() => setShowConfirmation(false)}>
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalCard}>
          <View style={styles.modalIcon}><Ionicons name="alert-circle-outline" size={28} color={ColorDark} /></View>
          <ThemedText style={styles.modalTitle}>{info.title}</ThemedText>
          <ThemedText style={styles.modalDescription}>{info.description}</ThemedText>
          <ThemedText style={styles.modalConsequence}>{info.consequence}</ThemedText>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setShowConfirmation(false)} disabled={submitting}>
              <ThemedText>Periksa Lagi</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => { setShowConfirmation(false); void cancelOrder(); }} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryButtonText}>Ya, Batalkan</ThemedText>}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>

    <Modal transparent visible={showCancelRequestConfirmation} animationType="fade" onRequestClose={() => setShowCancelRequestConfirmation(false)}>
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalCard}>
          <View style={styles.modalIcon}><Ionicons name="help-circle-outline" size={28} color={ColorDark} /></View>
          <ThemedText style={styles.modalTitle}>Batalkan pengajuan?</ThemedText>
          <ThemedText style={styles.modalDescription}>Pengajuan pembatalan yang masih menunggu keputusan penjual akan dibatalkan.</ThemedText>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setShowCancelRequestConfirmation(false)} disabled={cancellingRequest}><ThemedText>Tidak</ThemedText></TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => void cancelCancellationRequest()} disabled={cancellingRequest}>{cancellingRequest ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryButtonText}>Ya, Batalkan</ThemedText>}</TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>

    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>{storeName}</ThemedText>
        <ThemedText style={styles.invoice}>{order.invoice}</ThemedText>
        {order.mawam_order_items?.map((item: any, index: number) => (
          <View key={`${item.produk_id || index}-${index}`} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <ThemedText>{item.mawam_produk?.nama_produk || "Produk"}</ThemedText>
              <ThemedText style={styles.muted}>{item.qty} {item.mawam_produk?.satuan || "item"}</ThemedText>
            </View>
            <ThemedText>{rupiah(item.subtotal || 0)}</ThemedText>
          </View>
        ))}
        <View style={styles.totalRow}><ThemedText>Total</ThemedText><ThemedText style={styles.total}>{rupiah(order.total || 0)}</ThemedText></View>
      </View>

      {cancellation && isActiveCancellation ? (
        <View style={styles.card}>
          <View style={styles.statusIcon}><Ionicons name={cancellationProgressInfo(cancellation).icon} size={28} color={ColorDark} /></View>
          <ThemedText style={styles.sectionTitle}>{cancellationProgressInfo(cancellation).title}</ThemedText>
          <ThemedText style={styles.muted}>{cancellationProgressInfo(cancellation).description}</ThemedText>
          {cancellation.seller_decision === "pending" && (
            <TouchableOpacity style={styles.secondaryFullButton} onPress={() => setShowCancelRequestConfirmation(true)}><ThemedText>Batalkan Pengajuan</ThemedText></TouchableOpacity>
          )}
        </View>
      ) : order.status === "cancelled" ? (
        <View style={styles.card}>
          <Ionicons name="close-circle-outline" size={30} color={ColorDark} />
          <ThemedText style={styles.sectionTitle}>Pesanan sudah dibatalkan</ThemedText>
          <ThemedText style={styles.muted}>Pesanan ini tidak dapat dibayar kembali.</ThemedText>
        </View>
      ) : (
        <>
          {!isUnpaidOrder && (
            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Alasan pembatalan</ThemedText>
              {commonCancellationReasons.map((item) => (
                <TouchableOpacity key={item} style={[styles.reasonButton, selectedReason === item && styles.reasonSelected]} onPress={() => { setSelectedReason(item); setReason(item); }}>
                  <Ionicons name={selectedReason === item ? "radio-button-on" : "radio-button-off"} size={20} color={ColorDark} />
                  <ThemedText style={{ flex: 1 }}>{item}</ThemedText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.reasonButton, selectedReason === "other" && styles.reasonSelected]} onPress={() => setSelectedReason("other")}>
                <Ionicons name={selectedReason === "other" ? "radio-button-on" : "radio-button-off"} size={20} color={ColorDark} />
                <ThemedText style={{ flex: 1 }}>Alasan lainnya</ThemedText>
              </TouchableOpacity>
              {selectedReason === "other" && <TextInput value={reason} onChangeText={setReason} placeholder="Tulis alasan pembatalan" multiline style={styles.textInput} />}
            </View>
          )}

          {!isUnpaidOrder && (
            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Rekening refund</ThemedText>
              {refundAccounts.map((account) => (
                <TouchableOpacity key={account.id} style={[styles.accountRow, selectedRefundAccountId === account.id && styles.reasonSelected]} onPress={() => setSelectedRefundAccountId(account.id)}>
                  <Ionicons name={selectedRefundAccountId === account.id ? "radio-button-on" : "radio-button-off"} size={20} color={ColorDark} />
                  <View style={{ flex: 1 }}><ThemedText>{account.bank_name}</ThemedText><ThemedText style={styles.muted}>{account.account_number} · {account.account_holder_name}</ThemedText></View>
                  <TouchableOpacity onPress={() => startEditRefundAccount(account)}><Ionicons name="create-outline" size={20} color={ColorDark} /></TouchableOpacity>
                </TouchableOpacity>
              ))}
              {isAddingRefundAccount && <View style={styles.form}><ThemedInput value={bankName} onChangeText={setBankName} placeholder="Nama bank" /><ThemedInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Nomor rekening" keyboardType="number-pad" /><ThemedInput value={accountHolderName} onChangeText={setAccountHolderName} placeholder="Nama pemilik rekening" /><View style={styles.inlineActions}><TouchableOpacity onPress={resetRefundAccountForm}><ThemedText>Batal</ThemedText></TouchableOpacity><TouchableOpacity onPress={() => void saveRefundAccount()} disabled={savingAccount}><ThemedText style={styles.linkButton}>{savingAccount ? "Menyimpan..." : "Simpan"}</ThemedText></TouchableOpacity></View></View>}
              {!isAddingRefundAccount && <TouchableOpacity style={styles.secondaryFullButton} onPress={() => setIsAddingRefundAccount(true)}><Ionicons name="add" size={18} color={ColorDark} /><ThemedText>Tambah rekening</ThemedText></TouchableOpacity>}
            </View>
          )}

          {isUnpaidOrder && <View style={styles.card}><ThemedText style={styles.muted}>Karena pesanan belum dibayar, pembatalan tidak memerlukan rekening refund.</ThemedText></View>}
          <TouchableOpacity style={[styles.primaryFullButton, !canCancel && styles.disabledButton]} onPress={askConfirmation} disabled={!canCancel || submitting}>
            <ThemedText style={styles.primaryButtonText}>{isUnpaidOrder ? "Batalkan Pesanan" : "Ajukan Pembatalan"}</ThemedText>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({
  container: { padding: 8, paddingBottom: 30 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8 },
  sectionTitle: { fontWeight: "600", fontSize: 16, marginBottom: 5 },
  invoice: { opacity: 0.55, fontSize: 12, marginBottom: 10 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(204,204,204,0.12)" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10 },
  total: { fontWeight: "700" },
  muted: { opacity: 0.65, fontSize: 13 },
  reasonButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  reasonSelected: { backgroundColor: "rgba(128,128,128,0.08)" },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 9, borderRadius: 8, marginBottom: 4 },
  textInput: { minHeight: 90, borderWidth: 1, borderColor: "rgba(128,128,128,0.25)", borderRadius: 8, padding: 10, textAlignVertical: "top", marginTop: 8 },
  form: { gap: 8, marginTop: 8 },
  inlineActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  linkButton: { fontWeight: "600" },
  primaryFullButton: { backgroundColor: ColorDark, borderRadius: 8, padding: 13, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  secondaryFullButton: { borderWidth: 1, borderColor: "rgba(128,128,128,0.25)", borderRadius: 8, padding: 12, alignItems: "center", justifyContent: "center", marginTop: 10, flexDirection: "row", gap: 6 },
  disabledButton: { opacity: 0.45 },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  modalCard: { borderRadius: 14, padding: 18 },
  modalIcon: { alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  modalDescription: { textAlign: "center", marginBottom: 8 },
  modalConsequence: { textAlign: "center", opacity: 0.65, fontSize: 13 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 18 },
  modalSecondaryButton: { flex: 1, borderWidth: 1, borderColor: "rgba(128,128,128,0.25)", borderRadius: 8, padding: 12, alignItems: "center" },
  modalPrimaryButton: { flex: 1, backgroundColor: ColorDark, borderRadius: 8, padding: 12, alignItems: "center" },
  statusIcon: { marginBottom: 8 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
});
