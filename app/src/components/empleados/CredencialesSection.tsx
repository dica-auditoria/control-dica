"use client";

import React, { useState, useEffect } from "react";
import {
  fetchCredencialesEmpleadoAction,
  invitarPortalEmpleadoAction,
  resetPasswordEmpleadoAction,
  type CredencialesData,
} from "@/app/actions/credenciales";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--ink)", fontFamily: mono ? "'DM Mono', monospace" : undefined }}>{value}</div>
    </div>
  );
}

export default function CredencialesSection({ empleadoId }: { empleadoId: string }) {
  const [cred, setCred] = useState<CredencialesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState<"invite" | "reset" | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredencialesEmpleadoAction(empleadoId).then(res => {
      if (!res.error) setCred(res.data);
      setLoading(false);
    });
  }, [empleadoId]);

  const handleInvitar = async () => {
    if (!cred) return;
    setAccion("invite");
    setError(null);
    const res = await invitarPortalEmpleadoAction(empleadoId);
    if (res.error) setError(res.error);
    else setResultado("Invitación enviada al correo institucional del empleado.");
    setAccion(null);
  };

  const handleReset = async () => {
    if (!cred) return;
    setAccion("reset");
    setError(null);
    const res = await resetPasswordEmpleadoAction(cred.email_institucional);
    if (res.error) setError(res.error);
    else { setResetUrl(res.resetUrl); setResultado("Enlace de restablecimiento generado."); }
    setAccion(null);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(15,17,23,0.05)",
    marginBottom: 20,
  };

  const headerStyle: React.CSSProperties = {
    padding: "14px 20px",
    borderBottom: "1px solid var(--border)",
    fontWeight: 600,
    fontSize: 14,
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>Credenciales de acceso</div>
        <div style={{ padding: 20, color: "var(--muted)", fontSize: 13 }}>Cargando…</div>
      </div>
    );
  }

  if (!cred) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>Credenciales de acceso</div>
        <div style={{ padding: 20, color: "var(--muted)", fontSize: 13 }}>No disponible</div>
      </div>
    );
  }

  return (
    <div>
      {/* Email e identidad */}
      <div style={cardStyle}>
        <div style={headerStyle}>Correo institucional</div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Row label="Email" value={cred.email_institucional} mono />
          <Row label="Aviso de privacidad" value={cred.privacidad.aceptada ? `Aceptado el ${fmtDate(cred.privacidad.fecha)}` : "Pendiente"} />
          {cred.privacidad.ip && <Row label="IP de aceptación" value={cred.privacidad.ip} mono />}
        </div>
      </div>

      {/* Acceso al portal */}
      <div style={cardStyle}>
        <div style={{ ...headerStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Acceso al portal de empleados</span>
          <span style={{
            padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            fontFamily: "'DM Mono', monospace",
            background: cred.portal.tiene_acceso ? "rgba(45,106,79,0.1)" : "var(--surface-2)",
            color: cred.portal.tiene_acceso ? "var(--green)" : "var(--muted)",
          }}>
            {cred.portal.tiene_acceso ? "Con acceso" : "Sin acceso"}
          </span>
        </div>
        <div style={{ padding: 20 }}>
          {cred.portal.tiene_acceso ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <Row label="Último acceso" value={fmtDate(cred.portal.ultimo_acceso)} />
              <Row label="Email de acceso" value={cred.portal.email_auth ?? "—"} mono />
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted-2)", marginBottom: 20, lineHeight: 1.6 }}>
              El empleado no tiene acceso al portal. Envía una invitación para que pueda crear su cuenta y acceder a sus datos.
            </p>
          )}

          {error && (
            <div style={{ padding: "10px 14px", background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          {resultado && (
            <div style={{ padding: "10px 14px", background: "rgba(45,106,79,0.08)", color: "var(--green)", borderRadius: 4, fontSize: 13, marginBottom: 14 }}>
              {resultado}
            </div>
          )}
          {resetUrl && (
            <div style={{ padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, fontFamily: "'DM Mono', monospace", wordBreak: "break-all", marginBottom: 14, color: "var(--ink)" }}>
              {resetUrl}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleInvitar}
              disabled={accion !== null}
              style={{ padding: "8px 16px", background: cred.portal.tiene_acceso ? "white" : "var(--green)", color: cred.portal.tiene_acceso ? "var(--ink)" : "white", border: cred.portal.tiene_acceso ? "1.5px solid var(--border-strong)" : "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: accion === "invite" ? 0.7 : 1 }}
            >
              {accion === "invite" ? "Enviando…" : cred.portal.tiene_acceso ? "Reenviar invitación" : "Invitar al portal"}
            </button>
            {cred.portal.tiene_acceso && (
              <button
                onClick={handleReset}
                disabled={accion !== null}
                style={{ padding: "8px 16px", background: "var(--card)", color: "var(--amber)", border: "1.5px solid rgba(181,86,14,0.3)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: accion === "reset" ? 0.7 : 1 }}
              >
                {accion === "reset" ? "Generando…" : "Generar enlace de restablecimiento"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invitaciones recientes */}
      {cred.invitaciones.length > 0 && (
        <div style={cardStyle}>
          <div style={headerStyle}>Invitaciones recientes</div>
          <div style={{ padding: "8px 20px 12px" }}>
            {cred.invitaciones.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: i < cred.invitaciones.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600, background: inv.usada ? "rgba(45,106,79,0.1)" : "var(--surface-2)", color: inv.usada ? "var(--green)" : "var(--muted)" }}>
                  {inv.usada ? "Usada" : "Pendiente"}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted-2)", textTransform: "capitalize" }}>{inv.tipo}</span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginLeft: "auto" }}>
                  {fmtDate(inv.created_at)}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                  Vence: {fmtDate(inv.expires_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
