"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmpleados } from "@/hooks/useEmpleados";
import EmpleadoStatsCards from "./EmpleadoStatsCards";
import EmpleadosFiltersBar from "./EmpleadosFilters";
import EmpleadosTable from "./EmpleadosTable";
import { exportarEmpleadosCSVAction } from "@/app/actions/exportar";
import type { EmpleadoListItem, EmpleadosStats } from "@/types/empleados";

const PAGE_SIZE = 20;

interface Props {
  initialEmpleados: EmpleadoListItem[];
  initialStats: EmpleadosStats;
  titulo?: string;
  subtitulo?: string;
  ocultarNuevo?: boolean;
}

export default function EmpleadosView({ initialEmpleados, initialStats, titulo, subtitulo, ocultarNuevo = false }: Props) {
  const { data, stats, loading, error, filters, updateFilters } = useEmpleados(
    initialEmpleados,
    initialStats
  );
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const displayStats = stats ?? initialStats;

  // Reset page when filters change
  const handleFilter = (f: Parameters<typeof updateFilters>[0]) => {
    setPage(1);
    updateFilters(f);
  };

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const paginated = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = async () => {
    setExporting(true);
    const res = await exportarEmpleadosCSVAction();
    if (res.csv) {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `empleados-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  return (
    <>
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>
            {titulo ?? "Empleados"}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(15,17,23,0.45)", marginTop: 4 }}>
            {subtitulo ?? "Gestión integral del personal de DICA"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!ocultarNuevo && (
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ padding: "9px 16px", background: "var(--card)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}
            >
              <CsvIcon />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </button>
          )}
          {!ocultarNuevo && (
            <Link href="/dashboard/empleados/nuevo" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 18px", background: "var(--green)", color: "white",
              borderRadius: 4, fontSize: 13, fontWeight: 600,
              textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
            }}>
              + Nuevo empleado
            </Link>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        {error && (
          <div style={{ padding: 12, marginBottom: 16, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>
            {error}
          </div>
        )}

        <EmpleadoStatsCards stats={displayStats} />
        <EmpleadosFiltersBar filters={filters} onChange={handleFilter} />

        <div style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
          overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
          opacity: loading ? 0.6 : 1, transition: "opacity 0.15s",
        }}>
          <EmpleadosTable empleados={paginated} />

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 12, color: "rgba(15,17,23,0.45)", fontFamily: "'DM Mono', monospace" }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.length)} de {data.length}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <PageBtn onClick={() => setPage(1)} disabled={page === 1}>«</PageBtn>
                <PageBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PageBtn>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2;
                  if (pg > totalPages) return null;
                  return (
                    <PageBtn key={pg} onClick={() => setPage(pg)} active={pg === page}>{pg}</PageBtn>
                  );
                })}
                <PageBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</PageBtn>
                <PageBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</PageBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PageBtn({ onClick, disabled, active, children }: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32, height: 32, border: "1.5px solid var(--border-strong)",
        borderRadius: 4, background: active ? "var(--ink)" : "white",
        color: active ? "white" : disabled ? "rgba(15,17,23,0.25)" : "var(--ink)",
        fontSize: 13, cursor: disabled ? "default" : "pointer",
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {children}
    </button>
  );
}

function CsvIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
