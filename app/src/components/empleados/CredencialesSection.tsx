"use client";

import React, { useState, useEffect } from "react";
import {
  fetchCredencialesEmpleadoAction,
  invitarPortalEmpleadoAction,
  resetPasswordEmpleadoAction,
  cambiarPasswordEmpleadoAction,
  fetchAccesosEmpleadoAction,
  crearAccesoEmpleadoAction,
  actualizarAccesoEmpleadoAction,
  eliminarAccesoEmpleadoAction,
  type CredencialesData,
  type EmpleadoAcceso,
} from "@/app/actions/credenciales";
import { inputStyle } from "@/components/ui/FormField";

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

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--green)",
  color: "white",
  border: "none",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--card)",
  color: "var(--ink)",
  border: "1.5px solid var(--border-strong)",
  borderRadius: 4,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

// ─── Accesos a sistemas ───────────────────────────────────────────────────────

const BLANK_ACCESO = { sistema: "", usuario: "", contrasena: "", url: "", notas: "" };

function AccesosCard({ empleadoId }: { empleadoId: string }) {
  const [accesos, setAccesos] = useState<EmpleadoAcceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_ACCESO);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    fetchAccesosEmpleadoAction(empleadoId).then(r => { setAccesos(r.data); setLoading(false); });

  useEffect(() => { load(); }, [empleadoId]);

  const startEdit = (a: EmpleadoAcceso) => {
    setEditId(a.id);
    setForm({ sistema: a.sistema, usuario: a.usuario, contrasena: a.contrasena ?? "", url: a.url ?? "", notas: a.notas ?? "" });
    setShowForm(false);
    setErr(null);
  };

  const cancelForm = () => { setShowForm(false); setEditId(null); setForm(BLANK_ACCESO); setErr(null); };

  const handleSave = async () => {
    setErr(null);
    if (!form.sistema.trim() || !form.usuario.trim()) { setErr("Sistema y usuario son requeridos"); return; }
    setSaving(true);
    const res = editId
      ? await actualizarAccesoEmpleadoAction(editId, form)
      : await crearAccesoEmpleadoAction(empleadoId, form);
    setSaving(false);
    if (res.error) { setErr(res.error); return; }
    cancelForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este acceso?")) return;
    setDeletingId(id);
    await eliminarAccesoEmpleadoAction(id);
    setDeletingId(null);
    load();
  };

  const toggleReveal = (id: string) =>
    setRevealed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const inlineForm = (
    <div style={{ padding: 16, background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sistema *</div>
          <input style={inputStyle} placeholder="Ej. Gmail, SAP, Slack…" value={form.sistema} onChange={e => setForm(f => ({ ...f, sistema: e.target.value }))} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Usuario *</div>
          <input style={inputStyle} placeholder="usuario@dominio.com" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Contraseña</div>
          <input type="password" style={inputStyle} placeholder="Dejar vacío si no aplica" value={form.contrasena} onChange={e => setForm(f => ({ ...f, contrasena: e.target.value }))} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>URL</div>
          <input style={inputStyle} placeholder="https://…" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Notas</div>
          <input style={inputStyle} placeholder="Información adicional…" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        </div>
      </div>
      {err && <div style={{ padding: "8px 12px", background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 12, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Guardando…" : editId ? "Actualizar" : "Guardar acceso"}
        </button>
        <button onClick={cancelForm} style={btnSecondary}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div style={cardStyle}>
      <div style={{ ...headerStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Accesos a sistemas internos</span>
        {!showForm && !editId && (
          <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>
            + Agregar
          </button>
        )}
      </div>

      {showForm && !editId && inlineForm}

      {loading ? (
        <div style={{ padding: "16px 20px", color: "var(--muted)", fontSize: 13 }}>Cargando…</div>
      ) : accesos.length === 0 && !showForm ? (
        <div style={{ padding: "20px", color: "var(--muted-2)", fontSize: 13, textAlign: "center" }}>
          Sin accesos registrados
        </div>
      ) : (
        <div>
          {accesos.map((a, i) => (
            <React.Fragment key={a.id}>
              <div style={{
                padding: "12px 20px",
                borderTop: i === 0 && !showForm ? "none" : "1px solid var(--border)",
                display: "grid",
                gridTemplateColumns: "160px 1fr 1fr auto",
                gap: 16,
                alignItems: "center",
                background: editId === a.id ? "var(--surface)" : undefined,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{a.sistema}</div>
                  {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--green)", textDecoration: "none" }}>{a.url.replace(/^https?:\/\//, "")}</a>}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Usuario</div>
                  <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "var(--ink-2)" }}>{a.usuario}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Contraseña</div>
                  {a.contrasena ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "var(--ink-2)" }}>
                        {revealed.has(a.id) ? a.contrasena : "••••••••"}
                      </span>
                      <button
                        onClick={() => toggleReveal(a.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", padding: 0 }}
                      >
                        {revealed.has(a.id) ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => editId === a.id ? cancelForm() : startEdit(a)}
                    style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12 }}
                  >
                    {editId === a.id ? "Cancelar" : "Editar"}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    style={{ padding: "5px 10px", background: "none", border: "1.5px solid rgba(200,71,42,0.3)", color: "var(--accent)", borderRadius: 4, fontSize: 12, cursor: "pointer", opacity: deletingId === a.id ? 0.5 : 1 }}
                  >
                    {deletingId === a.id ? "…" : "Eliminar"}
                  </button>
                </div>
              </div>
              {editId === a.id && inlineForm}
              {a.notas && editId !== a.id && (
                <div style={{ padding: "4px 20px 10px", fontSize: 12, color: "var(--muted-2)" }}>
                  <span style={{ fontWeight: 600 }}>Nota:</span> {a.notas}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sección principal ────────────────────────────────────────────────────────

export default function CredencialesSection({ empleadoId }: { empleadoId: string }) {
  const [cred, setCred] = useState<CredencialesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState<"invite" | "reset" | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cambiar contraseña
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchCredencialesEmpleadoAction(empleadoId).then(res => {
      if (!res.error) setCred(res.data);
      setLoading(false);
    });
  }, [empleadoId]);

  const handleInvitar = async () => {
    if (!cred) return;
    setAccion("invite"); setError(null);
    const res = await invitarPortalEmpleadoAction(empleadoId);
    if (res.error) setError(res.error);
    else setResultado("Invitación enviada al correo institucional del empleado.");
    setAccion(null);
  };

  const handleReset = async () => {
    if (!cred) return;
    setAccion("reset"); setError(null);
    const res = await resetPasswordEmpleadoAction(cred.email_institucional);
    if (res.error) setError(res.error);
    else { setResetUrl(res.resetUrl); setResultado("Enlace de restablecimiento generado."); }
    setAccion(null);
  };

  const handleCambiarPwd = async () => {
    if (!cred?.portal.usuario_id) return;
    setPwdBusy(true); setPwdMsg(null);
    const res = await cambiarPasswordEmpleadoAction(cred.portal.usuario_id, newPwd);
    setPwdBusy(false);
    if (res.error) setPwdMsg({ ok: false, text: res.error });
    else { setPwdMsg({ ok: true, text: "Contraseña actualizada correctamente." }); setNewPwd(""); setShowPwdForm(false); }
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
          {pwdMsg && (
            <div style={{ padding: "10px 14px", background: pwdMsg.ok ? "rgba(45,106,79,0.08)" : "var(--red-light)", color: pwdMsg.ok ? "var(--green)" : "var(--accent)", borderRadius: 4, fontSize: 13, marginBottom: 14 }}>
              {pwdMsg.text}
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

          {/* Formulario cambiar contraseña */}
          {showPwdForm && (
            <div style={{ padding: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--ink)" }}>Nueva contraseña</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="password"
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Mínimo 6 caracteres"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCambiarPwd()}
                />
                <button
                  onClick={handleCambiarPwd}
                  disabled={pwdBusy || newPwd.length < 6}
                  style={{ ...btnPrimary, opacity: pwdBusy || newPwd.length < 6 ? 0.6 : 1, whiteSpace: "nowrap" }}
                >
                  {pwdBusy ? "Guardando…" : "Guardar"}
                </button>
                <button onClick={() => { setShowPwdForm(false); setNewPwd(""); setPwdMsg(null); }} style={btnSecondary}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleInvitar}
              disabled={accion !== null}
              style={{ ...btnSecondary, opacity: accion === "invite" ? 0.7 : 1 }}
            >
              {accion === "invite" ? "Enviando…" : cred.portal.tiene_acceso ? "Reenviar invitación" : "Invitar al portal"}
            </button>
            {cred.portal.tiene_acceso && (
              <>
                <button
                  onClick={handleReset}
                  disabled={accion !== null}
                  style={{ padding: "8px 16px", background: "var(--card)", color: "var(--amber)", border: "1.5px solid rgba(181,86,14,0.3)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: accion === "reset" ? 0.7 : 1 }}
                >
                  {accion === "reset" ? "Generando…" : "Generar enlace de restablecimiento"}
                </button>
                <button
                  onClick={() => { setShowPwdForm(p => !p); setPwdMsg(null); setNewPwd(""); }}
                  style={{ padding: "8px 16px", background: showPwdForm ? "var(--surface-2)" : "var(--card)", color: "var(--ink)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Cambiar contraseña
                </button>
              </>
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

      {/* Accesos a sistemas internos */}
      <AccesosCard empleadoId={empleadoId} />
    </div>
  );
}
