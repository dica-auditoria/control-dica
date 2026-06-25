import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/layout/DashboardShell";
import { contarTicketsAbiertosAction } from "@/app/actions/tickets";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  interface PerfilRow { id: string; nombre: string; rol: string; entidad_id: string | null; entidades: { nombre: string } | null; departamento?: string | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: perfil } = await (supabase.from("usuarios") as any)
    .select("id, nombre, rol, entidad_id, entidades(nombre)")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  // Empleados / RRHH: obtener departamento y verificar aviso de privacidad
  if (perfil.rol === "empleado" || perfil.rol === "rrhh") {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empAdmin = admin.from("empleados") as any;

    // Prefer lookup by empleado_id stored in auth metadata (reliable even if email differs)
    const empleadoIdMeta = user.user_metadata?.empleado_id as string | undefined;
    const empQuery = empleadoIdMeta
      ? empAdmin.select("id, departamento, empleado_privacidad(id)").eq("id", empleadoIdMeta)
      : empAdmin.select("id, departamento, empleado_privacidad(id)")
          .or(`usuario_id.eq.${user.id}${user.email ? `,email_institucional.eq.${user.email}` : ""}`)
          .limit(1);

    if (empQuery) {
      const { data: emp } = await empQuery.maybeSingle() as { data: { id: string; departamento: string | null; empleado_privacidad: { id: string }[] } | null };
      if (emp) {
        perfil.departamento = emp.departamento;
        if (!emp.empleado_privacidad || emp.empleado_privacidad.length === 0) {
          redirect("/empleado/aviso-privacidad");
        }
      }
    }
  }

  // Badge: solicitudes pendientes para admin/superadmin
  let solicitudesPendientes = 0;
  let requerimientosPendientes = 0;
  let ticketsPendientes = 0;

  if (perfil.rol === "admin" || perfil.rol === "superadmin") {
    const { count } = await supabase
      .from("solicitudes_eliminacion")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente");
    solicitudesPendientes = count ?? 0;
    ticketsPendientes = await contarTicketsAbiertosAction();
  }

  if (perfil.rol === "cliente" && perfil.entidad_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from("requerimientos") as any)
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", perfil.entidad_id)
      .neq("estado", "completado");
    requerimientosPendientes = count ?? 0;
  }

  return (
    <DashboardShell
      usuario={perfil}
      solicitudesPendientes={solicitudesPendientes}
      requerimientosPendientes={requerimientosPendientes}
      ticketsPendientes={ticketsPendientes}
    >
      {children}
    </DashboardShell>
  );
}
