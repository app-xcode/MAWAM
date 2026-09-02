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
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ConfirmModal from "@/components/ui/ConfirmModal";

const ColorDark = Colors.light.tint;
const ColorLight = Colors.dark.tint;

const commonCancellationReasons = [
  "Ingin mengubah alamat pengiriman",
  "Penjual tidak membalas chat",
  "Ingin mengubah rincian pesanan",
];

function cancellationInfo(status?: string) {
  if (status?.includes("pending")) {
    return {
      title: "Batalkan pesanan yang belum dibayar?",
      description:
        "Pesanan ini belum dibayar dan akan langsung dibatalkan.",
      consequence:
        "Anda tidak perlu melakukan pembayaran untuk pesanan ini.",
      icon: "card-outline" as const,
    };
  }

  if (status === "shipped") {
    return {
      title: "Ajukan pembatalan pesanan?",
      description:
        "Pesanan sudah dalam pengiriman. Permintaan pembatalan akan diteruskan untuk diproses.",
      consequence:
        "Pengiriman mungkin tidak dapat dihentikan. Hubungi penjual bila membutuhkan bantuan terkait pesanan atau pengembalian dana.",
      icon: "car-outline" as const,
    };
  }

  return {
    title: "Batalkan pesanan yang sedang dikemas?",
    description:
      "Pesanan telah dibayar dan sedang disiapkan oleh penjual.",
    consequence:
      "Pembatalan akan diproses sesuai kebijakan penjual. Pengembalian dana, jika berlaku, mengikuti metode pembayaran Anda.",
    icon: "cube-outline" as const,
  };
}

