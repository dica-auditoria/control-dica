"use client";

import { useMemo } from "react";
import type { EmpleadoCumpleanos } from "@/app/actions/cumpleanos";

interface EmpleadoConDias extends EmpleadoCumpleanos {
  diasFaltantes: number;
  edad: number;
  diaMes: string;
}

function calcularProximoCumple(fechaNacimiento: string): { diasFaltantes: number; edad: number } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nacimiento = new Date(fechaNacimiento + "T12:00:00");
  const este = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (este < hoy) este.setFullYear(este.getFullYear() + 1);
  const diasFaltantes = Math.round((este.getTime() - hoy.getTime()) / 86400000);
  const proximoAno = este.getFullYear();
  const edad = proximoAno - nacimiento.getFullYear();
  return { diasFaltantes, edad };
}

function fmtDiaMes(fecha: string): string {
  const d = new Date(fecha + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

function iniciales(nombre: string): string {
  return nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export default function CumpleanosView({ empleados }: { empleados: EmpleadoCumpleanos[] }) {
  const lista = useMemo<EmpleadoConDias[]>(() => {
    return empleados
      .map(e => {
        const { diasFaltantes, edad } = calcularProximoCumple(e.fecha_nacimiento);
        return { ...e, diasFaltantes, edad, diaMes: fmtDiaMes(e.fecha_nacimiento) };
      })
      .sort((a, b) => a.diasFaltantes - b.diasFaltantes);
  }, [empleados]);

  const hoy      = lista.filter(e => e.diasFaltantes === 0);
  const semana   = lista.filter(e => e.diasFaltantes >= 1 && e.diasFaltantes <= 7);
  const mes      = lista.filter(e => e.diasFaltantes >= 8 && e.diasFaltantes <= 31);
  const proximos = lista.filter(e => e.diasFaltantes > 31);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Cumpleaños</h1>
        <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
          {lista.length} colaborador{lista.length !== 1 ? "es" : ""} con fecha registrada
        </p>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>
          No hay fechas de cumpleaños registradas
        </div>
      ) : (
        <>
          {hoy.length > 0 && (
            <Seccion titulo="Hoy" accent="#f59e0b" emoji="🎂">
              {hoy.map(e => <TarjetaCumple key={e.id} emp={e} destacado />)}
            </Seccion>
          )}
          {semana.length > 0 && (
            <Seccion titulo="Esta semana" accent="#0ea5e9">
              {semana.map(e => <TarjetaCumple key={e.id} emp={e} />)}
            </Seccion>
          )}
          {mes.length > 0 && (
            <Seccion titulo="Este mes" accent="#8b5cf6">
              {mes.map(e => <TarjetaCumple key={e.id} emp={e} />)}
            </Seccion>
          )}
          {proximos.length > 0 && (
            <Seccion titulo="Próximos" accent="var(--muted)">
              {proximos.map(e => <TarjetaCumple key={e.id} emp={e} />)}
            </Seccion>
          )}
        </>
      )}
    </div>
  );
}

function Seccion({ titulo, accent, emoji, children }: { titulo: string; accent: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: accent }}>
          {titulo}
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function TarjetaCumple({ emp, destacado }: { emp: EmpleadoConDias; destacado?: boolean }) {
  const ini = iniciales(emp.nombre);
  return (
    <div style={{
      background: destacado ? "rgba(245,158,11,0.06)" : "var(--card)",
      border: `1px solid ${destacado ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
      borderRadius: 8,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        {emp.foto_url ? (
          <img
            src={emp.foto_url}
            alt={emp.nombre}
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "#1B4F8A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "white", border: "2px solid var(--border)",
          }}>
            {ini}
          </div>
        )}
        {destacado && (
          <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 14 }}>🎂</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {emp.nombre}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
          {emp.departamento}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
            {emp.diaMes}
          </span>
          <span style={{ fontSize: 10, color: "var(--muted)", background: "var(--surface)", padding: "1px 6px", borderRadius: 3, fontFamily: "'DM Mono', monospace" }}>
            {emp.edad} años
          </span>
        </div>
      </div>

      {/* Días */}
      <div style={{ flexShrink: 0, textAlign: "center" }}>
        {emp.diasFaltantes === 0 ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>HOY</span>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
              {emp.diasFaltantes}
            </div>
            <div style={{ fontSize: 9, color: "var(--muted)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              días
            </div>
          </>
        )}
      </div>
    </div>
  );
}
