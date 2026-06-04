"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }

async function verificarSuperadmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (perfil?.rol !== "superadmin") return { supabase: null, error: "Acción reservada para superadmin" };

  return { supabase, error: null };
}

export async function crearEntidadAction(nombre: string) {
  const { supabase, error: authErr } = await verificarSuperadmin();
  if (authErr || !supabase) return { error: authErr };

  const nombreClean = nombre.trim();
  if (nombreClean.length < 3) return { error: "El nombre debe tener al menos 3 caracteres" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entidad, error } = await (supabase.from("entidades") as any)
    .insert({ nombre: nombreClean, activo: true })
    .select("id, nombre, activo, created_at")
    .single() as { data: EntidadRow | null; error: { message?: string } | null };

  if (error) {
    if (error.message?.includes("unique")) return { error: "Ya existe una entidad con ese nombre" };
    return { error: "Error al crear la entidad" };
  }

  revalidatePath("/dashboard/entidades");
  return { entidad };
}

export async function toggleActivoAction(id: string, activo: boolean) {
  const { supabase, error: authErr } = await verificarSuperadmin();
  if (authErr || !supabase) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("entidades") as any)
    .update({ activo })
    .eq("id", id) as { error: unknown };

  if (error) return { error: "Error al actualizar la entidad" };

  revalidatePath("/dashboard/entidades");
  return { success: true };
}
