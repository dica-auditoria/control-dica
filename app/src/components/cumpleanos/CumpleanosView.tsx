"use client";

import { useMemo, useState } from "react";
import type { EmpleadoCumpleanos } from "@/app/actions/cumpleanos";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface EmpleadoConDias extends EmpleadoCumpleanos {
  diasFaltantes: number;
  edad: number;
  diaMes: string;
  mes: number;
  dia: number;
}

function calcularProximoCumple(fechaNacimiento: string): { diasFaltantes: number; edad: number } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nac = new Date(fechaNacimiento + "T12:00:00");
  const este = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
  if (este < hoy) este.setFullYear(este.getFullYear() + 1);
  const diasFaltantes = Math.round((este.getTime() - hoy.getTime()) / 86400000);
  return { diasFaltantes, edad: este.getFullYear() - nac.getFullYear() };
}

function fmtDiaMes(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

function iniciales(nombre: string): string {
  return nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// ── Calendario ────────────────────────────────────────────────────────────────

function Calendario({ lista }: { lista: EmpleadoConDias[] }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes]   = useState(hoy.getMonth()); // 0-based

  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const irAnterior = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); } else setMes(m => m - 1);
    setDiaSeleccionado(null);
  };
  const irSiguiente = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); } else setMes(m => m + 1);
    setDiaSeleccionado(null);
  };

  // días con cumpleaños en este mes
  const porDia = useMemo(() => {
    const map = new Map<number, EmpleadoConDias[]>();
    for (const e of lista) {
      if (e.mes === mes) {
        if (!map.has(e.dia)) map.set(e.dia, []);
        map.get(e.dia)!.push(e);
      }
    }
    return map;
  }, [lista, mes]);

  // construcción de la grilla
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];
  while (celdas.length % 7 !== 0) celdas.push(null);

  const cumpleSel = diaSeleccionado !== null ? (porDia.get(diaSeleccionado) ?? []) : [];

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      {/* Header del mes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={irAnterior} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: "var(--ink)", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Sans', sans-serif" }}>
          {MESES[mes]} {anio}
        </span>
        <button onClick={irSiguiente} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: "var(--ink)", lineHeight: 1 }}>›</button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Días de la semana */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {celdas.map((dia, idx) => {
            if (dia === null) return <div key={idx} />;
            const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth() && dia === hoy.getDate();
            const cumples = porDia.get(dia) ?? [];
            const tieneCumple = cumples.length > 0;
            const seleccionado = diaSeleccionado === dia;

            return (
              <button
                key={idx}
                onClick={() => setDiaSeleccionado(seleccionado ? null : dia)}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  border: seleccionado ? "2px solid #1B4F8A" : esHoy ? "2px solid var(--accent)" : "1px solid transparent",
                  borderRadius: 8,
                  background: seleccionado ? "rgba(27,79,138,0.08)" : tieneCumple ? "rgba(245,158,11,0.07)" : esHoy ? "var(--surface)" : "transparent",
                  cursor: tieneCumple ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  padding: 4,
                  transition: "all 0.1s",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: esHoy ? 700 : tieneCumple ? 600 : 400, color: esHoy ? "var(--accent)" : tieneCumple ? "#d97706" : "var(--ink)", lineHeight: 1 }}>
                  {dia}
                </span>
                {tieneCumple && (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                )}
                {tieneCumple && cumples.length > 1 && (
                  <span style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", color: "#d97706", lineHeight: 1 }}>×{cumples.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tooltip día seleccionado */}
        {diaSeleccionado !== null && cumpleSel.length > 0 && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#d97706", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {diaSeleccionado} de {MESES[mes]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cumpleSel.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {e.foto_url ? (
                    <img src={e.foto_url} alt={e.nombre} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1B4F8A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {iniciales(e.nombre)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{e.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.departamento} · {e.edad} años</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CumpleanosView({ empleados }: { empleados: EmpleadoCumpleanos[] }) {
  const lista = useMemo<EmpleadoConDias[]>(() => {
    return empleados
      .map(e => {
        const { diasFaltantes, edad } = calcularProximoCumple(e.fecha_nacimiento);
        const nac = new Date(e.fecha_nacimiento + "T12:00:00");
        return { ...e, diasFaltantes, edad, diaMes: fmtDiaMes(e.fecha_nacimiento), mes: nac.getMonth(), dia: nac.getDate() };
      })
      .sort((a, b) => a.diasFaltantes - b.diasFaltantes);
  }, [empleados]);

  const hoy      = lista.filter(e => e.diasFaltantes === 0);
  const semana   = lista.filter(e => e.diasFaltantes >= 1 && e.diasFaltantes <= 7);
  const esteMes  = lista.filter(e => e.diasFaltantes >= 8 && e.diasFaltantes <= 31);
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
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
          {/* Columna izquierda: calendario */}
          <div>
            <Calendario lista={lista} />
          </div>

          {/* Columna derecha: lista por proximidad */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
            {esteMes.length > 0 && (
              <Seccion titulo="Este mes" accent="#8b5cf6">
                {esteMes.map(e => <TarjetaCumple key={e.id} emp={e} />)}
              </Seccion>
            )}
            {proximos.length > 0 && (
              <Seccion titulo="Próximos" accent="var(--muted)">
                {proximos.map(e => <TarjetaCumple key={e.id} emp={e} />)}
              </Seccion>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sección ───────────────────────────────────────────────────────────────────

function Seccion({ titulo, accent, emoji, children }: { titulo: string; accent: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: accent }}>
          {titulo}
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────

function TarjetaCumple({ emp, destacado }: { emp: EmpleadoConDias; destacado?: boolean }) {
  return (
    <div style={{
      background: destacado ? "rgba(245,158,11,0.06)" : "var(--card)",
      border: `1px solid ${destacado ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
      borderRadius: 8,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        {emp.foto_url ? (
          <img src={emp.foto_url} alt={emp.nombre} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1B4F8A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", border: "2px solid var(--border)" }}>
            {iniciales(emp.nombre)}
          </div>
        )}
        {destacado && <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 13 }}>🎂</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {emp.nombre}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{emp.departamento}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>{emp.diaMes}</span>
          <span style={{ fontSize: 10, color: "var(--muted)", background: "var(--surface)", padding: "1px 6px", borderRadius: 3, fontFamily: "'DM Mono', monospace" }}>{emp.edad} años</span>
        </div>
      </div>

      {/* Días restantes */}
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 36 }}>
        {emp.diasFaltantes === 0 ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>HOY</span>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{emp.diasFaltantes}</div>
            <div style={{ fontSize: 9, color: "var(--muted)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>días</div>
          </>
        )}
      </div>
    </div>
  );
}
