"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  fetchEmergenciaAction,
  guardarContactoEmergenciaAction,
  eliminarContactoEmergenciaAction,
  guardarMedicoAction,
  agregarIncapacidadAction,
  eliminarIncapacidadAction,
  subirDocumentoIncapacidadAction,
  getIncapacidadUrlAction,
  type ContactoEmergencia,
  type CondicionesMedicas,
  type Incapacidad,
} from "@/app/actions/empleado_emergencia";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const labelTipo: Record<string, string> = {
  imss: "IMSS",
  empresa: "Empresa",
  maternidad: "Maternidad",
  paternidad: "Paternidad",
  otro: "Otro",
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Shared styles (match the rest of EmpleadoDetalleView) ────────────────────

const iSt: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  border: "1.5px solid var(--border-strong)",
  borderRadius: 4,
  fontFamily: "'DM Sans', sans-serif",
  color: "var(--ink)",
  background: "var(--card)",
  outline: "none",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(15,17,23,0.05)",
  marginBottom: 20,
};

const cardHeaderStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardBodyStyle: React.CSSProperties = { padding: 20 };

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(15,17,23,0.45)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 18px",
  background: "var(--green)",
  color: "white",
  border: "none",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnOutline: React.CSSProperties = {
  padding: "8px 14px",
  background: "var(--card)",
  color: "var(--ink)",
  border: "1.5px solid var(--border-strong)",
  borderRadius: 4,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnDanger: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--card)",
  color: "var(--accent)",
  border: "1.5px solid rgba(200,71,42,0.3)",
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnSm: React.CSSProperties = {
  padding: "5px 12px",
  background: "var(--green)",
  color: "white",
  border: "none",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

function MF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Contacto Card ────────────────────────────────────────────────────────────

interface ContactoCardProps {
  orden: number;
  contacto: ContactoEmergencia | null;
  empleadoId: string;
  onSaved: (c: ContactoEmergencia) => void;
  onDeleted: () => void;
}

function ContactoCard({ orden, contacto, empleadoId, onSaved, onDeleted }: ContactoCardProps) {
  const [editing, setEditing] = useState(!contacto);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: contacto?.nombre ?? "",
    parentesco: contacto?.parentesco ?? "",
    telefono: contacto?.telefono ?? "",
    telefono_alt: contacto?.telefono_alt ?? "",
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.telefono.trim()) return;
    setSaving(true);
    const res = await guardarContactoEmergenciaAction(empleadoId, { orden, ...form });
    setSaving(false);
    if (!res.error && res.contacto) { onSaved(res.contacto); setEditing(false); }
  };

  const handleDelete = async () => {
    if (!contacto) return;
    await eliminarContactoEmergenciaAction(contacto.id, empleadoId);
    onDeleted();
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editing || !contacto ? 14 : 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Contacto {orden}</span>
        {contacto && !editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnOutline} onClick={() => setEditing(true)}>Editar</button>
            <button style={btnDanger} onClick={handleDelete}>Eliminar</button>
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <MF label="Nombre completo">
            <input style={iSt} value={form.nombre} onChange={f("nombre")} placeholder="Nombre Apellido" />
          </MF>
          <MF label="Parentesco">
            <input style={iSt} value={form.parentesco} onChange={f("parentesco")} placeholder="Madre, Padre, Esposo/a…" />
          </MF>
          <MF label="Teléfono">
            <input style={iSt} type="tel" value={form.telefono} onChange={f("telefono")} placeholder="55 0000 0000" />
          </MF>
          <MF label="Teléfono alternativo">
            <input style={iSt} type="tel" value={form.telefono_alt} onChange={f("telefono_alt")} placeholder="Opcional" />
          </MF>
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, marginTop: 4 }}>
            <button style={btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            {contacto && <button style={btnOutline} onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
        </div>
      ) : contacto ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 40px" }}>
          {[
            { l: "Nombre", v: contacto.nombre },
            { l: "Parentesco", v: contacto.parentesco },
            { l: "Teléfono", v: contacto.telefono },
            { l: "Tel. alternativo", v: contacto.telefono_alt ?? "—" },
          ].map(({ l, v }) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: "rgba(15,17,23,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 14, color: "var(--ink)" }}>{v}</div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "rgba(15,17,23,0.35)", fontSize: 13, margin: 0 }}>Sin contacto registrado</p>
      )}
    </div>
  );
}

