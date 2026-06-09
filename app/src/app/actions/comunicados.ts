"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  tipo: "info" | "urgente" | "recordatorio";
  activo: boolean;
  created_at: string;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false };
  const { data: p } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  return { supabase, ok: ["admin", "superadmin", "rrhh"].includes(p?.rol ?? ""), user };
}

export async function fetchComunicadosAction() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comunicados" as never)
    .select("*")
    .order("created_at", { ascending: false }) as unknown as { data: Comunicado[] | null; error: unknown };
  if (error) return { data: null, error: "Error al cargar comunicados" };
  return { data: data ?? [], error: null };
}

export async function crearComunicadoAction(input: { titulo: string; contenido: string; tipo: Comunicado["tipo"] }) {
  const { supabase, ok, user } = await verificarAdmin();
  if (!ok) return { error: "Sin permisos" };

  const { error } = await (supabase.from("comunicados") as any).insert({
    titulo:        input.titulo.trim(),
    contenido:     input.contenido.trim(),
    tipo:          input.tipo,
    activo:        true,
    publicado_por: user!.id,
  });
  if (error) return { error: "Error al crear comunicado" };

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function desactivarComunicadoAction(id: string) {
  const { supabase, ok } = await verificarAdmin();
  if (!ok) return { error: "Sin permisos" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("comunicados") as any)
    .update({ activo: false })
    .eq("id", id);
  if (error) return { error: "Error al archivar" };

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/dashboard");
  return { success: true };
}
