"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface PerfilRow { rol: string }

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { supabase: null, error: "No autorizado" };
  return { supabase, error: null };
}

function revalEmp(empleadoId: string) {
  revalidatePath(`/dashboard/empleados/${empleadoId}`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactoEmergencia {
  id: string;
  orden: number;
  nombre: string;
  parentesco: string;
  telefono: string;
  telefono_alt: string | null;
}

export interface CondicionesMedicas {
  hipertension: boolean;
  diabetes: boolean;
  epilepsia: boolean;
  asma: boolean;
  cardiopatia: boolean;
  otras_condiciones: string | null;
  notas: string | null;
}

export interface Incapacidad {
  id: string;
  folio: string | null;
  tipo: string;
  motivo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias_totales: number | null;
  ruta_documento: string | null;
  created_at: string;
}

// ─── FETCH (todo el módulo de emergencia) ────────────────────────────────────

export async function fetchEmergenciaAction(empleadoId: string): Promise<{
  contactos: ContactoEmergencia[];
  medico: CondicionesMedicas | null;
  incapacidades: Incapacidad[];
  error: string | null;
}> {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { contactos: [], medico: null, incapacidades: [], error: authErr };

  const [rContactos, rMedico, rIncap] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("empleado_emergencia") as any)
      .select("id, orden, nombre, parentesco, telefono, telefono_alt")
      .eq("empleado_id", empleadoId)
      .order("orden") as Promise<{ data: ContactoEmergencia[] | null; error: unknown }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("empleado_medico") as any)
      .select("hipertension, diabetes, epilepsia, asma, cardiopatia, otras_condiciones, notas")
      .eq("empleado_id", empleadoId)
      .maybeSingle() as Promise<{ data: CondicionesMedicas | null; error: unknown }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("empleado_incapacidades") as any)
      .select("id, folio, tipo, motivo, fecha_inicio, fecha_fin, dias_totales, ruta_documento, created_at")
      .eq("empleado_id", empleadoId)
      .order("fecha_inicio", { ascending: false }) as Promise<{ data: Incapacidad[] | null; error: unknown }>,
  ]);

  return {
    contactos: rContactos.data ?? [],
    medico: rMedico.data ?? null,
    incapacidades: rIncap.data ?? [],
    error: null,
  };
}

// ─── CONTACTOS ────────────────────────────────────────────────────────────────

export async function guardarContactoEmergenciaAction(
  empleadoId: string,
  contacto: { id?: string; orden: number; nombre: string; parentesco: string; telefono: string; telefono_alt?: string }
) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  const payload = {
    empleado_id: empleadoId,
    orden: contacto.orden,
    nombre: contacto.nombre.trim(),
    parentesco: contacto.parentesco.trim(),
    telefono: contacto.telefono.trim(),
    telefono_alt: contacto.telefono_alt?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("empleado_emergencia") as any)
    .upsert(payload, { onConflict: "empleado_id,orden" })
    .select("id, orden, nombre, parentesco, telefono, telefono_alt")
    .single() as { data: ContactoEmergencia | null; error: { message?: string } | null };

  if (error) return { error: "Error al guardar contacto" };
  revalEmp(empleadoId);
  return { contacto: data, error: null };
}

export async function eliminarContactoEmergenciaAction(id: string, empleadoId: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_emergencia") as any).delete().eq("id", id);
  revalEmp(empleadoId);
  return { error: null };
}

// ─── CONDICIONES MÉDICAS ──────────────────────────────────────────────────────

export async function guardarMedicoAction(empleadoId: string, datos: CondicionesMedicas) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("empleado_medico") as any)
    .upsert({ empleado_id: empleadoId, ...datos, updated_at: new Date().toISOString() });

  if (error) return { error: "Error al guardar condiciones médicas" };
  revalEmp(empleadoId);
  return { error: null };
}

// ─── INCAPACIDADES ────────────────────────────────────────────────────────────

export async function agregarIncapacidadAction(
  empleadoId: string,
  datos: { folio?: string; tipo: string; motivo: string; fecha_inicio: string; fecha_fin?: string; ruta_documento?: string }
) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, incapacidad: null };

  const diasTotales = datos.fecha_fin
    ? Math.max(1, Math.ceil((new Date(datos.fecha_fin).getTime() - new Date(datos.fecha_inicio).getTime()) / 86400000) + 1)
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("empleado_incapacidades") as any)
    .insert({
      empleado_id: empleadoId,
      folio: datos.folio?.trim() || null,
      tipo: datos.tipo,
      motivo: datos.motivo.trim(),
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: datos.fecha_fin || null,
      dias_totales: diasTotales,
      ruta_documento: datos.ruta_documento || null,
    })
    .select("id, folio, tipo, motivo, fecha_inicio, fecha_fin, dias_totales, ruta_documento, created_at")
    .single() as { data: Incapacidad | null; error: unknown };

  if (error) return { error: "Error al registrar incapacidad", incapacidad: null };
  revalEmp(empleadoId);
  return { incapacidad: data, error: null };
}

export async function eliminarIncapacidadAction(id: string, empleadoId: string, ruta: string | null) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr };

  if (ruta) await supabase.storage.from("empleado-docs").remove([ruta]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_incapacidades") as any).delete().eq("id", id);
  revalEmp(empleadoId);
  return { error: null };
}

export async function subirDocumentoIncapacidadAction(
  empleadoId: string,
  incapacidadId: string,
  formData: FormData
) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, url: null };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Sin archivo", url: null };

  const ext = file.name.split(".").pop() ?? "pdf";
  const ruta = `${empleadoId}/incapacidades/${incapacidadId}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("empleado-docs")
    .upload(ruta, file, { upsert: true, contentType: file.type });

  if (uploadErr) return { error: "Error al subir el archivo", url: null };

  // Actualizar la ruta en la incapacidad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("empleado_incapacidades") as any)
    .update({ ruta_documento: ruta })
    .eq("id", incapacidadId);

  revalEmp(empleadoId);
  return { ruta, error: null };
}

export async function getIncapacidadUrlAction(ruta: string) {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, url: null };

  const { data } = await supabase.storage.from("empleado-docs").createSignedUrl(ruta, 120);
  return { url: data?.signedUrl ?? null, error: null };
}
