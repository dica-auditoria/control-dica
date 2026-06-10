"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "./UploadZone";
import { deleteArchivoAction } from "@/app/actions/archivos";

export interface ArchivoItem {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  size_bytes: number;
  hash_sha256: string;
  created_at: string;
  contrato_id: string | null;
  entidad_nombre: string | null;
  contrato_nombre: string | null;
  subido_por_nombre: string | null;
}

interface ArchivosViewProps {
  archivos: ArchivoItem[];
  entidadId: string;
  rol: string;
}

export default function ArchivosView({ archivos, entidadId, rol }: ArchivosViewProps) {
  const router   = useRouter();
  const isAdmin  = rol === "admin" || rol === "superadmin";

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [busqueda,       setBusqueda]       = useState("");
  const [filtroEntidad,  setFiltroEntidad]  = useState("");
  const [filtroContrato, setFiltroContrato] = useState("");

  // ── Selección ──────────────────────────────────────────────────────────────
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [eliminando,    setEliminando]    = useState(false);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);

  // ── Opciones de filtro ─────────────────────────────────────────────────────
  const entidades = useMemo(() => {
    const s = new Map<string, string>();
    archivos.forEach(f => { if (f.entidad_nombre) s.set(f.entidad_nombre, f.entidad_nombre); });
    return Array.from(s.values()).sort();
  }, [archivos]);

  const contratos = useMemo(() => {
    const s = new Map<string, { id: string | null; nombre: string }>();
    archivos
      .filter(f => !filtroEntidad || f.entidad_nombre === filtroEntidad)
      .forEach(f => {
        if (f.contrato_nombre) s.set(f.contrato_nombre, { id: f.contrato_id, nombre: f.contrato_nombre });
      });
    return Array.from(s.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [archivos, filtroEntidad]);

  // Resetear contrato si cambia entidad y el contrato ya no aplica
  const handleEntidadChange = (val: string) => {
    setFiltroEntidad(val);
    setFiltroContrato("");
    setSeleccionados(new Set());
  };

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const norm = busqueda.toLowerCase().trim();
  const filtrados = useMemo(() => archivos.filter(f => {
    if (filtroEntidad  && f.entidad_nombre  !== filtroEntidad)  return false;
    if (filtroContrato && f.contrato_nombre !== filtroContrato) return false;
    if (norm && !f.nombre.toLowerCase().includes(norm) &&
        !(f.entidad_nombre ?? "").toLowerCase().includes(norm) &&
        !(f.contrato_nombre ?? "").toLowerCase().includes(norm)) return false;
    return true;
  }), [archivos, filtroEntidad, filtroContrato, norm]);

  // ── Selección helpers ──────────────────────────────────────────────────────
  const todosSeleccionados = filtrados.length > 0 && filtrados.every(f => seleccionados.has(f.id));
  const algunoSeleccionado = seleccionados.size > 0;

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados(prev => {
        const s = new Set(prev);
        filtrados.forEach(f => s.delete(f.id));
        return s;
      });
    } else {
      setSeleccionados(prev => {
        const s = new Set(prev);
        filtrados.forEach(f => s.add(f.id));
        return s;
      });
    }
  };

  // ── Eliminación individual ─────────────────────────────────────────────────
  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre.split("/").pop()}"?\nEsta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    await deleteArchivoAction(id);
    setDeletingId(null);
    router.refresh();
  };

  // ── Eliminación en lote ────────────────────────────────────────────────────
  const handleEliminarSeleccionados = async () => {
    const ids = Array.from(seleccionados);
    if (!confirm(`¿Eliminar ${ids.length} archivo${ids.length !== 1 ? "s" : ""}?\nEsta acción no se puede deshacer.`)) return;
    setEliminando(true);
    for (const id of ids) {
      await deleteArchivoAction(id);
    }
    setSeleccionados(new Set());
    setEliminando(false);
    router.refresh();
  };

  const colCount = isAdmin ? 8 : 5; // checkbox + archivo + (entidad+contrato+subido) + fecha + tamaño + hash + estado + acciones

  return (
    <>
      {/* Topbar */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Archivos</div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {filtrados.length !== archivos.length
              ? `${filtrados.length} de ${archivos.length} documentos`
              : `${archivos.length} documento${archivos.length !== 1 ? "s" : ""} en custodia`}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            <UploadIcon /> Subir archivo
          </button>
        )}
      </div>

      {/* Barra de filtros */}
      {isAdmin && (
        <div style={{ padding: "12px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Buscador */}
          <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160, maxWidth: 260 }}>
            <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex", pointerEvents: "none" }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Buscar archivo…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: "100%", paddingLeft: 28, paddingRight: 8, height: 32, border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Filtro entidad */}
          <select
            value={filtroEntidad}
            onChange={e => handleEntidadChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">Todas las entidades</option>
            {entidades.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Filtro contrato — solo si hay entidad seleccionada o contratos disponibles */}
          <select
            value={filtroContrato}
            onChange={e => { setFiltroContrato(e.target.value); setSeleccionados(new Set()); }}
            style={selectStyle}
            disabled={contratos.length === 0}
          >
            <option value="">Todos los contratos</option>
            {contratos.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
          </select>

          {/* Limpiar filtros */}
          {(filtroEntidad || filtroContrato || busqueda) && (
            <button
              onClick={() => { setFiltroEntidad(""); setFiltroContrato(""); setBusqueda(""); setSeleccionados(new Set()); }}
              style={{ height: 32, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Barra de acciones en lote */}
      {algunoSeleccionado && isAdmin && (
        <div style={{ padding: "10px 32px", background: "rgba(200,71,42,0.06)", borderBottom: "1px solid rgba(200,71,42,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            {seleccionados.size} archivo{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleEliminarSeleccionados}
            disabled={eliminando}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "var(--accent)", color: "white", border: "none", borderRadius: 4, cursor: eliminando ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: eliminando ? 0.7 : 1 }}
          >
            <TrashIcon /> {eliminando ? "Eliminando…" : `Eliminar ${seleccionados.size} seleccionado${seleccionados.size !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={() => setSeleccionados(new Set())}
            style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ padding: "24px 32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.08)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isAdmin ? 900 : 600 }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  {isAdmin && (
                    <th style={{ padding: "10px 16px", width: 40 }}>
                      <input
                        type="checkbox"
                        checked={todosSeleccionados}
                        onChange={toggleTodos}
                        style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    </th>
                  )}
                  <Th>Archivo</Th>
                  {isAdmin && <Th>Entidad / Contrato</Th>}
                  {isAdmin && <Th>Subido por</Th>}
                  <Th>Fecha</Th>
                  <Th>Tamaño</Th>
                  <Th>Hash SHA-256</Th>
                  <Th>Estado</Th>
                  {isAdmin && <Th>{""}</Th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 5} style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
                      {archivos.length === 0 ? "No hay archivos registrados" : "Sin resultados para los filtros aplicados"}
                    </td>
                  </tr>
                ) : filtrados.map(f => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--border)", background: seleccionados.has(f.id) ? "rgba(200,71,42,0.04)" : "transparent" }}>
                    {isAdmin && (
                      <td style={{ padding: "10px 16px" }}>
                        <input
                          type="checkbox"
                          checked={seleccionados.has(f.id)}
                          onChange={() => toggleSeleccion(f.id)}
                          style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
                        />
                      </td>
                    )}
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ink)" }}>
                        <ExtBadge tipo={f.tipo} />
                        <span style={{ fontSize: 13 }}>{f.nombre.split("/").pop()}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "10px 20px" }}>
                        <div style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>{f.entidad_nombre ?? "—"}</div>
                        {f.contrato_nombre && (
                          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                            {f.contrato_nombre}
                          </div>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td style={{ padding: "10px 20px", fontSize: 12, color: "var(--muted-2)" }}>
                        {f.subido_por_nombre ?? "—"}
                      </td>
                    )}
                    <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {new Date(f.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {formatBytes(f.size_bytes)}
                    </td>
                    <td style={{ padding: "10px 20px" }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", letterSpacing: "0.02em" }} title={f.hash_sha256}>
                        {f.hash_sha256.slice(0, 8)}…{f.hash_sha256.slice(-8)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 20px" }}>
                      <EstadoBadge estado={f.estado} />
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => handleEliminar(f.id, f.nombre)}
                          disabled={deletingId === f.id || eliminando}
                          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "5px 10px", cursor: (deletingId === f.id || eliminando) ? "not-allowed" : "pointer", color: "var(--accent)", fontSize: 12, fontFamily: "'DM Sans', sans-serif", opacity: (deletingId === f.id || eliminando) ? 0.4 : 1, whiteSpace: "nowrap" }}
                        >
                          {deletingId === f.id ? "…" : "Eliminar"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal upload */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 540, boxShadow: "0 12px 40px rgba(15,17,23,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Subir archivo</div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Hash SHA-256 calculado en el navegador</div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <XIcon />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <UploadZone entidadId={entidadId} onSuccess={() => { setModalOpen(false); router.refresh(); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  height: 32, padding: "0 8px", border: "1px solid var(--border-strong)", borderRadius: 4,
  fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)",
  color: "var(--ink)", cursor: "pointer", outline: "none", flexShrink: 0,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function ExtBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pdf: { bg: "#fdecea", color: "var(--accent)" }, xlsx: { bg: "#e8f5e9", color: "#2e7d32" },
    xls: { bg: "#e8f5e9", color: "#2e7d32" }, zip: { bg: "#e8eaf6", color: "#3949ab" },
    docx: { bg: "#e3f2fd", color: "#1565c0" }, doc: { bg: "#e3f2fd", color: "#1565c0" },
    csv: { bg: "#f3e5f5", color: "#6a1b9a" }, png: { bg: "#fce4ec", color: "#880e4f" },
    jpg: { bg: "#fce4ec", color: "#880e4f" }, jpeg: { bg: "#fce4ec", color: "#880e4f" },
  };
  const s = map[tipo.toLowerCase()] ?? { bg: "var(--surface-2)", color: "var(--muted-2)" };
  return (
    <span style={{ ...s, fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, flexShrink: 0 }}>
      {tipo.toLowerCase()}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const isActivo = estado === "activo";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace", background: isActivo ? "var(--green-light)" : "var(--amber-light)", color: isActivo ? "var(--green)" : "var(--amber)", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: isActivo ? "var(--green)" : "var(--amber)" }} />
      {isActivo ? "Activo" : "Pend. eliminación"}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>; }
function XIcon()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
function SearchIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>; }