function cancellationProgressInfo(cancellation: any) {
  if (cancellation.seller_decision === "pending") {
    return {
      title: "Anda sudah mengajukan pembatalan",
      description:
        "Pengajuan Anda sedang menunggu persetujuan penjual. Selama belum diputuskan, Anda dapat membatalkan pengajuan ini.",
      icon: "time-outline" as const,
    };
  }

  if (cancellation.seller_decision === "rejected") {
    return {
      title: "Pembatalan ditolak penjual",
      description:
        cancellation.seller_rejection_reason ||
        "Penjual menolak permintaan pembatalan ini.",
      icon: "close-circle-outline" as const,
    };
  }

  if (cancellation.refund_status === "processing") {
    return {
      title: "Refund sedang diproses admin",
      description:
        "Admin sedang mentransfer dana ke rekening refund yang Anda pilih.",
      icon: "swap-horizontal-outline" as const,
    };
  }

  if (cancellation.refund_status === "completed") {
    return {
      title: "Refund berhasil diproses",
      description:
        "Dana refund telah ditransfer oleh admin.",
      icon: "checkmark-circle-outline" as const,
    };
  }

  if (cancellation.refund_status === "failed") {
    return {
      title: "Refund perlu ditindaklanjuti",
      description:
        "Transfer refund belum berhasil. Admin akan menindaklanjuti proses ini.",
      icon: "alert-circle-outline" as const,
    };
  }

  return {
    title: "Menunggu refund dari admin",
    description:
      "Pembatalan telah disetujui. Admin akan memproses transfer refund ke rekening Anda.",
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
  const [
    selectedReason,
    setSelectedReason,
  ] = useState<string | "other" | null>(null);

  const [refundAccounts, setRefundAccounts] = useState<any[]>([]);
  const [
    selectedRefundAccountId,
    setSelectedRefundAccountId,
  ] = useState<string | null>(null);

  const [
    isAddingRefundAccount,
    setIsAddingRefundAccount,
  ] = useState(false);

  const [
    editingRefundAccountId,
    setEditingRefundAccountId,
  ] = useState<string | null>(null);

  const [
    accountPendingDeletion,
    setAccountPendingDeletion,
  ] = useState<any>(null);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  const [savingAccount, setSavingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const [
    showCancelRequestConfirmation,
    setShowCancelRequestConfirmation,
  ] = useState(false);

  const [
    cancellingRequest,
    setCancellingRequest,
  ] = useState(false);
  

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    const { data, error } = await supabase
      .from("mawam_orders")
      .select(`
        id,
        invoice,
        seller_id,
        status,
        total,
        cancellation_status,
        mawam_profile:seller_id(
          nama,
          mawam_toko(nama_toko)
        ),
        mawam_payments:payment_id(paid_at),
        mawam_order_cancellations(
          id,
          seller_decision,
          seller_rejection_reason,
          refund_status,
          refund_proof_path
        ),
        mawam_order_items(
          qty,
          subtotal,
          mawam_produk(
            nama_produk,
            satuan
          )
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

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
      .select(
        "id, bank_name, account_number, account_holder_name, is_default"
      )
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      Alerts("Rekening refund tidak dapat dimuat.", "error");
      return;
    }

    setRefundAccounts(data || []);

    const defaultAccount =
      data?.find((item) => item.is_default) || data?.[0];

    if (defaultAccount) {
      setSelectedRefundAccountId(defaultAccount.id);
    }
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
    if (
      !user ||
      !bankName.trim() ||
      !accountNumber.trim() ||
      !accountHolderName.trim()
    ) {
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
      ? supabase
          .from("mawam_refund_accounts")
          .update(accountData)
          .eq("id", editingRefundAccountId)
          .eq("user_id", user.id)
      : supabase
          .from("mawam_refund_accounts")
          .insert({
            ...accountData,
            user_id: user.id,
            is_default: refundAccounts.length === 0,
          });

    const { data, error } = await request
      .select(
        "id, bank_name, account_number, account_holder_name, is_default"
      )
      .single();

    setSavingAccount(false);

    if (error) {
      console.log(error);

      Alerts(
        editingRefundAccountId
          ? "Rekening refund gagal diperbarui."
          : "Rekening refund gagal disimpan.",
        "error"
      );

      return;
    }

    setRefundAccounts((current) =>
      editingRefundAccountId
        ? current.map((account) =>
            account.id === data.id ? data : account
          )
        : [data, ...current]
    );

    setSelectedRefundAccountId(data.id);

    setIsAddingRefundAccount(false);
    setEditingRefundAccountId(null);

    setBankName("");
    setAccountNumber("");
    setAccountHolderName("");

    Alerts(
      isEditing
        ? "Rekening refund berhasil diperbarui."
        : "Rekening refund berhasil ditambahkan.",
      "success"
    );
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

    const { error } = await supabase
      .from("mawam_refund_accounts")
      .delete()
      .eq("id", deletedAccountId)
      .eq("user_id", user.id);

    if (error) {
      console.log(error);

      Alerts(
        "Rekening tidak dapat dihapus. Rekening yang sudah dipakai untuk refund harus tetap disimpan.",
        "error"
      );

      return;
    }

    const remainingAccounts = refundAccounts.filter(
      (account) => account.id !== deletedAccountId
    );

    setRefundAccounts(remainingAccounts);

    if (selectedRefundAccountId === deletedAccountId) {
      setSelectedRefundAccountId(
        remainingAccounts[0]?.id || null
      );
    }

    Alerts(
      "Rekening refund berhasil dihapus.",
      "success"
    );
  };

  /**
   * ============================================================
   * PEMBATALAN PESANAN
   * ============================================================
   *
   * pending_payment:
   *   → melalui Edge Function mawam-cancel
   *   → validasi user dilakukan server
   *   → order dibatalkan secara aman
   *   → stok dikembalikan melalui trigger database
   *   → invoice Mayar dicoba ditutup
   *
   * paid / processed / settlement:
   *   → tetap menggunakan flow refund lama
   */
  const cancelOrder = async () => {
    if (!order || submitting) return;

    setSubmitting(true);

    try {
      // ============================================================
      // PESANAN BELUM DIBAYAR
      // ============================================================
      if (order.status === "pending_payment") {
        if (!reason.trim()) {
          Alerts(
            "Pilih alasan pembatalan terlebih dahulu.",
            "info"
          );
          return;
        }

        const { data, error } =
          await supabase.functions.invoke(
            "mawam-cancel",
            {
              body: {
                orderId: order.id,
                reason: reason.trim(),
              },
            }
          );

        if (error) {
          console.log(
            "Cancel unpaid order error:",
            error
          );

          Alerts(
            error.message ||
              "Pesanan gagal dibatalkan.",
            "error"
          );

          return;
        }

        if (!data?.success) {
          Alerts(
            data?.message ||
              "Pesanan gagal dibatalkan.",
            "error"
          );

          return;
        }

        // ==========================================================
        // ORDER SUDAH CANCELLED, TAPI MAYAR GAGAL DITUTUP
        // ==========================================================
        if (data?.mayar?.closed === false) {
          Alerts(
            "Pesanan berhasil dibatalkan. Invoice pembayaran tidak dapat ditutup otomatis.",
            "info"
          );
        } else {
          Alerts(
            "Pesanan berhasil dibatalkan.",
            "success"
          );
        }

        router.replace({
          pathname: "/pesanan/rincian/",
          params: {
            orderId: order.id,
          },
        });

        return;
      }

      // ============================================================
      // PESANAN SUDAH DIBAYAR
      // FLOW REFUND TETAP SEPERTI SEBELUMNYA
      // ============================================================
      if (!selectedRefundAccountId) {
        Alerts(
          "Pilih rekening tujuan refund terlebih dahulu.",
          "error"
        );

        return;
      }

      const { error } = await supabase.rpc(
        "request_order_cancellation",
        {
          p_order_id: order.id,
          p_reason: reason.trim(),
          p_refund_account_id:
            selectedRefundAccountId,
        }
      );

      if (error) {
        console.log(error);

        Alerts(
          "Pembatalan pesanan gagal. Silakan coba lagi.",
          "error"
        );

        return;
      }

      // ============================================================
      // NOTIFIKASI
      // ============================================================
      try {
        if (user?.id) {
          await notifyCancellationRequestedToBuyer(
            user.id,
            order.id
          );
        }

        if (order.seller_id) {
          await notifyCancellationRequestedToSeller(
            order.seller_id,
            order.id
          );
        }
      } catch (notificationError) {
        console.log(
          "Cancellation notification error",
          notificationError
        );
      }

      Alerts(
        "Permintaan pembatalan berhasil dikirim.",
        "success"
      );

      await fetchOrder();
    } finally {
      setSubmitting(false);
    }
  };

  const cancelCancellationRequest = async () => {
    if (!cancellation || cancellingRequest) return;

    setCancellingRequest(true);

    const { error } = await supabase.rpc(
      "cancel_order_cancellation",
      {
        p_cancellation_id: cancellation.id,
      }
    );

    setCancellingRequest(false);

    setShowCancelRequestConfirmation(false);

    if (error) {
      console.log(error);

      Alerts(
        "Pengajuan pembatalan tidak dapat dibatalkan.",
        "error"
      );

      return;
    }

    Alerts(
      "Pengajuan pembatalan berhasil dibatalkan.",
      "success"
    );

    router.replace({
      pathname: "/pesanan/rincian/",
      params: {
        orderId,
      },
    });
  };

  if (!order) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={Colors[scheme].icon}
        />

        <ThemedText>
          Memuat pesanan...
        </ThemedText>
      </View>
    );
  }

  const info = cancellationInfo(order.status);

  const storeName =
    order.mawam_profile?.mawam_toko?.[0]
      ?.nama_toko ||
    order.mawam_profile?.nama ||
    "Penjual";

  const cancellation =
    order.mawam_order_cancellations?.[0];

  const isActiveCancellation = Boolean(
    cancellation &&
      cancellation.seller_decision !== "cancelled"
  );

  const isUnpaidOrder =
    order.status === "pending_payment";

  const isPackedOrder = [
    "paid",
    "processed",
    "settlement",
  ].includes(order.status);

  /**
   * Untuk pending_payment sekarang alasan juga wajib.
   * Ini diperlukan karena Edge Function mawam-cancel
   * menolak alasan kosong.
   */
  const hasValidReason =
    selectedReason !== null &&
    (
      selectedReason !== "other" ||
      Boolean(reason.trim())
    );

  const canCancel = isUnpaidOrder
    ? !isActiveCancellation &&
      hasValidReason
    : isPackedOrder &&
      !isActiveCancellation &&
      Boolean(selectedRefundAccountId) &&
      hasValidReason;

  const askConfirmation = () => {
    if (!selectedReason) {
      Alerts(
        "Pilih alasan pembatalan terlebih dahulu.",
        "info"
      );

      return;
    }

    if (
      selectedReason === "other" &&
      !reason.trim()
    ) {
      Alerts(
        "Tulis alasan pembatalan terlebih dahulu.",
        "info"
      );

      return;
    }

    setShowConfirmation(true);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Konfirmasi Pembatalan",
        }}
      />

      {/* ==========================================================
          DIALOG KONFIRMASI UTAMA
          Desain dipertahankan dari kode lama
      ========================================================== */}
    <ConfirmModal
  visible={showConfirmation}
  title={
    isUnpaidOrder
      ? "Batalkan pesanan?"
      : "Kirim permintaan pembatalan?"
  }
  message={
    isUnpaidOrder
      ? "Pesanan ini belum dibayar dan akan langsung dibatalkan. Anda tidak perlu melakukan pembayaran untuk pesanan ini."
      : "Jika pembayaran sudah lebih dari satu jam, permintaan akan menunggu persetujuan penjual. Setelah disetujui, admin memproses refund manual ke rekening Anda."
  }
  confirmText={
    isUnpaidOrder
      ? "Batalkan Pesanan"
      : "Kirim Permintaan"
  }
  cancelText="Kembali"
  variant="warning"
  loading={submitting}
  onCancel={() => setShowConfirmation(false)}
  onConfirm={async () => {
    setShowConfirmation(false);
    await cancelOrder();
  }}
/>

      {/* ==========================================================
          DIALOG BATALKAN PENGAJUAN
      ========================================================== */}
    <ConfirmModal
  visible={showCancelRequestConfirmation}
  title="Batalkan pengajuan?"
  message="Penjual tidak akan memproses pembatalan ini. Anda dapat mengajukan pembatalan kembali nanti bila diperlukan."
  confirmText="Batalkan Pengajuan"
  cancelText="Kembali"
  variant="warning"
  loading={cancellingRequest}
  onCancel={() =>
    setShowCancelRequestConfirmation(false)
  }
  onConfirm={cancelCancellationRequest}
/>

      {/* ==========================================================
          DIALOG HAPUS REKENING
      ========================================================== */}
   <ConfirmModal
  visible={Boolean(accountPendingDeletion)}
  title="Hapus rekening?"
  message={
    accountPendingDeletion
      ? `Rekening ${accountPendingDeletion.bank_name} · ${accountPendingDeletion.account_number} akan dihapus.`
      : ""
  }
  confirmText="Hapus"
  cancelText="Batal"
  variant="destructive"
  onCancel={() => setAccountPendingDeletion(null)}
  onConfirm={deleteRefundAccount}
/>

      {/* ==========================================================
          CONTENT
      ========================================================== */}
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* INFO PESANAN */}
        <ThemedView style={styles.card}>
          <View style={styles.heading}>
            <View style={styles.icon}>
              <Ionicons
                name={info.icon}
                size={24}
                color={ColorLight}
              />
            </View>

            <View style={styles.flex}>
              <ThemedText style={styles.title}>
                {info.title}
              </ThemedText>

              <ThemedText style={styles.desc}>
                {info.description}
              </ThemedText>
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={Colors[scheme].icon}
            />

            <ThemedText style={styles.noticeText}>
              {info.consequence}
            </ThemedText>
          </View>
        </ThemedView>

        {/* STATUS PENGAJUAN */}
        {isActiveCancellation &&
          (() => {
            const progress =
              cancellationProgressInfo(
                cancellation
              );

            return (
              <ThemedView
                style={styles.statusCard}
              >
                <Ionicons
                  name={progress.icon}
                  size={24}
                  color={Colors[scheme].icon}
                />

                <View style={styles.flex}>
                  <ThemedText style={styles.bold}>
                    {progress.title}
                  </ThemedText>

                  <ThemedText style={styles.desc}>
                    {progress.description}
                  </ThemedText>

                  {cancellation.seller_decision ===
                    "pending" && (
                    <TouchableOpacity
                      onPress={() =>
                        setShowCancelRequestConfirmation(
                          true
                        )
                      }
                      style={
                        styles.cancelRequestButton
                      }
                    >
                      <ThemedText
                        style={
                          styles.cancelRequestButtonText
                        }
                      >
                        Batalkan Pengajuan
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </ThemedView>
            );
          })()}

        {/* PENGAJUAN SEBELUMNYA DIBATALKAN */}
        {cancellation?.seller_decision ===
          "cancelled" && (
          <ThemedView style={styles.statusCard}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={Colors[scheme].icon}
            />

            <View style={styles.flex}>
              <ThemedText style={styles.bold}>
                Pengajuan sebelumnya dibatalkan
              </ThemedText>

              <ThemedText style={styles.desc}>
                Anda dapat mengajukan pembatalan baru
                bila masih diperlukan.
              </ThemedText>
            </View>
          </ThemedView>
        )}

        {/* DETAIL PESANAN */}
        <ThemedView style={styles.card}>
          <ThemedText style={styles.bold}>
            Pesanan yang dibatalkan
          </ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.muted}>
              No. Pesanan
            </ThemedText>

            <ThemedText>
              {order.invoice}
            </ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.muted}>
              Toko
            </ThemedText>

            <ThemedText>
              {storeName}
            </ThemedText>
          </View>

          {order.mawam_order_items?.map(
            (item: any, index: number) => (
              <View
                key={index}
                style={styles.item}
              >
                <View style={styles.flex}>
                  <ThemedText
                    numberOfLines={1}
                  >
                    {item.mawam_produk?.nama_produk}
                  </ThemedText>

                  <ThemedText
                    style={styles.muted}
                  >
                    {item.qty}{" "}
                    {item.mawam_produk?.satuan}
                  </ThemedText>
                </View>

                <ThemedText>
                  {rupiah(item.subtotal)}
                </ThemedText>
              </View>
            )
          )}

          <View
            style={[
              styles.row,
              styles.total,
            ]}
          >
            <ThemedText style={styles.bold}>
              Total Pesanan
            </ThemedText>

            <ThemedText style={styles.bold}>
              {rupiah(order.total)}
            </ThemedText>
          </View>
        </ThemedView>

        {/* ========================================================
            ALASAN PEMBATALAN
        ======================================================== */}
        {!isActiveCancellation &&
          (isUnpaidOrder || isPackedOrder) && (
            <ThemedView style={styles.card}>
              <ThemedText style={styles.bold}>
                Alasan pembatalan
              </ThemedText>

              <ThemedText style={styles.desc}>
                Pilih alasan pembatalan untuk diteruskan
                kepada penjual.
              </ThemedText>

              <View style={styles.reasonOptions}>
                {commonCancellationReasons.map(
                  (commonReason) => {
                    const selected =
                      selectedReason ===
                      commonReason;

                    return (
                      <TouchableOpacity
                        key={commonReason}
                        onPress={() => {
                          setSelectedReason(
                            commonReason
                          );

                          setReason(
                            commonReason
                          );
                        }}
                        style={[
                          styles.reasonOption,
                          selected &&
                            styles.reasonOptionSelected,
                        ]}
                      >
                        <Ionicons
                          name={
                            selected
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={18}
                          color={
                            selected
                              ? ColorDark
                              : Colors[scheme]
                                  .icon
                          }
                        />

                        <ThemedText
                          style={[
                            styles.reasonOptionText,
                            selected &&
                              styles.reasonOptionTextSelected,
                          ]}
                        >
                          {commonReason}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  }
                )}

                <TouchableOpacity
                  onPress={() => {
                    setSelectedReason(
                      "other"
                    );
                    setReason("");
                  }}
                  style={[
                    styles.reasonOption,
                    selectedReason ===
                      "other" &&
                      styles.reasonOptionSelected,
                  ]}
                >
                  <Ionicons
                    name={
                      selectedReason ===
                      "other"
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={18}
                    color={
                      selectedReason ===
                      "other"
                        ? ColorDark
                        : Colors[scheme]
                            .icon
                    }
                  />

                  <ThemedText
                    style={[
                      styles.reasonOptionText,
                      selectedReason ===
                        "other" &&
                        styles.reasonOptionTextSelected,
                    ]}
                  >
                    Alasan lainnya
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {selectedReason ===
                "other" && (
                <>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Tulis alasan pembatalan Anda"
                    placeholderTextColor={
                      isDark
                        ? "#9CA3AF"
                        : "#6B7280"
                    }
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                    style={[
                      styles.input,
                      {
                        color:
                          Colors[scheme]
                            .text,
                        borderColor:
                          Colors[scheme]
                            .icon,
                      },
                    ]}
                  />

                  <ThemedText
                    style={styles.count}
                  >
                    {reason.length}/300
                  </ThemedText>
                </>
              )}
            </ThemedView>
          )}

        {/* ========================================================
            REKENING REFUND
        ======================================================== */}
        {!isActiveCancellation &&
          isPackedOrder && (
            <ThemedView style={styles.card}>
              <ThemedText style={styles.bold}>
                Rekening tujuan refund
              </ThemedText>

              <ThemedText style={styles.desc}>
                Admin akan mentransfer refund manual ke
                rekening yang Anda pilih setelah
                pembatalan disetujui.
              </ThemedText>

              {refundAccounts.map(
                (account) => {
                  const selected =
                    selectedRefundAccountId ===
                    account.id;

                  return (
                    <View
                      key={account.id}
                      style={[
                        styles.accountOption,
                        selected &&
                          styles.reasonOptionSelected,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          setSelectedRefundAccountId(
                            account.id
                          )
                        }
                        style={
                          styles.accountOptionMain
                        }
                      >
                        <Ionicons
                          name={
                            selected
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={18}
                          color={
                            selected
                              ? ColorDark
                              : Colors[scheme]
                                  .icon
                          }
                        />

                        <View
                          style={
                            styles.flex
                          }
                        >
                          <ThemedText
                            style={[
                              styles.reasonOptionText,
                              selected &&
                                styles.reasonOptionTextSelected,
                            ]}
                          >
                            {account.bank_name} ·{" "}
                            {
                              account.account_number
                            }
                          </ThemedText>

                          <ThemedText
                            style={
                              styles.muted
                            }
                          >
                            {
                              account.account_holder_name
                            }
                          </ThemedText>
                        </View>
                      </TouchableOpacity>

                      <View
                        style={
                          styles.accountOptionActions
                        }
                      >
                        <TouchableOpacity
                          onPress={() =>
                            startEditRefundAccount(
                              account
                            )
                          }
                          style={
                            styles.accountAction
                          }
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color={
                              Colors[scheme]
                                .icon
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            setAccountPendingDeletion(
                              account
                            )
                          }
                          style={
                            styles.accountAction
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={
                              Colors[scheme]
                                .icon
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
              )}

              {!isAddingRefundAccount ? (
                <TouchableOpacity
                  onPress={() =>
                    setIsAddingRefundAccount(
                      true
                    )
                  }
                  style={
                    styles.addAccountButton
                  }
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={19}
                    color={ColorDark}
                  />

                  <ThemedText
                    style={
                      styles.addAccountText
                    }
                  >
                    {refundAccounts.length
                      ? "Tambah rekening lain"
                      : "Tambah rekening refund"}
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <View
                  style={styles.accountForm}
                >
                  <ThemedInput
                    value={bankName}
                    onChangeText={
                      setBankName
                    }
                    placeholder="Nama bank, contoh: BRI"
                    autoCapitalize="characters"
                    editable={!savingAccount}
                  />

                  <ThemedInput
                    value={accountNumber}
                    onChangeText={
                      setAccountNumber
                    }
                    placeholder="Nomor rekening"
                    keyboardType="number-pad"
                    editable={!savingAccount}
                  />

                  <ThemedInput
                    value={
                      accountHolderName
                    }
                    onChangeText={
                      setAccountHolderName
                    }
                    placeholder="Nama pemilik rekening"
                    autoCapitalize="words"
                    editable={!savingAccount}
                  />

                  <View
                    style={
                      styles.accountActions
                    }
                  >
                    <TouchableOpacity
                      disabled={
                        savingAccount
                      }
                      onPress={
                        resetRefundAccountForm
                      }
                      style={
                        styles.accountCancelButton
                      }
                    >
                      <ThemedText
                        style={
                          styles.backText
                        }
                      >
                        Batal
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={
                        savingAccount
                      }
                      onPress={
                        saveRefundAccount
                      }
                      style={[
                        styles.accountSaveButton,
                        savingAccount &&
                          styles.disabled,
                      ]}
                    >
                      {savingAccount ? (
                        <ActivityIndicator
                          color={
                            ColorLight
                          }
                        />
                      ) : (
                        <ThemedText
                          style={
                            styles.cancelText
                          }
                        >
                          {editingRefundAccountId
                            ? "Simpan Perubahan"
                            : "Simpan Rekening"}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ThemedView>
          )}

        {/* STATUS JIKA TIDAK BISA CANCEL */}
        {!isActiveCancellation &&
          !isUnpaidOrder &&
          !isPackedOrder && (
            <ThemedView
              style={styles.statusCard}
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={Colors[scheme].icon}
              />

              <View style={styles.flex}>
                <ThemedText
                  style={styles.bold}
                >
                  Pembatalan refund belum tersedia
                </ThemedText>

                <ThemedText
                  style={styles.desc}
                >
                  Saat ini pengajuan pembatalan manual
                  hanya tersedia untuk pesanan berstatus
                  Dikemas.
                </ThemedText>
              </View>
            </ThemedView>
          )}
      </ScrollView>

      {/* ==========================================================
          FOOTER
          Tetap menggunakan konsep UI lama
      ========================================================== */}
      <ThemedView style={styles.footer}>
        <TouchableOpacity
          disabled={submitting}
          onPress={() => router.back()}
          style={[
            styles.back,
            isActiveCancellation && {
              flex: 1,
            },
          ]}
        >
          <ThemedText
            style={styles.backText}
          >
            {isActiveCancellation
              ? "Kembali ke Pesanan"
              : "Kembali"}
          </ThemedText>
        </TouchableOpacity>

        {!isActiveCancellation && (
          <TouchableOpacity
            disabled={
              submitting ||
              !canCancel
            }
            onPress={askConfirmation}
            style={[
              styles.cancel,
              (submitting ||
                !canCancel) &&
                styles.disabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator
                color={ColorLight}
              />
            ) : (
              <ThemedText
                style={styles.cancelText}
              >
                {isUnpaidOrder
                  ? "Batalkan Pesanan"
                  : "Ajukan Pembatalan"}
              </ThemedText>
            )}
          </TouchableOpacity>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  container: {
    padding: 12,
    gap: 10,
  },

  card: {
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },

  heading: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },

  flex: {
    flex: 1,
  },

  icon: {
    backgroundColor: ColorDark,
    padding: 9,
    borderRadius: 24,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
  },

  bold: {
    fontWeight: "700",
  },

  desc: {
    opacity: 0.72,
    lineHeight: 20,
  },

  notice: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#8888881A",
  },

  noticeText: {
    flex: 1,
    opacity: 0.8,
    lineHeight: 19,
  },

  statusCard: {
    borderRadius: 10,
    padding: 14,
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  muted: {
    opacity: 0.65,
  },

  item: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderColor: "#88888855",
    paddingTop: 10,
    flexDirection: "row",
    gap: 12,
  },

  total: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderColor: "#88888855",
    paddingTop: 10,
  },

  reasonOptions: {
    gap: 8,
  },

  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#88888855",
    borderRadius: 8,
    padding: 10,
  },

  reasonOptionSelected: {
    borderColor: ColorDark,
    backgroundColor: "#8888881A",
  },

  reasonOptionText: {
    flex: 1,
  },

  reasonOptionTextSelected: {
    color: ColorDark,
    fontWeight: "600",
  },

  accountOption: {
    borderWidth: 1,
    borderColor: "#88888855",
    borderRadius: 8,
    overflow: "hidden",
  },

  accountOptionMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },

  accountOptionActions: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderColor: "#88888855",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
    padding: 4,
  },

  accountAction: {
    padding: 6,
  },

  addAccountButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ColorDark,
    borderRadius: 8,
    padding: 11,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  addAccountText: {
    color: ColorDark,
    fontWeight: "600",
  },

  accountForm: {
    gap: 4,
    marginTop: 2,
  },

  accountActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  accountCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: ColorDark,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },

  accountSaveButton: {
    flex: 1.5,
    backgroundColor: ColorDark,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },

  count: {
    alignSelf: "flex-end",
    opacity: 0.55,
    fontSize: 12,
    marginTop: -5,
  },

  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    paddingBottom: 20,
  },

  back: {
    flex: 1,
    borderColor: ColorDark,
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },

  backText: {
    color: ColorDark,
    fontWeight: "700",
  },

  cancel: {
    flex: 1.45,
    backgroundColor: ColorDark,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: ColorLight,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.55,
  },

  cancelRequestButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderWidth: 1,
    borderColor: ColorDark,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cancelRequestButtonText: {
    color: ColorDark,
    fontWeight: "600",
  },
})
