import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ClientesPageTabs from "@/components/clientes/ClientesPageTabs";
import type { ClienteListItem } from "@/components/clientes/ClientesView";
import type { ClienteUsuarioItem } from "@/components/clientes/ClientesAccesoView";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string; activo: boolean; created_at: string }
interface ContratoCount { entidad_id: string; estado: string }
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
  const [rEntidades, rContratos, rArchivos, rUsuariosAll, rClienteUsers] = await Promise.all([
    (admin.from("entidades") as any)
      .select("id, nombre, activo, created_at")
      .order("nombre") as Promise<{ data: EntidadRow[] | null; error: unknown }>,
    (admin.from("contratos") as any)
      .select("entidad_id, estado") as Promise<{ data: ContratoCount[] | null; error: unknown }>,
    (admin.from("archivos") as any).select("entidad_id").neq("estado", "eliminado"),
    (admin.from("usuarios") as any).select("entidad_id").not("entidad_id", "is", null),
    (admin.from("usuarios") as any)
      .select("id, nombre, email, entidad_id, contrato_id, area, activo, created_at, entidades(nombre), contratos(nombre)")
      .eq("rol", "cliente")
      .order("created_at", { ascending: false }) as Promise<{ data: UsuarioClienteRow[] | null; error: unknown }>,
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

  const archivosMap = new Map<string, number>();
  for (const a of (rArchivos.data ?? []) as Array<{ entidad_id: string }>) {
    archivosMap.set(a.entidad_id, (archivosMap.get(a.entidad_id) ?? 0) + 1);
  }

  const usuariosMap = new Map<string, number>();
  for (const u of (rUsuariosAll.data ?? []) as Array<{ entidad_id: string }>) {
    if (u.entidad_id) usuariosMap.set(u.entidad_id, (usuariosMap.get(u.entidad_id) ?? 0) + 1);
  }

  const clientes: ClienteListItem[] = (rEntidades.data ?? []).map(e => ({
    id: e.id,
    nombre: e.nombre,
    activo: e.activo,
    created_at: e.created_at,
    totalContratos: contratosMap.get(e.id)?.total ?? 0,
    contratosVigentes: contratosMap.get(e.id)?.vigentes ?? 0,
    totalArchivos: archivosMap.get(e.id) ?? 0,
    totalUsuarios: usuariosMap.get(e.id) ?? 0,
  }));

  const clienteUsers: ClienteUsuarioItem[] = (rClienteUsers.data ?? []).map(u => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    entidad_id: u.entidad_id,
    entidad_nombre: u.entidades?.nombre ?? null,
    contrato_id: u.contrato_id,
    contrato_nombre: u.contratos?.nombre ?? null,
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
