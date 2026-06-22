"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CrearRequerimientoInput, Requerimiento, RequerimientoItem, ItemEstado } from "@/types/requerimientos";
import {
  sendRequerimientoEmail,
  sendDeadlineExtendedEmail,
  sendItemCompletadoEmail,
} from "@/lib/email";

interface PerfilRow { rol: string; entidad_id: string | null }

async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, perfil: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("rol, entidad_id").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil) return { user: null, perfil: null, error: "Perfil no encontrado" };
  return { user, perfil, error: null };
}

function revalidate(entidadId?: string, contratoId?: string) {
  revalidatePath("/dashboard");
  if (entidadId) revalidatePath(`/dashboard/directorio/empresa/${entidadId}`);
  if (contratoId && entidadId) revalidatePath(`/dashboard/directorio/empresa/${entidadId}/${contratoId}`);
}

// ── Helpers to auto-mark vencidos ────────────────────────────────────────────

async function marcarVencidos(admin: ReturnType<typeof createAdminClient>, ids: string[]) {
  if (!ids.length) return;
  const hoy = new Date().toISOString().slice(0, 10);
  await (admin.from("requerimientos") as any)
    .update({ estado: "vencido" })
    .in("id", ids)
    .in("estado", ["pendiente", "en_revision"])
    .lt("fecha_limite", hoy);
}

// ── CREAR REQUERIMIENTO ───────────────────────────────────────────────────────

export async function crearRequerimientoAction(input: CrearRequerimientoInput) {
  const { user, perfil, error: authErr } = await getUser();
  if (authErr || !user || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();

  const { data: req, error: insertErr } = await (admin.from("requerimientos") as any)
    .insert({
      contrato_id: input.contratoId ?? null,
      entidad_id: input.entidadId,
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() ?? null,
      fecha_limite: input.fechaLimite,
      estado: "pendiente",
      creado_por: user.id,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (insertErr || !req) return { error: "Error al crear requerimiento" };

  if (input.items.length) {
    await (admin.from("requerimiento_items") as any).insert(
      input.items.map(item => ({
        requerimiento_id: req.id,
        nombre: item.nombre.trim(),
        descripcion: item.descripcion?.trim() ?? null,
        obligatorio: item.obligatorio,
        completado: false,
        fecha_limite: input.fechaLimite,
      }))
    );
  }

  // Enviar email a usuarios cliente de la entidad
  const { data: usuariosCliente } = await (admin.from("usuarios") as any)
    .select("nombre, email")
    .eq("entidad_id", input.entidadId)
    .eq("rol", "cliente")
    .eq("activo", true) as { data: Array<{ nombre: string; email: string }> | null; error: unknown };

  let contratoNombre: string | null = null;
  if (input.contratoId) {
    const { data: contrato } = await (admin.from("contratos") as any)
      .select("nombre").eq("id", input.contratoId).single() as { data: { nombre: string } | null; error: unknown };
    contratoNombre = contrato?.nombre ?? null;
  }

  for (const u of usuariosCliente ?? []) {
    await sendRequerimientoEmail({
      clienteEmail: u.email,
      clienteNombre: u.nombre,
      titulo: input.titulo.trim(),
      descripcion: input.descripcion ?? null,
      fechaLimite: input.fechaLimite,
      items: input.items.filter(i => i.nombre.trim()),
      contratoNombre,
    });
  }

  revalidate(input.entidadId, input.contratoId);
  return { id: req.id, error: null };
}

// ── FETCH REQUERIMIENTOS (admin — por contrato) ───────────────────────────────

interface RawReq {
  id: string; contrato_id: string | null; entidad_id: string; titulo: string;
  descripcion: string | null; fecha_limite: string; estado: string;
  creado_por: string; notas_cierre: string | null; created_at: string;
  requerimiento_items: Array<{ id: string; requerimiento_id: string; nombre: string; descripcion: string | null; obligatorio: boolean; completado: boolean; estado: string; area: string | null; rubro: string | null; orden: number | null; numero: string | null; fecha_limite: string | null; extendida: boolean; created_at: string }>;
}

export async function fetchRequerimientosContratoAction(contratoId: string): Promise<{ data: Requerimiento[] | null; error: string | null }> {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr, data: null };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado", data: null };

  const admin = createAdminClient();
  const { data, error } = await (admin.from("requerimientos") as any)
    .select("*, requerimiento_items(id, nombre, descripcion, obligatorio, completado, estado, area, rubro, orden, numero, fecha_limite, extendida, created_at)")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: false }) as { data: RawReq[] | null; error: unknown };

  if (error) return { error: "Error al cargar requerimientos", data: null };

  // auto-mark vencidos
  const hoy = new Date().toISOString().slice(0, 10);
  const vencibles = (data ?? []).filter(r => ["pendiente", "en_revision"].includes(r.estado) && r.fecha_limite < hoy).map(r => r.id);
  if (vencibles.length) await marcarVencidos(admin, vencibles);

  const items: Requerimiento[] = (data ?? []).map(r => ({
    ...r,
    estado: (["pendiente", "en_revision"].includes(r.estado) && r.fecha_limite < hoy ? "vencido" : r.estado) as Requerimiento["estado"],
    items: (r.requerimiento_items ?? []).map(i => ({ ...i, estado: (i.estado ?? "pendiente") as ItemEstado, fecha_limite: i.fecha_limite ?? null, extendida: i.extendida ?? false })),
    archivos_count: 0,
  }));

  // fetch archivos counts
  const { data: archCounts } = await (admin.from("archivos") as any)
    .select("requerimiento_id")
    .in("requerimiento_id", items.map(r => r.id))
    .neq("estado", "eliminado") as { data: Array<{ requerimiento_id: string }> | null; error: unknown };

  const countMap: Record<string, number> = {};
  (archCounts ?? []).forEach(a => { countMap[a.requerimiento_id] = (countMap[a.requerimiento_id] ?? 0) + 1; });
  items.forEach(r => { r.archivos_count = countMap[r.id] ?? 0; });

  return { data: items, error: null };
}

