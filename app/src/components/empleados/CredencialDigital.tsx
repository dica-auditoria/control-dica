"use client";

import QRCode from "react-qr-code";
import type { EmpleadoDetalle } from "@/types/empleados";

export default function CredencialDigital({ empleado }: { empleado: EmpleadoDetalle }) {
  const nombreCompleto = `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`.trim();
  const vigente = empleado.estado === "activo";
  const qrValue = `DICA|${empleado.codigo_empleado ?? empleado.id}|${nombreCompleto}|${empleado.puesto}`;
  const ingreso = new Date(empleado.fecha_ingreso).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

      {/* Credencial vertical */}
      <div style={{
        width: 280,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(15,17,23,0.22)",
        background: "linear-gradient(180deg, #0f2a4a 0%, #1B4F8A 55%, #2563a8 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Banda superior dorada */}
        <div style={{ height: 6, background: "linear-gradient(90deg, #e8b84b, #f5d27a, #e8b84b)" }} />

        {/* Encabezado empresa */}
        <div style={{ padding: "16px 20px 12px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.18em", fontFamily: "'DM Mono', monospace" }}>
            DESPACHO INTEGRAL DE CONTADORES
          </div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.18em", fontFamily: "'DM Mono', monospace" }}>
            ASOCIADOS S.C.
          </div>
        </div>

        {/* Foto */}
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 12px" }}>
          <div style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.35)",
            overflow: "hidden",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            color: "rgba(255,255,255,0.5)",
          }}>
            {empleado.foto_url
              ? <img src={empleado.foto_url} alt={nombreCompleto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "👤"
            }
          </div>
        </div>

        {/* Nombre y puesto */}
        <div style={{ textAlign: "center", padding: "0 20px 16px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white", fontFamily: "'DM Serif Display', serif", lineHeight: 1.25, marginBottom: 4 }}>
            {nombreCompleto}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
            {empleado.puesto}
          </div>
          {/* Badge vigente */}
          <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'DM Mono', monospace",
            background: vigente ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
            color: vigente ? "#4ade80" : "#f87171",
            border: `1px solid ${vigente ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
          }}>
            {vigente ? "VIGENTE" : "INACTIVO"}
          </div>
        </div>

        {/* Datos */}
        <div style={{ margin: "0 16px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
          <DataRow label="Departamento" value={empleado.departamento} />
          {empleado.codigo_empleado && (
            <DataRow label="Clave" value={empleado.codigo_empleado} mono />
          )}
          <DataRow label="Ingreso" value={ingreso} />
        </div>

        {/* Separador dorado */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(232,184,75,0.4), transparent)", margin: "0 16px 16px" }} />

        {/* QR */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "0 20px 20px" }}>
          <div style={{ padding: 10, background: "white", borderRadius: 10 }}>
            <QRCode
              value={qrValue}
              size={110}
              fgColor="#0f2a4a"
              bgColor="white"
            />
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", textAlign: "center" }}>
            {empleado.codigo_empleado ?? empleado.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        {/* Banda inferior dorada */}
        <div style={{ height: 5, background: "linear-gradient(90deg, #e8b84b, #f5d27a, #e8b84b)" }} />
      </div>

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

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "7px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontWeight: mono ? 400 : 500, textAlign: "right", maxWidth: 160 }}>
        {value}
      </span>
    </div>
  );
}
