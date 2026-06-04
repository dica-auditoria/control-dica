import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchUbicacionesAction } from "@/app/actions/directorio";
import DirectorioView from "@/components/directorio/DirectorioView";
import type { EntidadOption } from "@/types/directorio";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string }

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

  const [rOficinas, rZonas, rEntidades] = await Promise.all([
    fetchUbicacionesAction("oficina"),
    fetchUbicacionesAction("zona_cliente"),
    supabase
      .from("entidades")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre") as unknown as Promise<{ data: EntidadRow[] | null; error: unknown }>,
  ]);

  const entidades: EntidadOption[] = (rEntidades.data ?? []).map(e => ({
    id: e.id,
    nombre: e.nombre,
  }));

  return (
    <DirectorioView
      oficinas={rOficinas.data ?? []}
      zonas={rZonas.data ?? []}
      entidades={entidades}
      rolActual={perfil.rol}
    />
  );
}
