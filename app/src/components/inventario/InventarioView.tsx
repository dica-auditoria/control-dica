"use client";

import { useState, useTransition } from "react";
import ActivoDetalleModal from "./ActivoDetalleModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  crearActivoAction, actualizarActivoAction,
  asignarActivoAction, devolverActivoAction, eliminarActivoAction,
  fetchActivosSimpleAction,
} from "@/app/actions/inventario";
import type { InventarioActivo, InventarioCategoria, CrearActivoInput } from "@/types/inventario";

interface UbicacionOpt { id: string; nombre: string }
interface EmpleadoOpt  { id: string; nombres: string; apellido_paterno: string; apellido_materno: string }

interface Props {
  activos: InventarioActivo[];
  categorias: InventarioCategoria[];
  empleados: EmpleadoOpt[];
  ubicaciones: UbicacionOpt[];
}

const ESTADO_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  disponible:    { bg: "rgba(45,106,79,0.1)",  color: "var(--green)",  label: "Disponible" },
  asignado:      { bg: "rgba(22,119,255,0.1)", color: "#1677ff",       label: "Asignado" },
  mantenimiento: { bg: "var(--amber-light)",   color: "var(--amber)",  label: "Mantenimiento" },
  baja:          { bg: "var(--surface-2)",     color: "var(--muted)", label: "Baja" },
};

const CONDICIONES = [
  { value: "nuevo",       label: "Nuevo" },
  { value: "bueno",       label: "Bueno" },
  { value: "regular",     label: "Regular" },
  { value: "deteriorado", label: "Deteriorado" },
  { value: "danado",      label: "Dañado" },
];

const EMPTY: CrearActivoInput = {
  categoria_id: null, nombre: "", marca: "", modelo: "", numero_serie: "",
  numero_activo: "", descripcion: "", fecha_registro: "", condicion: "bueno",
  sistema_operativo: "", tipo_adquisicion: "propio", ubicacion_id: null,
  observaciones_fisicas: "", notas: "", asignar_empleado_id: null, asignar_notas: "",
};

