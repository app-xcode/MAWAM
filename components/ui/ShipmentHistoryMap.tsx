import React, { useEffect, useMemo, useState } from "react";
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

type LatLng = [number, number];

function FitRoute({ positions }: { positions: LatLng[] }) {
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
  const validLocations = useMemo(
    () =>
      locations.filter(
        (item) =>
          item.latitude != null &&
          item.longitude != null &&
          Number.isFinite(Number(item.latitude)) &&
          Number.isFinite(Number(item.longitude))
      ),
    [locations]
  );

  if (validLocations.length === 0) return null;

  const positions = validLocations.map(
    (item) => [Number(item.latitude), Number(item.longitude)] as LatLng
  );

  return <ShipmentRoadMap locations={validLocations} positions={positions} />;
}

function ShipmentRoadMap({
  locations,
  positions,
}: {
  locations: LocationHistory[];
  positions: LatLng[];
}) {
  const [route, setRoute] = useState<LatLng[]>([]);
  const [routeError, setRouteError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      setRouteError(false);
      setRoute([]);

      if (positions.length < 2) return;

      try {
        const coordinates = positions
          .map(([latitude, longitude]) => `${longitude},${latitude}`)
          .join(";");

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`
        );

        if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);

        const data = await response.json();
        const geometry = data?.routes?.[0]?.geometry?.coordinates;

        if (!Array.isArray(geometry) || geometry.length < 2) {
          throw new Error("Rute jalan tidak tersedia");
        }

        const roadRoute = geometry
          .filter(
            (point: unknown) =>
              Array.isArray(point) &&
              point.length >= 2 &&
              Number.isFinite(Number(point[0])) &&
              Number.isFinite(Number(point[1]))
          )
          .map((point: [number, number]) => [Number(point[1]), Number(point[0])] as LatLng);

        if (!cancelled) setRoute(roadRoute);
      } catch (error) {
        console.warn("Shipment route error:", error);
        if (!cancelled) setRouteError(true);
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [positions]);

  const displayedRoute = route.length > 1 ? route : positions;

  return (
    <View style={styles.container}>
      <MapContainer
        center={positions[positions.length - 1]}
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

        <FitRoute positions={displayedRoute} />

        {positions.length > 1 && (
          <Polyline
            positions={displayedRoute}
            pathOptions={{
              weight: 5,
              opacity: route.length > 1 ? 0.9 : 0.65,
              ...(route.length < 2 && routeError ? { dashArray: "8 8" } : {}),
            }}
          />
        )}

        {locations.map((location, index) => {
          // Lokasi pertama = 0.3, lokasi terakhir = 1.
          // Titik di antaranya mendapatkan opacity bertahap sesuai urutan perjalanan.
          const opacity =
            locations.length === 1
              ? 1
              : 0.3 + (index / (locations.length - 1)) * 0.7;

          return (
            <Marker
              key={String(location.id)}
              position={positions[index]}
              opacity={opacity}
            >
              <Popup>
                <div>
                  <strong>{location.drop_point || "Lokasi pengiriman"}</strong>
                  {location.kota ? <div>{location.kota}</div> : null}
                  {location.status ? <div>{location.status}</div> : null}
                  {location.created_at ? (
                    <div>{new Date(location.created_at).toLocaleString("id-ID")}</div>
                  ) : null}
                  {location.catatan ? <div>{location.catatan}</div> : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {positions.length > 1 && !routeError && route.length < 2 && (
        <View pointerEvents="none" style={styles.routeBadge}>
          <View style={styles.badge}>
            <span style={{ fontSize: 12 }}>Menghitung rute perjalanan...</span>
          </View>
        </View>
      )}

      {routeError && positions.length > 1 && (
        <View pointerEvents="none" style={styles.routeBadge}>
          <View style={styles.badge}>
            <span style={{ fontSize: 12 }}>Rute jalan tidak tersedia</span>
          </View>
        </View>
      )}
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
  routeBadge: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffffffdd",
  },
});
