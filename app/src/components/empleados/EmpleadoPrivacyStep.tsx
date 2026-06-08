"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEmpleadoMutations } from "@/hooks/useEmpleadoMutations";
import { VERSION_AVISO_PRIVACIDAD, AVISO_PRIVACIDAD_EMPLEADO } from "@/lib/empleados/constants";

interface Props {
  token: string;
  nombreCompleto: string;
  email: string;
}

export default function EmpleadoPrivacyStep({ token, nombreCompleto, email }: Props) {
  const router = useRouter();
  const { aceptarPrivacidad, loading, error, clearError } = useEmpleadoMutations();
  const [aceptaAviso, setAceptaAviso] = useState(false);
  const [aceptaSensibles, setAceptaSensibles] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!done) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); router.push("/login"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done, router]);

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
        <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: "var(--green)", fontFamily: "'DM Serif Display', serif", marginBottom: 12 }}>
          Aceptación registrada
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-2)", marginBottom: 20, lineHeight: 1.6 }}>
          Gracias, <strong>{nombreCompleto}</strong>. Tu aviso de privacidad quedó registrado.<br />
          Serás redirigido al inicio de sesión en unos segundos.
        </p>
        <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginBottom: 20 }}>
          Redirigiendo en {countdown}…
        </div>
        <button
          onClick={() => router.push("/login")}
          style={{
            padding: "10px 24px",
            background: "var(--green)",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Ir al inicio de sesión ahora
        </button>
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
        {AVISO_PRIVACIDAD_EMPLEADO}
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
            background: aceptaAviso && !loading ? "var(--green)" : "var(--muted)",
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
