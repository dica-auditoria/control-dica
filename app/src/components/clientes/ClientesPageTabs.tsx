"use client";

import { useState } from "react";
import ClientesView from "./ClientesView";
import ClientesAccesoView from "./ClientesAccesoView";
import type { ClienteListItem } from "./ClientesView";
import type { ClienteUsuarioItem, EntidadOpcion } from "./ClientesAccesoView";

interface Props {
  clientes: ClienteListItem[];
  usuarios: ClienteUsuarioItem[];
  entidades: EntidadOpcion[];
  rol: string;
}

type Tab = "empresas" | "acceso";

export default function ClientesPageTabs({ clientes, usuarios, entidades, rol }: Props) {
  const [tab, setTab] = useState<Tab>("empresas");

  return (
    <>
      {/* Topbar con tabs */}
      <div style={{
        padding: "20px 32px 0",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", marginBottom: 12 }}>
            Clientes
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2 }}>
            {([
              { id: "empresas", label: "Empresas", count: clientes.length },
              { id: "acceso",   label: "Acceso",   count: usuarios.length },
            ] as { id: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 18px", border: "none",
                  borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                  background: "none",
                  color: tab === t.id ? "var(--accent)" : "rgba(15,17,23,0.5)",
                  fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  marginBottom: -1, display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {t.label}
                <span style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace",
                  padding: "1px 6px", borderRadius: 100,
                  background: tab === t.id ? "rgba(200,71,42,0.1)" : "var(--surface-2)",
                  color: tab === t.id ? "var(--accent)" : "rgba(15,17,23,0.4)",
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      {tab === "empresas" && <ClientesView clientes={clientes} />}
      {tab === "acceso"   && <ClientesAccesoView usuarios={usuarios} entidades={entidades} rol={rol} />}
    </>
  );
}
