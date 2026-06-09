"use client";

import { useState, useTransition } from "react";
import {
  solicitarPermisoAction, crearComisionAction,
  aprobarPermisoSupervisorAction, rechazarPermisoSupervisorAction,
  validarRHAction, cancelarSolicitudOtroAction,
  type SolicitudOtro, type EstadoOtro,
} from "@/app/actions/otros";

// ── constantes ────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  comision: "Comisión",
  permiso:  "Permiso",
};

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  comision: { bg: "rgba(249,115,22,0.1)",  color: "#ea580c" },
  permiso:  { bg: "rgba(139,92,246,0.1)",  color: "#7c3aed" },
};

const ESTADO_LABEL: Record<EstadoOtro, string> = {
  pendiente_supervisor: "Pendiente supervisor",
  aprobado_supervisor:  "Aprobado por supervisor",
  rechazado_supervisor: "Rechazado por supervisor",
  pendiente_rh:         "Pendiente RH",
  aprobado_rh:          "Aprobado",
  rechazado_rh:         "Rechazado",
  cancelado:            "Cancelado",
};

const ESTADO_COLOR: Record<EstadoOtro, { bg: string; color: string }> = {
  pendiente_supervisor: { bg: "rgba(234,179,8,0.12)",  color: "#a16207" },
  aprobado_supervisor:  { bg: "rgba(14,165,233,0.12)", color: "#0369a1" },
  rechazado_supervisor: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
  pendiente_rh:         { bg: "rgba(234,179,8,0.12)",  color: "#a16207" },
  aprobado_rh:          { bg: "rgba(34,197,94,0.12)",  color: "#16a34a" },
  rechazado_rh:         { bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
  cancelado:            { bg: "rgba(15,17,23,0.06)",   color: "var(--muted)" },
};

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

// ── props ─────────────────────────────────────────────────────────────────────

interface Props {
  misSolicitudes: SolicitudOtro[];
  solicitudesEquipo: SolicitudOtro[];
  solicitudesRH: SolicitudOtro[];
  subordinados: Array<{ id: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; departamento: string }>;
  esSupervisor: boolean;
  esRH: boolean;
}

// ── componente principal ──────────────────────────────────────────────────────

export default function OtrosView({ misSolicitudes, solicitudesEquipo, solicitudesRH, subordinados, esSupervisor, esRH }: Props) {
  type Tab = "mis" | "equipo" | "rh";
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "mis",   label: "Mis solicitudes" },
    ...(esSupervisor ? [{ key: "equipo" as Tab, label: "Mi equipo", count: solicitudesEquipo.filter(s => s.estado === "pendiente_supervisor").length }] : []),
    ...(esRH         ? [{ key: "rh"    as Tab, label: "Validación RH", count: solicitudesRH.filter(s => s.estado === "pendiente_rh").length }] : []),
  ];

  const [tab, setTab] = useState<Tab>("mis");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Otros</h1>
        <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
          Comisiones · Permisos
        </p>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              color: tab === t.key ? "#1B4F8A" : "var(--muted)",
              borderBottom: tab === t.key ? "2px solid #1B4F8A" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {t.label}
              {t.count != null && t.count > 0 && (
                <span style={{ background: "#fef3c7", color: "#a16207", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 100, fontFamily: "'DM Mono', monospace" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {tab === "mis"   && <TabMis solicitudes={misSolicitudes} />}
      {tab === "equipo" && esSupervisor && <TabEquipo solicitudes={solicitudesEquipo} subordinados={subordinados} />}
      {tab === "rh"    && esRH          && <TabRH solicitudes={solicitudesRH} />}
    </div>
  );
}

// ── Tab: Mis solicitudes ──────────────────────────────────────────────────────

function TabMis({ solicitudes }: { solicitudes: SolicitudOtro[] }) {
  const [showForm, setShowForm]   = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin]   = useState("");
  const [motivo, setMotivo]       = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hoy = new Date().toISOString().split("T")[0];

  const handleSolicitar = () => {
    if (!fechaInicio || !fechaFin || !motivo.trim()) { setFormError("Todos los campos son obligatorios"); return; }
    if (fechaInicio > fechaFin) { setFormError("La fecha de inicio no puede ser mayor a la final"); return; }
    setFormError(null);
    startTransition(async () => {
      const r = await solicitarPermisoAction({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo });
      if (r.error) { setFormError(r.error); return; }
      setShowForm(false); setFechaInicio(""); setFechaFin(""); setMotivo("");
    });
  };

  const handleCancelar = (id: string) => {
    startTransition(async () => { await cancelarSolicitudOtroAction(id); });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Tus permisos solicitados y comisiones asignadas</span>
        <button onClick={() => setShowForm(v => !v)} style={{
          padding: "7px 16px", background: "#7c3aed", color: "white",
          border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          {showForm ? "Cancelar" : "+ Solicitar permiso"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>Nueva solicitud de permiso</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: "1 1 160px" }}>
              <label style={lbl}>Fecha inicio</label>
              <input type="date" style={inp} min={hoy} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={lbl}>Fecha fin</label>
              <input type="date" style={inp} min={fechaInicio || hoy} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Motivo / Destino</label>
            <textarea style={{ ...inp, height: 80, resize: "vertical" }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Describe el motivo o destino del permiso" />
          </div>
          {formError && <div style={{ padding: "7px 10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", borderRadius: 4, fontSize: 12, marginBottom: 10 }}>{formError}</div>}
          <button onClick={handleSolicitar} disabled={isPending} style={{
            padding: "8px 18px", background: "#7c3aed", color: "white",
            border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.7 : 1,
          }}>
            {isPending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      )}

      {solicitudes.length === 0 ? (
        <Empty texto="No tienes solicitudes registradas" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {solicitudes.map(s => (
            <TarjetaSolicitud key={s.id} s={s}
              accion={["pendiente_supervisor","pendiente_rh","aprobado_supervisor"].includes(s.estado)
                ? <button onClick={() => handleCancelar(s.id)} disabled={isPending} style={btnCancelar}>Cancelar</button>
                : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Mi equipo (supervisor) ───────────────────────────────────────────────

function TabEquipo({ solicitudes, subordinados }: {
  solicitudes: SolicitudOtro[];
  subordinados: Array<{ id: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; departamento: string }>;
}) {
  const [showComision, setShowComision] = useState(false);
  const [empId, setEmpId]               = useState("");
  const [fechaInicio, setFechaInicio]   = useState("");
  const [fechaFin, setFechaFin]         = useState("");
  const [motivo, setMotivo]             = useState("");
  const [formError, setFormError]       = useState<string | null>(null);
  const [comentarios, setComentarios]   = useState<Record<string, string>>({});
  const [rechazando, setRechazando]     = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  const hoy = new Date().toISOString().split("T")[0];
  const pendientes = solicitudes.filter(s => s.estado === "pendiente_supervisor");
  const historial  = solicitudes.filter(s => s.estado !== "pendiente_supervisor");

  const handleCrearComision = () => {
    if (!empId || !fechaInicio || !fechaFin || !motivo.trim()) { setFormError("Todos los campos son obligatorios"); return; }
    setFormError(null);
    startTransition(async () => {
      const r = await crearComisionAction({ empleado_id: empId, fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo });
      if (r.error) { setFormError(r.error); return; }
      setShowComision(false); setEmpId(""); setFechaInicio(""); setFechaFin(""); setMotivo("");
    });
  };

  const handleAprobar = (id: string) => {
    startTransition(async () => { await aprobarPermisoSupervisorAction(id, comentarios[id]); });
  };

  const handleRechazar = (id: string) => {
    const c = comentarios[id]?.trim();
    if (!c) { return; }
    startTransition(async () => {
      const r = await rechazarPermisoSupervisorAction(id, c);
      if (!r.error) setRechazando(null);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Crear comisión */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Comisiones del equipo</span>
          <button onClick={() => setShowComision(v => !v)} style={{
            padding: "7px 16px", background: "#ea580c", color: "white",
            border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            {showComision ? "Cancelar" : "+ Asignar comisión"}
          </button>
        </div>

        {showComision && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>Nueva comisión</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: "2 1 200px" }}>
                <label style={lbl}>Empleado</label>
                <select style={inp} value={empId} onChange={e => setEmpId(e.target.value)}>
                  <option value="">Selecciona un empleado…</option>
                  {subordinados.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombres} {s.apellido_paterno} — {s.departamento}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={lbl}>Fecha inicio</label>
                <input type="date" style={inp} min={hoy} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={lbl}>Fecha fin</label>
                <input type="date" style={inp} min={fechaInicio || hoy} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Destino / Descripción</label>
              <textarea style={{ ...inp, height: 72, resize: "vertical" }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Visita a cliente en Monterrey — Auditoría Conalep" />
            </div>
            {formError && <div style={{ padding: "7px 10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", borderRadius: 4, fontSize: 12, marginBottom: 10 }}>{formError}</div>}
            <button onClick={handleCrearComision} disabled={isPending} style={{
              padding: "8px 18px", background: "#ea580c", color: "white",
              border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.7 : 1,
            }}>
              {isPending ? "Guardando…" : "Asignar comisión"}
            </button>
          </div>
        )}
      </div>

      {/* Permisos pendientes */}
      <div>
        <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a16207", marginBottom: 10 }}>
          Permisos pendientes de aprobación {pendientes.length > 0 && `(${pendientes.length})`}
        </div>
        {pendientes.length === 0 ? (
          <Empty texto="No hay permisos pendientes de tu equipo" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendientes.map(s => {
              const isRechazando = rechazando === s.id;
              return (
                <TarjetaSolicitud key={s.id} s={s}
                  accion={
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                      {!isRechazando ? (
                        <>
                          <textarea
                            placeholder="Comentario (opcional)"
                            value={comentarios[s.id] ?? ""}
                            onChange={e => setComentarios(p => ({ ...p, [s.id]: e.target.value }))}
                            style={{ ...inp, height: 52, fontSize: 11, resize: "none" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleAprobar(s.id)} disabled={isPending} style={{
                              flex: 1, padding: "6px 0", background: "#16a34a", color: "white",
                              border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Aprobar</button>
                            <button onClick={() => setRechazando(s.id)} style={{
                              flex: 1, padding: "6px 0", background: "transparent",
                              border: "1px solid #dc2626", color: "#dc2626",
                              borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Rechazar</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <textarea
                            placeholder="Motivo del rechazo (obligatorio)"
                            value={comentarios[s.id] ?? ""}
                            onChange={e => setComentarios(p => ({ ...p, [s.id]: e.target.value }))}
                            style={{ ...inp, height: 64, fontSize: 11, resize: "none" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleRechazar(s.id)} disabled={isPending || !comentarios[s.id]?.trim()} style={{
                              flex: 1, padding: "6px 0", background: "#dc2626", color: "white",
                              border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}>Confirmar rechazo</button>
                            <button onClick={() => setRechazando(null)} style={{
                              padding: "6px 10px", background: "transparent", border: "1px solid var(--border-strong)",
                              borderRadius: 4, fontSize: 11, cursor: "pointer", color: "var(--muted)",
                            }}>Cancelar</button>
                          </div>
                        </>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Historial del equipo */}
      {historial.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 10 }}>
            Historial
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {historial.map(s => <TarjetaSolicitud key={s.id} s={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Validación RH ────────────────────────────────────────────────────────

function TabRH({ solicitudes }: { solicitudes: SolicitudOtro[] }) {
  const [filtro, setFiltro]           = useState<string>("pendiente_rh");
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [rechazando, setRechazando]   = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const lista = filtro === "todos" ? solicitudes : solicitudes.filter(s => s.estado === filtro);

  const handleValidar = (id: string, aprobado: boolean) => {
    const c = comentarios[id];
    if (!aprobado && !c?.trim()) return;
    startTransition(async () => {
      const r = await validarRHAction(id, aprobado, c);
      if (!r.error) setRechazando(null);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["pendiente_rh", "aprobado_rh", "rechazado_rh", "todos"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em",
            background: filtro === f ? "#1B4F8A" : "var(--surface)",
            color: filtro === f ? "white" : "var(--muted)",
            border: filtro === f ? "1px solid #1B4F8A" : "1px solid var(--border-strong)",
          }}>
            {f === "pendiente_rh" ? "Pendientes" : f === "aprobado_rh" ? "Aprobados" : f === "rechazado_rh" ? "Rechazados" : "Todos"}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <Empty texto="No hay solicitudes en este estado" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.map(s => {
            const isRechazando = rechazando === s.id;
            return (
              <TarjetaSolicitud key={s.id} s={s}
                accion={s.estado === "pendiente_rh" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                    {!isRechazando ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleValidar(s.id, true)} disabled={isPending} style={{
                          flex: 1, padding: "6px 0", background: "#16a34a", color: "white",
                          border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        }}>Aprobar</button>
                        <button onClick={() => setRechazando(s.id)} style={{
                          flex: 1, padding: "6px 0", background: "transparent",
                          border: "1px solid #dc2626", color: "#dc2626",
                          borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        }}>Rechazar</button>
                      </div>
                    ) : (
                      <>
                        <textarea
                          placeholder="Motivo del rechazo (obligatorio)"
                          value={comentarios[s.id] ?? ""}
                          onChange={e => setComentarios(p => ({ ...p, [s.id]: e.target.value }))}
                          style={{ ...inp, height: 64, fontSize: 11, resize: "none" }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleValidar(s.id, false)} disabled={isPending || !comentarios[s.id]?.trim()} style={{
                            flex: 1, padding: "6px 0", background: "#dc2626", color: "white",
                            border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>Confirmar rechazo</button>
                          <button onClick={() => setRechazando(null)} style={{
                            padding: "6px 10px", background: "transparent", border: "1px solid var(--border-strong)",
                            borderRadius: 4, fontSize: 11, cursor: "pointer", color: "var(--muted)",
                          }}>Cancelar</button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── tarjeta genérica ──────────────────────────────────────────────────────────

function TarjetaSolicitud({ s, accion }: { s: SolicitudOtro; accion?: React.ReactNode }) {
  const emp    = s.empleado;
  const nombre = emp ? `${emp.nombres} ${emp.apellido_paterno}` : "—";
  const tc     = TIPO_COLOR[s.tipo]  ?? TIPO_COLOR.permiso;
  const ec     = ESTADO_COLOR[s.estado] ?? ESTADO_COLOR.cancelado;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", ...tc }}>
              {TIPO_LABEL[s.tipo]}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{nombre}</span>
            {emp?.departamento && (
              <span style={{ fontSize: 10, color: "var(--muted)", background: "var(--surface)", padding: "2px 6px", borderRadius: 3, fontFamily: "'DM Mono', monospace" }}>
                {emp.departamento}
              </span>
            )}
            <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", ...ec }}>
              {ESTADO_LABEL[s.estado]}
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Pill label="Desde" value={fmtDate(s.fecha_inicio)} />
            <Pill label="Hasta" value={fmtDate(s.fecha_fin)} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 6, fontStyle: "italic" }}>
            "{s.motivo}"
          </div>
          {s.comentario_supervisor && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <strong>Supervisor:</strong> {s.comentario_supervisor}
            </div>
          )}
          {s.comentario_rh && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              <strong>RH:</strong> {s.comentario_rh}
            </div>
          )}
        </div>
        {accion && <div style={{ flexShrink: 0 }}>{accion}</div>}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 9, color: "var(--muted)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label} </span>
      <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Empty({ texto }: { texto: string }) {
  return <div style={{ textAlign: "center", padding: "36px 0", color: "var(--muted)", fontSize: 13 }}>{texto}</div>;
}

const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 5, fontSize: 13, background: "var(--surface)", color: "var(--ink)", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" };
const btnCancelar: React.CSSProperties = { padding: "5px 12px", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 11, cursor: "pointer", color: "var(--muted)" };
