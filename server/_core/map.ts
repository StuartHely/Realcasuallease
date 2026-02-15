/**
 * Amazon Location Service Integration
 * 
 * Provides geocoding, reverse geocoding, places autocomplete, and directions
 * using AWS Location Service instead of Google Maps.
 */

import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForPositionCommand,
  SearchPlaceIndexForSuggestionsCommand,
  CalculateRouteCommand,
  type SearchPlaceIndexForTextCommandOutput,
  type SearchPlaceIndexForPositionCommandOutput,
  type SearchPlaceIndexForSuggestionsCommandOutput,
  type CalculateRouteCommandOutput,
} from "@aws-sdk/client-location";
import { ENV } from "./env";

// ============================================================================
// Configuration
// ============================================================================

let locationClient: LocationClient | null = null;

function getLocationClient(): LocationClient {
  if (!locationClient) {
    if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey) {
      throw new Error(
        "AWS credentials missing: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
      );
    }

    locationClient = new LocationClient({
      region: ENV.awsRegion,
      credentials: {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey,
      },
    });
  }

  return locationClient;
}

// ============================================================================
// Type Definitions
// ============================================================================

export type TravelMode = "Car" | "Walking" | "Bicycle" | "Truck";
export type MapType = "roadmap" | "satellite" | "terrain" | "hybrid";
export type SpeedUnit = "KPH" | "MPH";

export type LatLng = {
  lat: number;
  lng: number;
};

export type GeocodingResult = {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: LatLng;
      location_type: string;
      viewport: {
        northeast: LatLng;
        southwest: LatLng;
      };
    };
    place_id: string;
    types: string[];
  }>;
  status: string;
};

export type DirectionsResult = {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      start_location: LatLng;
      end_location: LatLng;
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        travel_mode: string;
        start_location: LatLng;
        end_location: LatLng;
      }>;
    }>;
    overview_polyline: { points: string };
    summary: string;
    warnings: string[];
    waypoint_order: number[];
  }>;
  status: string;
};

export type PlacesAutocompleteResult = {
  predictions: Array<{
    description: string;
    place_id: string;
  }>;
  status: string;
};

// ============================================================================
// Geocoding - Address to Coordinates
// ============================================================================

export async function geocode(address: string): Promise<GeocodingResult> {
  const client = getLocationClient();
  
  const command = new SearchPlaceIndexForTextCommand({
    IndexName: ENV.amazonLocationPlaceIndex,
    Text: address,
    MaxResults: 5,
  });

  const response: SearchPlaceIndexForTextCommandOutput = await client.send(command);
  
  const results = (response.Results || []).map((result) => {
    const place = result.Place;
    const position = place?.Geometry?.Point || [0, 0];
    
    return {
      address_components: buildAddressComponents(place),
      formatted_address: place?.Label || "",
      geometry: {
        location: {
          lat: position[1],
          lng: position[0],
        },
        location_type: "ROOFTOP",
        viewport: {
          northeast: { lat: position[1] + 0.01, lng: position[0] + 0.01 },
          southwest: { lat: position[1] - 0.01, lng: position[0] - 0.01 },
        },
      },
      place_id: result.PlaceId || "",
      types: place?.Categories || [],
    };
  });

  return {
    results,
    status: results.length > 0 ? "OK" : "ZERO_RESULTS",
  };
}

// ============================================================================
// Reverse Geocoding - Coordinates to Address
// ============================================================================

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  const client = getLocationClient();
  
  const command = new SearchPlaceIndexForPositionCommand({
    IndexName: ENV.amazonLocationPlaceIndex,
    Position: [lng, lat],
    MaxResults: 5,
  });

  const response: SearchPlaceIndexForPositionCommandOutput = await client.send(command);
  
  const results = (response.Results || []).map((result) => {
    const place = result.Place;
    const position = place?.Geometry?.Point || [lng, lat];
    
    return {
      address_components: buildAddressComponents(place),
      formatted_address: place?.Label || "",
      geometry: {
        location: {
          lat: position[1],
          lng: position[0],
        },
        location_type: "ROOFTOP",
        viewport: {
          northeast: { lat: position[1] + 0.01, lng: position[0] + 0.01 },
          southwest: { lat: position[1] - 0.01, lng: position[0] - 0.01 },
        },
      },
      place_id: result.PlaceId || "",
      types: place?.Categories || [],
    };
  });

  return {
    results,
    status: results.length > 0 ? "OK" : "ZERO_RESULTS",
  };
}

// ============================================================================
// Places Autocomplete - Search Suggestions
// ============================================================================

