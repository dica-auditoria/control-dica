"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  buscarEmpleadoCheckinAction,
  obtenerResumenHoyAction,
  registrarCheckinPublicoAction,
} from "@/app/actions/asistencia";

type LatLngLiteral = { lat: number; lng: number };
type MapLike = { setCenter: (position: LatLngLiteral) => void };
type MarkerLike = { setPosition: (position: LatLngLiteral) => void };
type GoogleMapsApi = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: Record<string, unknown>
    ) => MapLike;
    Marker: new (options: Record<string, unknown>) => MarkerLike;
    SymbolPath: { CIRCLE: symbol };
  };
};
type WindowWithGoogleMaps = Window & { google?: GoogleMapsApi };

function getGoogleMaps() {
  return (window as WindowWithGoogleMaps).google?.maps;
}

type Stage = "search" | "found" | "done";

interface Empleado { id: string; nombre: string; codigo: string | null; departamento: string }
interface Resumen { primera: string | null; ultima: string | null; horas: string; ultimoTipo: "entrada" | "salida" | null }

export default function CheckInPortal() {
  const [stage, setStage] = useState<Stage>("search");
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [dentroRadio, setDentroRadio] = useState<boolean | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(new Date());
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapLike | null>(null);
  const userMarker = useRef<MarkerLike | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load Google Maps
  useEffect(() => {
    if (!apiKey || !coords || !mapRef.current) return;

    const init = () => {
      const maps = getGoogleMaps();
      if (!maps || !mapRef.current) return;
      if (mapInstance.current) {
        mapInstance.current.setCenter({ lat: coords.lat, lng: coords.lng });
        userMarker.current?.setPosition({ lat: coords.lat, lng: coords.lng });
        return;
      }
      const map = new maps.Map(mapRef.current, {
        center: { lat: coords.lat, lng: coords.lng },
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        gestureHandling: "none",
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      });
      mapInstance.current = map;
      userMarker.current = new maps.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
      });
    };

    if (getGoogleMaps()) { init(); return; }
    const id = "gmaps-ci";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id; s.async = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      const iv = setInterval(() => { if (getGoogleMaps()) { clearInterval(iv); init(); } }, 150);
    }
  }, [coords, apiKey]);

  const handleBuscar = () => {
    if (!query.trim()) return;
    setSearchError(null);
    startTransition(async () => {
      const r = await buscarEmpleadoCheckinAction(query);
      if (r.error) { setSearchError(r.error); return; }
      setEmpleado(r.empleado!);
      const res = await obtenerResumenHoyAction(r.empleado!.id);
      setResumen(res);
      setStage("found");
      // Auto-request GPS
      solicitarGPS();
    });
  };

  const solicitarGPS = () => {
    if (!navigator.geolocation) { setGeoState("error"); return; }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoState("ok"); },
      () => setGeoState("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckIn = (tipo: "entrada" | "salida") => {
    if (!empleado) return;
    setRegisterError(null);
    startTransition(async () => {
      const r = await registrarCheckinPublicoAction({
        empleado_id: empleado.id, tipo,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      });
      if (r.error) { setRegisterError(r.error); return; }
      setDentroRadio(r.dentroRadio ?? null);
      setDistancia(r.distancia ?? null);
      const res = await obtenerResumenHoyAction(empleado.id);
      setResumen(res);
      setStage("done");
    });
  };

  const proxTipo: "entrada" | "salida" = resumen?.ultimoTipo === "entrada" ? "salida" : "entrada";

  const fmt = (iso: string | null) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  };

  // ─── SEARCH STAGE ────────────────────────────────────────────────────────────
  if (stage === "search") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "var(--card)", borderRadius: 12, padding: 36, width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(15,17,23,0.12)", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
            🛡
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", marginBottom: 6 }}>Control DICA</div>
          <div style={{ fontSize: 13, color: "rgba(15,17,23,0.45)", marginBottom: 32 }}>Registro de asistencia</div>

          <div style={{ textAlign: "left", marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,17,23,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              Código de empleado o email
            </label>
            <input
              style={{ width: "100%", padding: "12px 14px", fontSize: 14, border: "1.5px solid var(--border-strong)", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", outline: "none" }}
              placeholder="DICA-PC-001 o nombre@dica.mx"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleBuscar()}
              autoFocus
            />
          </div>
          {searchError && <div style={{ padding: 10, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13, marginBottom: 16 }}>{searchError}</div>}
          <button onClick={handleBuscar} disabled={isPending || !query.trim()} style={{
            width: "100%", padding: "13px 0", background: "var(--ink)", color: "white", border: "none",
            borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            opacity: !query.trim() ? 0.5 : 1,
          }}>
            {isPending ? "Buscando…" : "Continuar →"}
          </button>
        </div>
        <div style={{ marginTop: 20, fontSize: 11, color: "rgba(15,17,23,0.3)", fontFamily: "'DM Mono', monospace" }}>
          {now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    );
  }

  // ─── FOUND / DONE STAGE ─────────────────────────────────────────────────────
  const isEntry = proxTipo === "entrada";
  const btnColor = stage === "done"
    ? (dentroRadio ? "#22c55e" : dentroRadio === false ? "var(--accent)" : "var(--ink-2)")
    : isEntry ? "#22c55e" : "var(--accent)";

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Map area */}
      <div style={{ position: "relative", height: 300, background: "#e8e8e8", overflow: "hidden" }}>
        {coords ? (
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
            {geoState === "loading" ? (
              <>
                <div style={{ fontSize: 32 }}>📡</div>
                <div style={{ fontSize: 13, color: "rgba(15,17,23,0.5)" }}>Obteniendo ubicación…</div>
              </>
            ) : geoState === "error" ? (
              <>
                <div style={{ fontSize: 13, color: "var(--accent)" }}>No se pudo obtener GPS</div>
                <button onClick={solicitarGPS} style={{ padding: "8px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Reintentar</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32 }}>📍</div>
                <div style={{ fontSize: 13, color: "rgba(15,17,23,0.5)" }}>Activando GPS…</div>
              </>
            )}
          </div>
        )}

        {/* Employee name overlay */}
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: "10px 14px", backdropFilter: "blur(4px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{empleado?.nombre}</div>
              <div style={{ fontSize: 11, color: "rgba(15,17,23,0.45)" }}>{empleado?.departamento} {empleado?.codigo ? `· ${empleado.codigo}` : ""}</div>
            </div>
            <button onClick={() => { setStage("search"); setQuery(""); setCoords(null); setGeoState("idle"); setResumen(null); setStage("search"); }}
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(15,17,23,0.4)" }}>×</button>
          </div>
        </div>

        {/* GPS status badge */}
        {coords && (
          <div style={{ position: "absolute", bottom: 12, right: 12, padding: "4px 10px", background: "rgba(34,197,94,0.15)", borderRadius: 100, border: "1px solid rgba(34,197,94,0.3)", fontSize: 10, color: "#16a34a", fontFamily: "'DM Mono', monospace" }}>
            📡 GPS activo
          </div>
        )}

        {/* Big CHECK IN/OUT button centered at bottom of map */}
        <div style={{ position: "absolute", bottom: -34, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          {stage === "done" ? (
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: btnColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", color: "white", fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
              {dentroRadio === true ? "✓\nREGISTRADO" : dentroRadio === false ? "⚠\nFUERA\nRADIO" : "✓\nOK"}
            </div>
          ) : (
            <button onClick={() => handleCheckIn(proxTipo)} disabled={isPending} style={{
              width: 100, height: 100, borderRadius: "50%",
              background: btnColor,
              border: "4px solid white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer",
              textAlign: "center", lineHeight: 1.2,
            }}>
              {isPending ? "…" : isEntry ? "CHECK\nIN" : "CHECK\nOUT"}
            </button>
          )}
        </div>
      </div>

      {/* Content area (below map) */}
      <div style={{ paddingTop: 60, paddingBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {registerError && (
          <div style={{ margin: "0 24px 16px", padding: 12, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13, width: "calc(100% - 48px)" }}>
            {registerError}
          </div>
        )}

        {stage === "done" && distancia !== null && (
          <div style={{ fontSize: 12, color: dentroRadio ? "#16a34a" : "var(--accent)", marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
            {dentroRadio ? "✓ Dentro del radio" : "⚠ Fuera del radio"} · {distancia.toFixed(0)} m
          </div>
        )}

        {/* Clock */}
        <div style={{ fontSize: 52, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
          {now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{ fontSize: 13, color: "rgba(15,17,23,0.45)", marginTop: 6, marginBottom: 32 }}>
          {now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 32, justifyContent: "center" }}>
          <SummaryItem icon="🕐" label="Check in" value={fmt(resumen?.primera ?? null)} />
          <SummaryItem icon="🕐" label="Check out" value={fmt(resumen?.ultima ?? null)} />
          <SummaryItem icon="⏱" label="Horas trabajadas" value={resumen?.horas ?? "--:--"} />
        </div>

        {stage === "done" && (
          <button onClick={() => { setStage("found"); setDentroRadio(null); setDistancia(null); setRegisterError(null); }}
            style={{ marginTop: 28, padding: "10px 24px", background: "var(--ink)", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Registrar otro
          </button>
        )}
      </div>

      <div style={{ marginTop: "auto", padding: "16px 0", textAlign: "center", fontSize: 11, color: "rgba(15,17,23,0.3)", fontFamily: "'DM Mono', monospace" }}>
        {empleado?.nombre} · DICA México
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(15,17,23,0.4)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
