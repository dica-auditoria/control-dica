"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  obtenerResumenHoyAction,
  registrarCheckinPublicoAction,
  crearPerfilEmpleadoAuthAction,
} from "@/app/actions/asistencia";
import { DEPARTAMENTOS, TIPOS_CONTRATO } from "@/lib/empleados/constants";

interface Empleado {
  id: string | null;
  nombre: string;
  codigo: string | null;
  departamento: string;
}

interface Resumen {
  primera: string | null;
  ultima: string | null;
  horas: string;
  ultimoTipo: "entrada" | "salida" | null;
}

type LatLng = { lat: number; lng: number };
type MapLike = { setCenter: (p: LatLng) => void };
type MarkerLike = { setPosition: (p: LatLng) => void };
type GMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => MapLike;
  Marker: new (opts: Record<string, unknown>) => MarkerLike;
  SymbolPath: { CIRCLE: symbol };
};
type WinGoogle = Window & { google?: { maps: GMaps } };

function getGMaps() { return (window as WinGoogle).google?.maps; }
function fmt(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

const iStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "1.5px solid var(--border-strong)", borderRadius: 6,
  fontFamily: "'DM Sans', sans-serif", color: "var(--ink)",
  background: "var(--card)", boxSizing: "border-box",
};

// ─── Setup form (no employee record) ────────────────────────────────────────

