"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendVacacionesNotifEmail } from "@/lib/email";

async function logAudit(userId: string, accion: "VACACION_APROBAR" | "VACACION_RECHAZAR", recurso_id: string, detalle: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await (admin.from("audit_log") as any).insert({ usuario_id: userId, accion, recurso_id, ip, detalle_json: detalle });
  } catch { /* non-critical */ }
}

export type TipoVacacion = "vacaciones" | "permiso_con_goce" | "permiso_sin_goce";
export type EstadoVacacion = "pendiente" | "aprobado" | "rechazado" | "cancelado";

export interface SolicitudVacacion {
  id: string;
  empleado_id: string;
  tipo: TipoVacacion;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  motivo: string | null;
  estado: EstadoVacacion;
  comentario_rrhh: string | null;
  created_at: string;
  empleado?: { nombres: string; apellido_paterno: string; apellido_materno: string; departamento: string; codigo_empleado: string | null };
}

const TIPO_LABEL: Record<TipoVacacion, string> = {
  vacaciones:        "Vacaciones",
  permiso_con_goce:  "Permiso con goce",
  permiso_sin_goce:  "Permiso sin goce",
};

function calcDiasHabiles(inicio: string, fin: string): number {
  let count = 0;
  const start = new Date(inicio + "T12:00:00");
  const end   = new Date(fin   + "T12:00:00");
  const cur   = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

async function getRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, rol: null, empId: null };
  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  // Get empleado id by email
  const { data: emp } = await supabase.from("empleados").select("id").eq("email_institucional", user.email ?? "").maybeSingle() as { data: { id: string } | null; error: unknown };
  return { supabase, user, rol: perfil?.rol ?? null, empId: emp?.id ?? null };
}

// ─── EMPLEADO: Solicitar ─────────────────────────────────────────────────────
export async function solicitarVacacionesAction(input: {
  tipo: TipoVacacion;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string;
}) {
  const { supabase, empId } = await getRole();
  if (!empId) return { error: "No se encontró tu expediente de empleado" };
  if (input.fecha_inicio > input.fecha_fin) return { error: "La fecha de inicio no puede ser mayor a la de fin" };

  const dias_habiles = calcDiasHabiles(input.fecha_inicio, input.fecha_fin);

  const { error } = await (supabase.from("solicitudes_vacaciones") as any).insert({
    empleado_id:  empId,
    tipo:         input.tipo,
    fecha_inicio: input.fecha_inicio,
    fecha_fin:    input.fecha_fin,
    dias_habiles,
    motivo:       input.motivo ?? null,
    estado:       "pendiente",
  });
  if (error) return { error: "Error al crear la solicitud" };

  revalidatePath("/dashboard/mis-vacaciones");
  revalidatePath("/dashboard/vacaciones");
  return { success: true };
}

