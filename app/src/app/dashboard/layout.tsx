import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  interface PerfilRow { id: string; nombre: string; rol: string; entidad_id: string | null; entidades: { nombre: string } | null }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, entidad_id, entidades(nombre)")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  // Badge: solicitudes pendientes para admin/superadmin
  let solicitudesPendientes = 0;
  if (perfil.rol === "admin" || perfil.rol === "superadmin") {
    const { count } = await supabase
      .from("solicitudes_eliminacion")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente");
    solicitudesPendientes = count ?? 0;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      background: "var(--surface)",
    }}>
      <Sidebar usuario={perfil} solicitudesPendientes={solicitudesPendientes} />
      <main style={{ overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
