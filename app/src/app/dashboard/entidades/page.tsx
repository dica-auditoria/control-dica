import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EntidadesView, { type EntidadItem } from "@/components/entidades/EntidadesView";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }
interface ArchivoStat { entidad_id: string; estado: string }
interface UsuarioStat { entidad_id: string | null }

export default async function EntidadesPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  // Fetch en paralelo para eficiencia
  const [rEntidades, rArchivos, rUsuarios] = await Promise.all([
    supabase.from("entidades").select("id, nombre, activo, created_at").order("nombre"),
    supabase.from("archivos").select("entidad_id, estado").neq("estado", "eliminado"),
    supabase.from("usuarios").select("entidad_id").not("entidad_id", "is", null),
  ]);

  const entidadesRaw = rEntidades.data as EntidadRow[] | null;
  const archivosRaw  = rArchivos.data  as ArchivoStat[] | null;
  const usuariosRaw  = rUsuarios.data  as UsuarioStat[] | null;

  const archivos = archivosRaw ?? [];
  const usuarios = usuariosRaw ?? [];

  const entidades: EntidadItem[] = (entidadesRaw ?? []).map(e => ({
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    created_at: e.created_at,
    totalArchivos: archivos.filter(a => a.entidad_id === e.id).length,
    pendientes: archivos.filter(a => a.entidad_id === e.id && a.estado === "pendiente_eliminacion").length,
    totalUsuarios: usuarios.filter(u => u.entidad_id === e.id).length,
  }));

  return <EntidadesView entidades={entidades} rol={perfil.rol} />;
}
