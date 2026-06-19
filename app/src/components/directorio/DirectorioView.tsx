"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlacesAutocomplete from "./PlacesAutocomplete";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  crearUbicacionAction,
  actualizarUbicacionAction,
  toggleUbicacionActivoAction,
  eliminarUbicacionAction,
} from "@/app/actions/directorio";
import { crearEntidadAction } from "@/app/actions/entidades";
import type { Ubicacion, CrearUbicacionInput, EntidadOption, UbicacionTipo, PlaceData } from "@/types/directorio";

export interface EmpresaDirectorioItem {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  totalContratos: number;
  contratosVigentes: number;
  totalArchivos: number;
  totalUsuarios: number;
}

interface Props {
  oficinas: Ubicacion[];
  entidades: EntidadOption[];
  empresas: EmpresaDirectorioItem[];
  rolActual: string;
}

const EMPTY_FORM: CrearUbicacionInput = {
  tipo: "oficina",
  nombre: "",
  entidad_id: null,
  calle: "",
  numero_ext: "",
  numero_int: "",
  colonia: "",
  municipio: "",
  estado_dir: "",
  cp: "",
  pais: "México",
  lat: null,
  lng: null,
  plus_code: null,
  radio_metros: 50,
  telefono: "",
  contacto_nombre: "",
  contacto_email: "",
  notas: "",
};

type TabActual = UbicacionTipo | "empresas";

const SOLO_EMPRESAS_ROLES = ["empleado", "rrhh"];

