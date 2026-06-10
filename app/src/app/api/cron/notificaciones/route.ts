import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDeadlineApproachingEmail, sendEnRetrasoEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const en3dias = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  // ── 1. Items próximos a vencer (0-3 días) → email al cliente ──────────────
  const { data: proximosRaw } = await (admin.from("requerimiento_items") as any)
    .select(`
      id, nombre, rubro, fecha_limite,
      requerimiento:requerimientos!requerimiento_id(
        entidad_id, contrato_id,
        entidad:entidades!entidad_id(nombre),
        contrato:contratos!contrato_id(nombre)
      )
    `)
    .neq("estado", "completado")
    .gte("fecha_limite", hoy)
    .lte("fecha_limite", en3dias) as { data: any[] | null };

  // Agrupar por entidad_id
  const porEntidad = new Map<string, { items: any[]; contratoNombre: string | null }>();
  for (const item of proximosRaw ?? []) {
    const req = item.requerimiento ?? {};
    const entidadId = req.entidad_id as string;
    if (!entidadId) continue;
    if (!porEntidad.has(entidadId)) porEntidad.set(entidadId, { items: [], contratoNombre: req.contrato?.nombre ?? null });
    porEntidad.get(entidadId)!.items.push({
      nombre: item.nombre,
      rubro: item.rubro ?? null,
      fecha_limite: item.fecha_limite,
      contrato: req.contrato?.nombre ?? null,
    });
  }

  for (const [entidadId, { items }] of Array.from(porEntidad)) {
    const { data: clientes } = await (admin.from("usuarios") as any)
      .select("email, nombre").eq("entidad_id", entidadId).eq("rol", "cliente").eq("activo", true) as { data: Array<{ email: string; nombre: string }> | null };
    for (const c of clientes ?? []) {
      await sendDeadlineApproachingEmail({ clienteEmail: c.email, clienteNombre: c.nombre, items }).catch(() => {});
    }
  }

  // ── 2. Items en retraso → email a empleados/admins ─────────────────────────
  const { data: retrasoRaw } = await (admin.from("requerimiento_items") as any)
    .select(`
      id, nombre, fecha_limite,
      requerimiento:requerimientos!requerimiento_id(
        entidad_id, contrato_id,
        entidad:entidades!entidad_id(nombre),
        contrato:contratos!contrato_id(nombre)
      )
    `)
    .neq("estado", "completado")
    .lt("fecha_limite", hoy) as { data: any[] | null };

  if (retrasoRaw?.length) {
    const itemsRetraso = (retrasoRaw ?? []).map(i => ({
      nombre: i.nombre,
      entidad: i.requerimiento?.entidad?.nombre ?? "—",
      contrato: i.requerimiento?.contrato?.nombre ?? null,
      fecha_limite: i.fecha_limite,
      diasRetraso: Math.max(1, Math.floor((new Date(hoy).getTime() - new Date(i.fecha_limite + "T12:00:00").getTime()) / 86400000)),
    }));

    const { data: empleados } = await (admin.from("usuarios") as any)
      .select("email, nombre")
      .in("rol", ["admin", "superadmin", "empleado"])
      .eq("activo", true) as { data: Array<{ email: string; nombre: string }> | null };

    for (const e of empleados ?? []) {
      await sendEnRetrasoEmail({ empleadoEmail: e.email, empleadoNombre: e.nombre, items: itemsRetraso }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, proximos: proximosRaw?.length ?? 0, retraso: retrasoRaw?.length ?? 0 });
}
