"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CrearRequerimientoInput, Requerimiento, RequerimientoItem } from "@/types/requerimientos";
import { sendRequerimientoEmail } from "@/lib/email";

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
  if (!["admin", "superadmin"].includes(perfil.rol)) return { error: "No autorizado" };

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
  requerimiento_items: Array<{ id: string; requerimiento_id: string; nombre: string; descripcion: string | null; obligatorio: boolean; completado: boolean; created_at: string }>;
}

export async function fetchRequerimientosContratoAction(contratoId: string): Promise<{ data: Requerimiento[] | null; error: string | null }> {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr, data: null };
  if (!["admin", "superadmin"].includes(perfil.rol)) return { error: "No autorizado", data: null };

  const admin = createAdminClient();
  const { data, error } = await (admin.from("requerimientos") as any)
    .select("*, requerimiento_items(id, nombre, descripcion, obligatorio, completado, created_at)")
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
    items: r.requerimiento_items ?? [],
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
    .select("*, requerimiento_items(id, nombre, descripcion, obligatorio, completado, created_at)")
    .eq("entidad_id", perfil.entidad_id)
    .neq("estado", "completado")
    .order("fecha_limite", { ascending: true }) as { data: RawReq[] | null; error: unknown };

  if (error) return { error: "Error al cargar requerimientos", data: null };

  const hoy = new Date().toISOString().slice(0, 10);
  const items: Requerimiento[] = (data ?? []).map(r => ({
    ...r,
    estado: (["pendiente", "en_revision"].includes(r.estado) && r.fecha_limite < hoy ? "vencido" : r.estado) as Requerimiento["estado"],
    items: r.requerimiento_items ?? [],
    archivos_count: 0,
  }));

  return { data: items, error: null };
}

// ── TOGGLE ITEM COMPLETADO ────────────────────────────────────────────────────

export async function toggleItemCompletoAction(itemId: string, completado: boolean) {
  const { perfil, error: authErr } = await getUser();
  if (authErr || !perfil) return { error: authErr };
  if (!["admin", "superadmin"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  await (admin.from("requerimiento_items") as any).update({ completado }).eq("id", itemId);
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