export default function InventarioView({ activos: inicial, categorias, empleados, ubicaciones }: Props) {
  const [activos, setActivos]         = useState(inicial);
  const [filtroCat, setFiltroCat]     = useState("todos");
  const [filtroEst, setFiltroEst]     = useState("todos");
  const [busqueda, setBusqueda]       = useState("");
  const [modalForm, setModalForm]     = useState(false);
  const [detalle, setDetalle]         = useState<InventarioActivo | null>(null);
  const [editando, setEditando]       = useState<InventarioActivo | null>(null);
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [form, setForm]               = useState<CrearActivoInput>({ ...EMPTY });
  const [empAsig, setEmpAsig]         = useState("");
  const [notasAsig, setNotasAsig]     = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg]   = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const catSeleccionada = categorias.find(c => c.id === form.categoria_id);
  const esComputo = catSeleccionada?.nombre === "Equipo de cómputo";

  const stats = {
    total:         activos.length,
    disponible:    activos.filter(a => a.estado === "disponible").length,
    asignado:      activos.filter(a => a.estado === "asignado").length,
    mantenimiento: activos.filter(a => a.estado === "mantenimiento").length,
  };

  const lista = activos.filter(a => {
    if (filtroCat !== "todos" && a.categoria_id !== filtroCat) return false;
    if (filtroEst !== "todos" && a.estado !== filtroEst) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.marca?.toLowerCase().includes(q) ?? false) ||
        (a.numero_serie?.toLowerCase().includes(q) ?? false) ||
        (a.numero_activo?.toLowerCase().includes(q) ?? false) ||
        (a.empleado_nombre?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const refrescar = () => {
    startTransition(async () => {
      const r = await fetchActivosSimpleAction();
      if (r.data) setActivos(r.data);
    });
  };

  const abrirNuevo = () => { setForm({ ...EMPTY }); setEditando(null); setError(null); setModalForm(true); };
  const abrirEditar = (a: InventarioActivo) => {
    setForm({
      categoria_id: a.categoria_id, nombre: a.nombre, marca: a.marca ?? "",
      modelo: a.modelo ?? "", numero_serie: a.numero_serie ?? "",
      numero_activo: a.numero_activo ?? "", descripcion: a.descripcion ?? "",
      fecha_registro: a.fecha_registro ?? "", condicion: a.condicion ?? "bueno",
      sistema_operativo: a.sistema_operativo ?? "", tipo_adquisicion: a.tipo_adquisicion ?? "propio",
      ubicacion_id: a.ubicacion_id, observaciones_fisicas: a.observaciones_fisicas ?? "",
      notas: a.notas ?? "", asignar_empleado_id: null, asignar_notas: "",
    });
    setEditando(a); setError(null); setModalForm(true);
  };

  const handleGuardar = () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    setError(null);
    startTransition(async () => {
      const r = editando
        ? await actualizarActivoAction(editando.id, form)
        : await crearActivoAction(form);
      if (r.error) { setError(r.error); return; }
      setModalForm(false); refrescar();
    });
  };

  const handleAsignar = () => {
    if (!empAsig || !asignandoId) return;
    startTransition(async () => {
      const r = await asignarActivoAction(asignandoId, empAsig, notasAsig);
      if (r.error) { setError(r.error); return; }
      setAsignandoId(null); setEmpAsig(""); setNotasAsig(""); refrescar();
    });
  };

  const handleDevolver = (a: InventarioActivo) => {
    if (!a.asignacion_id) return;
    setConfirmTitle("Devolver activo");
    setConfirmMsg(`¿Confirmas la devolución de "${a.nombre}"?`);
    setConfirmAction(() => () => {
      setConfirmOpen(false);
      startTransition(async () => { await devolverActivoAction(a.asignacion_id!, a.id); refrescar(); });
    });
    setConfirmOpen(true);
  };

  const handleEliminar = (a: InventarioActivo) => {
    setConfirmTitle("Eliminar activo");
    setConfirmMsg(`¿Eliminar "${a.nombre}"? Esta acción no se puede deshacer.`);
    setConfirmAction(() => () => {
      setConfirmOpen(false);
      startTransition(async () => { await eliminarActivoAction(a.id); refrescar(); });
    });
    setConfirmOpen(true);
  };

  const set = (k: keyof CrearActivoInput, v: string | null) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Inventario</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Activos de cómputo y periféricos · Asignación a empleados</p>
        </div>
        <button onClick={abrirNuevo} style={btnP}>+ Nuevo activo</button>
      </div>

      <div style={{ padding: "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
          <SC label="Total activos"  value={stats.total}         color="var(--ink)" />
          <SC label="Disponibles"    value={stats.disponible}    color="var(--green)" />
          <SC label="Asignados"      value={stats.asignado}      color="#1677ff" />
          <SC label="Mantenimiento"  value={stats.mantenimiento} color="var(--amber)" />
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input style={fSt} placeholder="Buscar nombre, serie, número…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={fSt} value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            <option value="todos">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
          <select style={fSt} value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_BADGE).map(([v,b]) => <option key={v} value={v}>{b.label}</option>)}
          </select>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{lista.length} activo{lista.length !== 1 ? "s" : ""}</span>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
          {lista.length === 0 ? (
            <div style={{ padding: 56, textAlign: "center", color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>Sin activos</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  {["Activo","Categoría","Marca / Modelo","Número","Estado","Asignado a",""].map(h => <th key={h} style={thSt}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lista.map(a => {
                  const badge = ESTADO_BADGE[a.estado] ?? ESTADO_BADGE.disponible;
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={tdSt}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{a.nombre}</div>
                        {a.descripcion && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{a.descripcion}</div>}
                      </td>
                      <td style={tdSt}>
                        {a.categoria_icono && <span style={{ marginRight: 4 }}>{a.categoria_icono}</span>}
                        <span style={{ fontSize: 12, color: "var(--muted-2)" }}>{a.categoria_nombre ?? "—"}</span>
                      </td>
                      <td style={{ ...tdSt, fontSize: 12 }}>{[a.marca,a.modelo].filter(Boolean).join(" · ") || "—"}</td>
                      <td style={tdSt}>
                        {a.numero_activo && <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--green)", fontWeight: 700 }}>{a.numero_activo}</div>}
                        {a.numero_serie  && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>S/N {a.numero_serie}</div>}
                      </td>
                      <td style={tdSt}>
                        <span style={{ padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td style={{ ...tdSt, fontSize: 12 }}>
                        {a.empleado_nombre
                          ? <div><div style={{ color: "var(--ink)", fontWeight: 500 }}>{a.empleado_nombre}</div>{a.fecha_asignacion && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{new Date(a.fecha_asignacion + "T12:00:00").toLocaleDateString("es-MX")}</div>}</div>
                          : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td style={{ ...tdSt, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                          <button onClick={() => setDetalle(a)} style={btnSm}>Ver</button>
                          {a.estado === "disponible" && <button onClick={() => { setAsignandoId(a.id); setEmpAsig(""); setNotasAsig(""); setError(null); }} style={btnSm}>Asignar</button>}
                          {a.estado === "asignado"   && <button onClick={() => handleDevolver(a)} style={{ ...btnSm, color: "var(--amber)" }}>Devolver</button>}
                          <button onClick={() => abrirEditar(a)} style={btnSm}>Editar</button>
                          <button onClick={() => handleEliminar(a)} style={{ ...btnSm, color: "var(--accent)" }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Nuevo / Editar */}
      {modalForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,17,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalForm(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(15,17,23,0.18)" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{editando ? "Editar activo" : "Nuevo activo"}</h2>
              <button onClick={() => setModalForm(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
              {error && <Err msg={error} />}

              {/* Identificación */}
              <Sec label="Identificación">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <MF label="Nombre del activo" required>
                      <input style={iSt} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej. Laptop Dell Latitude" />
                    </MF>
                  </div>
                  <MF label="Categoría">
                    <select style={iSt} value={form.categoria_id ?? ""} onChange={e => set("categoria_id", e.target.value || null)}>
                      <option value="">Sin categoría</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                    </select>
                  </MF>
                  <MF label="Número de activo">
                    <input style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={form.numero_activo ?? ""} onChange={e => set("numero_activo", e.target.value)} placeholder="ACT-0001 (auto)" />
                  </MF>
                  <MF label="Marca"><input style={iSt} value={form.marca ?? ""} onChange={e => set("marca", e.target.value)} placeholder="Dell, Logitech, Kingston…" /></MF>
                  <MF label="Modelo"><input style={iSt} value={form.modelo ?? ""} onChange={e => set("modelo", e.target.value)} /></MF>
                  <MF label="Número de serie">
                    <input style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={form.numero_serie ?? ""} onChange={e => set("numero_serie", e.target.value)} />
                  </MF>
                  <MF label="Fecha de registro"><input type="date" style={iSt} value={form.fecha_registro ?? ""} onChange={e => set("fecha_registro", e.target.value)} /></MF>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <MF label="Descripción / Especificaciones">
                      <input style={iSt} value={form.descripcion ?? ""} onChange={e => set("descripcion", e.target.value)} placeholder="Ej. 16 GB RAM, SSD 512 GB, Win 11 Pro" />
                    </MF>
                  </div>
                  {esComputo && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <MF label="Sistema operativo">
                        <input style={iSt} value={form.sistema_operativo ?? ""} onChange={e => set("sistema_operativo", e.target.value)} placeholder="Ej. Windows 11 Pro 23H2, macOS Sonoma 14.5…" />
                      </MF>
                    </div>
                  )}
                </div>
              </Sec>

              {/* Condición y adquisición */}
              <Sec label="Condición y adquisición">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <MF label="Condición">
                    <select style={iSt} value={form.condicion ?? "bueno"} onChange={e => set("condicion", e.target.value)}>
                      {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </MF>
                  <MF label="Tipo de adquisición">
                    <select style={iSt} value={form.tipo_adquisicion ?? "propio"} onChange={e => set("tipo_adquisicion", e.target.value)}>
                      <option value="propio">Propio</option>
                      <option value="renta">Renta</option>
                    </select>
                  </MF>
                  <MF label="Ubicación">
                    <select style={iSt} value={form.ubicacion_id ?? ""} onChange={e => set("ubicacion_id", e.target.value || null)}>
                      <option value="">Sin asignar</option>
                      {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </MF>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <MF label="Observaciones físicas">
                      <textarea style={{ ...iSt, minHeight: 60, resize: "vertical" }} value={form.observaciones_fisicas ?? ""} onChange={e => set("observaciones_fisicas", e.target.value)} placeholder="Estado físico del equipo, daños visibles, desgaste…" />
                    </MF>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <MF label="Notas adicionales">
                      <input style={iSt} value={form.notas ?? ""} onChange={e => set("notas", e.target.value)} />
                    </MF>
                  </div>
                </div>
              </Sec>

              {/* Asignación (solo al crear) */}
              {!editando && (
                <Sec label="Asignación al registrar (opcional)">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <MF label="Asignar a empleado">
                        <select style={iSt} value={form.asignar_empleado_id ?? ""} onChange={e => set("asignar_empleado_id", e.target.value || null)}>
                          <option value="">Sin asignar por ahora</option>
                          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellido_paterno} {e.apellido_materno}</option>)}
                        </select>
                      </MF>
                    </div>
                    {form.asignar_empleado_id && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <MF label="Notas de asignación">
                          <input style={iSt} value={form.asignar_notas ?? ""} onChange={e => set("asignar_notas", e.target.value)} placeholder="Resguardo firmado, entrega en oficina…" />
                        </MF>
                      </div>
                    )}
                  </div>
                </Sec>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setModalForm(false)} style={btnO} disabled={isPending}>Cancelar</button>
                <button onClick={handleGuardar} style={btnP} disabled={isPending}>
                  {isPending ? "Guardando…" : editando ? "Guardar cambios" : "Registrar activo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Asignar */}
      {asignandoId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,17,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setAsignandoId(null); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(15,17,23,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Asignar activo</h2>
              <button onClick={() => setAsignandoId(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {error && <Err msg={error} />}
              <MF label="Empleado" required>
                <select style={iSt} value={empAsig} onChange={e => setEmpAsig(e.target.value)}>
                  <option value="">Seleccionar empleado…</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellido_paterno} {e.apellido_materno}</option>)}
                </select>
              </MF>
              <MF label="Notas">
                <input style={iSt} value={notasAsig} onChange={e => setNotasAsig(e.target.value)} placeholder="Resguardo firmado, entrega en…" />
              </MF>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setAsignandoId(null)} style={btnO} disabled={isPending}>Cancelar</button>
                <button onClick={handleAsignar} disabled={!empAsig || isPending} style={{ ...btnP, background: !empAsig ? "rgba(15,17,23,0.2)" : "var(--green)", cursor: !empAsig ? "not-allowed" : "pointer" }}>
                  {isPending ? "Asignando…" : "Asignar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle */}
      {detalle && <ActivoDetalleModal activo={detalle} onClose={() => setDetalle(null)} />}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMsg}
        confirmLabel="Confirmar"
        danger
        onConfirm={() => confirmAction && confirmAction()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function SC({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px", boxShadow: "0 1px 3px rgba(15,17,23,0.04)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  );
}
function Sec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{label}</div>
      {children}
    </div>
  );
}
function MF({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: 10, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>{msg}</div>;
}

const iSt: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: 13, border: "1.5px solid var(--border-strong)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--card)", outline: "none", boxSizing: "border-box" };
const fSt: React.CSSProperties = { padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border-strong)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--card)", outline: "none" };
const thSt: React.CSSProperties = { padding: "10px 14px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const tdSt: React.CSSProperties = { padding: "12px 14px" };
const btnP: React.CSSProperties = { padding: "10px 18px", background: "var(--accent)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnO: React.CSSProperties = { padding: "10px 18px", background: "var(--card)", color: "var(--ink)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnSm: React.CSSProperties = { padding: "5px 9px", background: "var(--card)", color: "var(--muted-2)", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
