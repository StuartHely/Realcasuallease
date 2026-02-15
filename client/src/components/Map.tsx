import { useRef, useEffect, useCallback } from "react";
import maplibregl, { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

const AWS_REGION = import.meta.env.VITE_AWS_REGION || "ap-southeast-2";
const MAP_NAME = import.meta.env.VITE_AMAZON_LOCATION_MAP_NAME || "casuallease-map";
const MAP_STYLE_URL = `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${MAP_NAME}/style-descriptor`;

export interface MapViewRef {
  map: MapLibreMap | null;
  addMarker: (options: MarkerOptions) => Marker;
  fitBounds: (bounds: [[number, number], [number, number]], padding?: number) => void;
  setCenter: (lng: number, lat: number) => void;
  setZoom: (zoom: number) => void;
}

export interface MarkerOptions {
  lng: number;
  lat: number;
  color?: string;
  element?: HTMLElement;
  popup?: string;
  onClick?: () => void;
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: MapLibreMap) => void;
  apiKey?: string;
}

export function MapView({
  className,
  initialCenter = { lat: -25.2744, lng: 133.7751 },
  initialZoom = 4,
  onMapReady,
  apiKey,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);

  const initMap = useCallback(async () => {
    if (!mapContainer.current || map.current) return;

    const key = apiKey || import.meta.env.VITE_AMAZON_LOCATION_API_KEY;
    const styleUrl = key ? `${MAP_STYLE_URL}?key=${key}` : MAP_STYLE_URL;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
    });

    map.current.addControl(new NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady, apiKey]);

  useEffect(() => {
    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initMap]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}

export function createMarker(
  map: MapLibreMap,
  options: MarkerOptions
): Marker {
  const marker = new Marker({
    color: options.color,
    element: options.element,
  })
    .setLngLat([options.lng, options.lat])
    .addTo(map);

  if (options.popup) {
    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(options.popup);
    marker.setPopup(popup);
  }

  if (options.onClick) {
    marker.getElement().addEventListener("click", options.onClick);
  }

  return marker;
}

export function fitMapBounds(
  map: MapLibreMap,
  points: { lat: number; lng: number }[],
  padding = 50
): void {
  if (points.length === 0) return;

  const bounds = new maplibregl.LngLatBounds();
  points.forEach((point) => {
    bounds.extend([point.lng, point.lat]);
  });

  map.fitBounds(bounds, { padding });
}
