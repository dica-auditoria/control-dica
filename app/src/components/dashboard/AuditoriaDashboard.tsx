"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAuditoriaResumenAction, type AuditoriaResumen } from "@/app/actions/auditoria";

interface EntidadOption { id: string; nombre: string }
interface ContratoOption { id: string; nombre: string; entidad_id: string }

interface Props {
  entidades: EntidadOption[];
  contratos: ContratoOption[];
}

export default function AuditoriaDashboard({ entidades, contratos }: Props) {
  const [selectedEntidad, setSelectedEntidad] = useState(entidades[0]?.id ?? "");
  const [selectedContrato, setSelectedContrato] = useState("");
  const [resumen, setResumen] = useState<AuditoriaResumen | null>(null);
  const [loading, setLoading] = useState(false);

  const contratosDisponibles = contratos.filter(
    (c) => !selectedEntidad || c.entidad_id === selectedEntidad,
  );

  const cargar = useCallback(async (entidadId: string, contratoId: string) => {
    if (!entidadId) { setResumen(null); return; }
    setLoading(true);
    const result = await fetchAuditoriaResumenAction(entidadId, contratoId || null);
    setResumen(result.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar(selectedEntidad, selectedContrato);
  }, [selectedEntidad, selectedContrato, cargar]);

  const entidadNombre = entidades.find((e) => e.id === selectedEntidad)?.nombre ?? "—";
  const contratoNombre = selectedContrato
    ? contratos.find((c) => c.id === selectedContrato)?.nombre
    : "Todos los contratos";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)", marginBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Auditoría</div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 1 }}>
            Progreso de requerimientos y entrega por área
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selectedEntidad}
            onChange={(e) => { setSelectedEntidad(e.target.value); setSelectedContrato(""); }}
            style={selStyle}
          >
            <option value="">— Selecciona empresa —</option>
            {entidades.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          {contratosDisponibles.length > 0 && (
            <select
              value={selectedContrato}
              onChange={(e) => setSelectedContrato(e.target.value)}
              style={selStyle}
            >
              <option value="">Todos los contratos</option>
              {contratosDisponibles.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 20px" }}>
        {!selectedEntidad ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            Selecciona una empresa para ver el resumen de auditoría
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            Cargando…
          </div>
        ) : !resumen || resumen.totalItems === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            Sin reactivos registrados para {entidadNombre} — {contratoNombre}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
              <StatMini label="Requerimientos" value={resumen.totalRequerimientos} color="var(--ink)" />
              <StatMini label="Reactivos" value={resumen.totalItems} color="var(--ink)" />
              <StatMini label="Entregados" value={resumen.completados} color="var(--green)" />
              <StatMini label="En revisión" value={resumen.enRevision} color="#92400E" />
              <StatMini label="Pendientes" value={resumen.pendientes} color="var(--muted-2)" />
              <StatMini label="% Avance" value={`${resumen.porcentaje}%`} color={resumen.porcentaje === 100 ? "var(--green)" : resumen.porcentaje >= 60 ? "#a16207" : "var(--accent)"} />
            </div>

            {/* Barra de progreso general */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Progreso de entrega
                </span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                  {resumen.completados} entregados · {resumen.pendientes} faltantes
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 4, transition: "width 0.5s",
                  width: `${resumen.porcentaje}%`,
                  background: resumen.porcentaje === 100 ? "var(--green)" : resumen.porcentaje >= 60 ? "#F59E0B" : "var(--accent)",
                }} />
              </div>
            </div>

            {/* Progreso por Área */}
            {resumen.areas.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                  Progreso por área
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {resumen.areas.map((a) => (
                    <div key={a.area}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                          {a.area}
                        </span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                            {a.completados}/{a.total}
                          </span>
                          <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700, minWidth: 32, textAlign: "right", color: a.porcentaje === 100 ? "var(--green)" : a.porcentaje >= 60 ? "#a16207" : "var(--accent)" }}>
                            {a.porcentaje}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3, transition: "width 0.4s",
                          width: `${a.porcentaje}%`,
                          background: a.porcentaje === 100 ? "var(--green)" : a.porcentaje >= 60 ? "#F59E0B" : "var(--accent)",
                        }} />
                      </div>
                      {(a.enRevision > 0 || a.pendientes > 0) && (
                        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                          {a.enRevision > 0 && (
                            <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#92400E" }}>
                              {a.enRevision} en revisión
                            </span>
                          )}
                          {a.pendientes > 0 && (
                            <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                              {a.pendientes} pendiente{a.pendientes !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 6, padding: "10px 14px", textAlign: "center" }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: "7px 10px", fontSize: 12,
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  background: "var(--card)", color: "var(--ink)",
  fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  maxWidth: 260,
};
