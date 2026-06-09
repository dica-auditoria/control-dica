"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import type { EmpleadoDetalle } from "@/types/empleados";
import { TIPOS_CONTRATO } from "@/lib/empleados/constants";

const LABEL_CONTRATO: Record<string, string> = Object.fromEntries(
  TIPOS_CONTRATO.map(t => [t.value, t.label])
);

export default function CredencialDigital({ empleado }: { empleado: EmpleadoDetalle }) {
  const [flip, setFlip] = useState(false);

  const nombreCompleto = `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`.trim();
  const vigente = empleado.estado === "activo";
  const qrValue = `DICA|${empleado.codigo_empleado ?? empleado.id}|${nombreCompleto}|${empleado.puesto}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

      {/* Flip container */}
      <div
        style={{
          width: 360,
          height: 220,
          perspective: 1000,
          cursor: "pointer",
        }}
        onClick={() => setFlip(f => !f)}
        title="Clic para voltear"
      >
        <div style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          transform: flip ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>

          {/* FRENTE */}
          <div style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(15,17,23,0.18)",
            background: "linear-gradient(135deg, #0f2a4a 0%, #1B4F8A 60%, #2563a8 100%)",
          }}>
            {/* Banda superior */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 6,
              background: "linear-gradient(90deg, #e8b84b, #f5d27a, #e8b84b)",
            }} />

            <div style={{ padding: "18px 20px 16px", display: "flex", gap: 16, height: "100%", boxSizing: "border-box" }}>
              {/* Foto / Avatar */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  border: "2.5px solid rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, color: "rgba(255,255,255,0.6)",
                }}>
                  {empleado.foto_url
                    ? <img src={empleado.foto_url} alt={nombreCompleto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : "👤"
                  }
                </div>
                {/* Badge vigente */}
                <div style={{
                  padding: "2px 10px",
                  borderRadius: 100,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  fontFamily: "'DM Mono', monospace",
                  background: vigente ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  color: vigente ? "#4ade80" : "#f87171",
                  border: `1px solid ${vigente ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
                }}>
                  {vigente ? "VIGENTE" : "INACTIVO"}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                    DESPACHO INTEGRAL DE CONTADORES ASOCIADOS S.C.
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white", lineHeight: 1.2, fontFamily: "'DM Serif Display', serif", marginBottom: 2 }}>
                    {nombreCompleto}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginBottom: 10 }}>
                    {empleado.puesto}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <InfoRow label="Depto." value={empleado.departamento} />
                    <InfoRow label="Contrato" value={LABEL_CONTRATO[empleado.tipo_contrato] ?? empleado.tipo_contrato} />
                    {empleado.codigo_empleado && (
                      <InfoRow label="Clave" value={empleado.codigo_empleado} mono />
                    )}
                  </div>
                </div>
                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                    {`Desde ${new Date(empleado.fecha_ingreso).toLocaleDateString("es-MX", { year: "numeric", month: "short" })}`}
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                    DICA · control.dica-mx.com
                  </div>
                </div>
              </div>
            </div>

            {/* Banda inferior decorativa */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
              background: "linear-gradient(90deg, #e8b84b, #f5d27a, #e8b84b)",
            }} />
          </div>

          {/* REVERSO */}
          <div style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(15,17,23,0.18)",
            background: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            border: "1px solid #e2e8f0",
          }}>
            <div style={{ padding: 12, background: "white", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <QRCode
                value={qrValue}
                size={120}
                fgColor="#0f2a4a"
                bgColor="white"
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f2a4a", fontFamily: "'DM Sans', sans-serif" }}>
                {empleado.codigo_empleado ?? "—"}
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                {nombreCompleto}
              </div>
            </div>
          </div>

        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", margin: 0 }}>
        Toca la credencial para ver el código QR
      </p>

      {/* Botón imprimir */}
      <button
        onClick={() => window.print()}
        style={{
          padding: "9px 22px",
          background: "var(--card)",
          border: "1.5px solid var(--border-strong)",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span>🖨</span> Imprimir / Guardar PDF
      </button>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", minWidth: 40 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontWeight: mono ? 400 : 500 }}>
        {value}
      </span>
    </div>
  );
}
