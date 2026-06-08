"use client";

import { useState } from "react";
import { useEmpleadoMutations } from "@/hooks/useEmpleadoMutations";
import { VERSION_AVISO_PRIVACIDAD } from "@/lib/empleados/constants";

const AVISO_TEXTO = `AVISO DE PRIVACIDAD INTEGRAL — DICA

En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), DICA le informa que sus datos personales serán tratados para las siguientes finalidades:

• Gestión de la relación laboral y administración de personal.
• Generación de documentos oficiales (contratos, recibos).
• Cumplimiento de obligaciones ante instituciones mexicanas (IMSS, SAT, INFONAVIT).
• Otorgamiento de prestaciones y seguro médico.

Sus datos personales sensibles (financieros, biométricos, médicos) serán tratados con medidas de seguridad conforme a ISO/IEC 27002:2022.

Para ejercer sus derechos ARCO, contacte: privacidad@dica.mx`;

interface Props {
  token: string;
  nombreCompleto: string;
  email: string;
}

export default function EmpleadoPrivacyStep({ token, nombreCompleto, email }: Props) {
  const { aceptarPrivacidad, loading, error, clearError } = useEmpleadoMutations();
  const [aceptaAviso, setAceptaAviso] = useState(false);
  const [aceptaSensibles, setAceptaSensibles] = useState(false);
  const [done, setDone] = useState(false);

  const handleContinue = async () => {
    clearError();
    const result = await aceptarPrivacidad(token, aceptaAviso, aceptaSensibles);
    if (!result.error) setDone(true);
  };

  if (done) {
    return (
      <div style={{
        maxWidth: 640,
        margin: "48px auto",
        padding: 32,
        background: "var(--card)",
        borderRadius: 8,
        textAlign: "center",
        boxShadow: "0 2px 12px rgba(15,17,23,0.08)",
      }}>
        <h2 style={{ color: "var(--green)", fontFamily: "'DM Serif Display', serif" }}>
          Aceptación registrada
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-2)", marginTop: 12 }}>
          Gracias, {nombreCompleto}. Puede cerrar esta ventana. Recibirá instrucciones
          en {email} para completar su expediente.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 720,
      margin: "32px auto",
      padding: "32px 40px",
      background: "var(--card)",
      borderRadius: 8,
      boxShadow: "0 2px 12px rgba(15,17,23,0.08)",
    }}>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 24,
        marginBottom: 8,
        color: "var(--ink)",
      }}>
        Paso 1: Aviso de privacidad
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted-2)", marginBottom: 24 }}>
        {nombreCompleto} · {email}
      </p>

      <div style={{
        maxHeight: 280,
        overflowY: "auto",
        padding: 20,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
        marginBottom: 20,
      }}>
        {AVISO_TEXTO}
      </div>

      <label style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: 13, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={aceptaAviso}
          onChange={e => setAceptaAviso(e.target.checked)}
        />
        <span>
          He leído y <strong>acepto</strong> el aviso de privacidad de DICA y consiento el
          tratamiento de mis datos personales con las finalidades descritas.
        </span>
      </label>

      <label style={{ display: "flex", gap: 10, marginBottom: 20, fontSize: 13, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={aceptaSensibles}
          onChange={e => setAceptaSensibles(e.target.checked)}
        />
        <span>
          Consiento el tratamiento de mis <strong>datos personales sensibles</strong> (financieros,
          biométricos, médicos) para los fines descritos.
        </span>
      </label>

      <p style={{
        fontSize: 11,
        color: "var(--muted)",
        fontFamily: "'DM Mono', monospace",
        marginBottom: 24,
      }}>
        Versión del aviso: {VERSION_AVISO_PRIVACIDAD} — Su aceptación quedará registrada con fecha, hora e IP.
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

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          disabled={!aceptaAviso || loading}
          onClick={handleContinue}
          style={{
            padding: "12px 24px",
            background: aceptaAviso && !loading ? "var(--green)" : "rgba(15,17,23,0.2)",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 600,
            cursor: aceptaAviso && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Guardando…" : "Continuar ›"}
        </button>
      </div>
    </div>
  );
}
