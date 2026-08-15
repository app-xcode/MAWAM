import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

// Fix icon
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  latitude?: number;
  longitude?: number;
  popup?: any;
  onLocationChange?: (lat: number, lng: number) => void;
};

const latdef = -10.159890491789517;
const lngdef = 123.62356804311275;

function DraggableMarker({
  latitude,
  longitude,
  popup,
  onLocationChange,
}: Props) {
  const markerRef = useRef<L.Marker>(null);
  const [position, setPosition] = useState<[number, number]>([
    latitude ?? latdef,
    longitude ?? lngdef,
  ]);

  useEffect(() => {
    if (popup) {
      markerRef.current?.openPopup();
    }
  }, [popup]);

  useEffect(() => {
    if (latitude != null && longitude != null) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  useMapEvents({
    click(e) {
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(pos);
      onLocationChange?.(pos[0], pos[1]);
    },
  });

  return (
    <Marker
      ref={markerRef}
      draggable
      // position={position}
      position={[latitude ?? latdef, longitude ?? lngdef]}
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          setPosition([lat, lng]);
          onLocationChange?.(lat, lng);
        },
      }}
    >
      <Popup>
        <div>
          <div>
            <b>
              {popup?.name}
            </b>
            <br/>{popup?.code??''}
            </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${popup?.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
             Lihat Lokasi
          </a>
        </div>
      </Popup>
    </Marker>
  );
}

function ChangeView({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  const prev = useRef({ latitude, longitude });

  useEffect(() => {
    if (
      prev.current.latitude !== latitude ||
      prev.current.longitude !== longitude
    ) {
      map.flyTo([latitude, longitude], map.getZoom(),{duration:1});

      prev.current = { latitude, longitude };
    }
  }, [latitude, longitude]);

  return null;
}

export default function LeafletMap({
  latitude,
  longitude,
  popup,
  onLocationChange,
}: Props) {

  return (
    <MapContainer
      center={[latitude ?? latdef, longitude ?? lngdef]}
      zoom={16}
      style={{
        width: "100%",
        height: 300,
        borderRadius: 12,
        border:'solid 1px #6d6d6d6e'
      }}
    >
      <TileLayer
        attribution="&copy; x.code"
        url="http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
        subdomains={["mt0", "mt1", "mt2", "mt3"]}
        maxZoom={25}
      />

      <ChangeView
        latitude={latitude ?? latdef}
        longitude={longitude ?? lngdef}
      />

      <DraggableMarker
        latitude={latitude}
        longitude={longitude}
        popup={popup}
        onLocationChange={onLocationChange}
      />
    </MapContainer>
  );
}