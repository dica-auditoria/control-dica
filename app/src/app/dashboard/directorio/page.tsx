import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUbicacionesAction } from "@/app/actions/directorio";
import DirectorioView from "@/components/directorio/DirectorioView";
import type { EntidadOption } from "@/types/directorio";
import type { EmpresaDirectorioItem } from "@/components/directorio/DirectorioView";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }
interface ContratoRow { entidad_id: string; estado: string }
interface StatsRow { entidad_id: string; archivo_count: number; usuario_count: number; total_size_bytes: number }
interface EmpleadoRow { id: string; departamento: string }

const DEPARTAMENTOS_ACCESO_TOTAL = [
  "Dirección General",
  "Dirección de Administración",
  "Coordinación de Sistemas",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
];

export default async function DirectorioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  // Use admin client to bypass RLS on entidades/contratos for non-admin roles
  const admin = createAdminClient();

  // Determinar si el empleado tiene acceso restringido por departamento
  const isPrivileged = ["admin", "superadmin", "rrhh"].includes(perfil.rol);
  let entidadesPermitidas: Set<string> | null = null; // null = ver todo

  if (!isPrivileged) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emp } = await (admin.from("empleados") as any)
      .select("id, departamento")
      .eq("usuario_id", user.id)
      .single() as { data: EmpleadoRow | null; error: unknown };

    if (!emp || !DEPARTAMENTOS_ACCESO_TOTAL.includes(emp.departamento)) {
      // Departamento restringido: solo entidades con acceso explícito
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: accesos } = await (admin.from("entidad_acceso_empleados") as any)
        .select("entidad_id")
        .eq("empleado_id", emp?.id ?? "") as { data: Array<{ entidad_id: string }> | null; error: unknown };
      entidadesPermitidas = new Set((accesos ?? []).map(a => a.entidad_id));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rOficinas, rEntidades, rContratos, rStats] = await Promise.all([
    fetchUbicacionesAction("oficina"),
    (admin.from("entidades") as any)
      .select("id, nombre, activo, created_at")
      .order("nombre") as Promise<{ data: EntidadRow[] | null; error: unknown }>,
    (admin.from("contratos") as any)
      .select("entidad_id, estado") as Promise<{ data: ContratoRow[] | null; error: unknown }>,
    // RPC function bypasses Supabase's 1000-row PostgREST limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.rpc("get_directorio_stats") as any) as Promise<{ data: StatsRow[] | null; error: unknown }>,
  ]);

  const entidades: EntidadOption[] = (rEntidades.data ?? [])
    .filter(e => e.activo)
    .map(e => ({ id: e.id, nombre: e.nombre }));

  const contratosMap = new Map<string, { total: number; vigentes: number }>();
  for (const c of rContratos.data ?? []) {
    const prev = contratosMap.get(c.entidad_id) ?? { total: 0, vigentes: 0 };
    contratosMap.set(c.entidad_id, {
      total: prev.total + 1,
      vigentes: prev.vigentes + (c.estado === "vigente" ? 1 : 0),
    });
  }

  const statsMap = new Map<string, { archivos: number; usuarios: number; sizeBytes: number }>();
  for (const s of rStats.data ?? []) {
    statsMap.set(s.entidad_id, {
      archivos: Number(s.archivo_count),
      usuarios: Number(s.usuario_count),
      sizeBytes: Number(s.total_size_bytes ?? 0),
    });
  }

  const empresas: EmpresaDirectorioItem[] = (rEntidades.data ?? [])
    .filter(e => entidadesPermitidas === null || entidadesPermitidas.has(e.id))
    .map(e => ({
      id: e.id,
      nombre: e.nombre,
      activo: e.activo,
      created_at: e.created_at,
      totalContratos: contratosMap.get(e.id)?.total ?? 0,
      contratosVigentes: contratosMap.get(e.id)?.vigentes ?? 0,
      totalArchivos: statsMap.get(e.id)?.archivos ?? 0,
      totalUsuarios: statsMap.get(e.id)?.usuarios ?? 0,
      totalSizeBytes: statsMap.get(e.id)?.sizeBytes ?? 0,
    }));

  return (
    <DirectorioView
      oficinas={rOficinas.data ?? []}
      entidades={entidades}
      empresas={empresas}
      rolActual={perfil.rol}
    />
  );
}
