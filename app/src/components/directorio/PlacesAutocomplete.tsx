"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaceData } from "@/types/directorio";

interface Props {
  onSelect: (place: PlaceData) => void;
  disabled?: boolean;
}

interface AddressComponent {
  long_name: string;
  types: string[];
}
interface GooglePlace {
  address_components?: AddressComponent[];
  geometry?: { location: { lat: () => number; lng: () => number } };
  name?: string;
  plus_code?: { global_code?: string; compound_code?: string };
}
interface AutocompleteLike {
  addListener: (eventName: string, callback: () => void) => void;
  getPlace: () => GooglePlace;
}
type GooglePlacesApi = {
  maps?: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: Record<string, unknown>
      ) => AutocompleteLike;
    };
  };
};
type WindowWithGooglePlaces = Window & { google?: GooglePlacesApi };

function getGooglePlaces() {
  return (window as WindowWithGooglePlaces).google?.maps?.places;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  border: "1.5px solid var(--border-strong)",
  borderRadius: 4,
  fontFamily: "'DM Sans', sans-serif",
  color: "var(--ink)",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
};

export default function PlacesAutocomplete({ onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "no_key">("idle");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) { setStatus("no_key"); return; }
    if (typeof window === "undefined") return;

    const init = () => {
      const places = getGooglePlaces();
      if (!inputRef.current || !places) return;
      const ac = new places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "mx" },
        fields: ["address_components", "geometry", "plus_code", "name"],
      });
      autocompleteRef.current = ac;
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.geometry) return;

        const get = (type: string) => place.address_components?.find(c => c.types.includes(type))?.long_name ?? "";

        const result: PlaceData = {
          nombre_lugar: place.name ?? "",
          calle: get("route"),
          numero_ext: get("street_number"),
          colonia: get("sublocality_level_1") || get("sublocality") || get("neighborhood"),
          municipio: get("locality") || get("administrative_area_level_2"),
          estado_dir: get("administrative_area_level_1"),
          cp: get("postal_code"),
          pais: get("country") || "México",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          plus_code: place.plus_code?.global_code ?? place.plus_code?.compound_code ?? "",
        };
        onSelect(result);
      });
      setStatus("ready");
    };

    if (getGooglePlaces()) {
      init();
      return;
    }

    setStatus("loading");
    const scriptId = "gmaps-places-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (getGooglePlaces()) { clearInterval(interval); init(); }
      }, 200);
    }
  }, [apiKey, onSelect]);

  if (status === "no_key") {
    return (
      <div style={{
        padding: "10px 14px",
        background: "var(--amber-light)",
        borderRadius: 4,
        fontSize: 12,
        color: "var(--amber)",
        border: "1px solid rgba(181,86,14,0.2)",
      }}>
        ⚠ Agrega <code style={{ fontFamily: "'DM Mono', monospace" }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> a <code style={{ fontFamily: "'DM Mono', monospace" }}>.env.local</code> para activar el autocompletado.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={status === "loading" ? "Cargando Google Maps…" : "Buscar en Google Maps (calle, colonia, ciudad…)"}
        disabled={disabled || status === "loading"}
        style={{
          ...inputStyle,
          paddingLeft: 36,
          opacity: status === "loading" ? 0.6 : 1,
        }}
      />
      <span style={{
        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
        fontSize: 16, pointerEvents: "none",
      }}>
        🔍
      </span>
      {status === "ready" && (
        <span style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          fontSize: 10, color: "rgba(15,17,23,0.3)", fontFamily: "'DM Mono', monospace",
          pointerEvents: "none",
        }}>
          Maps
        </span>
      )}
    </div>
  );
}
