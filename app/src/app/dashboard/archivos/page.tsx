import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArchivosView, { type ArchivoItem } from "@/components/archivos/ArchivosView";

interface RawArchivo {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  size_bytes: number;
  hash_sha256: string;
  created_at: string;
  entidades: { nombre: string } | null;
  uploader: { nombre: string } | null;
}

interface PerfilRow {
  rol: string;
  entidad_id: string | null;
}

export default async function ArchivosPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, entidad_id")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  const isAdmin = perfil.rol === "admin" || perfil.rol === "superadmin";

  let query = supabase
    .from("archivos")
    .select(`
      id, nombre, tipo, estado, size_bytes, hash_sha256, created_at,
      entidades ( nombre ),
      uploader:usuarios!archivos_subido_por_fkey ( nombre )
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("entidad_id", perfil.entidad_id!);
  }

  const { data: raw } = await query as { data: RawArchivo[] | null; error: unknown };

  const archivos: ArchivoItem[] = (raw ?? []).map(f => ({
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    estado: f.estado,
    size_bytes: f.size_bytes,
    hash_sha256: f.hash_sha256,
    created_at: f.created_at,
    entidad_nombre: f.entidades?.nombre ?? null,
    subido_por_nombre: f.uploader?.nombre ?? null,
  }));

  return (
    <ArchivosView
      archivos={archivos}
      entidadId={perfil.entidad_id ?? ""}
      rol={perfil.rol}
    />
  );
}
