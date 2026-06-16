"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ReqEnArea {
  id: string;
  titulo: string;
  total: number;
  completados: number;
  enRevision: number;
  pendientes: number;
  porcentaje: number;
}

export interface AreaStat {
  area: string;
  total: number;
  completados: number;
  enRevision: number;
  pendientes: number;
  porcentaje: number;
  requerimientos: ReqEnArea[];
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from("requerimientos") as any).select("id, titulo").eq("entidad_id", entidadId);
  if (contratoId) q = q.eq("contrato_id", contratoId);
  const { data: reqs } = await q as { data: { id: string; titulo: string }[] | null };

  const reqIds = (reqs ?? []).map((r) => r.id);
  const reqTituloMap = new Map((reqs ?? []).map(r => [r.id, r.titulo ?? r.id]));

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

  const { data: items } = await admin
    .from("requerimiento_items")
    .select("id, area, estado, requerimiento_id")
    .in("requerimiento_id", reqIds) as {
      data: { id: string; area: string | null; estado: string; requerimiento_id: string }[] | null
    };

  const all = items ?? [];
  const totalItems = all.length;
  const completados = all.filter((i) => i.estado === "completado").length;
  const enRevision  = all.filter((i) => i.estado === "en_revision").length;
  const pendientes  = all.filter((i) => i.estado === "pendiente").length;
  const porcentaje  = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;

  // Agrupación por área, y dentro de cada área por requerimiento
  const areaMap    = new Map<string, { total: number; completados: number; enRevision: number; pendientes: number }>();
  const areaReqMap = new Map<string, Map<string, { total: number; completados: number; enRevision: number; pendientes: number }>>();

  for (const item of all) {
    const areaKey = item.area?.trim() || "(Sin área)";
    const prev = areaMap.get(areaKey) ?? { total: 0, completados: 0, enRevision: 0, pendientes: 0 };
    areaMap.set(areaKey, {
      total:      prev.total + 1,
      completados: prev.completados + (item.estado === "completado" ? 1 : 0),
      enRevision:  prev.enRevision  + (item.estado === "en_revision" ? 1 : 0),
      pendientes:  prev.pendientes  + (item.estado === "pendiente"   ? 1 : 0),
    });

    if (!areaReqMap.has(areaKey)) areaReqMap.set(areaKey, new Map());
    const reqMap = areaReqMap.get(areaKey)!;
    const prevReq = reqMap.get(item.requerimiento_id) ?? { total: 0, completados: 0, enRevision: 0, pendientes: 0 };
    reqMap.set(item.requerimiento_id, {
      total:      prevReq.total + 1,
      completados: prevReq.completados + (item.estado === "completado" ? 1 : 0),
      enRevision:  prevReq.enRevision  + (item.estado === "en_revision" ? 1 : 0),
      pendientes:  prevReq.pendientes  + (item.estado === "pendiente"   ? 1 : 0),
    });
  }

  const areas: AreaStat[] = Array.from(areaMap.entries())
    .map(([area, s]) => {
      const reqMap = areaReqMap.get(area) ?? new Map();
      const requerimientos: ReqEnArea[] = Array.from(reqMap.entries())
        .map(([reqId, rs]) => ({
          id:     reqId,
          titulo: reqTituloMap.get(reqId) ?? reqId,
          ...rs,
          porcentaje: rs.total > 0 ? Math.round((rs.completados / rs.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
      return {
        area,
        ...s,
        porcentaje: s.total > 0 ? Math.round((s.completados / s.total) * 100) : 0,
        requerimientos,
      };
    })
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
