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
  | "TODAS" | "UPLOAD" | "REQUEST_DELETE" | "APPROVE_DELETE" | "REJECT_DELETE"
  | "USER_CREATE" | "USER_ROLE_UPDATE" | "USER_ENTITY_UPDATE"
  | "LOGIN" | "LOGOUT"
  | "EMPLEADO_CREAR" | "EMPLEADO_ACTUALIZAR"
  | "VACACION_APROBAR" | "VACACION_RECHAZAR"
  | "COMISION_CREAR" | "PERMISO_APROBAR" | "PERMISO_RECHAZAR" | "PERMISO_VALIDAR_RH"
  | "COMUNICADO_CREAR" | "COMUNICADO_ARCHIVAR"
  | "CONTRATO_CREAR" | "CONTRATO_ACTUALIZAR" | "CONTRATO_ELIMINAR";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "TODAS",               label: "Todas" },
  { key: "LOGIN",               label: "Login" },
  { key: "LOGOUT",              label: "Logout" },
  { key: "UPLOAD",              label: "Upload" },
  { key: "REQUEST_DELETE",      label: "Sol. eliminar" },
  { key: "APPROVE_DELETE",      label: "Aprobó eliminar" },
  { key: "REJECT_DELETE",       label: "Rechazó eliminar" },
  { key: "USER_CREATE",         label: "Crear usuario" },
  { key: "USER_ROLE_UPDATE",    label: "Cambiar rol" },
  { key: "USER_ENTITY_UPDATE",  label: "Cambiar entidad" },
  { key: "EMPLEADO_CREAR",      label: "Empleado creado" },
  { key: "EMPLEADO_ACTUALIZAR", label: "Empleado actualizado" },
  { key: "VACACION_APROBAR",    label: "Vacación aprobada" },
  { key: "VACACION_RECHAZAR",   label: "Vacación rechazada" },
  { key: "COMISION_CREAR",      label: "Comisión" },
  { key: "PERMISO_APROBAR",     label: "Permiso aprobado" },
  { key: "PERMISO_RECHAZAR",    label: "Permiso rechazado" },
  { key: "PERMISO_VALIDAR_RH",  label: "Validación RH" },
  { key: "COMUNICADO_CREAR",    label: "Comunicado" },
  { key: "COMUNICADO_ARCHIVAR", label: "Com. archivado" },
  { key: "CONTRATO_CREAR",      label: "Contrato creado" },
  { key: "CONTRATO_ACTUALIZAR", label: "Contrato actualizado" },
  { key: "CONTRATO_ELIMINAR",   label: "Contrato eliminado" },
];

const ACCION_CFG: Record<string, { label: string; bg: string; color: string }> = {
  UPLOAD:               { label: "UPLOAD",               bg: "#e8f5e9", color: "#2e7d32" },
  REQUEST_DELETE:       { label: "REQUEST_DELETE",       bg: "#fff3e0", color: "#b5560e" },
  APPROVE_DELETE:       { label: "APPROVE_DELETE",       bg: "#fdecea", color: "#c8472a" },
  REJECT_DELETE:        { label: "REJECT_DELETE",        bg: "#d8f3dc", color: "#2d6a4f" },
  USER_CREATE:          { label: "USER_CREATE",          bg: "#e3f2fd", color: "#1565c0" },
  USER_ROLE_UPDATE:     { label: "USER_ROLE_UPDATE",     bg: "#fdecea", color: "#c8472a" },
  USER_ENTITY_UPDATE:   { label: "USER_ENTITY_UPDATE",   bg: "#fff3e0", color: "#b5560e" },
  LOGIN:                { label: "LOGIN",                bg: "#e3f2fd", color: "#1565c0" },
  LOGOUT:               { label: "LOGOUT",               bg: "var(--surface-2)", color: "var(--muted)" },
  EMPLEADO_CREAR:       { label: "EMPLEADO_CREAR",       bg: "#e3f2fd", color: "#1565c0" },
  EMPLEADO_ACTUALIZAR:  { label: "EMPLEADO_ACTUALIZAR",  bg: "#ede9fe", color: "#5b21b6" },
  VACACION_APROBAR:     { label: "VACACION_APROBAR",     bg: "#d1fae5", color: "#065f46" },
  VACACION_RECHAZAR:    { label: "VACACION_RECHAZAR",    bg: "#fee2e2", color: "#991b1b" },
  COMISION_CREAR:       { label: "COMISION_CREAR",       bg: "#fff7ed", color: "#c2410c" },
  PERMISO_APROBAR:      { label: "PERMISO_APROBAR",      bg: "#d1fae5", color: "#065f46" },
  PERMISO_RECHAZAR:     { label: "PERMISO_RECHAZAR",     bg: "#fee2e2", color: "#991b1b" },
  PERMISO_VALIDAR_RH:   { label: "PERMISO_VALIDAR_RH",  bg: "#ede9fe", color: "#5b21b6" },
  COMUNICADO_CREAR:     { label: "COMUNICADO_CREAR",     bg: "#e0f2fe", color: "#0369a1" },
  COMUNICADO_ARCHIVAR:  { label: "COMUNICADO_ARCHIVAR",  bg: "var(--surface-2)", color: "var(--muted)" },
  CONTRATO_CREAR:       { label: "CONTRATO_CREAR",       bg: "#e3f2fd", color: "#1565c0" },
  CONTRATO_ACTUALIZAR:  { label: "CONTRATO_ACTUALIZAR",  bg: "#ede9fe", color: "#5b21b6" },
  CONTRATO_ELIMINAR:    { label: "CONTRATO_ELIMINAR",    bg: "#fdecea", color: "#c8472a" },
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
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Registro inmutable — solo lectura · mostrando los últimos {total} eventos
          </div>
        </div>

        {/* Filtro */}
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value as Filtro)}
          style={{
            padding: "7px 12px", border: "1px solid var(--border-strong)", borderRadius: 6,
            fontSize: 12, fontFamily: "'DM Mono', monospace", background: "var(--surface)",
            color: "var(--ink)", cursor: "pointer", minWidth: 200,
          }}
        >
          {FILTROS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
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
            color: "var(--muted)",
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
                    color: "var(--muted)",
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
                    color: "var(--muted)", fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    Sin eventos para este filtro
                  </td>
                </tr>
              ) : lista.map(e => {
                const cfg = ACCION_CFG[e.accion] ?? { label: e.accion, bg: "var(--surface-2)", color: "var(--muted-2)" };
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    {/* Timestamp */}
                    <td style={{ padding: "11px 20px", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
                        {new Date(e.created_at).toLocaleDateString("es-MX")}
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 1 }}>
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
                    <td style={{ padding: "11px 20px", fontSize: 12, color: "var(--muted-2)", maxWidth: 200 }}>
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
                          color: "var(--muted)", marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {(() => { const m = String(e.detalle_json!.motivo); return m.slice(0, 40) + (m.length > 40 ? "…" : ""); })()}
                        </span>
                      )}
                    </td>

                    {/* Entidad */}
                    <td style={{ padding: "11px 20px", fontSize: 12, color: "var(--muted-2)", whiteSpace: "nowrap" }}>
                      {e.entidad_nombre ?? "—"}
                    </td>

                    {/* IP */}
                    <td style={{ padding: "11px 20px" }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
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
              color: "var(--muted)", textAlign: "right",
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
