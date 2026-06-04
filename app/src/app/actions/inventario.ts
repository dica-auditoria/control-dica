"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  CrearActivoInput, InventarioActivo, AsignacionActivo,
  InventarioCategoria, ActivoLogEntry, ActivoArchivo,
} from "@/types/inventario";

interface PerfilRow { id: string; rol: string; nombre: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  insert: (...args: unknown[]) => DbQuery;
  update: (...args: unknown[]) => DbQuery;
  delete: (...args: unknown[]) => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  in: (...args: unknown[]) => DbQuery;
  order: (...args: unknown[]) => DbQuery;
  limit: (...args: unknown[]) => DbQuery;
  single: () => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, userName: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("id, rol, nombre").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { supabase: null, userId: null, userName: null, error: "No autorizado" };
  return { supabase, userId: perfil.id, userName: perfil.nombre, error: null };
}

async function logActivo(
  supabase: SupabaseServer,
  activoId: string,
  userId: string | null,
  accion: string,
  detalle?: Record<string, unknown>
) {
  await db(supabase, "inventario_activo_log").insert({
    activo_id: activoId, usuario_id: userId, accion, detalle: detalle ?? null,
  });
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function fetchCategoriasAction() {
  const supabase = createClient();
  const { data } = await supabase.from("inventario_categorias").select("id, nombre, icono").order("nombre") as { data: InventarioCategoria[] | null };
  return data ?? [];
}

// ─── Activos — listar ─────────────────────────────────────────────────────────

export async function fetchActivosSimpleAction(opts?: { estado?: string; categoriaId?: string }) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null, categorias: [] as InventarioCategoria[] };

  let query = db(supabase, "inventario_activos")
    .select(`id, nombre, marca, modelo, numero_serie, numero_activo, descripcion,
      fecha_registro, condicion, sistema_operativo, tipo_adquisicion, ubicacion_id,
      observaciones_fisicas, estado, notas, created_at, categoria_id,
      inventario_categorias(nombre, icono),
      ubicaciones(nombre)`)
    .order("created_at", { ascending: false });

  if (opts?.estado && opts.estado !== "todos") query = query.eq("estado", opts.estado);
  if (opts?.categoriaId && opts.categoriaId !== "todos") query = query.eq("categoria_id", opts.categoriaId);

  const { data: activosRaw, error } = await query as { data: Array<Record<string, unknown>> | null; error: unknown };
  if (error) return { error: "Error al cargar inventario", data: null, categorias: [] };

  const activoIds = (activosRaw ?? []).map(a => a.id as string);
  const { data: asigRaw } = activoIds.length
    ? await db(supabase, "inventario_asignaciones")
        .select("id, activo_id, empleado_id, fecha_asignacion, empleados(nombres, apellido_paterno)")
        .in("activo_id", activoIds).eq("activa", true) as { data: Array<Record<string, unknown>> | null }
    : { data: [] };

  const asigMap = new Map<string, { id: string; empleado_id: string; empleado_nombre: string; fecha: string }>();
  for (const a of (asigRaw ?? []) as Array<Record<string, unknown>>) {
    const emp = a.empleados as { nombres: string; apellido_paterno: string } | null;
    asigMap.set(a.activo_id as string, {
      id: a.id as string,
      empleado_id: a.empleado_id as string,
      empleado_nombre: emp ? `${emp.nombres} ${emp.apellido_paterno}` : "—",
      fecha: a.fecha_asignacion as string,
    });
  }

  const data: InventarioActivo[] = (activosRaw ?? []).map(a => {
    const cat = a.inventario_categorias as { nombre: string; icono: string } | null;
    const ub  = a.ubicaciones as { nombre: string } | null;
    const asig = asigMap.get(a.id as string);
    return {
      id: a.id as string,
      categoria_id: (a.categoria_id as string) ?? null,
      categoria_nombre: cat?.nombre ?? null,
      categoria_icono: cat?.icono ?? null,
      nombre: a.nombre as string,
      marca: (a.marca as string) ?? null,
      modelo: (a.modelo as string) ?? null,
      numero_serie: (a.numero_serie as string) ?? null,
      numero_activo: (a.numero_activo as string) ?? null,
      descripcion: (a.descripcion as string) ?? null,
      fecha_registro: (a.fecha_registro as string) ?? null,
      condicion: (a.condicion as InventarioActivo["condicion"]) ?? null,
      sistema_operativo: (a.sistema_operativo as string) ?? null,
      tipo_adquisicion: (a.tipo_adquisicion as InventarioActivo["tipo_adquisicion"]) ?? null,
      ubicacion_id: (a.ubicacion_id as string) ?? null,
      ubicacion_nombre: ub?.nombre ?? null,
      observaciones_fisicas: (a.observaciones_fisicas as string) ?? null,
      estado: a.estado as InventarioActivo["estado"],
      notas: (a.notas as string) ?? null,
      created_at: a.created_at as string,
      asignacion_id: asig?.id ?? null,
      empleado_id: asig?.empleado_id ?? null,
      empleado_nombre: asig?.empleado_nombre ?? null,
      fecha_asignacion: asig?.fecha ?? null,
    };
  });

  const categorias = await fetchCategoriasAction();
  return { data, error: null, categorias };
}

