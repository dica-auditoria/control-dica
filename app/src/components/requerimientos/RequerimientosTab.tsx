"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoEstado } from "@/types/requerimientos";
import {
  crearRequerimientoAction,
  toggleItemCompletoAction,
  extenderFechaAction,
  cerrarRequerimientoAction,
  eliminarRequerimientoAction,
} from "@/app/actions/requerimientos";

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasRestantes(fechaLimite: string): number {
  const limite = new Date(fechaLimite + "T23:59:59");
  return Math.ceil((limite.getTime() - Date.now()) / 86400000);
}

function formatFecha(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_STYLE: Record<RequerimientoEstado, { bg: string; color: string; label: string }> = {
  pendiente:   { bg: "rgba(255,193,7,0.12)",  color: "#B8860B", label: "Pendiente" },
  en_revision: { bg: "rgba(33,150,243,0.1)",  color: "#1565C0", label: "En revisión" },
  completado:  { bg: "rgba(45,166,95,0.1)",   color: "#1B7A3E", label: "Completado" },
  vencido:     { bg: "rgba(200,71,42,0.1)",   color: "var(--accent)", label: "Vencido" },
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  requerimientos: Requerimiento[];
  entidadId: string;
  contratoId: string;
  isSuperAdmin?: boolean;
}

export default function RequerimientosTab({ requerimientos, entidadId, contratoId, isSuperAdmin }: Props) {
  const router = useRouter();
  const [crear, setCrear] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [extendiendo, setExtendiendo] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState<string | null>(null);

  const pendientes = requerimientos.filter(r => r.estado !== "completado").length;

  return (
    <>
      {/* Toolbar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
          {requerimientos.length} requerimiento{requerimientos.length !== 1 ? "s" : ""}{pendientes > 0 ? ` · ${pendientes} activo${pendientes !== 1 ? "s" : ""}` : ""}
        </span>
        <button onClick={() => setCrear(true)}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          <PlusIcon /> Nuevo requerimiento
        </button>
      </div>

      {/* List */}
      {requerimientos.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          Sin requerimientos — crea uno para solicitar documentos al cliente
        </div>
      ) : (
        <div>
          {requerimientos.map(req => {
            const dias = diasRestantes(req.fecha_limite);
            const isOpen = expanded === req.id;
            const st = ESTADO_STYLE[req.estado];
            const itemsDone = req.items.filter(i => i.completado).length;
            const itemsTotal = req.items.length;
            const pct = itemsTotal > 0 ? Math.round((itemsDone / itemsTotal) * 100) : req.archivos_count > 0 ? 50 : 0;

            return (
              <div key={req.id} style={{ borderBottom: "1px solid var(--border)" }}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                  style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: isOpen ? "rgba(15,17,23,0.02)" : "white" }}>
                  <span style={{ display: "inline-flex", color: "var(--muted)", transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "none" }}><ChevronIcon /></span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{req.titulo}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {itemsTotal > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 80, height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: req.estado === "completado" ? "var(--green)" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{itemsDone}/{itemsTotal}</span>
                        </div>
                      )}
                      {req.archivos_count > 0 && (
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{req.archivos_count} archivo{req.archivos_count !== 1 ? "s" : ""} subido{req.archivos_count !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>

                  {/* Deadline chip */}
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: req.estado === "vencido" ? "var(--accent)" : dias <= 3 ? "#B8860B" : "rgba(15,17,23,0.5)" }}>
                      {req.estado === "completado" ? formatFecha(req.fecha_limite) : dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? "Vence hoy" : `${dias}d restante${dias !== 1 ? "s" : ""}`}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{formatFecha(req.fecha_limite)}</div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px 52px", background: "rgba(15,17,23,0.015)" }}>
                    {req.descripcion && (
                      <p style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 16, marginTop: 4 }}>{req.descripcion}</p>
                    )}

                    {/* Items */}
                    {req.items.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Documentos solicitados</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {req.items.map(item => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--card)", borderRadius: 6, border: "1px solid var(--border)" }}>
                              <input type="checkbox" checked={item.completado}
                                onChange={async e => {
                                  await toggleItemCompletoAction(item.id, e.target.checked);
                                  router.refresh();
                                }}
                                style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 13, color: "var(--ink)", textDecoration: item.completado ? "line-through" : "none", opacity: item.completado ? 0.5 : 1 }}>{item.nombre}</span>
                                {item.descripcion && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{item.descripcion}</span>}
                              </div>
                              {item.obligatorio && !item.completado && (
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "rgba(200,71,42,0.08)", color: "var(--accent)", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>obligatorio</span>
                              )}
                              {item.completado && <CheckIcon />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin actions */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {req.estado !== "completado" && (
                        <button onClick={() => setCerrando(req.id)}
                          style={btnStyle("var(--ink)", "white")}>
                          <CheckIcon /> Marcar completado
                        </button>
                      )}
                      {(req.estado === "vencido" || req.estado !== "completado") && (
                        <button onClick={() => setExtendiendo(req.id)}
                          style={btnStyle("white", "var(--ink)", "1px solid var(--border-strong)")}>
                          <CalendarIcon /> {req.estado === "vencido" ? "Reabrir con nueva fecha" : "Extender plazo"}
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button onClick={async () => {
                          if (!confirm("¿Eliminar este requerimiento permanentemente?")) return;
                          await eliminarRequerimientoAction(req.id);
                          router.refresh();
                        }} style={btnStyle("none", "var(--accent)", "1px solid rgba(200,71,42,0.3)")}>
                          <TrashIcon /> Eliminar
                        </button>
                      )}
                    </div>

                    {req.notas_cierre && (
                      <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(45,166,95,0.06)", borderRadius: 6, border: "1px solid rgba(45,166,95,0.15)", fontSize: 12, color: "var(--muted-2)" }}>
                        <span style={{ fontWeight: 600, color: "#1B7A3E" }}>Nota de cierre: </span>{req.notas_cierre}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {crear && (
        <CrearRequerimientoModal
          entidadId={entidadId}
          contratoId={contratoId}
          onClose={() => setCrear(false)}
          onCreated={() => { setCrear(false); router.refresh(); }}
        />
      )}
      {extendiendo && (
        <ExtenderFechaModal
          requerimientoId={extendiendo}
          onClose={() => setExtendiendo(null)}
          onUpdated={() => { setExtendiendo(null); router.refresh(); }}
        />
      )}
      {cerrando && (
        <CerrarModal
          requerimientoId={cerrando}
          onClose={() => setCerrando(null)}
          onClosed={() => { setCerrando(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function btnStyle(bg: string, color: string, border = "none"): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: bg, color, border, borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 };
}

// ── Crear Requerimiento Modal ─────────────────────────────────────────────────

interface ItemDraft { nombre: string; obligatorio: boolean }

function CrearRequerimientoModal({ entidadId, contratoId, onClose, onCreated }: {
  entidadId: string; contratoId: string; onClose: () => void; onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<ItemDraft[]>([{ nombre: "", obligatorio: true }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addItem = () => setItems(prev => [...prev, { nombre: "", obligatorio: true }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ItemDraft, val: string | boolean) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true); setError(null);
    const result = await crearRequerimientoAction({
      contratoId,
      entidadId,
      titulo,
      descripcion: descripcion || undefined,
      fechaLimite,
      items: items.filter(i => i.nombre.trim()).map(i => ({ nombre: i.nombre, obligatorio: i.obligatorio })),
    });
    if (result.error) { setError(result.error); setSaving(false); return; }
    onCreated();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Nuevo requerimiento</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Se notificará al cliente con los documentos a entregar y la fecha límite</div>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Título del requerimiento *">
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="ej. Documentación para auditoría Q1 2025"
              required style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          <Field label="Descripción (opcional)">
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
              placeholder="Instrucciones adicionales para el cliente…"
              style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          <Field label="Fecha límite *">
            <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)}
              min={new Date().toISOString().slice(0, 10)} required style={{ ...inputStyle, maxWidth: 200 }} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          <div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>
              Documentos a solicitar
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input value={item.nombre} onChange={e => updateItem(i, "nombre", e.target.value)}
                    placeholder={`Documento ${i + 1} (ej. INE vigente)`}
                    style={{ ...inputStyle, flex: 1 }} onFocus={focusBorder} onBlur={blurBorder} />
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-2)", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={item.obligatorio} onChange={e => updateItem(i, "obligatorio", e.target.checked)}
                      style={{ accentColor: "var(--accent)" }} />
                    oblig.
                  </label>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex" }}><XSmIcon /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addItem}
                style={{ alignSelf: "flex-start", fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>
                <PlusIcon /> Agregar documento
              </button>
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--accent)", padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4 }}>{error}</div>}
        </form>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={handleSubmit as React.MouseEventHandler} disabled={!titulo.trim() || saving}
            style={{ padding: "8px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, cursor: (!titulo.trim() || saving) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: (!titulo.trim() || saving) ? 0.5 : 1 }}>
            {saving ? "Creando…" : "Crear requerimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Extender Fecha Modal ──────────────────────────────────────────────────────

function ExtenderFechaModal({ requerimientoId, onClose, onUpdated }: { requerimientoId: string; onClose: () => void; onUpdated: () => void }) {
  const [fecha, setFecha] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await extenderFechaAction(requerimientoId, fecha);
    onUpdated();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 340, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Extender plazo</div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <Field label="Nueva fecha límite">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              min={new Date().toISOString().slice(0, 10)} required style={{ ...inputStyle, maxWidth: 200 }} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: "7px 14px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cerrar Modal ──────────────────────────────────────────────────────────────

function CerrarModal({ requerimientoId, onClose, onClosed }: { requerimientoId: string; onClose: () => void; onClosed: () => void }) {
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await cerrarRequerimientoAction(requerimientoId, notas);
    onClosed();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Marcar como completado</div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <Field label="Notas de cierre (opcional)">
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="ej. Documentación recibida y validada. Expediente completo."
              style={{ ...inputStyle, resize: "vertical" }} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: "7px 14px", background: "#2D6A4F", color: "white", border: "none", borderRadius: 4, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Cerrando…" : "Confirmar completado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 6,
  fontSize: 13, color: "var(--ink)", outline: "none", fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box", background: "var(--card)",
};
const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "var(--accent)");
const blurBorder  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "var(--border)");

function ChevronIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function PlusIcon()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function CheckIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>; }
function CalendarIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>; }
function TrashIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>; }
function XSmIcon()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
