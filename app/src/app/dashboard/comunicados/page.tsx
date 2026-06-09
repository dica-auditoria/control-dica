import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchComunicadosAction } from "@/app/actions/comunicados";
import ComunicadosView from "@/components/comunicados/ComunicadosView";

const DEPTOS_CON_ACCESO_ADMIN = [
  "Dirección General",
  "Dirección de Administración",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
] as const;

export default async function ComunicadosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  let esAdmin = ["admin", "superadmin", "rrhh"].includes(perfil.rol);

  if (!esAdmin) {
    const { data: emp } = await supabase
      .from("empleados")
      .select("departamento")
      .eq("email_institucional", user.email ?? "")
      .maybeSingle() as { data: { departamento: string } | null };

    if (emp && (DEPTOS_CON_ACCESO_ADMIN as readonly string[]).includes(emp.departamento)) {
      esAdmin = true;
    }
  }

  const { data } = await fetchComunicadosAction();

  return (
    <div className="page-pad">
      <ComunicadosView comunicados={data ?? []} esAdmin={esAdmin} />
    </div>
  );
}
