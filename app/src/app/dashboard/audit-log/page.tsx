import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditLogView, { type AuditLogItem } from "@/components/audit-log/AuditLogView";

const LIMIT = 200;

interface RawLog {
  id: string;
  accion: string;
  ip: string | null;
  created_at: string;
  detalle_json: Record<string, unknown> | null;
  recurso_id: string | null;
  usuarios: { nombre: string } | null;
  entidades: { nombre: string } | null;
}

interface PerfilRow { rol: string }

export default async function AuditLogPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) redirect("/dashboard");

  const { data: raw, count } = await supabase
    .from("audit_log")
    .select("id, accion, ip, created_at, detalle_json, recurso_id, usuarios(nombre), entidades(nombre)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(LIMIT) as { data: RawLog[] | null; count: number | null; error: unknown };

  const entradas: AuditLogItem[] = (raw ?? []).map(e => ({
    id: e.id,
    accion: e.accion,
    ip: e.ip,
    created_at: e.created_at,
    detalle_json: e.detalle_json,
    recurso_id: e.recurso_id,
    usuario_nombre: e.usuarios?.nombre ?? null,
    entidad_nombre: e.entidades?.nombre ?? null,
  }));

  return <AuditLogView entradas={entradas} total={Math.min(count ?? 0, LIMIT)} />;
}
