import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchComunicadosAction } from "@/app/actions/comunicados";
import ComunicadosView from "@/components/comunicados/ComunicadosView";

const DEPTOS_CON_ACCESO_ADMIN = [
  "Dirección General",
  "Dirección de Administración",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
  "Coordinación de Sistemas",
  "Líderes de Auditoría",
];

export default async function ComunicadosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  let esAdmin = ["admin", "superadmin", "rrhh"].includes(perfil.rol);

  if (!esAdmin && perfil.rol === "empleado") {
    const admin = createAdminClient();
    const empleadoId = user.user_metadata?.empleado_id as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = empleadoId
      ? (admin.from("empleados") as any).select("departamento").eq("id", empleadoId).maybeSingle()
      : user.email
        ? (admin.from("empleados") as any).select("departamento").eq("email_institucional", user.email).maybeSingle()
        : null;

    if (q) {
      const { data: emp } = await q as { data: { departamento: string } | null };
      if (emp && DEPTOS_CON_ACCESO_ADMIN.includes(emp.departamento)) {
        esAdmin = true;
      }
    }
  }

  const { data } = await fetchComunicadosAction();

  return (
    <div className="page-pad">
      <ComunicadosView comunicados={data ?? []} esAdmin={esAdmin} />
    </div>
  );
}
