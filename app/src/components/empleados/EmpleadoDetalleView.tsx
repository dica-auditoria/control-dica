"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import EmpleadoProfileHeader from "./EmpleadoProfileHeader";
import EmpleadoSectionNav, { type SeccionId, type SeccionEstado } from "./EmpleadoSectionNav";
import { createClient } from "@/lib/supabase/client";
import {
  agregarDocumentoEmpleadoAction,
  eliminarDocumentoEmpleadoAction,
  getDocumentoUrlAction,
} from "@/app/actions/empleado_documentos";
import { subirFotoEmpleadoAction } from "@/app/actions/empleados";
import {
  getBancariosAction,
  guardarBancariosAction,
  logConsultaBancarioAction,
  type BancariosData,
} from "@/app/actions/empleado_bancarios";
import { fetchActivosEmpleadoAction } from "@/app/actions/inventario";
import type { AsignacionActivo } from "@/types/inventario";
import FormField, { inputStyle } from "@/components/ui/FormField";
import EmergenciaSection from "./EmergenciaSection";
import CredencialesSection from "./CredencialesSection";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { iniciales } from "@/lib/empleados/utils";

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
import { useEmpleadoMutations } from "@/hooks/useEmpleadoMutations";
import { DEPARTAMENTOS, TIPOS_CONTRATO } from "@/lib/empleados/constants";
import type { EmpleadoDetalle, EmpleadoDatosPersonales, EmpleadoBitacoraEntry, TipoContrato } from "@/types/empleados";

interface SupervisorOption { id: string; nombres: string; apellido_paterno: string; apellido_materno: string }
interface UbicacionOption  { id: string; nombre: string }

interface Props {
  empleado: EmpleadoDetalle;
  supervisores?: SupervisorOption[];
  ubicaciones?: UbicacionOption[];
  soloLectura?: boolean;
}

const ACCION_LABELS: Record<string, string> = {
  ALTA_EMPLEADO: "Alta de empleado",
  ACTUALIZAR_EMPLEADO: "Actualización de datos",
  ACTUALIZAR_PERFIL: "Actualización de perfil",
  PRIVACIDAD_ACEPTADA: "Aviso de privacidad aceptado",
};
const ACCION_COLOR: Record<string, string> = {
  ALTA_EMPLEADO: "var(--green)",
  ACTUALIZAR_EMPLEADO: "var(--amber)",
  ACTUALIZAR_PERFIL: "#1677ff",
  PRIVACIDAD_ACEPTADA: "var(--green)",
};
const ESTADOS_EMP = [
  { value: "activo",   label: "Activo" },
  { value: "pendiente", label: "Pendiente" },
  { value: "inactivo", label: "Inactivo" },
];

