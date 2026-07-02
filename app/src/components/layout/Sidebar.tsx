"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeSelector from "@/components/ui/ThemeSelector";
import { registrarLogoutAction } from "@/app/actions/audit";
import { DicaLogo } from "@/components/ui/DicaLogo";

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  entidad_id: string | null;
  entidades: { nombre: string } | null;
  departamento?: string | null;
}

const DEPTS_CON_SOLICITUDES = [
  "Dirección General",
  "Dirección de Administración",
  "Gerencia de RH",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
  "Coordinación de Sistemas",
  "Líderes de Auditoría",
];

const DEPTS_CON_AUDITORIA = [
  "Dirección General",
  "Dirección de Administración",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
  "Coordinación de Sistemas",
  "Líderes de Auditoría",
];

interface SidebarProps {
  usuario: Usuario;
  solicitudesPendientes?: number;
  requerimientosPendientes?: number;
  ticketsPendientes?: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ADMIN = [
  { href: "/dashboard", label: "Dashboard", icon: "shield" },
  { href: "/dashboard/buscar", label: "Búsqueda", icon: "search" },
  { href: "/dashboard/empleados", label: "Empleados", icon: "users" },
  { href: "/dashboard/otros", label: "Otros", icon: "calendar" },
  { href: "/dashboard/comunicados", label: "Comunicados", icon: "bell" },
  { href: "/dashboard/archivos", label: "Archivos", icon: "files" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "building" },
  { href: "/dashboard/directorio", label: "Directorio", icon: "map" },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: "audit" },
  { href: "/dashboard/asistencia", label: "Asistencia", icon: "clock" },
  { href: "/dashboard/mi-asistencia", label: "Mi Check-in", icon: "checkin" },
  { href: "/dashboard/mi-credencial", label: "Mi Credencial", icon: "card" },
  { href: "/dashboard/cumpleanos", label: "Cumpleaños", icon: "cake" },
  { href: "/dashboard/inventario", label: "Inventario", icon: "box" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
  { href: "/dashboard/usuarios", label: "Acceso", icon: "users" },
  { href: "/dashboard/solicitudes", label: "Solicitudes", icon: "alert" },
  { href: "/dashboard/pendientes", label: "Pendientes", icon: "pending" },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: "log" },
  { href: "/dashboard/herramientas", label: "Herramientas", icon: "tools" },
];

