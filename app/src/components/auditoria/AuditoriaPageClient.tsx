"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAuditoriaResumenAction, type AuditoriaResumen } from "@/app/actions/auditoria";
import RequerimientosAuditoriaTab from "./RequerimientosAuditoriaTab";

interface EntidadOption  { id: string; nombre: string }
interface ContratoOption { id: string; nombre: string; entidad_id: string }

interface Props {
  entidades: EntidadOption[];
  contratos: ContratoOption[];
}

type TabType = "requerimientos" | "hallazgos";

export default function AuditoriaPageClient({ entidades, contratos }: Props) {
  const [tab, setTab]                     = useState<TabType>("requerimientos");
  const [selectedEntidad, setSelectedEntidad]   = useState(entidades[0]?.id ?? "");
  const [selectedContrato, setSelectedContrato] = useState("");
  const [resumen, setResumen]             = useState<AuditoriaResumen | null>(null);
  const [loading, setLoading]             = useState(false);

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

  const entidadNombre   = entidades.find((e) => e.id === selectedEntidad)?.nombre;
  const contratoNombre  = selectedContrato
    ? contratos.find((c) => c.id === selectedContrato)?.nombre
    : "Todos los contratos";

  return (
    <div>
      {/* Selectors + tab bar */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 20, overflow: "hidden" }}>
        {/* Selectors */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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

          {entidadNombre && (
            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginLeft: "auto" }}>
              {entidadNombre}
              {selectedContrato && contratoNombre ? ` · ${contratoNombre}` : ""}
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: "var(--surface)", padding: "0 20px", gap: 0 }}>
          {(["requerimientos", "hallazgos"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "11px 18px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "var(--ink)" : "var(--muted)",
                borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}`,
                marginBottom: -1,
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 6,
                transition: "color 0.15s",
              }}
            >
              {t === "requerimientos" ? "Requerimientos" : "Hallazgos"}
              {t === "hallazgos" && (
                <span style={{
                  fontSize: 9, padding: "1px 5px", borderRadius: 100,
                  background: "var(--surface-2)", color: "var(--muted)",
                  fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Próx.
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "requerimientos" ? (
        <RequerimientosAuditoriaTab
          resumen={resumen}
          loading={loading}
          entidadNombre={entidadNombre ?? "—"}
          contratoNombre={contratoNombre}
          sinEntidad={!selectedEntidad}
        />
      ) : (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "56px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
            Hallazgos
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'DM Mono', monospace", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            Próximamente — esta sección mostrará observaciones, nivel de riesgo (Alto / Medio / Bajo),
            importe observado y fuente de financiamiento por área
          </div>
        </div>
      )}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: "7px 10px", fontSize: 12,
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  background: "var(--card)", color: "var(--ink)",
  fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
  maxWidth: 300,
};
