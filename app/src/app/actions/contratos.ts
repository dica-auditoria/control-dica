"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CrearContratoInput, ActualizarContratoInput, Contrato } from "@/types/contratos";

interface PerfilRow { rol: string }

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol))
    return { supabase: null, userId: null, error: "Acción no autorizada" };

  return { supabase, userId: user.id, error: null };
}

async function logContrato(userId: string, accion: string, contratoId: string, entidadId: string, detalle?: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("audit_log") as any).insert({
      usuario_id: userId,
      entidad_id: entidadId,
      accion,
      recurso_id: contratoId,
      detalle_json: detalle ?? {},
    });
  } catch { /* non-critical */ }
}

function revalidateClientes(entidadId?: string) {
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/directorio");
  if (entidadId) {
    revalidatePath(`/dashboard/clientes/${entidadId}`);
    revalidatePath(`/dashboard/directorio/empresa/${entidadId}`);
  }
}

// ---------- LISTAR CONTRATOS DE UNA ENTIDAD ----------

export async function fetchContratosAction(entidadId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("contratos") as any)
    .select("*")
    .eq("entidad_id", entidadId)
    .order("created_at", { ascending: false }) as { data: Contrato[] | null; error: unknown };

  if (error) return { error: "Error al cargar contratos", data: null };
  return { data: data ?? [], error: null };
}

// ---------- CREAR CONTRATO ----------

export async function crearContratoAction(input: CrearContratoInput) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  const payload = {
    entidad_id: input.entidad_id,
    nombre: input.nombre.trim(),
    numero_contrato: input.numero_contrato?.trim() || null,
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin || null,
    estado: input.estado,
    calle: input.calle?.trim() || null,
    numero_exterior: input.numero_exterior?.trim() || null,
    numero_interior: input.numero_interior?.trim() || null,
    colonia: input.colonia?.trim() || null,
    municipio: input.municipio?.trim() || null,
    estado_republica: input.estado_republica?.trim() || null,
    cp: input.cp?.trim() || null,
    referencias: input.referencias?.trim() || null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("contratos") as any)
    .insert(payload)
    .select("*")
    .single() as { data: Contrato | null; error: { message?: string } | null };

  if (error) return { error: error.message ?? "Error al crear el contrato" };

  if (data) await logContrato(userId, "CONTRATO_CREAR", data.id, input.entidad_id, { nombre: data.nombre });
  revalidateClientes(input.entidad_id);
  return { contrato: data };
}

// ---------- ACTUALIZAR CONTRATO ----------

export async function actualizarContratoAction(input: ActualizarContratoInput) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  const { id, ...rest } = input;
  const payload: Record<string, unknown> = {};

  if (rest.nombre !== undefined)           payload.nombre            = rest.nombre.trim();
  if (rest.numero_contrato !== undefined)  payload.numero_contrato   = rest.numero_contrato?.trim() || null;
  if (rest.fecha_inicio !== undefined)     payload.fecha_inicio      = rest.fecha_inicio;
  if (rest.fecha_fin !== undefined)        payload.fecha_fin         = rest.fecha_fin || null;
  if (rest.estado !== undefined)           payload.estado            = rest.estado;
  if (rest.calle !== undefined)            payload.calle             = rest.calle?.trim() || null;
  if (rest.numero_exterior !== undefined)  payload.numero_exterior   = rest.numero_exterior?.trim() || null;
  if (rest.numero_interior !== undefined)  payload.numero_interior   = rest.numero_interior?.trim() || null;
  if (rest.colonia !== undefined)          payload.colonia           = rest.colonia?.trim() || null;
  if (rest.municipio !== undefined)        payload.municipio         = rest.municipio?.trim() || null;
  if (rest.estado_republica !== undefined) payload.estado_republica  = rest.estado_republica?.trim() || null;
  if (rest.cp !== undefined)               payload.cp                = rest.cp?.trim() || null;
  if (rest.referencias !== undefined)      payload.referencias       = rest.referencias?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("contratos") as any)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single() as { data: Contrato | null; error: unknown };

  if (error) return { error: "Error al actualizar el contrato" };

  if (data) {
    await logContrato(userId, "CONTRATO_ACTUALIZAR", data.id, data.entidad_id, { nombre: data.nombre });
    revalidateClientes(data.entidad_id);
  }
  return { contrato: data };
}

// ---------- ELIMINAR CONTRATO ----------

export async function eliminarContratoAction(id: string, entidadId: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("contratos") as any)
    .delete()
    .eq("id", id) as { error: unknown };

  if (error) return { error: "Error al eliminar el contrato" };

  await logContrato(userId, "CONTRATO_ELIMINAR", id, entidadId);
  revalidateClientes(entidadId);
  return { success: true };
}

// ---------- FETCH USUARIOS DE ENTIDAD ----------

export interface UsuarioAcceso {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  created_at: string;
}

export async function fetchUsuariosEntidadAction(entidadId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol, created_at")
    .eq("entidad_id", entidadId)
    .order("nombre") as { data: UsuarioAcceso[] | null; error: unknown };

  if (error) return { error: "Error al cargar usuarios", data: null };
  return { data: data ?? [], error: null };
}

// ---------- FETCH CLIENTE CON CONTRATOS ----------

export async function fetchClienteConContratosAction(entidadId: string) {
  const { error: authErr } = await verificarAdmin();
  if (authErr) return { error: authErr, data: null };

  const admin = createAdminClient();

  interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entidad, error: eErr } = await (admin.from("entidades") as any)
    .select("id, nombre, activo, created_at")
    .eq("id", entidadId)
    .single() as { data: EntidadRow | null; error: unknown };

  if (eErr || !entidad) return { error: "Cliente no encontrado", data: null };

  const [rContratos, { count: totalArchivos }, { count: totalUsuarios }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("contratos") as any)
      .select("*")
      .eq("entidad_id", entidadId)
      .order("created_at", { ascending: false }) as Promise<{ data: Contrato[] | null; error: unknown }>,
    admin
      .from("archivos")
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", entidadId)
      .neq("estado", "eliminado"),
    admin
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", entidadId),
  ]);

  return {
    error: null,
    data: {
      ...entidad,
      contratos: rContratos.data ?? [],
      totalArchivos: totalArchivos ?? 0,
      totalUsuarios: totalUsuarios ?? 0,
    },
  };
}
