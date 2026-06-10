"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  crearContratoAction, actualizarContratoAction, eliminarContratoAction,
  fetchAccesoEmpleadosAction, grantAccesoEmpleadoAction, revokeAccesoEmpleadoAction,
} from "@/app/actions/contratos";
import { toggleActivoAction } from "@/app/actions/entidades";
import PlacesAutocomplete from "@/components/directorio/PlacesAutocomplete";
import type { Contrato, ContratoEstado, CrearContratoInput, EmpleadoAcceso } from "@/types/contratos";
import type { PlaceData } from "@/types/directorio";

interface Props {
  cliente: {
    id: string;
    nombre: string;
    activo: boolean;
    created_at: string;
    contratos: Contrato[];
    totalRequerimientos: number;
    requerimientosActivos: number;
    totalReactivos: number;
    totalUsuarios: number;
  };
  rol: string;
  backHref?: string;
  backLabel?: string;
}

const ESTADOS_REPUBLICA = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima",
  "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Estado de México",
  "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
  "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

type ModalMode = "crear" | "editar" | "usuarios" | null;

const emptyForm = (nombreEmpresa: string, modo: "crear" | "editar"): ContratoFormState => ({
  nombre: modo === "crear" ? `${nombreEmpresa} — Contrato` : "",
  numero_contrato: "",
  concepto: "",
  fecha_inicio: new Date().toISOString().split("T")[0],
  fecha_fin: "",
  estado: "vigente",
  calle: "",
  numero_exterior: "",
  numero_interior: "",
  colonia: "",
  municipio: "",
  estado_republica: "",
  cp: "",
  referencias: "",
});

interface ContratoFormState {
  nombre: string;
  numero_contrato: string;
  concepto: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: ContratoEstado;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  municipio: string;
  estado_republica: string;
  cp: string;
  referencias: string;
}

// ── Estado visual del contrato basado en fecha_fin ──────────────────────────
function calcEstadoVisual(c: Contrato): { label: string; bg: string; color: string } {
  if (c.estado === "cancelado") return { label: "Cancelado", bg: "#f1f5f9", color: "#64748b" };
  if (c.estado === "vencido")   return { label: "Vencido",   bg: "#fdecea", color: "#c8472a" };

  if (c.fecha_fin) {
    const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin  = new Date(c.fecha_fin + "T12:00:00");
    const dias = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
    if (dias < 0)  return { label: "Vencido",          bg: "#fdecea", color: "#c8472a" };
    if (dias <= 30) return { label: "Próximo a vencer", bg: "#fff7ed", color: "#c2410c" };
  }
  return { label: "Vigente", bg: "#d1fae5", color: "#065f46" };
}

