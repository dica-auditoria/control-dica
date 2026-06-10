"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Comentario {
  id: string;
  item_id: string;
  usuario_id: string;
  usuario_nombre: string;
  mensaje: string;
  created_at: string;
}

async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, nombre: null };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, rol")
    .eq("id", user.id)
    .single() as { data: { nombre: string; rol: string } | null; error: unknown };

  return { user, nombre: perfil?.nombre ?? "Usuario", rol: perfil?.rol ?? null };
}

export async function fetchComentariosItemAction(
  itemId: string
): Promise<{ data: Comentario[] | null; error: string | null }> {
  const { user } = await getUser();
  if (!user) return { error: "No autenticado", data: null };

  const admin = createAdminClient();
  const { data, error } = await (admin.from("requerimiento_item_comentarios") as any)
    .select("id, item_id, usuario_id, usuario_nombre, mensaje, created_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true }) as {
      data: Comentario[] | null;
      error: unknown;
    };

  if (error) return { error: "Error al cargar comentarios", data: null };
  return { data: data ?? [], error: null };
}

export async function agregarComentarioAction(
  itemId: string,
  mensaje: string
): Promise<{ data: Comentario | null; error: string | null }> {
  const { user, nombre } = await getUser();
  if (!user || !nombre) return { error: "No autenticado", data: null };

  const textoLimpio = mensaje.trim();
  if (!textoLimpio) return { error: "El mensaje no puede estar vacío", data: null };

  const admin = createAdminClient();
  const { data, error } = await (admin.from("requerimiento_item_comentarios") as any)
    .insert({
      item_id: itemId,
      usuario_id: user.id,
      usuario_nombre: nombre,
      mensaje: textoLimpio,
    })
    .select("id, item_id, usuario_id, usuario_nombre, mensaje, created_at")
    .single() as { data: Comentario | null; error: unknown };

  if (error || !data) return { error: "Error al guardar comentario", data: null };
  return { data, error: null };
}
