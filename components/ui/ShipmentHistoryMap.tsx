import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";

type LocationHistory = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  kota?: string | null;
  drop_point?: string | null;
};

export default function ShipmentHistoryMap({
  locations,
}: {
  locations: LocationHistory[];
}) {
  const count = locations.filter(
    (item) =>
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude))
  ).length;

  if (!count) return null;

  return (
    <View style={styles.webNotice}>
      <ThemedText>
        Peta riwayat perjalanan tersedia di aplikasi seluler.
        Riwayat lokasi ditampilkan di bawah.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  webNotice: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#8882",
  },
});