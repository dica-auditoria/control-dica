"use client";

export type SeccionId =
  | "datos_personales"
  | "relacion_laboral"
  | "documentos"
  | "emergencia"
  | "bancarios"
  | "credenciales"
  | "activos"
  | "bitacora";

export interface SeccionEstado {
  porcentaje: number | null;
  alerta?: boolean;
  bloqueado?: boolean;
}

const SECCIONES: { id: SeccionId; label: string }[] = [
  { id: "datos_personales", label: "Datos personales" },
  { id: "relacion_laboral", label: "Relación laboral" },
  { id: "documentos", label: "Documentos" },
  { id: "emergencia", label: "Emergencia" },
  { id: "bancarios", label: "Bancarios" },
  { id: "credenciales", label: "Credenciales" },
  { id: "activos", label: "Activos asignados" },
  { id: "bitacora", label: "Bitácora" },
];

interface Props {
  active: SeccionId;
  onChange: (id: SeccionId) => void;
  completitud: Partial<Record<SeccionId, SeccionEstado>>;
  alerta?: string | null;
}

export default function EmpleadoSectionNav({ active, onChange, completitud, alerta }: Props) {
  return (
    <aside style={{ width: 220, flexShrink: 0 }}>
      <nav style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        {SECCIONES.map(s => {
          const isActive = active === s.id;
          const estado = completitud[s.id];

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "11px 16px",
                border: "none",
                borderBottom: "1px solid var(--border)",
                borderLeft: isActive ? "3px solid var(--green)" : "3px solid transparent",
                background: isActive ? "rgba(45,106,79,0.06)" : "white",
                color: isActive ? "var(--green)" : "var(--muted-2)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                gap: 8,
              }}
            >
              <span style={{ flex: 1 }}>
                {s.label}
                {estado?.bloqueado && (
                  <span style={{ marginLeft: 4, fontSize: 11 }}>🔒</span>
                )}
              </span>
              <Indicador estado={estado} />
            </button>
          );
        })}
      </nav>

      {alerta && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: "var(--amber-light)",
          borderRadius: 6,
          fontSize: 12,
          color: "var(--amber)",
          border: "1px solid rgba(181,86,14,0.15)",
        }}>
          <strong style={{ display: "block", marginBottom: 4 }}>Atención</strong>
          {alerta}
        </div>
      )}
    </aside>
  );
}

function Indicador({ estado }: { estado?: SeccionEstado }) {
  if (!estado || estado.porcentaje === null) return null;

  if (estado.alerta) {
    return (
      <span style={{
        fontSize: 10,
        color: "var(--amber)",
        fontFamily: "'DM Mono', monospace",
        fontWeight: 600,
      }}>
        ⚠
      </span>
    );
  }

  if (estado.porcentaje >= 100) {
    return (
      <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>✓</span>
    );
  }

  return (
    <span style={{
      fontSize: 10,
      fontFamily: "'DM Mono', monospace",
      color: "var(--muted)",
    }}>
      {estado.porcentaje}%
    </span>
  );
}
