import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchMisSolicitudesOtrosAction,
  fetchSolicitudesEquipoAction,
  fetchTodasSolicitudesOtrosAction,
} from "@/app/actions/otros";
import OtrosView from "@/components/otros/OtrosView";

export default async function OtrosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const esRH = ["rrhh", "admin", "superadmin"].includes(perfil.rol);

  const [misSolicitudes, equipo, todasRH] = await Promise.all([
    fetchMisSolicitudesOtrosAction(),
    fetchSolicitudesEquipoAction(),
    esRH ? fetchTodasSolicitudesOtrosAction() : Promise.resolve({ data: [], error: null }),
  ]);

  const esSupervisor = (equipo.subordinados?.length ?? 0) > 0;

  return (
    <div className="page-pad">
      <OtrosView
        misSolicitudes={misSolicitudes.data ?? []}
        solicitudesEquipo={equipo.data ?? []}
        solicitudesRH={(todasRH as { data: typeof misSolicitudes.data }).data ?? []}
        subordinados={equipo.subordinados ?? []}
        esSupervisor={esSupervisor}
        esRH={esRH}
      />
    </div>
  );
}
