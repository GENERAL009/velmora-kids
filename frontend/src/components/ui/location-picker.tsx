"use client";

import React, { useState } from "react";
import { YMaps, Map, Placemark, GeolocationControl, SearchControl } from "@pbe/react-yandex-maps";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationPickerProps {
  onAddressChange: (address: string, city: string) => void;
  /** Called with the exact point the customer chose on the map */
  onLocationChange?: (lat: number, lon: number) => void;
  initialAddress?: string;
}

export function LocationPicker({ onAddressChange, onLocationChange, initialAddress }: LocationPickerProps) {
  const [coordinates, setCoordinates] = useState<[number, number]>([41.311081, 69.240562]); // Default Tashkent
  const [address, setAddress] = useState(initialAddress || "");
  const [loading, setLoading] = useState(false);

  // Fallback to OpenStreetMap Nominatim for free reverse geocoding if Yandex key is not available for Geocoder
  const reverseGeocode = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ru`
      );
      const data = await response.json();
      if (data && data.address) {
        const fullAddress = data.display_name;
        const city = data.address.city || data.address.town || data.address.state || "Ташкент";
        setAddress(fullAddress);
        onAddressChange(fullAddress, city);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectPoint = (coords: [number, number]) => {
    setCoordinates(coords);
    onLocationChange?.(coords[0], coords[1]);
    reverseGeocode(coords[0], coords[1]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = (e: any) => {
    selectPoint(e.get("coords") as [number, number]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlacemarkDrag = (e: any) => {
    const coords = e.get("target")?.geometry?.getCoordinates?.();
    if (coords) selectPoint(coords as [number, number]);
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          selectPoint(coords);
        },
        (error) => {
          console.error("Location error:", error);
          setLoading(false);
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            readOnly
            value={address}
            placeholder="Выберите на карте или определите геолокацию"
            className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 pl-10 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder:text-neutral-500"
          />
        </div>
        <Button type="button" onClick={detectLocation} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Мое местоположение"}
        </Button>
      </div>

      <div className="h-64 w-full overflow-hidden rounded-md border border-neutral-200">
        <YMaps
          query={{
            apikey: process.env.NEXT_PUBLIC_YANDEX_API_KEY || "",
            lang: "ru_RU",
          }}
        >
          <Map
            state={{ center: coordinates, zoom: 14 }}
            className="h-full w-full"
            onClick={handleMapClick}
          >
            <GeolocationControl options={{ float: "right" }} />
            <SearchControl options={{ float: "left" }} />
            <Placemark
              geometry={coordinates}
              options={{ draggable: true, preset: "islands#redDotIcon" }}
              onDragEnd={handlePlacemarkDrag}
            />
          </Map>
        </YMaps>
      </div>
    </div>
  );
}