export default function EmpleadoDetalleView({ empleado: inicial, supervisores = [], ubicaciones = [], soloLectura = false }: Props) {
  const [empleado, setEmpleado] = useState(inicial);
  const [fotoUrl, setFotoUrl]   = useState<string | null>(inicial.foto_url ?? null);
  const [fotoUploading, setFotoUploading] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const SECCIONES_EMPLEADO: SeccionId[] = ["relacion_laboral", "activos"];
  const [seccion, setSeccion]   = useState<SeccionId>(soloLectura ? "relacion_laboral" : "datos_personales");
  const [editOpen, setEditOpen] = useState(false);
  const { guardarPerfil, actualizar, generarInvitacion, loading, error, clearError } = useEmpleadoMutations();
  const [invitacionUrl, setInvitacionUrl] = useState<string | null>(null);

  // ── Datos personales form ──────────────────────────────────────────────────
  const dp = (empleado.datos_personales ?? {}) as EmpleadoDatosPersonales;
  const [formDp, setFormDp] = useState({
    fecha_nacimiento: dp.fecha_nacimiento ?? "",
    curp: dp.curp ?? "", rfc: dp.rfc ?? "", nss: dp.nss ?? "",
    fecha_alta_imss: dp.fecha_alta_imss ?? "",
    estado_civil: dp.estado_civil ?? "", nacionalidad: dp.nacionalidad ?? "Mexicana",
    tipo_sangre: dp.tipo_sangre ?? "",
  });

  // ── Edit modal form ────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    nombres:               empleado.nombres,
    apellido_paterno:      empleado.apellido_paterno,
    apellido_materno:      empleado.apellido_materno,
    puesto:                empleado.puesto,
    departamento:          empleado.departamento,
    tipo_contrato:         empleado.tipo_contrato as string,
    fecha_ingreso:         empleado.fecha_ingreso,
    supervisor_id:         empleado.supervisor_id ?? "",
    zona_ubicacion:        empleado.zona_ubicacion ?? "",
    estado:                empleado.estado,
    fecha_inicio_proyecto: (empleado as any).fecha_inicio_proyecto ?? "",
    fecha_fin_proyecto:    (empleado as any).fecha_fin_proyecto ?? "",
  });
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = () => {
    setEditForm({
      nombres:               empleado.nombres,
      apellido_paterno:      empleado.apellido_paterno,
      apellido_materno:      empleado.apellido_materno,
      puesto:                empleado.puesto,
      departamento:          empleado.departamento,
      tipo_contrato:         empleado.tipo_contrato,
      fecha_ingreso:         empleado.fecha_ingreso,
      supervisor_id:         empleado.supervisor_id ?? "",
      zona_ubicacion:        empleado.zona_ubicacion ?? "",
      estado:                empleado.estado,
      fecha_inicio_proyecto: (empleado as any).fecha_inicio_proyecto ?? "",
      fecha_fin_proyecto:    (empleado as any).fecha_fin_proyecto ?? "",
    });
    setEditError(null);
    clearError();
    setEditOpen(true);
  };

  const handleGuardarEdit = async () => {
    setEditError(null);
    const result = await actualizar(empleado.id, {
      nombres:               editForm.nombres.trim(),
      apellido_paterno:      editForm.apellido_paterno.trim(),
      apellido_materno:      editForm.apellido_materno.trim(),
      puesto:                editForm.puesto.trim(),
      departamento:          editForm.departamento,
      tipo_contrato:         editForm.tipo_contrato as TipoContrato,
      fecha_ingreso:         editForm.fecha_ingreso,
      supervisor_id:         editForm.supervisor_id || null,
      zona_ubicacion:        editForm.zona_ubicacion,
      estado:                editForm.estado,
      fecha_inicio_proyecto: editForm.fecha_inicio_proyecto || null,
      fecha_fin_proyecto:    editForm.fecha_fin_proyecto || null,
    });
    if (result.error) { setEditError(result.error); return; }
    setEmpleado(e => ({
      ...e,
      nombres:               editForm.nombres.trim(),
      apellido_paterno:      editForm.apellido_paterno.trim(),
      apellido_materno:      editForm.apellido_materno.trim(),
      puesto:                editForm.puesto.trim(),
      departamento:          editForm.departamento,
      tipo_contrato:         editForm.tipo_contrato as TipoContrato,
      fecha_ingreso:         editForm.fecha_ingreso,
      supervisor_id:         editForm.supervisor_id || null,
      zona_ubicacion:        editForm.zona_ubicacion,
      estado:                editForm.estado as EmpleadoDetalle["estado"],
      fecha_inicio_proyecto: editForm.fecha_inicio_proyecto || null,
      fecha_fin_proyecto:    editForm.fecha_fin_proyecto || null,
    }));
    setEditOpen(false);
  };

  // ── Datos personales save ──────────────────────────────────────────────────
  const handleGuardarDp = async () => {
    const result = await guardarPerfil(empleado.id, {
      ...formDp,
      fecha_nacimiento: formDp.fecha_nacimiento || null,
      fecha_alta_imss: formDp.fecha_alta_imss || null,
    });
    if (!result.error && result.progreso !== undefined)
      setEmpleado(e => ({ ...e, progreso_perfil: result.progreso as number }));
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await subirFotoEmpleadoAction(empleado.id, fd);
    if (!res.error && res.url) setFotoUrl(res.url);
    setFotoUploading(false);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  };

  const handleReenviarInvitacion = async () => {
    const result = await generarInvitacion(empleado.id);
    if (result.invitacionUrl) setInvitacionUrl(result.invitacionUrl);
  };

  const alertaDoc   = empleado.documentos?.find(d => d.estado === "por_vencer");
  const dpCompleto  = Boolean(formDp.curp && formDp.rfc && formDp.fecha_nacimiento);

  const completitud: Partial<Record<SeccionId, SeccionEstado>> = {
    datos_personales: dpCompleto ? { porcentaje: 100 } : { porcentaje: formDp.curp || formDp.rfc ? 50 : 20 },
    relacion_laboral: { porcentaje: 100 },
    documentos: alertaDoc
      ? { porcentaje: empleado.documentos.length > 0 ? 80 : 0, alerta: true }
      : { porcentaje: empleado.documentos.length >= 3 ? 100 : empleado.documentos.length > 0 ? 50 : 0 },
    emergencia:   { porcentaje: null },
    bancarios:    { porcentaje: null },
    credenciales: { porcentaje: null },
    activos:      { porcentaje: null },  // cargado lazy
    bitacora:     { porcentaje: null },
  };

  const ef = (k: keyof typeof editForm, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: "28px 32px" }}>
      <EmpleadoProfileHeader empleado={empleado} fotoUrl={fotoUrl} onEditar={soloLectura ? undefined : openEdit} soloLectura={soloLectura} />

      {!soloLectura && !empleado.tiene_privacidad && (
        <div style={{ padding: 14, marginBottom: 20, background: "var(--amber-light)", borderRadius: 6, border: "1px solid rgba(181,86,14,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span>⚠ Pendiente: aceptación del aviso de privacidad (LFPDPPP)</span>
          <button type="button" onClick={handleReenviarInvitacion} disabled={loading} style={btnSm}>Generar enlace</button>
        </div>
      )}
      {invitacionUrl && (
        <div style={{ fontSize: 11, marginBottom: 16, wordBreak: "break-all", fontFamily: "'DM Mono', monospace", padding: 10, background: "var(--green-light)", borderRadius: 4 }}>
          Enlace: {invitacionUrl}
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <EmpleadoSectionNav active={seccion} onChange={setSeccion} completitud={completitud} alerta={alertaDoc ? `${alertaDoc.nombre} por vencer` : null} visibles={soloLectura ? SECCIONES_EMPLEADO : undefined} />

        <div style={{ flex: 1 }}>
          {error && <div style={{ padding: 12, marginBottom: 12, background: "var(--red-light)", color: "var(--accent)", fontSize: 13, borderRadius: 4 }}>{error}</div>}

          {seccion === "datos_personales" && (
            <SectionPanel title="Datos personales" complete={dpCompleto}>
              {/* Foto de perfil */}
              <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFotoChange} />
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
                <div
                  onClick={() => !fotoUploading && fotoInputRef.current?.click()}
                  style={{ position: "relative", width: 72, height: 72, borderRadius: "50%", overflow: "hidden", cursor: fotoUploading ? "default" : "pointer", flexShrink: 0, border: "2px solid var(--border-strong)" }}
                >
                  {fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "var(--green)" }}>
                      {iniciales(empleado.nombres, empleado.apellido_paterno)}
                    </div>
                  )}
                  {/* Overlay */}
                  <div style={{ position: "absolute", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", opacity: fotoUploading ? 1 : 0, transition: "opacity 0.15s" }}
                    onMouseEnter={e => { if (!fotoUploading) (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                    onMouseLeave={e => { if (!fotoUploading) (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
                  >
                    {fotoUploading
                      ? <span style={{ color: "white", fontSize: 11 }}>Subiendo…</span>
                      : <CameraIcon />
                    }
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Foto de perfil</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>JPG, PNG o WebP · máx. 5 MB</div>
                  <button onClick={() => fotoInputRef.current?.click()} disabled={fotoUploading} style={{ padding: "5px 14px", background: "var(--card)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: "var(--ink)" }}>
                    {fotoUploading ? "Subiendo…" : fotoUrl ? "Cambiar foto" : "Subir foto"}
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <DataRow label="Nombre completo" value={`${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`} />
                <FormField label="Fecha de nacimiento">
                  <input type="date" style={inputStyle} value={formDp.fecha_nacimiento} onChange={e => setFormDp(f => ({ ...f, fecha_nacimiento: e.target.value }))} />
                </FormField>
                <FormField label="CURP">
                  <input style={{ ...inputStyle, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }} value={formDp.curp} onChange={e => setFormDp(f => ({ ...f, curp: e.target.value.toUpperCase() }))} placeholder="ABCD850315HDFXXX00" />
                </FormField>
                <FormField label="RFC">
                  <input style={{ ...inputStyle, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }} value={formDp.rfc} onChange={e => setFormDp(f => ({ ...f, rfc: e.target.value.toUpperCase() }))} placeholder="ABCD850315H45" />
                </FormField>
                <FormField label="NSS">
                  <input style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }} value={formDp.nss} onChange={e => setFormDp(f => ({ ...f, nss: e.target.value }))} placeholder="12345678901" />
                </FormField>
                <FormField label="Fecha de alta IMSS">
                  <input type="date" style={inputStyle} value={formDp.fecha_alta_imss} onChange={e => setFormDp(f => ({ ...f, fecha_alta_imss: e.target.value }))} />
                </FormField>
                <FormField label="Estado civil">
                  <select style={inputStyle} value={formDp.estado_civil} onChange={e => setFormDp(f => ({ ...f, estado_civil: e.target.value }))}>
                    <option value="">Seleccionar…</option>
                    {["Soltero/a","Casado/a","Unión libre","Divorciado/a","Viudo/a"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </FormField>
                <FormField label="Nacionalidad">
                  <input style={inputStyle} value={formDp.nacionalidad} onChange={e => setFormDp(f => ({ ...f, nacionalidad: e.target.value }))} placeholder="Mexicana" />
                </FormField>
                <FormField label="Tipo de sangre">
                  <select style={inputStyle} value={formDp.tipo_sangre} onChange={e => setFormDp(f => ({ ...f, tipo_sangre: e.target.value }))}>
                    <option value="">No especificado</option>
                    {["O+","O-","A+","A-","B+","B-","AB+","AB-"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </FormField>
              </div>
              {!soloLectura && (
                <button type="button" onClick={handleGuardarDp} disabled={loading} style={{ marginTop: 20, padding: "10px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  {loading ? "Guardando…" : "Guardar datos personales"}
                </button>
              )}
            </SectionPanel>
          )}

          {seccion === "relacion_laboral" && (
            <SectionPanel title="Relación laboral" complete>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <DataRow label="Puesto" value={empleado.puesto} />
                <DataRow label="Departamento" value={empleado.departamento} />
                <DataRow label="Tipo de contrato" value={TIPOS_CONTRATO.find(t => t.value === empleado.tipo_contrato)?.label ?? empleado.tipo_contrato} />
                <DataRow label="Zona / Ubicación" value={empleado.zona_ubicacion ?? "—"} />
                <DataRow label="Supervisor" value={empleado.supervisor_nombre ?? "—"} />
                {!soloLectura && <DataRow label="Fecha de ingreso" value={new Date(empleado.fecha_ingreso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} />}
                <DataRow label="Código empleado" value={empleado.codigo_empleado ?? "—"} mono />
                {dp.fecha_alta_imss && (
                  <DataRow label="Alta IMSS" value={new Date(dp.fecha_alta_imss + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} />
                )}
                {(empleado as any).fecha_inicio_proyecto && (
                  <DataRow label="Inicio de proyecto" value={new Date((empleado as any).fecha_inicio_proyecto + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} />
                )}
                {(empleado as any).fecha_fin_proyecto && (
                  <DataRow label="Fin de proyecto" value={new Date((empleado as any).fecha_fin_proyecto + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} />
                )}
              </div>
            </SectionPanel>
          )}

          {seccion === "documentos" && (
            <DocumentosSection
              empleadoId={empleado.id}
              documentos={empleado.documentos}
              onUpdate={docs => setEmpleado(e => ({ ...e, documentos: docs }))}
            />
          )}

          {seccion === "bitacora" && (
            <SectionPanel title="Bitácora de cambios">
              {empleado.bitacora.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>Sin eventos registrados</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {empleado.bitacora.map((entry, i) => <BitacoraEntry key={entry.id} entry={entry} isLast={i === empleado.bitacora.length - 1} />)}
                </div>
              )}
            </SectionPanel>
          )}

          {seccion === "bancarios" && (
            <BancariosSection empleadoId={empleado.id} />
          )}

          {seccion === "activos" && (
            <ActivosEmpleadoSection empleadoId={empleado.id} soloLectura={soloLectura} />
          )}

          {seccion === "emergencia" && (
            <EmergenciaSection empleadoId={empleado.id} />
          )}

          {seccion === "credenciales" && !soloLectura && (
            <CredencialesSection empleadoId={empleado.id} />
          )}
          {seccion === "credenciales" && soloLectura && (
            <SectionPanel title="Credenciales">
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Administrado por el equipo de sistemas.</p>
            </SectionPanel>
          )}

          {!["datos_personales","relacion_laboral","documentos","bitacora","bancarios","activos","emergencia","credenciales"].includes(seccion) && (
            <SectionPanel title={labelSeccion(seccion)}>
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                El empleado completará esta sección desde su portal de autoservicio.
              </div>
            </SectionPanel>
          )}
        </div>
      </div>

      {/* ── Modal de edición ─────────────────────────────────────────────── */}
      {!soloLectura && editOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(15,17,23,0.18)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Editar empleado</h2>
              <button onClick={() => setEditOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {(editError || error) && (
                <div style={{ padding: 12, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>
                  {editError ?? error}
                </div>
              )}

              {/* Datos personales */}
              <div>
                <div style={sLbl}>Datos personales</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <MF label="Nombre(s)" required><input style={iSt} value={editForm.nombres} onChange={e => ef("nombres", e.target.value)} /></MF>
                  <MF label="Apellido paterno" required><input style={iSt} value={editForm.apellido_paterno} onChange={e => ef("apellido_paterno", e.target.value)} /></MF>
                  <MF label="Apellido materno" required><input style={iSt} value={editForm.apellido_materno} onChange={e => ef("apellido_materno", e.target.value)} /></MF>
                </div>
              </div>

              {/* Relación laboral */}
              <div>
                <div style={sLbl}>Relación laboral</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <MF label="Puesto" required><input style={iSt} value={editForm.puesto} onChange={e => ef("puesto", e.target.value)} /></MF>
                  </div>
                  <MF label="Departamento" required>
                    <select style={iSt} value={editForm.departamento} onChange={e => ef("departamento", e.target.value)}>
                      {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </MF>
                  <MF label="Tipo de contrato">
                    <select style={iSt} value={editForm.tipo_contrato} onChange={e => ef("tipo_contrato", e.target.value)}>
                      {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </MF>
                  {editForm.tipo_contrato === "proyecto" && (
                    <>
                      <MF label="Inicio de proyecto">
                        <input type="date" style={iSt} value={editForm.fecha_inicio_proyecto} onChange={e => ef("fecha_inicio_proyecto", e.target.value)} />
                      </MF>
                      <MF label="Fin de proyecto">
                        <input type="date" style={iSt} value={editForm.fecha_fin_proyecto} onChange={e => ef("fecha_fin_proyecto", e.target.value)} min={editForm.fecha_inicio_proyecto || undefined} />
                      </MF>
                    </>
                  )}
                  <MF label="Fecha de admisión" required>
                    <input type="date" style={iSt} value={editForm.fecha_ingreso} onChange={e => ef("fecha_ingreso", e.target.value)} />
                  </MF>
                  <MF label="Estado">
                    <select style={iSt} value={editForm.estado} onChange={e => ef("estado", e.target.value)}>
                      {ESTADOS_EMP.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </MF>
                  <MF label="Supervisor directo">
                    <select style={iSt} value={editForm.supervisor_id} onChange={e => ef("supervisor_id", e.target.value)}>
                      <option value="">Sin supervisor</option>
                      {supervisores.map(s => <option key={s.id} value={s.id}>{s.nombres} {s.apellido_paterno}</option>)}
                    </select>
                  </MF>
                  <MF label="Zona / Ubicación">
                    <input style={iSt} type="text" value={editForm.zona_ubicacion} onChange={e => ef("zona_ubicacion", e.target.value)} placeholder="Ej. Oficina CDMX, Remoto…" />
                  </MF>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setEditOpen(false)} style={btnOl} disabled={loading}>Cancelar</button>
                <button onClick={handleGuardarEdit} style={btnGn} disabled={loading}>
                  {loading ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BitacoraEntry({ entry, isLast }: { entry: EmpleadoBitacoraEntry; isLast: boolean }) {
  const color = ACCION_COLOR[entry.accion] ?? "var(--muted)";
  const label = ACCION_LABELS[entry.accion] ?? entry.accion;
  const fecha = new Date(entry.created_at).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", gap: 16, paddingBottom: isLast ? 0 : 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>{fecha}</div>
      </div>
    </div>
  );
}

function labelSeccion(id: SeccionId): string {
  const labels: Record<SeccionId, string> = { datos_personales: "Datos personales", relacion_laboral: "Relación laboral", documentos: "Documentos", emergencia: "Emergencia", bancarios: "Bancarios", credenciales: "Credenciales", activos: "Activos asignados", bitacora: "Bitácora" };
  return labels[id];
}

function SectionPanel({ title, complete, warning, children }: { title: string; complete?: boolean; warning?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.05)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        {complete && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>✓ Completo</span>}
        {warning && !complete && <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600 }}>⚠ Requiere atención</span>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--ink)", fontFamily: mono ? "'DM Mono', monospace" : undefined }}>{value}</div>
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

// ─── DocumentosSection ───────────────────────────────────────────────────────

const TIPOS_DOC = [
  "CURP", "RFC", "INE / IFE", "Pasaporte", "NSS / Afiliación IMSS",
  "Acta de nacimiento", "Comprobante de domicilio", "Licencia de conducir",
  "Contrato de trabajo", "Título profesional", "Cédula profesional",
  "Certificado médico", "Otro",
];

const BUCKET = "empleado-docs";

function docStatus(doc: { fecha_vencimiento: string | null }): { text: string; color: string } {
  if (!doc.fecha_vencimiento) return { text: "Vigente", color: "var(--green)" };
  const days = Math.floor((new Date(doc.fecha_vencimiento + "T12:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0)   return { text: "Vencido", color: "var(--accent)" };
  if (days <= 30) return { text: `Vence en ${days} días`, color: "var(--amber)" };
  return {
    text: `Vigente hasta ${new Date(doc.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-MX", { month: "short", year: "numeric" })}`,
    color: "var(--green)",
  };
}

import type { EmpleadoDocumento } from "@/types/empleados";

function DocumentosSection({
  empleadoId,
  documentos: inicial,
  onUpdate,
}: {
  empleadoId: string;
  documentos: EmpleadoDocumento[];
  onUpdate: (docs: EmpleadoDocumento[]) => void;
}) {
  const [docs, setDocs]         = useState(inicial);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [uploading, setUploading]     = useState(false);
  const [confirmDoc, setConfirmDoc]   = useState<EmpleadoDocumento | null>(null);

  const [form, setForm] = useState({
    nombre: TIPOS_DOC[0],
    numero_documento: "",
    fecha_vencimiento: "",
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const alertaDoc = docs.find(d => d.estado === "por_vencer");

  const handleSubir = async () => {
    if (!archivo) { setUploadError("Selecciona un archivo"); return; }
    setUploadError(null);
    setUploading(true);

    // 1. Upload to Supabase Storage client-side
    const supabase = createClient();
    const ext      = archivo.name.split(".").pop() ?? "pdf";
    const ruta     = `empleados/${empleadoId}/${crypto.randomUUID()}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, archivo, { cacheControl: "3600", upsert: false });

    if (storageErr) {
      setUploading(false);
      setUploadError("Error al subir el archivo: " + storageErr.message);
      return;
    }

    // 2. Create DB record
    startTransition(async () => {
      const result = await agregarDocumentoEmpleadoAction(empleadoId, {
        nombre:           form.nombre,
        numero_documento: form.numero_documento || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        ruta_archivo:     ruta,
      });
      setUploading(false);
      if (result.error) { setUploadError(result.error); return; }
      const newDocs = [...docs, result.documento as EmpleadoDocumento];
      setDocs(newDocs);
      onUpdate(newDocs);
      setModalOpen(false);
      setForm({ nombre: TIPOS_DOC[0], numero_documento: "", fecha_vencimiento: "" });
      setArchivo(null);
      setDragging(false);
    });
  };

  const handleDescargar = async (doc: EmpleadoDocumento) => {
    if (!doc.ruta_archivo) return;
    const result = await getDocumentoUrlAction(doc.ruta_archivo);
    if (result.url) window.open(result.url, "_blank");
  };

  const handleEliminar = (doc: EmpleadoDocumento) => {
    setConfirmDoc(doc);
  };

  const doEliminar = () => {
    if (!confirmDoc) return;
    setConfirmDoc(null);
    startTransition(async () => {
      const result = await eliminarDocumentoEmpleadoAction(confirmDoc.id, empleadoId, confirmDoc.ruta_archivo);
      if (!result.error) {
        const newDocs = docs.filter(d => d.id !== confirmDoc.id);
        setDocs(newDocs);
        onUpdate(newDocs);
      }
    });
  };

  return (
    <>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.05)" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Documentos oficiales</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {alertaDoc && <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600 }}>⚠ 1 documento por vencer</span>}
            <button onClick={() => { setUploadError(null); setModalOpen(true); }} style={btnAddDoc}>+ Agregar documento</button>
          </div>
        </div>

        {/* List */}
        <div style={{ padding: docs.length === 0 ? "40px 20px" : "8px 20px 12px" }}>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
              Sin documentos registrados
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {docs.map((doc, i) => {
                const st = docStatus(doc);
                const tieneArchivo = !!doc.ruta_archivo;
                return (
                  <div key={doc.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 0",
                    borderBottom: i < docs.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                      background: doc.estado === "por_vencer" ? "var(--amber-light)" : "var(--surface)",
                      border: `1px solid ${doc.estado === "por_vencer" ? "rgba(181,86,14,0.2)" : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>
                      {tieneArchivo ? "📄" : "📋"}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{doc.nombre}</div>
                      {doc.numero_documento && (
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>
                          {doc.numero_documento}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <span style={{ fontSize: 12, color: st.color, fontWeight: doc.estado === "por_vencer" ? 600 : 400, whiteSpace: "nowrap" }}>
                      {st.text}
                    </span>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {tieneArchivo && (
                        <button onClick={() => handleDescargar(doc)} style={btnLink}>Descargar</button>
                      )}
                      <button onClick={() => handleEliminar(doc)} style={{ ...btnLink, color: "var(--accent)" }}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar documento */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(15,17,23,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Agregar documento</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>

            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {uploadError && <div style={{ padding: 10, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>{uploadError}</div>}

              <MF label="Tipo de documento" required>
                <select style={iSt} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}>
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </MF>

              <MF label="Número / Clave del documento">
                <input
                  style={{ ...iSt, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}
                  value={form.numero_documento}
                  onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))}
                  placeholder="Ej. VAOM850315MDFRRR09"
                />
              </MF>

              <MF label="Archivo (PDF o imagen)" required>
                <label
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "20px 16px",
                    border: `2px dashed ${archivo ? "var(--green)" : dragging ? "var(--ink)" : "var(--border-strong)"}`,
                    borderRadius: 6, cursor: "pointer",
                    background: archivo ? "rgba(45,106,79,0.04)" : dragging ? "var(--surface-2)" : "var(--surface)",
                    transition: "all 0.15s",
                  }}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragEnter={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setArchivo(f);
                  }}
                >
                  <span style={{ fontSize: 24 }}>{archivo ? "✅" : dragging ? "📂" : "📎"}</span>
                  <span style={{ fontSize: 13, color: archivo ? "var(--green)" : "var(--muted-2)", fontWeight: archivo ? 600 : 400 }}>
                    {archivo ? archivo.name : dragging ? "Suelta el archivo aquí" : "Arrastra o haz clic para seleccionar"}
                  </span>
                  {!archivo && !dragging && <span style={{ fontSize: 11, color: "var(--muted)" }}>PDF, JPG o PNG · máx. 10 MB</span>}
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                  />
                </label>
              </MF>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setModalOpen(false)} style={btnOl} disabled={uploading || isPending}>Cancelar</button>
                <button onClick={handleSubir} disabled={!archivo || uploading || isPending} style={{
                  ...btnGn,
                  background: !archivo ? "var(--disabled)" : "var(--green)",
                  cursor: !archivo ? "not-allowed" : "pointer",
                }}>
                  {uploading || isPending ? "Subiendo…" : "Subir documento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDoc !== null}
        title="Eliminar documento"
        message={`¿Eliminar "${confirmDoc?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={doEliminar}
        onCancel={() => setConfirmDoc(null)}
      />
    </>
  );
}

// ─── ActivosEmpleadoSection ───────────────────────────────────────────────────

function ActivosEmpleadoSection({ empleadoId, soloLectura }: { empleadoId: string; soloLectura?: boolean }) {
  const [activos, setActivos] = useState<AsignacionActivo[] | null>(null);
  const [cargado, setCargado] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cargar = () => {
    startTransition(async () => {
      const r = await fetchActivosEmpleadoAction(empleadoId);
      setActivos(r.data ?? []);
      setCargado(true);
    });
  };

  // Auto-load when employee is viewing their own expediente
  useEffect(() => { if (soloLectura) cargar(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.05)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Activos asignados</span>
        {!soloLectura && !cargado && <button onClick={cargar} disabled={isPending} style={btnAddDoc}>{isPending ? "Cargando…" : "Cargar activos"}</button>}
        {!soloLectura && cargado && <a href="/dashboard/inventario" style={{ fontSize: 12, color: "#1677ff", textDecoration: "none" }}>Ver inventario completo →</a>}
      </div>
      <div style={{ padding: 20 }}>
        {!cargado ? (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Haz clic en &quot;Cargar activos&quot; para ver el equipo asignado.</div>
        ) : !activos?.length ? (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Sin activos asignados actualmente.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activos.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {a.categoria_icono ?? "📦"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{a.activo_nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 2 }}>
                    {[a.categoria_nombre, a.marca, a.modelo].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {a.numero_activo && <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--green)", fontWeight: 600 }}>{a.numero_activo}</div>}
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                    Desde {new Date(a.fecha_asignacion + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BancariosSection ─────────────────────────────────────────────────────────

const BANCOS = ["BBVA México","Banorte","Santander","HSBC","Citibanamex","Scotiabank","Banco del Bienestar","Otro"];
const TIPOS_CUENTA = [
  { value: "nomina",   label: "Nómina" },
  { value: "cheques",  label: "Cheques" },
  { value: "debito",   label: "Débito" },
  { value: "otro",     label: "Otro" },
];

function maskFin(val: string | null, show: number, grupos = "•••• •••• "): string {
  if (!val) return "—";
  return `${grupos}${val.slice(-show)}`;
}

function BancariosSection({ empleadoId }: { empleadoId: string }) {
  const [data, setData]           = useState<BancariosData | null>(null);
  const [cargado, setCargado]     = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [revealed, setRevealed]   = useState<Set<string>>(new Set());
  const [form, setForm]           = useState<BancariosData>({ banco: null, tipo_cuenta: "nomina", numero_cuenta: null, clabe: null, numero_tarjeta: null, salario_texto: null });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cargar = () => {
    startTransition(async () => {
      const r = await getBancariosAction(empleadoId);
      setData(r.data);
      setCargado(true);
    });
  };

  const reveal = async (campo: string) => {
    setRevealed(prev => new Set([...Array.from(prev), campo]));
    await logConsultaBancarioAction(empleadoId, campo);
  };

  const openEdit = () => {
    setForm({
      banco:          data?.banco          ?? null,
      tipo_cuenta:    data?.tipo_cuenta    ?? "nomina",
      numero_cuenta:  data?.numero_cuenta  ?? null,
      clabe:          data?.clabe          ?? null,
      numero_tarjeta: data?.numero_tarjeta ?? null,
      salario_texto:  data?.salario_texto  ?? null,
    });
    setSaveError(null);
    setEditOpen(true);
  };

  const handleGuardar = () => {
    setSaveError(null);
    startTransition(async () => {
      const r = await guardarBancariosAction(empleadoId, form);
      if (r.error) { setSaveError(r.error); return; }
      setData(form);
      setRevealed(new Set());
      setEditOpen(false);
    });
  };

  const sf = (k: keyof BancariosData, v: string) => setForm(f => ({ ...f, [k]: v || null }));

  return (
    <>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.05)" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            Datos bancarios
            <span style={{ fontSize: 12 }}>🔒</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "rgba(200,71,42,0.08)", color: "var(--accent)", border: "1px solid rgba(200,71,42,0.2)" }}>
              Información sensible
            </span>
            {cargado && <button onClick={openEdit} style={btnAddDoc}>Editar</button>}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {!cargado ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Los datos están protegidos. Haz clic para cargar.</div>
              <button onClick={cargar} disabled={isPending} style={{ ...btnAddDoc, background: "var(--ink)" }}>
                {isPending ? "Cargando…" : "🔓 Cargar datos bancarios"}
              </button>
            </div>
          ) : !data ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Sin datos bancarios registrados</div>
              <button onClick={openEdit} style={btnAddDoc}>+ Agregar datos bancarios</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 40px" }}>
              <BField label="Banco" value={data.banco} />
              <BField label="Tipo de cuenta" value={TIPOS_CUENTA.find(t => t.value === data.tipo_cuenta)?.label ?? data.tipo_cuenta} />
              <BField label="Número de cuenta" value={maskFin(data.numero_cuenta, 4)} masked revealed={revealed.has("numero_cuenta")} revealedValue={data.numero_cuenta} onReveal={() => reveal("numero_cuenta")} />
              <BField label="CLABE" value={maskFin(data.clabe, 2, "•••• •••• •••• •••• ")} masked revealed={revealed.has("clabe")} revealedValue={data.clabe} onReveal={() => reveal("clabe")} />
              <BField label="Tarjeta" value={maskFin(data.numero_tarjeta, 4)} />
              <BField label="Salario" value="•••••••" masked revealed={revealed.has("salario")} revealedValue={data.salario_texto} onReveal={() => reveal("salario")} />
            </div>
          )}
        </div>

        {/* Footer */}
        {cargado && data && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>🛡</span>
            <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
              Cada operación de descifrado queda registrada en la bitácora con tu usuario, IP y timestamp.
            </span>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(15,17,23,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Datos bancarios</h2>
              <button onClick={() => setEditOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {saveError && <div style={{ padding: 10, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>{saveError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <MF label="Banco">
                  <select style={iSt} value={form.banco ?? ""} onChange={e => sf("banco", e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </MF>
                <MF label="Tipo de cuenta">
                  <select style={iSt} value={form.tipo_cuenta ?? "nomina"} onChange={e => sf("tipo_cuenta", e.target.value)}>
                    {TIPOS_CUENTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </MF>
                <MF label="Número de cuenta">
                  <input style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={form.numero_cuenta ?? ""} onChange={e => sf("numero_cuenta", e.target.value)} placeholder="0123456789" />
                </MF>
                <MF label="CLABE interbancaria">
                  <input style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={form.clabe ?? ""} onChange={e => sf("clabe", e.target.value)} placeholder="18 dígitos" maxLength={18} />
                </MF>
                <MF label="Número de tarjeta">
                  <input style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={form.numero_tarjeta ?? ""} onChange={e => sf("numero_tarjeta", e.target.value)} placeholder="16 dígitos" maxLength={19} />
                </MF>
                <MF label="Salario">
                  <input style={iSt} value={form.salario_texto ?? ""} onChange={e => sf("salario_texto", e.target.value)} placeholder="Ej. $25,000.00 MXN" />
                </MF>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--amber-light)", borderRadius: 4, fontSize: 12, color: "var(--muted-2)", border: "1px solid rgba(181,86,14,0.15)" }}>
                🔒 Esta información es sensible. El acceso y modificación queda registrado en la bitácora.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setEditOpen(false)} style={btnOl} disabled={isPending}>Cancelar</button>
                <button onClick={handleGuardar} style={btnGn} disabled={isPending}>
                  {isPending ? "Guardando…" : "Guardar datos bancarios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BField({
  label, value, masked, revealed, revealedValue, onReveal,
}: {
  label: string;
  value: string | null;
  masked?: boolean;
  revealed?: boolean;
  revealedValue?: string | null;
  onReveal?: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--ink)", fontFamily: masked ? "'DM Mono', monospace" : undefined, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{revealed && revealedValue ? revealedValue : (value ?? "—")}</span>
        {masked && revealedValue && (
          <button onClick={onReveal} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1 }}
            title={revealed ? "Ocultar" : "Ver valor"}>
            {revealed ? "🙈" : "👁"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const iSt: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: 13, border: "1.5px solid var(--border-strong)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--card)", outline: "none", boxSizing: "border-box" };
const sLbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 };
const btnSm: React.CSSProperties = { padding: "6px 14px", background: "var(--amber)", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnGn: React.CSSProperties = { padding: "10px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnOl: React.CSSProperties = { padding: "10px 18px", background: "var(--card)", color: "var(--ink)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnAddDoc: React.CSSProperties = { padding: "6px 14px", background: "var(--green)", color: "white", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnLink: React.CSSProperties = { background: "none", border: "none", fontSize: 12, color: "#1677ff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "2px 4px", textDecoration: "underline" };
