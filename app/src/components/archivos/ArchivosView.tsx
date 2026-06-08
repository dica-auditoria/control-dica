"use client";

import { useState } from "react";
import UploadZone from "./UploadZone";

export interface ArchivoItem {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  size_bytes: number;
  hash_sha256: string;
  created_at: string;
  entidad_nombre: string | null;
  subido_por_nombre: string | null;
}

interface ArchivosViewProps {
  archivos: ArchivoItem[];
  entidadId: string;
  rol: string;
}

export default function ArchivosView({ archivos: inicial, entidadId, rol }: ArchivosViewProps) {
  const archivos = inicial;
  const [modalOpen, setModalOpen] = useState(false);
  const isAdmin = rol === "admin" || rol === "superadmin";

  const handleSuccess = () => {
    // revalidatePath en el server action refrescará los datos en el próximo render
    // cerramos el modal y refrescamos la página
    setModalOpen(false);
    window.location.reload();
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--card)",
      }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Archivos</div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {archivos.length} documento{archivos.length !== 1 ? "s" : ""} en custodia
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px",
              background: "var(--ink)", color: "white",
              border: "none", borderRadius: 4,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <UploadIcon /> Subir archivo
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ padding: "28px 32px" }}>
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
                <Th>Archivo</Th>
                {isAdmin && <Th>Entidad</Th>}
                {isAdmin && <Th>Subido por</Th>}
                <Th>Fecha</Th>
                <Th>Tamaño</Th>
                <Th>Hash SHA-256</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {archivos.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} style={{
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ink)" }}>
                      <ExtBadge tipo={f.tipo} />
                      <span style={{ fontSize: 13 }}>{f.nombre}</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--muted-2)" }}>
                      {f.entidad_nombre ?? "—"}
                    </td>
                  )}
                  {isAdmin && (
                    <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--muted-2)" }}>
                      {f.subido_por_nombre ?? "—"}
                    </td>
                  )}
                  <td style={{ padding: "12px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                    {new Date(f.created_at).toLocaleDateString("es-MX")}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                    {formatBytes(f.size_bytes)}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <span style={{
                      fontSize: 11, fontFamily: "'DM Mono', monospace",
                      color: "var(--muted)", letterSpacing: "0.02em",
                    }} title={f.hash_sha256}>
                      {f.hash_sha256.slice(0, 8)}…{f.hash_sha256.slice(-8)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <EstadoBadge estado={f.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal upload */}
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
            width: "100%", maxWidth: 540,
            boxShadow: "0 12px 40px rgba(15,17,23,0.2)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Subir archivo</div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                  Hash SHA-256 calculado en el navegador
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <XIcon />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <UploadZone entidadId={entidadId} onSuccess={handleSuccess} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "10px 20px", textAlign: "left",
      fontSize: 10, fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--muted)",
      borderBottom: "1px solid var(--border)",
    }}>
      {children}
    </th>
  );
}

function ExtBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pdf:  { bg: "#fdecea", color: "var(--accent)" },
    xlsx: { bg: "#e8f5e9", color: "#2e7d32" },
    xls:  { bg: "#e8f5e9", color: "#2e7d32" },
    zip:  { bg: "#e8eaf6", color: "#3949ab" },
    docx: { bg: "#e3f2fd", color: "#1565c0" },
    doc:  { bg: "#e3f2fd", color: "#1565c0" },
    csv:  { bg: "#f3e5f5", color: "#6a1b9a" },
  };
  const s = map[tipo.toLowerCase()] ?? { bg: "var(--surface-2)", color: "var(--muted-2)" };
  return (
    <span style={{
      ...s, fontFamily: "'DM Mono', monospace", fontSize: 9,
      padding: "2px 5px", borderRadius: 3,
      textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
      flexShrink: 0,
    }}>
      {tipo.toLowerCase()}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const isActivo = estado === "activo";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
      background: isActivo ? "var(--green-light)" : "var(--amber-light)",
      color: isActivo ? "var(--green)" : "var(--amber)",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: isActivo ? "var(--green)" : "var(--amber)" }} />
      {isActivo ? "Activo" : "Pend. eliminación"}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
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
