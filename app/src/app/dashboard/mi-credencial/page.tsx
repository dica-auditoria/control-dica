import { redirect } from "next/navigation";
import { fetchMiExpedienteAction } from "@/app/actions/empleados";
import CredencialDigital from "@/components/empleados/CredencialDigital";
import type { EmpleadoDetalle } from "@/types/empleados";

export default async function MiCredencialPage() {
  const result = await fetchMiExpedienteAction();
  if (result.error || !result.data) redirect("/dashboard");

  return (
    <div style={{
      padding: "40px 24px",
      maxWidth: 480,
      margin: "0 auto",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: "0 0 4px", color: "var(--ink)" }}>
          Mi Credencial
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-2)", margin: 0 }}>
          Credencial digital de identificación DICA
        </p>
      </div>

      <CredencialDigital empleado={result.data as unknown as EmpleadoDetalle} />
    </div>
  );
}
