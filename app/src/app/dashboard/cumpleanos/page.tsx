import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCumpleanosAction } from "@/app/actions/cumpleanos";
import CumpleanosView from "@/components/cumpleanos/CumpleanosView";

export default async function CumpleanosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: { rol: string } | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const { data } = await fetchCumpleanosAction();

  return (
    <div className="page-pad">
      <CumpleanosView empleados={data ?? []} />
    </div>
  );
}