// ─── Condiciones médicas ──────────────────────────────────────────────────────

const CONDICIONES: { key: keyof CondicionesMedicas; label: string }[] = [
  { key: "hipertension",  label: "Hipertensión" },
  { key: "diabetes",      label: "Diabetes" },
  { key: "epilepsia",     label: "Epilepsia" },
  { key: "asma",          label: "Asma" },
  { key: "cardiopatia",   label: "Cardiopatía" },
];

function MedicoPanel({ empleadoId, inicial }: { empleadoId: string; inicial: CondicionesMedicas | null }) {
  const empty: CondicionesMedicas = { hipertension: false, diabetes: false, epilepsia: false, asma: false, cardiopatia: false, otras_condiciones: null, notas: null };
  const [form, setForm] = useState<CondicionesMedicas>(inicial ?? empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const toggle = (k: keyof CondicionesMedicas) =>
    setForm(p => ({ ...p, [k]: !p[k] }));

  const handleSave = async () => {
    setSaving(true);
    await guardarMedicoAction(empleadoId, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        {CONDICIONES.map(({ key, label }) => (
          <label key={key} style={{
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            padding: "6px 14px",
            border: `1.5px solid ${form[key] ? "var(--green)" : "var(--border-strong)"}`,
            borderRadius: 4,
            background: form[key] ? "rgba(45,106,79,0.06)" : "white",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            color: form[key] ? "var(--green)" : "var(--ink)",
            fontWeight: form[key] ? 600 : 400,
          }}>
            <input type="checkbox" checked={!!form[key]} onChange={() => toggle(key)} style={{ accentColor: "var(--green)" }} />
            {label}
          </label>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <MF label="Otras condiciones">
          <input
            style={iSt}
            value={form.otras_condiciones ?? ""}
            onChange={e => setForm(p => ({ ...p, otras_condiciones: e.target.value || null }))}
            placeholder="Descripción breve"
          />
        </MF>
        <MF label="Notas adicionales">
          <input
            style={iSt}
            value={form.notas ?? ""}
            onChange={e => setForm(p => ({ ...p, notas: e.target.value || null }))}
            placeholder="Medicamentos actuales, restricciones, etc."
          />
        </MF>
      </div>

      <button
        style={{ ...btnPrimary, background: saved ? "var(--green)" : "var(--green)" }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar condiciones"}
      </button>
    </div>
  );
}

// ─── Incapacidades ────────────────────────────────────────────────────────────

const TIPOS_INCAP = ["imss", "empresa", "maternidad", "paternidad", "otro"];

interface IncapForm {
  folio: string;
  tipo: string;
  motivo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

function IncapacidadesPanel({ empleadoId, inicial }: { empleadoId: string; inicial: Incapacidad[] }) {
  const [lista, setLista]       = useState<Incapacidad[]>(inicial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [archivo, setArchivo]   = useState<File | null>(null);
  // for post-creation doc upload on existing rows
  const [uploadingId, setUploadingId]           = useState<string | null>(null);
  const [pendingUploadId, setPendingUploadId]   = useState<string | null>(null);
  const tableFileRef                            = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<IncapForm>({ folio: "", tipo: "imss", motivo: "", fecha_inicio: "", fecha_fin: "" });

  const f = (k: keyof IncapForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const resetForm = () => {
    setForm({ folio: "", tipo: "imss", motivo: "", fecha_inicio: "", fecha_fin: "" });
    setArchivo(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.motivo.trim() || !form.fecha_inicio) return;
    setSaving(true);
    const res = await agregarIncapacidadAction(empleadoId, form);
    if (!res.error && res.incapacidad) {
      let incapacidad = res.incapacidad!;
      // upload document if one was selected
      if (archivo) {
        const fd = new FormData();
        fd.append("file", archivo);
        const upRes = await subirDocumentoIncapacidadAction(empleadoId, incapacidad.id, fd);
        if (!upRes.error && upRes.ruta) {
          incapacidad = { ...incapacidad, ruta_documento: upRes.ruta };
        }
      }
      setLista(p => [incapacidad, ...p]);
      resetForm();
    }
    setSaving(false);
  };

  const handleDelete = async (inc: Incapacidad) => {
    await eliminarIncapacidadAction(inc.id, empleadoId, inc.ruta_documento);
    setLista(p => p.filter(i => i.id !== inc.id));
  };

  const handleDownload = async (ruta: string) => {
    const res = await getIncapacidadUrlAction(ruta);
    if (res.url) window.open(res.url, "_blank");
  };

  // post-creation upload for existing rows without document
  const handleTableFileClick = (incId: string) => {
    setPendingUploadId(incId);
    tableFileRef.current?.click();
  };

  const handleTableFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadId) return;
    setUploadingId(pendingUploadId);
    const fd = new FormData();
    fd.append("file", file);
    const res = await subirDocumentoIncapacidadAction(empleadoId, pendingUploadId, fd);
    if (!res.error && res.ruta) {
      setLista(p => p.map(i => i.id === pendingUploadId ? { ...i, ruta_documento: res.ruta! } : i));
    }
    setUploadingId(null);
    setPendingUploadId(null);
    if (tableFileRef.current) tableFileRef.current.value = "";
  };

  return (
    <div>
      <input ref={tableFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleTableFileChange} style={{ display: "none" }} />

      {lista.length === 0 && !showForm && (
        <p style={{ color: "rgba(15,17,23,0.35)", fontSize: 13, margin: "0 0 14px" }}>Sin incapacidades registradas.</p>
      )}

      {lista.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Folio", "Tipo", "Motivo", "Inicio", "Fin", "Días", "Doc.", ""].map(h => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: "rgba(15,17,23,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((inc, i) => (
                <tr key={inc.id} style={{ borderBottom: i < lista.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "10px 12px", color: "var(--ink)", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{inc.folio ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "var(--ink)" }}>{labelTipo[inc.tipo] ?? inc.tipo}</td>
                  <td style={{ padding: "10px 12px", color: "var(--ink)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.motivo}</td>
                  <td style={{ padding: "10px 12px", color: "var(--ink)", whiteSpace: "nowrap" }}>{fmt(inc.fecha_inicio)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--ink)", whiteSpace: "nowrap" }}>{fmt(inc.fecha_fin)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--ink)", textAlign: "center" }}>{inc.dias_totales ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {inc.ruta_documento ? (
                      <button onClick={() => handleDownload(inc.ruta_documento!)} style={{ background: "none", border: "none", color: "#1677ff", fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                        Ver
                      </button>
                    ) : uploadingId === inc.id ? (
                      <span style={{ color: "rgba(15,17,23,0.35)", fontSize: 12 }}>Subiendo…</span>
                    ) : (
                      <button onClick={() => handleTableFileClick(inc.id)} style={{ background: "none", border: "none", color: "#1677ff", fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                        + Doc
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => handleDelete(inc)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <MF label="Folio (opcional)">
              <input style={{ ...iSt, fontFamily: "'DM Mono', monospace" }} value={form.folio} onChange={f("folio")} placeholder="Ej. 123456" />
            </MF>
            <MF label="Tipo">
              <select style={iSt} value={form.tipo} onChange={f("tipo")}>
                {TIPOS_INCAP.map(t => <option key={t} value={t}>{labelTipo[t]}</option>)}
              </select>
            </MF>
            <div style={{ gridColumn: "1/-1" }}>
              <MF label="Motivo / Diagnóstico">
                <input style={iSt} value={form.motivo} onChange={f("motivo")} placeholder="Diagnóstico o motivo" />
              </MF>
            </div>
            <MF label="Fecha inicio">
              <input style={iSt} type="date" value={form.fecha_inicio} onChange={f("fecha_inicio")} />
            </MF>
            <MF label="Fecha fin">
              <input style={iSt} type="date" value={form.fecha_fin} onChange={f("fecha_fin")} />
            </MF>
            <div style={{ gridColumn: "1/-1" }}>
              <MF label="Documento (PDF o imagen)">
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "16px 12px",
                  border: `2px dashed ${archivo ? "var(--green)" : "var(--border-strong)"}`,
                  borderRadius: 4, cursor: "pointer",
                  background: archivo ? "rgba(45,106,79,0.04)" : "var(--surface)",
                  transition: "border-color 0.15s, background 0.15s",
                }}>
                  <span style={{ fontSize: 22 }}>{archivo ? "✅" : "📎"}</span>
                  <span style={{ fontSize: 13, color: archivo ? "var(--green)" : "rgba(15,17,23,0.5)", fontWeight: archivo ? 600 : 400 }}>
                    {archivo ? archivo.name : "Haz clic para seleccionar archivo"}
                  </span>
                  {!archivo && <span style={{ fontSize: 11, color: "rgba(15,17,23,0.35)" }}>PDF, JPG o PNG · máx. 10 MB · opcional</span>}
                  {archivo && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setArchivo(null); }}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, cursor: "pointer", marginTop: 2 }}
                    >
                      Quitar archivo
                    </button>
                  )}
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                  />
                </label>
              </MF>
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, marginTop: 4 }}>
              <button style={btnPrimary} onClick={handleAdd} disabled={saving}>
                {saving ? "Guardando…" : "Registrar incapacidad"}
              </button>
              <button style={btnOutline} onClick={resetForm}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <button style={btnSm} onClick={() => setShowForm(true)}>+ Agregar incapacidad</button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EmergenciaSection({ empleadoId }: { empleadoId: string }) {
  const [loading, setLoading]           = useState(true);
  const [contactos, setContactos]       = useState<(ContactoEmergencia | null)[]>([null, null]);
  const [medico, setMedico]             = useState<CondicionesMedicas | null>(null);
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([]);

  useEffect(() => {
    fetchEmergenciaAction(empleadoId).then(res => {
      if (!res.error) {
        const cs: (ContactoEmergencia | null)[] = [null, null];
        res.contactos.forEach(c => { cs[c.orden - 1] = c; });
        setContactos(cs);
        setMedico(res.medico);
        setIncapacidades(res.incapacidades);
      }
      setLoading(false);
    });
  }, [empleadoId]);

  if (loading) {
    return (
      <div style={{ ...cardStyle }}>
        <div style={cardHeaderStyle}><span style={{ fontWeight: 600, fontSize: 14 }}>Emergencia</span></div>
        <div style={{ ...cardBodyStyle, color: "rgba(15,17,23,0.35)", fontSize: 13 }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Contactos */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Contactos de emergencia</span>
          <span style={{ fontSize: 12, color: "rgba(15,17,23,0.4)" }}>Máx. 2 contactos</span>
        </div>
        <div style={cardBodyStyle}>
          {contactos.map((c, i) => (
            <ContactoCard
              key={i}
              orden={i + 1}
              contacto={c}
              empleadoId={empleadoId}
              onSaved={saved => setContactos(p => { const n = [...p]; n[i] = saved; return n; })}
              onDeleted={() => setContactos(p => { const n = [...p]; n[i] = null; return n; })}
            />
          ))}
        </div>
      </div>

      {/* Condiciones médicas */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Condiciones médicas</span>
        </div>
        <div style={cardBodyStyle}>
          <MedicoPanel empleadoId={empleadoId} inicial={medico} />
        </div>
      </div>

      {/* Incapacidades */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Historial de incapacidades</span>
        </div>
        <div style={cardBodyStyle}>
          <IncapacidadesPanel empleadoId={empleadoId} inicial={incapacidades} />
        </div>
      </div>
    </div>
  );
}
