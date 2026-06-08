"use client";

import { useState, useTransition } from "react";
import { registrarAsistenciaAction, fetchAsistenciaAction, fetchReporteRangoAction, type ReporteEmpleado } from "@/app/actions/asistencia";
import { DEPARTAMENTOS } from "@/lib/empleados/constants";
import type { RegistroAsistencia, EmpleadoAsistenciaOption } from "@/types/asistencia";
import type { Ubicacion } from "@/types/directorio";

interface Props {
  registros: RegistroAsistencia[];
  empleados: EmpleadoAsistenciaOption[];
  oficinas: Ubicacion[];
  fechaInicial: string;
}

type Tab = "hoy" | "reportes";
type GeoState = "idle" | "solicitando" | "ok" | "error";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = { a_tiempo: "A Tiempo", tardanza: "Tardanza", no_registrado: "No Reg." };
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  a_tiempo:      { bg: "rgba(34,197,94,0.12)", color: "#16a34a" },
  tardanza:      { bg: "rgba(234,179,8,0.15)", color: "#a16207" },
  no_registrado: { bg: "rgba(15,17,23,0.06)",  color: "var(--muted)" },
};

function exportCSV(empleados: ReporteEmpleado[], fechas: string[], sel: Set<string>, horaEntrada: string) {
  const lista = sel.size > 0 ? empleados.filter(e => sel.has(e.id)) : empleados;
  const filas: string[][] = [];
  const header = ["Nombre", "Código", "Departamento",
    ...fechas.map(f => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" })),
    "Presentes", "Tardanzas", "Ausentes", "% Asistencia"];
  filas.push(header);
  for (const e of lista) {
    const row = [e.nombre, e.codigo ?? "", e.departamento,
      ...fechas.map(f => STATUS_LABEL[e.dias[f]?.status ?? "no_registrado"].replace("No Reg.", "—")),
      String(e.presentes), String(e.tardanzas), String(e.ausentes), `${e.porcentaje}%`];
    filas.push(row);
  }
  filas.push([]);
  filas.push([`Generado: ${new Date().toLocaleString("es-MX")}`, `Hora entrada: ${horaEntrada}`, sel.size > 0 ? `${sel.size} seleccionados` : "Todos", ""]);
  const csv = filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `asistencia_${fechas[0] ?? ""}_${fechas[fechas.length - 1] ?? ""}.csv`;
  a.click();
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AsistenciaView({ registros: inicial, empleados, oficinas, fechaInicial }: Props) {
  const [tab, setTab] = useState<Tab>("hoy");

  return (
    <>
      {/* Header with tabs */}
      <div style={{ padding: "20px 32px 0", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Asistencia</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              Control de entradas y salidas · Reportes con geofencing
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {([["hoy", "📅 Hoy"], ["reportes", "📊 Reportes RH"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 22px", border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none", fontSize: 13,
              color: tab === t ? "var(--accent)" : "rgba(15,17,23,0.5)",
              fontWeight: tab === t ? 600 : 400,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1,
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "hoy"
        ? <TabHoy registros={inicial} empleados={empleados} oficinas={oficinas} fechaInicial={fechaInicial} />
        : <TabReportes />
      }
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HOY
// ═══════════════════════════════════════════════════════════════════════════════
function TabHoy({ registros: inicial, empleados, oficinas, fechaInicial }: Props) {
  const [registros, setRegistros] = useState(inicial);
  const [fecha, setFecha] = useState(fechaInicial);
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "entrada" | "salida">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [empId, setEmpId] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada");
  const [ubicacionId, setUbicacionId] = useState("");
  const [notas, setNotas] = useState("");
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ distancia: number | null; dentroRadio: boolean | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const lista = registros.filter(r => {
    if (filtroEmpleado && r.empleado_id !== filtroEmpleado) return false;
    if (filtroTipo && r.tipo !== filtroTipo) return false;
    return true;
  });

  const entradasHoy = registros.filter(r => r.tipo === "entrada").length;
  const salidasHoy  = registros.filter(r => r.tipo === "salida").length;
  const dentroR     = registros.filter(r => r.dentro_radio === true).length;
  const fueraR      = registros.filter(r => r.dentro_radio === false).length;

  const solicitarGPS = () => {
    if (!navigator.geolocation) { setGeoError("El navegador no soporta geolocalización"); return; }
    setGeoState("solicitando");
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoState("ok"); },
      e => { setGeoState("error"); setGeoError(e.code === 1 ? "Permiso denegado" : "No se pudo obtener ubicación"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRegistrar = () => {
    if (!empId) { setFormError("Selecciona un empleado"); return; }
    setFormError(null); setResultado(null);
    startTransition(async () => {
      const r = await registrarAsistenciaAction({ empleado_id: empId, tipo, lat: coords?.lat ?? null, lng: coords?.lng ?? null, ubicacion_id: ubicacionId || null, notas });
      if (r.error) { setFormError(r.error); return; }
      setResultado({ distancia: r.distancia ?? null, dentroRadio: r.dentroRadio ?? null });
      const fresh = await fetchAsistenciaAction({ fecha });
      if (fresh.data) setRegistros(fresh.data);
      setTimeout(() => { setModalOpen(false); setEmpId(""); setTipo("entrada"); setUbicacionId(""); setNotas(""); setCoords(null); setGeoState("idle"); setGeoError(null); setResultado(null); }, 1600);
    });
  };

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <SC label="Entradas hoy" value={entradasHoy} color="var(--green)" />
        <SC label="Salidas hoy" value={salidasHoy} color="var(--ink-2)" />
        <SC label="Dentro de radio" value={dentroR} color="var(--green)" sub="GPS válido" />
        <SC label="Fuera de radio" value={fueraR} color="var(--accent)" sub="Alerta" />
      </div>

      {/* Filters + action */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={fSt} />
        <select style={fSt} value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}>
          <option value="">Todos los empleados</option>
          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellido_paterno}</option>)}
        </select>
        <select style={fSt} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as "" | "entrada" | "salida")}>
          <option value="">Entrada y Salida</option>
          <option value="entrada">Solo entradas</option>
          <option value="salida">Solo salidas</option>
        </select>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{lista.length} reg.</span>
        <button onClick={() => setModalOpen(true)} style={{ ...btnP, marginLeft: "auto" }}>+ Registrar entrada / salida</button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
        {lista.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>Sin registros</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Empleado", "Tipo", "Ubicación", "Distancia", "Estado GPS", "Hora"].map(h => <th key={h} style={thSt}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={tdSt}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.empleado_nombre}</div>
                    {r.empleado_codigo && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{r.empleado_codigo}</div>}
                  </td>
                  <td style={tdSt}>
                    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: r.tipo === "entrada" ? "rgba(45,106,79,0.1)" : "rgba(15,17,23,0.06)", color: r.tipo === "entrada" ? "var(--green)" : "var(--ink-2)" }}>
                      {r.tipo === "entrada" ? "↗ Entrada" : "↙ Salida"}
                    </span>
                  </td>
                  <td style={{ ...tdSt, fontSize: 12, color: "var(--muted-2)" }}>{r.ubicacion_nombre ?? "—"}</td>
                  <td style={{ ...tdSt, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{r.distancia_metros != null ? `${r.distancia_metros.toFixed(0)} m` : "—"}</td>
                  <td style={tdSt}>
                    {r.dentro_radio === null ? <span style={{ fontSize: 11, color: "var(--muted)" }}>Sin GPS</span>
                      : r.dentro_radio ? <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)" }}>✓ Dentro</span>
                      : <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>⚠ Fuera</span>}
                  </td>
                  <td style={{ ...tdSt, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted-2)" }}>
                    {new Date(r.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,17,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 460, boxShadow: "0 8px 32px rgba(15,17,23,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Registrar asistencia</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {formError && <div style={{ padding: 10, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 12 }}>{formError}</div>}
              {resultado && (
                <div style={{ padding: 12, borderRadius: 6, background: resultado.dentroRadio ? "var(--green-light)" : resultado.dentroRadio === false ? "var(--red-light)" : "var(--surface)", fontSize: 13, fontWeight: 600, color: resultado.dentroRadio ? "var(--green)" : resultado.dentroRadio === false ? "var(--accent)" : "var(--ink)" }}>
                  {resultado.dentroRadio === true ? "✓ Dentro del radio" : resultado.dentroRadio === false ? "⚠ Fuera del radio" : "✓ Guardado"}{resultado.distancia != null ? ` · ${resultado.distancia.toFixed(0)} m` : ""}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["entrada", "salida"] as const).map(t => (
                  <button key={t} onClick={() => setTipo(t)} style={{ padding: "10px 0", borderRadius: 6, border: `2px solid ${tipo === t ? (t === "entrada" ? "var(--green)" : "var(--ink-2)") : "var(--border)"}`, background: tipo === t ? (t === "entrada" ? "rgba(45,106,79,0.06)" : "rgba(15,17,23,0.04)") : "white", fontSize: 13, fontWeight: 600, cursor: "pointer", color: tipo === t ? (t === "entrada" ? "var(--green)" : "var(--ink-2)") : "rgba(15,17,23,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
                    {t === "entrada" ? "↗ Entrada" : "↙ Salida"}
                  </button>
                ))}
              </div>
              <div>
                <Lbl>Empleado *</Lbl>
                <select style={iSt} value={empId} onChange={e => setEmpId(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellido_paterno}{e.codigo_empleado ? ` · ${e.codigo_empleado}` : ""}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Oficina</Lbl>
                <select style={iSt} value={ubicacionId} onChange={e => setUbicacionId(e.target.value)}>
                  <option value="">Detectar automáticamente</option>
                  {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre} — {o.radio_metros}m{!o.lat ? " ⚠" : ""}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Ubicación GPS</Lbl>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={solicitarGPS} disabled={geoState === "solicitando"} style={{ padding: "8px 12px", borderRadius: 4, border: "1.5px solid var(--border-strong)", background: geoState === "ok" ? "rgba(45,106,79,0.08)" : "white", fontSize: 12, cursor: "pointer", color: geoState === "ok" ? "var(--green)" : "rgba(15,17,23,0.65)", fontFamily: "'DM Sans', sans-serif" }}>
                    {geoState === "solicitando" ? "⏳ Obteniendo…" : geoState === "ok" ? "✓ GPS ok" : "📡 Obtener GPS"}
                  </button>
                  {coords && <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--green)" }}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>}
                  {geoState === "error" && <span style={{ fontSize: 11, color: "var(--accent)" }}>{geoError}</span>}
                </div>
              </div>
              <div>
                <Lbl>Notas</Lbl>
                <input style={iSt} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Incidencia, llegada tardía…" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setModalOpen(false)} style={btnO}>Cancelar</button>
                <button onClick={handleRegistrar} disabled={isPending || !empId} style={{ ...btnP, background: !empId ? "rgba(15,17,23,0.2)" : tipo === "entrada" ? "var(--green)" : "var(--ink-2)", cursor: !empId ? "not-allowed" : "pointer" }}>
                  {isPending ? "Guardando…" : tipo === "entrada" ? "↗ Entrada" : "↙ Salida"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: REPORTES
// ═══════════════════════════════════════════════════════════════════════════════
function TabReportes() {
  const hoy = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin]       = useState(hoy);
  const [horaEntrada, setHoraEntrada] = useState("09:00");
  const [departamento, setDepartamento] = useState("todos");
  const [data, setData]               = useState<ReporteEmpleado[]>([]);
  const [fechas, setFechas]           = useState<string[]>([]);
  const [consultado, setConsultado]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [sel, setSel]                 = useState<Set<string>>(new Set());

  const stats = {
    total:     data.length,
    presentes: data.filter(e => e.presentes > 0).length,
    tardanzas: data.reduce((s, e) => s + e.tardanzas, 0),
    ausentes:  data.filter(e => e.presentes === 0).length,
  };

  const handleGenerar = () => {
    if (fechaInicio > fechaFin) { setError("La fecha de inicio no puede ser mayor a la final"); return; }
    setError(null); setSel(new Set());
    startTransition(async () => {
      const r = await fetchReporteRangoAction({ fechaInicio, fechaFin, horaEntrada, departamento });
      if (r.error) { setError(r.error); return; }
      setData(r.data ?? []); setFechas(r.fechas ?? []); setConsultado(true);
    });
  };

  const toggleSel = (id: string) => setSel(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const toggleAll = () => setSel(prev => prev.size === data.length ? new Set() : new Set(data.map(e => e.id)));

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Filters */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><Lbl>Desde</Lbl><input type="date" style={fSt} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
        <div><Lbl>Hasta</Lbl><input type="date" style={fSt} value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
        <div><Lbl>Hora entrada</Lbl><input type="time" style={{ ...fSt, fontFamily: "'DM Mono', monospace" }} value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} /></div>
        <div>
          <Lbl>Departamento</Lbl>
          <select style={fSt} value={departamento} onChange={e => setDepartamento(e.target.value)}>
            <option value="todos">Todos</option>
            {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button onClick={handleGenerar} disabled={isPending} style={{ ...btnP, alignSelf: "flex-end" }}>{isPending ? "Generando…" : "Generar reporte"}</button>
        {consultado && (
          <button onClick={() => exportCSV(data, fechas, sel, horaEntrada)} style={{ ...btnP, background: "var(--green)", alignSelf: "flex-end" }}>
            ⬇ {sel.size > 0 ? `Exportar (${sel.size} sel.)` : "Exportar Excel"}
          </button>
        )}
      </div>

      {error && <div style={{ padding: 12, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {consultado && !isPending && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <SC label="Total empleados" value={stats.total} color="var(--ink)" />
            <SC label="Presentes (≥1 día)" value={stats.presentes} color="#16a34a" />
            <SC label="Total tardanzas" value={stats.tardanzas} color="#a16207" />
            <SC label="Sin registro" value={stats.ausentes} color="var(--accent)" />
          </div>

          {/* Leyenda */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: STATUS_COLOR[k].bg, border: `1px solid ${STATUS_COLOR[k].color}`, display: "inline-block" }} />
                <span style={{ color: STATUS_COLOR[k].color, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {sel.size > 0 && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{sel.size} marcado{sel.size !== 1 ? "s" : ""}</span>}
          </div>

          {/* Table */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
            <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  <th style={{ ...thSt, width: 36 }}><input type="checkbox" checked={sel.size === data.length && data.length > 0} onChange={toggleAll} /></th>
                  <th style={thSt}>Empleado</th>
                  <th style={thSt}>Depto.</th>
                  {fechas.map(f => (
                    <th key={f} style={{ ...thSt, minWidth: 52, textAlign: "center" }}>
                      {new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" })}
                    </th>
                  ))}
                  <th style={{ ...thSt, textAlign: "center" }}>Pres.</th>
                  <th style={{ ...thSt, textAlign: "center" }}>Tard.</th>
                  <th style={{ ...thSt, textAlign: "center" }}>Aus.</th>
                  <th style={{ ...thSt, textAlign: "center" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--border)", background: sel.has(e.id) ? "rgba(200,71,42,0.04)" : "white" }}>
                    <td style={{ ...tdSt, textAlign: "center" }}><input type="checkbox" checked={sel.has(e.id)} onChange={() => toggleSel(e.id)} /></td>
                    <td style={tdSt}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{e.nombre}</div>
                      {e.codigo && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{e.codigo}</div>}
                    </td>
                    <td style={{ ...tdSt, fontSize: 11, color: "var(--muted-2)", whiteSpace: "nowrap" }}>{e.departamento}</td>
                    {fechas.map(f => {
                      const d = e.dias[f]; const s = d?.status ?? "no_registrado"; const c = STATUS_COLOR[s];
                      const hora = d?.entrada ? new Date(d.entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
                      return (
                        <td key={f} style={{ ...tdSt, textAlign: "center", padding: "10px 4px" }} title={hora ? `Entrada: ${hora}` : ""}>
                          <span style={{ display: "inline-block", padding: "2px 5px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color }}>
                            {s === "no_registrado" ? "—" : STATUS_LABEL[s]}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ ...tdSt, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#16a34a", fontWeight: 700 }}>{e.presentes}</td>
                    <td style={{ ...tdSt, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: e.tardanzas > 0 ? "#a16207" : "rgba(15,17,23,0.3)", fontWeight: 700 }}>{e.tardanzas}</td>
                    <td style={{ ...tdSt, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: e.ausentes > 0 ? "var(--accent)" : "rgba(15,17,23,0.3)", fontWeight: 700 }}>{e.ausentes}</td>
                    <td style={{ ...tdSt, textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: e.porcentaje >= 90 ? "#16a34a" : e.porcentaje >= 70 ? "#a16207" : "var(--accent)" }}>{e.porcentaje}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>Sin datos para el período</div>}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
            Tardanza = check-in después de las {horaEntrada} · Pasa el cursor sobre una celda para ver la hora de entrada
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared micro-components ─────────────────────────────────────────────────
function SC({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px", boxShadow: "0 1px 3px rgba(15,17,23,0.04)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{children}</label>;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const fSt: React.CSSProperties = { padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border-strong)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--card)", outline: "none" };
const iSt: React.CSSProperties = { ...fSt, width: "100%", boxSizing: "border-box" };
const btnP: React.CSSProperties = { padding: "10px 16px", background: "var(--accent)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnO: React.CSSProperties = { padding: "10px 16px", background: "var(--card)", color: "var(--ink)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const thSt: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const tdSt: React.CSSProperties = { padding: "11px 12px" };
