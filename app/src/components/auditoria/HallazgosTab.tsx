"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import {
  fetchHallazgosAction, crearHallazgoAction, editarHallazgoAction, eliminarHallazgoAction,
  type Hallazgo, type HallazgosResumen, type NivelRiesgo, type TipoHallazgo, type EstatusHallazgo,
} from "@/app/actions/hallazgos";

interface Props {
  entidadId:  string;
  contratoId: string;
}

export default function HallazgosTab({ entidadId, contratoId }: Props) {
  const [resumen, setResumen]           = useState<HallazgosResumen | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState<Hallazgo | null>(null);

  const cargar = useCallback(async () => {
    if (!entidadId) { setResumen(null); return; }
    setLoading(true); setError(null);
    const result = await fetchHallazgosAction(entidadId, contratoId || null);
    if (result.error) setError(result.error);
    else setResumen(result.data);
    setLoading(false);
  }, [entidadId, contratoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleSaved = () => { setShowForm(false); setEditing(null); cargar(); };
  const handleEdit  = (h: Hallazgo) => { setEditing(h); setShowForm(true); };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar este hallazgo?")) return;
    const result = await eliminarHallazgoAction(id);
    if (result.error) alert(result.error);
    else cargar();
  };

  if (!entidadId) return <Empty>Selecciona una empresa para ver los hallazgos</Empty>;
  if (loading)    return <Empty>Cargando…</Empty>;
  if (error)      return <Empty>{error}</Empty>;

  const hayHallazgos = (resumen?.total ?? 0) > 0;
  const maxArea = Math.max(1, ...(resumen?.byArea.map((a) => a.total) ?? [1]));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          style={{ padding: "8px 18px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}
        >
          <PlusIcon /> Agregar hallazgo
        </button>
      </div>

      {!hayHallazgos ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
            Sin hallazgos registrados para esta entidad
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
            <StatCard label="Total Hallazgos" value={resumen!.total} color="var(--ink)" />
            <StatCard label="Solventados" value={resumen!.solventadas} color="var(--green)" />
            <StatCard
              label="Pendientes"
              value={resumen!.total - resumen!.solventadas}
              color={resumen!.total - resumen!.solventadas === 0 ? "var(--green)" : "var(--accent)"}
            />
            <StatCard
              label="% Solventado"
              value={`${resumen!.total > 0 ? Math.round((resumen!.solventadas / resumen!.total) * 100) : 0}%`}
              color="var(--ink)"
            />
          </div>

          {/* Bar chart */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Hallazgos por Área
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resumen!.byArea.map((a) => (
                <div key={a.area} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--ink)", width: 220, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.area}
                  </span>
                  <div style={{ flex: 1, height: 24, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${(a.total / maxArea) * 100}%`,
                      background: "#1B4F8A", transition: "width 0.4s",
                      display: "flex", alignItems: "center", paddingLeft: 10,
                      minWidth: 28,
                    }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "white" }}>{a.total}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk sections */}
          {(["alto", "medio", "bajo"] as NivelRiesgo[]).map((nivel) => {
            const sec = resumen![nivel];
            if (sec.total === 0) return null;
            const cfg = NIVEL_CONFIG[nivel];
            return (
              <div key={nivel} style={{ marginBottom: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", borderLeft: `4px solid ${cfg.color}` }}>
                {/* Section header */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Riesgo {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginLeft: 12 }}>
                    {sec.total} hallazgo{sec.total !== 1 ? "s" : ""} · {sec.solventadas} solventado{sec.solventadas !== 1 ? "s" : ""}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr" }}>
                  {/* Left: by area */}
                  <div style={{ padding: "16px", borderRight: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: cfg.color, lineHeight: 1, marginBottom: 4 }}>
                      {sec.total}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginBottom: 14 }}>
                      Solventadas: {sec.solventadas === 0 ? "—" : sec.solventadas}
                    </div>
                    {sec.byArea.length > 0 && (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={thSmStyle}>Área</th>
                            <th style={{ ...thSmStyle, textAlign: "right" }}>Nueva</th>
                            <th style={{ ...thSmStyle, textAlign: "right" }}>Recur.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.byArea.map((a) => (
                            <tr key={a.area} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "5px 6px", fontSize: 11, color: "var(--ink)", textTransform: "uppercase" }}>
                                {a.area.length > 18 ? a.area.slice(0, 18) + "…" : a.area}
                              </td>
                              <td style={{ padding: "5px 6px", fontSize: 11, fontFamily: "'DM Mono', monospace", textAlign: "right", color: cfg.color }}>
                                {a.nuevas}
                              </td>
                              <td style={{ padding: "5px 6px", fontSize: 11, fontFamily: "'DM Mono', monospace", textAlign: "right", color: "var(--muted)" }}>
                                {a.recurrentes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Right: hallazgos table */}
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                      <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Riesgos de {cfg.label.toUpperCase()} PRIORIDAD
                      </span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--surface)" }}>
                          <th style={{ ...thStyle, width: 60 }}>No.</th>
                          <th style={{ ...thStyle, textAlign: "left" }}>Observación</th>
                          <th style={{ ...thStyle, width: 110 }}>Tipo</th>
                          <th style={{ ...thStyle, width: 140 }}>Estatus</th>
                          <th style={{ ...thStyle, width: 110 }}>Compromiso</th>
                          <th style={{ ...thStyle, width: 150 }}>Plazo</th>
                          <th style={{ ...thStyle, width: 60 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {sec.hallazgos.map((h) => {
                          const plazo = calcularPlazo(h);
                          return (
                            <tr key={h.id} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
                                {h.numero ?? "—"}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4, maxWidth: 280 }}>
                                  {h.descripcion}
                                </div>
                                {h.es_recurrente && (
                                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#92400E", marginTop: 2, display: "block" }}>
                                    Recurrente
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{
                                  fontSize: 10, padding: "2px 7px", borderRadius: 100,
                                  fontFamily: "'DM Mono', monospace",
                                  background: h.tipo === "financiero" ? "rgba(27,79,138,0.1)" : "rgba(107,114,128,0.1)",
                                  color: h.tipo === "financiero" ? "#1B4F8A" : "var(--muted-2)",
                                }}>
                                  {h.tipo === "financiero" ? "Financiera" : "Control interno"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{
                                  fontSize: 11, padding: "3px 8px", borderRadius: 100,
                                  fontFamily: "'DM Mono', monospace", fontWeight: 600,
                                  background: h.estatus === "solventada" ? "rgba(45,166,95,0.12)" : "rgba(200,71,42,0.1)",
                                  color: h.estatus === "solventada" ? "var(--green)" : "var(--accent)",
                                }}>
                                  {h.estatus === "solventada" ? "Solventada" : "Pendiente de solventar"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
                                {h.fecha_compromiso ? formatDate(h.fecha_compromiso) : "—"}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                {plazo ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    <span style={{
                                      fontSize: 10, padding: "2px 7px", borderRadius: 100,
                                      fontFamily: "'DM Mono', monospace",
                                      background: plazo.style === "ok" ? "rgba(45,166,95,0.1)" : plazo.style === "warn" ? "rgba(251,191,36,0.15)" : "rgba(200,71,42,0.1)",
                                      color: plazo.style === "ok" ? "var(--green)" : plazo.style === "warn" ? "#92400E" : "var(--accent)",
                                    }}>
                                      {plazo.text}
                                    </span>
                                    {plazo.sub && (
                                      <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: plazo.style === "late" ? "var(--accent)" : "var(--muted)" }}>
                                        {plazo.sub}
                                      </span>
                                    )}
                                  </div>
                                ) : "—"}
                              </td>
                              <td style={{ padding: "10px 8px" }}>
                                <div style={{ display: "flex", gap: 2 }}>
                                  <button onClick={() => handleEdit(h)} title="Editar" style={iconBtnStyle}>
                                    <EditIcon />
                                  </button>
                                  <button onClick={() => handleEliminar(h.id)} title="Eliminar" style={iconBtnStyle}>
                                    <TrashIcon />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {showForm && (
        <HallazgoFormModal
          entidadId={entidadId}
          contratoId={contratoId || null}
          hallazgo={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

interface FormState {
  area: string;
  numero: string;
  descripcion: string;
  tipo: TipoHallazgo;
  nivel_riesgo: NivelRiesgo;
  es_recurrente: boolean;
  estatus: EstatusHallazgo;
  fecha_compromiso: string;
  fecha_limite: string;
}

const EMPTY_FORM: FormState = {
  area: "", numero: "", descripcion: "",
  tipo: "financiero", nivel_riesgo: "medio",
  es_recurrente: false, estatus: "pendiente",
  fecha_compromiso: "", fecha_limite: "",
};

function HallazgoFormModal({ entidadId, contratoId, hallazgo, onClose, onSaved }: {
  entidadId: string;
  contratoId: string | null;
  hallazgo: Hallazgo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm]   = useState<FormState>(() => hallazgo ? {
    area: hallazgo.area,
    numero: hallazgo.numero ?? "",
    descripcion: hallazgo.descripcion,
    tipo: hallazgo.tipo,
    nivel_riesgo: hallazgo.nivel_riesgo,
    es_recurrente: hallazgo.es_recurrente,
    estatus: hallazgo.estatus,
    fecha_compromiso: hallazgo.fecha_compromiso ?? "",
    fecha_limite: hallazgo.fecha_limite ?? "",
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleGuardar = async () => {
    if (!form.area.trim() || !form.descripcion.trim()) return;
    setSaving(true); setErr(null);
    const result = hallazgo
      ? await editarHallazgoAction(hallazgo.id, { ...form, numero: form.numero || null, fecha_compromiso: form.fecha_compromiso || null, fecha_limite: form.fecha_limite || null })
      : await crearHallazgoAction({ entidadId, contratoId, ...form, numero: form.numero || null, fecha_compromiso: form.fecha_compromiso || null, fecha_limite: form.fecha_limite || null });
    if (result.error) { setErr(result.error); setSaving(false); return; }
    onSaved();
  };

  const inp: React.CSSProperties = {
    width: "100%", height: 36, padding: "0 10px",
    border: "1px solid var(--border-strong)", borderRadius: 6,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    background: "var(--surface)", color: "var(--ink)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
            {hallazgo ? "Editar hallazgo" : "Agregar hallazgo"}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Área <Req /></Label>
              <input type="text" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="Ej. TESORERIA" style={inp} />
            </div>
            <div>
              <Label>No. Observación <Opt /></Label>
              <input type="text" value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="Ej. Obs. 001" style={inp} />
            </div>
          </div>

          <div>
            <Label>Descripción / Observación <Req /></Label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Describe el hallazgo de auditoría…"
              rows={3}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Tipo <Req /></Label>
              <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="financiero">Financiero</option>
                <option value="control_interno">Control Interno</option>
              </select>
            </div>
            <div>
              <Label>Nivel de Riesgo <Req /></Label>
              <select value={form.nivel_riesgo} onChange={(e) => set("nivel_riesgo", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Estatus <Req /></Label>
              <select value={form.estatus} onChange={(e) => set("estatus", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="pendiente">Pendiente de solventar</option>
                <option value="solventada">Solventada</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={form.es_recurrente}
                  onChange={(e) => set("es_recurrente", e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: "#1B4F8A", cursor: "pointer" }}
                />
                Es recurrente
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Fecha de Compromiso <Opt /></Label>
              <input type="date" value={form.fecha_compromiso} onChange={(e) => set("fecha_compromiso", e.target.value)} style={inp} />
            </div>
            <div>
              <Label>Fecha Límite <Opt /></Label>
              <input type="date" value={form.fecha_limite} onChange={(e) => set("fecha_limite", e.target.value)} style={inp} />
            </div>
          </div>

          {err && (
            <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
              {err}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!form.area.trim() || !form.descripcion.trim() || saving}
            style={{ padding: "8px 20px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!form.area.trim() || !form.descripcion.trim() || saving) ? "not-allowed" : "pointer", opacity: (!form.area.trim() || !form.descripcion.trim() || saving) ? 0.5 : 1 }}
          >
            {saving ? "Guardando…" : hallazgo ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcularPlazo(h: Hallazgo): { text: string; sub?: string; style: "ok" | "warn" | "late" } | null {
  if (!h.fecha_limite) return null;
  const limite = new Date(h.fecha_limite + "T23:59:59");

  if (h.estatus === "solventada") {
    if (!h.fecha_compromiso) return { text: "Solventada", style: "ok" };
    const comp = new Date(h.fecha_compromiso);
    const dias = Math.ceil((comp.getTime() - limite.getTime()) / 86400000);
    if (dias <= 0) return { text: "En plazo", style: "ok" };
    return { text: `+${dias} día${dias !== 1 ? "s" : ""} de lo previsto`, style: "warn" };
  }

  const dias = Math.ceil((limite.getTime() - Date.now()) / 86400000);
  if (dias > 3)  return { text: `${dias} días restantes`, style: "ok" };
  if (dias >= 1) return { text: `${dias} día${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}`, style: "warn" };
  if (dias === 0) return { text: "Vence hoy", sub: "Fuera de plazo", style: "warn" };
  return { text: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? "s" : ""}`, sub: "Fuera de plazo", style: "late" };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

const NIVEL_CONFIG: Record<NivelRiesgo, { label: string; color: string }> = {
  alto:  { label: "Alto",  color: "#DC2626" },
  medio: { label: "Medio", color: "#D97706" },
  bajo:  { label: "Bajo",  color: "#65A30D" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{children}</label>;
}
function Req() { return <span style={{ color: "var(--accent)" }}>*</span>; }
function Opt() { return <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>; }

const thStyle: React.CSSProperties = {
  padding: "8px 14px", fontSize: 10, fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)",
  fontWeight: 600, textAlign: "left",
  borderBottom: "1px solid var(--border)",
};

const thSmStyle: React.CSSProperties = {
  padding: "4px 6px", fontSize: 9, fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)",
  fontWeight: 600, textAlign: "left",
};

const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--muted)", padding: 4, display: "flex", borderRadius: 4,
};

function PlusIcon()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>; }
