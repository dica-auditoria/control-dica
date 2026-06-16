"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { RegistrarAsistenciaInput, RegistroAsistencia } from "@/types/asistencia";

interface PerfilRow { rol: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  insert: (...args: unknown[]) => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  gte: (...args: unknown[]) => DbQuery;
  lte: (...args: unknown[]) => DbQuery;
  in: (...args: unknown[]) => DbQuery;
  not: (...args: unknown[]) => DbQuery;
  order: (...args: unknown[]) => DbQuery;
  single: () => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin", "rrhh"].includes(perfil.rol))
    return { supabase: null, error: "Acción no autorizada" };
  return { supabase, error: null };
}

function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function calcularGeofencing(supabase: SupabaseServer, lat: number, lng: number, ubicacionId?: string | null) {
  let oficinas: Array<{ id: string; lat: number; lng: number; radio_metros: number; nombre: string }> = [];

  if (ubicacionId) {
    const { data } = await db(supabase, "ubicaciones")
      .select("id, lat, lng, radio_metros, nombre").eq("id", ubicacionId).eq("tipo", "oficina").eq("activo", true).single() as {
        data: { id: string; lat: number | null; lng: number | null; radio_metros: number; nombre: string } | null;
      };
    if (data?.lat !== null && data?.lat !== undefined && data.lng !== null && data.lng !== undefined) {
      oficinas = [{ ...data, lat: data.lat, lng: data.lng }];
    }
  } else {
    const { data } = await db(supabase, "ubicaciones")
      .select("id, lat, lng, radio_metros, nombre").eq("tipo", "oficina").eq("activo", true).not("lat", "is", null) as {
        data: Array<{ id: string; lat: number; lng: number; radio_metros: number; nombre: string }> | null;
      };
    oficinas = data ?? [];
  }

  if (!oficinas.length) return { ubicacionId: ubicacionId ?? null, distancia: null, dentroRadio: null };

  let minDist = Infinity, nearest = oficinas[0];
  for (const o of oficinas) {
    const d = haversineMetros(lat, lng, o.lat, o.lng);
    if (d < minDist) { minDist = d; nearest = o; }
  }
  return {
    ubicacionId: nearest.id,
    distancia: Math.round(minDist * 100) / 100,
    dentroRadio: minDist <= nearest.radio_metros,
  };
}

// ─── ADMIN: Registrar asistencia ─────────────────────────────────────────────

export async function registrarAsistenciaAction(input: RegistrarAsistenciaInput) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  let geo = { ubicacionId: input.ubicacion_id ?? null, distancia: null as number | null, dentroRadio: null as boolean | null };
  if (input.lat && input.lng) geo = await calcularGeofencing(supabase, input.lat, input.lng, input.ubicacion_id);

  const { data, error } = await db(supabase, "empleado_asistencia")
    .insert({ empleado_id: input.empleado_id, ubicacion_id: geo.ubicacionId, tipo: input.tipo, lat: input.lat ?? null, lng: input.lng ?? null, distancia_metros: geo.distancia, dentro_radio: geo.dentroRadio, notas: input.notas?.trim() || null, ip })
    .select("id").single() as { data: { id: string } | null; error: unknown };

  if (error) return { error: "Error al registrar la asistencia" };
  revalidatePath("/dashboard/asistencia");
  return { id: (data as { id: string })?.id, distancia: geo.distancia, dentroRadio: geo.dentroRadio };
}

// ─── PÚBLICO: Buscar empleado por código o email ──────────────────────────────

