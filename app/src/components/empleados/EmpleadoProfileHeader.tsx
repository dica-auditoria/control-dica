"use client";

import Link from "next/link";
import Image from "next/image";
import StatusBadge from "@/components/ui/StatusBadge";
import { iniciales, nombreCompleto } from "@/lib/empleados/utils";
import type { EmpleadoDetalle } from "@/types/empleados";

interface Props {
  empleado: EmpleadoDetalle;
  fotoUrl?: string | null;
  onEditar?: () => void;
  soloLectura?: boolean;
}

export default function EmpleadoProfileHeader({ empleado, fotoUrl, onEditar, soloLectura = false }: Props) {
  const ingreso = new Date(empleado.fecha_ingreso + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <>
      <Link href="/dashboard/empleados" style={{
        fontSize: 13, color: "rgba(15,17,23,0.5)",
        textDecoration: "none", display: "inline-block", marginBottom: 16,
      }}>
        ← Regresar a empleados
      </Link>

      <div style={{
        background: "white", border: "1px solid var(--border)", borderRadius: 8,
        padding: 24, display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 20, marginBottom: 24,
        boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
      }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {fotoUrl ? (
              <Image src={fotoUrl} alt="Foto de perfil" width={56} height={56} style={{ width: "100%", height: "100%", objectFit: "cover" }} unoptimized />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>
                {iniciales(empleado.nombres, empleado.apellido_paterno)}
              </span>
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: 0, color: "var(--ink)" }}>
                {nombreCompleto(empleado.nombres, empleado.apellido_paterno, empleado.apellido_materno)}
              </h1>
              <StatusBadge estado={empleado.estado} />
            </div>
            <div style={{ fontSize: 13, color: "rgba(15,17,23,0.55)", marginBottom: 4 }}>
              {empleado.puesto} · Depto. {empleado.departamento}
              {empleado.codigo_empleado && ` · ${empleado.codigo_empleado}`}
            </div>
            <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.45)" }}>
              {empleado.email_institucional} · Ingreso: {ingreso}
            </div>
          </div>
        </div>
        {!soloLectura && (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={btnOutline}>Generar resguardo</button>
            <button type="button" onClick={onEditar} style={btnPrimary}>Editar</button>
          </div>
        )}
      </div>
    </>
  );
}

const btnOutline: React.CSSProperties = {
  padding: "8px 14px", background: "white",
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};
const btnPrimary: React.CSSProperties = {
  ...btnOutline, background: "var(--green)", color: "white", border: "none",
};
