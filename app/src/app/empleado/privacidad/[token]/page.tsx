import { notFound } from "next/navigation";
import { obtenerInvitacionAction } from "@/app/actions/empleados";
import EmpleadoPrivacyStep from "@/components/empleados/EmpleadoPrivacyStep";

export default async function PrivacidadEmpleadoPage({
  params,
}: {
  params: { token: string };
}) {
  const invitacion = await obtenerInvitacionAction(params.token);

  if (invitacion.error || !invitacion.empleado_id) {
    notFound();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(15,17,23,0.4)",
        }}>
          Control · DICA México
        </div>
      </div>
      <EmpleadoPrivacyStep
        token={params.token}
        nombreCompleto={invitacion.nombre_completo!}
        email={invitacion.email!}
      />
    </div>
  );
}
