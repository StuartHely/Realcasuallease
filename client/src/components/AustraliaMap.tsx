import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MapView } from "@/components/Map";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

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

export default function AustraliaMap({ centres }: AustraliaMapProps) {
  const [, setLocation] = useLocation();
  const [hoveredCentre, setHoveredCentre] = useState<Centre | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerClustererRef = useRef<any>(null);

  // Check if any centres have valid coordinates
  const validCentres = centres.filter(
    (c) => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
  );

  // Show placeholder if no coordinates
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

  const handleMapReady = async (map: google.maps.Map) => {
    // validCentres already filtered above

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.map = null);
    markersRef.current = [];

    // Create info window
    const infoWindowInstance = new google.maps.InfoWindow();
    setInfoWindow(infoWindowInstance);

    // Create markers for each centre
    const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    
    const markers = validCentres.map((centre) => {
      const lat = parseFloat(centre.latitude!);
      const lng = parseFloat(centre.longitude!);

      // Create custom marker element
      const markerDiv = document.createElement("div");
      markerDiv.className = "custom-marker";
      markerDiv.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background-color: #123047;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F7FA" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `;

      markerDiv.addEventListener("mouseenter", () => {
        markerDiv.style.transform = "scale(1.2)";
      });

      markerDiv.addEventListener("mouseleave", () => {
        markerDiv.style.transform = "scale(1)";
      });

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        content: markerDiv,
        title: centre.name,
      });

      // Show info window on hover
      markerDiv.addEventListener("mouseenter", () => {
        const content = `
          <div style="padding: 12px; max-width: 300px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #123047;">
              ${centre.name}
            </h3>
            ${centre.suburb ? `
              <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
                ${[centre.suburb, centre.state].filter(Boolean).join(", ")}
              </p>
            ` : ""}
            ${centre.mapImageUrl ? `
              <img 
                src="${centre.mapImageUrl}" 
                alt="${centre.name} floor plan"
                style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
              />
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

      // Navigate to centre on click
      markerDiv.addEventListener("click", () => {
        setLocation(`/centre/${centre.slug || centre.id}`);
      });

      return marker;
    });

    markersRef.current = markers;

    // Create marker clusterer
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }

    // Custom cluster renderer with navy theme
    const renderer = {
      render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
        // Create cluster marker element
        const clusterDiv = document.createElement('div');
        clusterDiv.className = 'cluster-marker';
        clusterDiv.style.cssText = `
          background-color: #123047;
          color: #F5F7FA;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid #F5F7FA;
        `;
        clusterDiv.textContent = String(count);

        // Create advanced marker for cluster
        const clusterMarker = new AdvancedMarkerElement({
          position,
          content: clusterDiv,
          map,
        });

        // Add click analytics tracking
        clusterDiv.addEventListener('click', () => {
          console.log('Cluster clicked:', {
            count,
            position: { lat: position.lat(), lng: position.lng() },
            zoom: map.getZoom(),
            timestamp: new Date().toISOString(),
          });
          
          // Zoom into cluster
          map.setCenter(position);
          map.setZoom((map.getZoom() || 4) + 2);
        });

        return clusterMarker;
      },
    };

    markerClustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer,
    });

    // Fit bounds to show all markers
    const bounds = new window.google.maps.LatLngBounds();
    validCentres.forEach((centre) => {
      bounds.extend({
        lat: parseFloat(centre.latitude!),
        lng: parseFloat(centre.longitude!),
      });
    });
    map.fitBounds(bounds);

    // Add padding to bounds
    const padding = { top: 50, right: 50, bottom: 50, left: 50 };
    map.fitBounds(bounds, padding);
  };

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
      <MapView
        onMapReady={handleMapReady}
        initialCenter={{ lat: -25.2744, lng: 133.7751 }}
        initialZoom={4}
      />
    </div>
  );
}
