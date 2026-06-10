import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchClienteConContratosAction } from "@/app/actions/contratos";
import ClienteDetalleView from "@/components/clientes/ClienteDetalleView";

interface PerfilRow { rol: string }

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

  // Empleados solo pueden ver empresas a las que tienen acceso explícito
  if (perfil.rol === "empleado") {
    const admin = createAdminClient();

    const { data: emp } = await supabase
      .from("empleados")
      .select("id")
      .eq("email_institucional", user.email ?? "")
      .maybeSingle() as { data: { id: string } | null; error: unknown };

    if (!emp) redirect("/dashboard");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: acceso } = await (admin.from("entidad_acceso_empleados") as any)
      .select("entidad_id")
      .eq("entidad_id", params.id)
      .eq("empleado_id", emp.id)
      .maybeSingle() as { data: { entidad_id: string } | null; error: unknown };

    if (!acceso) redirect("/dashboard/directorio");
  }

  const result = await fetchClienteConContratosAction(params.id);
  if (result.error || !result.data) notFound();

  return (
    <ClienteDetalleView
      cliente={result.data}
      rol={perfil.rol}
      backHref="/dashboard/directorio"
      backLabel="Directorio"
    />
  );
}
