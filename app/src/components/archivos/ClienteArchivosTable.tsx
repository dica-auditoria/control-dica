"use client";

import { useState } from "react";
import { crearSolicitudAction } from "@/app/actions/solicitudes";

export interface ClienteArchivo {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  size_bytes: number;
  created_at: string;
}

export default function ClienteArchivosTable({ archivos: inicial }: { archivos: ClienteArchivo[] }) {
  const [archivos, setArchivos] = useState(inicial);
  const [modalArchivoId, setModalArchivoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const archivoSeleccionado = archivos.find(a => a.id === modalArchivoId);

  const abrirModal = (id: string) => {
    setModalArchivoId(id);
    setMotivo("");
    setError("");
  };

  const cerrarModal = () => {
    setModalArchivoId(null);
    setMotivo("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalArchivoId || motivo.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    setSubmitting(true);
    setError("");

    const result = await crearSolicitudAction(modalArchivoId, motivo.trim());

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setArchivos(prev =>
      prev.map(a => a.id === modalArchivoId ? { ...a, estado: "pendiente_eliminacion" } : a)
    );
    setSubmitting(false);
    cerrarModal();
  };

  return (
    <>
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
              {["Archivo", "Fecha", "Tamaño", "Estado", ""].map(h => (
                <th key={h} style={{
                  padding: "10px 20px", textAlign: "left",
                  fontSize: 10, fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--muted)", borderBottom: "1px solid var(--border)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {archivos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{
                  padding: "40px 20px", textAlign: "center",
                  color: "var(--muted)", fontSize: 13,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  No hay archivos registrados
                </td>
              </tr>
            ) : archivos.map(f => (
              <tr key={f.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                    <ExtBadge tipo={f.tipo} />
                    <span style={{ fontSize: 13, color: "var(--ink)" }}>{f.nombre}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                  {new Date(f.created_at).toLocaleDateString("es-MX")}
                </td>
                <td style={{ padding: "12px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                  {formatBytes(f.size_bytes)}
                </td>
                <td style={{ padding: "12px 20px" }}>
                  <EstadoBadge estado={f.estado} />
                </td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}>
                  {f.estado === "activo" && (
                    <button
                      onClick={() => abrirModal(f.id)}
                      style={{
                        padding: "5px 12px",
                        background: "var(--red-light)",
                        color: "var(--accent)",
                        border: "1px solid rgba(200,71,42,0.2)",
                        borderRadius: 4,
                        fontSize: 12, fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Solicitar eliminación
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal solicitud */}
      {modalArchivoId && archivoSeleccionado && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,17,23,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div style={{
            background: "var(--card)", borderRadius: 10,
            width: "100%", maxWidth: 460,
            boxShadow: "0 12px 40px rgba(15,17,23,0.2)",
          }}>
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                  Solicitar eliminación
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  {archivoSeleccionado.nombre}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: "20px 24px" }}>
                <div style={{
                  padding: "10px 14px", marginBottom: 16,
                  background: "var(--amber-light)",
                  border: "1px solid rgba(181,86,14,0.2)",
                  borderRadius: 6, fontSize: 12, color: "var(--amber)",
                  display: "flex", gap: 8,
                }}>
                  <AlertIcon />
                  Esta acción requiere la aprobación del administrador. El archivo no se eliminará inmediatamente.
                </div>

                <label style={{
                  display: "block", fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--muted-2)", marginBottom: 8,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Motivo de la solicitud
                </label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Describe el motivo por el que deseas eliminar este archivo…"
                  rows={4}
                  required
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "var(--surface)",
                    border: "1.5px solid var(--border-strong)",
                    borderRadius: 4, fontSize: 13, color: "var(--ink)",
                    fontFamily: "'DM Sans', sans-serif",
                    resize: "vertical", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                  {motivo.length} caracteres (mín. 10)
                </div>

                {error && (
                  <div style={{
                    marginTop: 12, padding: "8px 12px",
                    background: "var(--red-light)", borderRadius: 4,
                    fontSize: 12, color: "var(--accent)",
                  }}>
                    {error}
                  </div>
                )}
              </div>

              <div style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex", gap: 10, justifyContent: "flex-end",
              }}>
                <button type="button" onClick={cerrarModal} style={{
                  padding: "8px 16px", background: "var(--card)",
                  border: "1.5px solid var(--border-strong)",
                  borderRadius: 4, fontSize: 13, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} style={{
                  padding: "8px 20px",
                  background: submitting ? "rgba(15,17,23,0.3)" : "var(--accent)",
                  color: "white", border: "none", borderRadius: 4,
                  fontSize: 13, fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {submitting ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ExtBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pdf:  { bg: "#fdecea", color: "var(--accent)" },
    xlsx: { bg: "#e8f5e9", color: "#2e7d32" },
    zip:  { bg: "#e8eaf6", color: "#3949ab" },
    docx: { bg: "#e3f2fd", color: "#1565c0" },
    csv:  { bg: "#f3e5f5", color: "#6a1b9a" },
  };
  const s = map[tipo.toLowerCase()] ?? { bg: "var(--surface-2)", color: "var(--muted-2)" };
  return (
    <span style={{ ...s, fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, flexShrink: 0 }}>
      {tipo.toLowerCase()}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const isActivo = estado === "activo";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      background: isActivo ? "var(--green-light)" : "var(--amber-light)",
      color: isActivo ? "var(--green)" : "var(--amber)",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: isActivo ? "var(--green)" : "var(--amber)" }} />
      {isActivo ? "Activo" : "Pend. eliminación"}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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
