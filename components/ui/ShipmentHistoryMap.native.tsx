import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Colors } from '@/constants/theme';
import { useTheme } from '@/utils/theme';

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
  const { isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const coordinates = locations
    .filter(
      (item) =>
        Number.isFinite(Number(item.latitude)) &&
        Number.isFinite(Number(item.longitude))
    )
    .map((item) => ({
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      title: item.drop_point || item.kota || "Drop point",
    }));

  if (!coordinates.length) return null;

  const first = coordinates[0];

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 1.2,
        longitudeDelta: 1.2,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      {coordinates.map((coordinate, index) => (
        <Marker
          key={`${locations[index]?.id}-${index}`}
          coordinate={{
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          }}
          title={coordinate.title}
        />
      ))}

      {coordinates.length > 1 && (
        <Polyline
          coordinates={coordinates}
          strokeColor={Colors[colorScheme].accent}
          strokeWidth={3}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 210,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 12,
  },
});