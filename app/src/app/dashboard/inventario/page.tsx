import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchActivosSimpleAction, fetchCategoriasAction } from "@/app/actions/inventario";
import { fetchUbicacionesAction } from "@/app/actions/directorio";
import InventarioView from "@/components/inventario/InventarioView";

interface PerfilRow { rol: string }
interface EmpleadoRow { id: string; nombres: string; apellido_paterno: string; apellido_materno: string }

export default async function InventarioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) redirect("/dashboard");

  const [rActivos, categorias, rEmpleados, rUbicaciones] = await Promise.all([
    fetchActivosSimpleAction(),
    fetchCategoriasAction(),
    supabase
      .from("empleados")
      .select("id, nombres, apellido_paterno, apellido_materno")
      .in("estado", ["activo", "pendiente"])
      .order("apellido_paterno") as unknown as Promise<{ data: EmpleadoRow[] | null; error: unknown }>,
    fetchUbicacionesAction(),
  ]);

  return (
    <InventarioView
      activos={rActivos.data ?? []}
      categorias={categorias}
      empleados={rEmpleados.data ?? []}
      ubicaciones={(rUbicaciones.data ?? []).map(({ id, nombre }) => ({ id, nombre }))}
    />
  );
}
