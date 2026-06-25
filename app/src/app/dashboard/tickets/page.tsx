import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTicketsAction } from "@/app/actions/tickets";
import TicketsView from "@/components/tickets/TicketsView";

export default async function TicketsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: perfil } = await (supabase.from("usuarios") as any)
    .select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  if (!perfil) redirect("/login");

  const esAdmin = ["admin", "superadmin", "rrhh"].includes(perfil.rol);

  const { data: tickets } = await fetchTicketsAction();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px" }}>
      <TicketsView tickets={tickets ?? []} esAdmin={esAdmin} />
    </div>
  );
}
