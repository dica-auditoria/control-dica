"use client";

import { useState } from "react";
import React from "react";
import type { AuditoriaResumen } from "@/app/actions/auditoria";

type SortKey = "area" | "total" | "porcentaje";

interface Props {
  resumen:        AuditoriaResumen | null;
  loading:        boolean;
  entidadNombre:  string;
  contratoNombre?: string;
  sinEntidad:     boolean;
}

export default function RequerimientosAuditoriaTab({
  resumen, loading, entidadNombre, contratoNombre, sinEntidad,
}: Props) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey]             = useState<SortKey>("total");
  const [sortAsc, setSortAsc]             = useState(false);

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key === "area"); }
  };

  if (sinEntidad) return (
    <Empty>Selecciona una empresa para ver el resumen de requerimientos</Empty>
  );

  if (loading) return <Empty>Cargando…</Empty>;

  if (!resumen || resumen.totalItems === 0) return (
    <Empty>
      Sin reactivos registrados para {entidadNombre}
      {contratoNombre ? ` — ${contratoNombre}` : ""}
    </Empty>
  );

  const faltantes = resumen.totalItems - resumen.completados;

  const sortedAreas = [...resumen.areas].sort((a, b) => {
    let v = 0;
    if (sortKey === "area")       v = a.area.localeCompare(b.area);
    else if (sortKey === "total") v = b.total - a.total;
    else                          v = b.porcentaje - a.porcentaje;
    return sortAsc ? -v : v;
  });

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Reactivos Totales"
          value={resumen.totalItems}
          sub={`en ${resumen.totalRequerimientos} requerimiento${resumen.totalRequerimientos !== 1 ? "s" : ""}`}
          color="var(--ink)"
        />
        <StatCard
          label="Reactivos Entregados"
          value={resumen.completados}
          sub={`${resumen.porcentaje}% completado`}
          color="var(--green)"
        />
        <StatCard
          label="Reactivos Faltantes"
          value={faltantes}
          sub={resumen.enRevision > 0 ? `${resumen.enRevision} en revisión` : faltantes === 0 ? "Todos entregados" : "Sin entregar"}
          color={faltantes === 0 ? "var(--green)" : "var(--accent)"}
        />
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Progreso de entrega
          </span>
          <span style={{
            fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono', monospace",
            color: pctColor(resumen.porcentaje),
          }}>
            {resumen.porcentaje}%
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 5, transition: "width 0.5s",
            width: `${resumen.porcentaje}%`,
            background: pctBar(resumen.porcentaje),
          }} />
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--green)" }}>
            ● {resumen.completados} entregados
          </span>
          {resumen.enRevision > 0 && (
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#92400E" }}>
              ● {resumen.enRevision} en revisión
            </span>
          )}
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
            ● {resumen.pendientes} pendientes
          </span>
        </div>
      </div>

      {/* Table */}
      {sortedAreas.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th style={{ width: 44, padding: "10px 0" }} />
                <ThCol label="Área"      sortKey="area"       current={sortKey} asc={sortAsc} onSort={handleSort} align="left" />
                <ThCol label="Reactivos" sortKey="total"      current={sortKey} asc={sortAsc} onSort={handleSort} align="right" width={110} />
                <ThCol label="Entrega %" sortKey="porcentaje" current={sortKey} asc={sortAsc} onSort={handleSort} align="right" width={160} />
              </tr>
            </thead>
            <tbody>
              {sortedAreas.map((area) => {
                const isExpanded = expandedAreas.has(area.area);
                return (
                  <React.Fragment key={area.area}>
                    {/* Área row */}
                    <tr
                      onClick={() => toggleArea(area.area)}
                      style={{ cursor: "pointer", borderTop: "1px solid var(--border)", background: isExpanded ? "var(--surface)" : "transparent" }}
                    >
                      <td style={{ padding: "11px 0", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", width: 18, height: 18,
                          lineHeight: "18px", textAlign: "center",
                          fontSize: 16, color: "var(--muted)",
                          transform: isExpanded ? "rotate(45deg)" : "none",
                          transition: "transform 0.2s",
                        }}>
                          ⊕
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {area.area}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
                        {area.total}
                      </td>
                      <td style={{ padding: "11px 20px 11px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                          <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${area.porcentaje}%`, background: pctBar(area.porcentaje) }} />
                          </div>
                          <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, minWidth: 38, textAlign: "right", color: pctColor(area.porcentaje) }}>
                            {area.porcentaje}%
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded: requerimientos within this area */}
                    {isExpanded && area.requerimientos.map((req) => (
                      <tr key={req.id} style={{ borderTop: "1px solid var(--border)", background: "rgba(15,17,23,0.018)" }}>
                        <td style={{ padding: "8px 0" }} />
                        <td style={{ padding: "8px 14px 8px 36px", fontSize: 12, color: "var(--muted-2)", maxWidth: 0 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--muted)", marginRight: 6 }}>↳</span>
                            {req.titulo}
                          </div>
                          {(req.enRevision > 0 || req.pendientes > 0) && (
                            <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                              {req.enRevision > 0 && (
                                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#92400E" }}>
                                  {req.enRevision} en revisión
                                </span>
                              )}
                              {req.pendientes > 0 && (
                                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                                  {req.pendientes} pendiente{req.pendientes !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "8px 14px", textAlign: "right", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                          {req.completados}/{req.total}
                        </td>
                        <td style={{ padding: "8px 20px 8px 14px", textAlign: "right" }}>
                          <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: pctColor(req.porcentaje) }}>
                            {req.porcentaje}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctColor(p: number): string {
  if (p === 100) return "var(--green)";
  if (p >= 60)   return "#a16207";
  return "var(--accent)";
}

function pctBar(p: number): string {
  if (p === 100) return "var(--green)";
  if (p >= 60)   return "#F59E0B";
  return "var(--accent)";
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
        {sub}
      </div>
    </div>
  );
}

function ThCol({
  label, sortKey: key, current, asc, onSort, align, width,
}: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean;
  onSort: (k: SortKey) => void; align?: "left" | "right"; width?: number;
}) {
  const isActive = current === key;
  return (
    <th
      onClick={() => onSort(key)}
      style={{
        padding: "10px 14px",
        fontSize: 10, fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: isActive ? "var(--ink)" : "var(--muted)",
        cursor: "pointer", userSelect: "none", fontWeight: 600,
        textAlign: align ?? "left",
        ...(width ? { width } : {}),
      }}
    >
      {label}{isActive ? (asc ? " ↑" : " ↓") : ""}
    </th>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
        {children}
      </div>
    </div>
  );
}
