"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  emailInstitucional,
  generarCodigoEmpleado,
  calcularProgresoPerfil,
} from "@/lib/empleados/utils";
import type { CrearEmpleadoInput } from "@/types/empleados";

interface PerfilRow { rol: string; id: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  order: (...args: unknown[]) => DbQuery;
  limit: (...args: unknown[]) => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

const EMPLEADOS_PATHS = [
  "/dashboard/empleados",
  "/dashboard/empleados/nuevo",
];

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, id")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) {
    return { supabase: null, userId: null, error: "Acción no autorizada" };
  }
  return { supabase, userId: perfil.id, error: null };
}

function revalidateEmpleados() {
  EMPLEADOS_PATHS.forEach(p => revalidatePath(p));
  revalidatePath("/dashboard/empleados", "layout");
}

// ---------- CREAR EMPLEADO ----------

export async function crearEmpleadoAction(input: CrearEmpleadoInput) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const email = emailInstitucional(input.email_local.trim().toLowerCase());
  const codigo = await generarCodigoEmpleado();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empleado, error } = await (supabase.from("empleados") as any)
    .insert({
      nombres: input.nombres.trim(),
      apellido_paterno: input.apellido_paterno.trim(),
      apellido_materno: input.apellido_materno.trim(),
      email_institucional: email,
      email_local: input.email_local.trim().toLowerCase(),
      puesto: input.puesto.trim(),
      departamento: input.departamento,
      supervisor_id: input.supervisor_id || null,
      fecha_ingreso: input.fecha_ingreso,
      tipo_contrato: input.tipo_contrato,
      zona_ubicacion: input.zona_ubicacion,
      ...(input.tipo_contrato === "practicas" && {
        hora_entrada: input.hora_entrada || null,
        hora_salida: input.hora_salida || null,
        tolerancia_minutos: 10,
      }),
      estado: "pendiente",
      codigo_empleado: codigo,
      progreso_perfil: 20,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: { message?: string } | null };

  if (error) {
    if (error.message?.includes("unique")) {
      return { error: "Ya existe un empleado con ese correo institucional" };
    }
    return { error: "Error al crear el empleado" };
  }

  if (!empleado) return { error: "Error al crear el empleado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_datos_personales") as any).insert({
    empleado_id: empleado.id,
    nacionalidad: "Mexicana",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_bitacora") as any).insert({
    empleado_id: empleado.id,
    usuario_id: userId,
    accion: "ALTA_EMPLEADO",
    detalle_json: { codigo_empleado: codigo },
  });

  // Si se proporcionó contraseña, crear el usuario en Auth directamente
  if (input.password && input.password.length >= 6) {
    const admin = createAdminClient();
    const fullName = `${input.nombres.trim()} ${input.apellido_paterno.trim()} ${input.apellido_materno.trim()}`;
    await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { nombre: fullName, rol: "empleado", empleado_id: empleado.id },
    });
  }

  const invitacion = await generarInvitacionEmpleadoAction(empleado.id);
  if (invitacion.error) {
    return { empleadoId: empleado.id, error: invitacion.error, token: null };
  }

  revalidateEmpleados();
  revalidatePath(`/dashboard/empleados/${empleado.id}`);

  return {
    empleadoId: empleado.id,
    token: invitacion.token,
    invitacionUrl: invitacion.invitacionUrl,
  };
}

// ---------- INVITACIÓN PRIVACIDAD ----------

export async function generarInvitacionEmpleadoAction(empleadoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("empleado_invitaciones") as any).insert({
    empleado_id: empleadoId,
    token,
    tipo: "privacidad",
    expires_at: expiresAt.toISOString(),
  });

  if (error) return { error: "Error al generar la invitación" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const invitacionUrl = `${baseUrl}/empleado/privacidad/${token}`;

  revalidateEmpleados();
  return { token, invitacionUrl };
}

// ---------- ACTUALIZAR EMPLEADO ----------

