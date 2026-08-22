import MapPicker from "@/components/ui/MapPicker";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import Alerts from "@/constants/Alerts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import ThemedInput from "@/components/themed-input";


const STATUS_PERJALANAN = [
  "Paket diterima",
  "Tiba di drop point",
  "Dalam perjalanan ke kota berikutnya",
  "Tiba di kota berikutnya",
  "Sampai di drop point tujuan",
  "Siap diambil",
  "Selesai",
];
const CATATAN_STATUS: Record<string, string> = {
  "Paket diterima": "Paket telah diterima.",
  "Tiba di drop point": "Paket telah tiba di drop point.",
  "Dalam perjalanan ke kota berikutnya":
    "Paket sedang dalam perjalanan ke kota berikutnya.",
  "Tiba di kota berikutnya":
    "Paket telah tiba di kota berikutnya.",
  "Sampai di drop point tujuan":
    "Paket telah sampai di drop point tujuan.",
  "Siap diambil": "Paket sudah siap untuk diambil.",
  "Selesai": "Pengiriman telah selesai.",
};
const KUPANG = { latitude: -10.1772, longitude: 123.6070 };

export default function UpdateLokasiPengiriman() {
  const { pengirimanId } = useLocalSearchParams<{ pengirimanId: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const iconColor = Colors[isDark ? "dark" : "light"].icon;
  const [shipment, setShipment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coordinates, setCoordinates] = useState(KUPANG);
  const [kota, setKota] = useState("");
  const [namaTempat, setNamaTempat] = useState("");
  const [dropPoint, setDropPoint] = useState("");
  const [status, setStatus] = useState(STATUS_PERJALANAN[1]);
  const [catatan, setCatatan] = useState("");
  const [pointAlamat, setPointAlamat] = useState<string>('');
  const [popup, setPopup] = useState<any>(null);
  const colorScheme = isDark ? 'dark' : 'light';
  const accentColor = Colors[colorScheme].accent;


  const styles = StyleSheet.create({
  container: { padding: 12, gap: 12 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  card: { borderRadius: 10, padding: 12 }, title: { fontSize: 16, fontWeight: "700" }, muted: { opacity: .7, marginTop: 4 },
  label: { fontWeight: "700", marginTop: 14, marginBottom: 6 }, hint: { opacity: .65, fontSize: 12, marginTop: 6 },
  map: { height: 250, overflow: "hidden", borderRadius: 10 }, input: { borderWidth: 1, borderColor: "#8888", borderRadius: 8, padding: 10, }, note: { minHeight: 88, textAlignVertical: "top" },
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, statusOption: { borderWidth: 1, borderColor: "#8888", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 }, statusSelected: { backgroundColor: accentColor, borderColor: accentColor }, statusSelectedText: { color: "#fff", fontWeight: "700" },
  button: { marginTop: 18, backgroundColor: accentColor, padding: 13, borderRadius: 9, alignItems: "center" }, buttonText: { color: "#fff", fontWeight: "800" },
});

  useEffect(() => {

    setCatatan(CATATAN_STATUS[status] ?? "")
  }, [status]);
  useEffect(() => {
    tampilLokasi(coordinates.latitude, coordinates.longitude)
  }, [coordinates]);

  const tampilLokasi = async (lat: number, lng: number) => {
    const res = await fetch(
      "https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/proxy?url=" +
      encodeURIComponent(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyB5Zf-tTLdsCoDhVJiv4klSDqpw4cX9U0Y`
      ),
      {
        method: "GET",
      }
    );

    const json = await res.json();

    if (json?.status !== "OK" || !json?.results?.length) return;

    const result = json.results[0];

    let tempat = "";
    let kotaDitemukan = "";

    for (const component of result.address_components ?? []) {
      const types = component.types ?? [];

      if (
        !tempat &&
        (types.includes("premise") ||
          types.includes("point_of_interest") ||
          types.includes("establishment"))
      ) {
        tempat = component.long_name;
      }

      if (
        types.includes("locality") ||
        types.includes("administrative_area_level_2")
      ) {
        kotaDitemukan = component.long_name;
        break;
      }
    }

    if (!tempat) {
      const addressParts = result.formatted_address
        ?.split(",")
        .map((item: string) => item.trim())
        .filter(Boolean);

      // Hindari Plus Code seperti RJF6+292
      const firstPart = addressParts?.[0] ?? "";

      if (firstPart.includes("+")) {
        tempat = addressParts?.[1] ?? "";
      } else {
        tempat = firstPart;
      }
    }

    setNamaTempat(tempat);

    if (tempat) {
      setDropPoint(
        [tempat, kotaDitemukan].filter(Boolean).join(", ")
      );
    }

    if (kotaDitemukan) {
      setKota(kotaDitemukan);
    }

    setPointAlamat(
      [tempat, kotaDitemukan].filter(Boolean).join(", ")
    );

    setPopup({
      id: result.place_id,
      name: tempat,
      code: result.formatted_address,
    });
  };

  const load = useCallback(async () => {
    if (!pengirimanId || !user) return;
    setLoading(true);
    const [{ data: delivery, error: deliveryError }, { data: locations, error: locationsError }] = await Promise.all([
      supabase.from("mawam_pengiriman").select("id, order_id, courier_name, courier_code, tracking_number, status, petugas_id, mawam_orders(invoice)").eq("id", pengirimanId).maybeSingle(),
      supabase.from("mawam_pengiriman_lokasi").select("id, kota, drop_point, status, catatan, latitude, longitude, created_at").eq("pengiriman_id", pengirimanId).order("created_at", { ascending: false }),
    ]);
    if (deliveryError || !delivery || delivery.petugas_id !== user.id) {
      Alerts("Pengiriman ini tidak ditugaskan kepada Anda.", "error");
      router.back();
      return;
    }
    if (locationsError) console.warn(locationsError.message);
    setShipment(delivery);
    setHistory(locations ?? []);
    const last = locations?.[0];
    if (last?.latitude != null && last?.longitude != null) setCoordinates({ latitude: Number(last.latitude), longitude: Number(last.longitude) });
    setLoading(false);
  }, [pengirimanId, user]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save() {
    if (!kota.trim() || !dropPoint.trim() || !status) {
      Alerts("Kota, drop point, dan status wajib diisi.", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("record_pengiriman_lokasi", {
      p_pengiriman_id: pengirimanId,
      p_latitude: coordinates.latitude,
      p_longitude: coordinates.longitude,
      p_kota: kota,
      p_drop_point: dropPoint,
      p_status: status,
      p_catatan: catatan || null,
    });
    setSaving(false);
    if (error) {
      Alerts(error.message, "error");
      return;
    }
    Alerts("Pembaruan lokasi telah ditambahkan ke riwayat perjalanan paket.", "success");
    setKota(""); setDropPoint(""); setCatatan("");
    await load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={iconColor} /><ThemedText>Memuat pengiriman...</ThemedText></View>;
  const last = history[0];
  return <>
    <Stack.Screen options={{ title: "Update Lokasi Paket" }} />
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText style={styles.title}>Pengiriman {shipment?.mawam_orders?.invoice ? `#${shipment.mawam_orders.invoice}` : ""}</ThemedText>
        <ThemedText style={styles.muted}>{shipment?.courier_name ?? shipment?.courier_code ?? "Kurir"} • {shipment?.tracking_number ?? "Tanpa resi"}</ThemedText>
        <ThemedText style={styles.muted}>Lokasi terakhir: {last ? `${last.drop_point}, ${last.kota}` : "Belum ada riwayat"}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText style={styles.label}>Pin drop point</ThemedText>
        <View style={styles.map}>
          <View style={styles.map}>
            <MapPicker
              initialLocation={coordinates}
              requestInitialLocation={false}
              showUserLocation={false}
              popup={popup}
              onLocationChange={(latitude, longitude) =>
                setCoordinates({ latitude, longitude })
              }
            />
          </View>
        </View>
        <ThemedText style={styles.hint}>Ketuk atau geser pin untuk menentukan drop point. Pin ini tidak melacak kurir secara realtime.</ThemedText>

        <ThemedText style={styles.label}>Kota</ThemedText>
        <ThemedInput
          value={kota}
          onChangeText={setKota}
          style={styles.input}
          placeholder="SoE"
          placeholderTextColor="#888"
        />

        <ThemedText style={styles.label}>Drop point</ThemedText>
        <ThemedInput
          value={dropPoint}
          onChangeText={setDropPoint}
          style={styles.input}
          placeholder="Drop Point SoE"
          placeholderTextColor="#888"
        />
        <ThemedText style={styles.label}>Status perjalanan</ThemedText>
        <View style={styles.statuses}>{STATUS_PERJALANAN.map((item) => <TouchableOpacity key={item} onPress={() => {
          setStatus(item);
        }} style={[styles.statusOption, status === item && styles.statusSelected]}><ThemedText style={status === item ? styles.statusSelectedText : undefined}>{item}</ThemedText></TouchableOpacity>)}</View>
        <ThemedText style={styles.label}>Catatan</ThemedText>
        <ThemedInput value={catatan} onChangeText={setCatatan} style={[styles.input, styles.note]} multiline placeholder="Paket sudah diterima di drop point" placeholderTextColor="#888" />
        <TouchableOpacity style={styles.button} onPress={() => void save()} disabled={saving}><ThemedText style={styles.buttonText}>{saving ? "Menyimpan..." : "UPDATE LOKASI"}</ThemedText></TouchableOpacity>
      </ThemedView>
    </ScrollView>
  </>;
}


