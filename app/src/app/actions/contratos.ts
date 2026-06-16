"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CrearContratoInput, ActualizarContratoInput, Contrato, EmpleadoAcceso } from "@/types/contratos";

interface PerfilRow { rol: string }

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol))
    return { supabase: null, userId: null, error: "Acción no autorizada" };

  return { supabase, userId: user.id, error: null };
}

async function logContrato(userId: string, accion: string, contratoId: string, entidadId: string, detalle?: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("audit_log") as any).insert({
      usuario_id: userId,
      entidad_id: entidadId,
      accion,
      recurso_id: contratoId,
      detalle_json: detalle ?? {},
    });
  } catch { /* non-critical */ }
}

function revalidateClientes(entidadId?: string) {
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/directorio");
  if (entidadId) {
    revalidatePath(`/dashboard/clientes/${entidadId}`);
    revalidatePath(`/dashboard/directorio/empresa/${entidadId}`);
  }
}

// ---------- LISTAR CONTRATOS DE UNA ENTIDAD ----------

export async function fetchContratosAction(entidadId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("contratos") as any)
    .select("*")
    .eq("entidad_id", entidadId)
    .order("created_at", { ascending: false }) as { data: Contrato[] | null; error: unknown };

  if (error) return { error: "Error al cargar contratos", data: null };
  return { data: data ?? [], error: null };
}

// ---------- CREAR CONTRATO ----------

export async function crearContratoAction(input: CrearContratoInput) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  const payload = {
    entidad_id:       input.entidad_id,
    nombre:           input.nombre.trim(),
    numero_contrato:  input.numero_contrato?.trim() || null,
    concepto:         input.concepto?.trim() || null,
    fecha_inicio:     input.fecha_inicio,
    fecha_fin:        input.fecha_fin || null,
    estado:           input.estado,
    calle:            input.calle?.trim() || null,
    numero_exterior:  input.numero_exterior?.trim() || null,
    numero_interior:  input.numero_interior?.trim() || null,
    colonia:          input.colonia?.trim() || null,
    municipio:        input.municipio?.trim() || null,
    estado_republica: input.estado_republica?.trim() || null,
    cp:               input.cp?.trim() || null,
    referencias:      input.referencias?.trim() || null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("contratos") as any)
    .insert(payload)
    .select("*")
    .single() as { data: Contrato | null; error: { message?: string } | null };

  if (error) return { error: error.message ?? "Error al crear el contrato" };

  if (data) await logContrato(userId, "CONTRATO_CREAR", data.id, input.entidad_id, { nombre: data.nombre });
  revalidateClientes(input.entidad_id);
  return { contrato: data };
}

// ---------- ACTUALIZAR CONTRATO ----------

export async function actualizarContratoAction(input: ActualizarContratoInput) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  const { id, ...rest } = input;
  const payload: Record<string, unknown> = {};

  if (rest.nombre !== undefined)           payload.nombre            = rest.nombre.trim();
  if (rest.numero_contrato !== undefined)  payload.numero_contrato   = rest.numero_contrato?.trim() || null;
  if (rest.concepto !== undefined)         payload.concepto          = rest.concepto?.trim() || null;
  if (rest.fecha_inicio !== undefined)     payload.fecha_inicio      = rest.fecha_inicio;
  if (rest.fecha_fin !== undefined)        payload.fecha_fin         = rest.fecha_fin || null;
  if (rest.estado !== undefined)           payload.estado            = rest.estado;
  if (rest.calle !== undefined)            payload.calle             = rest.calle?.trim() || null;
  if (rest.numero_exterior !== undefined)  payload.numero_exterior   = rest.numero_exterior?.trim() || null;
  if (rest.numero_interior !== undefined)  payload.numero_interior   = rest.numero_interior?.trim() || null;
  if (rest.colonia !== undefined)          payload.colonia           = rest.colonia?.trim() || null;
  if (rest.municipio !== undefined)        payload.municipio         = rest.municipio?.trim() || null;
  if (rest.estado_republica !== undefined) payload.estado_republica  = rest.estado_republica?.trim() || null;
  if (rest.cp !== undefined)               payload.cp                = rest.cp?.trim() || null;
  if (rest.referencias !== undefined)      payload.referencias       = rest.referencias?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("contratos") as any)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single() as { data: Contrato | null; error: unknown };

  if (error) return { error: "Error al actualizar el contrato" };

  if (data) {
    await logContrato(userId, "CONTRATO_ACTUALIZAR", data.id, data.entidad_id, { nombre: data.nombre });
    revalidateClientes(data.entidad_id);
  }
  return { contrato: data };
}