export async function placesAutocomplete(
  input: string,
  options?: { biasPosition?: [number, number]; maxResults?: number }
): Promise<PlacesAutocompleteResult> {
  const client = getLocationClient();
  
  const command = new SearchPlaceIndexForSuggestionsCommand({
    IndexName: ENV.amazonLocationPlaceIndex,
    Text: input,
    MaxResults: options?.maxResults ?? 5,
    BiasPosition: options?.biasPosition,
  });

  const response: SearchPlaceIndexForSuggestionsCommandOutput = await client.send(command);
  
  const predictions = (response.Results || []).map((result) => ({
    description: result.Text || "",
    place_id: result.PlaceId || "",
  }));

  return {
    predictions,
    status: predictions.length > 0 ? "OK" : "ZERO_RESULTS",
  };
}

// ============================================================================
// Directions - Calculate Route
// ============================================================================

export async function getDirections(
  origin: LatLng,
  destination: LatLng,
  options?: { travelMode?: TravelMode; waypoints?: LatLng[] }
): Promise<DirectionsResult> {
  const client = getLocationClient();
  
  const waypointPositions = options?.waypoints?.map((wp) => [wp.lng, wp.lat]) || [];
  
  const command = new CalculateRouteCommand({
    CalculatorName: ENV.amazonLocationRouteCalculator,
    DeparturePosition: [origin.lng, origin.lat],
    DestinationPosition: [destination.lng, destination.lat],
    WaypointPositions: waypointPositions.length > 0 ? waypointPositions : undefined,
    TravelMode: options?.travelMode || "Car",
    IncludeLegGeometry: true,
  });

  const response: CalculateRouteCommandOutput = await client.send(command);
  
  const legs = (response.Legs || []).map((leg) => {
    const distanceMeters = (leg.Distance || 0) * 1000;
    const durationSeconds = leg.DurationSeconds || 0;
    const startPosition = leg.StartPosition || [0, 0];
    const endPosition = leg.EndPosition || [0, 0];
    
    const steps = (leg.Steps || []).map((step) => {
      const stepDistanceMeters = (step.Distance || 0) * 1000;
      const stepDurationSeconds = step.DurationSeconds || 0;
      const stepStartPosition = step.StartPosition || [0, 0];
      const stepEndPosition = step.EndPosition || [0, 0];
      
      return {
        distance: {
          text: formatDistance(stepDistanceMeters),
          value: stepDistanceMeters,
        },
        duration: {
          text: formatDuration(stepDurationSeconds),
          value: stepDurationSeconds,
        },
        html_instructions: "",
        travel_mode: options?.travelMode || "Car",
        start_location: { lat: stepStartPosition[1], lng: stepStartPosition[0] },
        end_location: { lat: stepEndPosition[1], lng: stepEndPosition[0] },
      };
    });

    return {
      distance: {
        text: formatDistance(distanceMeters),
        value: distanceMeters,
      },
      duration: {
        text: formatDuration(durationSeconds),
        value: durationSeconds,
      },
      start_address: "",
      end_address: "",
      start_location: { lat: startPosition[1], lng: startPosition[0] },
      end_location: { lat: endPosition[1], lng: endPosition[0] },
      steps,
    };
  });

  const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
  const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value, 0);

  return {
    routes: legs.length > 0 ? [{
      legs,
      overview_polyline: { points: "" },
      summary: `${formatDistance(totalDistance)}, ${formatDuration(totalDuration)}`,
      warnings: [],
      waypoint_order: options?.waypoints?.map((_, i) => i) || [],
    }] : [],
    status: legs.length > 0 ? "OK" : "ZERO_RESULTS",
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildAddressComponents(place: {
  AddressNumber?: string;
  Street?: string;
  Neighborhood?: string;
  Municipality?: string;
  SubRegion?: string;
  Region?: string;
  Country?: string;
  PostalCode?: string;
} | undefined): Array<{ long_name: string; short_name: string; types: string[] }> {
  const components: Array<{ long_name: string; short_name: string; types: string[] }> = [];
  
  if (place?.AddressNumber) {
    components.push({ long_name: place.AddressNumber, short_name: place.AddressNumber, types: ["street_number"] });
  }
  if (place?.Street) {
    components.push({ long_name: place.Street, short_name: place.Street, types: ["route"] });
  }
  if (place?.Neighborhood) {
    components.push({ long_name: place.Neighborhood, short_name: place.Neighborhood, types: ["neighborhood"] });
  }
  if (place?.Municipality) {
    components.push({ long_name: place.Municipality, short_name: place.Municipality, types: ["locality"] });
  }
  if (place?.SubRegion) {
    components.push({ long_name: place.SubRegion, short_name: place.SubRegion, types: ["administrative_area_level_2"] });
  }
  if (place?.Region) {
    components.push({ long_name: place.Region, short_name: place.Region, types: ["administrative_area_level_1"] });
  }
  if (place?.Country) {
    components.push({ long_name: place.Country, short_name: place.Country, types: ["country"] });
  }
  if (place?.PostalCode) {
    components.push({ long_name: place.PostalCode, short_name: place.PostalCode, types: ["postal_code"] });
  }
  
  return components;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} secs`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} mins`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ${mins} mins`;
}