export async function buscarEmpleadoCheckinAction(query: string) {
  const supabase = createClient();
  const q = query.trim();

  const { data: byCode } = await supabase
    .from("empleados").select("id, nombres, apellido_paterno, apellido_materno, codigo_empleado, departamento")
    .eq("codigo_empleado", q.toUpperCase()).eq("estado", "activo").maybeSingle();

  const { data: byEmail } = byCode ? { data: null } : await supabase
    .from("empleados").select("id, nombres, apellido_paterno, apellido_materno, codigo_empleado, departamento")
    .eq("email_institucional", q.toLowerCase()).eq("estado", "activo").maybeSingle();

  const emp = byCode ?? byEmail;
  if (!emp) return { error: "Empleado no encontrado o inactivo" };

  const e = emp as { id: string; nombres: string; apellido_paterno: string; apellido_materno: string; codigo_empleado: string | null; departamento: string };
  return {
    empleado: {
      id: e.id,
      nombre: `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno}`.trim(),
      codigo: e.codigo_empleado,
      departamento: e.departamento,
    }
  };
}

// ─── PÚBLICO: Resumen de hoy para un empleado ────────────────────────────────

export async function obtenerResumenHoyAction(empleadoId: string) {
  const admin = createAdminClient();

  // México City es UTC-6 sin DST desde 2023
  const mxDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const inicioUTC = new Date(`${mxDateStr}T00:00:00-06:00`).toISOString();
  const finUTC    = new Date(`${mxDateStr}T23:59:59-06:00`).toISOString();

  const { data } = await (admin.from("empleado_asistencia") as any)
    .select("tipo, created_at, dentro_radio, distancia_metros")
    .eq("empleado_id", empleadoId)
    .gte("created_at", inicioUTC)
    .lte("created_at", finUTC)
    .order("created_at", { ascending: true }) as { data: Array<{ tipo: string; created_at: string; dentro_radio: boolean | null; distancia_metros: number | null }> | null };

  const registros = data ?? [];
  const entradas  = registros.filter(r => r.tipo === "entrada");
  const salidas   = registros.filter(r => r.tipo === "salida");
  const primera   = entradas[0]?.created_at ?? null;
  const ultima    = salidas[salidas.length - 1]?.created_at ?? null;
  const ultimoTipo = registros[registros.length - 1]?.tipo as "entrada" | "salida" | null ?? null;

  let horas = "--:--";
  if (primera && ultima) {
    const diff = (new Date(ultima).getTime() - new Date(primera).getTime()) / 1000;
    const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60);
    horas = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return { primera, ultima, horas, ultimoTipo, totalRegistros: registros.length };
}

// ─── AUTENTICADO: Obtener empleado del usuario logueado ───────────────────────

export async function getEmpleadoParaCheckinAuthAction() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", empleado: null, rol: null };

  const { data: perfil } = await supabase
    .from("usuarios").select("nombre, rol").eq("id", user.id).single() as {
      data: { nombre: string; rol: string } | null; error: unknown;
    };
  if (!perfil) return { error: "Perfil no encontrado", empleado: null, rol: null };

  const email = user.email ?? "";
  const admin = createAdminClient();
  const { data: emp } = await admin
    .from("empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, codigo_empleado, departamento")
    .eq("email_institucional", email)
    .in("estado", ["activo", "pendiente"])
    .maybeSingle() as {
      data: { id: string; nombres: string; apellido_paterno: string; apellido_materno: string; codigo_empleado: string | null; departamento: string } | null;
      error: unknown;
    };

  const empleado = emp
    ? {
        id: emp.id,
        nombre: `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno}`.trim(),
        codigo: emp.codigo_empleado,
        departamento: emp.departamento,
      }
    : {
        id: null as string | null,
        nombre: perfil.nombre,
        codigo: null as string | null,
        departamento: "DICA",
      };

  return { error: null, empleado, rol: perfil.rol };
}

// ─── AUTENTICADO: Crear perfil de empleado para usuario admin/superadmin ───────

