"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DicaLogo } from "@/components/ui/DicaLogo";

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  entidad_id: string | null;
  entidades: { nombre: string } | null;
}

interface SidebarProps {
  usuario: Usuario;
  solicitudesPendientes?: number;
  requerimientosPendientes?: number;
}

const NAV_ADMIN = [
  { href: "/dashboard", label: "Dashboard", icon: "shield" },
  { href: "/dashboard/buscar", label: "Búsqueda", icon: "search" },
  { href: "/dashboard/empleados", label: "Empleados", icon: "users" },
  { href: "/dashboard/archivos", label: "Archivos", icon: "files" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "building" },
  { href: "/dashboard/directorio", label: "Directorio", icon: "map" },
  { href: "/dashboard/asistencia", label: "Asistencia", icon: "clock" },
  { href: "/dashboard/mi-asistencia", label: "Mi Check-in", icon: "checkin" },
  { href: "/dashboard/inventario", label: "Inventario", icon: "box" },
  { href: "/dashboard/usuarios", label: "Acceso", icon: "users" },
  { href: "/dashboard/solicitudes", label: "Solicitudes", icon: "alert" },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: "log" },
];

const NAV_EMPLEADO = [
  { href: "/dashboard", label: "Dashboard", icon: "shield" },
  { href: "/dashboard/mi-expediente", label: "Mi Expediente", icon: "user" },
  { href: "/dashboard/mi-asistencia", label: "Mi Check-in", icon: "checkin" },
  { href: "/dashboard/buscar", label: "Búsqueda", icon: "search" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "building" },
  { href: "/dashboard/directorio", label: "Directorio", icon: "map" },
  { href: "/dashboard/asistencia", label: "Asistencia", icon: "clock" },
  { href: "/dashboard/empleados", label: "Mi Equipo", icon: "users" },
];

const NAV_CLIENTE = [
  { href: "/dashboard", label: "Mi Portal", icon: "files" },
];

export default function Sidebar({ usuario, solicitudesPendientes = 0, requerimientosPendientes = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = usuario.rol === "cliente" ? NAV_CLIENTE
    : usuario.rol === "empleado" ? NAV_EMPLEADO
    : NAV_ADMIN;

  const handleLogout = async () => {
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
    <aside style={{
      background: "#1B4F8A",
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      position: "sticky",
      top: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}>
        <DicaLogo variant="white" fontSize={26} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", padding: "12px 8px 6px" }}>
          Navegación
        </div>
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const badge =
            item.href === "/dashboard/solicitudes" && solicitudesPendientes > 0 ? solicitudesPendientes
            : item.href === "/dashboard" && usuario.rol === "cliente" && requerimientosPendientes > 0 ? requerimientosPendientes
            : null;
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px",
              borderRadius: 4,
              fontSize: 13, fontWeight: 500,
              color: isActive ? "white" : "rgba(255,255,255,0.5)",
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
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {usuario.nombre}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {usuario.rol}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
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
