import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const BITESHIP_ENDPOINT = "https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/biteship";

type TrackingEvent = {
  status?: string;
  note?: string;
  description?: string;
  updated_at?: string;
  created_at?: string;
  date?: string;
  time?: string;
  location?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return "Waktu belum tersedia";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getEvents = (tracking: any): TrackingEvent[] => {
  const events = tracking?.history ?? tracking?.events ?? tracking?.tracking_history ?? tracking?.data?.history ?? [];
  return Array.isArray(events) ? events : [];
};

export default function LacakPesananScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colorScheme = isDark ? "dark" : "light";
  const iconColor = Colors[colorScheme].icon;
  const tint = Colors["light"].tint;
  const tintText = Colors["dark"].tint;
  const [shipment, setShipment] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracking = useCallback(async (refresh = false) => {
    if (!orderId || !user) return;

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const { data: order, error: shipmentError } = await supabase
      .from("mawam_orders")
      .select("mawam_pengiriman(*)")
      .eq("id", orderId)
      .single();

    const delivery = order?.mawam_pengiriman?.[0];
    if (shipmentError || !delivery) {
      setShipment(null);
      setTracking(null);
      setError("Data pengiriman untuk pesanan ini belum tersedia.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setShipment(delivery);
    const courier = String(delivery.courier_code ?? "").trim().toLowerCase();
    const waybill = String(delivery.tracking_number ?? delivery.resi ?? "").trim();

    if (!courier || !waybill || waybill.toLowerCase().startsWith("resi-test-")) {
      setTracking(null);
      setError("Nomor resi belum diinput oleh penjual.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(BITESHIP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tracking", courier, waybill }),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message ?? "Pelacakan belum dapat dimuat.");
      }
      setTracking(result.data);
    } catch (requestError: any) {
      setTracking(null);
      setError(requestError?.message ?? "Terjadi kesalahan saat memuat pelacakan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    if (!user) {
      router.replace("produk");
      return;
    }
    const timeout = setTimeout(() => void loadTracking(), 0);
    return () => clearTimeout(timeout);
  }, [loadTracking, user]);

  const events = getEvents(tracking);
  const deliveryStatus = tracking?.status ?? tracking?.tracking_status ?? tracking?.latest_status ?? "Status belum tersedia";
  const waybill = shipment?.tracking_number ?? shipment?.resi;

  return (
    <>
      <Stack.Screen options={{ title: "Lacak Pesanan" }} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadTracking(true)} tintColor={iconColor} />}
      >
        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={iconColor} /><ThemedText>Memuat pelacakan...</ThemedText></View> : <>
          <ThemedView style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="cube-outline" size={24} color={iconColor} />
              <View style={styles.flex}>
                <ThemedText style={styles.title}>{shipment?.courier_name ?? shipment?.courier_code ?? "Kurir"}</ThemedText>
                <ThemedText style={styles.muted}>{shipment?.service ?? "Layanan pengiriman"}</ThemedText>
              </View>
            </View>
            <View style={styles.divider} />
            <ThemedText style={styles.label}>Nomor resi</ThemedText>
            <ThemedText selectable style={styles.waybill}>{waybill ?? "Belum tersedia"}</ThemedText>
            <View style={[styles.status, { backgroundColor: tint }]}>
              <Ionicons name="navigate-outline" size={18} color={tintText} />
              <ThemedText style={{ color: tintText, fontWeight: "700", flex: 1 }}>{String(deliveryStatus)}</ThemedText>
            </View>
          </ThemedView>

          {error ? <ThemedView style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="information-circle-outline" size={28} color={iconColor} />
              <View>
                <ThemedText style={[styles.title, { marginTop: 8 }]}>Pelacakan belum tersedia</ThemedText>
                <ThemedText style={styles.muted}>{error}</ThemedText>
                <TouchableOpacity style={[styles.reload, { backgroundColor: tint }]} onPress={() => void loadTracking()}>
                  <ThemedText style={{ color: tintText, fontWeight: "700" }}>Coba lagi</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

          </ThemedView> : <ThemedView style={styles.card}>
            <ThemedText style={styles.title}>Riwayat Pengiriman</ThemedText>
            {events.length === 0 ? <ThemedText style={styles.muted}>Belum ada pembaruan perjalanan dari kurir.</ThemedText> : events.map((event, index) => (
              <View key={`${event.updated_at ?? event.created_at ?? event.date ?? index}-${index}`} style={styles.event}>
                <View style={styles.timeline}><View style={[styles.dot, { backgroundColor: index === 0 ? tint : iconColor }]} />{index < events.length - 1 && <View style={styles.line} />}</View>
                <View style={styles.flex}>
                  <ThemedText style={{ fontWeight: "700" }}>{event.status ?? event.note ?? event.description ?? "Pembaruan pengiriman"}</ThemedText>
                  {event.location && <ThemedText style={styles.muted}>{event.location}</ThemedText>}
                  {(event.updated_at ?? event.created_at ?? event.date ?? event.time) && <ThemedText style={styles.muted}>{formatDateTime(event.updated_at ?? event.created_at ?? event.date ?? event.time)}</ThemedText>}
                </View>
              </View>
            ))}
          </ThemedView>}
        </>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12, flexGrow: 1 },
  center: { flex: 1, minHeight: 300, justifyContent: "center", alignItems: "center", gap: 10 },
  card: { borderRadius: 10, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  title: { fontWeight: "700", fontSize: 16 },
  label: { opacity: 0.65, marginBottom: 4 },
  muted: { opacity: 0.7, marginTop: 3 },
  waybill: { fontSize: 18, fontWeight: "700", letterSpacing: 0.4 },
  divider: { borderTopWidth: 1, borderColor: "#cccccc24", marginVertical: 12 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 7, padding: 10, marginTop: 14 },
  reload: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  event: { flexDirection: "row", gap: 10, paddingTop: 14 },
  timeline: { width: 18, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { width: 2, flex: 1, minHeight: 34, backgroundColor: "#cccccc55", marginTop: 4 },
});