// ---------- ELIMINAR CONTRATO ----------

export async function eliminarContratoAction(id: string, entidadId: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("contratos") as any)
    .delete()
    .eq("id", id) as { error: unknown };

  if (error) return { error: "Error al eliminar el contrato" };

  await logContrato(userId, "CONTRATO_ELIMINAR", id, entidadId);
  revalidateClientes(entidadId);
  return { success: true };
}

// ---------- FETCH USUARIOS DE ENTIDAD ----------

export interface UsuarioAcceso {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  created_at: string;
}

export async function fetchUsuariosEntidadAction(entidadId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, data: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol, created_at")
    .eq("entidad_id", entidadId)
    .order("nombre") as { data: UsuarioAcceso[] | null; error: unknown };

  if (error) return { error: "Error al cargar usuarios", data: null };
  return { data: data ?? [], error: null };
}

// ---------- FETCH CLIENTE CON CONTRATOS ----------

export async function fetchClienteConContratosAction(entidadId: string) {
  const { error: authErr } = await verificarAdmin();
  if (authErr) return { error: authErr, data: null };

  const admin = createAdminClient();

  interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entidad, error: eErr } = await (admin.from("entidades") as any)
    .select("id, nombre, activo, created_at")
    .eq("id", entidadId)
    .single() as { data: EntidadRow | null; error: unknown };

  if (eErr || !entidad) return { error: "Cliente no encontrado", data: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rContratos, { count: totalClientes }, { count: totalEmpleadosAcceso }, rReqs] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("contratos") as any)
      .select("*")
      .eq("entidad_id", entidadId)
      .order("created_at", { ascending: false }) as Promise<{ data: Contrato[] | null; error: unknown }>,
    admin
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", entidadId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("entidad_acceso_empleados") as any)
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", entidadId) as Promise<{ count: number | null }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("requerimientos") as any)
      .select("id, contrato_id, estado")
      .eq("entidad_id", entidadId) as Promise<{ data: Array<{ id: string; contrato_id: string | null; estado: string }> | null; error: unknown }>,
  ]);

  // Compute requerimiento stats
  const reqs = rReqs.data ?? [];
  const totalRequerimientos = reqs.length;
  const requerimientosActivos = reqs.filter(r => ["pendiente", "en_revision"].includes(r.estado)).length;

  // Fetch reactivos (items) for all requerimientos
  const reqIds = reqs.map(r => r.id);
  let totalReactivos = 0;
  const reactivosPorContrato:       Record<string, number> = {};
  const completadosPorContrato:     Record<string, number> = {};
  const enRevisionPorContrato:      Record<string, number> = {};
  const requerimientosCountPorContrato:   Record<string, number> = {};
  const requerimientosActivosPorContrato: Record<string, number> = {};

  const reqToContrato: Record<string, string | null> = {};
  for (const r of reqs) {
    reqToContrato[r.id] = r.contrato_id;
    if (r.contrato_id) {
      requerimientosCountPorContrato[r.contrato_id] = (requerimientosCountPorContrato[r.contrato_id] ?? 0) + 1;
      if (["pendiente", "en_revision"].includes(r.estado)) {
        requerimientosActivosPorContrato[r.contrato_id] = (requerimientosActivosPorContrato[r.contrato_id] ?? 0) + 1;
      }
    }
  }

  if (reqIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (admin.from("requerimiento_items") as any)
      .select("requerimiento_id, estado")
      .in("requerimiento_id", reqIds) as { data: Array<{ requerimiento_id: string; estado: string }> | null };

    totalReactivos = (items ?? []).length;

    for (const item of (items ?? [])) {
      const cid = reqToContrato[item.requerimiento_id];
      if (cid) {
        reactivosPorContrato[cid]   = (reactivosPorContrato[cid]   ?? 0) + 1;
        if (item.estado === "completado")   completadosPorContrato[cid]  = (completadosPorContrato[cid]  ?? 0) + 1;
        if (item.estado === "en_revision")  enRevisionPorContrato[cid]   = (enRevisionPorContrato[cid]   ?? 0) + 1;
      }
    }
  }

  // Fetch hallazgos count per contract (graceful — table may not exist yet)
  const hallazgosPorContrato: Record<string, number> = {};
  const contratoIds = (rContratos.data ?? []).map(c => c.id);
  if (contratoIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hData, error: hErr } = await (admin.from("hallazgos") as any)
      .select("contrato_id")
      .eq("entidad_id", entidadId)
      .in("contrato_id", contratoIds) as { data: Array<{ contrato_id: string }> | null; error: { message: string } | null };
    if (!hErr) {
      for (const h of (hData ?? [])) {
        if (h.contrato_id) hallazgosPorContrato[h.contrato_id] = (hallazgosPorContrato[h.contrato_id] ?? 0) + 1;
      }
    }
  }

  // Attach per-contract stats
  const contratos = (rContratos.data ?? []).map(c => ({
    ...c,
    totalReactivos:        reactivosPorContrato[c.id]           ?? 0,
    itemsCompletados:      completadosPorContrato[c.id]         ?? 0,
    itemsEnRevision:       enRevisionPorContrato[c.id]          ?? 0,
    requerimientosCount:   requerimientosCountPorContrato[c.id] ?? 0,
    requerimientosActivos: requerimientosActivosPorContrato[c.id] ?? 0,
    hallazgosCount:        hallazgosPorContrato[c.id]           ?? 0,
  }));

  return {
    error: null,
    data: {
      ...entidad,
      contratos,
      totalRequerimientos,
      requerimientosActivos,
      totalReactivos,
      totalUsuarios: (totalClientes ?? 0) + (totalEmpleadosAcceso ?? 0),
    },
  };
}

