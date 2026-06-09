"use client";

import { useState, useTransition } from "react";
import {
  solicitarVacacionesAction, cancelarVacacionesAction,
  type SolicitudVacacion, type TipoVacacion,
} from "@/app/actions/vacaciones";
import { TIPO_LABEL } from "@/lib/vacaciones/constants";

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "rgba(234,179,8,0.12)",  color: "#a16207", label: "Pendiente" },
  aprobado:  { bg: "rgba(34,197,94,0.12)",  color: "#16a34a", label: "Aprobado"  },
  rechazado: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", label: "Rechazado" },
  cancelado: { bg: "rgba(15,17,23,0.06)",   color: "var(--muted)", label: "Cancelado" },
};

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

export default function MisVacacionesView({ solicitudes }: { solicitudes: SolicitudVacacion[] }) {
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo]         = useState<TipoVacacion>("vacaciones");
  const [inicio, setInicio]     = useState("");
  const [fin, setFin]           = useState("");
  const [motivo, setMotivo]     = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hoy = new Date().toISOString().split("T")[0];

  const handleSolicitar = () => {
    setFormError(null);
    if (!inicio || !fin) { setFormError("Selecciona las fechas"); return; }
    if (inicio > fin)    { setFormError("La fecha de inicio no puede ser mayor a la de fin"); return; }
    startTransition(async () => {
      const r = await solicitarVacacionesAction({ tipo, fecha_inicio: inicio, fecha_fin: fin, motivo: motivo || undefined });
      if (r.error) { setFormError(r.error); return; }
      setShowForm(false);
      setInicio(""); setFin(""); setMotivo(""); setTipo("vacaciones");
    });
  };

  const handleCancelar = (id: string) => {
    startTransition(async () => {
      await cancelarVacacionesAction(id);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Mis Vacaciones</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Solicitudes de vacaciones y permisos
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{
          padding: "8px 18px", background: "#1B4F8A", color: "white",
          border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          {showForm ? "Cancelar" : "+ Nueva solicitud"}
        </button>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>Nueva solicitud</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
            <div style={{ flex: "1 1 160px" }}>
              <label style={lbl}>Tipo</label>
              <select style={inp} value={tipo} onChange={e => setTipo(e.target.value as TipoVacacion)}>
                {(Object.entries(TIPO_LABEL) as [TipoVacacion, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>Desde</label>
              <input type="date" style={inp} min={hoy} value={inicio} onChange={e => setInicio(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label style={lbl}>Hasta</label>
              <input type="date" style={inp} min={inicio || hoy} value={fin} onChange={e => setFin(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Motivo (opcional)</label>
            <textarea style={{ ...inp, height: 72, resize: "vertical" }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Describe brevemente el motivo..." />
          </div>
          {formError && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", color: "#dc2626", borderRadius: 4, fontSize: 12, marginBottom: 12 }}>{formError}</div>}
          <button onClick={handleSolicitar} disabled={isPending} style={{
            padding: "9px 20px", background: "#1B4F8A", color: "white",
            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.7 : 1,
          }}>
            {isPending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      )}

      {/* Lista */}
      {solicitudes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>
          No tienes solicitudes registradas
        </div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Tipo", "Fechas", "Días", "Estado", "Comentario", ""].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(s => {
                const st = ESTADO_STYLE[s.estado] ?? ESTADO_STYLE.pendiente;
                return (
                  <tr key={s.id}>
                    <td style={td}><span style={{ fontSize: 12, fontWeight: 500 }}>{TIPO_LABEL[s.tipo]}</span></td>
                    <td style={td}>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
                        {fmtDate(s.fecha_inicio)} → {fmtDate(s.fecha_fin)}
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace" }}>{s.dias_habiles}</span>
                    </td>
                    <td style={td}>
                      <span style={{ padding: "3px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", ...st }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 200 }}>
                      {s.comentario_rrhh && (
                        <span style={{ fontSize: 11, color: "var(--muted-2)", fontStyle: "italic" }}>{s.comentario_rrhh}</span>
                      )}
                    </td>
                    <td style={td}>
                      {s.estado === "pendiente" && (
                        <button onClick={() => handleCancelar(s.id)} style={{
                          padding: "4px 10px", background: "transparent", border: "1px solid var(--border-strong)",
                          borderRadius: 4, fontSize: 11, cursor: "pointer", color: "var(--muted)",
                        }}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: 13, background: "var(--surface)", color: "var(--ink)", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" };
const th: React.CSSProperties  = { padding: "10px 16px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties  = { padding: "12px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" };
