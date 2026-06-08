import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpleadoParaCheckinAuthAction } from "@/app/actions/asistencia";
import EmpleadoCheckinView from "@/components/checkin/EmpleadoCheckinView";

export const metadata = { title: "Mi Asistencia — Control DICA" };

export default async function MiAsistenciaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { empleado, rol } = await getEmpleadoParaCheckinAuthAction();

  return <EmpleadoCheckinView empleado={empleado} rol={rol ?? "empleado"} />;
}
