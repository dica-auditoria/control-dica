import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchUbicacionesAction } from "@/app/actions/directorio";
import DirectorioView from "@/components/directorio/DirectorioView";
import type { EntidadOption } from "@/types/directorio";
import type { EmpresaDirectorioItem } from "@/components/directorio/DirectorioView";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }
interface ContratoRow { entidad_id: string; estado: string }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rOficinas, rZonas, rEntidades, rContratos] = await Promise.all([
    fetchUbicacionesAction("oficina"),
    fetchUbicacionesAction("zona_cliente"),
    (supabase.from("entidades") as any)
      .select("id, nombre, activo, created_at")
      .order("nombre") as Promise<{ data: EntidadRow[] | null; error: unknown }>,
    (supabase.from("contratos") as any)
      .select("entidad_id, estado") as Promise<{ data: ContratoRow[] | null; error: unknown }>,
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

  const empresas: EmpresaDirectorioItem[] = (rEntidades.data ?? []).map(e => ({
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    created_at: e.created_at,
    totalContratos: contratosMap.get(e.id)?.total ?? 0,
    contratosVigentes: contratosMap.get(e.id)?.vigentes ?? 0,
  }));

  return (
    <DirectorioView
      oficinas={rOficinas.data ?? []}
      zonas={rZonas.data ?? []}
      entidades={entidades}
      empresas={empresas}
      rolActual={perfil.rol}
    />
  );
}
