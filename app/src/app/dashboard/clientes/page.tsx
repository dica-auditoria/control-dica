import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ClientesPageTabs from "@/components/clientes/ClientesPageTabs";
import type { ClienteListItem } from "@/components/clientes/ClientesView";
import type { ClienteUsuarioItem } from "@/components/clientes/ClientesAccesoView";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }
interface ContratoCount { entidad_id: string; estado: string }
interface StatsRow { entidad_id: string; archivo_count: number; usuario_count: number }
interface UsuarioClienteRow {
  id: string;
  nombre: string;
  email: string;
  entidad_id: string | null;
  contrato_id: string | null;
  area: string | null;
  activo: boolean;
  created_at: string;
  entidades: { nombre: string } | null;
  contratos: { nombre: string } | null;
}
interface UserContratoRow {
  usuario_id: string;
  contratos: { nombre: string } | null;
}

export default async function ClientesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rEntidades, rContratos, rStats, rClienteUsers, rUserContratos] = await Promise.all([
    (admin.from("entidades") as any)
      .select("id, nombre, activo, created_at")
      .order("nombre") as Promise<{ data: EntidadRow[] | null; error: unknown }>,
    (admin.from("contratos") as any)
      .select("entidad_id, estado") as Promise<{ data: ContratoCount[] | null; error: unknown }>,
    // RPC function bypasses Supabase's 1000-row PostgREST limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.rpc("get_directorio_stats") as any) as Promise<{ data: StatsRow[] | null; error: unknown }>,
    (admin.from("usuarios") as any)
      .select("id, nombre, email, entidad_id, contrato_id, area, activo, created_at, entidades(nombre), contratos(nombre)")
      .eq("rol", "cliente")
      .order("created_at", { ascending: false }) as Promise<{ data: UsuarioClienteRow[] | null; error: unknown }>,
    // All contracts per user (many-to-many)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("usuario_contratos") as any)
      .select("usuario_id, contratos(nombre)") as Promise<{ data: UserContratoRow[] | null; error: unknown }>,
  ]);

  // Stats para tarjetas de empresas
  const contratosMap = new Map<string, { total: number; vigentes: number }>();
  for (const c of rContratos.data ?? []) {
    const prev = contratosMap.get(c.entidad_id) ?? { total: 0, vigentes: 0 };
    contratosMap.set(c.entidad_id, {
      total: prev.total + 1,
      vigentes: prev.vigentes + (c.estado === "vigente" ? 1 : 0),
    });
  }

  const statsMap = new Map<string, { archivos: number; usuarios: number }>();
  for (const s of (rStats.data ?? []) as StatsRow[]) {
    statsMap.set(s.entidad_id, {
      archivos: Number(s.archivo_count),
      usuarios: Number(s.usuario_count),
    });
  }

  const clientes: ClienteListItem[] = (rEntidades.data ?? []).map(e => ({
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    created_at: e.created_at,
    totalContratos: contratosMap.get(e.id)?.total ?? 0,
    contratosVigentes: contratosMap.get(e.id)?.vigentes ?? 0,
    totalArchivos: statsMap.get(e.id)?.archivos ?? 0,
    totalUsuarios: statsMap.get(e.id)?.usuarios ?? 0,
  }));

  const userContratosMap = new Map<string, string[]>();
  for (const uc of rUserContratos.data ?? []) {
    if (!uc.contratos) continue;
    const list = userContratosMap.get(uc.usuario_id) ?? [];
    list.push(uc.contratos.nombre);
    userContratosMap.set(uc.usuario_id, list);
  }

  const clienteUsers: ClienteUsuarioItem[] = (rClienteUsers.data ?? []).map(u => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    entidad_id: u.entidad_id,
    entidad_nombre: u.entidades?.nombre ?? null,
    contrato_id: u.contrato_id,
    contrato_nombre: u.contratos?.nombre ?? null,
    contratos_list: userContratosMap.get(u.id) ?? (u.contratos?.nombre ? [u.contratos.nombre] : []),
    area: u.area ?? null,
    activo: u.activo ?? true,
    created_at: u.created_at,
  }));

  const entidadesActivas = (rEntidades.data ?? [])
    .filter(e => e.activo)
    .map(e => ({ id: e.id, nombre: e.nombre }));

  return (
    <ClientesPageTabs
      clientes={clientes}
      usuarios={clienteUsers}
      entidades={entidadesActivas}
      rol={perfil.rol}
    />
  );
}
