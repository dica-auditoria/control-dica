"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormField, { inputStyle, selectStyle } from "@/components/ui/FormField";
import { useEmpleadoMutations } from "@/hooks/useEmpleadoMutations";
import {
  DEPARTAMENTOS,
  TIPOS_CONTRATO,
  DOMINIO_EMAIL,
} from "@/lib/empleados/constants";
import { generarEmailLocal } from "@/lib/empleados/utils";
import type { TipoContrato } from "@/types/empleados";

export interface SupervisorOption {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
}

export interface UbicacionOption {
  id: string;
  nombre: string;
}

interface Props {
  supervisores: SupervisorOption[];
  ubicaciones: UbicacionOption[];
}

export default function EmpleadoAltaForm({ supervisores, ubicaciones }: Props) {
  const router = useRouter();
  const { crear, loading, error, clearError } = useEmpleadoMutations();

  const [form, setForm] = useState({
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    email_local: "",
    puesto: "",
    departamento: DEPARTAMENTOS[0] as string,
    supervisor_id: "",
    fecha_ingreso: "",
    tipo_contrato: "indeterminado" as TipoContrato,
    zona_ubicacion: "",
    hora_entrada: "",
    hora_salida: "",
  });
  const [emailManual, setEmailManual] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!emailManual && form.nombres && form.apellido_paterno) {
      setForm(f => ({
        ...f,
        email_local: generarEmailLocal(f.nombres, f.apellido_paterno),
      }));
    }
  }, [form.nombres, form.apellido_paterno, emailManual]);

  const isValid =
    form.nombres.trim() &&
    form.apellido_paterno.trim() &&
    form.apellido_materno.trim() &&
    form.email_local.trim() &&
    form.puesto.trim() &&
    form.fecha_ingreso &&
    (form.tipo_contrato !== "practicas" || form.hora_entrada.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const result = await crear({
      ...form,
      supervisor_id: form.supervisor_id || null,
    });
    if (result.error && !result.empleadoId) return;
    if (result.invitacionUrl) setSuccessUrl(result.invitacionUrl);
    if (result.empleadoId) {
      setTimeout(() => router.push(`/dashboard/empleados/${result.empleadoId}`), 2000);
    }
  };

  if (successUrl) {
    return (
      <div style={{
        padding: 24,
        background: "var(--green-light)",
        borderRadius: 8,
        border: "1px solid rgba(45,106,79,0.2)",
      }}>
        <h3 style={{ color: "var(--green)", marginBottom: 8 }}>Empleado creado</h3>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Se generó la invitación para el aviso de privacidad. Comparte este enlace con el empleado:
        </p>
        <code style={{
          display: "block",
          padding: 12,
          background: "var(--card)",
          borderRadius: 4,
          fontSize: 12,
          wordBreak: "break-all",
        }}>
          {successUrl}
        </code>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          background: "var(--red-light)",
          color: "var(--accent)",
          borderRadius: 4,
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <SectionTitle icon="👤" title="Datos personales" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Nombre(s)" required>
          <input style={inputStyle} value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} placeholder="Ej. Saúl" required />
        </FormField>
        <FormField label="Apellido paterno" required>
          <input style={inputStyle} value={form.apellido_paterno} onChange={e => setForm(f => ({ ...f, apellido_paterno: e.target.value }))} placeholder="Ej. Aguilar" required />
        </FormField>
        <FormField label="Apellido materno" required>
          <input style={inputStyle} value={form.apellido_materno} onChange={e => setForm(f => ({ ...f, apellido_materno: e.target.value }))} placeholder="Ej. Mendoza" required />
        </FormField>
      </div>

      <SectionTitle icon="✉" title="Acceso al sistema" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Email institucional" required hint="Se generará automáticamente al escribir nombre y apellido">
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <input
              style={{ ...inputStyle, borderRadius: "4px 0 0 4px", flex: 1 }}
              value={form.email_local}
              onChange={e => { setEmailManual(true); setForm(f => ({ ...f, email_local: e.target.value })); }}
              required
            />
            <span style={{
              padding: "10px 12px",
              background: "var(--surface-2)",
              border: "1.5px solid var(--border-strong)",
              borderLeft: "none",
              borderRadius: "0 4px 4px 0",
              fontSize: 13,
              color: "var(--muted-2)",
            }}>
              {DOMINIO_EMAIL}
            </span>
          </div>
        </FormField>
        <FormField label="Rol en el sistema" required>
          <select style={selectStyle} defaultValue="empleado" disabled>
            <option value="empleado">Empleado</option>
          </select>
        </FormField>
      </div>

      <SectionTitle icon="💼" title="Relación laboral" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Fecha de admisión" required>
          <input type="date" style={inputStyle} value={form.fecha_ingreso} onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} required />
        </FormField>
        <FormField label="Tipo de contrato" required>
          <select style={selectStyle} value={form.tipo_contrato} onChange={e => setForm(f => ({ ...f, tipo_contrato: e.target.value as TipoContrato }))}>
            {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Puesto" required>
          <input style={inputStyle} value={form.puesto} onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))} placeholder="Ej. Auditor Senior" required />
        </FormField>
        <FormField label="Departamento" required>
          <select style={selectStyle} value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}>
            {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label="Supervisor directo" hint="Responde a">
          <select style={selectStyle} value={form.supervisor_id} onChange={e => setForm(f => ({ ...f, supervisor_id: e.target.value }))}>
            <option value="">Seleccionar supervisor…</option>
            {supervisores.map(s => (
              <option key={s.id} value={s.id}>
                {s.nombres} {s.apellido_paterno}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Zona / Ubicación">
          <select style={selectStyle} value={form.zona_ubicacion} onChange={e => setForm(f => ({ ...f, zona_ubicacion: e.target.value }))}>
            <option value="">Sin asignar</option>
            {ubicaciones.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
          </select>
        </FormField>
      </div>

      {form.tipo_contrato === "practicas" && (
        <>
          <SectionTitle icon="🕐" title="Horario de prácticas" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
            <FormField label="Hora de entrada" required>
              <input
                type="time"
                style={inputStyle}
                value={form.hora_entrada}
                onChange={e => setForm(f => ({ ...f, hora_entrada: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Hora de salida">
              <input
                type="time"
                style={inputStyle}
                value={form.hora_salida}
                onChange={e => setForm(f => ({ ...f, hora_salida: e.target.value }))}
              />
            </FormField>
          </div>
          <div style={{
            padding: "8px 12px",
            background: "var(--tint-blue)",
            borderRadius: 4,
            fontSize: 12,
            color: "var(--muted-2)",
            marginBottom: 28,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}>
            <span>ℹ</span>
            <span>Se aplicará una tolerancia de <strong>10 minutos</strong> para el registro de entrada.</span>
          </div>
        </>
      )}

      <div style={{
        padding: 16,
        background: "var(--amber-light)",
        borderRadius: 6,
        fontSize: 12,
        color: "var(--muted-2)",
        marginBottom: 24,
        display: "flex",
        gap: 10,
      }}>
        <span>🛡</span>
        <span>
          Al continuar, se enviará al empleado el aviso de privacidad (LFPDPPP) para su aceptación
          antes de completar su expediente.
        </span>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 16,
        borderTop: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 12, color: isValid ? "var(--green)" : "var(--muted)" }}>
          {isValid ? "✓ Todos los campos requeridos completos" : "Complete los campos requeridos"}
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/empleados" style={{
            padding: "10px 18px",
            border: "1.5px solid var(--border-strong)",
            borderRadius: 4,
            fontSize: 13,
            textDecoration: "none",
            color: "var(--ink)",
          }}>
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!isValid || loading}
            style={{
              padding: "10px 20px",
              background: isValid && !loading ? "var(--green)" : "var(--muted)",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: isValid && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Creando…" : "Crear empleado y enviar invitación"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
      fontSize: 13,
      fontWeight: 600,
      color: "var(--green)",
    }}>
      <span>{icon}</span>
      {title}
    </div>
  );
}
