import React, { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { View, ActivityIndicator } from "react-native";

type Props = {
  onLocationChange?: (lat: number, lng: number) => void;
};

export default function MapPicker({ onLocationChange }: Props) {
  const [region, setRegion] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});

      const data = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setRegion(data);
      setMarker(data);

      onLocationChange?.(data.latitude, data.longitude);
    })();
  }, []);

  if (!region) {
    return (
      <View
        style={{
          height: 300,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <MapView
      style={{ flex: 1 }}
      region={region}
      onRegionChangeComplete={setRegion}
      showsUserLocation
    >
      <Marker
        coordinate={marker}
        draggable
        onDragEnd={(e) => {
          const coordinate = e.nativeEvent.coordinate;
          setMarker(coordinate);
          onLocationChange?.(
            coordinate.latitude,
            coordinate.longitude
          );
        }}
      />
    </MapView>
  );
}