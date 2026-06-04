import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchEmpleadosListAction } from "@/app/actions/empleados";
import EmpleadosView from "@/components/empleados/EmpleadosView";
import { mapEmpleadoListItem } from "@/lib/empleados/map";
import type { EmpleadosStats } from "@/types/empleados";

interface PerfilRow { rol: string }

export default async function EmpleadosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const result = await fetchEmpleadosListAction({ estado: "todos", departamento: "todos" });

  const empleados = (result.data ?? []).map(e => mapEmpleadoListItem(e as unknown as Record<string, unknown>));
  const stats: EmpleadosStats = result.stats ?? {
    activos: 0,
    perfilesIncompletos: 0,
    documentosPorVencer: 0,
    capacitacionesPendientes: 0,
    nuevosEsteMes: 0,
  };

  return <EmpleadosView initialEmpleados={empleados} initialStats={stats} />;
}
