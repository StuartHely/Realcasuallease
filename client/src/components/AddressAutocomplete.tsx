import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapScriptLoaded = false;
let mapScriptPromise: Promise<void> | null = null;

function loadMapScript() {
  if (mapScriptLoaded && window.google?.maps) {
    return Promise.resolve();
  }
  
  if (mapScriptPromise) {
    return mapScriptPromise;
  }
  
  mapScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src*="${MAPS_PROXY_URL}/maps/api/js"]`);
    if (existingScript) {
      mapScriptLoaded = true;
      resolve();
      return;
    }
    
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=places`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      mapScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      mapScriptPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
  
  return mapScriptPromise;
}

interface AddressComponents {
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (components: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  className,
  id,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadMapScript()
      .then(() => setIsLoaded(true))
      .catch(console.error);
  }, []);

  // Store callbacks in refs to avoid re-initializing autocomplete
  const onChangeRef = useRef(onChange);
  const onAddressSelectRef = useRef(onAddressSelect);
  
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressSelectRef.current = onAddressSelect;
  }, [onChange, onAddressSelect]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    console.log('[AddressAutocomplete] Initializing Google Places Autocomplete');
    
    // Initialize Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" }, // Restrict to Australia
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["address"],
    });

    // Listen for place selection
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      console.log('[AddressAutocomplete] Place changed:', place);
      
      if (!place?.address_components) {
        console.log('[AddressAutocomplete] No address components found');
        return;
      }

      // Parse address components
      let streetNumber = "";
      let route = "";
      let suburb = "";
      let state = "";
      let postcode = "";
      let latitude: number | undefined;
      let longitude: number | undefined;

      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (types.includes("route")) {
          route = component.long_name;
        } else if (types.includes("locality")) {
          suburb = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.short_name; // NSW, VIC, etc.
        } else if (types.includes("postal_code")) {
          postcode = component.long_name;
        }
      }

      if (place.geometry?.location) {
        latitude = place.geometry.location.lat();
        longitude = place.geometry.location.lng();
      }

      const streetAddress = streetNumber ? `${streetNumber} ${route}` : route;
      
      console.log('[AddressAutocomplete] Parsed address:', { streetAddress, suburb, state, postcode });

      // Update the input value
      onChangeRef.current(streetAddress);

      // Notify parent of parsed components
      onAddressSelectRef.current({
        streetAddress,
        suburb,
        state,
        postcode,
        latitude,
        longitude,
      });
    });

    return () => {
      // Cleanup - remove listeners
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
