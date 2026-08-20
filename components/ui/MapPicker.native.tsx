import React, { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { View, ActivityIndicator } from "react-native";

type Props = {
  onLocationChange?: (lat: number, lng: number) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  requestInitialLocation?: boolean;
  showUserLocation?: boolean;
};

export default function MapPicker({
  onLocationChange,
  initialLocation,
  requestInitialLocation = true,
  showUserLocation = true,
}: Props) {
  const [region, setRegion] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      if (initialLocation) {
        const data = {
          ...initialLocation,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        };

        if (mounted) {
          setRegion(data);
          setMarker(data);
        }

        return;
      }

      if (!requestInitialLocation) return;

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const loc =
        await Location.getCurrentPositionAsync({});

      const data = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      if (!mounted) return;

      setRegion(data);
      setMarker(data);

      onLocationChange?.(
        data.latitude,
        data.longitude
      );
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, [
    initialLocation?.latitude,
    initialLocation?.longitude,
    requestInitialLocation,
  ]);

  if (!region || !marker) {
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
      showsUserLocation={showUserLocation}
      onPress={(e) => {
        const coordinate =
          e.nativeEvent.coordinate;

        setMarker(coordinate);

        onLocationChange?.(
          coordinate.latitude,
          coordinate.longitude
        );
      }}
    >
      <Marker
        coordinate={marker}
        draggable
        onDragEnd={(e) => {
          const coordinate =
            e.nativeEvent.coordinate;

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