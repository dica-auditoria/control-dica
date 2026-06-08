"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aceptarPrivacidadClienteAction } from "@/app/actions/cliente_privacidad";

const VERSION_AVISO_CLIENTE = "2026.06.01";

const AVISO_TEXTO = `AVISO DE PRIVACIDAD INTEGRAL — DICA México / TKS México

En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, DICA México, S.A. de C.V. ("DICA"), con domicilio en 1er Retorno Osa Menor #3, piso 4, Col. Atlicayotl, Heroica Puebla de Zaragoza, Pue., C.P. 72810, es responsable del tratamiento de sus datos personales.

FINALIDADES DEL TRATAMIENTO

Los datos personales que usted proporcione serán utilizados para las siguientes finalidades primarias:

• Gestión y administración de la relación contractual entre su empresa y DICA.
• Custodia, resguardo y control de documentos corporativos e institucionales bajo medidas de seguridad ISO/IEC 27002:2022.
• Cumplimiento de obligaciones legales, fiscales y regulatorias aplicables.
• Comunicación relacionada con el estado de sus documentos, requerimientos y vencimientos.
• Generación de reportes y evidencias de auditoría.

DATOS PERSONALES TRATADOS

Podremos tratar los siguientes datos personales:
• Identificación: nombre, RFC, cargo, firma electrónica.
• Contacto: correo electrónico, teléfono, domicilio.
• Patrimoniales / corporativos: documentos de la empresa, contratos, estados financieros, poderes notariales.

TRANSFERENCIAS

Sus datos no serán transferidos a terceros sin su consentimiento, salvo en los casos previstos por la LFPDPPP (autoridades competentes, obligaciones legales).

DERECHOS ARCO

Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Para ejercerlos, envíe su solicitud a: privacidad@dica.mx

CAMBIOS AL AVISO

Nos reservamos el derecho de modificar este aviso. Cualquier cambio será notificado a través de la plataforma o correo registrado.`;

interface Props {
  nombre: string;
  email: string;
}

export default function ClientePrivacidadStep({ nombre, email }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleAceptar = () => {
    if (!acepta) return;
    setError(null);
    startTransition(async () => {
      const res = await aceptarPrivacidadClienteAction();
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    });
  };

  if (done) {
    return (
      <div style={{
        maxWidth: 640, margin: "80px auto", padding: 40,
        background: "white", borderRadius: 8, textAlign: "center",
        boxShadow: "0 2px 12px rgba(15,17,23,0.08)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: "var(--green)", fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 8 }}>
          Aceptación registrada
        </h2>
        <p style={{ fontSize: 14, color: "rgba(15,17,23,0.55)" }}>
          Gracias, {nombre}. Redirigiendo a tu portal…
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 760, margin: "40px auto", padding: "40px 48px",
      background: "white", borderRadius: 8,
      boxShadow: "0 2px 16px rgba(15,17,23,0.08)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
        <div style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(15,17,23,0.35)", marginBottom: 8,
        }}>
          Control DICA México · Aviso de privacidad
        </div>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif", fontSize: 26,
          color: "var(--ink)", margin: 0, marginBottom: 6,
        }}>
          Aviso de Privacidad
        </h1>
        <p style={{ fontSize: 13, color: "rgba(15,17,23,0.5)", margin: 0 }}>
          {nombre} · {email}
        </p>
      </div>

      {/* Aviso */}
      <div style={{
        maxHeight: 320, overflowY: "auto",
        padding: 20, background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 6,
        fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap",
        color: "var(--ink)", marginBottom: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {AVISO_TEXTO}
      </div>

      {/* Checkbox aceptación */}
      <label style={{
        display: "flex", gap: 12, marginBottom: 24,
        fontSize: 13, cursor: "pointer", alignItems: "flex-start",
      }}>
        <input
          type="checkbox"
          checked={acepta}
          onChange={e => setAcepta(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--green)", width: 16, height: 16 }}
        />
        <span>
          He leído y <strong>acepto</strong> el aviso de privacidad de DICA México y consiento
          el tratamiento de mis datos personales con las finalidades descritas. Entiendo que
          puedo ejercer mis derechos ARCO en cualquier momento contactando a{" "}
          <strong>privacidad@dica.mx</strong>.
        </span>
      </label>

      {/* Meta info */}
      <p style={{
        fontSize: 11, fontFamily: "'DM Mono', monospace",
        color: "rgba(15,17,23,0.35)", marginBottom: 24,
      }}>
        Versión del aviso: {VERSION_AVISO_CLIENTE} · Su aceptación quedará registrada con fecha, hora e IP.
      </p>

      {error && (
        <div style={{
          padding: 12, marginBottom: 16,
          background: "var(--red-light)", color: "var(--accent)",
          fontSize: 13, borderRadius: 4,
        }}>
          {error}
        </div>
      )}

      {/* Acción */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(15,17,23,0.4)", margin: 0 }}>
          Al continuar, accederás al portal de documentos.
        </p>
        <button
          type="button"
          disabled={!acepta || isPending}
          onClick={handleAceptar}
          style={{
            padding: "12px 28px",
            background: acepta && !isPending ? "var(--green)" : "rgba(15,17,23,0.15)",
            color: acepta && !isPending ? "white" : "rgba(15,17,23,0.35)",
            border: "none", borderRadius: 4,
            fontSize: 14, fontWeight: 600,
            cursor: acepta && !isPending ? "pointer" : "not-allowed",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.15s",
          }}
        >
          {isPending ? "Guardando…" : "Aceptar y continuar ›"}
        </button>
      </div>
    </div>
  );
}
