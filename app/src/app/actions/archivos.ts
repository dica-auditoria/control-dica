"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface InsertArchivoArgs {
  nombre: string;
  ruta_storage: string;
  hash_sha256: string;
  size_bytes: number;
  tipo: string;
  entidad_id: string;
}

interface PerfilRow { entidad_id: string | null; rol: string }
interface ArchivoIdRow { id: string }

export async function insertArchivoAction(args: InsertArchivoArgs) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("entidad_id, rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) return { error: "Perfil no encontrado" };

  if (perfil.rol === "cliente" && perfil.entidad_id !== args.entidad_id) {
    return { error: "No autorizado" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const archivosTable = supabase.from("archivos") as any;
  const { data: archivo, error: insertError } = await archivosTable
    .insert({
      nombre: args.nombre,
      ruta_storage: args.ruta_storage,
      hash_sha256: args.hash_sha256,
      size_bytes: args.size_bytes,
      tipo: args.tipo,
      entidad_id: args.entidad_id,
      subido_por: user.id,
      estado: "activo",
    })
    .select("id")
    .single() as { data: ArchivoIdRow | null; error: unknown };

  if (insertError || !archivo) return { error: "Error al guardar metadatos" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditTable = supabase.from("audit_log") as any;
  await auditTable.insert({
    usuario_id: user.id,
    entidad_id: args.entidad_id,
    accion: "UPLOAD",
    recurso_id: archivo.id,
    detalle_json: {
      nombre: args.nombre,
      hash_sha256: args.hash_sha256,
      size_bytes: args.size_bytes,
      tipo: args.tipo,
    },
  });

  revalidatePath("/dashboard/archivos");
  revalidatePath("/dashboard");

  return { archivoId: archivo.id };
}