// ── FETCH REQUERIMIENTOS (cliente — su entidad, activos) ─────────────────────

export async function fetchRequerimientosClienteAction(): Promise<{ data: Requerimiento[] | null; error: string | null }> {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr, data: null };
  if (!perfil.entidad_id) return { data: [], error: null };

  const supabase = createClient();
  const { data, error } = await (supabase.from("requerimientos") as any)
    .select("*, requerimiento_items(id, nombre, descripcion, obligatorio, completado, estado, area, rubro, orden, numero, fecha_limite, extendida, created_at)")
    .eq("entidad_id", perfil.entidad_id)
    .neq("estado", "completado")
    .order("fecha_limite", { ascending: true }) as { data: RawReq[] | null; error: unknown };

  if (error) return { error: "Error al cargar requerimientos", data: null };

  const hoy = new Date().toISOString().slice(0, 10);
  const items: Requerimiento[] = (data ?? []).map(r => ({
    ...r,
    estado: (["pendiente", "en_revision"].includes(r.estado) && r.fecha_limite < hoy ? "vencido" : r.estado) as Requerimiento["estado"],
    items: (r.requerimiento_items ?? []).map(i => ({ ...i, estado: (i.estado ?? "pendiente") as ItemEstado, fecha_limite: i.fecha_limite ?? null, extendida: i.extendida ?? false })),
    archivos_count: 0,
  }));

  return { data: items, error: null };
}

// ── TOGGLE ITEM COMPLETADO ────────────────────────────────────────────────────

