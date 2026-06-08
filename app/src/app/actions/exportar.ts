"use server";

import { createClient } from "@/lib/supabase/server";

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

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function exportarEmpleadosCSVAction() {
  const { supabase, error: authErr } = await verificarAdmin();
  if (authErr || !supabase) return { error: authErr, csv: null };

  interface EmpRow { id: string; nombres: string; apellido_paterno: string; apellido_materno: string; email_institucional: string; puesto: string; departamento: string; tipo_contrato: string; zona_ubicacion: string | null; estado: string; codigo_empleado: string | null; fecha_ingreso: string; progreso_perfil: number | null; created_at: string }
  interface DpRow  { empleado_id: string; curp: string | null; rfc: string | null; nss: string | null; fecha_nacimiento: string | null; fecha_alta_imss: string | null; estado_civil: string | null; nacionalidad: string | null; tipo_sangre: string | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emps, error } = await (supabase as any)
    .from("empleados")
    .select("id, nombres, apellido_paterno, apellido_materno, email_institucional, puesto, departamento, tipo_contrato, zona_ubicacion, estado, codigo_empleado, fecha_ingreso, progreso_perfil, created_at")
    .order("apellido_paterno") as { data: EmpRow[] | null; error: unknown };

  if (error) return { error: "Error al obtener empleados", csv: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datos } = await (supabase as any)
    .from("empleado_datos_personales")
    .select("empleado_id, curp, rfc, nss, fecha_nacimiento, fecha_alta_imss, estado_civil, nacionalidad, tipo_sangre") as { data: DpRow[] | null; error: unknown };

  const datosMap = new Map<string, DpRow>();
  for (const d of datos ?? []) {
    datosMap.set(d.empleado_id, d);
  }

  const headers = [
    "Código", "Nombres", "Apellido Paterno", "Apellido Materno",
    "Email Institucional", "Puesto", "Departamento", "Tipo Contrato",
    "Zona", "Estado", "Fecha Ingreso",
    "CURP", "RFC", "NSS", "Fecha Nacimiento", "Alta IMSS",
    "Estado Civil", "Nacionalidad", "Tipo Sangre",
    "Progreso Perfil %", "Alta en Sistema",
  ];

  const rows = (emps ?? []).map(e => {
    const dp = datosMap.get(e.id);
    return [
      e.codigo_empleado ?? "",
      e.nombres,
      e.apellido_paterno,
      e.apellido_materno,
      e.email_institucional,
      e.puesto,
      e.departamento,
      e.tipo_contrato,
      e.zona_ubicacion ?? "",
      e.estado,
      e.fecha_ingreso,
      dp?.curp ?? "",
      dp?.rfc ?? "",
      dp?.nss ?? "",
      dp?.fecha_nacimiento ?? "",
      dp?.fecha_alta_imss ?? "",
      dp?.estado_civil ?? "",
      dp?.nacionalidad ?? "",
      dp?.tipo_sangre ?? "",
      e.progreso_perfil ?? 0,
      e.created_at ? new Date(e.created_at as string).toLocaleDateString("es-MX") : "",
    ].map(esc).join(",");
  });

  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
  return { csv, error: null };
}
