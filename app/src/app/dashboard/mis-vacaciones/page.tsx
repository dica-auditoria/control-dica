import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchMisVacacionesAction } from "@/app/actions/vacaciones";
import MisVacacionesView from "@/components/vacaciones/MisVacacionesView";

export default async function MisVacacionesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  // Admin/rrhh redirige a la vista global
  if (["admin", "superadmin", "rrhh"].includes(perfil.rol)) redirect("/dashboard/vacaciones");

  const { data } = await fetchMisVacacionesAction();

  return (
    <div className="page-pad">
      <MisVacacionesView solicitudes={data ?? []} />
    </div>
  );
}