// ─── EMPLEADO: Cancelar propia solicitud pendiente ───────────────────────────
export async function cancelarVacacionesAction(id: string) {
  const { supabase, empId } = await getRole();
  if (!empId) return { error: "No autenticado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("solicitudes_vacaciones") as any)
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empleado_id", empId)
    .eq("estado", "pendiente");

  if (error) return { error: "No se pudo cancelar la solicitud" };
  revalidatePath("/dashboard/mis-vacaciones");
  return { success: true };
}

// ─── EMPLEADO: Mis solicitudes ───────────────────────────────────────────────
export async function fetchMisVacacionesAction() {
  const { supabase, empId } = await getRole();
  if (!empId) return { error: "No se encontró tu expediente", data: null };

  const { data, error } = await supabase
    .from("solicitudes_vacaciones" as never)
    .select("*")
    .eq("empleado_id", empId)
    .order("created_at", { ascending: false }) as unknown as { data: SolicitudVacacion[] | null; error: unknown };

  if (error) return { error: "Error al obtener solicitudes", data: null };
  return { data: data ?? [], error: null };
}

// ─── ADMIN/RRHH: Todas las solicitudes ───────────────────────────────────────
export async function fetchTodasVacacionesAction(estado?: EstadoVacacion | "todos") {
  const { supabase, rol } = await getRole();
  if (!["admin", "superadmin", "rrhh"].includes(rol ?? "")) return { error: "Sin permisos", data: null };

  let q = supabase
    .from("solicitudes_vacaciones" as never)
    .select("*, empleado:empleados(nombres, apellido_paterno, apellido_materno, departamento, codigo_empleado)")
    .order("created_at", { ascending: false });

  if (estado && estado !== "todos") {
    q = (q as unknown as { eq: (a: string, b: string) => typeof q }).eq("estado", estado) as typeof q;
  }

  const { data, error } = await q as unknown as { data: SolicitudVacacion[] | null; error: unknown };
  if (error) return { error: "Error al obtener solicitudes", data: null };
  return { data: data ?? [], error: null };
}

// ─── ADMIN/RRHH: Aprobar ─────────────────────────────────────────────────────
export async function aprobarVacacionesAction(id: string, comentario?: string) {
  const { supabase, user, rol } = await getRole();
  if (!["admin", "superadmin", "rrhh"].includes(rol ?? "")) return { error: "Sin permisos" };

  const { data: sol } = await supabase
    .from("solicitudes_vacaciones" as never)
    .select("*, empleado:empleados(nombres, apellido_paterno, email_institucional)")
    .eq("id", id)
    .single() as unknown as { data: (SolicitudVacacion & { empleado: { nombres: string; apellido_paterno: string; email_institucional: string } | null }) | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("solicitudes_vacaciones") as any)
    .update({ estado: "aprobado", comentario_rrhh: comentario ?? null, aprobado_por: user!.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "Error al aprobar" };

  if (sol?.empleado?.email_institucional) {
    sendVacacionesNotifEmail({
      email: sol.empleado.email_institucional,
      nombre: `${sol.empleado.nombres} ${sol.empleado.apellido_paterno}`,
      tipo: TIPO_LABEL[sol.tipo],
      fechaInicio: sol.fecha_inicio,
      fechaFin: sol.fecha_fin,
      dias: sol.dias_habiles,
      estado: "aprobado",
      comentario: comentario,
    }).catch(() => {});
  }

  revalidatePath("/dashboard/vacaciones");
  revalidatePath("/dashboard/mis-vacaciones");
  await logAudit(user!.id, "VACACION_APROBAR", id, {
    empleado: sol?.empleado ? `${sol.empleado.nombres} ${sol.empleado.apellido_paterno}` : null,
    tipo: sol?.tipo, fechaInicio: sol?.fecha_inicio, fechaFin: sol?.fecha_fin,
  });
  return { success: true };
}

// ─── ADMIN/RRHH: Rechazar ────────────────────────────────────────────────────
export async function rechazarVacacionesAction(id: string, comentario: string) {
  const { supabase, user, rol } = await getRole();
  if (!["admin", "superadmin", "rrhh"].includes(rol ?? "")) return { error: "Sin permisos" };

  const { data: sol } = await supabase
    .from("solicitudes_vacaciones" as never)
    .select("*, empleado:empleados(nombres, apellido_paterno, email_institucional)")
    .eq("id", id)
    .single() as unknown as { data: (SolicitudVacacion & { empleado: { nombres: string; apellido_paterno: string; email_institucional: string } | null }) | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("solicitudes_vacaciones") as any)
    .update({ estado: "rechazado", comentario_rrhh: comentario, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "Error al rechazar" };

  if (sol?.empleado?.email_institucional) {
    sendVacacionesNotifEmail({
      email: sol.empleado.email_institucional,
      nombre: `${sol.empleado.nombres} ${sol.empleado.apellido_paterno}`,
      tipo: TIPO_LABEL[sol.tipo],
      fechaInicio: sol.fecha_inicio,
      fechaFin: sol.fecha_fin,
      dias: sol.dias_habiles,
      estado: "rechazado",
      comentario,
    }).catch(() => {});
  }

  revalidatePath("/dashboard/vacaciones");
  revalidatePath("/dashboard/mis-vacaciones");
  if (user) await logAudit(user.id, "VACACION_RECHAZAR", id, {
    empleado: sol?.empleado ? `${sol.empleado.nombres} ${sol.empleado.apellido_paterno}` : null,
    tipo: sol?.tipo, fechaInicio: sol?.fecha_inicio, fechaFin: sol?.fecha_fin, comentario,
  });
  return { success: true };
}
