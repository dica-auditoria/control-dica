"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { deleteWasabiFileAction } from "@/app/actions/storage";

export interface InsertArchivoArgs {
  nombre: string;
  ruta_storage: string;
  hash_sha256: string;
  size_bytes: number;
  tipo: string;
  entidad_id: string;
  contrato_id?: string | null;
  destino?: "cliente" | "empleado";
  requerimiento_id?: string | null;
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

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const archivosTable = admin.from("archivos") as any;
  const { data: archivo, error: insertError } = await archivosTable
    .insert({
      nombre: args.nombre,
      ruta_storage: args.ruta_storage,
      hash_sha256: args.hash_sha256,
      size_bytes: args.size_bytes,
      tipo: args.tipo,
      entidad_id: args.entidad_id,
      contrato_id: args.contrato_id ?? null,
      destino: args.destino ?? "cliente",
      requerimiento_id: args.requerimiento_id ?? null,
      subido_por: user.id,
      estado: "activo",
    })
    .select("id")
    .single() as { data: ArchivoIdRow | null; error: unknown };

  if (insertError || !archivo) {
    console.error("insertArchivoAction error:", insertError);
    return { error: "Error al guardar metadatos" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditTable = admin.from("audit_log") as any;
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
  if (args.contrato_id) revalidatePath(`/dashboard/directorio/empresa/${args.entidad_id}/${args.contrato_id}`);

  return { archivoId: archivo.id };
}

// ---------- ARCHIVOS POR CONTRATO ----------

export interface ArchivoContratoItem {
  id: string;
  nombre: string;
  ruta_storage: string;
  tipo: string;
  estado: string;
  size_bytes: number;
  hash_sha256: string;
  created_at: string;
  subido_por_nombre: string | null;
  destino: "cliente" | "empleado";
}

export async function fetchArchivosContratoAction(contratoId: string, destino?: "cliente" | "empleado") {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", data: null };

  interface PerfilRow { rol: string }
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol))
    return { error: "No autorizado", data: null };

  // Use admin client so RLS doesn't block reads for non-admin roles
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (adminClient.from("archivos") as any)
    .select("id, nombre, ruta_storage, tipo, estado, size_bytes, hash_sha256, created_at, destino, usuarios(nombre)")
    .eq("contrato_id", contratoId)
    .neq("estado", "eliminado");
  if (destino) q = q.eq("destino", destino);
  const { data, error } = await q.order("created_at", { ascending: false }) as {
    data: Array<{ id: string; nombre: string; ruta_storage: string; tipo: string; estado: string; size_bytes: number; hash_sha256: string; created_at: string; destino: string; usuarios: { nombre: string } | null }> | null;
    error: unknown;
  };

  if (error) return { error: "Error al cargar archivos", data: null };

  const items: ArchivoContratoItem[] = (data ?? []).map(a => ({
    id: a.id,
    nombre: a.nombre,
    ruta_storage: a.ruta_storage,
    tipo: a.tipo,
    estado: a.estado,
    size_bytes: a.size_bytes,
    hash_sha256: a.hash_sha256,
    created_at: a.created_at,
    subido_por_nombre: a.usuarios?.nombre ?? null,
    destino: (a.destino ?? "cliente") as "cliente" | "empleado",
  }));

  return { data: items, error: null };
}

// ---------- RENOMBRAR ARCHIVO ----------

export async function renameArchivoAction(archivoId: string, nuevoNombreArchivo: string) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  interface PerfilRow { rol: string }
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: archivo } = await (admin.from("archivos") as any)
    .select("id, nombre, entidad_id, contrato_id")
    .eq("id", archivoId)
    .single() as { data: { id: string; nombre: string; entidad_id: string; contrato_id: string | null } | null; error: unknown };

  if (!archivo) return { error: "Archivo no encontrado" };

  // Preserve folder path, only change the filename (last segment)
  const parts = archivo.nombre.split("/");
  parts[parts.length - 1] = nuevoNombreArchivo.replace(/[/\\]/g, "_");
  const nuevoNombre = parts.join("/");

  const { error: updateError } = await (admin.from("archivos") as any)
    .update({ nombre: nuevoNombre })
    .eq("id", archivoId);

  if (updateError) return { error: "Error al renombrar" };

  revalidatePath("/dashboard/directorio");
  if (archivo.contrato_id)
    revalidatePath(`/dashboard/directorio/empresa/${archivo.entidad_id}/${archivo.contrato_id}`);

  return { success: true };
}

// ---------- ELIMINAR ARCHIVO ----------

interface ArchivoStorageRow { id: string; ruta_storage: string; nombre: string; entidad_id: string; contrato_id: string | null }