// ─── Crear ────────────────────────────────────────────────────────────────────

export async function crearActivoAction(input: CrearActivoInput) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const { count } = await supabase.from("inventario_activos").select("*", { count: "exact", head: true });
  const numero_activo = input.numero_activo?.trim() || `ACT-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await db(supabase, "inventario_activos")
    .insert({
      categoria_id: input.categoria_id || null,
      nombre: input.nombre.trim(),
      marca: input.marca?.trim() || null,
      modelo: input.modelo?.trim() || null,
      numero_serie: input.numero_serie?.trim() || null,
      numero_activo,
      descripcion: input.descripcion?.trim() || null,
      fecha_registro: input.fecha_registro || null,
      condicion: input.condicion || "bueno",
      sistema_operativo: input.sistema_operativo?.trim() || null,
      tipo_adquisicion: input.tipo_adquisicion || "propio",
      ubicacion_id: input.ubicacion_id || null,
      observaciones_fisicas: input.observaciones_fisicas?.trim() || null,
      notas: input.notas?.trim() || null,
      estado: input.asignar_empleado_id ? "asignado" : "disponible",
    })
    .select("id").single() as { data: { id: string } | null; error: unknown };

  if (error) return { error: "Error al crear el activo" };
  const id = (data as { id: string }).id;

  await logActivo(supabase, id, userId, "REGISTRO", { numero_activo });

  // Asignación inmediata si se indicó
  if (input.asignar_empleado_id) {
    await db(supabase, "inventario_asignaciones").insert({
      activo_id: id,
      empleado_id: input.asignar_empleado_id,
      fecha_asignacion: new Date().toISOString().split("T")[0],
      activa: true,
      notas: input.asignar_notas?.trim() || null,
    });
    await logActivo(supabase, id, userId, "ASIGNACIÓN", { empleado_id: input.asignar_empleado_id });
  }

  revalidatePath("/dashboard/inventario");
  return { id };
}

// ─── Actualizar ───────────────────────────────────────────────────────────────

export async function actualizarActivoAction(id: string, input: Partial<CrearActivoInput> & { estado?: string }) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const payload: Record<string, unknown> = {};
  const map: Array<[keyof typeof input, string]> = [
    ["categoria_id","categoria_id"],["nombre","nombre"],["marca","marca"],["modelo","modelo"],
    ["numero_serie","numero_serie"],["numero_activo","numero_activo"],["descripcion","descripcion"],
    ["fecha_registro","fecha_registro"],["condicion","condicion"],["sistema_operativo","sistema_operativo"],
    ["tipo_adquisicion","tipo_adquisicion"],["ubicacion_id","ubicacion_id"],
    ["observaciones_fisicas","observaciones_fisicas"],["notas","notas"],["estado","estado"],
  ];
  for (const [k, col] of map) {
    if (input[k] !== undefined) payload[col] = typeof input[k] === "string" ? (input[k] as string).trim() || null : input[k];
  }

  const { error } = await db(supabase, "inventario_activos").update(payload).eq("id", id) as { error: unknown };
  if (error) return { error: "Error al actualizar" };

  await logActivo(supabase, id, userId, "ACTUALIZACIÓN", payload);
  revalidatePath("/dashboard/inventario");
  return { success: true };
}

// ─── Asignar / Devolver ───────────────────────────────────────────────────────

export async function asignarActivoAction(activoId: string, empleadoId: string, notas?: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  await db(supabase, "inventario_asignaciones")
    .update({ activa: false, fecha_devolucion: new Date().toISOString().split("T")[0] })
    .eq("activo_id", activoId).eq("activa", true);

  await db(supabase, "inventario_asignaciones").insert({
    activo_id: activoId, empleado_id: empleadoId,
    fecha_asignacion: new Date().toISOString().split("T")[0],
    activa: true, notas: notas?.trim() || null,
  });
  await db(supabase, "inventario_activos").update({ estado: "asignado" }).eq("id", activoId);
  await logActivo(supabase, activoId, userId, "ASIGNACIÓN", { empleado_id: empleadoId });

  revalidatePath("/dashboard/inventario");
  return { success: true };
}

export async function devolverActivoAction(asignacionId: string, activoId: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  await db(supabase, "inventario_asignaciones")
    .update({ activa: false, fecha_devolucion: new Date().toISOString().split("T")[0] })
    .eq("id", asignacionId);
  await db(supabase, "inventario_activos").update({ estado: "disponible" }).eq("id", activoId);
  await logActivo(supabase, activoId, userId, "DEVOLUCIÓN");

  revalidatePath("/dashboard/inventario");
  return { success: true };
}

export async function eliminarActivoAction(id: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };
  await db(supabase, "inventario_activos").delete().eq("id", id);
  revalidatePath("/dashboard/inventario");
  return { success: true };
}

// ─── Log ──────────────────────────────────────────────────────────────────────

export async function fetchLogActivoAction(activoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data } = await db(supabase, "inventario_activo_log")
    .select("id, accion, detalle, created_at, usuarios(nombre)")
    .eq("activo_id", activoId)
    .order("created_at", { ascending: false })
    .limit(50) as { data: Array<Record<string, unknown>> | null };

  const entries: ActivoLogEntry[] = (data ?? []).map(r => ({
    id: r.id as string,
    accion: r.accion as string,
    detalle: (r.detalle as Record<string, unknown>) ?? null,
    usuario_nombre: ((r.usuarios as { nombre: string } | null)?.nombre) ?? null,
    created_at: r.created_at as string,
  }));
  return { data: entries, error: null };
}

// ─── Archivos ─────────────────────────────────────────────────────────────────

const BUCKET = "inventario-archivos";

export async function fetchArchivosActivoAction(activoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data } = await db(supabase, "inventario_activo_archivos")
    .select("id, tipo, nombre, ruta, created_at")
    .eq("activo_id", activoId)
    .order("created_at") as { data: ActivoArchivo[] | null };

  return { data: data ?? [], error: null };
}

export async function agregarArchivoActivoAction(activoId: string, tipo: "foto" | "documento", nombre: string, ruta: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const { data, error } = await db(supabase, "inventario_activo_archivos")
    .insert({ activo_id: activoId, tipo, nombre, ruta })
    .select("id, tipo, nombre, ruta, created_at").single() as { data: ActivoArchivo | null; error: unknown };

  if (error) return { error: "Error al guardar archivo" };
  await logActivo(supabase, activoId, userId, tipo === "foto" ? "FOTO_AGREGADA" : "DOCUMENTO_AGREGADO", { nombre });
  return { data, error: null };
}

export async function eliminarArchivoActivoAction(archivoId: string, activoId: string, ruta: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  await supabase.storage.from(BUCKET).remove([ruta]);
  await db(supabase, "inventario_activo_archivos").delete().eq("id", archivoId);
  await logActivo(supabase, activoId, userId, "ARCHIVO_ELIMINADO", { ruta });
  return { success: true };
}

export async function getArchivoUrlAction(ruta: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, url: null };

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 120);
  if (error || !data?.signedUrl) return { error: "No se pudo generar el enlace", url: null };
  return { url: data.signedUrl, error: null };
}

// ─── Activos de un empleado ───────────────────────────────────────────────────

export async function fetchActivosEmpleadoAction(empleadoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data, error } = await db(supabase, "inventario_asignaciones")
    .select(`id, fecha_asignacion, notas,
      inventario_activos(id, nombre, marca, modelo, numero_serie, numero_activo, estado,
        inventario_categorias(nombre, icono))`)
    .eq("empleado_id", empleadoId).eq("activa", true)
    .order("fecha_asignacion", { ascending: false }) as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) return { error: "Error al cargar activos", data: null };

  const result: AsignacionActivo[] = (data ?? []).map(a => {
    const activo = a.inventario_activos as Record<string, unknown> | null;
    const cat = activo?.inventario_categorias as { nombre: string; icono: string } | null;
    return {
      id: a.id as string, activo_id: activo?.id as string ?? "",
      activo_nombre: activo?.nombre as string ?? "—",
      categoria_nombre: cat?.nombre ?? null, categoria_icono: cat?.icono ?? null,
      marca: (activo?.marca as string) ?? null, modelo: (activo?.modelo as string) ?? null,
      numero_serie: (activo?.numero_serie as string) ?? null, numero_activo: (activo?.numero_activo as string) ?? null,
      fecha_asignacion: a.fecha_asignacion as string, notas: (a.notas as string) ?? null,
    };
  });
  return { data: result, error: null };
}
