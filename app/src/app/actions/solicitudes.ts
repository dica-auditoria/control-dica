"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PATHS = ["/dashboard", "/dashboard/archivos", "/dashboard/solicitudes"];

// ---------- CREAR (cliente) ----------

export async function crearSolicitudAction(archivoId: string, motivo: string) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("crear_solicitud_eliminacion", {
    p_archivo_id: archivoId,
    p_motivo: motivo.trim(),
  }) as { data: string | null; error: { message?: string } | null };

  if (error) return { error: error.message ?? "Error al crear la solicitud" };

  PATHS.forEach(p => revalidatePath(p));
  return { solicitudId: data };
}

// ---------- APROBAR (admin) ----------

interface SolicitudAprobar {
  archivos: { id: string; ruta_storage: string; entidad_id: string } | null;
}

export async function aprobarSolicitudAction(solicitudId: string) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  const { data: sol } = await supabase
    .from("solicitudes_eliminacion")
    .select("archivos(id, ruta_storage, entidad_id)")
    .eq("id", solicitudId)
    .eq("estado", "pendiente")
    .single() as { data: SolicitudAprobar | null; error: unknown };

  if (!sol?.archivos) return { error: "Solicitud no encontrada o ya procesada" };

  const archivo = sol.archivos;
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("solicitudes_eliminacion") as any)
    .update({ estado: "aprobado", revisado_por: user.id, revisado_at: now })
    .eq("id", solicitudId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("archivos") as any)
    .update({ estado: "eliminado" })
    .eq("id", archivo.id);

  await supabase.storage.from("documentos").remove([archivo.ruta_storage]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("audit_log") as any).insert({
    usuario_id: user.id,
    entidad_id: archivo.entidad_id,
    accion: "APPROVE_DELETE",
    recurso_id: archivo.id,
    detalle_json: { solicitud_id: solicitudId },
  });

  PATHS.forEach(p => revalidatePath(p));
  return { success: true };
}

// ---------- RECHAZAR (admin) ----------

interface SolicitudRechazar {
  archivos: { id: string; entidad_id: string } | null;
}

export async function rechazarSolicitudAction(solicitudId: string) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado" };

  const { data: sol } = await supabase
    .from("solicitudes_eliminacion")
    .select("archivos(id, entidad_id)")
    .eq("id", solicitudId)
    .eq("estado", "pendiente")
    .single() as { data: SolicitudRechazar | null; error: unknown };

  if (!sol?.archivos) return { error: "Solicitud no encontrada o ya procesada" };

  const archivo = sol.archivos;
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("solicitudes_eliminacion") as any)
    .update({ estado: "rechazado", revisado_por: user.id, revisado_at: now })
    .eq("id", solicitudId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("archivos") as any)
    .update({ estado: "activo" })
    .eq("id", archivo.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("audit_log") as any).insert({
    usuario_id: user.id,
    entidad_id: archivo.entidad_id,
    accion: "REJECT_DELETE",
    recurso_id: archivo.id,
    detalle_json: { solicitud_id: solicitudId },
  });

  PATHS.forEach(p => revalidatePath(p));
  return { success: true };
}
