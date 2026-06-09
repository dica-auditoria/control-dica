"use client";

import { useState, useTransition } from "react";
import { crearComunicadoAction, desactivarComunicadoAction, type Comunicado } from "@/app/actions/comunicados";

const TIPO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  info:         { bg: "rgba(37,99,168,0.1)",  color: "#1B4F8A", label: "Info"        },
  urgente:      { bg: "rgba(239,68,68,0.1)",  color: "#dc2626", label: "Urgente"     },
  recordatorio: { bg: "rgba(234,179,8,0.12)", color: "#a16207", label: "Recordatorio" },
};

export default function ComunicadosView({ comunicados: inicial, esAdmin }: { comunicados: Comunicado[]; esAdmin: boolean }) {
  const [lista, setLista]       = useState(inicial);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo]     = useState("");
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo]         = useState<Comunicado["tipo"]>("info");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCrear = () => {
    if (!titulo.trim() || !contenido.trim()) { setFormError("Título y contenido son obligatorios"); return; }
    setFormError(null);
    startTransition(async () => {
      const r = await crearComunicadoAction({ titulo, contenido, tipo });
      if (r.error) { setFormError(r.error); return; }
      setShowForm(false); setTitulo(""); setContenido(""); setTipo("info");
    });
  };

  const handleArchivar = (id: string) => {
    startTransition(async () => {
      const r = await desactivarComunicadoAction(id);
      if (!r.error) setLista(prev => prev.filter(c => c.id !== id));
    });
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Comunicados</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {esAdmin ? "Publica anuncios para todo el equipo" : "Anuncios internos del equipo DICA"}
          </p>
        </div>
        {esAdmin && (
          <button onClick={() => setShowForm(v => !v)} style={{
            padding: "8px 18px", background: "#1B4F8A", color: "white",
            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            {showForm ? "Cancelar" : "+ Nuevo comunicado"}
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>Nuevo comunicado</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 200px" }}>
              <label style={lbl}>Título</label>
              <input style={inp} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Asunto del comunicado" />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={lbl}>Tipo</label>
              <select style={inp} value={tipo} onChange={e => setTipo(e.target.value as Comunicado["tipo"])}>
                <option value="info">Info</option>
                <option value="urgente">Urgente</option>
                <option value="recordatorio">Recordatorio</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Contenido</label>
            <textarea style={{ ...inp, height: 100, resize: "vertical" }} value={contenido} onChange={e => setContenido(e.target.value)} placeholder="Escribe el mensaje para el equipo..." />
          </div>
          {formError && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", color: "#dc2626", borderRadius: 4, fontSize: 12, marginBottom: 12 }}>{formError}</div>}
          <button onClick={handleCrear} disabled={isPending} style={{
            padding: "9px 20px", background: "#1B4F8A", color: "white",
            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.7 : 1,
          }}>
            {isPending ? "Publicando…" : "Publicar"}
          </button>
        </div>
      )}

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>
          No hay comunicados activos
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map(c => {
            const st = TIPO_STYLE[c.tipo] ?? TIPO_STYLE.info;
            return (
              <div key={c.id} style={{
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
                padding: "16px 20px",
                borderLeft: `4px solid ${st.color}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 9, fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", ...st }}>
                        {st.label.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                        {fmtDate(c.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{c.titulo}</div>
                    <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.contenido}</div>
                  </div>
                  {esAdmin && (
                    <button onClick={() => handleArchivar(c.id)} title="Archivar" style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "var(--muted)", padding: 4, borderRadius: 4, flexShrink: 0,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
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

const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: 13, background: "var(--surface)", color: "var(--ink)", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" };
