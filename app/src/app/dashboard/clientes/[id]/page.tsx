import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchClienteConContratosAction } from "@/app/actions/contratos";
import ClienteDetalleView from "@/components/clientes/ClienteDetalleView";

interface PerfilRow { rol: string }

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const result = await fetchClienteConContratosAction(params.id);

  if (result.error || !result.data) notFound();

  return <ClienteDetalleView cliente={result.data} rol={perfil.rol} />;
}
