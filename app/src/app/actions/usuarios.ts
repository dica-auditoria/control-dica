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

const DEPTS_ACCESO_CLIENTES = [
  "Dirección General",
  "Dirección de Administración",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
  "Coordinación de Sistemas",
  "Líderes de Auditoría",
];

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, rol: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) return { supabase: null, userId: null, rol: null, error: "Acción no autorizada" };

  // Admins siempre tienen acceso
  if (["admin", "superadmin"].includes(perfil.rol)) {
    return { supabase, userId: user.id, rol: perfil.rol, error: null };
  }

  // Empleados/RRHH en departamentos autorizados también tienen acceso
  if (["empleado", "rrhh"].includes(perfil.rol)) {
    const admin = createAdminClient();
    const empleadoId = user.user_metadata?.empleado_id as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = empleadoId
      ? (admin.from("empleados") as any).select("departamento").eq("id", empleadoId).maybeSingle()
      : user.email
        ? (admin.from("empleados") as any).select("departamento").eq("email_institucional", user.email).maybeSingle()
        : null;

    if (q) {
      const { data: emp } = await q as { data: { departamento: string } | null };
      if (emp && DEPTS_ACCESO_CLIENTES.includes(emp.departamento)) {
        return { supabase, userId: user.id, rol: perfil.rol, error: null };
      }
    }
  }

  return { supabase: null, userId: null, rol: null, error: "Acción no autorizada" };
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
  contratos_ids?: string[];
  emails_acceso?: string[];
  area?: string | null;
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
      emails_acceso: args.emails_acceso?.filter(e => e.trim()) ?? [],
    },
  });

  if (createErr) {
    if (createErr.message.includes("already")) return { error: "Ya existe un usuario con ese correo" };
    return { error: createErr.message };
  }

  // Primer contrato como campo legacy contrato_id
  const primeraContrato = args.contratos_ids?.[0] ?? null;
  const extraUpdate: Record<string, unknown> = {};
  if (primeraContrato) extraUpdate.contrato_id = primeraContrato;
  if (args.area?.trim()) extraUpdate.area = args.area.trim();
  if (Object.keys(extraUpdate).length > 0) {
    await admin.from("usuarios").update(extraUpdate).eq("id", data.user.id);
  }

  // Guardar todos los contratos en la tabla relacional
  const contratosIds = (args.contratos_ids ?? []).filter(Boolean);
  if (contratosIds.length > 0) {
    await admin.from("usuario_contratos").insert(
      contratosIds.map(cid => ({ usuario_id: data.user.id, contrato_id: cid }))
    );
  }

  await auditAcceso(supabase, userId, "USER_CREATE", {
    email: args.email.trim().toLowerCase(),
    nombre: args.nombre.trim(),
    rol: args.rol,
    entidad_id: args.entidad_id,
    contratos_ids: contratosIds,
  }, data.user.id);

  // Crear cuenta para cada correo de acceso adicional con la misma contraseña
  const correosFiltrados = (args.emails_acceso ?? []).map(e => e.trim().toLowerCase()).filter(Boolean);
  for (const correo of correosFiltrados) {
    const nombreExtra = correo.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    const { data: extraUser } = await admin.auth.admin.createUser({
      email: correo,
      password: args.password,
      email_confirm: true,
      user_metadata: {
        nombre: nombreExtra,
        rol: "cliente",
        entidad_id: args.entidad_id ?? undefined,
      },
    });
    if (extraUser?.user) {
      const extraUpd: Record<string, unknown> = {};
      if (primeraContrato) extraUpd.contrato_id = primeraContrato;
      if (args.area?.trim()) extraUpd.area = args.area.trim();
      if (Object.keys(extraUpd).length > 0) {
        await admin.from("usuarios").update(extraUpd).eq("id", extraUser.user.id);
      }
      if (contratosIds.length > 0) {
        await admin.from("usuario_contratos").insert(
          contratosIds.map(cid => ({ usuario_id: extraUser.user!.id, contrato_id: cid }))
        );
      }
      await auditAcceso(supabase, userId, "USER_CREATE", {
        email: correo,
        nombre: nombreExtra,
        rol: "cliente",
        entidad_id: args.entidad_id,
        contratos_ids: args.contratos_ids ?? [],
        creado_como_acceso_adicional: true,
      }, extraUser.user.id);
    }
  }

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/clientes");
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

// ---------- EDITAR USUARIO CLIENTE ----------

