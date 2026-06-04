"use client";

import Link from "next/link";
import { useEmpleados } from "@/hooks/useEmpleados";
import EmpleadoStatsCards from "./EmpleadoStatsCards";
import EmpleadosFiltersBar from "./EmpleadosFilters";
import EmpleadosTable from "./EmpleadosTable";
import type { EmpleadoListItem, EmpleadosStats } from "@/types/empleados";

interface Props {
  initialEmpleados: EmpleadoListItem[];
  initialStats: EmpleadosStats;
}

export default function EmpleadosView({ initialEmpleados, initialStats }: Props) {
  const { data, stats, loading, error, filters, updateFilters } = useEmpleados(
    initialEmpleados,
    initialStats
  );

  const displayStats = stats ?? initialStats;

  return (
    <>
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: "var(--ink)",
            margin: 0,
          }}>
            Empleados
          </h1>
          <p style={{
            fontSize: 13,
            color: "rgba(15,17,23,0.45)",
            marginTop: 4,
          }}>
            Gestión integral del personal de DICA
          </p>
        </div>
        <Link href="/dashboard/empleados/nuevo" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          background: "var(--green)",
          color: "white",
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          + Nuevo empleado
        </Link>
      </div>

      <div style={{ padding: "28px 32px" }}>
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            background: "var(--red-light)",
            color: "var(--accent)",
            borderRadius: 4,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <EmpleadoStatsCards stats={displayStats} />
        <EmpleadosFiltersBar filters={filters} onChange={updateFilters} />

        <div style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}>
          <EmpleadosTable empleados={data} />
        </div>
      </div>
    </>
  );
}
