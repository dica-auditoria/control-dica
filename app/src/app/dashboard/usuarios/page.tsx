import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsuariosView, { type UsuarioItem, type EntidadOpcion } from "@/components/usuarios/UsuariosView";

interface PerfilRow { rol: string }

interface UsuarioRaw {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  entidad_id: string | null;
  created_at: string;
  entidades: { nombre: string } | null;
}

export default async function UsuariosPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) redirect("/dashboard");

  const [rUsuarios, rEntidades] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, email, rol, entidad_id, created_at, entidades(nombre)")
      .order("created_at", { ascending: false }),
    supabase
      .from("entidades")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre"),
  ]);

  const usuarios: UsuarioItem[] = ((rUsuarios.data ?? []) as UsuarioRaw[]).map(u => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    entidad_id: u.entidad_id,
    entidad_nombre: u.entidades?.nombre ?? null,
    created_at: u.created_at,
  }));

  const entidades: EntidadOpcion[] = ((rEntidades.data ?? []) as EntidadOpcion[]);

  return <UsuariosView usuarios={usuarios} entidades={entidades} rolActual={perfil.rol} />;
}
