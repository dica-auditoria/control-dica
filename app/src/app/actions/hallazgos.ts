"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type NivelRiesgo = "alto" | "medio" | "bajo";
export type TipoHallazgo = "financiero" | "control_interno";
export type EstatusHallazgo = "pendiente" | "solventada";

export interface Hallazgo {
  id: string;
  entidad_id: string;
  contrato_id: string | null;
  area: string;
  numero: string | null;
  descripcion: string;
  tipo: TipoHallazgo;
  nivel_riesgo: NivelRiesgo;
  es_recurrente: boolean;
  estatus: EstatusHallazgo;
  fecha_compromiso: string | null;
  fecha_limite: string | null;
  creado_por: string | null;
  created_at: string;
}

interface RiesgoSeccion {
  total: number;
  solventadas: number;
  byArea: { area: string; nuevas: number; recurrentes: number }[];
  hallazgos: Hallazgo[];
}

export interface HallazgosResumen {
  total: number;
  solventadas: number;
  byArea: { area: string; total: number }[];
  alto:  RiesgoSeccion;
  medio: RiesgoSeccion;
  bajo:  RiesgoSeccion;
}

export async function fetchHallazgosAction(
  entidadId: string,
  contratoId?: string | null,
): Promise<{ data: HallazgosResumen | null; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from("hallazgos") as any)
    .select("*")
    .eq("entidad_id", entidadId)
    .order("created_at", { ascending: true });
  if (contratoId) q = q.eq("contrato_id", contratoId);

  const { data, error } = await q as { data: Hallazgo[] | null; error: { message: string } | null };
  if (error) return { data: null, error: error.message };

  const all = data ?? [];

  const byAreaMap = new Map<string, number>();
  for (const h of all) byAreaMap.set(h.area, (byAreaMap.get(h.area) ?? 0) + 1);
  const byArea = Array.from(byAreaMap.entries())
    .map(([area, total]) => ({ area, total }))
    .sort((a, b) => b.total - a.total);

  const buildSeccion = (nivel: NivelRiesgo): RiesgoSeccion => {
    const list = all.filter((h) => h.nivel_riesgo === nivel);
    const solventadas = list.filter((h) => h.estatus === "solventada").length;
    const areaMap = new Map<string, { nuevas: number; recurrentes: number }>();
    for (const h of list) {
      const prev = areaMap.get(h.area) ?? { nuevas: 0, recurrentes: 0 };
      areaMap.set(h.area, {
        nuevas:      prev.nuevas      + (!h.es_recurrente ? 1 : 0),
        recurrentes: prev.recurrentes + (h.es_recurrente  ? 1 : 0),
      });
    }
    return {
      total: list.length,
      solventadas,
      byArea: Array.from(areaMap.entries())
        .map(([area, v]) => ({ area, ...v }))
        .sort((a, b) => (b.nuevas + b.recurrentes) - (a.nuevas + a.recurrentes)),
      hallazgos: list,
    };
  };

  return {
    data: {
      total: all.length,
      solventadas: all.filter((h) => h.estatus === "solventada").length,
      byArea,
      alto:  buildSeccion("alto"),
      medio: buildSeccion("medio"),
      bajo:  buildSeccion("bajo"),
    },
  };
}

export interface HallazgoInput {
  entidadId: string;
  contratoId?: string | null;
  area: string;
  numero?: string | null;
  descripcion: string;
  tipo: TipoHallazgo;
  nivel_riesgo: NivelRiesgo;
  es_recurrente: boolean;
  estatus: EstatusHallazgo;
  fecha_compromiso?: string | null;
  fecha_limite?: string | null;
}

export async function crearHallazgoAction(
  args: HallazgoInput,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("hallazgos") as any).insert({
    entidad_id:       args.entidadId,
    contrato_id:      args.contratoId || null,
    area:             args.area.trim(),
    numero:           args.numero?.trim() || null,
    descripcion:      args.descripcion.trim(),
    tipo:             args.tipo,
    nivel_riesgo:     args.nivel_riesgo,
    es_recurrente:    args.es_recurrente,
    estatus:          args.estatus,
    fecha_compromiso: args.fecha_compromiso || null,
    fecha_limite:     args.fecha_limite     || null,
    creado_por:       user.id,
  });

  if (error) return { error: (error as { message: string }).message };
  revalidatePath("/dashboard/auditoria");
  return {};
}

export async function editarHallazgoAction(
  id: string,
  args: Partial<Omit<HallazgoInput, "entidadId" | "contratoId">>,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const update: Record<string, unknown> = {};
  if (args.area             !== undefined) update.area             = args.area.trim();
  if (args.numero           !== undefined) update.numero           = args.numero?.trim() || null;
  if (args.descripcion      !== undefined) update.descripcion      = args.descripcion.trim();
  if (args.tipo             !== undefined) update.tipo             = args.tipo;
  if (args.nivel_riesgo     !== undefined) update.nivel_riesgo     = args.nivel_riesgo;
  if (args.es_recurrente    !== undefined) update.es_recurrente    = args.es_recurrente;
  if (args.estatus          !== undefined) update.estatus          = args.estatus;
  if (args.fecha_compromiso !== undefined) update.fecha_compromiso = args.fecha_compromiso || null;
  if (args.fecha_limite     !== undefined) update.fecha_limite     = args.fecha_limite     || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("hallazgos") as any).update(update).eq("id", id);
  if (error) return { error: (error as { message: string }).message };
  revalidatePath("/dashboard/auditoria");
  return {};
}

export async function eliminarHallazgoAction(id: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("hallazgos") as any).delete().eq("id", id);
  if (error) return { error: (error as { message: string }).message };
  revalidatePath("/dashboard/auditoria");
  return {};
}
