"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

interface PerfilRow { id: string; rol: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  insert: (...args: unknown[]) => DbQuery;
  upsert: (...args: unknown[]) => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  maybeSingle: () => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("id, rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { supabase: null, userId: null, error: "No autorizado" };
  return { supabase, userId: perfil.id, error: null };
}

export interface BancariosData {
  banco:          string | null;
  tipo_cuenta:    string | null;
  numero_cuenta:  string | null;
  clabe:          string | null;
  numero_tarjeta: string | null;
  salario_texto:  string | null;
}

// ─── Obtener ──────────────────────────────────────────────────────────────────

export async function getBancariosAction(empleadoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data } = await db(supabase, "empleado_bancarios")
    .select("banco, tipo_cuenta, numero_cuenta, clabe, numero_tarjeta, salario_texto")
    .eq("empleado_id", empleadoId)
    .maybeSingle() as { data: BancariosData | null };

  return { data: data ?? null, error: null };
}

// ─── Guardar (upsert) ─────────────────────────────────────────────────────────

export async function guardarBancariosAction(empleadoId: string, datos: BancariosData) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const { error } = await db(supabase, "empleado_bancarios")
    .upsert({ empleado_id: empleadoId, ...datos, updated_at: new Date().toISOString() }) as { error: unknown };

  if (error) return { error: "Error al guardar datos bancarios" };

  // Bitácora
  await db(supabase, "empleado_bitacora").insert({
    empleado_id: empleadoId,
    usuario_id:  userId,
    accion:      "ACTUALIZAR_BANCARIOS",
  });

  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { success: true };
}

// ─── Log de consulta de campo sensible ───────────────────────────────────────

export async function logConsultaBancarioAction(empleadoId: string, campo: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return;

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await db(supabase, "empleado_bitacora").insert({
    empleado_id:  empleadoId,
    usuario_id:   userId,
    accion:       "CONSULTA_BANCARIOS",
    detalle_json: { campo, ip },
  });
}