export async function crearPerfilEmpleadoAuthAction(input: {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  puesto: string;
  departamento: string;
  fecha_ingreso: string;
  tipo_contrato: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "No autenticado", empleadoId: null };

  const { data: perfil } = await supabase
    .from("usuarios").select("rol, nombre").eq("id", user.id).single() as {
      data: { rol: string; nombre: string } | null; error: unknown;
    };
  if (!perfil) return { error: "Perfil no encontrado", empleadoId: null };

  const { data: existing } = await supabase
    .from("empleados").select("id").eq("email_institucional", user.email).maybeSingle();
  if (existing) return { error: "Ya tienes un perfil de empleado registrado", empleadoId: null };

  // Generate employee code
  const { data: last } = await supabase
    .from("empleados").select("codigo_empleado")
    .not("codigo_empleado", "is", null)
    .order("created_at", { ascending: false })
    .limit(1).maybeSingle() as { data: { codigo_empleado: string | null } | null; error: unknown };
  const lastNum = last?.codigo_empleado
    ? parseInt(last.codigo_empleado.replace(/\D/g, "").slice(-3) || "0", 10)
    : 0;
  const codigo = `DICA-ADM-${String(lastNum + 1).padStart(3, "0")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emp, error } = await (supabase.from("empleados") as any)
    .insert({
      nombres:          input.nombres.trim(),
      apellido_paterno: input.apellido_paterno.trim(),
      apellido_materno: input.apellido_materno.trim(),
      email_institucional: user.email,
      email_local: user.email.split("@")[0],
      puesto:           input.puesto.trim(),
      departamento:     input.departamento,
      fecha_ingreso:    input.fecha_ingreso,
      tipo_contrato:    input.tipo_contrato,
      estado:           "activo",
      codigo_empleado:  codigo,
      progreso_perfil:  20,
    })
    .select("id").single() as { data: { id: string } | null; error: { message?: string } | null };

  if (error) return { error: "Error al crear el perfil: " + (error.message ?? ""), empleadoId: null };

  // Bootstrap datos_personales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_datos_personales") as any).insert({
    empleado_id: emp!.id, nacionalidad: "Mexicana",
  });

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/mi-asistencia");
  return { error: null, empleadoId: emp!.id };
}

// ─── PÚBLICO: Registrar check-in/out ─────────────────────────────────────────

export async function registrarCheckinPublicoAction(input: {
  empleado_id: string;
  tipo: "entrada" | "salida";
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
}) {
  const supabase = createClient();

  const { data: emp } = await supabase
    .from("empleados").select("id, departamento, tipo_contrato, hora_entrada, tolerancia_minutos")
    .eq("id", input.empleado_id).eq("estado", "activo").maybeSingle() as {
      data: { id: string; departamento: string; tipo_contrato: string; hora_entrada: string | null; tolerancia_minutos: number | null } | null;
      error: unknown;
    };
  if (!emp) return { error: "Empleado no encontrado" };

  const DEPTS_SIN_CHECKIN = ["Dirección General", "Dirección de Administración"];
  if (DEPTS_SIN_CHECKIN.includes(emp.departamento))
    return { error: "El check-in no aplica para este departamento" };

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // Rechazar GPS con precisión sospechosa (spoofers frecuentemente reportan 0 o valores irreales)
  if (input.accuracy !== null && input.accuracy !== undefined && input.accuracy > 500) {
    return { error: "La precisión del GPS es demasiado baja para registrar tu ubicación. Intenta en un área con mejor señal." };
  }

  let geo = { ubicacionId: null as string | null, distancia: null as number | null, dentroRadio: null as boolean | null };
  if (input.lat && input.lng) geo = await calcularGeofencing(supabase, input.lat, input.lng, null);

  if (geo.dentroRadio === false) {
    const suffix = geo.distancia !== null ? ` — estás a ${Math.round(geo.distancia)} m del punto de registro` : "";
    return { error: `Estás fuera del área de registro${suffix}` };
  }

  // Validate schedule for practicas employees on entrada
  if (input.tipo === "entrada" && emp.tipo_contrato === "practicas" && emp.hora_entrada) {
    const nowMX = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    const currentMinutes = nowMX.getHours() * 60 + nowMX.getMinutes();
    const [hh, mm] = emp.hora_entrada.split(":").map(Number);
    const scheduleMinutes = hh * 60 + mm;
    const tolerance = emp.tolerancia_minutos ?? 10;
    if (currentMinutes > scheduleMinutes + tolerance) {
      const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      return { error: `Entrada fuera de horario — tu hora era ${fmt(scheduleMinutes)}, con tolerancia hasta las ${fmt(scheduleMinutes + tolerance)}` };
    }
  }

  // Use admin client to bypass RLS — validation already done above
  const admin = createAdminClient();
  const { error } = await (admin.from("empleado_asistencia") as any).insert({
    empleado_id: input.empleado_id, ubicacion_id: geo.ubicacionId,
    tipo: input.tipo, lat: input.lat ?? null, lng: input.lng ?? null,
    distancia_metros: geo.distancia, dentro_radio: geo.dentroRadio, ip,
  }) as { error: unknown };

  if (error) return { error: "Error al registrar" };
  return { success: true, distancia: geo.distancia, dentroRadio: geo.dentroRadio };
}

// ─── ADMIN: Listar registros del día ─────────────────────────────────────────

export async function fetchAsistenciaAction(opts?: { fecha?: string; empleadoId?: string; tipo?: "entrada" | "salida" }) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const fecha = opts?.fecha ?? new Date().toISOString().split("T")[0];
  let query = db(supabase, "empleado_asistencia")
    .select("id, empleado_id, ubicacion_id, tipo, lat, lng, distancia_metros, dentro_radio, notas, created_at")
    .gte("created_at", `${fecha}T00:00:00`).lte("created_at", `${fecha}T23:59:59`)
    .order("created_at", { ascending: false });

  if (opts?.empleadoId) query = query.eq("empleado_id", opts.empleadoId);
  if (opts?.tipo) query = query.eq("tipo", opts.tipo);

  const { data: rows, error } = await query as { data: Array<Record<string, unknown>> | null; error: unknown };
  if (error) return { error: "Error al cargar", data: null };

  const empIds = Array.from(new Set((rows ?? []).map(r => r.empleado_id as string)));
  const ubIds  = Array.from(new Set((rows ?? []).map(r => r.ubicacion_id as string).filter(Boolean)));

  const [rE, rU] = await Promise.all([
    empIds.length
      ? db(supabase, "empleados").select("id, nombres, apellido_paterno, codigo_empleado").in("id", empIds) as unknown as PromiseLike<{ data: Array<{ id: string; nombres: string; apellido_paterno: string; codigo_empleado: string | null }> | null }>
      : Promise.resolve({ data: [] }),
    ubIds.length
      ? db(supabase, "ubicaciones").select("id, nombre").in("id", ubIds) as unknown as PromiseLike<{ data: Array<{ id: string; nombre: string }> | null }>
      : Promise.resolve({ data: [] }),
  ]);

  const empMap = new Map<string, { nombre: string; codigo: string | null }>();
  for (const e of (rE.data ?? []) as Array<{ id: string; nombres: string; apellido_paterno: string; codigo_empleado: string | null }>) {
    empMap.set(e.id, { nombre: `${e.nombres} ${e.apellido_paterno}`, codigo: e.codigo_empleado });
  }
  const ubMap = new Map<string, string>();
  for (const u of (rU.data ?? []) as Array<{ id: string; nombre: string }>) ubMap.set(u.id, u.nombre);

  const data: RegistroAsistencia[] = (rows ?? []).map(r => ({
    id: r.id as string, empleado_id: r.empleado_id as string,
    empleado_nombre: empMap.get(r.empleado_id as string)?.nombre ?? "—",
    empleado_codigo: empMap.get(r.empleado_id as string)?.codigo ?? null,
    ubicacion_id: (r.ubicacion_id as string) ?? null,
    ubicacion_nombre: r.ubicacion_id ? (ubMap.get(r.ubicacion_id as string) ?? "—") : null,
    tipo: r.tipo as "entrada" | "salida",
    lat: (r.lat as number) ?? null, lng: (r.lng as number) ?? null,
    distancia_metros: (r.distancia_metros as number) ?? null,
    dentro_radio: (r.dentro_radio as boolean) ?? null,
    notas: (r.notas as string) ?? null,
    created_at: r.created_at as string,
  }));

  return { data, error: null };
}

// ─── ADMIN: Reporte por rango de fechas ──────────────────────────────────────

export interface ReporteEmpleadoDia {
  fecha: string;
  status: "a_tiempo" | "tardanza" | "no_registrado" | "vacaciones" | "permiso" | "comision";
  entrada: string | null;
  salida: string | null;
  distancia: number | null;
  dentroRadio: boolean | null;
}

export interface ReporteEmpleado {
  id: string;
  nombre: string;
  codigo: string | null;
  departamento: string;
  dias: Record<string, ReporteEmpleadoDia>;
  presentes: number;
  tardanzas: number;
  ausentes: number;
  porcentaje: number;
}

export async function fetchReporteRangoAction(opts: {
  fechaInicio: string;
  fechaFin: string;
  horaEntrada?: string;
  horaTolerancias?: string;
  departamento?: string;
}) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null, fechas: [] as string[] };

  const horaEntrada = opts.horaEntrada ?? "09:00";
  // Tardanza se calcula contra la tolerancia; si no se indica, usa la hora de entrada
  const horaTolerancias = opts.horaTolerancias ?? horaEntrada;
  const [hh, mm] = horaTolerancias.split(":").map(Number);

  // All active employees
  let empQuery = db(supabase, "empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, codigo_empleado, departamento")
    .in("estado", ["activo", "pendiente"])
    .order("apellido_paterno");
  if (opts.departamento && opts.departamento !== "todos") empQuery = empQuery.eq("departamento", opts.departamento);

  const { data: empleados } = await empQuery as { data: Array<{ id: string; nombres: string; apellido_paterno: string; apellido_materno: string; codigo_empleado: string | null; departamento: string }> | null };

  // All attendance records in range
  const { data: registros } = await db(supabase, "empleado_asistencia")
    .select("empleado_id, tipo, created_at, distancia_metros, dentro_radio")
    .gte("created_at", `${opts.fechaInicio}T00:00:00`)
    .lte("created_at", `${opts.fechaFin}T23:59:59`)
    .order("created_at") as { data: Array<{ empleado_id: string; tipo: string; created_at: string; distancia_metros: number | null; dentro_radio: boolean | null }> | null };

  // Vacaciones aprobadas (tabla legacy)
  const { data: vacaciones } = await (supabase.from("solicitudes_vacaciones") as any)
    .select("empleado_id, tipo, fecha_inicio, fecha_fin")
    .eq("estado", "aprobado")
    .lte("fecha_inicio", opts.fechaFin)
    .gte("fecha_fin", opts.fechaInicio) as { data: Array<{ empleado_id: string; tipo: string; fecha_inicio: string; fecha_fin: string }> | null };

  // Comisiones y permisos activos (desde que supervisor autoriza, sin esperar RH)
  const { data: otrosAprobados } = await (supabase.from("solicitudes_otros") as any)
    .select("empleado_id, tipo, fecha_inicio, fecha_fin")
    .in("estado", ["pendiente_rh", "aprobado_rh"])
    .lte("fecha_inicio", opts.fechaFin)
    .gte("fecha_fin", opts.fechaInicio) as { data: Array<{ empleado_id: string; tipo: string; fecha_inicio: string; fecha_fin: string }> | null };

  // Índice unificado por empleado+fecha → status
  const vacTipoIdx = new Map<string, string>();
  const indexarRango = (items: Array<{ empleado_id: string; tipo: string; fecha_inicio: string; fecha_fin: string }>) => {
    for (const v of items) {
      const cur = new Date(v.fecha_inicio + "T12:00:00");
      const fin2 = new Date(v.fecha_fin + "T12:00:00");
      while (cur <= fin2) {
        const dia = cur.toISOString().split("T")[0];
        vacTipoIdx.set(`${v.empleado_id}__${dia}`, v.tipo);
        cur.setDate(cur.getDate() + 1);
      }
    }
  };
  indexarRango(vacaciones ?? []);
  indexarRango(otrosAprobados ?? []);

  // Build date range
  const fechas: string[] = [];
  const d = new Date(opts.fechaInicio);
  const fin = new Date(opts.fechaFin);
  while (d <= fin) {
    fechas.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }

  // Index records by empleado+fecha
  const idx = new Map<string, { entradas: string[]; salidas: string[]; distancia: number | null; dentroRadio: boolean | null }>();
  for (const r of registros ?? []) {
    const fecha = r.created_at.split("T")[0];
    const key = `${r.empleado_id}__${fecha}`;
    if (!idx.has(key)) idx.set(key, { entradas: [], salidas: [], distancia: r.distancia_metros, dentroRadio: r.dentro_radio });
    const entry = idx.get(key)!;
    if (r.tipo === "entrada") entry.entradas.push(r.created_at);
    else entry.salidas.push(r.created_at);
    if (r.distancia_metros !== null) entry.distancia = r.distancia_metros;
    if (r.dentro_radio !== null) entry.dentroRadio = r.dentro_radio;
  }

  const data: ReporteEmpleado[] = (empleados ?? []).map(e => {
    const dias: Record<string, ReporteEmpleadoDia> = {};
    let presentes = 0, tardanzas = 0, diasVacaciones = 0;

    for (const fecha of fechas) {
      const key = `${e.id}__${fecha}`;
      const rec = idx.get(key);
      if (!rec || !rec.entradas.length) {
        const vacKey = `${e.id}__${fecha}`;
        const vacTipo = vacTipoIdx.get(vacKey);
        if (vacTipo) {
          const statusMap: Record<string, ReporteEmpleadoDia["status"]> = {
            vacaciones: "vacaciones", permiso_con_goce: "permiso", permiso_sin_goce: "permiso",
            permiso: "permiso", comision: "comision",
          };
          const status: ReporteEmpleadoDia["status"] = statusMap[vacTipo] ?? "no_registrado";
          dias[fecha] = { fecha, status, entrada: null, salida: null, distancia: null, dentroRadio: null };
          diasVacaciones++;
        } else {
          dias[fecha] = { fecha, status: "no_registrado", entrada: null, salida: null, distancia: null, dentroRadio: null };
        }
      } else {
        const entradaTs = rec.entradas[0];
        const salidaTs  = rec.salidas[rec.salidas.length - 1] ?? null;
        const entradaDt = new Date(entradaTs);
        const esTardanza = entradaDt.getHours() > hh || (entradaDt.getHours() === hh && entradaDt.getMinutes() > mm);
        dias[fecha] = {
          fecha, status: esTardanza ? "tardanza" : "a_tiempo",
          entrada: entradaTs, salida: salidaTs,
          distancia: rec.distancia, dentroRadio: rec.dentroRadio,
        };
        presentes++;
        if (esTardanza) tardanzas++;
      }
    }

    const ausentes = fechas.length - presentes - diasVacaciones;
    return {
      id: e.id,
      nombre: `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno}`.trim(),
      codigo: e.codigo_empleado,
      departamento: e.departamento,
      dias, presentes, tardanzas, ausentes,
      porcentaje: fechas.length > 0 ? Math.round((presentes / fechas.length) * 100) : 0,
    };
  });

  return { data, fechas, error: null };
}