const NAV_EMPLEADO = [
  { href: "/dashboard/mi-asistencia", label: "Mi Check-in", icon: "checkin" },
  { href: "/dashboard", label: "Dashboard", icon: "shield" },
  { href: "/dashboard/pendientes", label: "Pendientes", icon: "pending" },
  { href: "/dashboard/directorio", label: "Directorio", icon: "map" },
  { href: "/dashboard/comunicados", label: "Comunicados", icon: "bell" },
  { href: "/dashboard/cumpleanos", label: "Cumpleaños", icon: "cake" },
  { href: "/dashboard/mi-credencial", label: "Mi Credencial", icon: "card" },
  { href: "/dashboard/mi-expediente", label: "Mi Expediente", icon: "user" },
  { href: "/dashboard/empleados", label: "Mi Equipo", icon: "users" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
  { href: "/dashboard/otros", label: "Otros", icon: "calendar" },
];

const NAV_RRHH = [
  { href: "/dashboard", label: "Dashboard", icon: "shield" },
  { href: "/dashboard/empleados", label: "Empleados", icon: "users" },
  { href: "/dashboard/otros", label: "Otros", icon: "calendar" },
  { href: "/dashboard/comunicados", label: "Comunicados", icon: "bell" },
  { href: "/dashboard/asistencia", label: "Asistencia", icon: "clock" },
  { href: "/dashboard/mi-asistencia", label: "Mi Check-in", icon: "checkin" },
  { href: "/dashboard/mi-expediente", label: "Mi Expediente", icon: "user" },
  { href: "/dashboard/mi-credencial", label: "Mi Credencial", icon: "card" },
  { href: "/dashboard/cumpleanos", label: "Cumpleaños", icon: "cake" },
  { href: "/dashboard/directorio", label: "Directorio", icon: "map" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
  { href: "/dashboard/pendientes", label: "Pendientes", icon: "pending" },
];

const NAV_CLIENTE = [
  { href: "/dashboard", label: "Mi Portal", icon: "files" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
];

export default function Sidebar({ usuario, solicitudesPendientes = 0, requerimientosPendientes = 0, ticketsPendientes = 0, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showTheme, setShowTheme] = useState(false);

  const baseNav = usuario.rol === "cliente" ? NAV_CLIENTE
    : usuario.rol === "empleado" ? NAV_EMPLEADO
    : usuario.rol === "rrhh" ? NAV_RRHH
    : NAV_ADMIN;

  const isEmpleadoOrRrhh = usuario.rol === "empleado" || usuario.rol === "rrhh";
  const dept = usuario.departamento ?? "";
  let navItems = [...baseNav];
  if (isEmpleadoOrRrhh && dept && DEPTS_CON_AUDITORIA.includes(dept)) {
    navItems = [
      ...navItems,
      { href: "/dashboard/clientes", label: "Clientes", icon: "building" },
      { href: "/dashboard/auditoria", label: "Auditoría", icon: "audit" },
    ];
  }
  if (isEmpleadoOrRrhh && dept && DEPTS_CON_SOLICITUDES.includes(dept)) {
    navItems = [...navItems, { href: "/dashboard/solicitudes", label: "Solicitudes", icon: "alert" }];
  }

  const handleLogout = async () => {
    await registrarLogoutAction().catch(() => {});
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = usuario.nombre
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`sidebar-aside${isMobileOpen ? " sidebar-open" : ""}`} style={{
      background: "#1B4F8A",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Brand */}
      {onMobileClose && (
        <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onMobileClose}
            className="sidebar-close-btn"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4, display: "flex" }}
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {showTheme ? (
        <ThemeSelector onBack={() => setShowTheme(false)} />
      ) : (
        <>
          {/* Logo */}
          <div style={{ padding: "20px 20px 8px" }}>
            <DicaLogo variant="white" fontSize={24} />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", padding: "12px 8px 6px" }}>
              Navegación
            </div>
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              const badge =
                item.href === "/dashboard/solicitudes" && solicitudesPendientes > 0 ? solicitudesPendientes
                : item.href === "/dashboard/tickets" && ticketsPendientes > 0 ? ticketsPendientes
                : item.href === "/dashboard" && usuario.rol === "cliente" && requerimientosPendientes > 0 ? requerimientosPendientes
                : null;
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px",
                  borderRadius: 4,
                  fontSize: 13, fontWeight: 500,
                  color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.52)",
                  background: isActive ? "rgba(141,198,63,0.15)" : "transparent",
                  textDecoration: "none",
                  position: "relative",
                  transition: "all 0.15s",
                }}>
                  {isActive && (
                    <span style={{
                      position: "absolute", left: 0, top: 4, bottom: 4,
                      width: 3, background: "#8DC63F", borderRadius: "0 2px 2px 0",
                    }} />
                  )}
                  <NavIcon name={item.icon} active={isActive} />
                  {item.label}
                  {badge !== null && (
                    <span style={{
                      marginLeft: "auto",
                      background: "#8DC63F", color: "white",
                      fontSize: 10, fontWeight: 700, padding: "1px 6px",
                      borderRadius: 100, fontFamily: "'DM Mono', monospace",
                    }}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8 }}>
              <div style={{
                width: 32, height: 32,
                background: "rgba(255,255,255,0.12)", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#8DC63F", flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {usuario.nombre}
                </div>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {usuario.rol}
                </div>
              </div>
              <button
                onClick={() => setShowTheme(true)}
                title="Aspecto"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
              >
                <PaletteIcon />
              </button>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)";
  const s = { width: 16, height: 16, flexShrink: 0 as const };
  const p = { fill: "none", stroke: color, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "shield":    return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "search":    return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="11" cy="11" r="8"/><line {...p} x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case "users":     return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle {...p} cx="9" cy="7" r="4"/><path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87"/><path {...p} d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "user":      return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle {...p} cx="12" cy="7" r="4"/></svg>;
    case "calendar":  return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="18" rx="2"/><line {...p} x1="16" y1="2" x2="16" y2="6"/><line {...p} x1="8" y1="2" x2="8" y2="6"/><line {...p} x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "bell":      return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path {...p} d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case "files":     return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline {...p} points="14 2 14 8 20 8"/><line {...p} x1="16" y1="13" x2="8" y2="13"/><line {...p} x1="16" y1="17" x2="8" y2="17"/></svg>;
    case "building":  return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline {...p} points="9 22 9 12 15 12 15 22"/></svg>;
    case "map":       return <svg {...s} viewBox="0 0 24 24"><polygon {...p} points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line {...p} x1="8" y1="2" x2="8" y2="18"/><line {...p} x1="16" y1="6" x2="16" y2="22"/></svg>;
    case "audit":     return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M9 11l3 3L22 4"/><path {...p} d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "clock":     return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10"/><polyline {...p} points="12 6 12 12 16 14"/></svg>;
    case "checkin":   return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle {...p} cx="12" cy="10" r="3"/></svg>;
    case "card":      return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="1" y="4" width="22" height="16" rx="2"/><line {...p} x1="1" y1="10" x2="23" y2="10"/></svg>;
    case "cake":      return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path {...p} d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><line {...p} x1="2" y1="21" x2="22" y2="21"/><path {...p} d="M7 8v2"/><path {...p} d="M12 8v2"/><path {...p} d="M17 8v2"/><path {...p} d="M7 4l.5 2"/><path {...p} d="M12 4l.5 2"/><path {...p} d="M17 4l.5 2"/></svg>;
    case "box":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline {...p} points="3.27 6.96 12 12.01 20.73 6.96"/><line {...p} x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case "alert":     return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10"/><line {...p} x1="12" y1="8" x2="12" y2="12"/><line {...p} x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case "pending":   return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10"/><polyline {...p} points="12 6 12 12 16 14"/></svg>;
    case "log":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline {...p} points="14 2 14 8 20 8"/><line {...p} x1="16" y1="13" x2="8" y2="13"/><line {...p} x1="12" y1="17" x2="8" y2="17"/><polyline {...p} points="10 9 9 9 8 9"/></svg>;
    case "ticket":    return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line {...p} x1="9" y1="12" x2="15" y2="12"/></svg>;
    case "tools":     return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    default:          return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="4"/></svg>;
  }
}

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
