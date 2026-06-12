import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  interface PerfilRow { id: string; nombre: string; rol: string; entidad_id: string | null; entidades: { nombre: string } | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: perfil } = await (supabase.from("usuarios") as any)
    .select("id, nombre, rol, entidad_id, entidades(nombre)")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  // Empleados / RRHH sin aviso de privacidad aceptado → intercepción
  if ((perfil.rol === "empleado" || perfil.rol === "rrhh") && user.email) {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emp } = await (admin.from("empleados") as any)
      .select("id, empleado_privacidad(id)")
      .eq("email_institucional", user.email)
      .maybeSingle() as { data: { id: string; empleado_privacidad: { id: string }[] } | null };

    if (emp && (!emp.empleado_privacidad || emp.empleado_privacidad.length === 0)) {
      redirect("/empleado/aviso-privacidad");
    }
  }

  // Badge: solicitudes pendientes para admin/superadmin
  let solicitudesPendientes = 0;
  let requerimientosPendientes = 0;

  if (perfil.rol === "admin" || perfil.rol === "superadmin") {
    const { count } = await supabase
      .from("solicitudes_eliminacion")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente");
    solicitudesPendientes = count ?? 0;
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
    >
      {children}
    </DashboardShell>
  );
}
