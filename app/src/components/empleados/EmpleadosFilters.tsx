"use client";

import { DEPARTAMENTOS, ESTADOS_EMPLEADO } from "@/lib/empleados/constants";
import type { EmpleadosFilters } from "@/hooks/useEmpleados";

interface Props {
  filters: EmpleadosFilters;
  onChange: (next: Partial<EmpleadosFilters>) => void;
}

export default function EmpleadosFiltersBar({ filters, onChange }: Props) {
  return (
    <div style={{
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
      padding: "16px 20px",
      background: "white",
      border: "1px solid var(--border)",
      borderRadius: 8,
      marginBottom: 16,
    }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <span style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "rgba(15,17,23,0.35)",
          fontSize: 14,
        }}>
          ⌕
        </span>
        <input
          type="search"
          placeholder="Buscar por nombre, CURP…"
          value={filters.busqueda ?? ""}
          onChange={e => onChange({ busqueda: e.target.value })}
          style={{
            width: "100%",
            padding: "9px 12px 9px 32px",
            border: "1.5px solid var(--border-strong)",
            borderRadius: 4,
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>
      <FilterSelect
        label="Departamento"
        value={filters.departamento ?? "todos"}
        options={[{ value: "todos", label: "Todos" }, ...DEPARTAMENTOS.map(d => ({ value: d, label: d }))]}
        onChange={v => onChange({ departamento: v })}
      />
      <FilterSelect
        label="Estado"
        value={filters.estado ?? "todos"}
        options={[{ value: "todos", label: "Todos" }, ...ESTADOS_EMPLEADO.map(e => ({ value: e.value, label: e.label }))]}
        onChange={v => onChange({ estado: v })}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "rgba(15,17,23,0.45)", whiteSpace: "nowrap" }}>
        {label}:
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid var(--border-strong)",
          borderRadius: 4,
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          background: "white",
          cursor: "pointer",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
