"use client";

import { useState } from "react";

export interface AuditLogItem {
  id: string;
  accion: string;
  ip: string | null;
  created_at: string;
  detalle_json: Record<string, unknown> | null;
  recurso_id: string | null;
  usuario_nombre: string | null;
  entidad_nombre: string | null;
}

type Filtro =
  | "TODAS"
  | "UPLOAD"
  | "REQUEST_DELETE"
  | "APPROVE_DELETE"
  | "REJECT_DELETE"
  | "USER_CREATE"
  | "USER_ROLE_UPDATE"
  | "USER_ENTITY_UPDATE"
  | "LOGIN"
  | "LOGOUT";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "TODAS",          label: "Todas" },
  { key: "UPLOAD",         label: "Upload" },
  { key: "REQUEST_DELETE", label: "Solicitud" },
  { key: "APPROVE_DELETE", label: "Aprobación" },
  { key: "REJECT_DELETE",  label: "Rechazo" },
  { key: "USER_CREATE",    label: "Crear usuario" },
  { key: "USER_ROLE_UPDATE", label: "Cambiar rol" },
  { key: "USER_ENTITY_UPDATE", label: "Cambiar entidad" },
  { key: "LOGIN",          label: "Login" },
  { key: "LOGOUT",         label: "Logout" },
];

const ACCION_CFG: Record<string, { label: string; bg: string; color: string }> = {
  UPLOAD:         { label: "UPLOAD",         bg: "#e8f5e9", color: "#2e7d32" },
  REQUEST_DELETE: { label: "REQUEST_DELETE", bg: "#fff3e0", color: "#b5560e" },
  APPROVE_DELETE: { label: "APPROVE_DELETE", bg: "#fdecea", color: "#c8472a" },
  REJECT_DELETE:  { label: "REJECT_DELETE",  bg: "#d8f3dc", color: "#2d6a4f" },
  USER_CREATE:    { label: "USER_CREATE",    bg: "#e3f2fd", color: "#1565c0" },
  USER_ROLE_UPDATE: { label: "USER_ROLE_UPDATE", bg: "#fdecea", color: "#c8472a" },
  USER_ENTITY_UPDATE: { label: "USER_ENTITY_UPDATE", bg: "#fff3e0", color: "#b5560e" },
  LOGIN:          { label: "LOGIN",          bg: "#e3f2fd", color: "#1565c0" },
  LOGOUT:         { label: "LOGOUT",         bg: "var(--surface-2)", color: "rgba(15,17,23,0.45)" },
};

function recursoLabel(item: AuditLogItem): string {
  if (item.detalle_json?.nombre) return String(item.detalle_json.nombre);
  if (item.recurso_id) return `${item.recurso_id.slice(0, 8)}…`;
  return "—";
}

function maskIp(ip: string | null): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.x.x.x`;
  return ip.split(":").slice(0, 2).join(":") + ":…";
}

export default function AuditLogView({ entradas, total }: { entradas: AuditLogItem[]; total: number }) {
  const [filtro, setFiltro] = useState<Filtro>("TODAS");

  const lista = filtro === "TODAS"
    ? entradas
    : entradas.filter(e => e.accion === filtro);

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
            Audit Log
          </div>
          <div style={{ fontSize: 12, color: "rgba(15,17,23,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Registro inmutable — solo lectura · mostrando los últimos {total} eventos
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", background: "var(--surface-2)", padding: 4, borderRadius: 6 }}>
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                padding: "5px 12px",
                background: filtro === f.key ? "white" : "transparent",
                border: "none", borderRadius: 4,
                fontSize: 11, fontWeight: 500,
                color: filtro === f.key ? "var(--ink)" : "rgba(15,17,23,0.45)",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                boxShadow: filtro === f.key ? "0 1px 3px rgba(15,17,23,0.08)" : "none",
                transition: "all 0.12s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
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

          {/* Aviso inmutabilidad */}
          <div style={{
            padding: "10px 20px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontFamily: "'DM Mono', monospace",
            color: "rgba(15,17,23,0.4)",
          }}>
            <LockIcon />
            append-only · sin UPDATE · sin DELETE · ISO/IEC 27001 A.8.15
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Timestamp", "Usuario", "Acción", "Recurso", "Entidad", "IP"].map(h => (
                  <th key={h} style={{
                    padding: "10px 20px", textAlign: "left",
                    fontSize: 10, fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "rgba(15,17,23,0.4)",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: "40px 20px", textAlign: "center",
                    color: "rgba(15,17,23,0.35)", fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    Sin eventos para este filtro
                  </td>
                </tr>
              ) : lista.map(e => {
                const cfg = ACCION_CFG[e.accion] ?? { label: e.accion, bg: "var(--surface-2)", color: "rgba(15,17,23,0.5)" };
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    {/* Timestamp */}
                    <td style={{ padding: "11px 20px", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.55)" }}>
                        {new Date(e.created_at).toLocaleDateString("es-MX")}
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.35)", marginTop: 1 }}>
                        {new Date(e.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </td>

                    {/* Usuario */}
                    <td style={{ padding: "11px 20px", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      {e.usuario_nombre ?? "—"}
                    </td>

                    {/* Acción */}
                    <td style={{ padding: "11px 20px" }}>
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 10,
                        padding: "3px 8px", borderRadius: 3,
                        fontWeight: 700, letterSpacing: "0.04em",
                        background: cfg.bg, color: cfg.color,
                        whiteSpace: "nowrap",
                      }}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* Recurso */}
                    <td style={{ padding: "11px 20px", fontSize: 12, color: "rgba(15,17,23,0.6)", maxWidth: 200 }}>
                      <span style={{
                        display: "block", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: e.detalle_json?.nombre ? "'DM Sans', sans-serif" : "'DM Mono', monospace",
                      }} title={recursoLabel(e)}>
                        {recursoLabel(e)}
                      </span>
                      {/* Detalle extra según acción */}
                      {e.accion === "REQUEST_DELETE" && e.detalle_json?.motivo != null && (
                        <span style={{
                          display: "block", fontSize: 10,
                          color: "rgba(15,17,23,0.35)", marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {(() => { const m = String(e.detalle_json!.motivo); return m.slice(0, 40) + (m.length > 40 ? "…" : ""); })()}
                        </span>
                      )}
                    </td>

                    {/* Entidad */}
                    <td style={{ padding: "11px 20px", fontSize: 12, color: "rgba(15,17,23,0.55)", whiteSpace: "nowrap" }}>
                      {e.entidad_nombre ?? "—"}
                    </td>

                    {/* IP */}
                    <td style={{ padding: "11px 20px" }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.35)" }}>
                        {maskIp(e.ip)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer count */}
          {lista.length > 0 && (
            <div style={{
              padding: "10px 20px",
              borderTop: "1px solid var(--border)",
              fontSize: 11, fontFamily: "'DM Mono', monospace",
              color: "rgba(15,17,23,0.3)", textAlign: "right",
            }}>
              {lista.length} {lista.length === 1 ? "evento" : "eventos"}
              {filtro !== "TODAS" && ` · filtro: ${filtro}`}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
