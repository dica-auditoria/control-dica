"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aceptarPrivacidadEmpleadoAuthAction } from "@/app/actions/empleados";
import { VERSION_AVISO_PRIVACIDAD } from "@/lib/empleados/constants";

const AVISO_TEXTO = `AVISO DE PRIVACIDAD INTEGRAL — DICA

En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), DICA le informa que sus datos personales serán tratados para las siguientes finalidades:

• Gestión de la relación laboral y administración de personal.
• Generación de documentos oficiales (contratos, recibos).
• Cumplimiento de obligaciones ante instituciones mexicanas (IMSS, SAT, INFONAVIT).
• Otorgamiento de prestaciones y seguro médico.

Sus datos personales sensibles (financieros, biométricos, médicos) serán tratados con medidas de seguridad conforme a ISO/IEC 27002:2022.

Para ejercer sus derechos ARCO, contacte: ti@dica-mx.com`;

interface Props {
  nombre: string;
  email: string;
}

export default function EmpleadoAvisoPrivacidadAuth({ nombre, email }: Props) {
  const router = useRouter();
  const [aceptaAviso, setAceptaAviso] = useState(false);
  const [aceptaSensibles, setAceptaSensibles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!aceptaAviso) return;
    setLoading(true);
    setError(null);
    const result = await aceptarPrivacidadEmpleadoAuthAction(aceptaAviso, aceptaSensibles);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div style={{
      width: "100%",
      maxWidth: 680,
      background: "var(--card)",
      borderRadius: 10,
      boxShadow: "0 4px 24px rgba(15,17,23,0.10)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px",
        borderBottom: "1px solid var(--border)",
        background: "#1B4F8A",
      }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          DICA · Control Interno
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "white", margin: 0 }}>
          Aviso de Privacidad
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6, marginBottom: 0 }}>
          {nombre} · {email}
        </p>
      </div>

      <div style={{ padding: "28px 32px" }}>
        <p style={{ fontSize: 13, color: "var(--muted-2)", marginBottom: 16, lineHeight: 1.6 }}>
          Antes de acceder al sistema, debes leer y aceptar el aviso de privacidad conforme a la
          <strong> Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>.
        </p>

        {/* Texto del aviso */}
        <div style={{
          maxHeight: 240,
          overflowY: "auto",
          padding: "16px 18px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          fontSize: 13,
          lineHeight: 1.75,
          whiteSpace: "pre-wrap",
          marginBottom: 20,
          color: "var(--ink)",
        }}>
          {AVISO_TEXTO}
        </div>

        {/* Checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <label style={{ display: "flex", gap: 10, fontSize: 13, cursor: "pointer", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={aceptaAviso}
              onChange={e => setAceptaAviso(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>
              He leído y <strong>acepto</strong> el aviso de privacidad de DICA y consiento el tratamiento
              de mis datos personales con las finalidades descritas.
            </span>
          </label>

          <label style={{ display: "flex", gap: 10, fontSize: 13, cursor: "pointer", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={aceptaSensibles}
              onChange={e => setAceptaSensibles(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>
              Consiento el tratamiento de mis <strong>datos personales sensibles</strong> (financieros,
              biométricos, médicos) para los fines descritos.
            </span>
          </label>
        </div>

        <p style={{
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "'DM Mono', monospace",
          marginBottom: 20,
        }}>
          Versión del aviso: {VERSION_AVISO_PRIVACIDAD} — Tu aceptación quedará registrada con fecha, hora e IP.
        </p>

        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            background: "var(--red-light)",
            color: "var(--accent)",
            fontSize: 13,
            borderRadius: 4,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={!aceptaAviso || loading}
            onClick={handleContinue}
            style={{
              padding: "12px 28px",
              background: aceptaAviso && !loading ? "#1B4F8A" : "var(--muted)",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: aceptaAviso && !loading ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Registrando…" : "Aceptar y continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
