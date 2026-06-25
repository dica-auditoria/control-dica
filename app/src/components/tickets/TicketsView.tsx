"use client";

import { useState, useTransition } from "react";
import { crearTicketAction, actualizarTicketAction, type Ticket, type TicketTipo, type TicketEstado, type TicketPrioridad } from "@/app/actions/tickets";

const TIPO_META: Record<TicketTipo, { label: string; color: string; bg: string }> = {
  computadora: { label: "Computadora", color: "#1B4F8A", bg: "rgba(37,99,168,0.1)" },
  plataforma:  { label: "Plataforma",  color: "#6B21A8", bg: "rgba(107,33,168,0.1)" },
  sugerencia:  { label: "Sugerencia",  color: "#166534", bg: "rgba(22,101,52,0.1)" },
  otro:        { label: "Otro",        color: "#92400E", bg: "rgba(146,64,14,0.1)" },
};

const ESTADO_META: Record<TicketEstado, { label: string; color: string; bg: string }> = {
  abierto:    { label: "Abierto",     color: "#92400E", bg: "rgba(251,191,36,0.15)" },
  en_proceso: { label: "En proceso",  color: "#1B4F8A", bg: "rgba(37,99,168,0.1)" },
  resuelto:   { label: "Resuelto",    color: "#166534", bg: "rgba(22,101,52,0.1)" },
};

const PRIORIDAD_META: Record<TicketPrioridad, { label: string; color: string }> = {
  baja:  { label: "Baja",  color: "#6B7280" },
  media: { label: "Media", color: "#92400E" },
  alta:  { label: "Alta",  color: "#DC2626" },
};

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 100, color, background: bg }}>
      {text}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Modal Nuevo Ticket ─────────────────────────────────────────────────────────

function NuevoTicketModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [tipo, setTipo]       = useState<TicketTipo>("plataforma");
  const [titulo, setTitulo]   = useState("");
  const [desc, setDesc]       = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGuardar = () => {
    if (!titulo.trim() || !desc.trim()) { setError("Completa todos los campos"); return; }
    setError(null);
    startTransition(async () => {
      const r = await crearTicketAction({ tipo, titulo, descripcion: desc });
      if (r.error) { setError(r.error ?? null); return; }
      onCreado();
    });
  };

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Nuevo ticket</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Reporta un problema o envía una sugerencia</div>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Tipo <span style={{ color: "var(--accent)" }}>*</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["computadora", "plataforma", "sugerencia", "otro"] as TicketTipo[]).map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  style={{ padding: "8px 10px", border: `1.5px solid ${tipo === t ? TIPO_META[t].color : "var(--border-strong)"}`, borderRadius: 6, background: tipo === t ? TIPO_META[t].bg : "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: tipo === t ? TIPO_META[t].color : "var(--muted-2)", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                  {TIPO_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Asunto <span style={{ color: "var(--accent)" }}>*</span></label>
            <input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Describe brevemente el problema o sugerencia" style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Descripción <span style={{ color: "var(--accent)" }}>*</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalla qué ocurrió, cuándo, y si hay algún mensaje de error…" rows={4}
              style={{ ...inp, resize: "vertical" }} />
          </div>
          {error && <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>{error}</div>}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={!titulo.trim() || !desc.trim() || isPending}
            style={{ padding: "8px 20px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!titulo.trim() || !desc.trim() || isPending) ? 0.5 : 1 }}>
            {isPending ? "Enviando…" : "Enviar ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel Respuesta Admin ──────────────────────────────────────────────────────

function PanelRespuesta({ ticket, onActualizado }: { ticket: Ticket; onActualizado: () => void }) {
  const [respuesta, setRespuesta]   = useState(ticket.respuesta ?? "");
  const [estado, setEstado]         = useState<TicketEstado>(ticket.estado);
  const [prioridad, setPrioridad]   = useState<TicketPrioridad>(ticket.prioridad);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleGuardar = async () => {
    setSaving(true); setError(null);
    const r = await actualizarTicketAction(ticket.id, { estado, prioridad, respuesta: respuesta.trim() || undefined });
    setSaving(false);
    if (r.error) { setError(r.error ?? null); return; }
    onActualizado();
  };

  const selSt: React.CSSProperties = { padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, background: "var(--surface)", color: "var(--ink)", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" };

  return (
    <div style={{ padding: "14px 16px", background: "var(--surface)", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Gestión del ticket</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Estado</label>
          <select value={estado} onChange={e => setEstado(e.target.value as TicketEstado)} style={selSt}>
            <option value="abierto">Abierto</option>
            <option value="en_proceso">En proceso</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Prioridad</label>
          <select value={prioridad} onChange={e => setPrioridad(e.target.value as TicketPrioridad)} style={selSt}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Respuesta al usuario</label>
        <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} placeholder="Escribe la respuesta o resolución…" rows={3}
          style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      </div>
      {error && <div style={{ fontSize: 12, color: "var(--accent)" }}>{error}</div>}
      <button onClick={handleGuardar} disabled={saving}
        style={{ alignSelf: "flex-end", padding: "7px 16px", background: "#1B4F8A", color: "white", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────

export default function TicketsView({ tickets: inicial, esAdmin }: { tickets: Ticket[]; esAdmin: boolean }) {
  const [tickets, setTickets]       = useState(inicial);
  const [showForm, setShowForm]     = useState(false);
  const [expandido, setExpandido]   = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<TicketEstado | "todos">("todos");
  const [filtroTipo, setFiltroTipo]     = useState<TicketTipo | "todos">("todos");

  const filtrados = tickets
    .filter(t => filtroEstado === "todos" || t.estado === filtroEstado)
    .filter(t => filtroTipo === "todos" || t.tipo === filtroTipo);

  const abiertos = tickets.filter(t => t.estado === "abierto").length;

  const handleCreado = () => {
    setShowForm(false);
    window.location.reload();
  };

  const handleActualizado = () => {
    window.location.reload();
  };

  const tabSt = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px", border: "none", background: active ? "var(--ink)" : "var(--surface)", color: active ? "white" : "var(--muted-2)", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>
            {esAdmin ? "Tickets de soporte" : "Mis tickets"}
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {esAdmin
              ? `${abiertos} ticket${abiertos !== 1 ? "s" : ""} abierto${abiertos !== 1 ? "s" : ""} pendiente${abiertos !== 1 ? "s" : ""}`
              : "Reporta problemas o envía sugerencias al equipo de sistemas"}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 18px", background: "#1B4F8A", color: "white", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Nuevo ticket
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 3, borderRadius: 6, border: "1px solid var(--border)" }}>
          {(["todos", "abierto", "en_proceso", "resuelto"] as const).map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} style={tabSt(filtroEstado === e)}>
              {e === "todos" ? "Todos" : ESTADO_META[e].label}
            </button>
          ))}
        </div>
        {esAdmin && (
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as TicketTipo | "todos")}
            style={{ padding: "5px 10px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: 12, background: "var(--surface)", color: "var(--ink)", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
            <option value="todos">Todos los tipos</option>
            {(["computadora", "plataforma", "sugerencia", "otro"] as TicketTipo[]).map(t => (
              <option key={t} value={t}>{TIPO_META[t].label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          {tickets.length === 0 ? "Sin tickets aún — crea uno con el botón de arriba" : "Sin resultados para el filtro seleccionado"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map(ticket => {
            const tipoMeta   = TIPO_META[ticket.tipo];
            const estadoMeta = ESTADO_META[ticket.estado];
            const isOpen     = expandido === ticket.id;
            return (
              <div key={ticket.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", borderLeft: `4px solid ${tipoMeta.color}` }}>
                {/* Fila principal */}
                <div onClick={() => setExpandido(isOpen ? null : ticket.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <Badge text={tipoMeta.label} color={tipoMeta.color} bg={tipoMeta.bg} />
                      <Badge text={estadoMeta.label} color={estadoMeta.color} bg={estadoMeta.bg} />
                      {esAdmin && (
                        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: PRIORIDAD_META[ticket.prioridad].color, fontWeight: 700 }}>
                          ↑ {PRIORIDAD_META[ticket.prioridad].label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ticket.titulo}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                      {esAdmin && ticket.usuario_nombre ? `${ticket.usuario_nombre} · ` : ""}{fmtDate(ticket.created_at)}
                    </div>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 14, flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                </div>

                {/* Detalle expandido */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Descripción</div>
                      <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.descripcion}</div>

                      {ticket.respuesta && (
                        <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(22,101,52,0.06)", border: "1px solid rgba(22,101,52,0.15)", borderRadius: 6 }}>
                          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#166534", marginBottom: 5 }}>
                            Respuesta{ticket.resuelto_por_nombre ? ` · ${ticket.resuelto_por_nombre}` : ""}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ticket.respuesta}</div>
                        </div>
                      )}
                    </div>

                    {esAdmin && (
                      <PanelRespuesta ticket={ticket} onActualizado={handleActualizado} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && <NuevoTicketModal onClose={() => setShowForm(false)} onCreado={handleCreado} />}
    </div>
  );
}
