import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { MapView } from "@/components/Map";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Component, type ReactNode } from "react";

interface Centre {
  id: number;
  name: string;
  slug: string | null;
  latitude: string | null;
  longitude: string | null;
  suburb: string | null;
  state: string | null;
  mapImageUrl: string | null;
}

interface AustraliaMapProps {
  centres: Centre[];
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
            <p className="text-gray-600 text-sm">{this.state.error}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SILVER_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d6e3" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

const MARKER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><defs><filter id="s" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(26,43,76,0.35)"/></filter></defs><path filter="url(#s)" d="M16 2C8.27 2 2 8.27 2 16c0 10.5 14 24 14 24s14-13.5 14-24C30 8.27 23.73 2 16 2z" fill="#1A2B4C"/><circle cx="16" cy="16" r="5" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`)}`;

function AustraliaMapInner({ centres }: AustraliaMapProps) {
  const [, setLocation] = useLocation();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerClustererRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const validCentres = centres.filter(
    (c) => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
  );

  if (validCentres.length === 0) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Coming Soon</h3>
          <p className="text-gray-600">Centre locations are being added. Please use the state filters above to browse centres.</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
          <p className="text-gray-600 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  const handleMapReady = (map: google.maps.Map) => {
    try {
      // Clear existing markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      const infoWindowInstance = new google.maps.InfoWindow();

      const markers = validCentres.map((centre) => {
        const lat = parseFloat(centre.latitude!);
        const lng = parseFloat(centre.longitude!);

        const marker = new google.maps.Marker({
          map,
          position: { lat, lng },
          title: centre.name,
          icon: {
            url: MARKER_SVG,
            scaledSize: new google.maps.Size(32, 42),
            anchor: new google.maps.Point(16, 42),
          },
          optimized: false,
        });

        marker.addListener("mouseover", () => {
          const content = `
            <div style="padding: 12px; max-width: 300px;">
              <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1A2B4C;">
                ${centre.name}
              </h3>
              ${centre.suburb ? `
                <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
                  ${[centre.suburb, centre.state].filter(Boolean).join(", ")}
                </p>
              ` : ""}
              <button 
                onclick="window.location.href='/centre/${centre.slug || centre.id}'"
                style="
                  background-color: #2563eb;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 6px;
                  border: none;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                  width: 100%;
                "
              >
                View Centre Details
              </button>
            </div>
          `;
          infoWindowInstance.setContent(content);
          infoWindowInstance.open(map, marker);
        });

        marker.addListener("click", () => {
          setLocation(`/centre/${centre.slug || centre.id}`);
        });

        return marker;
      });

      markersRef.current = markers;

      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
      }

      const renderer = {
        render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
          return new google.maps.Marker({
            position,
            map,
            label: {
              text: String(count),
              color: "#FFFFFF",
              fontWeight: "bold",
              fontSize: "14px",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 24,
              fillColor: "#1A2B4C",
              fillOpacity: 1,
              strokeColor: "rgba(255,255,255,0.9)",
              strokeWeight: 2,
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        },
      };

      markerClustererRef.current = new MarkerClusterer({
        map,
        markers,
        renderer,
      });

      const bounds = new window.google.maps.LatLngBounds();
      validCentres.forEach((centre) => {
        bounds.extend({
          lat: parseFloat(centre.latitude!),
          lng: parseFloat(centre.longitude!),
        });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } catch (err: any) {
      console.error("Map initialization error:", err);
      setMapError(err.message || "Failed to initialize map");
    }
  };

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
      <MapView
        onMapReady={handleMapReady}
        initialCenter={{ lat: -25.2744, lng: 133.7751 }}
        initialZoom={4}
        styles={SILVER_MAP_STYLES}
      />
    </div>
  );
}

export default function AustraliaMap(props: AustraliaMapProps) {
  return (
    <MapErrorBoundary>
      <AustraliaMapInner {...props} />
    </MapErrorBoundary>
  );
}
