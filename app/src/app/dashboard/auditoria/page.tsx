import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AuditoriaPageClient from "@/components/auditoria/AuditoriaPageClient";

interface PerfilRow { rol: string }

export default async function AuditoriaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) redirect("/dashboard");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rEntidades, rContratos] = await Promise.all([
    (admin.from("entidades") as any)
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre") as Promise<{ data: { id: string; nombre: string }[] | null }>,
    (admin.from("contratos") as any)
      .select("id, nombre, entidad_id")
      .eq("estado", "vigente")
      .order("nombre") as Promise<{ data: { id: string; nombre: string; entidad_id: string }[] | null }>,
  ]);

  return (
    <div className="page-pad">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
          Auditoría
        </h1>
        <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
          Seguimiento de requerimientos y hallazgos por entidad
        </p>
      </div>
      <AuditoriaPageClient
        entidades={rEntidades.data ?? []}
        contratos={rContratos.data ?? []}
      />
    </div>
  );
}
