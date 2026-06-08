"use client";

import { useState, useTransition } from "react";
import { fetchReporteRangoAction, type ReporteEmpleado } from "@/app/actions/asistencia";
import { DEPARTAMENTOS } from "@/lib/empleados/constants";

const STATUS_LABEL: Record<string, string> = {
  a_tiempo: "A Tiempo",
  tardanza: "Tardanza",
  no_registrado: "No Reg.",
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  a_tiempo:      { bg: "rgba(34,197,94,0.12)",  color: "#16a34a" },
  tardanza:      { bg: "rgba(234,179,8,0.15)",  color: "#a16207" },
  no_registrado: { bg: "rgba(15,17,23,0.06)",   color: "var(--muted)" },
};

function exportCSV(empleados: ReporteEmpleado[], fechas: string[], seleccionados: Set<string>, horaEntrada: string) {
  const filas: string[][] = [];
  const lista = seleccionados.size > 0 ? empleados.filter(e => seleccionados.has(e.id)) : empleados;

  // Header row
  const header = ["Nombre", "Código", "Departamento", ...fechas.map(f => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" })), "Presentes", "Tardanzas", "Ausentes", "% Asistencia"];
  filas.push(header);

  for (const e of lista) {
    const row: string[] = [e.nombre, e.codigo ?? "", e.departamento];
    for (const f of fechas) {
      const d = e.dias[f];
      row.push(d ? STATUS_LABEL[d.status] : "");
    }
    row.push(String(e.presentes), String(e.tardanzas), String(e.ausentes), `${e.porcentaje}%`);
    filas.push(row);
  }

  // Summary row
  filas.push([]);
  filas.push([`Reporte generado: ${new Date().toLocaleString("es-MX")}`, `Hora entrada: ${horaEntrada}`, seleccionados.size > 0 ? `(${seleccionados.size} empleados seleccionados)` : `(todos los empleados)`, ""]);

  const csv = filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const desde = fechas[0] ?? "";
  const hasta = fechas[fechas.length - 1] ?? "";
  a.href = url;
  a.download = `asistencia_${desde}_${hasta}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesView() {
  const hoy = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin]       = useState(hoy);
  const [horaEntrada, setHoraEntrada] = useState("09:00");
  const [departamento, setDepartamento] = useState("todos");
  const [empleados, setEmpleados]     = useState<ReporteEmpleado[]>([]);
  const [fechas, setFechas]           = useState<string[]>([]);
  const [consultado, setConsultado]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const stats = {
    total:    empleados.length,
    presentes: empleados.filter(e => e.presentes > 0).length,
    tardanzas: empleados.reduce((s, e) => s + e.tardanzas, 0),
    ausentes:  empleados.filter(e => e.presentes === 0).length,
  };

  const handleGenerar = () => {
    if (fechaInicio > fechaFin) { setError("La fecha de inicio no puede ser mayor a la final"); return; }
    setError(null);
    setSeleccionados(new Set());
    startTransition(async () => {
      const r = await fetchReporteRangoAction({ fechaInicio, fechaFin, horaEntrada, departamento });
      if (r.error) { setError(r.error); return; }
      setEmpleados(r.data ?? []);
      setFechas(r.fechas ?? []);
      setConsultado(true);
    });
  };

  const toggleSel = (id: string) => setSeleccionados(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const toggleAll = () => setSeleccionados(prev =>
    prev.size === empleados.length ? new Set() : new Set(empleados.map(e => e.id))
  );

  return (
    <>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Reportes de Asistencia</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Rango de fechas · Tardanzas · Exportar Excel</p>
        </div>
        {consultado && (
          <button onClick={() => exportCSV(empleados, fechas, seleccionados, horaEntrada)} style={btnPrimary}>
            ⬇ Exportar {seleccionados.size > 0 ? `(${seleccionados.size} sel.)` : "Excel"}
          </button>
        )}
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Filtros */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px", marginBottom: 20, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={lbl}>Desde</label>
            <input type="date" style={iSt} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Hasta</label>
            <input type="date" style={iSt} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Hora de entrada</label>
            <input type="time" style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Departamento</label>
            <select style={iSt} value={departamento} onChange={e => setDepartamento(e.target.value)}>
              <option value="todos">Todos</option>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={handleGenerar} disabled={isPending} style={{ ...btnPrimary, alignSelf: "flex-end" }}>
            {isPending ? "Generando…" : "Generar reporte"}
          </button>
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
            <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLOR[k].bg, border: `1px solid ${STATUS_COLOR[k].color}`, display: "inline-block" }} />
                  <span style={{ color: STATUS_COLOR[k].color, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              {seleccionados.size > 0 && (
                <span style={{ fontSize: 12, color: "var(--muted-2)", marginLeft: "auto" }}>
                  {seleccionados.size} empleado{seleccionados.size !== 1 ? "s" : ""} marcado{seleccionados.size !== 1 ? "s" : ""} para exportar
                </span>
              )}
            </div>

            {/* Tabla */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead>
                  <tr style={{ background: "var(--surface)" }}>
                    <th style={{ ...thSt, width: 36 }}>
                      <input type="checkbox" checked={seleccionados.size === empleados.length && empleados.length > 0} onChange={toggleAll} />
                    </th>
                    <th style={thSt}>Empleado</th>
                    <th style={thSt}>Depto.</th>
                    {fechas.map(f => (
                      <th key={f} style={{ ...thSt, minWidth: 56, textAlign: "center" }}>
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
                  {empleados.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--border)", background: seleccionados.has(e.id) ? "rgba(200,71,42,0.04)" : "white" }}>
                      <td style={{ ...tdSt, textAlign: "center" }}>
                        <input type="checkbox" checked={seleccionados.has(e.id)} onChange={() => toggleSel(e.id)} />
                      </td>
                      <td style={tdSt}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{e.nombre}</div>
                        {e.codigo && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{e.codigo}</div>}
                      </td>
                      <td style={{ ...tdSt, fontSize: 11, color: "var(--muted-2)", whiteSpace: "nowrap" }}>{e.departamento}</td>
                      {fechas.map(f => {
                        const d = e.dias[f];
                        const s = d?.status ?? "no_registrado";
                        const c = STATUS_COLOR[s];
                        return (
                          <td key={f} style={{ ...tdSt, textAlign: "center", padding: "10px 6px" }} title={d?.entrada ? `Entrada: ${new Date(d.entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : ""}>
                            <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
                              {STATUS_LABEL[s].replace("No Reg.", "—")}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ ...tdSt, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#16a34a", fontWeight: 700 }}>{e.presentes}</td>
                      <td style={{ ...tdSt, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: e.tardanzas > 0 ? "#a16207" : "var(--muted)", fontWeight: 700 }}>{e.tardanzas}</td>
                      <td style={{ ...tdSt, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12, color: e.ausentes > 0 ? "var(--accent)" : "var(--muted)", fontWeight: 700 }}>{e.ausentes}</td>
                      <td style={{ ...tdSt, textAlign: "center" }}>
                        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: e.porcentaje >= 90 ? "#16a34a" : e.porcentaje >= 70 ? "#a16207" : "var(--accent)" }}>
                          {e.porcentaje}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {empleados.length === 0 && (
                <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                  Sin empleados activos en el período seleccionado
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
              Tardanza: check-in después de las {horaEntrada} · Pasa el cursor sobre una celda para ver la hora exacta de entrada
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SC({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px", boxShadow: "0 1px 3px rgba(15,17,23,0.04)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };
const iSt: React.CSSProperties = { padding: "9px 12px", fontSize: 13, border: "1.5px solid var(--border-strong)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--card)", outline: "none" };
const btnPrimary: React.CSSProperties = { padding: "10px 18px", background: "var(--accent)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const thSt: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const tdSt: React.CSSProperties = { padding: "11px 12px" };
