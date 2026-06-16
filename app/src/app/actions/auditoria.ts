"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface AreaStat {
  area: string;
  total: number;
  completados: number;
  enRevision: number;
  pendientes: number;
  porcentaje: number;
}

export interface AuditoriaResumen {
  totalRequerimientos: number;
  totalItems: number;
  completados: number;
  enRevision: number;
  pendientes: number;
  porcentaje: number;
  areas: AreaStat[];
}

export async function fetchAuditoriaResumenAction(
  entidadId: string,
  contratoId?: string | null,
): Promise<{ data: AuditoriaResumen | null; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const admin = createAdminClient();

  // Requerimientos de la entidad (+ contrato opcional)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from("requerimientos") as any).select("id").eq("entidad_id", entidadId);
  if (contratoId) q = q.eq("contrato_id", contratoId);
  const { data: reqs } = await q as { data: { id: string }[] | null };

  const reqIds = (reqs ?? []).map((r) => r.id);
  if (reqIds.length === 0) {
    return {
      data: {
        totalRequerimientos: 0,
        totalItems: 0,
        completados: 0,
        enRevision: 0,
        pendientes: 0,
        porcentaje: 0,
        areas: [],
      },
    };
  }

  // Items de esos requerimientos
  const { data: items } = await admin
    .from("requerimiento_items")
    .select("id, area, estado")
    .in("requerimiento_id", reqIds) as { data: { id: string; area: string | null; estado: string }[] | null };

  const all = items ?? [];
  const totalItems = all.length;
  const completados = all.filter((i) => i.estado === "completado").length;
  const enRevision = all.filter((i) => i.estado === "en_revision").length;
  const pendientes = all.filter((i) => i.estado === "pendiente").length;
  const porcentaje = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;

  // Agrupación por área
  const areaMap = new Map<string, { total: number; completados: number; enRevision: number; pendientes: number }>();
  for (const item of all) {
    const key = item.area?.trim() || "(Sin área)";
    const prev = areaMap.get(key) ?? { total: 0, completados: 0, enRevision: 0, pendientes: 0 };
    areaMap.set(key, {
      total: prev.total + 1,
      completados: prev.completados + (item.estado === "completado" ? 1 : 0),
      enRevision: prev.enRevision + (item.estado === "en_revision" ? 1 : 0),
      pendientes: prev.pendientes + (item.estado === "pendiente" ? 1 : 0),
    });
  }

  const areas: AreaStat[] = Array.from(areaMap.entries())
    .map(([area, s]) => ({
      area,
      ...s,
      porcentaje: s.total > 0 ? Math.round((s.completados / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    data: {
      totalRequerimientos: reqs?.length ?? 0,
      totalItems,
      completados,
      enRevision,
      pendientes,
      porcentaje,
      areas,
    },
  };
}
