"use client";

import Link from "next/link";

export interface ClienteListItem {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  totalContratos: number;
  contratosVigentes: number;
  totalArchivos: number;
  totalUsuarios: number;
}

interface ClientesViewProps {
  clientes: ClienteListItem[];
}

export default function ClientesView({ clientes }: ClientesViewProps) {
  const activos = clientes.filter(c => c.activo).length;
  const totalContratos = clientes.reduce((s, c) => s + c.totalContratos, 0);
  const vigentes = clientes.reduce((s, c) => s + c.contratosVigentes, 0);

  return (
    <>

      <div style={{ padding: "24px 32px" }}>
        {/* Nota gestión */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
            {activos} activo{activos !== 1 ? "s" : ""} · {clientes.length} empresa{clientes.length !== 1 ? "s" : ""}
          </div>
          <Link
            href="/dashboard/directorio"
            style={{
              fontSize: 12, color: "var(--muted-2)", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Gestionar empresas en Directorio →
          </Link>
        </div>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard label="Clientes activos" value={activos} accent="var(--green)" />
          <StatCard label="Total contratos" value={totalContratos} accent="var(--accent)" />
          <StatCard label="Contratos vigentes" value={vigentes} accent="var(--amber)" />
        </div>

        {/* Cards grid */}
        {clientes.length === 0 ? (
          <div style={{
            padding: "64px 20px", textAlign: "center",
            color: "var(--muted)", fontSize: 13,
            fontFamily: "'DM Mono', monospace",
          }}>
            No hay clientes registrados —{" "}
            <Link href="/dashboard/directorio" style={{ color: "var(--accent)", textDecoration: "none" }}>
              agregar en Directorio
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {clientes.map(c => (
              <ClienteCard key={c.id} cliente={c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ClienteCard({ cliente: c }: { cliente: ClienteListItem }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
      opacity: c.activo ? 1 : 0.6,
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            background: "rgba(15,17,23,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>
            🏛
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: "var(--ink)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {c.nombre}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>
              Alta: {new Date(c.created_at).toLocaleDateString("es-MX")}
            </div>
          </div>
        </div>
        <span style={{
          padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600,
          fontFamily: "'DM Mono', monospace", flexShrink: 0,
          background: c.activo ? "rgba(45,106,79,0.1)" : "var(--surface-2)",
          color: c.activo ? "var(--green)" : "rgba(15,17,23,0.4)",
        }}>
          {c.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      {/* Métricas */}
      <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
        <Metric label="Contratos" value={c.totalContratos} />
        <Metric label="Vigentes" value={c.contratosVigentes} color="var(--green)" />
        <Metric label="Archivos" value={c.totalArchivos} />
        <Metric label="Usuarios" value={c.totalUsuarios} />
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
        <Link
          href={`/dashboard/directorio/empresa/${c.id}`}
          style={{
            display: "block", textAlign: "center",
            padding: "7px", background: "var(--surface)",
            color: "var(--ink)", border: "1px solid var(--border-strong)",
            borderRadius: 4, fontSize: 12, fontWeight: 600,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Ver directorio →
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "4px 0" }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: color ?? "var(--ink)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </div>
    </div>
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
