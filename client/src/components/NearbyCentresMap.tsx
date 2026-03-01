import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/Map";
import { Navigation, X } from "lucide-react";

interface NearbyCentresMapProps {
  centreId: number;
  centreName: string;
  centreLatitude: string;
  centreLongitude: string;
  radiusKm?: number;
}

export function NearbyCentresMap({ 
  centreId, 
  centreName, 
  centreLatitude,
  centreLongitude,
  radiusKm = 10 
}: NearbyCentresMapProps) {
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  const { data: nearbyCentres, isLoading } = trpc.centres.getNearby.useQuery(
    { centreId, radiusKm },
    { enabled: showMap }
  );

  const centerLat = parseFloat(centreLatitude);
  const centerLng = parseFloat(centreLongitude);

  useEffect(() => {
    if (!showMap || !mapRef.current || !nearbyCentres) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    // Close existing info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    // Create info window (reuse for all markers)
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Add marker for current centre (blue)
    const currentCentreMarker = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: { lat: centerLat, lng: centerLng },
      title: `${centreName} (Current Location)`,
    });

    // Create custom content for current centre marker
    const currentContent = document.createElement("div");
    currentContent.innerHTML = `
      <div style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 20px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
        📍 You are here
      </div>
    `;
    currentCentreMarker.content = currentContent;

    currentCentreMarker.addListener("click", () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(`
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="font-weight: 600; margin-bottom: 4px; color: #1e40af;">${centreName}</h3>
            <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">Current Location</p>
          </div>
        `);
        infoWindowRef.current.open(mapRef.current, currentCentreMarker);
      }
    });

    markersRef.current.push(currentCentreMarker);

    // Add markers for nearby centres (red)
    nearbyCentres.forEach((centre) => {
      if (!centre.latitude || !centre.longitude) return;

      const lat = parseFloat(centre.latitude);
      const lng = parseFloat(centre.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat, lng },
        title: centre.name,
      });

      // Create custom content for nearby centre marker
      const markerContent = document.createElement("div");
      markerContent.innerHTML = `
        <div style="background: #dc2626; color: white; padding: 6px 10px; border-radius: 16px; font-weight: 500; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          ${centre.distance}km
        </div>
      `;
      marker.content = markerContent;

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${centerLat},${centerLng}&destination=${lat},${lng}`;
          
          infoWindowRef.current.setContent(`
            <div style="padding: 8px; max-width: 250px;">
              <h3 style="font-weight: 600; margin-bottom: 4px; color: #1e40af;">${centre.name}</h3>
              <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">${centre.address || 'Address not available'}</p>
              <p style="font-size: 13px; font-weight: 500; color: #dc2626; margin: 8px 0 4px 0;">${centre.distance}km away</p>
              <a 
                href="${directionsUrl}" 
                target="_blank" 
                rel="noopener noreferrer"
                style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;"
              >
                Get Directions →
              </a>
              <a 
                href="/centre/${centre.slug || centre.id}" 
                style="display: inline-block; margin-top: 4px; margin-left: 8px; padding: 6px 12px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;"
              >
                View Centre
              </a>
            </div>
          `);
          infoWindowRef.current.open(mapRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (nearbyCentres.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: centerLat, lng: centerLng });
      nearbyCentres.forEach((centre) => {
        if (centre.latitude && centre.longitude) {
          const lat = parseFloat(centre.latitude);
          const lng = parseFloat(centre.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            bounds.extend({ lat, lng });
          }
        }
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [showMap, nearbyCentres, centerLat, centerLng, centreName, centreId]);

  if (!showMap) {
    return (
      <div className="flex justify-center">
        <Button
          onClick={() => setShowMap(true)}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Navigation className="h-4 w-4" />
          Show Nearby Centres on Map (within {radiusKm}km)
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nearby Centres Map</CardTitle>
          <CardDescription>Loading map...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!nearbyCentres || nearbyCentres.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nearby Centres Map</CardTitle>
              <CardDescription>
                No other shopping centres found within {radiusKm}km of {centreName}.
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowMap(false)}
              variant="ghost"
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nearby Centres Map</CardTitle>
            <CardDescription>
              {nearbyCentres.length} shopping centre{nearbyCentres.length !== 1 ? 's' : ''} within {radiusKm}km of {centreName}
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowMap(false)}
            variant="ghost"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
          <MapView
            initialCenter={{ lat: centerLat, lng: centerLng }}
            initialZoom={12}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
          />
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              📍
            </div>
            <span>Current Centre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              km
            </div>
            <span>Nearby Centres</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
