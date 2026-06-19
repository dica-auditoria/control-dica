import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchClienteConContratosAction } from "@/app/actions/contratos";
import ClienteDetalleView from "@/components/clientes/ClienteDetalleView";

interface PerfilRow { rol: string }
interface EmpleadoAccesoRow { id: string; departamento: string }

const DEPARTAMENTOS_PRIVILEGIADOS = [
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

  const isAdmin = perfil.rol === "admin" || perfil.rol === "superadmin" || perfil.rol === "rrhh";

  let puedeGestionarAcceso = isAdmin;

  if (!isAdmin) {
    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emp } = await (admin.from("empleados") as any)
      .select("id, departamento")
      .eq("usuario_id", user.id)
      .single() as { data: EmpleadoAccesoRow | null; error: unknown };

    const esPrivilegiado = emp && DEPARTAMENTOS_PRIVILEGIADOS.includes(emp.departamento);

    if (!esPrivilegiado) {
      // Verificar que tenga acceso explícito a esta entidad
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: acceso } = await (admin.from("entidad_acceso_empleados") as any)
        .select("empleado_id")
        .eq("entidad_id", params.id)
        .eq("empleado_id", emp?.id ?? "")
        .maybeSingle() as { data: { empleado_id: string } | null; error: unknown };

      if (!acceso) redirect("/dashboard/directorio");
    }

    if (esPrivilegiado) puedeGestionarAcceso = true;
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
