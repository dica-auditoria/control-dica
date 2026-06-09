"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TipoOtro = "comision" | "permiso";
export type EstadoOtro =
  | "pendiente_supervisor"
  | "aprobado_supervisor"
  | "rechazado_supervisor"
  | "pendiente_rh"
  | "aprobado_rh"
  | "rechazado_rh"
  | "cancelado";

export interface SolicitudOtro {
  id: string;
  empleado_id: string;
  tipo: TipoOtro;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: EstadoOtro;
  creado_por: string | null;
  supervisor_empleado_id: string | null;
  comentario_supervisor: string | null;
  fecha_decision_supervisor: string | null;
  comentario_rh: string | null;
  fecha_decision_rh: string | null;
  created_at: string;
  empleado?: { nombres: string; apellido_paterno: string; apellido_materno: string | null; departamento: string };
  supervisor?: { nombres: string; apellido_paterno: string } | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function getContexto() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, perfil: null, empleado: null, esRH: false, esAdmin: false };

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, departamento, supervisor_id")
    .eq("email_institucional", user.email ?? "")
    .maybeSingle() as { data: { id: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; departamento: string; supervisor_id: string | null } | null; error: unknown };

  const esRH    = ["rrhh", "admin", "superadmin"].includes(perfil?.rol ?? "");
  const esAdmin = ["admin", "superadmin"].includes(perfil?.rol ?? "");

  return { supabase, user, perfil, empleado, esRH, esAdmin };
}

const SEL_SOLICITUD =
  "*, empleado:empleado_id(nombres,apellido_paterno,apellido_materno,departamento), supervisor:supervisor_empleado_id(nombres,apellido_paterno)";

// ── consultas ─────────────────────────────────────────────────────────────────

/** Solicitudes propias del empleado + comisiones asignadas a él */
export async function fetchMisSolicitudesOtrosAction() {
  const { supabase, empleado } = await getContexto();
  if (!empleado) return { data: null, error: "No autenticado" };

  const { data, error } = await (supabase.from("solicitudes_otros") as any)
    .select(SEL_SOLICITUD)
    .eq("empleado_id", empleado.id)
    .order("created_at", { ascending: false }) as { data: SolicitudOtro[] | null; error: unknown };

  if (error) return { data: null, error: "Error al cargar solicitudes" };
  return { data: data ?? [], error: null };
}

/** Solicitudes de subordinados del supervisor actual */
export async function fetchSolicitudesEquipoAction() {
  const { supabase, empleado } = await getContexto();
  if (!empleado) return { data: null, error: "No autenticado", subordinados: [] };

  // Mis subordinados directos
  const { data: subs } = await supabase
    .from("empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, departamento")
    .eq("supervisor_id", empleado.id) as { data: Array<{ id: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; departamento: string }> | null };

  if (!subs || subs.length === 0) return { data: [], error: null, subordinados: [] };

  const ids = subs.map(s => s.id);

  const { data, error } = await (supabase.from("solicitudes_otros") as any)
    .select(SEL_SOLICITUD)
    .in("empleado_id", ids)
    .order("created_at", { ascending: false }) as { data: SolicitudOtro[] | null; error: unknown };

  if (error) return { data: null, error: "Error al cargar equipo", subordinados: subs };
  return { data: data ?? [], error: null, subordinados: subs };
}

/** Para RH: todas las solicitudes pendientes de validación o con historial */
export async function fetchTodasSolicitudesOtrosAction() {
  const { supabase, esRH } = await getContexto();
  if (!esRH) return { data: null, error: "Sin permisos" };

  const { data, error } = await (supabase.from("solicitudes_otros") as any)
    .select(SEL_SOLICITUD)
    .order("created_at", { ascending: false }) as { data: SolicitudOtro[] | null; error: unknown };

  if (error) return { data: null, error: "Error al cargar solicitudes" };
  return { data: data ?? [], error: null };
}

// ── empleado: solicitar permiso ───────────────────────────────────────────────

export async function solicitarPermisoAction(input: {
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}) {
  const { supabase, user, empleado } = await getContexto();
  if (!user || !empleado) return { error: "No autenticado" };

  // Obtener supervisor del empleado
  const { data: empFull } = await supabase
    .from("empleados")
    .select("supervisor_id")
    .eq("id", empleado.id)
    .single() as { data: { supervisor_id: string | null } | null; error: unknown };

  const { error } = await (supabase.from("solicitudes_otros") as any).insert({
    empleado_id:            empleado.id,
    tipo:                   "permiso",
    fecha_inicio:           input.fecha_inicio,
    fecha_fin:              input.fecha_fin,
    motivo:                 input.motivo.trim(),
    estado:                 empFull?.supervisor_id ? "pendiente_supervisor" : "pendiente_rh",
    creado_por:             user.id,
    supervisor_empleado_id: empFull?.supervisor_id ?? null,
  });

  if (error) return { error: "Error al crear solicitud" };
  revalidatePath("/dashboard/otros");
  return { error: null };
}

// ── supervisor: crear comisión ────────────────────────────────────────────────

