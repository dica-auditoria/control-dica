"use client";

import { useState, useEffect } from "react";
import { crearUsuarioAction, editarClienteAction, toggleActivoClienteAction, eliminarClienteAction, fetchUserContratosAction, updateUserContratosAction } from "@/app/actions/usuarios";
import { fetchContratosAction } from "@/app/actions/contratos";
import type { Contrato } from "@/types/contratos";

export interface ClienteUsuarioItem {
  id: string;
  nombre: string;
  email: string;
  entidad_id: string | null;
  entidad_nombre: string | null;
  contrato_id: string | null;
  contrato_nombre: string | null;
  activo: boolean;
  created_at: string;
}

export interface EntidadOpcion {
  id: string;
  nombre: string;
}

interface Props {
  usuarios: ClienteUsuarioItem[];
  entidades: EntidadOpcion[];
  rol: string;
}

interface FormState {
  nombre: string;
  email: string;
  password: string;
  confirmar: string;
  entidad_id: string;
}

const EMPTY: FormState = {
  nombre: "", email: "", password: "", confirmar: "",
  entidad_id: "",
};

export default function ClientesAccesoView({ usuarios: inicial, entidades, rol }: Props) {
  const [usuarios, setUsuarios] = useState(inicial);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [contratosIds, setContratosIds] = useState<string[]>([""]); // lista dinámica
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [emailsAcceso, setEmailsAcceso] = useState<string[]>([]);

  // Modal editar
  const [editModal, setEditModal] = useState<ClienteUsuarioItem | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", password: "", confirmar: "" });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editShowPass, setEditShowPass] = useState(false);
  const [editContratos, setEditContratos] = useState<Contrato[]>([]); // opciones disponibles
  const [editContratosIds, setEditContratosIds] = useState<string[]>([]); // seleccionados
  const [editLoadingContratos, setEditLoadingContratos] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const abrirEditar = async (u: ClienteUsuarioItem) => {
    setEditForm({ nombre: u.nombre, email: u.email, password: "", confirmar: "" });
    setEditError("");
    setEditShowPass(false);
    setEditContratosIds([]);
    setEditContratos([]);
    setEditModal(u);

    if (u.entidad_id) {
      setEditLoadingContratos(true);
      const [rContratos, rUserContratos] = await Promise.all([
        fetchContratosAction(u.entidad_id),
        fetchUserContratosAction(u.id),
      ]);
      setEditContratos((rContratos.data ?? []).filter(c => c.estado === "vigente"));
      const ids = (rUserContratos.data ?? []).map(c => c.id);
      setEditContratosIds(ids.length > 0 ? ids : [""]);
      setEditLoadingContratos(false);
    }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (editForm.password && editForm.password !== editForm.confirmar) {
      setEditError("Las contraseñas no coinciden"); return;
    }
    if (editForm.password && editForm.password.length < 8) {
      setEditError("La contraseña debe tener al menos 8 caracteres"); return;
    }
    setEditSubmitting(true);
    const contratosValidos = editContratosIds.filter(Boolean);
    if (contratosValidos.length === 0) {
      setEditError("Asigna al menos un contrato"); setEditSubmitting(false); return;
    }

    const [rEdit, rContratos] = await Promise.all([
      editarClienteAction({
        userId: editModal!.id,
        nombre: editForm.nombre !== editModal!.nombre ? editForm.nombre : undefined,
        email:  editForm.email  !== editModal!.email  ? editForm.email  : undefined,
        password: editForm.password || undefined,
      }),
      updateUserContratosAction(editModal!.id, contratosValidos),
    ]);

    if (rEdit.error) { setEditError(rEdit.error); setEditSubmitting(false); return; }
    if (rContratos.error) { setEditError(rContratos.error); setEditSubmitting(false); return; }

    const primerNombre = editContratos.find(c => c.id === contratosValidos[0])?.nombre ?? null;
    setUsuarios(prev => prev.map(u => u.id === editModal!.id
      ? { ...u, nombre: editForm.nombre, email: editForm.email, contrato_id: contratosValidos[0], contrato_nombre: primerNombre }
      : u
    ));
    setEditModal(null);
    setEditSubmitting(false);
  };

  const handleToggle = async (u: ClienteUsuarioItem) => {
    setToggling(u.id);
    const result = await toggleActivoClienteAction(u.id, !u.activo);
    if (!result.error) {
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !u.activo } : x));
    }
    setToggling(null);
  };

  const handleEliminar = async (u: ClienteUsuarioItem) => {
    if (!confirm(`¿Eliminar a "${u.nombre}" (${u.email})? Esta acción no se puede deshacer.`)) return;
    setEliminando(u.id);
    const result = await eliminarClienteAction(u.id);
    if (!result.error) {
      setUsuarios(prev => prev.filter(x => x.id !== u.id));
    }
    setEliminando(null);
  };

  const puedeGestionar = rol === "admin" || rol === "superadmin";

  // Cargar contratos disponibles cuando cambia la empresa (modal nuevo)
  useEffect(() => {
    if (!form.entidad_id) { setContratos([]); setContratosIds([""]); return; }
    setLoadingContratos(true);
    setContratosIds([""]);
    fetchContratosAction(form.entidad_id).then(result => {
      setContratos((result.data ?? []).filter(c => c.estado === "vigente"));
      setLoadingContratos(false);
    });
  }, [form.entidad_id]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.nombre.trim())    { setFormError("El nombre es obligatorio"); return; }
    if (!form.email.trim())     { setFormError("El email es obligatorio"); return; }
    if (!form.entidad_id)       { setFormError("Selecciona una empresa"); return; }
    if (!contratosIds.some(Boolean)) { setFormError("Agrega al menos un contrato"); return; }
    if (form.password.length < 8) { setFormError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (form.password !== form.confirmar) { setFormError("Las contraseñas no coinciden"); return; }

    setSubmitting(true);
    const contratosValidos = contratosIds.filter(Boolean);
    const result = await crearUsuarioAction({
      nombre: form.nombre.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      rol: "cliente",
      entidad_id: form.entidad_id,
      contratos_ids: contratosValidos,
      emails_acceso: emailsAcceso.filter(e => e.trim()),
    });

    if (result.error) { setFormError(result.error); setSubmitting(false); return; }

    const entidad = entidades.find(e => e.id === form.entidad_id);
    const primerContrato = contratos.find(c => c.id === contratosValidos[0]);
    setUsuarios(prev => [{
      id: result.userId!,
      nombre: form.nombre.trim(),
      email: form.email.trim().toLowerCase(),
      entidad_id: form.entidad_id,
      entidad_nombre: entidad?.nombre ?? null,
      contrato_id: contratosValidos[0] ?? null,
      contrato_nombre: primerContrato?.nombre ?? null,
      activo: true,
      created_at: new Date().toISOString(),
    }, ...prev]);

    setForm(EMPTY);
    setContratos([]);
    setModalOpen(false);
    setSubmitting(false);
  };

  return (
    <>
      <div style={{ padding: "24px 32px" }}>

        {/* Header sección */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Accesos de clientes</div>
            <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)", marginTop: 2 }}>
              {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} con acceso al sistema
            </div>
          </div>
          {puedeGestionar && (
            <button
              onClick={() => { setModalOpen(true); setForm(EMPTY); setFormError(""); setContratos([]); setContratosIds([""]); setEmailsAcceso([]); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px",
                background: "var(--ink)", color: "white",
                border: "none", borderRadius: 4,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <PlusIcon /> Nuevo acceso
            </button>
          )}
        </div>

        {/* Tabla */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
          overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <Th>Usuario</Th>
                <Th>Empresa</Th>
                <Th>Contrato</Th>
                <Th>Estado</Th>
                <Th>Alta</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{
                    padding: "40px 20px", textAlign: "center",
                    color: "rgba(15,17,23,0.35)", fontSize: 13, fontFamily: "'DM Mono', monospace",
                  }}>
                    Sin accesos configurados
                  </td>
                </tr>
              ) : usuarios.map(u => {
                const initials = u.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "var(--ink)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "var(--gold)", flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{u.nombre}</div>
                          <div style={{ fontSize: 11, color: "rgba(15,17,23,0.45)", marginTop: 1 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {u.entidad_nombre
                        ? <span style={{ fontSize: 13, color: "var(--ink)" }}>{u.entidad_nombre}</span>
                        : <span style={{ fontSize: 12, color: "rgba(15,17,23,0.3)", fontFamily: "'DM Mono', monospace" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {u.contrato_nombre
                        ? <span style={{ fontSize: 12, color: "var(--ink)" }}>{u.contrato_nombre}</span>
                        : <span style={{ fontSize: 12, color: "rgba(15,17,23,0.3)", fontFamily: "'DM Mono', monospace" }}>Sin contrato</span>}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 8px", borderRadius: 100,
                        fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                        background: u.activo ? "var(--green-light)" : "var(--surface-2)",
                        color: u.activo ? "var(--green)" : "rgba(15,17,23,0.45)",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: u.activo ? "var(--green)" : "rgba(15,17,23,0.3)" }} />
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)" }}>
                      {new Date(u.created_at).toLocaleDateString("es-MX")}
                    </td>
                    {puedeGestionar && (
                      <td style={{ padding: "14px 20px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => abrirEditar(u)}
                          style={{ ...btnSmall, marginRight: 6 }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(u)}
                          disabled={toggling === u.id}
                          style={{
                            ...btnSmall,
                            color: u.activo ? "var(--amber)" : "var(--green)",
                            borderColor: u.activo ? "rgba(181,86,14,0.25)" : "rgba(45,106,79,0.25)",
                            marginRight: 6,
                            opacity: toggling === u.id ? 0.5 : 1,
                          }}
                        >
                          {toggling === u.id ? "…" : u.activo ? "Desactivar" : "Activar"}
                        </button>
                        {rol === "superadmin" && (
                          <button
                            onClick={() => handleEliminar(u)}
                            disabled={eliminando === u.id}
                            style={{
                              ...btnSmall,
                              color: "var(--accent)",
                              borderColor: "rgba(200,71,42,0.25)",
                              opacity: eliminando === u.id ? 0.5 : 1,
                            }}
                          >
                            {eliminando === u.id ? "…" : "Eliminar"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,17,23,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{
            background: "var(--card)", borderRadius: 10,
            width: "100%", maxWidth: 480,
            boxShadow: "0 12px 40px rgba(15,17,23,0.2)",
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Nuevo acceso de cliente</div>
                <div style={{ fontSize: 12, color: "rgba(15,17,23,0.45)", marginTop: 2 }}>
                  Crea credenciales para que el cliente acceda al sistema
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(15,17,23,0.4)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Nombre */}
                <Field label="Nombre del responsable a cargo *">
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={set("nombre")}
                    placeholder="Ej. Juan Pérez López"
                    required autoFocus
                    style={iStyle}
                  />
                </Field>

                {/* Email */}
                <Field label="Correo electrónico *">
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="correo@empresa.com"
                    required
                    style={iStyle}
                  />
                </Field>

                {/* Contraseña */}
                <Field label="Contraseña *">
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Mínimo 8 caracteres"
                      required
                      style={{ ...iStyle, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(15,17,23,0.4)", padding: 0, fontSize: 13,
                      }}
                    >
                      {showPass ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </Field>

                {/* Confirmar */}
                <Field label="Confirmar contraseña *">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.confirmar}
                    onChange={set("confirmar")}
                    placeholder="Repite la contraseña"
                    required
                    style={iStyle}
                  />
                </Field>

                {/* Correos de acceso */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{
                        fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
                        textTransform: "uppercase", color: "rgba(15,17,23,0.35)",
                      }}>
                        Correos de acceso adicionales
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(15,17,23,0.4)", marginTop: 2 }}>
                        Cada correo crea su propio login con la misma contraseña
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailsAcceso(prev => [...prev, ""])}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", background: "var(--surface)",
                        border: "1px solid var(--border-strong)", borderRadius: 4,
                        fontSize: 12, cursor: "pointer", color: "var(--ink)",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Agregar correo
                    </button>
                  </div>

                  {emailsAcceso.length === 0 ? (
                    <div style={{ fontSize: 12, color: "rgba(15,17,23,0.35)", fontFamily: "'DM Mono', monospace", padding: "6px 0" }}>
                      Sin correos adicionales — usa + para agregar
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {emailsAcceso.map((email, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmailsAcceso(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                            placeholder={`correo${i + 1}@empresa.com`}
                            style={{ ...iStyle, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => setEmailsAcceso(prev => prev.filter((_, idx) => idx !== i))}
                            title="Eliminar"
                            style={{
                              width: 32, height: 36, flexShrink: 0,
                              background: "var(--card)", border: "1.5px solid rgba(200,71,42,0.3)",
                              borderRadius: 4, cursor: "pointer",
                              color: "var(--accent)", fontSize: 18, lineHeight: 1,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            −
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Separador */}
                <div style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "rgba(15,17,23,0.35)",
                  borderTop: "1px solid var(--border)", paddingTop: 10,
                }}>
                  Acceso
                </div>

                {/* Empresa */}
                <Field label="Empresa *">
                  <select value={form.entidad_id} onChange={set("entidad_id")} required style={iStyle}>
                    <option value="">— Selecciona una empresa —</option>
                    {entidades.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </Field>

                {/* Contratos — lista dinámica */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(15,17,23,0.5)", fontFamily: "'DM Mono', monospace" }}>
                      Contratos *
                    </label>
                    <button
                      type="button"
                      onClick={() => setContratosIds(prev => [...prev, ""])}
                      disabled={!form.entidad_id || loadingContratos}
                      style={{ ...btnSmall, display: "flex", alignItems: "center", gap: 4, opacity: !form.entidad_id ? 0.4 : 1 }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Contrato
                    </button>
                  </div>
                  {loadingContratos ? (
                    <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)" }}>Cargando…</div>
                  ) : !form.entidad_id ? (
                    <div style={{ fontSize: 12, color: "rgba(15,17,23,0.35)", fontFamily: "'DM Mono', monospace" }}>Primero selecciona una empresa</div>
                  ) : contratos.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--amber)", fontFamily: "'DM Mono', monospace" }}>Sin contratos vigentes en esta empresa</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {contratosIds.map((cid, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select
                            value={cid}
                            onChange={e => setContratosIds(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                            style={{ ...iStyle, flex: 1 }}
                          >
                            <option value="">— Selecciona contrato —</option>
                            {contratos.map(c => (
                              <option key={c.id} value={c.id} disabled={contratosIds.includes(c.id) && cid !== c.id}>
                                {c.nombre}{c.numero_contrato ? ` · ${c.numero_contrato}` : ""}
                              </option>
                            ))}
                          </select>
                          {contratosIds.length > 1 && (
                            <button type="button" onClick={() => setContratosIds(prev => prev.filter((_, idx) => idx !== i))}
                              style={{ width: 32, height: 36, flexShrink: 0, background: "var(--card)", border: "1.5px solid rgba(200,71,42,0.3)", borderRadius: 4, cursor: "pointer", color: "var(--accent)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              −
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formError && (
                  <div style={{
                    padding: "8px 12px", background: "var(--red-light)",
                    borderRadius: 4, fontSize: 12, color: "var(--accent)",
                  }}>
                    {formError}
                  </div>
                )}
              </div>

              <div style={{
                padding: "14px 24px", borderTop: "1px solid var(--border)",
                display: "flex", gap: 10, justifyContent: "flex-end",
              }}>
                <button type="button" onClick={() => setModalOpen(false)} style={btnOutline} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} style={btnPrimary}>
                  {submitting ? "Creando acceso…" : "Crear acceso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar usuario */}
      {editModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}
        >
          <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 440, boxShadow: "0 12px 40px rgba(15,17,23,0.2)" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Editar acceso</div>
                <div style={{ fontSize: 12, color: "rgba(15,17,23,0.45)", marginTop: 2 }}>{editModal.email}</div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(15,17,23,0.4)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleEditar}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                <Field label="Nombre del responsable a cargo">
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                    required
                    style={iStyle}
                  />
                </Field>

                <Field label="Correo electrónico">
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    required
                    style={iStyle}
                  />
                </Field>

                {/* Contratos */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(15,17,23,0.35)" }}>
                      Contratos asignados
                    </div>
                    <button type="button" onClick={() => setEditContratosIds(prev => [...prev, ""])}
                      disabled={editLoadingContratos || editContratos.length === 0}
                      style={{ ...btnSmall, display: "flex", alignItems: "center", gap: 4, opacity: editLoadingContratos ? 0.4 : 1 }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Contrato
                    </button>
                  </div>
                  {editLoadingContratos ? (
                    <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)" }}>Cargando contratos…</div>
                  ) : editContratos.length === 0 ? (
                    <div style={{ fontSize: 12, color: "rgba(15,17,23,0.35)", fontFamily: "'DM Mono', monospace" }}>Sin contratos vigentes disponibles</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {editContratosIds.map((cid, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select value={cid} onChange={e => setEditContratosIds(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                            style={{ ...iStyle, flex: 1 }}>
                            <option value="">— Selecciona contrato —</option>
                            {editContratos.map(c => (
                              <option key={c.id} value={c.id} disabled={editContratosIds.includes(c.id) && cid !== c.id}>
                                {c.nombre}{c.numero_contrato ? ` · ${c.numero_contrato}` : ""}
                              </option>
                            ))}
                          </select>
                          {editContratosIds.length > 1 && (
                            <button type="button" onClick={() => setEditContratosIds(prev => prev.filter((_, idx) => idx !== i))}
                              style={{ width: 32, height: 36, flexShrink: 0, background: "var(--card)", border: "1.5px solid rgba(200,71,42,0.3)", borderRadius: 4, cursor: "pointer", color: "var(--accent)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              −
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(15,17,23,0.35)", marginBottom: 12 }}>
                    Cambiar contraseña (opcional)
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Nueva contraseña">
                      <div style={{ position: "relative" }}>
                        <input
                          type={editShowPass ? "text" : "password"}
                          value={editForm.password}
                          onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="Dejar vacío para no cambiar"
                          style={{ ...iStyle, paddingRight: 40 }}
                        />
                        <button type="button" onClick={() => setEditShowPass(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(15,17,23,0.4)", fontSize: 12, padding: 0 }}>
                          {editShowPass ? "Ocultar" : "Ver"}
                        </button>
                      </div>
                    </Field>

                    <Field label="Confirmar contraseña">
                      <input
                        type={editShowPass ? "text" : "password"}
                        value={editForm.confirmar}
                        onChange={e => setEditForm(f => ({ ...f, confirmar: e.target.value }))}
                        placeholder="Repite la nueva contraseña"
                        style={iStyle}
                      />
                    </Field>
                  </div>
                </div>

                {editError && (
                  <div style={{ padding: "8px 12px", background: "var(--red-light)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
                    {editError}
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditModal(null)} style={btnOutline} disabled={editSubmitting}>
                  Cancelar
                </button>
                <button type="submit" disabled={editSubmitting} style={btnPrimary}>
                  {editSubmitting ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const iStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  fontFamily: "'DM Sans', sans-serif", color: "var(--ink)",
  background: "var(--card)", outline: "none", boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "9px 20px", background: "var(--ink)", color: "white",
  border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

const btnSmall: React.CSSProperties = {
  padding: "5px 12px", background: "var(--card)", color: "rgba(15,17,23,0.6)",
  border: "1px solid var(--border-strong)", borderRadius: 4,
  fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

const btnOutline: React.CSSProperties = {
  padding: "9px 16px", background: "var(--card)", color: "var(--ink)",
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "rgba(15,17,23,0.5)", marginBottom: 6,
        fontFamily: "'DM Mono', monospace",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{
      padding: "10px 20px", textAlign: "left",
      fontSize: 10, fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "rgba(15,17,23,0.4)", borderBottom: "1px solid var(--border)",
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
