import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTodasVacacionesAction } from "@/app/actions/vacaciones";
import VacacionesAdminView from "@/components/vacaciones/VacacionesAdminView";

export default async function VacacionesAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  if (!["admin", "superadmin", "rrhh"].includes(perfil?.rol ?? "")) redirect("/dashboard/mis-vacaciones");

  const { data } = await fetchTodasVacacionesAction("todos");

  return (
    <div className="page-pad">
      <VacacionesAdminView solicitudes={data ?? []} />
    </div>
  );
}
