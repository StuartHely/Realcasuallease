import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "wouter";
import maplibregl, { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";

const AWS_REGION = import.meta.env.VITE_AWS_REGION || "ap-southeast-2";
const MAP_NAME = import.meta.env.VITE_AMAZON_LOCATION_MAP_NAME || "casuallease-map";
const MAP_STYLE_URL = `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${MAP_NAME}/style-descriptor`;

interface Centre {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  suburb: string | null;
  state: string | null;
  mapImageUrl: string | null;
}

interface AustraliaMapProps {
  centres: Centre[];
}

type PointFeature = GeoJSON.Feature<GeoJSON.Point, { id: number; name: string; suburb: string | null; state: string | null; mapImageUrl: string | null }>;

export default function AustraliaMap({ centres }: AustraliaMapProps) {
  const [, setLocation] = useLocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clusterIndexRef = useRef<Supercluster | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const validCentres = centres.filter(
    (c) => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
  );

  const updateMarkers = useCallback(() => {
    if (!map.current || !clusterIndexRef.current || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = map.current.getBounds();
    const zoom = Math.floor(map.current.getZoom());

    const clusters = clusterIndexRef.current.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    );

    clusters.forEach((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;

      if (isCluster) {
        const count = cluster.properties.point_count;
        const el = document.createElement("div");
        el.className = "cluster-marker";
        el.style.cssText = `
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
        el.textContent = String(count);

        el.addEventListener("click", () => {
          const expansionZoom = clusterIndexRef.current!.getClusterExpansionZoom(
            cluster.properties.cluster_id
          );
          map.current!.easeTo({
            center: [lng, lat],
            zoom: expansionZoom,
          });
        });

        const marker = new Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      } else {
        const props = cluster.properties as PointFeature["properties"];
        const el = document.createElement("div");
        el.style.cssText = `
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
        `;
        el.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F7FA" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        `;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        const popupContent = `
          <div style="padding: 12px; max-width: 300px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #123047;">
              ${props.name}
            </h3>
            ${props.suburb ? `
              <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
                ${[props.suburb, props.state].filter(Boolean).join(", ")}
              </p>
            ` : ""}
            ${props.mapImageUrl ? `
              <img 
                src="${props.mapImageUrl}" 
                alt="${props.name} floor plan"
                style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
              />
            ` : ""}
            <button 
              onclick="window.location.href='/centre/${props.id}'"
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

        const popup = new Popup({ offset: 25, closeButton: true }).setHTML(popupContent);

        const marker = new Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setLocation(`/centre/${props.id}`);
        });

        markersRef.current.push(marker);
      }
    });
  }, [mapLoaded, setLocation]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const apiKey = import.meta.env.VITE_AMAZON_LOCATION_API_KEY;
    const styleUrl = apiKey ? `${MAP_STYLE_URL}?key=${apiKey}` : MAP_STYLE_URL;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [133.7751, -25.2744],
      zoom: 4,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || validCentres.length === 0) return;

    const features: PointFeature[] = validCentres.map((centre) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [parseFloat(centre.longitude!), parseFloat(centre.latitude!)],
      },
      properties: {
        id: centre.id,
        name: centre.name,
        suburb: centre.suburb,
        state: centre.state,
        mapImageUrl: centre.mapImageUrl,
      },
    }));

    clusterIndexRef.current = new Supercluster({
      radius: 60,
      maxZoom: 16,
    });
    clusterIndexRef.current.load(features);

    updateMarkers();

    map.current?.on("moveend", updateMarkers);
    map.current?.on("zoomend", updateMarkers);

    if (validCentres.length > 0 && map.current) {
      const bounds = new maplibregl.LngLatBounds();
      validCentres.forEach((centre) => {
        bounds.extend([parseFloat(centre.longitude!), parseFloat(centre.latitude!)]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      map.current?.off("moveend", updateMarkers);
      map.current?.off("zoomend", updateMarkers);
    };
  }, [mapLoaded, validCentres, updateMarkers]);

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

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