export async function actualizarEmpleadoAction(
  empleadoId: string,
  updates: Partial<CrearEmpleadoInput> & { estado?: string }
) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const payload: Record<string, unknown> = {};
  if (updates.nombres) payload.nombres = updates.nombres.trim();
  if (updates.apellido_paterno) payload.apellido_paterno = updates.apellido_paterno.trim();
  if (updates.apellido_materno) payload.apellido_materno = updates.apellido_materno.trim();
  if (updates.puesto) payload.puesto = updates.puesto.trim();
  if (updates.departamento) payload.departamento = updates.departamento;
  if (updates.supervisor_id !== undefined) payload.supervisor_id = updates.supervisor_id;
  if (updates.fecha_ingreso) payload.fecha_ingreso = updates.fecha_ingreso;
  if (updates.tipo_contrato) payload.tipo_contrato = updates.tipo_contrato;
  if (updates.zona_ubicacion) payload.zona_ubicacion = updates.zona_ubicacion;
  if (updates.estado) payload.estado = updates.estado;
  if (updates.email_local) {
    payload.email_local = updates.email_local.trim().toLowerCase();
    payload.email_institucional = emailInstitucional(payload.email_local as string);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("empleados") as any)
    .update(payload)
    .eq("id", empleadoId);

  if (error) return { error: "Error al actualizar el empleado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_bitacora") as any).insert({
    empleado_id: empleadoId,
    usuario_id: userId,
    accion: "ACTUALIZAR_EMPLEADO",
    detalle_json: payload,
  });

  revalidateEmpleados();
  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { success: true };
}

// ---------- GUARDAR PERFIL (datos personales) ----------

export interface GuardarPerfilEmpleadoInput {
  fecha_nacimiento?: string | null;
  curp?: string | null;
  rfc?: string | null;
  nss?: string | null;
  fecha_alta_imss?: string | null;
  estado_civil?: string | null;
  nacionalidad?: string | null;
  tipo_sangre?: string | null;
}

export async function guardarPerfilEmpleadoAction(
  empleadoId: string,
  datos: GuardarPerfilEmpleadoInput
) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("empleado_datos_personales") as any)
    .upsert({
      empleado_id: empleadoId,
      ...datos,
      updated_at: new Date().toISOString(),
    });

  if (error) return { error: "Error al guardar los datos personales" };

  const [
    { count: privCount },
    { count: docCount },
    { count: emergCount },
  ] = await Promise.all([
    supabase.from("empleado_privacidad").select("*", { count: "exact", head: true }).eq("empleado_id", empleadoId),
    supabase.from("empleado_documentos").select("*", { count: "exact", head: true }).eq("empleado_id", empleadoId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("empleado_emergencia") as any).select("*", { count: "exact", head: true }).eq("empleado_id", empleadoId) as Promise<{ count: number | null }>,
  ]);

  const progreso = calcularProgresoPerfil({
    tienePrivacidad: (privCount ?? 0) > 0,
    datosPersonales: datos,
    documentosCount: docCount ?? 0,
    tieneEmergencia: (emergCount ?? 0) > 0,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleados") as any)
    .update({ progreso_perfil: progreso })
    .eq("id", empleadoId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_bitacora") as any).insert({
    empleado_id: empleadoId,
    usuario_id: userId,
    accion: "ACTUALIZAR_PERFIL",
  });

  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { success: true, progreso };
}

// ---------- PRIVACIDAD (portal público vía RPC) ----------

export async function obtenerInvitacionAction(token: string) {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_invitacion_empleado", {
    p_token: token,
  }) as { data: Record<string, unknown> | null; error: { message?: string } | null };

  if (error) return { error: error.message ?? "Error al validar la invitación" };
  if (!data) return { error: "Invitación inválida" };
  if (data.error) return { error: (data.error as string) ?? "Invitación inválida" };

  return {
    empleado_id: data.empleado_id as string,
    nombre_completo: data.nombre_completo as string,
    email: data.email as string,
    tipo_invitacion: data.tipo_invitacion as string,
  };
}

export async function aceptarPrivacidadEmpleadoAction(
  token: string,
  aceptaAviso: boolean,
  aceptaSensibles: boolean
) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headersList.get("user-agent") ?? null;

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("aceptar_privacidad_empleado", {
    p_token: token,
    p_acepta_aviso: aceptaAviso,
    p_acepta_sensibles: aceptaSensibles,
    p_ip: ip,
    p_user_agent: userAgent,
  }) as { data: Record<string, unknown> | null; error: { message?: string } | null };

  if (error) return { error: error.message ?? "Error al registrar la aceptación" };
  if (!data) return { error: "No se pudo completar" };
  if (data.error) return { error: (data.error as string) ?? "No se pudo completar" };

  return { success: true, empleadoId: data.empleado_id as string };
}

// ---------- LISTADO (server-side fetch helper) ----------

