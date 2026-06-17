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
interface ArchivoRow { entidad_id: string }
interface UsuarioRow { entidad_id: string | null }
interface AccesoRow { entidad_id: string }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rOficinas, rEntidades, rContratos, rArchivos, rUsuarios, rAccesos] = await Promise.all([
    fetchUbicacionesAction("oficina"),
    (admin.from("entidades") as any)
      .select("id, nombre, activo, created_at")
      .order("nombre") as Promise<{ data: EntidadRow[] | null; error: unknown }>,
    (admin.from("contratos") as any)
      .select("entidad_id, estado") as Promise<{ data: ContratoRow[] | null; error: unknown }>,
    (admin.from("archivos") as any).select("entidad_id").neq("estado", "eliminado").neq("tipo", "carpeta").limit(100000) as Promise<{ data: ArchivoRow[] | null; error: unknown }>,
    (admin.from("usuarios") as any).select("entidad_id").eq("rol", "cliente").not("entidad_id", "is", null).limit(10000) as Promise<{ data: UsuarioRow[] | null; error: unknown }>,
    (admin.from("entidad_acceso_empleados") as any).select("entidad_id").limit(10000) as Promise<{ data: AccesoRow[] | null; error: unknown }>,
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

  const archivosMap = new Map<string, number>();
  for (const a of rArchivos.data ?? []) {
    archivosMap.set(a.entidad_id, (archivosMap.get(a.entidad_id) ?? 0) + 1);
  }

  const usuariosMap = new Map<string, number>();
  for (const u of rUsuarios.data ?? []) {
    if (u.entidad_id) usuariosMap.set(u.entidad_id, (usuariosMap.get(u.entidad_id) ?? 0) + 1);
  }

  // Count employees with explicit access per entity (matches totalUsuarios in Clientes detail)
  const accesosMap = new Map<string, number>();
  for (const a of rAccesos.data ?? []) {
    accesosMap.set(a.entidad_id, (accesosMap.get(a.entidad_id) ?? 0) + 1);
  }

  const empresas: EmpresaDirectorioItem[] = (rEntidades.data ?? []).map(e => ({
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    created_at: e.created_at,
    totalContratos: contratosMap.get(e.id)?.total ?? 0,
    contratosVigentes: contratosMap.get(e.id)?.vigentes ?? 0,
    totalArchivos: archivosMap.get(e.id) ?? 0,
    totalUsuarios: (usuariosMap.get(e.id) ?? 0) + (accesosMap.get(e.id) ?? 0),
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