export async function toggleItemCompletoAction(itemId: string, completado: boolean) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();

  if (completado) {
    const { data: item } = await (admin.from("requerimiento_items") as any)
      .select("nombre, requerimiento_id")
      .eq("id", itemId).single() as { data: { nombre: string; requerimiento_id: string } | null; error: unknown };

    await (admin.from("requerimiento_items") as any)
      .update({ completado: true, estado: "completado" })
      .eq("id", itemId);

    if (item) {
      const { data: req } = await (admin.from("requerimientos") as any)
        .select("entidad_id, contrato_id").eq("id", item.requerimiento_id).single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };
      if (req) {
        let contratoNombre: string | null = null;
        if (req.contrato_id) {
          const { data: c } = await (admin.from("contratos") as any)
            .select("nombre").eq("id", req.contrato_id).single() as { data: { nombre: string } | null; error: unknown };
          contratoNombre = c?.nombre ?? null;
        }
        const { data: clientes } = await (admin.from("usuarios") as any)
          .select("email, nombre").eq("entidad_id", req.entidad_id).eq("rol", "cliente").eq("activo", true) as { data: Array<{ email: string; nombre: string }> | null; error: unknown };
        for (const c of clientes ?? []) {
          sendItemCompletadoEmail({ clienteEmail: c.email, clienteNombre: c.nombre, itemNombre: item.nombre, contratoNombre }).catch(() => {});
        }
      }
    }
  } else {
    // Al desmarcar, verificar si tiene archivos para volver a "en_revision" o "pendiente"
    const { count } = await (admin.from("archivos") as any)
      .select("id", { count: "exact", head: true })
      .eq("requerimiento_item_id", itemId)
      .neq("estado", "eliminado") as { count: number | null };

    await (admin.from("requerimiento_items") as any)
      .update({ completado: false, estado: count ? "en_revision" : "pendiente" })
      .eq("id", itemId);
  }

  return { success: true };
}

// ── MARCAR EN REVISIÓN (cliente confirma que subió todo) ──────────────────────

export async function confirmarSubidaAction(requerimientoId: string) {
  const { user, perfil, error: authErr } = await getUser();
  if (authErr || !user || !perfil) return { error: authErr };

  const admin = createAdminClient();
  const { data: req } = await (admin.from("requerimientos") as any)
    .select("id, estado, entidad_id, contrato_id")
    .eq("id", requerimientoId).single() as { data: { id: string; estado: string; entidad_id: string; contrato_id: string | null } | null; error: unknown };

  if (!req) return { error: "Requerimiento no encontrado" };
  if (req.estado === "vencido") return { error: "El plazo venció, contacta a tu asesor" };
  if (req.estado === "completado") return { error: "Ya está cerrado" };

  // Validate entidad for cliente role
  if (perfil.rol === "cliente" && req.entidad_id !== perfil.entidad_id)
    return { error: "No autorizado" };

  await (admin.from("requerimientos") as any).update({ estado: "en_revision" }).eq("id", requerimientoId);
  revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── CERRAR / COMPLETAR (admin) ────────────────────────────────────────────────

export async function cerrarRequerimientoAction(requerimientoId: string, notas?: string) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id").eq("id", requerimientoId).single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };

  await (admin.from("requerimientos") as any).update({
    estado: "completado",
    notas_cierre: notas?.trim() ?? null,
  }).eq("id", requerimientoId);

  if (req) revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── EXTENDER FECHA (admin) ────────────────────────────────────────────────────

export async function extenderFechaAction(requerimientoId: string, nuevaFecha: string) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id, estado").eq("id", requerimientoId).single() as { data: { entidad_id: string; contrato_id: string | null; estado: string } | null; error: unknown };

  const nuevoEstado = req?.estado === "vencido" ? "pendiente" : req?.estado;
  await (admin.from("requerimientos") as any).update({
    fecha_limite: nuevaFecha,
    ...(nuevoEstado ? { estado: nuevoEstado } : {}),
  }).eq("id", requerimientoId);

  if (req) revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── ACTUALIZAR FECHA GLOBAL (todos los reactivos del contrato) ───────────────

export async function actualizarFechaContratoAction(contratoId: string, nuevaFecha: string) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: reqs } = await (admin.from("requerimientos") as any)
    .select("id, estado, entidad_id")
    .eq("contrato_id", contratoId) as { data: Array<{ id: string; estado: string; entidad_id: string }> | null; error: unknown };

  if (!reqs?.length) return { error: "No hay requerimientos en este contrato" };

  const reqIds = reqs.map(r => r.id);
  const entidadId = reqs[0].entidad_id;

  for (const req of reqs) {
    const updates: Record<string, unknown> = { fecha_limite: nuevaFecha };
    if (req.estado === "vencido" && nuevaFecha >= hoy) updates.estado = "pendiente";
    await (admin.from("requerimientos") as any).update(updates).eq("id", req.id);
  }

  await (admin.from("requerimiento_items") as any)
    .update({ fecha_limite: nuevaFecha })
    .in("requerimiento_id", reqIds)
    .neq("estado", "completado");

  revalidate(entidadId, contratoId);
  return { success: true };
}

