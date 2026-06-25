"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { DicaLogo } from "@/components/ui/DicaLogo";

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  entidad_id: string | null;
  entidades: { nombre: string } | null;
  departamento?: string | null;
}

interface Props {
  usuario: Usuario;
  solicitudesPendientes: number;
  requerimientosPendientes: number;
  ticketsPendientes?: number;
  children: React.ReactNode;
}

export default function DashboardShell({ usuario, solicitudesPendientes, requerimientosPendientes, ticketsPendientes = 0, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile top bar — hidden on desktop via CSS */}
      <div className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: 4, display: "flex" }}
          aria-label="Abrir menú"
        >
          <HamburgerIcon />
        </button>
        <DicaLogo variant="white" fontSize={20} />
        <div style={{ width: 32 }} />
      </div>

      <div className="dashboard-body">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar
          usuario={usuario}
          solicitudesPendientes={solicitudesPendientes}
          requerimientosPendientes={requerimientosPendientes}
          ticketsPendientes={ticketsPendientes}
          isMobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        <main style={{ overflowY: "auto", minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
