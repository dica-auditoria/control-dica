import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  interface PerfilRow { id: string; nombre: string; rol: string; entidad_id: string | null; entidades: { nombre: string } | null; privacidad_aceptada_at: string | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: perfil } = await (supabase.from("usuarios") as any)
    .select("id, nombre, rol, entidad_id, entidades(nombre), privacidad_aceptada_at")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  // Clientes sin aviso de privacidad aceptado → intercepción
  if (perfil.rol === "cliente" && !perfil.privacidad_aceptada_at) {
    redirect("/cliente/privacidad");
  }

  // Badge: solicitudes pendientes para admin/superadmin
  let solicitudesPendientes = 0;
  let requerimientosPendientes = 0;

  if (perfil.rol === "admin" || perfil.rol === "superadmin") {
    const { count } = await supabase
      .from("solicitudes_eliminacion")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente");
    solicitudesPendientes = count ?? 0;
  }

  if (perfil.rol === "cliente" && perfil.entidad_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from("requerimientos") as any)
      .select("*", { count: "exact", head: true })
      .eq("entidad_id", perfil.entidad_id)
      .neq("estado", "completado");
    requerimientosPendientes = count ?? 0;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      background: "var(--surface)",
    }}>
      <Sidebar usuario={perfil} solicitudesPendientes={solicitudesPendientes} requerimientosPendientes={requerimientosPendientes} />
      <main style={{ overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
