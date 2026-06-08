import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EmpleadoAvisoPrivacidadAuth from "@/components/empleados/EmpleadoAvisoPrivacidadAuth";

export const metadata = { title: "Aviso de Privacidad — Control DICA" };

export default async function EmpleadoAvisoPrivacidadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, nombre")
    .eq("id", user.id)
    .single() as { data: { rol: string; nombre: string } | null; error: unknown };

  if (!perfil || !["empleado", "rrhh"].includes(perfil.rol)) redirect("/dashboard");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emp } = await (admin.from("empleados") as any)
    .select("id, nombres, apellido_paterno, empleado_privacidad(id)")
    .eq("email_institucional", user.email)
    .maybeSingle() as { data: { id: string; nombres: string; apellido_paterno: string; empleado_privacidad: { id: string }[] } | null };

  // Already accepted → go to dashboard
  if (emp?.empleado_privacidad?.length) redirect("/dashboard");

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--surface)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
    }}>
      <EmpleadoAvisoPrivacidadAuth
        nombre={perfil.nombre}
        email={user.email}
      />
    </div>
  );
}
