import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAsistenciaAction } from "@/app/actions/asistencia";
import { fetchUbicacionesAction } from "@/app/actions/directorio";
import AsistenciaView from "@/components/asistencia/AsistenciaView";
import type { EmpleadoAsistenciaOption } from "@/types/asistencia";

interface PerfilRow { rol: string }
interface EmpleadoRow {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  codigo_empleado: string | null;
  estado: string;
}

export default async function AsistenciaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente" || perfil.rol === "empleado") redirect("/dashboard/mi-asistencia");

  const hoy = new Date().toISOString().split("T")[0];

  const [rRegistros, rEmpleados, rOficinas] = await Promise.all([
    fetchAsistenciaAction({ fecha: hoy }),
    supabase
      .from("empleados")
      .select("id, nombres, apellido_paterno, apellido_materno, codigo_empleado, estado")
      .in("estado", ["activo", "pendiente"])
      .order("apellido_paterno") as unknown as Promise<{ data: EmpleadoRow[] | null; error: unknown }>,
    fetchUbicacionesAction("oficina"),
  ]);

  const empleados: EmpleadoAsistenciaOption[] = (rEmpleados.data ?? []).map(e => ({
    id: e.id,
    nombres: e.nombres,
    apellido_paterno: e.apellido_paterno,
    apellido_materno: e.apellido_materno,
    codigo_empleado: e.codigo_empleado,
    estado: e.estado,
  }));

  return (
    <AsistenciaView
      registros={rRegistros.data ?? []}
      empleados={empleados}
      oficinas={rOficinas.data ?? []}
      fechaInicial={hoy}
    />
  );
}
