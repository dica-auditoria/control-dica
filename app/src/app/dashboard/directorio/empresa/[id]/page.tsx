import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchClienteConContratosAction } from "@/app/actions/contratos";
import ClienteDetalleView from "@/components/clientes/ClienteDetalleView";

interface PerfilRow { rol: string }
interface EmpleadoDeptoRow { departamento: string }

const DEPARTAMENTOS_GESTION_ACCESO = [
  "Dirección General",
  "Dirección de Administración",
  "Coordinación de Sistemas",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
];

export default async function EmpresaDirectorioPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const isAdmin = perfil.rol === "admin" || perfil.rol === "superadmin";

  // Para no-admins, verificar si su departamento tiene permiso de gestionar acceso
  let puedeGestionarAcceso = isAdmin;
  if (!isAdmin) {
    const admin = createAdminClient();
    const { data: empDepto } = await (admin.from("empleados") as any)
      .select("departamento")
      .eq("usuario_id", user.id)
      .single() as { data: EmpleadoDeptoRow | null; error: unknown };
    if (empDepto && DEPARTAMENTOS_GESTION_ACCESO.includes(empDepto.departamento)) {
      puedeGestionarAcceso = true;
    }
  }

  const result = await fetchClienteConContratosAction(params.id);
  if (result.error || !result.data) notFound();

  return (
    <ClienteDetalleView
      cliente={result.data}
      rol={perfil.rol}
      puedeGestionarAcceso={puedeGestionarAcceso}
      backHref="/dashboard/directorio"
      backLabel="Directorio"
    />
  );
}