export async function crearComisionAction(input: {
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}) {
  const { supabase, user, empleado } = await getContexto();
  if (!user || !empleado) return { error: "No autenticado" };

  // Verificar que el empleado es subordinado directo
  const { data: sub } = await supabase
    .from("empleados")
    .select("id")
    .eq("id", input.empleado_id)
    .eq("supervisor_id", empleado.id)
    .maybeSingle() as { data: { id: string } | null; error: unknown };

  if (!sub) return { error: "El empleado no es subordinado directo" };

  const { error } = await (supabase.from("solicitudes_otros") as any).insert({
    empleado_id:            input.empleado_id,
    tipo:                   "comision",
    fecha_inicio:           input.fecha_inicio,
    fecha_fin:              input.fecha_fin,
    motivo:                 input.motivo.trim(),
    estado:                 "pendiente_rh",
    creado_por:             user.id,
    supervisor_empleado_id: empleado.id,
    aprobado_supervisor_por: user.id,
    fecha_decision_supervisor: new Date().toISOString(),
  });

  if (error) return { error: "Error al crear comisión" };
  revalidatePath("/dashboard/otros");
  return { error: null };
}

// ── supervisor: aprobar/rechazar permiso ─────────────────────────────────────

export async function aprobarPermisoSupervisorAction(id: string, comentario?: string) {
  const { supabase, user, empleado } = await getContexto();
  if (!user || !empleado) return { error: "No autenticado" };

  // Verificar que pertenece a un subordinado
  const { data: sol } = await (supabase.from("solicitudes_otros") as any)
    .select("supervisor_empleado_id, estado")
    .eq("id", id)
    .single() as { data: { supervisor_empleado_id: string; estado: EstadoOtro } | null; error: unknown };

  if (!sol || sol.supervisor_empleado_id !== empleado.id) return { error: "Sin permisos" };
  if (sol.estado !== "pendiente_supervisor") return { error: "Estado inválido" };

  const { error } = await (supabase.from("solicitudes_otros") as any)
    .update({
      estado:                    "pendiente_rh",
      comentario_supervisor:     comentario?.trim() ?? null,
      fecha_decision_supervisor: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "Error al aprobar" };
  revalidatePath("/dashboard/otros");
  return { error: null };
}

export async function rechazarPermisoSupervisorAction(id: string, comentario: string) {
  const { supabase, user, empleado } = await getContexto();
  if (!user || !empleado) return { error: "No autenticado" };

  const { data: sol } = await (supabase.from("solicitudes_otros") as any)
    .select("supervisor_empleado_id, estado")
    .eq("id", id)
    .single() as { data: { supervisor_empleado_id: string; estado: EstadoOtro } | null; error: unknown };

  if (!sol || sol.supervisor_empleado_id !== empleado.id) return { error: "Sin permisos" };
  if (sol.estado !== "pendiente_supervisor") return { error: "Estado inválido" };

  const { error } = await (supabase.from("solicitudes_otros") as any)
    .update({
      estado:                    "rechazado_supervisor",
      comentario_supervisor:     comentario.trim(),
      fecha_decision_supervisor: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "Error al rechazar" };
  revalidatePath("/dashboard/otros");
  return { error: null };
}

// ── RH: validar (aprobar/rechazar) ────────────────────────────────────────────

export async function validarRHAction(id: string, aprobado: boolean, comentario?: string) {
  const { supabase, user, esRH } = await getContexto();
  if (!user || !esRH) return { error: "Sin permisos" };

  const { data: sol } = await (supabase.from("solicitudes_otros") as any)
    .select("estado")
    .eq("id", id)
    .single() as { data: { estado: EstadoOtro } | null; error: unknown };

  if (!sol || sol.estado !== "pendiente_rh") return { error: "Solo se pueden validar solicitudes pendientes de RH" };

  const { error } = await (supabase.from("solicitudes_otros") as any)
    .update({
      estado:             aprobado ? "aprobado_rh" : "rechazado_rh",
      comentario_rh:      comentario?.trim() ?? null,
      fecha_decision_rh:  new Date().toISOString(),
      aprobado_rh_por:    user.id,
    })
    .eq("id", id);

  if (error) return { error: "Error al validar" };
  revalidatePath("/dashboard/otros");
  return { error: null };
}

// ── cancelar (empleado cancela la propia) ─────────────────────────────────────

export async function cancelarSolicitudOtroAction(id: string) {
  const { supabase, empleado } = await getContexto();
  if (!empleado) return { error: "No autenticado" };

  const { data: sol } = await (supabase.from("solicitudes_otros") as any)
    .select("empleado_id, estado")
    .eq("id", id)
    .single() as { data: { empleado_id: string; estado: EstadoOtro } | null; error: unknown };

  if (!sol || sol.empleado_id !== empleado.id) return { error: "Sin permisos" };
  if (!["pendiente_supervisor", "pendiente_rh", "aprobado_supervisor"].includes(sol.estado)) return { error: "No se puede cancelar en este estado" };

  const { error } = await (supabase.from("solicitudes_otros") as any)
    .update({ estado: "cancelado" })
    .eq("id", id);

  if (error) return { error: "Error al cancelar" };
  revalidatePath("/dashboard/otros");
  return { error: null };
}
