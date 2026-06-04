import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchEmpleadoByIdAction } from "@/app/actions/empleados";
import EmpleadoDetalleView from "@/components/empleados/EmpleadoDetalleView";
import { mapEmpleadoDetalle } from "@/lib/empleados/map";

interface PerfilRow { rol: string }
interface SupervisorRow { id: string; nombres: string; apellido_paterno: string; apellido_materno: string }
interface UbicacionRow { id: string; nombre: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  order: (...args: unknown[]) => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

export default async function EmpleadoDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const [result, rSupervisores, rUbicaciones] = await Promise.all([
    fetchEmpleadoByIdAction(params.id),
    supabase.from("empleados")
      .select("id, nombres, apellido_paterno, apellido_materno")
      .eq("estado", "activo").order("nombres") as unknown as Promise<{ data: SupervisorRow[] | null; error: unknown }>,
    db(supabase, "ubicaciones")
      .select("id, nombre").eq("tipo", "oficina").eq("activo", true).order("nombre") as unknown as Promise<{ data: UbicacionRow[] | null; error: unknown }>,
  ]);

  if (result.error || !result.data) notFound();

  const empleado    = mapEmpleadoDetalle(result.data as Record<string, unknown>);
  const supervisores = (rSupervisores.data ?? []).filter(s => s.id !== params.id);
  const ubicaciones  = rUbicaciones.data ?? [];

  return (
    <EmpleadoDetalleView
      empleado={empleado}
      supervisores={supervisores}
      ubicaciones={ubicaciones}
    />
  );
}