// ── ELIMINAR REQUERIMIENTO ────────────────────────────────────────────────────

export async function eliminarRequerimientoAction(requerimientoId: string) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (perfil.rol !== "superadmin") return { error: "Solo superadmin puede eliminar" };

  const admin = createAdminClient();
  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id").eq("id", requerimientoId).single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };

  await (admin.from("requerimientos") as any).delete().eq("id", requerimientoId);
  if (req) revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── AGREGAR ITEM INDIVIDUAL AL CONTRATO ──────────────────────────────────────

export async function agregarItemContratoAction(
  contratoId: string,
  entidadId: string,
  item: { nombre: string; rubro?: string; descripcion?: string }
) {
  const { user, perfil, error: authErr } = await getUser();
  if (authErr || !user || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();

  // Obtener o crear el requerimiento base del contrato
  let { data: req } = await (admin.from("requerimientos") as any)
    .select("id, fecha_limite")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single() as { data: { id: string; fecha_limite: string } | null; error: unknown };

  if (!req) {
    const fechaLimite = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const { data: nuevo } = await (admin.from("requerimientos") as any)
      .insert({ contrato_id: contratoId, entidad_id: entidadId, titulo: "Reactivos", fecha_limite: fechaLimite, estado: "pendiente", creado_por: user.id })
      .select("id, fecha_limite").single() as { data: { id: string; fecha_limite: string } | null; error: unknown };
    if (!nuevo) return { error: "Error al crear requerimiento" };
    req = nuevo;
  }

  // Calcular siguiente orden
  const { data: maxOrden } = await (admin.from("requerimiento_items") as any)
    .select("orden")
    .eq("requerimiento_id", req.id)
    .order("orden", { ascending: false })
    .limit(1)
    .single() as { data: { orden: number | null } | null; error: unknown };

  const orden = (maxOrden?.orden ?? 0) + 1000;

  const { data: newItem, error: insertErr } = await (admin.from("requerimiento_items") as any)
    .insert({
      requerimiento_id: req.id,
      nombre: item.nombre.trim(),
      rubro: item.rubro?.trim() || null,
      descripcion: item.descripcion?.trim() || null,
      orden,
      numero: null,
      obligatorio: true,
      completado: false,
      fecha_limite: req.fecha_limite,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (insertErr || !newItem) return { error: "Error al agregar reactivo" };
  revalidate(entidadId, contratoId);
  return { success: true, id: newItem.id };
}

// ── EDITAR ITEM ───────────────────────────────────────────────────────────────

export async function editarItemAction(itemId: string, datos: { nombre: string; rubro?: string; descripcion?: string; numero?: string }) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: item } = await (admin.from("requerimiento_items") as any)
    .select("requerimiento_id").eq("id", itemId).single() as { data: { requerimiento_id: string } | null; error: unknown };
  if (!item) return { error: "Reactivo no encontrado" };

  await (admin.from("requerimiento_items") as any)
    .update({ nombre: datos.nombre.trim(), rubro: datos.rubro?.trim() || null, descripcion: datos.descripcion?.trim() || null, ...(datos.numero !== undefined ? { numero: datos.numero.trim() || null } : {}) })
    .eq("id", itemId);

  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id").eq("id", item.requerimiento_id).single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };
  if (req) revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── ELIMINAR ITEM ─────────────────────────────────────────────────────────────

export async function eliminarItemAction(itemId: string) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: item } = await (admin.from("requerimiento_items") as any)
    .select("requerimiento_id").eq("id", itemId).single() as { data: { requerimiento_id: string } | null; error: unknown };
  if (!item) return { error: "Reactivo no encontrado" };

  // Desvincular archivos (no eliminarlos)
  await (admin.from("archivos") as any)
    .update({ requerimiento_item_id: null })
    .eq("requerimiento_item_id", itemId);

  await (admin.from("requerimiento_items") as any).delete().eq("id", itemId);

  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id").eq("id", item.requerimiento_id).single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };
  if (req) revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── CHEQUEAR IMPACTO ANTES DE RE-IMPORTAR ────────────────────────────────────

export async function chequearImpactoImportAction(contratoId: string): Promise<{ archivos: number; items: number }> {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { archivos: 0, items: 0 };

  const admin = createAdminClient();

  const { data: allReqs } = await (admin.from("requerimientos") as any)
    .select("id").eq("contrato_id", contratoId) as { data: Array<{ id: string }> | null; error: unknown };

  if (!allReqs?.length) return { archivos: 0, items: 0 };

  const reqIds = allReqs.map(r => r.id);

  const { data: itemRows } = await (admin.from("requerimiento_items") as any)
    .select("id").in("requerimiento_id", reqIds) as { data: Array<{ id: string }> | null; error: unknown };

  const itemIds = (itemRows ?? []).map(i => i.id);
  if (!itemIds.length) return { archivos: 0, items: 0 };

  const { count: archivosCount } = await (admin.from("archivos") as any)
    .select("id", { count: "exact", head: true })
    .in("requerimiento_item_id", itemIds)
    .neq("estado", "eliminado") as { count: number | null };

  return { archivos: archivosCount ?? 0, items: itemIds.length };
}

// ── IMPORTAR REACTIVOS DESDE CSV (nivel contrato) ────────────────────────────

export async function importarReactivosContratoAction(
  contratoId: string,
  entidadId: string,
  reactivos: Array<{ orden: number; numero: string; area: string; rubro: string; nombre: string; fechaLimite?: string }>,
  fechaLimiteInput?: string
) {
  const { user, perfil, error: authErr } = await getUser();
  if (authErr || !user || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  if (!reactivos.length) return { error: "El CSV no contiene filas válidas" };

  const admin = createAdminClient();

  // Obtener o crear el requerimiento base del contrato
  const { data: existing } = await (admin.from("requerimientos") as any)
    .select("id, fecha_limite, estado")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single() as { data: { id: string; fecha_limite: string; estado: string } | null; error: unknown };

  let requerimientoId: string;
  let fechaLimiteReq: string;

  // ── Merge inteligente: preservar items que coincidan por nombre ──────────────

  let actualizados = 0, nuevos = 0, eliminados = 0;

  if (existing) {
    requerimientoId = existing.id;
    fechaLimiteReq = fechaLimiteInput ?? existing.fecha_limite;

    if (fechaLimiteInput) {
      const hoy = new Date().toISOString().slice(0, 10);
      const reqUpdate: Record<string, unknown> = { fecha_limite: fechaLimiteInput };
      if (existing.estado === "vencido" && fechaLimiteInput >= hoy) reqUpdate.estado = "pendiente";
      await (admin.from("requerimientos") as any)
        .update(reqUpdate)
        .eq("id", existing.id);
    }

    // Obtener todos los items actuales del contrato
    const { data: allReqs } = await (admin.from("requerimientos") as any)
      .select("id").eq("contrato_id", contratoId) as { data: Array<{ id: string }> | null; error: unknown };
    const reqIds = (allReqs ?? []).map(r => r.id);

    const { data: existingItems } = await (admin.from("requerimiento_items") as any)
      .select("id, nombre").in("requerimiento_id", reqIds) as { data: Array<{ id: string; nombre: string }> | null; error: unknown };

    // Mapa nombre normalizado → id existente
    const nameToId = new Map<string, string>();
    for (const item of existingItems ?? []) {
      nameToId.set(item.nombre.trim().toLowerCase(), item.id);
    }

    // Clasificar filas del CSV
    const toUpdate: Array<{ id: string; orden: number; numero: string; area: string; rubro: string; nombre: string; fechaLimite?: string }> = [];
    const toInsert: Array<{ orden: number; numero: string; area: string; rubro: string; nombre: string; fechaLimite?: string }> = [];
    const matchedIds = new Set<string>();

    for (const row of reactivos) {
      const key = row.nombre.trim().toLowerCase();
      const existingId = nameToId.get(key);
      if (existingId) {
        toUpdate.push({ id: existingId, ...row });
        matchedIds.add(existingId);
      } else {
        toInsert.push(row);
      }
    }

    // Items que desaparecieron del CSV → desvincular archivos y eliminar
    const toDelete = (existingItems ?? []).map(i => i.id).filter(id => !matchedIds.has(id));
    if (toDelete.length) {
      await (admin.from("archivos") as any)
        .update({ requerimiento_item_id: null })
        .in("requerimiento_item_id", toDelete);
      await (admin.from("requerimiento_items") as any).delete().in("id", toDelete);
      eliminados = toDelete.length;
    }

    // Actualizar items que coincidieron (sólo orden, rubro, nombre; conservan estado/archivos)
    for (const item of toUpdate) {
      const fechaRow = item.fechaLimite ?? fechaLimiteInput ?? undefined;
      await (admin.from("requerimiento_items") as any)
        .update({
          nombre: item.nombre.trim(),
          area: item.area.trim() || null,
          rubro: item.rubro.trim() || null,
          orden: item.orden,
          numero: item.numero,
          ...(fechaRow ? { fecha_limite: fechaRow } : {}),
        })
        .eq("id", item.id);
    }
    actualizados = toUpdate.length;

    // Insertar nuevos items
    if (toInsert.length) {
      await (admin.from("requerimiento_items") as any).insert(
        toInsert.map(r => ({
          requerimiento_id: requerimientoId,
          nombre: r.nombre.trim(),
          area: r.area.trim() || null,
          rubro: r.rubro.trim() || null,
          orden: r.orden,
          numero: r.numero,
          obligatorio: true,
          completado: false,
          fecha_limite: r.fechaLimite ?? fechaLimiteReq,
        }))
      );
      nuevos = toInsert.length;
    }
  } else {
    // Primera importación — crear requerimiento base
    fechaLimiteReq = fechaLimiteInput ?? new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const { data: nuevo } = await (admin.from("requerimientos") as any)
      .insert({
        contrato_id: contratoId,
        entidad_id: entidadId,
        titulo: "Reactivos",
        fecha_limite: fechaLimiteReq,
        estado: "pendiente",
        creado_por: user.id,
      })
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };
    if (!nuevo) return { error: "Error al crear contenedor de reactivos" };
    requerimientoId = nuevo.id;

    const { error: insertErr } = await (admin.from("requerimiento_items") as any).insert(
      reactivos.map(r => ({
        requerimiento_id: requerimientoId,
        nombre: r.nombre.trim(),
        area: r.area.trim() || null,
        rubro: r.rubro.trim() || null,
        orden: r.orden,
        numero: r.numero,
        obligatorio: true,
        completado: false,
        fecha_limite: r.fechaLimite ?? fechaLimiteReq,
      }))
    );
    if (insertErr) return { error: "Error al importar reactivos" };
    nuevos = reactivos.length;
  }

  revalidate(entidadId, contratoId);
  return { success: true, actualizados, nuevos, eliminados };
}

// ── EXTENDER FECHA DE ITEM (empleado/admin) ───────────────────────────────────

export async function extenderFechaItemAction(itemId: string, nuevaFecha: string, marcarExtendida = false, nota?: string) {
  const { user, perfil, error: authErr } = await getUser();
  if (authErr || !user || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: item } = await (admin.from("requerimiento_items") as any)
    .select("nombre, requerimiento_id")
    .eq("id", itemId)
    .single() as { data: { nombre: string; requerimiento_id: string } | null; error: unknown };

  if (!item) return { error: "Reactivo no encontrado" };

  await (admin.from("requerimiento_items") as any)
    .update({ fecha_limite: nuevaFecha, extendida: marcarExtendida })
    .eq("id", itemId);

  if (nota?.trim()) {
    const { data: perfData } = await admin.from("usuarios").select("nombre").eq("id", user.id).single() as { data: { nombre: string } | null; error: unknown };
    await (admin.from("requerimiento_item_comentarios") as any).insert({
      item_id: itemId,
      usuario_id: user.id,
      usuario_nombre: perfData?.nombre ?? "Equipo DICA",
      mensaje: nota.trim(),
    });
  }

  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id")
    .eq("id", item.requerimiento_id)
    .single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };

  if (req) {
    revalidate(req.entidad_id, req.contrato_id ?? undefined);
    let contratoNombre: string | null = null;
    if (req.contrato_id) {
      const { data: c } = await (admin.from("contratos") as any)
        .select("nombre").eq("id", req.contrato_id).single() as { data: { nombre: string } | null; error: unknown };
      contratoNombre = c?.nombre ?? null;
    }
    const { data: clientes } = await (admin.from("usuarios") as any)
      .select("email, nombre").eq("entidad_id", req.entidad_id).eq("rol", "cliente").eq("activo", true) as { data: Array<{ email: string; nombre: string }> | null; error: unknown };
    for (const c of clientes ?? []) {
      sendDeadlineExtendedEmail({
        clienteEmail: c.email,
        clienteNombre: c.nombre,
        itemNombre: item.nombre,
        nuevaFecha,
        nota: nota?.trim() || null,
        contratoNombre,
        extendida: marcarExtendida,
      }).catch(() => {});
    }
  }

  return { success: true };
}