export async function fetchEmpleadosListAction(filters?: {
  busqueda?: string;
  departamento?: string;
  estado?: string;
}) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null, stats: null };

  let query = supabase
    .from("empleados")
    .select(
      "id, nombres, apellido_paterno, apellido_materno, email_institucional, puesto, departamento, estado, progreso_perfil, fecha_ingreso, codigo_empleado"
    )
    .order("created_at", { ascending: false });

  if (filters?.departamento && filters.departamento !== "todos") {
    query = query.eq("departamento", filters.departamento);
  }
  if (filters?.estado && filters.estado !== "todos") {
    query = query.eq("estado", filters.estado);
  }

  const { data, error } = await query;

  if (error) return { error: "Error al cargar empleados", data: null, stats: null };

  let lista = (data ?? []) as Array<{
    id: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    email_institucional: string;
    puesto: string;
    departamento: string;
    estado: string;
    progreso_perfil: number;
    fecha_ingreso: string;
    codigo_empleado: string | null;
  }>;

  if (filters?.busqueda?.trim()) {
    const q = filters.busqueda.toLowerCase();
    lista = lista.filter(e => {
      const nombre = `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno}`.toLowerCase();
      return (
        nombre.includes(q) ||
        e.email_institucional.toLowerCase().includes(q) ||
        (e.codigo_empleado?.toLowerCase().includes(q) ?? false)
      );
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    { count: activos },
    { count: incompletos },
    { data: docsPorVencer },
  ] = await Promise.all([
    supabase.from("empleados").select("*", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("empleados").select("*", { count: "exact", head: true }).lt("progreso_perfil", 100),
    supabase
      .from("empleado_documentos")
      .select("id")
      .eq("estado", "por_vencer"),
  ]);

  const nuevosEsteMes = lista.filter(e => {
    // fecha_ingreso used as proxy if created_at not in list
    return new Date(e.fecha_ingreso) >= monthStart;
  }).length;

  const stats = {
    activos: activos ?? 0,
    perfilesIncompletos: incompletos ?? 0,
    documentosPorVencer: docsPorVencer?.length ?? 0,
    capacitacionesPendientes: 0,
    nuevosEsteMes,
  };

  return { data: lista, stats, error: null };
}

export async function fetchEmpleadoByIdAction(empleadoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data: emp, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", empleadoId)
    .single();

  if (error || !emp) return { error: "Empleado no encontrado", data: null };

  const empRow = emp as Record<string, unknown>;

  const [rDatos, rDocs, rPriv, rSupervisor, rBitacora] = await Promise.all([
    supabase.from("empleado_datos_personales").select("*").eq("empleado_id", empleadoId).maybeSingle(),
    supabase.from("empleado_documentos").select("*").eq("empleado_id", empleadoId).order("created_at"),
    supabase.from("empleado_privacidad").select("id").eq("empleado_id", empleadoId).limit(1),
    empRow.supervisor_id
      ? supabase
          .from("empleados")
          .select("nombres, apellido_paterno, apellido_materno")
          .eq("id", empRow.supervisor_id as string)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db(supabase, "empleado_bitacora")
      .select('id, accion, detalle_json, created_at')
      .eq('empleado_id', empleadoId)
      .order('created_at', { ascending: false })
      .limit(30) as unknown as Promise<{ data: unknown[] | null; error: unknown }>,
  ]);

  const sup = rSupervisor.data as {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  } | null;

  // Generar URL firmada para la foto si hay una ruta almacenada
  let foto_url: string | null = null;
  if (empRow.foto_url && typeof empRow.foto_url === "string" && !empRow.foto_url.startsWith("http")) {
    const { data: signed } = await supabase.storage
      .from("empleado-docs")
      .createSignedUrl(empRow.foto_url, 3600);
    foto_url = signed?.signedUrl ?? null;
  } else if (typeof empRow.foto_url === "string") {
    foto_url = empRow.foto_url;
  }

  return {
    error: null,
    data: {
      ...empRow,
      foto_url,
      supervisor_nombre: sup
        ? `${sup.nombres} ${sup.apellido_paterno} ${sup.apellido_materno}`
        : null,
      datos_personales: rDatos.data ?? null,
      documentos: rDocs.data ?? [],
      tiene_privacidad: (rPriv.data?.length ?? 0) > 0,
      bitacora: rBitacora.data ?? [],
    },
  };
}

// ---------- FOTO DE PERFIL ----------

export async function subirFotoEmpleadoAction(empleadoId: string, formData: FormData) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, url: null };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Sin archivo", url: null };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const ruta = `${empleadoId}/foto.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("empleado-docs")
    .upload(ruta, file, { upsert: true, contentType: file.type });

  if (uploadErr) return { error: "Error al subir la foto", url: null };

  // Guardar la ruta (no la URL firmada) — se genera URL fresca al cargar el perfil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleados") as any)
    .update({ foto_url: ruta })
    .eq("id", empleadoId);

  // Generar URL firmada de corta duración para retornar al cliente
  const { data: signed } = await supabase.storage
    .from("empleado-docs")
    .createSignedUrl(ruta, 3600);

  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { url: signed?.signedUrl ?? null, error: null };
}

