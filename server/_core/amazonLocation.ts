import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForSuggestionsCommand,
  GetPlaceCommand,
} from "@aws-sdk/client-location";
import { ENV } from "./env";

const client = new LocationClient({
  region: ENV.awsRegion,
  credentials: {
    accessKeyId: ENV.awsAccessKeyId,
    secretAccessKey: ENV.awsSecretAccessKey,
  },
});

export interface AddressComponents {
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceSuggestion {
  placeId: string;
  text: string;
  description?: string;
}

export interface PlaceDetails {
  placeId: string;
  label: string;
  addressComponents: AddressComponents;
}

export async function searchPlaces(
  text: string,
  options?: { maxResults?: number; biasPosition?: [number, number] }
): Promise<PlaceDetails[]> {
  const command = new SearchPlaceIndexForTextCommand({
    IndexName: ENV.amazonLocationPlaceIndex,
    Text: text,
    MaxResults: options?.maxResults ?? 5,
    FilterCountries: ["AUS"],
    BiasPosition: options?.biasPosition,
  });

  const response = await client.send(command);

  return (response.Results ?? []).map((result) => {
    const place = result.Place!;
    return {
      placeId: result.PlaceId ?? "",
      label: place.Label ?? "",
      addressComponents: parseAddressComponents(place),
    };
  });
}

export async function getPlaceSuggestions(
  text: string,
  options?: { maxResults?: number; biasPosition?: [number, number] }
): Promise<PlaceSuggestion[]> {
  const command = new SearchPlaceIndexForSuggestionsCommand({
    IndexName: ENV.amazonLocationPlaceIndex,
    Text: text,
    MaxResults: options?.maxResults ?? 5,
    FilterCountries: ["AUS"],
    BiasPosition: options?.biasPosition,
  });

  const response = await client.send(command);

  return (response.Results ?? []).map((result) => ({
    placeId: result.PlaceId ?? "",
    text: result.Text ?? "",
    description: result.Text,
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const command = new GetPlaceCommand({
    IndexName: ENV.amazonLocationPlaceIndex,
    PlaceId: placeId,
  });

  const response = await client.send(command);
  const place = response.Place;

  if (!place) {
    return null;
  }

  return {
    placeId,
    label: place.Label ?? "",
    addressComponents: parseAddressComponents(place),
  };
}

function parseAddressComponents(place: {
  AddressNumber?: string;
  Street?: string;
  Municipality?: string;
  SubRegion?: string;
  Region?: string;
  PostalCode?: string;
  Geometry?: { Point?: number[] };
}): AddressComponents {
  const streetAddress = [place.AddressNumber, place.Street]
    .filter(Boolean)
    .join(" ");

  return {
    streetAddress,
    suburb: place.Municipality ?? place.SubRegion ?? "",
    state: mapRegionToState(place.Region ?? ""),
    postcode: place.PostalCode ?? "",
    latitude: place.Geometry?.Point?.[1],
    longitude: place.Geometry?.Point?.[0],
  };
}

function mapRegionToState(region: string): string {
  const regionMap: Record<string, string> = {
    "New South Wales": "NSW",
    "Victoria": "VIC",
    "Queensland": "QLD",
    "Western Australia": "WA",
    "South Australia": "SA",
    "Tasmania": "TAS",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
  };
  return regionMap[region] ?? region;
}