// ── REORDENAR ITEM ────────────────────────────────────────────────────────────

export async function reordenarItemAction(itemId: string, direction: "up" | "down") {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();

  // Fetch item with numero to determine level and parent
  const { data: item } = await (admin.from("requerimiento_items") as any)
    .select("requerimiento_id, orden, numero")
    .eq("id", itemId)
    .single() as { data: { requerimiento_id: string; orden: number | null; numero: string | null } | null; error: unknown };
  if (!item) return { error: "Reactivo no encontrado" };

  const numero    = item.numero ?? "";
  const numParts  = numero.split(".");
  const depth     = numParts.length;
  const parentKey = depth > 1 ? numParts.slice(0, -1).join(".") : null;

  // Fetch all items in the requerimiento (need numero to filter siblings)
  const { data: allRaw } = await (admin.from("requerimiento_items") as any)
    .select("id, orden, numero")
    .eq("requerimiento_id", item.requerimiento_id) as { data: Array<{ id: string; orden: number | null; numero: string | null }> | null; error: unknown };

  const all = (allRaw ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  // Siblings: same depth + same parent prefix
  const siblings = all.filter(i => {
    const iParts = (i.numero ?? "").split(".");
    if (iParts.length !== depth) return false;
    if (parentKey) return iParts.slice(0, -1).join(".") === parentKey;
    return true;
  });

  const selfIdx     = siblings.findIndex(s => s.id === itemId);
  if (selfIdx === -1) return { success: true };
  const neighborIdx = direction === "up" ? selfIdx - 1 : selfIdx + 1;
  if (neighborIdx < 0 || neighborIdx >= siblings.length) return { success: true };

  const neighbor = siblings[neighborIdx];

  // Build each item's "block" using orden boundaries between siblings.
  // This handles duplicate/null numeros without subtree prefix conflicts.
  const getBlock = (sibIdx: number) => {
    const start = siblings[sibIdx].orden ?? 0;
    const end   = sibIdx + 1 < siblings.length ? (siblings[sibIdx + 1].orden ?? Infinity) : Infinity;
    return all.filter(i => (i.orden ?? 0) >= start && (i.orden ?? 0) < end);
  };

  const groupA = getBlock(selfIdx);
  const groupB = getBlock(neighborIdx);

  // Pool all ordenes from both groups (sorted) and redistribute:
  // whichever group was "first" (lower ordenes) moves to the end, and vice versa.
  const allOrdens = [...groupA, ...groupB]
    .map(i => i.orden ?? 0)
    .sort((a, b) => a - b);

  const aIsFirst  = (groupA[0]?.orden ?? 0) < (groupB[0]?.orden ?? 0);
  const firstGrp  = aIsFirst ? groupA : groupB;
  const secondGrp = aIsFirst ? groupB : groupA;
  const nSecond   = secondGrp.length;

  // Second group (was after) now gets the lower ordenes; first group gets the upper ones
  const ordensForFirst  = allOrdens.slice(nSecond);
  const ordensForSecond = allOrdens.slice(0, nSecond);

  const updates = [
    ...firstGrp.map((i, idx) => ({ id: i.id, orden: ordensForFirst[idx] })),
    ...secondGrp.map((i, idx) => ({ id: i.id, orden: ordensForSecond[idx] })),
  ];

  await Promise.all(
    updates.map(u => (admin.from("requerimiento_items") as any).update({ orden: u.orden }).eq("id", u.id))
  );

  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id").eq("id", item.requerimiento_id).single() as { data: { entidad_id: string; contrato_id: string | null } | null; error: unknown };
  if (req) revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}

// ── FETCH PENDIENTES (revisión + retraso) ─────────────────────────────────────

export interface PendienteItem {
  id: string;
  nombre: string;
  estado: ItemEstado;
  fecha_limite: string | null;
  diasRetraso: number;
  requerimiento_id: string;
  entidad_id: string;
  entidad_nombre: string;
  contrato_id: string | null;
  contrato_nombre: string | null;
}

export async function fetchPendientesRevisionAction(): Promise<{ data: PendienteItem[] | null; error: string | null }> {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr, data: null };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado", data: null };

  const admin = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: rawItems, error } = await (admin.from("requerimiento_items") as any)
    .select(`
      id, nombre, estado, fecha_limite,
      requerimiento:requerimientos!requerimiento_id(
        id, entidad_id, contrato_id,
        entidad:entidades!entidad_id(nombre),
        contrato:contratos!contrato_id(nombre)
      )
    `)
    .or(`estado.eq.en_revision,and(estado.neq.completado,fecha_limite.lt.${hoy})`)
    .order("fecha_limite", { ascending: true }) as { data: any[] | null; error: unknown };

  if (error) return { error: "Error al cargar pendientes", data: null };

  const items: PendienteItem[] = (rawItems ?? []).map(i => {
    const req = i.requerimiento ?? {};
    const diasRetraso = i.fecha_limite
      ? Math.floor((new Date(hoy).getTime() - new Date(i.fecha_limite).getTime()) / 86400000)
      : 0;
    return {
      id: i.id,
      nombre: i.nombre,
      estado: (i.estado ?? "pendiente") as ItemEstado,
      fecha_limite: i.fecha_limite ?? null,
      diasRetraso: Math.max(0, diasRetraso),
      requerimiento_id: req.id ?? "",
      entidad_id: req.entidad_id ?? "",
      entidad_nombre: req.entidad?.nombre ?? "—",
      contrato_id: req.contrato_id ?? null,
      contrato_nombre: req.contrato?.nombre ?? null,
    };
  });

  return { data: items, error: null };
}

