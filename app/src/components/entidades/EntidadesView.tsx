"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearEntidadAction, toggleActivoAction } from "@/app/actions/entidades";

export interface EntidadItem {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  totalArchivos: number;
  pendientes: number;
  totalUsuarios: number;
}

interface EntidadesViewProps {
  entidades: EntidadItem[];
  rol: string;
}

export default function EntidadesView({ entidades: inicial, rol }: EntidadesViewProps) {
  const [entidades, setEntidades] = useState(inicial);
  const [modalOpen, setModalOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const router = useRouter();

  const isSuperadmin = rol === "superadmin";

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const result = await crearEntidadAction(nombre);

    if (result.error) {
      setFormError(result.error);
      setSubmitting(false);
      return;
    }

    if (result.entidad) {
      setEntidades(prev => [...prev, {
        ...result.entidad!,
        totalArchivos: 0,
        pendientes: 0,
        totalUsuarios: 0,
      }]);
    }

    setNombre("");
    setModalOpen(false);
    setSubmitting(false);
    router.refresh();
  };

  const handleToggle = async (id: string, activoActual: boolean) => {
    setToggling(id);
    const result = await toggleActivoAction(id, !activoActual);

    if (!result.error) {
      setEntidades(prev =>
        prev.map(e => e.id === id ? { ...e, activo: !activoActual } : e)
      );
    }
    setToggling(null);
  };

  const activas = entidades.filter(e => e.activo).length;

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
            Clientes
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {activas} activa{activas !== 1 ? "s" : ""} · {entidades.length} entidad{entidades.length !== 1 ? "es" : ""}
          </div>
        </div>
        {isSuperadmin && (
          <button
            onClick={() => { setModalOpen(true); setFormError(""); setNombre(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px",
              background: "var(--ink)", color: "white",
              border: "none", borderRadius: 4,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <PlusIcon /> Nueva entidad
          </button>
        )}
      </div>

      <div style={{ padding: "28px 32px" }}>
        {/* Stats rápidas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard
            label="Entidades activas"
            value={activas}
            accent="var(--green)"
          />
          <StatCard
            label="Total archivos"
            value={entidades.reduce((s, e) => s + e.totalArchivos, 0)}
            accent="var(--accent)"
          />
          <StatCard
            label="Pendientes eliminación"
            value={entidades.reduce((s, e) => s + e.pendientes, 0)}
            accent="var(--amber)"
          />
        </div>

        {/* Tabla */}
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <Th>Entidad</Th>
                <Th>Usuarios</Th>
                <Th>Archivos</Th>
                <Th>Pendientes</Th>
                <Th>Estado</Th>
                <Th>Creada</Th>
                {isSuperadmin && <Th></Th>}
              </tr>
            </thead>
            <tbody>
              {entidades.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 7 : 6} style={{
                    padding: "40px 20px", textAlign: "center",
                    color: "var(--muted)", fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    No hay entidades registradas
                  </td>
                </tr>
              ) : entidades.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{e.nombre}</div>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>
                      {e.id.slice(0, 8)}…
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)" }}>
                      {e.totalUsuarios}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)" }}>
                      {e.totalArchivos}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {e.pendientes > 0 ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 8px", borderRadius: 100,
                        fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                        background: "var(--amber-light)", color: "var(--amber)",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--amber)" }} />
                        {e.pendientes} pendiente{e.pendientes !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 8px", borderRadius: 100,
                      fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                      background: e.activo ? "var(--green-light)" : "var(--surface-2)",
                      color: e.activo ? "var(--green)" : "rgba(15,17,23,0.45)",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: e.activo ? "var(--green)" : "rgba(15,17,23,0.3)" }} />
                      {e.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                    {new Date(e.created_at).toLocaleDateString("es-MX")}
                  </td>
                  {isSuperadmin && (
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <button
                        onClick={() => handleToggle(e.id, e.activo)}
                        disabled={toggling === e.id}
                        style={{
                          padding: "5px 12px",
                          background: "var(--card)",
                          color: e.activo ? "var(--amber)" : "var(--green)",
                          border: `1px solid ${e.activo ? "rgba(181,86,14,0.25)" : "rgba(45,106,79,0.25)"}`,
                          borderRadius: 4, fontSize: 12, fontWeight: 500,
                          cursor: toggling === e.id ? "not-allowed" : "pointer",
                          opacity: toggling === e.id ? 0.5 : 1,
                          fontFamily: "'DM Sans', sans-serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {toggling === e.id ? "…" : e.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva entidad */}
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
            width: "100%", maxWidth: 420,
            boxShadow: "0 12px 40px rgba(15,17,23,0.2)",
          }}>
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                Nueva entidad
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleCrear}>
              <div style={{ padding: "20px 24px" }}>
                <label style={{
                  display: "block", fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--muted-2)", marginBottom: 8,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Nombre de la entidad
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Constructora Omega S.A."
                  required
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "var(--surface)",
                    border: "1.5px solid var(--border-strong)",
                    borderRadius: 4, fontSize: 14, color: "var(--ink)",
                    fontFamily: "'DM Sans', sans-serif", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {formError && (
                  <div style={{
                    marginTop: 10, padding: "8px 12px",
                    background: "var(--red-light)", borderRadius: 4,
                    fontSize: 12, color: "var(--accent)",
                  }}>
                    {formError}
                  </div>
                )}
              </div>

              <div style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex", gap: 10, justifyContent: "flex-end",
              }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{
                  padding: "8px 16px", background: "var(--card)",
                  border: "1.5px solid var(--border-strong)",
                  borderRadius: 4, fontSize: 13, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} style={{
                  padding: "8px 20px",
                  background: submitting ? "rgba(15,17,23,0.3)" : "var(--ink)",
                  color: "white", border: "none", borderRadius: 4,
                  fontSize: 13, fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {submitting ? "Creando…" : "Crear entidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
      padding: 20, boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "var(--ink)", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{
      padding: "10px 20px", textAlign: "left",
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