export default function DirectorioView({ oficinas, entidades, empresas: initialEmpresas, rolActual }: Props) {
  const soloEmpresas = SOLO_EMPRESAS_ROLES.includes(rolActual);
  const [tab, setTab] = useState<TabActual>(soloEmpresas ? "empresas" : "oficina");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Ubicacion | null>(null);
  const [form, setForm] = useState<CrearUbicacionInput>({ ...EMPTY_FORM });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado empresas
  const [empresas, setEmpresas] = useState(initialEmpresas);
  const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [errorEmpresa, setErrorEmpresa] = useState("");
  const [submittingEmpresa, setSubmittingEmpresa] = useState(false);
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const puedeEditar = ["admin", "superadmin"].includes(rolActual);
  const lista = oficinas;

  const abrirNuevo = () => {
    setForm({ ...EMPTY_FORM, tipo: tab as UbicacionTipo });
    setEditando(null);
    setError(null);
    setModalOpen(true);
  };

  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEmpresa(true);
    setErrorEmpresa("");
    const result = await crearEntidadAction(nombreEmpresa);
    if (result.error) { setErrorEmpresa(result.error); setSubmittingEmpresa(false); return; }
    if (result.entidad) {
      setEmpresas(prev => [...prev, { ...result.entidad!, totalContratos: 0, contratosVigentes: 0, totalArchivos: 0, totalUsuarios: 0 }]);
    }
    setNombreEmpresa("");
    setModalEmpresaOpen(false);
    setSubmittingEmpresa(false);
    router.refresh();
  };

  const abrirEditar = (u: Ubicacion) => {
    setForm({
      tipo: u.tipo,
      nombre: u.nombre,
      entidad_id: u.entidad_id,
      calle: u.calle ?? "",
      numero_ext: u.numero_ext ?? "",
      numero_int: u.numero_int ?? "",
      colonia: u.colonia ?? "",
      municipio: u.municipio ?? "",
      estado_dir: u.estado_dir ?? "",
      cp: u.cp ?? "",
      pais: u.pais,
      lat: u.lat,
      lng: u.lng,
      plus_code: u.plus_code,
      radio_metros: u.radio_metros,
      telefono: u.telefono ?? "",
      contacto_nombre: u.contacto_nombre ?? "",
      contacto_email: u.contacto_email ?? "",
      notas: u.notas ?? "",
    });
    setEditando(u);
    setError(null);
    setModalOpen(true);
  };

  const handlePlaceSelect = (place: PlaceData) => {
    setForm(f => ({
      ...f,
      nombre: f.nombre || place.nombre_lugar,
      calle: place.calle || f.calle,
      numero_ext: place.numero_ext || f.numero_ext,
      colonia: place.colonia || f.colonia,
      municipio: place.municipio || f.municipio,
      estado_dir: place.estado_dir || f.estado_dir,
      cp: place.cp || f.cp,
      pais: place.pais || f.pais,
      lat: place.lat,
      lng: place.lng,
      plus_code: place.plus_code || null,
    }));
  };

  const handleGuardar = () => {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    setError(null);
    startTransition(async () => {
      const result = editando
        ? await actualizarUbicacionAction(editando.id, form)
        : await crearUbicacionAction(form);
      if (result.error) { setError(result.error); return; }
      setModalOpen(false);
    });
  };

  const handleToggle = (u: Ubicacion) => {
    startTransition(async () => { await toggleUbicacionActivoAction(u.id, !u.activo); });
  };

  const handleEliminar = (u: Ubicacion) => {
    setConfirmMsg(`¿Eliminar "${u.nombre}"? Esta acción no se puede deshacer.`);
    setConfirmAction(() => () => {
      setConfirmOpen(false);
      startTransition(async () => { await eliminarUbicacionAction(u.id); });
    });
    setConfirmOpen(true);
  };

  const set = (key: keyof CrearUbicacionInput, val: string | number | null) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <>
      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>
            Directorio de Direcciones
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Oficinas DICA · Empresas y contratos
          </p>
        </div>
        {puedeEditar && tab !== "empresas" && (
          <button onClick={abrirNuevo} style={btnPrimary}>+ Nueva ubicación</button>
        )}
        {puedeEditar && tab === "empresas" && (
          <button onClick={() => { setModalEmpresaOpen(true); setErrorEmpresa(""); setNombreEmpresa(""); }} style={btnPrimary}>
            + Nueva empresa
          </button>
        )}
      </div>

      <div style={{ padding: "28px 32px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
          {((soloEmpresas ? ["empresas"] : ["oficina", "empresas"]) as TabActual[]).map(t => {
            const labels: Record<string, string> = { oficina: "🏢 Oficinas DICA", empresas: "🏛 Entidades" };
            const counts: Record<string, number> = { oficina: oficinas.length, empresas: empresas.length };
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "10px 20px", border: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                background: "none",
                color: tab === t ? "var(--accent)" : "var(--muted-2)",
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1,
              }}>
                {labels[t]}
                <span style={{
                  marginLeft: 8, padding: "1px 7px", borderRadius: 100, fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  background: tab === t ? "rgba(200,71,42,0.1)" : "var(--surface-2)",
                  color: tab === t ? "var(--accent)" : "var(--muted)",
                }}>
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Empresas */}
        {tab === "empresas" && (
          empresas.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
              No hay empresas registradas
              {puedeEditar && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => { setModalEmpresaOpen(true); setErrorEmpresa(""); setNombreEmpresa(""); }} style={{ ...btnPrimary, fontSize: 13 }}>
                    + Agregar primera empresa
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {empresas.map(emp => (
                <EmpresaCard key={emp.id} empresa={emp} />
              ))}
            </div>
          )
        )}

        {/* Tab Ubicaciones */}
        {tab !== "empresas" && (
          lista.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "var(--muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
              No hay registros
              {puedeEditar && <div style={{ marginTop: 12 }}><button onClick={abrirNuevo} style={{ ...btnPrimary, fontSize: 13 }}>+ Agregar primera</button></div>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
              {lista.map(u => (
                <UbicacionCard key={u.id} ubicacion={u} puedeEditar={puedeEditar} onEditar={abrirEditar} onToggle={handleToggle} onEliminar={handleEliminar} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal nueva empresa */}
      {modalEmpresaOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalEmpresaOpen(false); }}
        >
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(15,17,23,0.18)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Nueva empresa</h2>
              <button onClick={() => setModalEmpresaOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleCrearEmpresa}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {errorEmpresa && (
                  <div style={{ padding: 12, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>{errorEmpresa}</div>
                )}
                <F label="Nombre de la empresa" required>
                  <input
                    style={iStyle}
                    value={nombreEmpresa}
                    onChange={e => setNombreEmpresa(e.target.value)}
                    placeholder="Ej. Constructora Omega S.A. de C.V."
                    required
                    autoFocus
                  />
                </F>
              </div>
              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalEmpresaOpen(false)} style={btnOutline} disabled={submittingEmpresa}>Cancelar</button>
                <button type="submit" style={btnPrimary} disabled={submittingEmpresa}>
                  {submittingEmpresa ? "Creando…" : "Crear empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ubicación */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 8, width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(15,17,23,0.18)" }}>
            {/* Modal header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {editando ? "Editar oficina" : "Nueva oficina"}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {error && <div style={{ padding: 12, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>{error}</div>}

              {/* Google Maps autocomplete */}
              <div>
                <div style={sectionLabel}>Buscar con Google Maps</div>
                <PlacesAutocomplete onSelect={handlePlaceSelect} disabled={isPending} />
                {form.lat && form.lng && (
                  <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <CoordBadge label="Lat" value={form.lat.toFixed(6)} />
                    <CoordBadge label="Lng" value={form.lng.toFixed(6)} />
                    {form.plus_code && <CoordBadge label="Plus Code" value={form.plus_code} />}
                    <button type="button" onClick={() => setForm(f => ({ ...f, lat: null, lng: null, plus_code: null }))}
                      style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      × Limpiar coordenadas
                    </button>
                  </div>
                )}
              </div>

              {/* Nombre */}
              <F label="Nombre" required>
                <input style={iStyle} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder={form.tipo === "oficina" ? "Ej. Oficina Central CDMX" : "Ej. Zona Norte Monterrey"} />
              </F>

              {/* Dirección */}
              <div>
                <div style={sectionLabel}>Dirección</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <F label="Calle">
                      <input style={iStyle} value={form.calle ?? ""} onChange={e => set("calle", e.target.value)} placeholder="Nombre de la calle" />
                    </F>
                  </div>
                  <F label="Núm. exterior">
                    <input style={iStyle} value={form.numero_ext ?? ""} onChange={e => set("numero_ext", e.target.value)} placeholder="123" />
                  </F>
                  <F label="Núm. interior">
                    <input style={iStyle} value={form.numero_int ?? ""} onChange={e => set("numero_int", e.target.value)} placeholder="A" />
                  </F>
                  <F label="Colonia">
                    <input style={iStyle} value={form.colonia ?? ""} onChange={e => set("colonia", e.target.value)} />
                  </F>
                  <F label="C.P.">
                    <input style={{ ...iStyle, fontFamily: "'DM Mono', monospace" }} value={form.cp ?? ""} onChange={e => set("cp", e.target.value)} placeholder="00000" maxLength={5} />
                  </F>
                  <F label="Municipio / Alcaldía">
                    <input style={iStyle} value={form.municipio ?? ""} onChange={e => set("municipio", e.target.value)} />
                  </F>
                  <F label="Estado">
                    <input style={iStyle} value={form.estado_dir ?? ""} onChange={e => set("estado_dir", e.target.value)} placeholder="Ej. Ciudad de México" />
                  </F>
                </div>
              </div>

              {/* Radio geofencing (solo oficinas) */}
              {form.tipo === "oficina" && (
                <div>
                  <div style={sectionLabel}>Geofencing</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <F label="Radio de asistencia (metros)">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="number"
                          min={10}
                          max={2000}
                          style={{ ...iStyle, width: 100, fontFamily: "'DM Mono', monospace" }}
                          value={form.radio_metros ?? 50}
                          onChange={e => set("radio_metros", parseInt(e.target.value) || 50)}
                        />
                        <span style={{ fontSize: 12, color: "var(--muted-2)" }}>m</span>
                        <div style={{ flex: 1, height: 6, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden", maxWidth: 200 }}>
                          <div style={{ height: "100%", width: `${Math.min(100, ((form.radio_metros ?? 50) / 500) * 100)}%`, background: "var(--green)", borderRadius: 999, transition: "width 0.2s" }} />
                        </div>
                      </div>
                    </F>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    Los empleados deberán estar dentro de este radio para que su check-in sea válido.
                  </div>
                </div>
              )}

              {/* Contacto */}
              <div>
                <div style={sectionLabel}>Contacto</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <F label="Teléfono">
                    <input style={{ ...iStyle, fontFamily: "'DM Mono', monospace" }} value={form.telefono ?? ""} onChange={e => set("telefono", e.target.value)} placeholder="+52 55 1234 5678" />
                  </F>
                  <F label="Nombre del contacto">
                    <input style={iStyle} value={form.contacto_nombre ?? ""} onChange={e => set("contacto_nombre", e.target.value)} />
                  </F>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <F label="Email del contacto">
                      <input type="email" style={iStyle} value={form.contacto_email ?? ""} onChange={e => set("contacto_email", e.target.value)} />
                    </F>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <F label="Notas adicionales">
                <textarea style={{ ...iStyle, minHeight: 64, resize: "vertical" }} value={form.notas ?? ""} onChange={e => set("notas", e.target.value)} placeholder="Instrucciones de acceso, horarios, referencias…" />
              </F>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setModalOpen(false)} style={btnOutline} disabled={isPending}>Cancelar</button>
                <button onClick={handleGuardar} style={btnPrimary} disabled={isPending}>
                  {isPending ? "Guardando…" : editando ? "Guardar cambios" : "Crear ubicación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar ubicación"
        message={confirmMsg}
        confirmLabel="Eliminar"
        danger
        onConfirm={() => confirmAction && confirmAction()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

// -------- Empresa Card --------

function EmpresaCard({ empresa }: { empresa: EmpresaDirectorioItem }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
      opacity: empresa.activo ? 1 : 0.55,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(15,17,23,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, marginTop: 1 }}>
            🏛
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>
              {empresa.nombre}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
              Alta: {new Date(empresa.created_at).toLocaleDateString("es-MX")}
            </div>
          </div>
        </div>
        <span style={{
          padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600,
          fontFamily: "'DM Mono', monospace", flexShrink: 0, marginTop: 2,
          background: empresa.activo ? "rgba(45,106,79,0.1)" : "var(--surface-2)",
          color: empresa.activo ? "var(--green)" : "var(--muted)",
        }}>
          {empresa.activo ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{empresa.totalContratos}</div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Contratos</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "var(--green)", lineHeight: 1 }}>{empresa.contratosVigentes}</div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Vigentes</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{empresa.totalArchivos}</div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Archivos</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{empresa.totalUsuarios}</div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>Usuarios</div>
        </div>
      </div>

      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
        <Link
          href={`/dashboard/directorio/empresa/${empresa.id}`}
          style={{
            display: "block", textAlign: "center",
            padding: "7px", background: "var(--surface)",
            color: "var(--ink)", border: "1px solid var(--border-strong)",
            borderRadius: 4, fontSize: 12, fontWeight: 600,
            textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Ver directorio →
        </Link>
      </div>
    </div>
  );
}

// -------- Cards --------

function UbicacionCard({ ubicacion: u, puedeEditar, onEditar, onToggle, onEliminar }: {
  ubicacion: Ubicacion;
  puedeEditar: boolean;
  onEditar: (u: Ubicacion) => void;
  onToggle: (u: Ubicacion) => void;
  onEliminar: (u: Ubicacion) => void;
}) {
  const dir = [u.calle && `${u.calle}${u.numero_ext ? " " + u.numero_ext : ""}`, u.colonia, u.municipio].filter(Boolean).join(", ");
  const estadoCP = [u.estado_dir, u.cp && `CP ${u.cp}`].filter(Boolean).join(", ");
  const tieneCoords = u.lat && u.lng;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)", opacity: u.activo ? 1 : 0.55 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: u.tipo === "oficina" ? "rgba(45,106,79,0.1)" : "rgba(200,71,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {u.tipo === "oficina" ? "🏢" : "📍"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nombre}</div>
            {u.tipo === "zona_cliente" && u.entidad_nombre && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{u.entidad_nombre}</div>
            )}
          </div>
        </div>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, fontFamily: "'DM Mono', monospace", background: u.activo ? "rgba(45,106,79,0.1)" : "var(--surface-2)", color: u.activo ? "var(--green)" : "var(--muted)", flexShrink: 0 }}>
          {u.activo ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
        {dir && <Row icon="📌" text={[dir, estadoCP].filter(Boolean).join(" · ")} />}
        {tieneCoords && (
          <Row icon="🎯" text={`${u.lat!.toFixed(5)}, ${u.lng!.toFixed(5)}`} mono />
        )}
        {u.plus_code && <Row icon="🔢" text={u.plus_code} mono />}
        {u.tipo === "oficina" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 14 }}>📡</span>
            <span style={{ fontSize: 12, color: "var(--muted-2)" }}>
              Radio de asistencia:
            </span>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "var(--green)" }}>
              {u.radio_metros} m
            </span>
            {!tieneCoords && (
              <span style={{ fontSize: 10, color: "var(--amber)", marginLeft: 4 }}>⚠ Sin coordenadas</span>
            )}
          </div>
        )}
        {u.telefono && <Row icon="📞" text={u.telefono} mono />}
        {u.contacto_nombre && <Row icon="👤" text={u.contacto_nombre + (u.contacto_email ? ` · ${u.contacto_email}` : "")} />}
        {u.notas && (
          <div style={{ marginTop: 4, padding: "8px 10px", background: "var(--surface)", borderRadius: 4, fontSize: 12, color: "var(--muted-2)", fontStyle: "italic" }}>
            {u.notas}
          </div>
        )}
      </div>

      {puedeEditar && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => onToggle(u)} style={{ ...btnSmall, color: u.activo ? "var(--amber)" : "var(--green)" }}>
            {u.activo ? "Desactivar" : "Activar"}
          </button>
          <button onClick={() => onEditar(u)} style={btnSmall}>Editar</button>
          <button onClick={() => onEliminar(u)} style={{ ...btnSmall, color: "var(--accent)", borderColor: "rgba(200,71,42,0.3)", marginLeft: "auto" }}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

function Row({ icon, text, mono }: { icon: string; text: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: "var(--muted-2)", fontFamily: mono ? "'DM Mono', monospace" : undefined, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function CoordBadge({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, padding: "3px 8px", background: "rgba(45,106,79,0.08)", borderRadius: 4, fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--green)" }}>
      <span style={{ opacity: 0.6 }}>{label}:</span> {value}
    </span>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// -------- Styles --------
const iStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: 13, border: "1.5px solid var(--border-strong)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--card)", outline: "none", boxSizing: "border-box" };
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 };
const btnPrimary: React.CSSProperties = { padding: "10px 18px", background: "var(--accent)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnOutline: React.CSSProperties = { padding: "10px 18px", background: "var(--card)", color: "var(--ink)", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const btnSmall: React.CSSProperties = { padding: "5px 12px", background: "var(--card)", color: "var(--muted-2)", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