// ── IMPORTAR REACTIVOS DESDE CSV (nivel requerimiento — legacy) ───────────────

export async function importarReactivosAction(
  requerimientoId: string,
  reactivos: Array<{ orden: number; rubro: string; nombre: string }>
) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) return { error: "No autorizado" };

  if (!reactivos.length) return { error: "El CSV no contiene filas válidas" };

  const admin = createAdminClient();

  const { data: req } = await (admin.from("requerimientos") as any)
    .select("entidad_id, contrato_id, fecha_limite").eq("id", requerimientoId).single() as { data: { entidad_id: string; contrato_id: string | null; fecha_limite: string } | null; error: unknown };
  if (!req) return { error: "Requerimiento no encontrado" };

  await (admin.from("requerimiento_items") as any).delete().eq("requerimiento_id", requerimientoId);

  const { error: insertErr } = await (admin.from("requerimiento_items") as any).insert(
    reactivos.map(r => ({
      requerimiento_id: requerimientoId,
      nombre:     r.nombre.trim(),
      rubro:      r.rubro.trim() || null,
      orden:      r.orden,
      obligatorio: true,
      completado:  false,
      fecha_limite: req.fecha_limite,
    }))
  );

  if (insertErr) return { error: "Error al importar reactivos" };
  revalidate(req.entidad_id, req.contrato_id ?? undefined);
  return { success: true };
}
