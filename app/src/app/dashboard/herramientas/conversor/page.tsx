import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConversorArchivos from "@/components/herramientas/ConversorArchivos";

export default async function ConversorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single();
  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  return <ConversorArchivos />;
}
