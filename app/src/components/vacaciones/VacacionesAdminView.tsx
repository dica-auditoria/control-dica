"use client";

import { useState, useTransition } from "react";
import {
  aprobarVacacionesAction, rechazarVacacionesAction,
  type SolicitudVacacion,
} from "@/app/actions/vacaciones";
import { TIPO_LABEL } from "@/lib/vacaciones/constants";

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "rgba(234,179,8,0.12)",  color: "#a16207", label: "Pendiente" },
  aprobado:  { bg: "rgba(34,197,94,0.12)",  color: "#16a34a", label: "Aprobado"  },
  rechazado: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", label: "Rechazado" },
  cancelado: { bg: "rgba(15,17,23,0.06)",   color: "var(--muted)", label: "Cancelado" },
};

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

export default function VacacionesAdminView({ solicitudes: inicial }: { solicitudes: SolicitudVacacion[] }) {
  const [filtro, setFiltro]       = useState<string>("pendiente");
  const [comentario, setComentario] = useState<Record<string, string>>({});
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const lista = filtro === "todos" ? inicial : inicial.filter(s => s.estado === filtro);

  const pendientes = inicial.filter(s => s.estado === "pendiente").length;

  const handleAprobar = (id: string) => {
    setError(null);
    startTransition(async () => {
      const r = await aprobarVacacionesAction(id, comentario[id]);
      if (r.error) setError(r.error);
    });
  };

  const handleRechazar = (id: string) => {
    const c = comentario[id]?.trim();
    if (!c) { setError("Escribe un motivo de rechazo"); return; }
    setError(null);
    startTransition(async () => {
      const r = await rechazarVacacionesAction(id, c);
      if (r.error) setError(r.error);
      else setRechazando(null);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>
            Vacaciones y Permisos
            {pendientes > 0 && (
              <span style={{ marginLeft: 10, fontSize: 13, background: "#fef3c7", color: "#a16207", padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
                {pendientes} pendiente{pendientes > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Gestión de solicitudes del equipo</p>
        </div>
        {/* Filtro */}
        <div style={{ display: "flex", gap: 6 }}>
          {["pendiente", "aprobado", "rechazado", "todos"].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: "6px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em",
              background: filtro === f ? "#1B4F8A" : "var(--surface)",
              color: filtro === f ? "white" : "var(--muted)",
              border: filtro === f ? "1px solid #1B4F8A" : "1px solid var(--border-strong)",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", color: "#dc2626", borderRadius: 4, fontSize: 12 }}>{error}</div>}

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>
          No hay solicitudes {filtro !== "todos" ? `con estado "${filtro}"` : ""}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map(s => {
            const emp  = s.empleado;
            const nombre = emp ? `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno}`.trim() : "—";
            const st   = ESTADO_STYLE[s.estado] ?? ESTADO_STYLE.pendiente;
            const isRechazandoThis = rechazando === s.id;

            return (
              <div key={s.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{nombre}</span>
                      {emp?.departamento && (
                        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono', monospace", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 3 }}>
                          {emp.departamento}
                        </span>
                      )}
                      <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", ...st }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                      <InfoPill label="Tipo"   value={TIPO_LABEL[s.tipo]} />
                      <InfoPill label="Desde"  value={fmtDate(s.fecha_inicio)} />
                      <InfoPill label="Hasta"  value={fmtDate(s.fecha_fin)} />
                      <InfoPill label="Días"   value={String(s.dias_habiles)} mono />
                    </div>
                    {s.motivo && (
                      <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 8, fontStyle: "italic" }}>
                        "{s.motivo}"
                      </div>
                    )}
                    {s.comentario_rrhh && s.estado !== "pendiente" && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                        <strong>Comentario RRHH:</strong> {s.comentario_rrhh}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  {s.estado === "pendiente" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
                      {!isRechazandoThis ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleAprobar(s.id)} disabled={isPending} style={{
                            flex: 1, padding: "7px 0", background: "#16a34a", color: "white",
                            border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>Aprobar</button>
                          <button onClick={() => setRechazando(s.id)} style={{
                            flex: 1, padding: "7px 0", background: "transparent",
                            border: "1px solid #dc2626", color: "#dc2626",
                            borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>Rechazar</button>
                        </div>
                      ) : (
                        <>
                          <textarea
                            placeholder="Motivo del rechazo (obligatorio)"
                            value={comentario[s.id] ?? ""}
                            onChange={e => setComentario(prev => ({ ...prev, [s.id]: e.target.value }))}
                            style={{ padding: "7px 10px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: 12, resize: "vertical", height: 64, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleRechazar(s.id)} disabled={isPending} style={{
                              flex: 1, padding: "6px 0", background: "#dc2626", color: "white",
                              border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}>Confirmar rechazo</button>
                            <button onClick={() => setRechazando(null)} style={{
                              padding: "6px 12px", background: "transparent", border: "1px solid var(--border-strong)",
                              borderRadius: 5, fontSize: 12, cursor: "pointer", color: "var(--muted)",
                            }}>Cancelar</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: 9, color: "var(--muted)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label} </span>
      <span style={{ fontSize: 12, color: "var(--ink)", fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
