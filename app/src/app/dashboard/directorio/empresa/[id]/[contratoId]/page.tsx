import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchArchivosContratoAction } from "@/app/actions/archivos";
import { fetchRequerimientosContratoAction } from "@/app/actions/requerimientos";
import ContratoArchivosView from "@/components/contratos/ContratoArchivosView";
import type { Contrato } from "@/types/contratos";

interface PerfilRow { rol: string }
interface EntidadRow { id: string; nombre: string }

export default async function ContratoArchivosPage({
  params,
}: {
  params: { id: string; contratoId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rContrato, rEntidad, rCliente, rEmpleado, rReqs] = await Promise.all([
    (admin.from("contratos") as any)
      .select("*")
      .eq("id", params.contratoId)
      .eq("entidad_id", params.id)
      .single() as Promise<{ data: Contrato | null; error: unknown }>,
    (admin.from("entidades") as any)
      .select("id, nombre")
      .eq("id", params.id)
      .single() as Promise<{ data: EntidadRow | null; error: unknown }>,
    fetchArchivosContratoAction(params.contratoId, "cliente"),
    fetchArchivosContratoAction(params.contratoId, "empleado"),
    fetchRequerimientosContratoAction(params.contratoId),
  ]);

  if (!rContrato.data || !rEntidad.data) notFound();

  return (
    <ContratoArchivosView
      contrato={rContrato.data}
      entidadNombre={rEntidad.data.nombre}
      entidadId={params.id}
      archivosCliente={rCliente.data ?? []}
      archivosEmpleado={rEmpleado.data ?? []}
      requerimientos={rReqs.data ?? []}
      rol={perfil.rol}
      usuarioActualId={user.id}
    />
  );
}
