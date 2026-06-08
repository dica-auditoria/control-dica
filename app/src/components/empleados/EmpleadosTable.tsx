"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import { iniciales, nombreCompleto } from "@/lib/empleados/utils";
import type { EmpleadoListItem } from "@/types/empleados";

export default function EmpleadosTable({ empleados, onEliminar }: { empleados: EmpleadoListItem[]; onEliminar?: (id: string, nombre: string) => void }) {
  if (empleados.length === 0) {
    return (
      <div style={{
        padding: 48,
        textAlign: "center",
        color: "var(--muted)",
        fontFamily: "'DM Mono', monospace",
        fontSize: 13,
      }}>
        No hay empleados que coincidan con los filtros
      </div>
    );
  }

  return (
    <div className="table-scroll">
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "var(--surface)" }}>
          {["Empleado", "Puesto", "Departamento", "Perfil", "Estado", ...(onEliminar ? [""] : [])].map((h, i) => (
            <th key={i} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {empleados.map(e => (
          <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={tdStyle}>
              <Link href={`/dashboard/empleados/${e.id}`} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: "inherit",
              }}>
                <Avatar nombre={e.nombres} apellido={e.apellido_paterno} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    {nombreCompleto(e.nombres, e.apellido_paterno, e.apellido_materno)}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontFamily: "'DM Mono', monospace",
                    color: "var(--muted)",
                  }}>
                    {e.email_institucional}
                  </div>
                </div>
              </Link>
            </td>
            <td style={{ ...tdStyle, fontSize: 13 }}>{e.puesto}</td>
            <td style={tdStyle}>
              <span style={{
                padding: "3px 10px",
                borderRadius: 100,
                fontSize: 11,
                background: "var(--surface-2)",
                color: "var(--muted-2)",
              }}>
                {e.departamento}
              </span>
            </td>
            <td style={{ ...tdStyle, minWidth: 140 }}>
              <ProgressBar value={e.progreso_perfil} />
            </td>
            <td style={tdStyle}>
              <StatusBadge estado={e.estado} />
            </td>
            {onEliminar && (
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <button
                  onClick={() => onEliminar(e.id, `${e.nombres} ${e.apellido_paterno}`)}
                  style={{
                    padding: "5px 12px", background: "var(--card)",
                    border: "1px solid rgba(200,71,42,0.3)", borderRadius: 4,
                    fontSize: 12, cursor: "pointer", color: "var(--accent)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Eliminar
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 100
    ? "var(--green)"
    : value > 60
      ? "var(--amber)"
      : "var(--accent)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1,
        height: 6,
        background: "var(--surface-2)",
        borderRadius: 999,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: 999,
          transition: "width 0.3s ease",
        }} />
      </div>
      <span style={{
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        color,
        fontWeight: 600,
        minWidth: 30,
        textAlign: "right",
      }}>
        {value}%
      </span>
    </div>
  );
}

function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
  return (
    <div style={{
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "var(--surface-2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      color: "var(--green)",
      flexShrink: 0,
    }}>
      {iniciales(nombre, apellido)}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 20px",
  textAlign: "left",
  fontSize: 10,
  fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  borderBottom: "1px solid var(--border)",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 20px",
};
