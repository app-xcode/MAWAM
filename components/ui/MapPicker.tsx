import React from "react";
import { View } from "react-native";
import LeafletMap from "@/components/ui/LeafletMap";

type MapPickerProps = {
  onLocationChange?: (latitude: number, longitude: number) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  requestInitialLocation?: boolean;
  showUserLocation?: boolean;
  popup?: string;
};

export default function MapPicker({
  onLocationChange,
  initialLocation,
  popup = "Pilih lokasi",
}: MapPickerProps) {
  return (
    <View style={{ flex: 1 }}>
      <LeafletMap
        latitude={initialLocation?.latitude ?? -10.1772}
        longitude={initialLocation?.longitude ?? 123.607}
        popup={popup}
        onLocationChange={onLocationChange}
      />
    </View>
  );
}