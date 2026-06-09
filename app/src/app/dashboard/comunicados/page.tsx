import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchComunicadosAction } from "@/app/actions/comunicados";
import ComunicadosView from "@/components/comunicados/ComunicadosView";

export default async function ComunicadosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const esAdmin = ["admin", "superadmin", "rrhh"].includes(perfil.rol);
  const { data } = await fetchComunicadosAction();

  return (
    <div className="page-pad">
      <ComunicadosView comunicados={data ?? []} esAdmin={esAdmin} />
    </div>
  );
}
