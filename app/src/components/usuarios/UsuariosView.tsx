"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  crearUsuarioAction,
  actualizarRolAction,
  actualizarEntidadAction,
} from "@/app/actions/usuarios";

export interface UsuarioItem {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  entidad_id: string | null;
  entidad_nombre: string | null;
  created_at: string;
}

export interface EntidadOpcion {
  id: string;
  nombre: string;
}

type Filtro = "todos" | "acceso" | "clientes";

const ROLES_LABEL: Record<string, string> = {
  cliente:    "Cliente",
  admin:      "Admin",
  superadmin: "Super Admin",
};

const ROL_COLORS: Record<string, { bg: string; color: string }> = {
  cliente:    { bg: "#e3f2fd", color: "#1565c0" },
  admin:      { bg: "var(--amber-light)", color: "var(--amber)" },
  superadmin: { bg: "var(--red-light)", color: "var(--accent)" },
};

export default function UsuariosView({
  usuarios: inicial,
  entidades,
  rolActual,
}: {
  usuarios: UsuarioItem[];
  entidades: EntidadOpcion[];
  rolActual: string;
}) {
  const [usuarios, setUsuarios] = useState(inicial);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<string | null>(null);
  const [editingEntidad, setEditingEntidad] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isSuperadmin = rolActual === "superadmin";

  // Form state
  const [form, setForm] = useState({
    nombre: "", email: "", password: "", rol: "cliente" as "cliente" | "admin", entidad_id: "",
  });

  const lista = filtro === "todos"
    ? usuarios
    : filtro === "acceso"
      ? usuarios.filter(u => u.rol === "admin" || u.rol === "superadmin")
      : usuarios.filter(u => u.rol === "cliente");

  // ---- Crear usuario ----
  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const result = await crearUsuarioAction({
      email: form.email,
      nombre: form.nombre,
      password: form.password,
      rol: form.rol,
      entidad_id: form.rol === "cliente" ? form.entidad_id || null : null,
    });

    if (result.error) { setFormError(result.error); setSubmitting(false); return; }

    setModalOpen(false);
    setForm({ nombre: "", email: "", password: "", rol: "cliente", entidad_id: "" });
    setSubmitting(false);
    router.refresh();
  };

  // ---- Cambiar rol ----
  const handleRol = async (userId: string, nuevoRol: string) => {
    setProcessing(p => ({ ...p, [userId]: true }));
    setEditingRol(null);
    const result = await actualizarRolAction(userId, nuevoRol);
    if (!result.error) {
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: nuevoRol } : u));
    }
    setProcessing(p => { const n = { ...p }; delete n[userId]; return n; });
  };

  // ---- Cambiar entidad ----
  const handleEntidad = async (userId: string, entidadId: string) => {
    setProcessing(p => ({ ...p, [userId]: true }));
    setEditingEntidad(null);
    const entidad = entidades.find(e => e.id === entidadId);
    const result = await actualizarEntidadAction(userId, entidadId || null);
    if (!result.error) {
      setUsuarios(prev => prev.map(u =>
        u.id === userId ? { ...u, entidad_id: entidadId || null, entidad_nombre: entidad?.nombre ?? null } : u
      ));
    }
    setProcessing(p => { const n = { ...p }; delete n[userId]; return n; });
  };

  const cuentasAcceso = usuarios.filter(u => u.rol !== "cliente").length;
  const clientes  = usuarios.filter(u => u.rol === "cliente").length;

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid var(--border)",
        background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
            Acceso al sistema
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {cuentasAcceso} cuenta{cuentasAcceso !== 1 ? "s" : ""} interna{cuentasAcceso !== 1 ? "s" : ""} · {clientes} cliente{clientes !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 3, background: "var(--surface-2)", padding: 3, borderRadius: 6 }}>
            {(["todos", "acceso", "clientes"] as Filtro[]).map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{
                padding: "5px 12px", background: filtro === f ? "white" : "transparent",
                border: "none", borderRadius: 4, fontSize: 12, fontWeight: 500,
                color: filtro === f ? "var(--ink)" : "var(--muted)",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: filtro === f ? "0 1px 3px rgba(15,17,23,0.08)" : "none",
                textTransform: "capitalize",
              }}>{f === "acceso" ? "Acceso" : f}</button>
            ))}
          </div>
          {isSuperadmin && (
            <button onClick={() => { setModalOpen(true); setFormError(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                background: "var(--ink)", color: "white", border: "none", borderRadius: 4,
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
              <PlusIcon /> Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ padding: "28px 32px" }}>
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
          overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <Th>Nombre</Th>
                <Th>Email</Th>
                <Th>Rol</Th>
                <Th>Entidad</Th>
                <Th>Creado</Th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: "40px 20px", textAlign: "center",
                    color: "var(--muted)", fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                  }}>Sin usuarios en esta categoría</td>
                </tr>
              ) : lista.map(u => {
                const rolCfg = ROL_COLORS[u.rol] ?? { bg: "var(--surface-2)", color: "var(--muted-2)" };
                const isBusy = !!processing[u.id];

                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    {/* Nombre + avatar */}
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "var(--surface-2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "var(--gold)", flexShrink: 0,
                        }}>
                          {u.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{u.nombre}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: "12px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
                      {u.email}
                    </td>

                    {/* Rol — editable para superadmin */}
                    <td style={{ padding: "12px 20px" }}>
                      {isSuperadmin && editingRol === u.id ? (
                        <select
                          autoFocus
                          defaultValue={u.rol}
                          onChange={e => handleRol(u.id, e.target.value)}
                          onBlur={() => setEditingRol(null)}
                          style={{
                            padding: "4px 8px", fontSize: 12, borderRadius: 4,
                            border: "1.5px solid var(--border-strong)",
                            fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                          }}
                        >
                          <option value="cliente">Cliente</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => isSuperadmin && !isBusy && setEditingRol(u.id)}
                          title={isSuperadmin ? "Click para cambiar rol" : undefined}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 8px", borderRadius: 100,
                            fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                            ...rolCfg,
                            cursor: isSuperadmin ? "pointer" : "default",
                          }}
                        >
                          {isBusy ? "…" : ROLES_LABEL[u.rol] ?? u.rol}
                          {isSuperadmin && <EditDotIcon />}
                        </span>
                      )}
                    </td>

                    {/* Entidad — editable para superadmin */}
                    <td style={{ padding: "12px 20px" }}>
                      {isSuperadmin && editingEntidad === u.id ? (
                        <select
                          autoFocus
                          defaultValue={u.entidad_id ?? ""}
                          onChange={e => handleEntidad(u.id, e.target.value)}
                          onBlur={() => setEditingEntidad(null)}
                          style={{
                            padding: "4px 8px", fontSize: 12, borderRadius: 4,
                            border: "1.5px solid var(--border-strong)",
                            fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                          }}
                        >
                          <option value="">— Sin entidad —</option>
                          {entidades.map(e => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={() => isSuperadmin && !isBusy && setEditingEntidad(u.id)}
                          title={isSuperadmin ? "Click para cambiar entidad" : undefined}
                          style={{
                            fontSize: 12, color: u.entidad_nombre ? "var(--muted-2)" : "var(--muted)",
                            cursor: isSuperadmin ? "pointer" : "default",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {u.entidad_nombre ?? "—"}
                          {isSuperadmin && <EditDotIcon />}
                        </span>
                      )}
                    </td>

                    {/* Creado */}
                    <td style={{ padding: "12px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                      {new Date(u.created_at).toLocaleDateString("es-MX")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo usuario */}
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "var(--overlay)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 460, boxShadow: "0 12px 40px rgba(15,17,23,0.2)" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Nuevo usuario</div>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleCrear}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Nombre completo">
                  <input type="text" required placeholder="Ej. Carlos Mendoza" value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inputStyle} />
                </Field>

                <Field label="Correo electrónico">
                  <input type="email" required placeholder="usuario@empresa.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                </Field>

                <Field label="Contraseña temporal">
                  <input type="password" required placeholder="Mínimo 8 caracteres" minLength={8} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
                </Field>

                <Field label="Tipo de usuario">
                  <div style={{ display: "flex", gap: 10 }}>
                    {(["cliente", "admin"] as const).map(r => (
                      <label key={r} style={{
                        flex: 1, padding: "10px 14px", borderRadius: 6, cursor: "pointer",
                        border: `1.5px solid ${form.rol === r ? "var(--ink)" : "var(--border-strong)"}`,
                        background: form.rol === r ? "var(--ink)" : "white",
                        color: form.rol === r ? "white" : "var(--ink)",
                        display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500,
                      }}>
                        <input type="radio" name="rol" value={r} checked={form.rol === r}
                          onChange={() => setForm(f => ({ ...f, rol: r }))} style={{ display: "none" }} />
                        <span>{r === "cliente" ? "👤 Cliente" : "🔧 Empleado (Admin)"}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                {form.rol === "cliente" && (
                  <Field label="Entidad asignada">
                    <select required value={form.entidad_id}
                      onChange={e => setForm(f => ({ ...f, entidad_id: e.target.value }))}
                      style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">Selecciona una entidad…</option>
                      {entidades.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {formError && (
                  <div style={{ padding: "8px 12px", background: "var(--red-light)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
                    {formError}
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{
                  padding: "8px 16px", background: "var(--card)", border: "1.5px solid var(--border-strong)",
                  borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>Cancelar</button>
                <button type="submit" disabled={submitting} style={{
                  padding: "8px 20px",
                  background: submitting ? "var(--disabled)" : "var(--ink)",
                  color: "white", border: "none", borderRadius: 4,
                  fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>{submitting ? "Creando…" : "Crear usuario"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--surface)",
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  fontSize: 13, color: "var(--ink)", fontFamily: "'DM Sans', sans-serif",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--muted-2)", marginBottom: 7,
        fontFamily: "'DM Mono', monospace",
      }}>{label}</label>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "10px 20px", textAlign: "left", fontSize: 10,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
      textTransform: "uppercase", color: "var(--muted)",
      borderBottom: "1px solid var(--border)",
    }}>{children}</th>
  );
}

function EditDotIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
