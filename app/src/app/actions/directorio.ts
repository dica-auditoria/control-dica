"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CrearUbicacionInput, Ubicacion } from "@/types/directorio";

interface PerfilRow { rol: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  delete: () => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) {
    return { supabase: null, error: "Acción no autorizada" };
  }
  return { supabase, error: null };
}

function mapRow(row: Record<string, unknown>): Ubicacion {
  return {
    id: row.id as string,
    tipo: row.tipo as Ubicacion["tipo"],
    nombre: row.nombre as string,
    entidad_id: (row.entidad_id as string) ?? null,
    entidad_nombre: ((row.entidades as { nombre: string } | null)?.nombre) ?? null,
    calle: (row.calle as string) ?? null,
    numero_ext: (row.numero_ext as string) ?? null,
    numero_int: (row.numero_int as string) ?? null,
    colonia: (row.colonia as string) ?? null,
    municipio: (row.municipio as string) ?? null,
    estado_dir: (row.estado_dir as string) ?? null,
    cp: (row.cp as string) ?? null,
    pais: (row.pais as string) ?? "México",
    lat: (row.lat as number) ?? null,
    lng: (row.lng as number) ?? null,
    plus_code: (row.plus_code as string) ?? null,
    radio_metros: (row.radio_metros as number) ?? 50,
    telefono: (row.telefono as string) ?? null,
    contacto_nombre: (row.contacto_nombre as string) ?? null,
    contacto_email: (row.contacto_email as string) ?? null,
    notas: (row.notas as string) ?? null,
    activo: Boolean(row.activo),
    created_at: row.created_at as string,
  };
}

// ---------- LISTAR ----------

export async function fetchUbicacionesAction(tipo?: "oficina" | "zona_cliente") {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("ubicaciones") as any)
    .select("*, entidades(nombre)")
    .order("nombre");

  if (tipo) query = query.eq("tipo", tipo);

  const { data, error } = await query as {
    data: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  };

  if (error) return { error: "Error al cargar el directorio", data: null };
  return { data: (data ?? []).map(mapRow), error: null };
}

// ---------- CREAR ----------

export async function crearUbicacionAction(input: CrearUbicacionInput) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const payload: Record<string, unknown> = {
    tipo: input.tipo,
    nombre: input.nombre.trim(),
    entidad_id: input.entidad_id || null,
    calle: input.calle?.trim() || null,
    numero_ext: input.numero_ext?.trim() || null,
    numero_int: input.numero_int?.trim() || null,
    colonia: input.colonia?.trim() || null,
    municipio: input.municipio?.trim() || null,
    estado_dir: input.estado_dir?.trim() || null,
    cp: input.cp?.trim() || null,
    pais: input.pais?.trim() || "México",
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    plus_code: input.plus_code ?? null,
    radio_metros: input.radio_metros ?? 50,
    telefono: input.telefono?.trim() || null,
    contacto_nombre: input.contacto_nombre?.trim() || null,
    contacto_email: input.contacto_email?.trim() || null,
    notas: input.notas?.trim() || null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("ubicaciones") as any)
    .insert(payload)
    .select("id")
    .single() as { data: { id: string } | null; error: { message?: string } | null };

  if (error) return { error: "Error al crear la ubicación" };

  revalidatePath("/dashboard/directorio");
  return { id: data?.id };
}

// ---------- ACTUALIZAR ----------

export async function actualizarUbicacionAction(id: string, input: Partial<CrearUbicacionInput>) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined)        payload.nombre = input.nombre.trim();
  if (input.entidad_id !== undefined)    payload.entidad_id = input.entidad_id || null;
  if (input.calle !== undefined)         payload.calle = input.calle?.trim() || null;
  if (input.numero_ext !== undefined)    payload.numero_ext = input.numero_ext?.trim() || null;
  if (input.numero_int !== undefined)    payload.numero_int = input.numero_int?.trim() || null;
  if (input.colonia !== undefined)       payload.colonia = input.colonia?.trim() || null;
  if (input.municipio !== undefined)     payload.municipio = input.municipio?.trim() || null;
  if (input.estado_dir !== undefined)    payload.estado_dir = input.estado_dir?.trim() || null;
  if (input.cp !== undefined)            payload.cp = input.cp?.trim() || null;
  if (input.pais !== undefined)          payload.pais = input.pais?.trim() || "México";
  if (input.lat !== undefined)           payload.lat = input.lat;
  if (input.lng !== undefined)           payload.lng = input.lng;
  if (input.plus_code !== undefined)     payload.plus_code = input.plus_code;
  if (input.radio_metros !== undefined)  payload.radio_metros = input.radio_metros;
  if (input.telefono !== undefined)      payload.telefono = input.telefono?.trim() || null;
  if (input.contacto_nombre !== undefined) payload.contacto_nombre = input.contacto_nombre?.trim() || null;
  if (input.contacto_email !== undefined)  payload.contacto_email = input.contacto_email?.trim() || null;
  if (input.notas !== undefined)         payload.notas = input.notas?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("ubicaciones") as any).update(payload).eq("id", id);
  if (error) return { error: "Error al actualizar la ubicación" };

  revalidatePath("/dashboard/directorio");
  return { success: true };
}

// ---------- TOGGLE ACTIVO ----------

export async function toggleUbicacionActivoAction(id: string, activo: boolean) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("ubicaciones") as any).update({ activo }).eq("id", id);
  if (error) return { error: "Error al actualizar el estado" };

  revalidatePath("/dashboard/directorio");
  return { success: true };
}

// ---------- ELIMINAR ----------

export async function eliminarUbicacionAction(id: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const { error } = await db(supabase, "ubicaciones").delete().eq("id", id) as { error: unknown };
  if (error) return { error: 'Error al eliminar la ubicación' };

  revalidatePath('/dashboard/directorio');
  return { success: true };
}