export async function deleteArchivoAction(archivoId: string) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  interface PerfilRow { rol: string }
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: archivo } = await (admin.from("archivos") as any)
    .select("id, ruta_storage, nombre, entidad_id, contrato_id")
    .eq("id", archivoId)
    .single() as { data: ArchivoStorageRow | null; error: unknown };

  if (!archivo) return { error: "Archivo no encontrado" };

  if (archivo.ruta_storage !== "virtual") {
    await deleteWasabiFileAction(archivo.ruta_storage);
  }

  await (admin.from("archivos") as any).delete().eq("id", archivoId);

  await (admin.from("audit_log") as any).insert({
    usuario_id: user.id,
    entidad_id: archivo.entidad_id,
    accion: "APPROVE_DELETE",
    recurso_id: archivoId,
    detalle_json: { nombre: archivo.nombre },
  });

  revalidatePath("/dashboard/directorio");
  if (archivo.contrato_id)
    revalidatePath(`/dashboard/directorio/empresa/${archivo.entidad_id}/${archivo.contrato_id}`);

  return { success: true };
}

// ---------- MOVER ARCHIVO ----------

export async function moveArchivoAction(archivoId: string, nuevaCarpeta: string) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  interface PerfilRow2 { rol: string }
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow2 | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: archivo } = await (admin.from("archivos") as any)
    .select("id, nombre, entidad_id, contrato_id")
    .eq("id", archivoId)
    .single() as { data: { id: string; nombre: string; entidad_id: string; contrato_id: string | null } | null; error: unknown };

  if (!archivo) return { error: "Archivo no encontrado" };

  const filename = archivo.nombre.split("/").pop()!;
  const nuevoNombre = nuevaCarpeta ? `${nuevaCarpeta}/${filename}` : filename;
  await (admin.from("archivos") as any).update({ nombre: nuevoNombre }).eq("id", archivoId);

  revalidatePath("/dashboard/directorio");
  if (archivo.contrato_id)
    revalidatePath(`/dashboard/directorio/empresa/${archivo.entidad_id}/${archivo.contrato_id}`);

  return { success: true };
}

// ---------- CREAR CARPETA VIRTUAL ----------

export async function crearCarpetaAction(args: {
  carpetaPath: string;
  entidadId: string;
  contratoId?: string | null;
  destino?: "cliente" | "empleado";
}) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  interface PerfilRowC { rol: string }
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRowC | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { error: "No autorizado" };

  const admin = createAdminClient();
  const nombre = `${args.carpetaPath.trim().replace(/\/+$/, "")}/.keep`;

  // Check if folder already exists (any archivo with that prefix)
  const { data: existing } = await (admin.from("archivos") as any)
    .select("id").eq("nombre", nombre).eq("contrato_id", args.contratoId ?? null).limit(1) as { data: { id: string }[] | null; error: unknown };
  if (existing?.length) return { error: "La carpeta ya existe" };

  const { error: insertError } = await (admin.from("archivos") as any).insert({
    nombre,
    ruta_storage: "virtual",
    hash_sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    size_bytes: 0,
    tipo: "carpeta",
    entidad_id: args.entidadId,
    contrato_id: args.contratoId ?? null,
    destino: args.destino ?? "cliente",
    subido_por: user.id,
    estado: "activo",
  });

  if (insertError) return { error: "Error al crear carpeta" };

  revalidatePath("/dashboard/directorio");
  if (args.contratoId)
    revalidatePath(`/dashboard/directorio/empresa/${args.entidadId}/${args.contratoId}`);

  return { success: true };
}

// ---------- ELIMINAR MÚLTIPLES ARCHIVOS ----------

export async function bulkDeleteArchivosAction(archivoIds: string[]) {
  if (!archivoIds.length) return { success: true, deleted: 0 };

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  interface PerfilRow3 { rol: string }
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow3 | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: archivos } = await (admin.from("archivos") as any)
    .select("id, ruta_storage, nombre, entidad_id, contrato_id")
    .in("id", archivoIds) as { data: ArchivoStorageRow[] | null; error: unknown };

  if (!archivos?.length) return { error: "Archivos no encontrados" };

  await Promise.all(archivos.filter(a => a.ruta_storage !== "virtual").map(a => deleteWasabiFileAction(a.ruta_storage)));
  await (admin.from("archivos") as any).delete().in("id", archivoIds);

  const entidadId = archivos[0].entidad_id;
  const contratoId = archivos[0].contrato_id;
  await (admin.from("audit_log") as any).insert({
    usuario_id: user.id,
    entidad_id: entidadId,
    accion: "APPROVE_DELETE",
    detalle_json: { ids: archivoIds, cantidad: archivoIds.length },
  });

  revalidatePath("/dashboard/directorio");
  if (contratoId)
    revalidatePath(`/dashboard/directorio/empresa/${entidadId}/${contratoId}`);

  return { success: true, deleted: archivoIds.length };
}
