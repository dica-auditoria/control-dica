"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoItem } from "@/types/requerimientos";
import { toggleItemCompletoAction, importarReactivosContratoAction } from "@/app/actions/requerimientos";

// ── CSV helpers ───────────────────────────────────────────────────────────────

function exportarCSV(items: RequerimientoItem[], nombre: string) {
  const header = "No.,Rubro,Concepto";
  const rows = [...items]
    .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999))
    .map((it, i) => {
      const no = it.orden ?? (i + 1);
      const rubro = (it.rubro ?? "").replace(/,/g, ";");
      const concepto = it.nombre.replace(/,/g, ";");
      return `${no},${rubro},${concepto}`;
    });
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
  if (!header.includes("no") || !header.includes("rubro") || !header.includes("concepto")) {
    return { rows: [], error: 'El encabezado debe ser "No.,Rubro,Concepto"' };
  }

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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  requerimientos: Requerimiento[];
  entidadId: string;
  contratoId: string;
  isSuperAdmin?: boolean;
  rol: string;
}

export default function RequerimientosTab({ requerimientos, entidadId, contratoId, rol }: Props) {
  const router  = useRouter();
  const esCliente = rol === "cliente";

  // Aplanar todos los ítems de todos los requerimientos, ordenados por orden
  const todosLosItems = requerimientos
    .flatMap(r => r.items)
    .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));

  const [showImport, setShowImport] = useState(false);

  const handleToggle = async (itemId: string, completado: boolean) => {
    await toggleItemCompletoAction(itemId, completado);
    router.refresh();
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", flex: 1 }}>
          {todosLosItems.length} reactivo{todosLosItems.length !== 1 ? "s" : ""}
          {todosLosItems.length > 0 && ` · ${todosLosItems.filter(i => i.completado).length} entregado${todosLosItems.filter(i => i.completado).length !== 1 ? "s" : ""}`}
        </span>

        {todosLosItems.length > 0 && (
          <button
            onClick={() => exportarCSV(todosLosItems, contratoId)}
            style={btnStyle("var(--card)", "var(--ink)", "1px solid var(--border-strong)")}
          >
            <DownloadIcon /> Exportar CSV
          </button>
        )}

        {!esCliente && (
          <button
            onClick={() => setShowImport(true)}
            style={btnStyle("var(--ink)", "white")}
          >
            <UploadIcon /> Importar CSV
          </button>
        )}
      </div>

      {/* Tabla de reactivos */}
      {todosLosItems.length === 0 ? (
        <div style={{
          padding: "48px 20px",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 13,
          fontFamily: "'DM Mono', monospace",
        }}>
          {esCliente
            ? "Sin reactivos definidos"
            : "Sin reactivos — importa un CSV para cargar la plantilla"}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th style={thStyle}>No.</th>
                <th style={thStyle}>Rubro</th>
                <th style={{ ...thStyle, width: "100%" }}>Concepto</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {todosLosItems.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: "1px solid var(--border)",
                    background: item.completado ? "rgba(45,166,95,0.03)" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {item.orden ?? (idx + 1)}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted-2)", whiteSpace: "nowrap" }}>
                    {item.rubro
                      ? <span style={{ padding: "2px 8px", borderRadius: 100, background: "var(--surface-2)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{item.rubro}</span>
                      : <span style={{ color: "var(--muted)" }}>—</span>
                    }
                  </td>
                  <td style={{
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "var(--ink)",
                    textDecoration: item.completado ? "line-through" : "none",
                    opacity: item.completado ? 0.55 : 1,
                  }}>
                    {item.nombre}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                    {!esCliente ? (
                      <input
                        type="checkbox"
                        checked={item.completado}
                        onChange={e => handleToggle(item.id, e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    ) : item.completado
                      ? <span style={badge("#1B7A3E", "rgba(45,166,95,0.1)")}>Entregado</span>
                      : <span style={badge("#B8860B", "rgba(255,193,7,0.12)")}>Pendiente</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  contratoId: string;
  entidadId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows]       = useState<CSVRow[]>([]);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const { rows: parsed, error: err } = parsearCSV(text);
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
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_reactivos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportar = async () => {
    if (!rows.length || parseErr) return;
    setSaving(true);
    setError(null);
    const result = await importarReactivosContratoAction(contratoId, entidadId, rows);
    if (result.error) { setError(result.error); setSaving(false); return; }
    onImported();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Importar reactivos desde CSV</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Reemplazará todos los reactivos actuales del contrato
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Formato info */}
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted-2)" }}>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Formato del CSV:</div>
            <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, display: "block", lineHeight: 1.8 }}>
              No.,Rubro,Concepto<br />
              1,Financiero,Balance general 2024<br />
              2,Legal,Acta constitutiva
            </code>
            <button
              onClick={descargarPlantilla}
              style={{ marginTop: 10, fontSize: 12, color: "#1B4F8A", background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}
            >
              <DownloadIcon /> Descargar plantilla de ejemplo
            </button>
          </div>

          {/* File picker */}
          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", padding: "20px", border: "2px dashed var(--border-strong)", borderRadius: 8, background: "var(--surface)", color: "var(--muted-2)", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <UploadIcon /> Seleccionar archivo CSV
            </button>
          </div>

          {parseErr && (
            <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
              {parseErr}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !parseErr && (
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                Vista previa — {rows.length} reactivo{rows.length !== 1 ? "s" : ""}
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", position: "sticky", top: 0 }}>
                      <th style={thStyle}>No.</th>
                      <th style={thStyle}>Rubro</th>
                      <th style={{ ...thStyle, width: "100%" }}>Concepto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "7px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>{r.orden}</td>
                        <td style={{ padding: "7px 12px", fontSize: 12, color: "var(--muted-2)", whiteSpace: "nowrap" }}>
                          {r.rubro
                            ? <span style={{ padding: "2px 8px", borderRadius: 100, background: "var(--surface-2)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{r.rubro}</span>
                            : "—"
                          }
                        </td>
                        <td style={{ padding: "7px 12px", fontSize: 13, color: "var(--ink)" }}>{r.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#B8860B", fontFamily: "'DM Mono', monospace" }}>
                ⚠ Esto reemplazará todos los reactivos actuales
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button
            onClick={handleImportar}
            disabled={!rows.length || !!parseErr || saving}
            style={{ padding: "8px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!rows.length || !!parseErr || saving) ? "not-allowed" : "pointer", opacity: (!rows.length || !!parseErr || saving) ? 0.5 : 1 }}
          >
            {saving ? "Importando…" : `Importar ${rows.length} reactivo${rows.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "8px 14px",
  textAlign: "left",
  fontSize: 10,
  fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 600,
};

function btnStyle(bg: string, color: string, border = "none"): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 14px", background: bg, color, border, borderRadius: 4,
    cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
    whiteSpace: "nowrap",
  };
}

function badge(color: string, bg: string): React.CSSProperties {
  return { fontSize: 11, padding: "2px 8px", borderRadius: 100, background: bg, color, fontFamily: "'DM Mono', monospace" };
}

function DownloadIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
function UploadIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}
