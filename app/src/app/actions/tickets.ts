"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "No autenticado" as string, user: null, perfil: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: perfil } = await (supabase.from("usuarios") as any)
    .select("id, rol, nombre").eq("id", user.id).single() as { data: { id: string; rol: string; nombre: string } | null; error: unknown };
  if (!perfil) return { error: "Usuario no encontrado" as string, user: null, perfil: null };
  return { error: null, user, perfil };
}

export type TicketTipo = "computadora" | "plataforma" | "sugerencia" | "otro";
export type TicketEstado = "abierto" | "en_proceso" | "resuelto";
export type TicketPrioridad = "baja" | "media" | "alta";

export type Ticket = {
  id: string;
  usuario_id: string | null;
  tipo: TicketTipo;
  titulo: string;
  descripcion: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  respuesta: string | null;
  resuelto_por: string | null;
  created_at: string;
  updated_at: string;
  usuario_nombre: string | null;
  resuelto_por_nombre: string | null;
};

export async function crearTicketAction(input: {
  tipo: TicketTipo;
  titulo: string;
  descripcion: string;
}) {
  const { error, user } = await getUser();
  if (error || !user) return { error };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (admin.from("tickets") as any).insert({
    usuario_id: user.id,
    tipo: input.tipo,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion.trim(),
    estado: "abierto",
    prioridad: "media",
  });

  if (insertErr) return { error: "Error al crear el ticket" };
  revalidatePath("/dashboard/tickets");
  return { success: true };
}

export async function fetchTicketsAction() {
  const { error, user, perfil } = await getUser();
  if (error || !user || !perfil) return { error, data: null };

  const admin = createAdminClient();
  const isAdmin = ["admin", "superadmin", "rrhh"].includes(perfil.rol);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("tickets") as any)
    .select("id, usuario_id, tipo, titulo, descripcion, estado, prioridad, respuesta, resuelto_por, created_at, updated_at, creador:usuarios!tickets_usuario_id_fkey(nombre), resolvio:usuarios!tickets_resuelto_por_fkey(nombre)")
    .order("created_at", { ascending: false });

  if (!isAdmin) query = query.eq("usuario_id", user.id);

  const { data, error: fetchErr } = await query;
  if (fetchErr) return { error: "Error al obtener tickets", data: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets: Ticket[] = (data ?? []).map((t: any) => ({
    ...t,
    usuario_nombre: t.creador?.nombre ?? null,
    resuelto_por_nombre: t.resolvio?.nombre ?? null,
    creador: undefined,
    resolvio: undefined,
  }));

  return { data: tickets };
}

export async function contarTicketsAbiertosAction() {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin.from("tickets") as any)
    .select("*", { count: "exact", head: true })
    .eq("estado", "abierto");
  return count ?? 0;
}

export async function actualizarTicketAction(ticketId: string, updates: {
  estado?: TicketEstado;
  prioridad?: TicketPrioridad;
  respuesta?: string;
}) {
  const { error, user, perfil } = await getUser();
  if (error || !user || !perfil) return { error };
  if (!["admin", "superadmin"].includes(perfil.rol)) return { error: "No autorizado" };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
  if (updates.estado === "resuelto") patch.resuelto_por = user.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (admin.from("tickets") as any)
    .update(patch).eq("id", ticketId);
  if (updErr) return { error: "Error al actualizar el ticket" };

  revalidatePath("/dashboard/tickets");
  return { success: true };
}