function SetupPerfilForm({ nombreDefault, onCreado }: { nombreDefault: string; onCreado: () => void }) {
  const partes = nombreDefault.trim().split(" ");
  const [form, setForm] = useState({
    nombres:          partes.slice(0, partes.length > 2 ? 1 : 1).join(" "),
    apellido_paterno: partes[1] ?? "",
    apellido_materno: partes[2] ?? "",
    puesto:           "",
    departamento:     DEPARTAMENTOS[0] as string,
    fecha_ingreso:    new Date().toISOString().slice(0, 10),
    tipo_contrato:    "indeterminado",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.nombres || !form.apellido_paterno || !form.puesto || !form.fecha_ingreso) {
      setError("Completa los campos requeridos"); return;
    }
    setError(null);
    startTransition(async () => {
      const r = await crearPerfilEmpleadoAuthAction(form);
      if (r.error) { setError(r.error); return; }
      onCreado();
    });
  };

  return (
    <div style={{ padding: "32px 32px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", marginBottom: 6 }}>
          Configura tu perfil de empleado
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-2)", margin: 0, lineHeight: 1.6 }}>
          No tienes un registro de empleado asociado a tu cuenta. Completa los datos básicos para activar el check-in y aparecer en el directorio de personal.
        </p>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <F label="Nombre(s)" required>
            <input style={iStyle} value={form.nombres} onChange={e => set("nombres", e.target.value)} placeholder="Rodrigo" />
          </F>
          <F label="Apellido paterno" required>
            <input style={iStyle} value={form.apellido_paterno} onChange={e => set("apellido_paterno", e.target.value)} placeholder="Fuentes" />
          </F>
        </div>
        <F label="Apellido materno">
          <input style={iStyle} value={form.apellido_materno} onChange={e => set("apellido_materno", e.target.value)} placeholder="Espinoza" />
        </F>
        <F label="Puesto" required>
          <input style={iStyle} value={form.puesto} onChange={e => set("puesto", e.target.value)} placeholder="Coordinador de Sistemas" />
        </F>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <F label="Departamento" required>
            <select style={iStyle} value={form.departamento} onChange={e => set("departamento", e.target.value)}>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </F>
          <F label="Tipo de contrato" required>
            <select style={iStyle} value={form.tipo_contrato} onChange={e => set("tipo_contrato", e.target.value)}>
              {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </F>
        </div>
        <F label="Fecha de ingreso" required>
          <input type="date" style={iStyle} value={form.fecha_ingreso} onChange={e => set("fecha_ingreso", e.target.value)} />
        </F>

        {error && (
          <div style={{ padding: "10px 14px", background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          style={{ padding: "11px 0", background: "var(--ink)", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: isPending ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: isPending ? 0.7 : 1, marginTop: 4 }}
        >
          {isPending ? "Creando perfil…" : "Crear mi perfil de empleado"}
        </button>
      </div>
    </div>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main check-in view ────────────────────────────────────────────────────

export default function EmpleadoCheckinView({
  empleado: initialEmpleado,
  rol,
}: {
  empleado: Empleado | null;
  rol: string;
}) {
  const [empleado, setEmpleado] = useState(initialEmpleado);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [flash, setFlash] = useState<{ tipo: "entrada" | "salida"; dentroRadio: boolean | null; distancia: number | null } | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [isDark, setIsDark] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapLike | null>(null);
  const markerRef = useRef<MarkerLike | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!empleado?.id) return;
    obtenerResumenHoyAction(empleado.id).then(r => setResumen(r));
  }, [empleado?.id, refreshTick]);

  useEffect(() => { solicitarGPS(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!coords || !mapRef.current || !apiKey) return;
    const init = () => {
      const maps = getGMaps();
      if (!maps || !mapRef.current) return;
      if (mapInstance.current) {
        mapInstance.current.setCenter(coords); markerRef.current?.setPosition(coords); return;
      }
      const map = new maps.Map(mapRef.current, {
        center: coords, zoom: 17, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, zoomControl: false, gestureHandling: "none",
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }, { featureType: "transit", stylers: [{ visibility: "off" }] }],
      });
      mapInstance.current = map;
      markerRef.current = new maps.Marker({
        position: coords, map,
        icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "white", strokeWeight: 3 },
      });
    };
    if (getGMaps()) { init(); return; }
    const ID = "gmaps-ci";
    if (!document.getElementById(ID)) {
      const s = document.createElement("script");
      s.id = ID; s.async = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      s.onload = init; document.head.appendChild(s);
    } else {
      const iv = setInterval(() => { if (getGMaps()) { clearInterval(iv); init(); } }, 150);
    }
  }, [coords, apiKey]);

  const solicitarGPS = () => {
    if (!navigator.geolocation) { setGeoState("error"); return; }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoState("ok"); },
      () => setGeoState("error"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const DEPTS_SIN_CHECKIN = ["Dirección General", "Dirección de Administración"];

  // If no employee record → show setup form
  if (!empleado?.id) {
    return <SetupPerfilForm nombreDefault={empleado?.nombre ?? ""} onCreado={() => window.location.reload()} />;
  }

  // If restricted department → show message
  if (DEPTS_SIN_CHECKIN.includes(empleado.departamento)) {
    return (
      <div style={{ padding: "60px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
          🏛
        </div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)" }}>
          Check-in no disponible
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-2)", maxWidth: 340, margin: 0, lineHeight: 1.6 }}>
          El módulo de check-in no aplica para el área de <strong>{empleado.departamento}</strong>.
          El registro de asistencia se gestiona de forma interna.
        </p>
      </div>
    );
  }

  const proxTipo: "entrada" | "salida" = resumen?.ultimoTipo === "entrada" ? "salida" : "entrada";
  const isEntrada = proxTipo === "entrada";

  const handleCheckin = () => {
    if (!empleado.id) return;
    setRegError(null); setFlash(null);
    startTransition(async () => {
      const r = await registrarCheckinPublicoAction({
        empleado_id: empleado.id!, tipo: proxTipo,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      });
      if (r.error) { setRegError(r.error); return; }
      setFlash({ tipo: proxTipo, dentroRadio: r.dentroRadio ?? null, distancia: r.distancia ?? null });
      setRefreshTick(t => t + 1);
      setTimeout(() => setFlash(null), 4000);
    });
  };

  const gpsOk = geoState === "ok";
  const btnBg = isPending || !gpsOk
    ? "#94a3b8"
    : flash ? "#22c55e" : isEntrada ? "#1677ff" : "#f97316";

  return (
    <div style={{ minHeight: "100%", background: "var(--card)", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Mapa ── */}
      <div style={{ height: 260, background: "#dde1e8", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {coords
          ? <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {geoState === "loading" && <><div style={{ fontSize: 36 }}>📡</div><div style={{ fontSize: 13, color: "var(--muted)" }}>Obteniendo ubicación…</div></>}
              {geoState === "error" && <><div style={{ fontSize: 13, color: "#dc2626", marginBottom: 8 }}>No se pudo obtener GPS</div><button onClick={solicitarGPS} style={{ padding: "8px 18px", background: "#1677ff", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Reintentar</button></>}
            </div>
          )
        }
        {geoState === "ok" && (
          <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 10px", borderRadius: 100, background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.25)", fontSize: 10, color: "#1a73e8", fontFamily: "'DM Mono', monospace" }}>
            📡 GPS activo
          </div>
        )}
        <div style={{ position: "absolute", bottom: 10, left: 10, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(4px)", fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
          {empleado.nombre}
          <span style={{ color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 10, marginLeft: 6 }}>{rol.toUpperCase()}</span>
        </div>
      </div>

      {/* ── Centro ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px 40px" }}>

        {/* Reloj */}
        <div style={{ fontSize: 64, fontWeight: 700, color: isDark ? "#ffffff" : "var(--ink)", fontFamily: "'DM Mono', monospace", lineHeight: 1, letterSpacing: "-0.02em", userSelect: "none" }}>
          {now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, marginBottom: 36 }}>
          {now.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
        </div>

        {/* Botón CHECK IN / OUT */}
        <button
          onClick={handleCheckin}
          disabled={isPending || !gpsOk}
          style={{
            width: 140, height: 140, borderRadius: "50%",
            background: btnBg, border: "none",
            boxShadow: (isPending || !gpsOk) ? "none" : `0 8px 32px ${isEntrada ? "rgba(22,119,255,0.35)" : "rgba(249,115,22,0.35)"}`,
            color: "white", cursor: (isPending || !gpsOk) ? "not-allowed" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 4, transition: "background 0.2s, box-shadow 0.2s, transform 0.1s",
            marginBottom: 28,
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)"; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          {isPending ? <Spinner />
            : flash
              ? <><span style={{ fontSize: 28 }}>✓</span><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}>REGISTRADO</span></>
              : !gpsOk
                ? <><span style={{ fontSize: 20 }}>{geoState === "error" ? "⚠️" : "📡"}</span><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>{geoState === "error" ? "SIN GPS" : "GPS..."}</span></>
                : <><span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>CHECK</span><span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>{isEntrada ? "IN" : "OUT"}</span></>
          }
        </button>

        {flash && (
          <div style={{ marginBottom: 20, padding: "7px 20px", borderRadius: 100, background: "rgba(34,197,94,0.08)", color: "#16a34a", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
            {flash.tipo === "entrada" ? "Entrada" : "Salida"} registrada
            {flash.distancia !== null && ` · ${flash.distancia.toFixed(0)} m`}
          </div>
        )}
        {regError && (
          <div style={{ marginBottom: 20, padding: "8px 20px", borderRadius: 6, background: "var(--red-light)", color: "var(--accent)", fontSize: 13 }}>{regError}</div>
        )}

        {/* Stats del día */}
        <div style={{ display: "flex", gap: 48, justifyContent: "center" }}>
          <SummaryItem label="Check in"         value={fmt(resumen?.primera ?? null)} />
          <SummaryItem label="Check out"        value={fmt(resumen?.ultima  ?? null)} />
          <SummaryItem label="Horas trabajadas" value={resumen?.horas ?? "--:--"} />
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <ClockIcon />
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-2)", fontFamily: "'DM Mono', monospace", marginTop: 6, marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(15,17,23,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
      <path d="M12 2 A10 10 0 0 1 22 12" style={{ animation: "spin 0.8s linear infinite", transformOrigin: "center" }} />
    </svg>
  );
}
