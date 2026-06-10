"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoItem } from "@/types/requerimientos";
import type { ArchivoContratoItem } from "@/app/actions/archivos";
import { toggleItemCompletoAction, importarReactivosContratoAction } from "@/app/actions/requerimientos";
import { deleteArchivoAction } from "@/app/actions/archivos";
import UploadZone from "@/components/archivos/UploadZone";

// ── CSV helpers ───────────────────────────────────────────────────────────────

function exportarCSV(items: RequerimientoItem[], nombre: string) {
  const header = "No.,Rubro,Concepto";
  const rows = [...items]
    .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999))
    .map((it, i) => `${it.orden ?? (i + 1)},${(it.rubro ?? "").replace(/,/g, ";")},${it.nombre.replace(/,/g, ";")}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre.replace(/[^a-zA-Z0-9_-]/g, "_")}_reactivos.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface CSVRow { orden: number; rubro: string; nombre: string }

function parsearCSV(texto: string): { rows: CSVRow[]; error: string | null } {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.length < 2) return { rows: [], error: "El archivo está vacío o solo tiene encabezado" };
  const header = lineas[0].toLowerCase();
  if (!header.includes("no") || !header.includes("rubro") || !header.includes("concepto"))
    return { rows: [], error: 'El encabezado debe ser "No.,Rubro,Concepto"' };
  const rows: CSVRow[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const parts = lineas[i].split(",");
    if (parts.length < 3) continue;
    const orden = parseInt(parts[0].trim(), 10);
    const rubro = parts[1].trim();
    const nombre = parts.slice(2).join(",").trim();
    if (!nombre) continue;
    rows.push({ orden: isNaN(orden) ? i : orden, rubro, nombre });
  }
  if (!rows.length) return { rows: [], error: "No se encontraron filas válidas en el CSV" };
  return { rows, error: null };
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  requerimientos: Requerimiento[];
  archivos: ArchivoContratoItem[];
  entidadId: string;
  contratoId: string;
  isSuperAdmin?: boolean;
  rol: string;
}

export default function RequerimientosTab({ requerimientos, archivos, entidadId, contratoId, rol }: Props) {
  const router    = useRouter();
  const esCliente = rol === "cliente";
  const esAdmin   = ["admin", "superadmin"].includes(rol);

  const todosLosItems = requerimientos
    .flatMap(r => r.items)
    .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showImport, setShowImport]     = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const archivosDeItem = (itemId: string) =>
    archivos.filter(a => a.requerimiento_item_id === itemId);

  const handleToggle = async (itemId: string, completado: boolean) => {
    await toggleItemCompletoAction(itemId, completado);
    router.refresh();
  };

  const handleDeleteArchivo = async (archivoId: string) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    setDeletingId(archivoId);
    await deleteArchivoAction(archivoId);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", flex: 1 }}>
          {todosLosItems.length} reactivo{todosLosItems.length !== 1 ? "s" : ""}
          {todosLosItems.length > 0 && ` · ${todosLosItems.filter(i => i.completado).length} completado${todosLosItems.filter(i => i.completado).length !== 1 ? "s" : ""}`}
        </span>
        {todosLosItems.length > 0 && (
          <button onClick={() => exportarCSV(todosLosItems, contratoId)} style={btnSm("var(--card)", "var(--ink)", "1px solid var(--border-strong)")}>
            <DownloadIcon /> Exportar CSV
          </button>
        )}
        {!esCliente && (
          <button onClick={() => setShowImport(true)} style={btnSm("var(--ink)", "white")}>
            <UploadIconSm /> Importar CSV
          </button>
        )}
      </div>

      {/* Tabla */}
      {todosLosItems.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          {esCliente ? "Sin reactivos definidos" : "Sin reactivos — importa un CSV para cargar la plantilla"}
        </div>
      ) : (
        <div>
          {todosLosItems.map((item, idx) => {
            const itemArchivos = archivosDeItem(item.id);
            const isExpanded   = expandedItem === item.id;

            return (
              <div key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                {/* Fila */}
                <div
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  style={{ display: "flex", alignItems: "center", padding: "0 14px", cursor: "pointer", background: isExpanded ? "rgba(15,17,23,0.025)" : item.completado ? "rgba(45,166,95,0.025)" : "transparent", minHeight: 46 }}
                >
                  {/* Chevron */}
                  <span style={{ color: "var(--muted)", marginRight: 10, flexShrink: 0, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "none", display: "flex" }}>
                    <ChevronIcon />
                  </span>

                  {/* No. */}
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", width: 34, flexShrink: 0 }}>
                    {item.orden ?? (idx + 1)}
                  </span>

                  {/* Rubro */}
                  <span style={{ width: 130, flexShrink: 0, paddingRight: 12 }}>
                    {item.rubro
                      ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--surface-2)", fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>{item.rubro}</span>
                      : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    }
                  </span>

                  {/* Concepto */}
                  <span style={{ flex: 1, fontSize: 13, color: "var(--ink)", textDecoration: item.completado ? "line-through" : "none", opacity: item.completado ? 0.55 : 1 }}>
                    {item.nombre}
                  </span>

                  {/* Archivos badge */}
                  {itemArchivos.length > 0 && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(45,166,95,0.12)", color: "#1B7A3E", fontFamily: "'DM Mono', monospace", marginRight: 10, flexShrink: 0 }}>
                      {itemArchivos.length} archivo{itemArchivos.length !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Estado (empleado: checkbox | cliente: badge) */}
                  <span onClick={e => e.stopPropagation()} style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                    {!esCliente ? (
                      <input
                        type="checkbox"
                        checked={item.completado}
                        onChange={e => handleToggle(item.id, e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    ) : item.completado
                      ? <span style={badgeStyle("#1B7A3E", "rgba(45,166,95,0.1)")}>Entregado</span>
                      : <span style={badgeStyle("#B8860B", "rgba(255,193,7,0.12)")}>Pendiente</span>
                    }
                  </span>
                </div>

                {/* Panel expandido: archivos + upload */}
                {isExpanded && (
                  <div style={{ background: "rgba(15,17,23,0.018)", borderTop: "1px solid var(--border)", padding: "16px 20px 20px 58px" }}>
                    {/* Lista de archivos existentes */}
                    {itemArchivos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                          Documentos subidos
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {itemArchivos.map(archivo => (
                            <div key={archivo.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}>
                              <FileTypeIcon tipo={archivo.tipo} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {archivo.nombre.split("/").pop()}
                                </div>
                                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 1 }}>
                                  {formatBytes(archivo.size_bytes)}
                                  {archivo.subido_por_nombre && ` · ${archivo.subido_por_nombre}`}
                                </div>
                              </div>
                              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: "var(--surface-2)", color: "var(--muted-2)", textTransform: "uppercase", flexShrink: 0 }}>
                                {archivo.tipo.slice(0, 4)}
                              </span>
                              {esAdmin && (
                                <button
                                  onClick={() => handleDeleteArchivo(archivo.id)}
                                  disabled={deletingId === archivo.id}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, flexShrink: 0, opacity: deletingId === archivo.id ? 0.5 : 1 }}
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload zone */}
                    {!esCliente ? (
                      <div>
                        {itemArchivos.length === 0 && (
                          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                            Subir documento
                          </div>
                        )}
                        <UploadZone
                          entidadId={entidadId}
                          contratoId={contratoId}
                          destino="cliente"
                          requerimientoItemId={item.id}
                          onDone={() => router.refresh()}
                        />
                      </div>
                    ) : itemArchivos.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                        Sin documentos subidos aún
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showImport && (
        <ImportarCSVModal
          contratoId={contratoId}
          entidadId={entidadId}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); router.refresh(); }}
        />
      )}
    </>
  );
}

// ── Importar CSV Modal ────────────────────────────────────────────────────────

function ImportarCSVModal({ contratoId, entidadId, onClose, onImported }: {
  contratoId: string; entidadId: string; onClose: () => void; onImported: () => void;
}) {
  const [rows, setRows]         = useState<CSVRow[]>([]);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { rows: parsed, error: err } = parsearCSV(ev.target?.result as string);
      setParseErr(err);
      setRows(parsed);
      setError(null);
    };
    reader.readAsText(file, "utf-8");
  };

  const descargarPlantilla = () => {
    const csv = "No.,Rubro,Concepto\n1,Financiero,Balance general 2024\n2,Financiero,Estado de resultados\n3,Legal,Acta constitutiva\n4,Legal,Poder notarial";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plantilla_reactivos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportar = async () => {
    if (!rows.length || parseErr) return;
    setSaving(true); setError(null);
    const result = await importarReactivosContratoAction(contratoId, entidadId, rows);
    if (result.error) { setError(result.error); setSaving(false); return; }
    onImported();
  };

  const thS: React.CSSProperties = { padding: "7px 12px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Importar reactivos desde CSV</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Reemplazará todos los reactivos actuales</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted-2)" }}>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Formato del CSV:</div>
            <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, display: "block", lineHeight: 1.8 }}>
              No.,Rubro,Concepto<br />1,Financiero,Balance general 2024<br />2,Legal,Acta constitutiva
            </code>
            <button onClick={descargarPlantilla} style={{ marginTop: 10, fontSize: 12, color: "#1B4F8A", background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>
              <DownloadIcon /> Descargar plantilla de ejemplo
            </button>
          </div>

          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()}
              style={{ width: "100%", padding: "20px", border: "2px dashed var(--border-strong)", borderRadius: 8, background: "var(--surface)", color: "var(--muted-2)", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <UploadIconSm /> Seleccionar archivo CSV
            </button>
          </div>

          {parseErr && <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>{parseErr}</div>}

          {rows.length > 0 && !parseErr && (
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                Vista previa — {rows.length} reactivo{rows.length !== 1 ? "s" : ""}
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", position: "sticky", top: 0 }}>
                      <th style={thS}>No.</th><th style={thS}>Rubro</th><th style={{ ...thS, width: "100%" }}>Concepto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "7px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>{r.orden}</td>
                        <td style={{ padding: "7px 12px", fontSize: 12, whiteSpace: "nowrap" }}>
                          {r.rubro ? <span style={{ padding: "2px 8px", borderRadius: 100, background: "var(--surface-2)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{r.rubro}</span> : "—"}
                        </td>
                        <td style={{ padding: "7px 12px", fontSize: 13, color: "var(--ink)" }}>{r.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#B8860B", fontFamily: "'DM Mono', monospace" }}>
                ⚠ Reemplazará todos los reactivos actuales del contrato
              </div>
            </div>
          )}

          {error && <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>{error}</div>}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={handleImportar} disabled={!rows.length || !!parseErr || saving}
            style={{ padding: "8px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!rows.length || !!parseErr || saving) ? "not-allowed" : "pointer", opacity: (!rows.length || !!parseErr || saving) ? 0.5 : 1 }}>
            {saving ? "Importando…" : `Importar ${rows.length} reactivo${rows.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FileTypeIcon({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = { pdf: "#E53E3E", xlsx: "#38A169", xls: "#38A169", docx: "#3182CE", doc: "#3182CE", zip: "#D69E2E", png: "#805AD5", jpg: "#805AD5", jpeg: "#805AD5", csv: "#319795" };
  const color = colors[tipo.toLowerCase()] ?? "var(--muted)";
  return (
    <span style={{ width: 28, height: 28, borderRadius: 5, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    </span>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 14px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 };
thStyle; // used via spread in table header

function btnSm(bg: string, color: string, border = "none"): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: bg, color, border, borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: "nowrap" };
}

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return { fontSize: 11, padding: "2px 8px", borderRadius: 100, background: bg, color, fontFamily: "'DM Mono', monospace" };
}

function ChevronIcon()    { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function DownloadIcon()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function UploadIconSm()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>; }
function TrashIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>; }
