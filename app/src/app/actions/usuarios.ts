"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

interface PerfilRow { rol: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  insert: (...args: unknown[]) => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) {
    return { supabase: null, userId: null, error: "Acción no autorizada" };
  }
  return { supabase, userId: user.id, rol: perfil.rol, error: null };
}

async function getRequestIp() {
  const headersList = await headers();
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

async function auditAcceso(
  supabase: SupabaseServer,
  userId: string,
  accion: "USER_CREATE" | "USER_ROLE_UPDATE" | "USER_ENTITY_UPDATE",
  detalle: Record<string, unknown>,
  recursoId?: string | null
) {
  await db(supabase, "audit_log").insert({
    usuario_id: userId,
    accion,
    recurso_id: recursoId ?? null,
    detalle_json: detalle,
    ip: await getRequestIp(),
  });
}

// ---------- CREAR USUARIO ----------

export interface CrearUsuarioArgs {
  email: string;
  nombre: string;
  password: string;
  rol: "cliente" | "admin";
  entidad_id: string | null;
}

export async function crearUsuarioAction(args: CrearUsuarioArgs) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  if (args.rol === "cliente" && !args.entidad_id) {
    return { error: "Los clientes deben tener una entidad asignada" };
  }

  const admin = createAdminClient();

  const { data, error: createErr } = await admin.auth.admin.createUser({
    email: args.email.trim(),
    password: args.password,
    email_confirm: true,
    user_metadata: {
      nombre: args.nombre.trim(),
      rol: args.rol,
      entidad_id: args.entidad_id ?? undefined,
    },
  });

  if (createErr) {
    if (createErr.message.includes("already")) return { error: "Ya existe un usuario con ese correo" };
    return { error: createErr.message };
  }

  await auditAcceso(supabase, userId, "USER_CREATE", {
    email: args.email.trim().toLowerCase(),
    nombre: args.nombre.trim(),
    rol: args.rol,
    entidad_id: args.entidad_id,
  }, data.user.id);

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/audit-log");
  return { userId: data.user.id };
}

// ---------- ACTUALIZAR ROL ----------

export async function actualizarRolAction(userId: string, nuevoRol: string) {
  const { supabase, userId: actorId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !actorId) return { error: authErr };

  const admin = createAdminClient();
  const { data: actual } = await admin
    .from("usuarios")
    .select("rol, email, nombre")
    .eq("id", userId)
    .maybeSingle() as { data: { rol: string; email: string; nombre: string } | null };

  // Actualizar metadata en Auth
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { rol: nuevoRol },
  });

  // Actualizar en public.usuarios (usa admin client para saltear RLS)
  const { error } = await admin
    .from("usuarios")
    .update({ rol: nuevoRol })
    .eq("id", userId) as { error: unknown };

  if (error) return { error: "Error al actualizar el rol" };

  await auditAcceso(supabase, actorId, "USER_ROLE_UPDATE", {
    target_email: actual?.email ?? null,
    target_nombre: actual?.nombre ?? null,
    rol_anterior: actual?.rol ?? null,
    rol_nuevo: nuevoRol,
  }, userId);

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/audit-log");
  return { success: true };
}

// ---------- ACTUALIZAR ENTIDAD ----------

export async function actualizarEntidadAction(userId: string, entidadId: string | null) {
  const { supabase, userId: actorId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !actorId) return { error: authErr };

  const admin = createAdminClient();
  const { data: actual } = await admin
    .from("usuarios")
    .select("entidad_id, email, nombre")
    .eq("id", userId)
    .maybeSingle() as { data: { entidad_id: string | null; email: string; nombre: string } | null };

  const { error } = await admin
    .from("usuarios")
    .update({ entidad_id: entidadId })
    .eq("id", userId) as { error: unknown };

  if (error) return { error: "Error al actualizar la entidad" };

  await auditAcceso(supabase, actorId, "USER_ENTITY_UPDATE", {
    target_email: actual?.email ?? null,
    target_nombre: actual?.nombre ?? null,
    entidad_anterior: actual?.entidad_id ?? null,
    entidad_nueva: entidadId,
  }, userId);

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/audit-log");
  return { success: true };
}