// ---------- ACCESO DE EMPLEADOS A ENTIDAD ----------

export async function fetchAccesoEmpleadosAction(entidadId: string): Promise<{ data: EmpleadoAcceso[] | null; error: string | null }> {
  const { error: authErr } = await verificarAdmin();
  if (authErr) return { error: authErr, data: null };

  const admin = createAdminClient();

  const [rEmpleados, rAcceso] = await Promise.all([
    admin
      .from("empleados")
      .select("id, nombres, apellido_paterno, apellido_materno, departamento, email_institucional")
      .eq("estado", "activo")
      .order("apellido_paterno") as unknown as Promise<{ data: Array<{ id: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; departamento: string; email_institucional: string | null }> | null; error: unknown }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("entidad_acceso_empleados") as any)
      .select("empleado_id")
      .eq("entidad_id", entidadId) as unknown as Promise<{ data: Array<{ empleado_id: string }> | null; error: unknown }>,
  ]);

  const conAcceso = new Set((rAcceso.data ?? []).map(r => r.empleado_id));

  const result: EmpleadoAcceso[] = (rEmpleados.data ?? []).map(e => ({
    ...e,
    tiene_acceso: conAcceso.has(e.id),
  }));

  return { data: result, error: null };
}

export async function grantAccesoEmpleadoAction(entidadId: string, empleadoId: string) {
  const { supabase, userId, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !userId) return { error: authErr };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("entidad_acceso_empleados") as any)
    .upsert({ entidad_id: entidadId, empleado_id: empleadoId, otorgado_por: userId });

  if (error) return { error: "Error al otorgar acceso" };
  revalidatePath(`/dashboard/directorio/empresa/${entidadId}`);
  return { error: null };
}

export async function revokeAccesoEmpleadoAction(entidadId: string, empleadoId: string) {
  const { error: authErr } = await verificarAdmin();
  if (authErr) return { error: authErr };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("entidad_acceso_empleados") as any)
    .delete()
    .eq("entidad_id", entidadId)
    .eq("empleado_id", empleadoId);

  if (error) return { error: "Error al revocar acceso" };
  revalidatePath(`/dashboard/directorio/empresa/${entidadId}`);
  return { error: null };
}
