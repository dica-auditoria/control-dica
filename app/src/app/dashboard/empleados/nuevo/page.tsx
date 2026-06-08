import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmpleadoAltaForm from "@/components/empleados/EmpleadoAltaForm";

interface PerfilRow { rol: string }
type SupabaseServer = ReturnType<typeof createClient>;
type DbQuery = PromiseLike<unknown> & {
  select: (...args: unknown[]) => DbQuery;
  eq: (...args: unknown[]) => DbQuery;
  order: (...args: unknown[]) => DbQuery;
};

function db(supabase: SupabaseServer, table: string) {
  return supabase.from(table as never) as unknown as DbQuery;
}

export default async function NuevoEmpleadoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil || !["admin", "superadmin", "rrhh"].includes(perfil.rol)) redirect("/dashboard");

  const [{ data: supervisoresRaw }, { data: ubicacionesRaw }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombres, apellido_paterno, apellido_materno")
      .eq("estado", "activo")
      .order("nombres"),
    db(supabase, "ubicaciones")
      .select("id, nombre")
      .eq("tipo", "oficina")
      .eq("activo", true)
      .order("nombre") as unknown as Promise<{ data: { id: string; nombre: string }[] | null; error: unknown }>,
  ]);

  const supervisores = supervisoresRaw ?? [];
  const ubicaciones  = (ubicacionesRaw ?? []) as { id: string; nombre: string }[];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <Link href="/dashboard/empleados" style={{
        fontSize: 13,
        color: "var(--muted-2)",
        textDecoration: "none",
        display: "inline-block",
        marginBottom: 16,
      }}>
        ← Regresar a empleados
      </Link>

      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 10,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.1em",
          color: "var(--green)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Fase 1 de 2
        </div>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 26,
          color: "var(--ink)",
          margin: 0,
        }}>
          Alta de nuevo empleado
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-2)", marginTop: 8 }}>
          Captura solo los datos esenciales. El empleado completará el resto desde su cuenta.
        </p>
      </div>

      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 28,
        boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
      }}>
        <EmpleadoAltaForm supervisores={supervisores} ubicaciones={ubicaciones} />
      </div>
    </div>
  );
}
