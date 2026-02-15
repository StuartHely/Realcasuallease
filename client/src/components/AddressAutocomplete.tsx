import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

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
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: suggestions, isLoading } = trpc.places.suggestions.useQuery(
    { text: value, maxResults: 5 },
    { enabled: value.length >= 3, staleTime: 30000 }
  );

  const { data: placeDetails } = trpc.places.getDetails.useQuery(
    { placeId: selectedPlaceId! },
    { enabled: !!selectedPlaceId }
  );

  useEffect(() => {
    if (placeDetails && selectedPlaceId) {
      onAddressSelect({
        streetAddress: placeDetails.addressComponents.streetAddress,
        suburb: placeDetails.addressComponents.suburb,
        state: placeDetails.addressComponents.state,
        postcode: placeDetails.addressComponents.postcode,
        latitude: placeDetails.addressComponents.latitude,
        longitude: placeDetails.addressComponents.longitude,
      });
      onChange(placeDetails.addressComponents.streetAddress);
      setSelectedPlaceId(null);
    }
  }, [placeDetails, selectedPlaceId, onAddressSelect, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setSelectedIndex(-1);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (newValue.length >= 3) {
          setShowDropdown(true);
        } else {
          setShowDropdown(false);
        }
      }, 300);
    },
    [onChange]
  );

  const handleSelectSuggestion = useCallback(
    (placeId: string, displayText: string) => {
      setShowDropdown(false);
      onChange(displayText);
      setSelectedPlaceId(placeId);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || !suggestions?.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelectSuggestion(
              suggestions[selectedIndex].placeId,
              suggestions[selectedIndex].text
            );
          }
          break;
        case "Escape":
          setShowDropdown(false);
          break;
      }
    },
    [showDropdown, suggestions, selectedIndex, handleSelectSuggestion]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.length >= 3 && suggestions?.length) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {showDropdown && (suggestions?.length || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching...
            </div>
          ) : (
            suggestions?.map((suggestion, index) => (
              <button
                key={suggestion.placeId}
                type="button"
                className={cn(
                  "w-full px-4 py-3 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                  index === selectedIndex && "bg-gray-100"
                )}
                onClick={() =>
                  handleSelectSuggestion(suggestion.placeId, suggestion.text)
                }
              >
                {suggestion.text}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