export default function ClienteDetalleView({ cliente: initial, rol, backHref = "/dashboard/clientes", backLabel = "Clientes" }: Props) {
  const [cliente, setCliente] = useState(initial);
  const [modal, setModal]     = useState<ModalMode>(null);
  const [editando, setEditando]   = useState<Contrato | null>(null);
  const [form, setForm]           = useState<ContratoFormState>(emptyForm(initial.nombre, "crear"));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [toggling, setToggling]     = useState(false);

  // Usuarios modal state
  const [empleados, setEmpleados]   = useState<EmpleadoAcceso[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [busqueda, setBusqueda]     = useState("");
  const [togAcceso, setTogAcceso]   = useState<string | null>(null);

  const router = useRouter();
  const isAdmin    = rol === "admin" || rol === "superadmin";
  const isSuperadmin = rol === "superadmin";

  // Load employees when modal opens
  const cargarEmpleados = useCallback(async () => {
    setLoadingEmp(true);
    const result = await fetchAccesoEmpleadosAction(cliente.id);
    if (result.data) setEmpleados(result.data);
    setLoadingEmp(false);
  }, [cliente.id]);

  useEffect(() => {
    if (modal === "usuarios") cargarEmpleados();
  }, [modal, cargarEmpleados]);

  function abrirCrear() {
    setForm(emptyForm(cliente.nombre, "crear"));
    setEditando(null);
    setFormError("");
    setModal("crear");
  }

  function abrirEditar(contrato: Contrato) {
    setForm({
      nombre:           contrato.nombre,
      numero_contrato:  contrato.numero_contrato ?? "",
      concepto:         contrato.concepto ?? "",
      fecha_inicio:     contrato.fecha_inicio,
      fecha_fin:        contrato.fecha_fin ?? "",
      estado:           contrato.estado,
      calle:            contrato.calle ?? "",
      numero_exterior:  contrato.numero_exterior ?? "",
      numero_interior:  contrato.numero_interior ?? "",
      colonia:          contrato.colonia ?? "",
      municipio:        contrato.municipio ?? "",
      estado_republica: contrato.estado_republica ?? "",
      cp:               contrato.cp ?? "",
      referencias:      contrato.referencias ?? "",
    });
    setEditando(contrato);
    setFormError("");
    setModal("editar");
  }

  function cerrarModal() {
    setModal(null);
    setEditando(null);
    setFormError("");
    setBusqueda("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setFormError("El nombre del contrato es obligatorio"); return; }
    if (!form.fecha_inicio)  { setFormError("La fecha de inicio es obligatoria"); return; }

    setSubmitting(true);
    setFormError("");

    if (modal === "crear") {
      const input: CrearContratoInput = {
        entidad_id:       cliente.id,
        nombre:           form.nombre,
        numero_contrato:  form.numero_contrato || undefined,
        concepto:         form.concepto || undefined,
        fecha_inicio:     form.fecha_inicio,
        fecha_fin:        form.fecha_fin || undefined,
        estado:           form.estado,
        calle:            form.calle || undefined,
        numero_exterior:  form.numero_exterior || undefined,
        numero_interior:  form.numero_interior || undefined,
        colonia:          form.colonia || undefined,
        municipio:        form.municipio || undefined,
        estado_republica: form.estado_republica || undefined,
        cp:               form.cp || undefined,
        referencias:      form.referencias || undefined,
      };
      const result = await crearContratoAction(input);
      if (result.error) { setFormError(result.error); setSubmitting(false); return; }
      if (result.contrato) {
        setCliente(prev => ({ ...prev, contratos: [{ ...result.contrato!, totalReactivos: 0 }, ...prev.contratos] }));
      }
    } else if (modal === "editar" && editando) {
      const result = await actualizarContratoAction({
        id:               editando.id,
        nombre:           form.nombre,
        numero_contrato:  form.numero_contrato || undefined,
        concepto:         form.concepto || undefined,
        fecha_inicio:     form.fecha_inicio,
        fecha_fin:        form.fecha_fin || undefined,
        estado:           form.estado,
        calle:            form.calle || undefined,
        numero_exterior:  form.numero_exterior || undefined,
        numero_interior:  form.numero_interior || undefined,
        colonia:          form.colonia || undefined,
        municipio:        form.municipio || undefined,
        estado_republica: form.estado_republica || undefined,
        cp:               form.cp || undefined,
        referencias:      form.referencias || undefined,
      });
      if (result.error) { setFormError(result.error); setSubmitting(false); return; }
      if (result.contrato) {
        setCliente(prev => ({
          ...prev,
          contratos: prev.contratos.map(c =>
            c.id === editando.id
              ? { ...result.contrato!, totalReactivos: c.totalReactivos ?? 0 }
              : c
          ),
        }));
      }
    }

    cerrarModal();
    setSubmitting(false);
    router.refresh();
  };

  const handleEliminar = async (contrato: Contrato) => {
    if (!confirm(`¿Eliminar el contrato "${contrato.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(contrato.id);
    const result = await eliminarContratoAction(contrato.id, cliente.id);
    if (!result.error) {
      setCliente(prev => ({ ...prev, contratos: prev.contratos.filter(c => c.id !== contrato.id) }));
    }
    setEliminando(null);
  };

  const handleToggleCliente = async () => {
    setToggling(true);
    const result = await toggleActivoAction(cliente.id, !cliente.activo);
    if (!result.error) setCliente(prev => ({ ...prev, activo: !prev.activo }));
    setToggling(false);
  };

  const handlePlaceSelect = (place: PlaceData) => {
    setForm(prev => ({
      ...prev,
      calle:            place.calle        || prev.calle,
      numero_exterior:  place.numero_ext   || prev.numero_exterior,
      colonia:          place.colonia      || prev.colonia,
      municipio:        place.municipio    || prev.municipio,
      estado_republica: place.estado_dir   || prev.estado_republica,
      cp:               place.cp           || prev.cp,
    }));
  };

  const handleToggleAcceso = async (emp: EmpleadoAcceso) => {
    setTogAcceso(emp.id);
    const result = emp.tiene_acceso
      ? await revokeAccesoEmpleadoAction(cliente.id, emp.id)
      : await grantAccesoEmpleadoAction(cliente.id, emp.id);

    if (!result.error) {
      setEmpleados(prev => prev.map(e =>
        e.id === emp.id ? { ...e, tiene_acceso: !e.tiene_acceso } : e
      ));
      setCliente(prev => ({
        ...prev,
        totalUsuarios: prev.totalUsuarios + (emp.tiene_acceso ? -1 : 1),
      }));
    }
    setTogAcceso(null);
  };

  const f = (k: keyof ContratoFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  const empFiltrados = empleados.filter(e => {
    const q = busqueda.toLowerCase();
    return (
      e.nombres.toLowerCase().includes(q) ||
      e.apellido_paterno.toLowerCase().includes(q) ||
      e.departamento.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={backHref} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>
            ← {backLabel}
          </Link>
          <span style={{ color: "var(--muted)" }}>/</span>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
              {cliente.nombre}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
              Alta: {new Date(cliente.created_at).toLocaleDateString("es-MX")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge activo={cliente.activo} />
          {isSuperadmin && (
            <button
              onClick={handleToggleCliente}
              disabled={toggling}
              style={{
                padding: "6px 14px", background: "var(--card)",
                color: cliente.activo ? "var(--amber)" : "var(--green)",
                border: `1px solid ${cliente.activo ? "rgba(181,86,14,0.25)" : "rgba(45,106,79,0.25)"}`,
                borderRadius: 4, fontSize: 12, fontWeight: 500,
                cursor: toggling ? "not-allowed" : "pointer",
                opacity: toggling ? 0.5 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {toggling ? "…" : cliente.activo ? "Desactivar" : "Activar"}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={abrirCrear}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px",
                background: "var(--ink)", color: "white",
                border: "none", borderRadius: 4,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <PlusIcon /> Nuevo contrato
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard
            label="Total requerimientos"
            value={cliente.totalRequerimientos}
            accent="#1B4F8A"
            meta={`${cliente.requerimientosActivos} activos`}
          />
          <StatCard
            label="Reqs. activos"
            value={cliente.requerimientosActivos}
            accent="var(--amber)"
            meta={`de ${cliente.totalRequerimientos} total`}
          />
          <StatCard
            label="Total reactivos"
            value={cliente.totalReactivos}
            accent="var(--green)"
            meta="Ítems de requerimientos"
          />
          <StatCard
            label="Usuarios con acceso"
            value={cliente.totalUsuarios}
            accent="var(--accent)"
            meta="Clientes + empleados"
            onClick={isAdmin ? () => setModal("usuarios") : undefined}
            clickLabel={isAdmin ? "Gestionar" : undefined}
          />
        </div>

        {/* Contratos */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 8, overflow: "hidden",
          boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Contratos</div>
          </div>

          {cliente.contratos.length === 0 ? (
            <div style={{
              padding: "48px 20px", textAlign: "center",
              color: "var(--muted)", fontSize: 13,
              fontFamily: "'DM Mono', monospace",
            }}>
              {isAdmin
                ? "Sin contratos — usa el botón \"Nuevo contrato\" para agregar uno"
                : "Sin contratos registrados"}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  <Th>Contrato</Th>
                  <Th>Concepto</Th>
                  <Th align="center">Reactivos</Th>
                  <Th>Vigencia</Th>
                  <Th>Estado</Th>
                  {isAdmin && <Th></Th>}
                </tr>
              </thead>
              <tbody>
                {cliente.contratos.map(c => {
                  const ev = calcEstadoVisual(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/dashboard/directorio/empresa/${cliente.id}/${c.id}`)}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(15,17,23,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Contrato */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.nombre}</div>
                        {c.numero_contrato && (
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>
                            {c.numero_contrato}
                          </div>
                        )}
                      </td>

                      {/* Concepto */}
                      <td style={{ padding: "14px 20px", maxWidth: 200 }}>
                        {c.concepto ? (
                          <span style={{
                            fontSize: 12, color: "var(--ink)",
                            display: "block", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }} title={c.concepto}>
                            {c.concepto}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>—</span>
                        )}
                      </td>

                      {/* Reactivos */}
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, borderRadius: "50%",
                          background: (c.totalReactivos ?? 0) > 0 ? "var(--tint-blue)" : "var(--surface-2)",
                          color: (c.totalReactivos ?? 0) > 0 ? "#1B4F8A" : "var(--muted)",
                          fontSize: 13, fontWeight: 700,
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {c.totalReactivos ?? 0}
                        </span>
                      </td>

                      {/* Vigencia */}
                      <td style={{ padding: "14px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
                        {c.fecha_fin ? (
                          <>
                            <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                              {new Date(c.fecha_fin + "T12:00:00").toLocaleDateString("es-MX")}
                            </div>
                            <div style={{ color: "var(--muted)", marginTop: 1 }}>
                              desde {new Date(c.fecha_inicio + "T12:00:00").toLocaleDateString("es-MX")}
                            </div>
                          </>
                        ) : (
                          <div style={{ color: "var(--muted)" }}>
                            desde {new Date(c.fecha_inicio + "T12:00:00").toLocaleDateString("es-MX")}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 9px", borderRadius: 100,
                          fontSize: 11, fontWeight: 600,
                          fontFamily: "'DM Mono', monospace",
                          background: ev.bg, color: ev.color,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                          {ev.label}
                        </span>
                      </td>

                      {isAdmin && (
                        <td style={{ padding: "14px 20px", textAlign: "right", whiteSpace: "nowrap" }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => abrirEditar(c)}
                            style={{
                              padding: "5px 12px", background: "var(--card)",
                              color: "var(--ink)",
                              border: "1px solid var(--border-strong)",
                              borderRadius: 4, fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                              marginRight: 6,
                            }}
                          >
                            Editar
                          </button>
                          {isSuperadmin && (
                            <button
                              onClick={() => handleEliminar(c)}
                              disabled={eliminando === c.id}
                              style={{
                                padding: "5px 12px", background: "var(--card)",
                                color: "var(--accent)",
                                border: "1px solid rgba(200,71,42,0.25)",
                                borderRadius: 4, fontSize: 12,
                                cursor: eliminando === c.id ? "not-allowed" : "pointer",
                                opacity: eliminando === c.id ? 0.5 : 1,
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {eliminando === c.id ? "…" : "Eliminar"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal crear / editar contrato */}
      {(modal === "crear" || modal === "editar") && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "var(--overlay)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: 24, overflowY: "auto",
          }}
          onClick={e => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div style={{
            background: "var(--card)", borderRadius: 10,
            width: "100%", maxWidth: 560,
            boxShadow: "0 12px 40px rgba(15,17,23,0.2)",
            margin: "auto",
          }}>
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                {modal === "crear" ? "Nuevo contrato" : "Editar contrato"}
              </div>
              <button onClick={cerrarModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "65vh", overflowY: "auto" }}>

                <Field label="Nombre del contrato *">
                  <input type="text" value={form.nombre} onChange={f("nombre")} required autoFocus style={inputStyle} />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="N° de contrato (opcional)">
                    <input type="text" value={form.numero_contrato} onChange={f("numero_contrato")} placeholder="CONT-2024-001" style={inputStyle} />
                  </Field>
                  <Field label="Estado">
                    <select value={form.estado} onChange={f("estado")} style={inputStyle}>
                      <option value="vigente">Vigente</option>
                      <option value="vencido">Vencido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </Field>
                </div>

                <Field label="Concepto (descripción del contrato)">
                  <input type="text" value={form.concepto} onChange={f("concepto")} placeholder="Ej. Auditoría financiera anual" style={inputStyle} />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Fecha inicio *">
                    <input type="date" value={form.fecha_inicio} onChange={f("fecha_inicio")} required style={inputStyle} />
                  </Field>
                  <Field label="Vigencia / Fecha límite">
                    <input type="date" value={form.fecha_fin} onChange={f("fecha_fin")} style={inputStyle} />
                  </Field>
                </div>

                <div style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "var(--muted)",
                  borderTop: "1px solid var(--border)", paddingTop: 12,
                }}>
                  Dirección de servicio (opcional)
                </div>

                <Field label="Buscar con Google Maps">
                  <PlacesAutocomplete onSelect={handlePlaceSelect} disabled={submitting} />
                </Field>

                <Field label="Calle">
                  <input type="text" value={form.calle} onChange={f("calle")} placeholder="Av. Principal" style={inputStyle} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="N° exterior">
                    <input type="text" value={form.numero_exterior} onChange={f("numero_exterior")} placeholder="101" style={inputStyle} />
                  </Field>
                  <Field label="N° interior">
                    <input type="text" value={form.numero_interior} onChange={f("numero_interior")} placeholder="A" style={inputStyle} />
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Colonia">
                    <input type="text" value={form.colonia} onChange={f("colonia")} placeholder="Centro" style={inputStyle} />
                  </Field>
                  <Field label="Municipio / Alcaldía">
                    <input type="text" value={form.municipio} onChange={f("municipio")} placeholder="Monterrey" style={inputStyle} />
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Estado">
                    <select value={form.estado_republica} onChange={f("estado_republica")} style={inputStyle}>
                      <option value="">— Seleccionar —</option>
                      {ESTADOS_REPUBLICA.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </Field>
                  <Field label="Código postal">
                    <input type="text" value={form.cp} onChange={f("cp")} placeholder="64000" maxLength={5} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Referencias (opcional)">
                  <textarea value={form.referencias} onChange={f("referencias")} placeholder="Entre calles, referencias adicionales…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>

                {formError && (
                  <div style={{ padding: "8px 12px", background: "var(--red-light)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
                    {formError}
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={cerrarModal} style={{ padding: "8px 16px", background: "var(--card)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} style={{ padding: "8px 20px", background: submitting ? "var(--disabled)" : "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  {submitting ? "Guardando…" : modal === "crear" ? "Crear contrato" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal gestión de usuarios */}
      {modal === "usuarios" && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(15,17,23,0.2)" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Acceso a este directorio</div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                  {cliente.totalUsuarios} usuario{cliente.totalUsuarios !== 1 ? "s" : ""} con acceso
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            {/* Búsqueda */}
            <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Buscar empleado por nombre o departamento…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {/* Lista empleados */}
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
              {loadingEmp ? (
                <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
                  Cargando empleados…
                </div>
              ) : empFiltrados.length === 0 ? (
                <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
                  Sin resultados
                </div>
              ) : empFiltrados.map(emp => (
                <div key={emp.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 24px",
                  borderBottom: "1px solid var(--border)",
                  background: emp.tiene_acceso ? "rgba(27,79,138,0.03)" : "transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: emp.tiene_acceso ? "var(--tint-blue)" : "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      color: emp.tiene_acceso ? "#1B4F8A" : "var(--muted)",
                      flexShrink: 0,
                    }}>
                      {emp.nombres.charAt(0)}{emp.apellido_paterno.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                        {emp.nombres} {emp.apellido_paterno} {emp.apellido_materno ?? ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                        {emp.departamento}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={togAcceso === emp.id}
                    onClick={() => handleToggleAcceso(emp)}
                    style={{
                      padding: "5px 14px",
                      background: emp.tiene_acceso ? "var(--red-light)" : "var(--tint-blue)",
                      color: emp.tiene_acceso ? "var(--accent)" : "#1B4F8A",
                      border: `1px solid ${emp.tiene_acceso ? "rgba(200,71,42,0.2)" : "rgba(27,79,138,0.2)"}`,
                      borderRadius: 4, fontSize: 12, fontWeight: 500,
                      cursor: togAcceso === emp.id ? "not-allowed" : "pointer",
                      opacity: togAcceso === emp.id ? 0.5 : 1,
                      fontFamily: "'DM Sans', sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {togAcceso === emp.id ? "…" : emp.tiene_acceso ? "Revocar" : "Dar acceso"}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", flexShrink: 0, fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
              Los clientes se gestionan desde el módulo de Usuarios
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px",
  background: "var(--surface)",
  border: "1.5px solid var(--border-strong)",
  borderRadius: 4, fontSize: 13, color: "var(--ink)",
  fontFamily: "'DM Sans', sans-serif", outline: "none",
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--muted-2)", marginBottom: 6,
        fontFamily: "'DM Mono', monospace",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ activo }: { activo: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
      background: activo ? "var(--green-light)" : "var(--surface-2)",
      color: activo ? "var(--green)" : "var(--muted)",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: activo ? "var(--green)" : "var(--muted)" }} />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function StatCard({ label, value, accent, meta, onClick, clickLabel }: {
  label: string; value: number; accent: string; meta?: string;
  onClick?: () => void; clickLabel?: string;
}) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
      padding: 20, boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
      borderTop: `3px solid ${accent}`,
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s",
    }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(15,17,23,0.12)"; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(15,17,23,0.08)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
          {label}
        </div>
        {clickLabel && (
          <span style={{ fontSize: 10, color: accent, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            {clickLabel} →
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "var(--ink)", lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      {meta && (
        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{meta}</div>
      )}
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "center" }) {
  return (
    <th style={{
      padding: "10px 20px", textAlign: align ?? "left",
      fontSize: 10, fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--muted)", borderBottom: "1px solid var(--border)",
    }}>
      {children}
    </th>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
