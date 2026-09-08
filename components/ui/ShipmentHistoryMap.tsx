import React from "react";
import { View } from "react-native";

type LocationHistory = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

export default function ShipmentHistoryMap({
  locations,
}: {
  locations: LocationHistory[];
}) {
  // Peta riwayat perjalanan hanya dirender pada web melalui
  // ShipmentHistoryMap.web.tsx. Pada native, komponen ini tidak menampilkan apa pun.
  return <View />;
}
