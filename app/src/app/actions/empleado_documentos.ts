"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EmpleadoDocumento } from "@/types/empleados";

interface PerfilRow { rol: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  insert: (...args: unknown[]) => DbQuery;
  delete: () => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  single: () => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { supabase: null, error: "No autorizado" };
  return { supabase, error: null };
}

// ─── Agregar registro de documento ───────────────────────────────────────────

export async function agregarDocumentoEmpleadoAction(
  empleadoId: string,
  input: {
    nombre: string;
    numero_documento?: string | null;
    fecha_vencimiento?: string | null;
    ruta_archivo?: string | null;
  }
) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  // Calcular estado inicial
  let estado = "vigente";
  if (input.fecha_vencimiento) {
    const days = Math.floor((new Date(input.fecha_vencimiento).getTime() - Date.now()) / 86400000);
    if (days < 0) estado = "vencido";
    else if (days <= 30) estado = "por_vencer";
  }

  const { data, error } = await db(supabase, "empleado_documentos")
    .insert({
      empleado_id:      empleadoId,
      tipo:             input.nombre,
      nombre:           input.nombre,
      numero_documento: input.numero_documento?.trim() || null,
      fecha_vencimiento: input.fecha_vencimiento || null,
      ruta_archivo:     input.ruta_archivo || null,
      estado,
    })
    .select("id, tipo, nombre, numero_documento, fecha_vencimiento, estado, ruta_archivo")
    .single() as { data: EmpleadoDocumento | null; error: { message?: string } | null };

  if (error) return { error: "Error al guardar el documento" };

  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { documento: data };
}

// ─── Eliminar documento ───────────────────────────────────────────────────────

export async function eliminarDocumentoEmpleadoAction(
  documentoId: string,
  empleadoId: string,
  ruta: string | null
) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  // Borrar archivo de storage si existe
  if (ruta) {
    await supabase.storage.from("empleado-docs").remove([ruta]);
  }

  const { error } = await db(supabase, "empleado_documentos")
    .delete().eq("id", documentoId) as { error: unknown };

  if (error) return { error: "Error al eliminar el documento" };

  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { success: true };
}

// ─── Obtener URL firmada para descarga ────────────────────────────────────────

export async function getDocumentoUrlAction(ruta: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, url: null };

  const { data, error } = await supabase.storage
    .from("empleado-docs")
    .createSignedUrl(ruta, 60); // 60 segundos

  if (error || !data?.signedUrl) return { error: "No se pudo generar el enlace", url: null };
  return { url: data.signedUrl, error: null };
}
