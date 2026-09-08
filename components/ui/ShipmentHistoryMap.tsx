import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type LocationHistory = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  kota?: string | null;
  drop_point?: string | null;
  status?: string | null;
  catatan?: string | null;
  created_at?: string | null;
};

const DEFAULT_CENTER: [number, number] = [-10.1772, 123.607];

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [30, 30], maxZoom: 15 });
    }
  }, [map, positions]);

  return null;
}

export default function ShipmentHistoryMap({ locations }: { locations: LocationHistory[] }) {
  const validLocations = locations.filter(
    (item) =>
      item.latitude != null &&
      item.longitude != null &&
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude))
  );

  // Jangan tampilkan peta jika belum ada satu pun koordinat perjalanan.
  if (validLocations.length === 0) return null;

  const positions = validLocations.map(
    (item) => [Number(item.latitude), Number(item.longitude)] as [number, number]
  );

  return (
    <View style={styles.container}>
      <MapContainer
        center={positions[positions.length - 1] ?? DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom
        style={styles.map as any}
      >
        <TileLayer
          attribution="&copy; x.code"
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        <FitRoute positions={positions} />

        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ weight: 5, opacity: 0.85 }} />
        )}

        {validLocations.map((location, index) => (
          <Marker key={String(location.id)} position={positions[index]}>
            <Popup>
              <div>
                <strong>{location.drop_point || "Lokasi pengiriman"}</strong>
                {location.kota ? <div>{location.kota}</div> : null}
                {location.status ? <div>{location.status}</div> : null}
                {location.created_at ? <div>{new Date(location.created_at).toLocaleString("id-ID")}</div> : null}
                {location.catatan ? <div>{location.catatan}</div> : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: "100%",
    height: 320,
    overflow: "hidden",
    borderRadius: 12,
    position: "relative",
  },
  map: {
    width: "100%",
    height: 320,
    borderRadius: 12,
  },
});