export interface EditarClienteArgs {
  userId: string;
  nombre?: string;
  email?: string;
  password?: string;
  area?: string | null;
}

export async function editarClienteAction(args: EditarClienteArgs) {
  const { supabase, userId: actorId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !actorId) return { error: authErr };

  const admin = createAdminClient();

  const authUpdate: Record<string, unknown> = {};
  if (args.email?.trim())    authUpdate.email    = args.email.trim().toLowerCase();
  if (args.password?.trim()) authUpdate.password = args.password;
  if (args.nombre?.trim())   authUpdate.user_metadata = { nombre: args.nombre.trim() };

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(args.userId, authUpdate);
    if (error) return { error: error.message };
  }

  const tableUpdate: Record<string, unknown> = {};
  if (args.nombre?.trim()) tableUpdate.nombre = args.nombre.trim();
  if (args.email?.trim())  tableUpdate.email  = args.email.trim().toLowerCase();
  if ("area" in args)      tableUpdate.area   = args.area?.trim() || null;

  if (Object.keys(tableUpdate).length > 0) {
    await admin.from("usuarios").update(tableUpdate).eq("id", args.userId);
  }

  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/usuarios");
  return { success: true };
}

// ---------- TOGGLE ACTIVO ----------

export async function toggleActivoClienteAction(userId: string, activo: boolean) {
  const { supabase, userId: actorId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !actorId) return { error: authErr };

  const admin = createAdminClient();

  await admin.auth.admin.updateUserById(userId, {
    ban_duration: activo ? "none" : "87600h",
  });

  await admin.from("usuarios").update({ activo }).eq("id", userId);

  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/usuarios");
  return { success: true };
}

// ---------- ELIMINAR USUARIO ----------

export async function eliminarClienteAction(userId: string) {
  const { supabase, userId: actorId, rol, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !actorId) return { error: authErr };
  if (!["superadmin", "empleado", "rrhh"].includes(rol ?? "")) return { error: "Sin permisos para eliminar usuarios" };
  if (userId === actorId) return { error: "No puedes eliminar tu propia cuenta" };

  const admin = createAdminClient();

  // Limpiar registros relacionados antes de borrar de auth (evita FK constraint)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adm = admin as any;
  await Promise.allSettled([
    adm.from("usuario_contratos").delete().eq("usuario_id", userId),
    adm.from("solicitudes_eliminacion").delete().eq("usuario_id", userId),
    adm.from("credenciales_acceso").delete().eq("usuario_id", userId),
    adm.from("requerimientos_acceso").delete().eq("usuario_id", userId),
  ]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: `Error al eliminar: ${error.message}` };

  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/usuarios");
  return { success: true };
}

// ---------- CONTRATOS DE UN USUARIO ----------

export interface UsuarioContratoItem {
  id: string;
  nombre: string;
  numero_contrato: string | null;
  entidad_nombre: string | null;
}

export async function fetchUserContratosAction(userId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usuario_contratos")
    .select("contrato_id, contratos(id, nombre, numero_contrato, entidades(nombre))")
    .eq("usuario_id", userId) as {
      data: Array<{
        contrato_id: string;
        contratos: { id: string; nombre: string; numero_contrato: string | null; entidades: { nombre: string } | null } | null;
      }> | null;
      error: unknown;
    };

  if (error) return { error: "Error al cargar contratos", data: null };

  const items: UsuarioContratoItem[] = (data ?? [])
    .filter(r => r.contratos)
    .map(r => ({
      id: r.contratos!.id,
      nombre: r.contratos!.nombre,
      numero_contrato: r.contratos!.numero_contrato,
      entidad_nombre: r.contratos!.entidades?.nombre ?? null,
    }));

  return { data: items, error: null };
}

export async function updateUserContratosAction(userId: string, contratosIds: string[]) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const admin = createAdminClient();

  // Reemplazar todos los contratos
  await admin.from("usuario_contratos").delete().eq("usuario_id", userId);

  const ids = contratosIds.filter(Boolean);
  if (ids.length > 0) {
    const { error } = await admin.from("usuario_contratos").insert(
      ids.map(cid => ({ usuario_id: userId, contrato_id: cid }))
    );
    if (error) return { error: "Error al guardar contratos" };
  }

  // Actualizar campo legacy contrato_id
  await admin.from("usuarios").update({ contrato_id: ids[0] ?? null }).eq("id", userId);

  revalidatePath("/dashboard/clientes");
  return { success: true };
}
