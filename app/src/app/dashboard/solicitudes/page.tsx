import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SolicitudesView, { type SolicitudItem } from "@/components/solicitudes/SolicitudesView";

interface RawSolicitud {
  id: string;
  motivo: string;
  estado: string;
  created_at: string;
  revisado_at: string | null;
  archivos: { nombre: string; tipo: string; entidades: { nombre: string } | null } | null;
  solicitante: { nombre: string } | null;
  revisor: { nombre: string } | null;
}

interface PerfilRow { rol: string }

const DEPTS_CON_ACCESO = [
  "Dirección General",
  "Dirección de Administración",
  "Gerencia de RH",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
  "Líderes de Auditoría",
];

export default async function SolicitudesPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  const esAdmin = ["admin", "superadmin"].includes(perfil.rol);

  if (!esAdmin) {
    if (!["empleado", "rrhh"].includes(perfil.rol)) redirect("/dashboard");
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emp } = await (admin.from("empleados") as any)
      .select("departamento")
      .eq("email_institucional", user.email)
      .maybeSingle() as { data: { departamento: string | null } | null };
    if (!emp || !emp.departamento || !DEPTS_CON_ACCESO.includes(emp.departamento)) redirect("/dashboard");
  }

  const { data: raw } = await supabase
    .from("solicitudes_eliminacion")
    .select(`
      id, motivo, estado, created_at, revisado_at,
      archivos ( nombre, tipo, entidades ( nombre ) ),
      solicitante:usuarios!solicitado_por ( nombre ),
      revisor:usuarios!revisado_por ( nombre )
    `)
    .order("created_at", { ascending: false }) as { data: RawSolicitud[] | null; error: unknown };

  const solicitudes: SolicitudItem[] = (raw ?? []).map(s => ({
    id: s.id,
    motivo: s.motivo,
    estado: s.estado,
    created_at: s.created_at,
    revisado_at: s.revisado_at,
    archivo_nombre: s.archivos?.nombre ?? "—",
    archivo_tipo: s.archivos?.tipo ?? "—",
    entidad_nombre: s.archivos?.entidades?.nombre ?? null,
    solicitante_nombre: s.solicitante?.nombre ?? null,
    revisor_nombre: s.revisor?.nombre ?? null,
  }));

  return <SolicitudesView solicitudes={solicitudes} />;
}
