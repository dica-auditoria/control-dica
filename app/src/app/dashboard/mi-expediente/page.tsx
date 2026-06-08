import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchMiExpedienteAction } from "@/app/actions/empleados";
import EmpleadoDetalleView from "@/components/empleados/EmpleadoDetalleView";
import { mapEmpleadoDetalle } from "@/lib/empleados/map";

export const metadata = { title: "Mi Expediente — Control DICA" };

export default async function MiExpedientePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await fetchMiExpedienteAction();

  if (result.error || !result.data) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>
          Mi Expediente
        </h1>
        <div style={{
          marginTop: 32, padding: 32, background: "var(--card)",
          border: "1px solid var(--border)", borderRadius: 8,
          textAlign: "center", color: "var(--muted)", fontSize: 14,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--ink)" }}>Expediente no encontrado</div>
          <div style={{ fontSize: 13 }}>
            Tu cuenta no tiene un expediente de empleado asociado. Contacta al equipo de Recursos Humanos.
          </div>
        </div>
      </div>
    );
  }

  const empleado = mapEmpleadoDetalle(result.data as Record<string, unknown>);

  return (
    <EmpleadoDetalleView
      empleado={empleado}
      soloLectura={!result.esAdmin}
    />
  );
}