export async function getFotoUrlAction(ruta: string) {
  const supabase = createClient();
  const { data } = await supabase.storage.from("empleado-docs").createSignedUrl(ruta, 3600);
  return data?.signedUrl ?? null;
}

// ---------- MI EXPEDIENTE (empleado ve su propio perfil) ----------

export async function fetchMiExpedienteAction() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "No autenticado", data: null, esAdmin: false };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: { rol: string } | null; error: unknown };

  if (!perfil) return { error: "Perfil no encontrado", data: null, esAdmin: false };

  const esAdmin = ["admin", "superadmin"].includes(perfil.rol);

  const { data: emp, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("email_institucional", user.email ?? "")
    .maybeSingle();

  if (error || !emp) return { error: "No se encontró tu expediente de empleado", data: null, esAdmin };

  const empRow = emp as Record<string, unknown>;

  const [rDatos, rDocs, rPriv, rSupervisor, rBitacora] = await Promise.all([
    supabase.from("empleado_datos_personales").select("*").eq("empleado_id", empRow.id as string).maybeSingle(),
    supabase.from("empleado_documentos").select("*").eq("empleado_id", empRow.id as string).order("created_at"),
    supabase.from("empleado_privacidad").select("id").eq("empleado_id", empRow.id as string).limit(1),
    empRow.supervisor_id
      ? supabase.from("empleados").select("nombres, apellido_paterno, apellido_materno").eq("id", empRow.supervisor_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("empleado_bitacora" as never)
      .select("id, accion, detalle_json, created_at")
      .eq("empleado_id", empRow.id as string)
      .order("created_at", { ascending: false })
      .limit(20) as unknown as Promise<{ data: unknown[] | null; error: unknown }>,
  ]);

  const sup = rSupervisor.data as { nombres: string; apellido_paterno: string; apellido_materno: string } | null;

  let foto_url: string | null = null;
  if (empRow.foto_url && typeof empRow.foto_url === "string" && !empRow.foto_url.startsWith("http")) {
    const { data: signed } = await supabase.storage.from("empleado-docs").createSignedUrl(empRow.foto_url, 3600);
    foto_url = signed?.signedUrl ?? null;
  } else if (typeof empRow.foto_url === "string") {
    foto_url = empRow.foto_url;
  }

  return {
    error: null,
    esAdmin,
    data: {
      ...empRow,
      foto_url,
      supervisor_nombre: sup ? `${sup.nombres} ${sup.apellido_paterno} ${sup.apellido_materno}` : null,
      datos_personales: rDatos.data ?? null,
      documentos: rDocs.data ?? [],
      tiene_privacidad: (rPriv.data?.length ?? 0) > 0,
      bitacora: rBitacora.data ?? [],
    },
  };
}

// ---------- SUBORDINADOS (supervisor ve su equipo) ----------

export async function eliminarEmpleadoAction(empleadoId: string) {
  await verificarAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("empleados").delete().eq("id", empleadoId);
  if (error) return { error: "No se puede eliminar: el empleado tiene registros asociados." };
  revalidatePath("/dashboard/empleados");
  return { success: true };
}

export async function fetchSubordinadosAction() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", data: null, empleadoId: null };

  const { data: emp } = await supabase
    .from("empleados")
    .select("id")
    .eq("email_institucional", user.email ?? "")
    .maybeSingle() as { data: { id: string } | null; error: unknown };

  if (!emp) return { error: "No se encontró tu expediente", data: null, empleadoId: null };

  const { data, error } = await supabase
    .from("empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, email_institucional, puesto, departamento, estado, progreso_perfil, fecha_ingreso, codigo_empleado")
    .eq("supervisor_id", emp.id)
    .order("apellido_paterno");

  if (error) return { error: "Error al cargar equipo", data: null, empleadoId: emp.id };

  return { error: null, data: data ?? [], empleadoId: emp.id };
}
