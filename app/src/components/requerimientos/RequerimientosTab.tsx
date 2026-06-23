"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoItem } from "@/types/requerimientos";
import type { ArchivoContratoItem } from "@/app/actions/archivos";
import type { Comentario } from "@/app/actions/comentarios";
import { toggleItemCompletoAction, importarReactivosContratoAction, extenderFechaItemAction, chequearImpactoImportAction, agregarItemContratoAction, editarItemAction, eliminarItemAction, reordenarItemAction, actualizarFechaContratoAction } from "@/app/actions/requerimientos";
import { deleteArchivoAction } from "@/app/actions/archivos";
import { getDownloadUrlAction, getWasabiViewUrlAction } from "@/app/actions/storage";
import { fetchComentariosItemAction, agregarComentarioAction } from "@/app/actions/comentarios";
import UploadZone from "@/components/archivos/UploadZone";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function iniciales(nombre: string) {
  return nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

// Convierte "YYYY-MM-DD" → "DD/MM/YYYY" para mostrar en Excel
function isoADMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Normaliza "DD/MM/YYYY" o "YYYY-MM-DD" → "YYYY-MM-DD" para la BD
function normalizarFecha(raw: string): string | undefined {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return undefined;
}

// Codifica "1", "1.1", "1.1.1" → entero para ordenar correctamente
// Encoding: X*1000 + Y*10 + Z  → "1.1.1" cabe entre 1010 y 1020, sin migrar BD
function ordenFromNumero(s: string): number {
  const parts = s.trim().split(".").map(p => parseInt(p, 10) || 0);
  if (parts.length >= 3) return parts[0] * 1000 + Math.min(parts[1], 99) * 10 + Math.min(parts[2], 9);
  if (parts.length === 2) return parts[0] * 1000 + Math.min(parts[1], 99) * 10;
  return (parts[0] || 0) * 1000;
}

function csvBlob(contenido: string): Blob {
  // BOM UTF-8 + sep= para Excel 2013-365 en cualquier configuración regional
  return new Blob(["﻿" + "sep=,\r\n" + contenido], { type: "text/csv;charset=utf-8;" });
}

function exportarCSV(items: RequerimientoItem[], nombre: string) {
  const header = "No.,Area,Rubro,Concepto,Fecha límite";
  const sorted = [...items].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
  const rows = sorted.map((it, i) =>
    `${it.numero ?? (i + 1)},${(it.area ?? "").replace(/,/g, ";")},${(it.rubro ?? "").replace(/,/g, ";")},${it.nombre.replace(/,/g, ";")},${isoADMY(it.fecha_limite ?? "")}`
  );
  const blob = csvBlob([header, ...rows].join("\r\n"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre.replace(/[^a-zA-Z0-9_-]/g, "_")}_reactivos.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface CSVRow { orden: number; numero: string; area: string; rubro: string; nombre: string; fechaLimite?: string }

function parsearCSV(texto: string): { rows: CSVRow[]; error: string | null } {
  const limpio = texto.replace(/^﻿/, "");
  let lineas = limpio.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lineas[0]?.toLowerCase().startsWith("sep=")) lineas = lineas.slice(1);

  if (lineas.length < 2) return { rows: [], error: "El archivo está vacío o solo tiene encabezado" };

  const headerRaw = lineas[0];
  const sep = headerRaw.includes(";") ? ";" : ",";
  const header = headerRaw.toLowerCase();

  if (!header.includes("no") || !header.includes("rubro") || !header.includes("concepto"))
    return { rows: [], error: 'El encabezado debe tener columnas "No.", "Rubro" y "Concepto"' };

  const tieneArea  = header.includes("area");
  const tieneFecha = header.includes("fecha");

  // Índices de columnas según si existe la columna Area
  const areaIdx    = tieneArea ? 1 : -1;
  const rubroIdx   = tieneArea ? 2 : 1;
  const conceptoIdx = tieneArea ? 3 : 2;
  const fechaIdx   = tieneArea ? 4 : 3;

  const rows: CSVRow[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const parts = lineas[i].split(sep);
    if (parts.length < (tieneArea ? 4 : 3)) continue;

    const numeroRaw = parts[0].trim();
    // Acepta "1", "1.1", "1.1.1" (hasta 3 niveles)
    const esNumeroValido = /^\d+(\.\d+){0,2}$/.test(numeroRaw);
    const numero = esNumeroValido ? numeroRaw : String(i);
    const orden  = ordenFromNumero(numero);

    const area   = tieneArea ? parts[areaIdx].trim() : "";
    const rubro  = parts[rubroIdx].trim();
    const nombre = tieneFecha
      ? parts[conceptoIdx].trim()
      : parts.slice(conceptoIdx).join(sep).trim();
    if (!nombre) continue;
    const fechaLimite = tieneFecha ? normalizarFecha(parts[fechaIdx]?.trim() ?? "") : undefined;
    rows.push({ orden, numero, area, rubro, nombre, ...(fechaLimite ? { fechaLimite } : {}) });
  }

  if (!rows.length) return { rows: [], error: "No se encontraron filas válidas" };
  return { rows, error: null };
}

// ── Main Component ────────────────────────────────────────────────────────────

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

  const totalItems     = todosLosItems.length;
  const completados    = todosLosItems.filter(i => i.estado === "completado").length;
  const enRevision     = todosLosItems.filter(i => i.estado === "en_revision").length;
  const porcentaje     = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;

  const [expandedItem, setExpandedItem]               = useState<string | null>(null);
  const [showImport, setShowImport]                   = useState(false);
  const [showActualizarFecha, setShowActualizarFecha] = useState(false);
  const [showAddItem, setShowAddItem]                 = useState(false);
  const [editingItem, setEditingItem]                 = useState<{ id: string; nombre: string; area: string | null; rubro: string | null; descripcion: string | null; numero: string | null } | null>(null);
  const [eliminandoId, setEliminandoId]               = useState<string | null>(null);
  const [reorderingId, setReorderingId]               = useState<string | null>(null);
  const [downloadingId, setDownloadingId]             = useState<string | null>(null);
  const [previewingId, setPreviewingId]               = useState<string | null>(null);
  const [deletingId, setDeletingId]                   = useState<string | null>(null);
  const [notaExtension, setNotaExtension]             = useState<Record<string, string>>({});
  const [comentariosPorItem, setComentariosPorItem]   = useState<Record<string, Comentario[]>>({});
  const [loadingComents, setLoadingComents]           = useState<string | null>(null);
  const [inputComentario, setInputComentario]         = useState<Record<string, string>>({});
  const [enviando, setEnviando]                       = useState<string | null>(null);
  const [busqueda, setBusqueda]                       = useState("");
  const [ordenFiltro, setOrdenFiltro]                 = useState<"numero" | "reciente">("numero");
  const [editFechas, setEditFechas]                   = useState<Record<string, string>>({});
  const [esExtension, setEsExtension]                 = useState<Record<string, boolean>>({});

  const busquedaNorm = busqueda.toLowerCase().trim();

  const itemsFiltrados = todosLosItems
    .filter(it =>
      !busquedaNorm ||
      it.nombre.toLowerCase().includes(busquedaNorm) ||
      (it.rubro ?? "").toLowerCase().includes(busquedaNorm)
    )
    .sort((a, b) =>
      ordenFiltro === "reciente"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : (a.orden ?? 9999) - (b.orden ?? 9999)
    );

  const archivosDeItem = (itemId: string) =>
    archivos.filter(a => a.requerimiento_item_id === itemId);

  const handleExpand = async (itemId: string) => {
    const nuevo = expandedItem === itemId ? null : itemId;
    setExpandedItem(nuevo);
    if (nuevo && comentariosPorItem[nuevo] === undefined) {
      setLoadingComents(nuevo);
      const result = await fetchComentariosItemAction(nuevo);
      setComentariosPorItem(prev => ({ ...prev, [nuevo]: result.data ?? [] }));
      setLoadingComents(null);
    }
  };

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

  const handleEliminarItem = async (itemId: string) => {
    if (!confirm("¿Eliminar este reactivo? Los archivos subidos no se borrarán.")) return;
    setEliminandoId(itemId);
    await eliminarItemAction(itemId);
    setEliminandoId(null);
    router.refresh();
  };

  const handleGuardarFecha = async (itemId: string) => {
    const fecha = editFechas[itemId];
    if (!fecha) return;
    await extenderFechaItemAction(itemId, fecha, esExtension[itemId] ?? false, notaExtension[itemId]);
    setEditFechas(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    setEsExtension(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    setNotaExtension(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    router.refresh();
  };

  const handleReorder = async (itemId: string, direction: "up" | "down") => {
    setReorderingId(itemId + direction);
    await reordenarItemAction(itemId, direction);
    setReorderingId(null);
    router.refresh();
  };

  const handlePreview = async (archivoId: string, key: string) => {
    setPreviewingId(archivoId);
    const result = await getWasabiViewUrlAction(key);
    setPreviewingId(null);
    if (result.url) window.open(result.url, "_blank");
  };

  const handleDownload = async (archivoId: string, key: string, filename: string) => {
    setDownloadingId(archivoId);
    const result = await getDownloadUrlAction(key, filename.split("/").pop() ?? filename);
    setDownloadingId(null);
    if (result.url) {
      const a = document.createElement("a");
      a.href = result.url;
      a.download = filename.split("/").pop() ?? filename;
      a.click();
    }
  };

  const handleEnviarComentario = async (itemId: string) => {
    const texto = (inputComentario[itemId] ?? "").trim();
    if (!texto || enviando) return;
    setEnviando(itemId);
    const result = await agregarComentarioAction(itemId, texto);
    if (result.data) {
      setComentariosPorItem(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] ?? []), result.data!],
      }));
      setInputComentario(prev => ({ ...prev, [itemId]: "" }));
    }
    setEnviando(null);
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Buscador */}
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: 140, maxWidth: 280 }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", display: "flex" }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Buscar reactivo…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ width: "100%", paddingLeft: 28, paddingRight: 8, height: 32, border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex", lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* Filtro de orden */}
        <select
          value={ordenFiltro}
          onChange={e => setOrdenFiltro(e.target.value as "numero" | "reciente")}
          style={{ height: 32, padding: "0 8px", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", cursor: "pointer", outline: "none", flexShrink: 0 }}
        >
          <option value="numero">Número</option>
          <option value="reciente">Más reciente</option>
        </select>

        {/* Contador */}
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", flexShrink: 0 }}>
          {busquedaNorm
            ? `${itemsFiltrados.length} de ${totalItems}`
            : totalItems === 0 ? "0 reactivos"
            : [
                `${totalItems} reactivo${totalItems !== 1 ? "s" : ""}`,
                completados > 0 && `${completados} completado${completados !== 1 ? "s" : ""}`,
                enRevision > 0  && `${enRevision} en revisión`,
              ].filter(Boolean).join(" · ")
          }
        </span>

        <div style={{ flex: 1 }} />

        {totalItems > 0 && (
          <button onClick={() => exportarCSV(todosLosItems, contratoId)} style={btnSm("var(--card)", "var(--ink)", "1px solid var(--border-strong)")}>
            <DownloadIcon /> Exportar CSV
          </button>
        )}
        {!esCliente && (
          <>
            <button onClick={() => setShowActualizarFecha(true)} style={btnSm("var(--card)", "var(--ink)", "1px solid var(--border-strong)")}>
              <CalendarIcon /> Actualizar fecha
            </button>
            <button onClick={() => setShowAddItem(true)} style={btnSm("var(--card)", "var(--ink)", "1px solid var(--border-strong)")}>
              <PlusIcon /> Agregar reactivo
            </button>
            <button onClick={() => setShowImport(true)} style={btnSm("var(--ink)", "white")}>
              <UploadIconSm /> Importar CSV
            </button>
          </>
        )}
      </div>

      {/* Barra de progreso */}
      {totalItems > 0 && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
            Documentación
          </span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${porcentaje}%`,
              background: porcentaje === 100 ? "var(--green)" : porcentaje >= 60 ? "#F6AD55" : "var(--accent)",
              transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace",
            color: porcentaje === 100 ? "var(--green)" : porcentaje >= 60 ? "#B7791F" : "var(--accent)",
            minWidth: 38, textAlign: "right",
          }}>
            {porcentaje}%
          </span>
        </div>
      )}

      {/* Tabla */}
      {totalItems === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          {esCliente ? "Sin reactivos definidos" : "Sin reactivos — importa un CSV para cargar la plantilla"}
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          Sin resultados para &ldquo;{busqueda}&rdquo;
        </div>
      ) : (
        <div>
          {itemsFiltrados.map((item, idx) => {
            const itemArchivos  = archivosDeItem(item.id);
            const isExpanded    = expandedItem === item.id;
            const comentarios   = comentariosPorItem[item.id] ?? [];
            const cargando      = loadingComents === item.id;

            const nivelSub = (item.numero?.match(/\./g) || []).length;
            return (
              <div key={item.id} style={{ borderBottom: "1px solid var(--border)", borderLeft: nivelSub > 0 ? "2px solid var(--border-strong)" : "none", marginLeft: nivelSub * 14 }}>
                {/* Fila principal */}
                <div
                  onClick={() => handleExpand(item.id)}
                  style={{ display: "flex", alignItems: "center", padding: "0 14px", cursor: "pointer", background: isExpanded ? "rgba(15,17,23,0.025)" : item.estado === "completado" ? "rgba(45,166,95,0.025)" : item.estado === "en_revision" ? "rgba(251,191,36,0.04)" : "transparent", minHeight: 46 }}
                >
                  <span style={{ color: "var(--muted)", marginRight: 10, flexShrink: 0, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "none", display: "flex" }}>
                    <ChevronIcon />
                  </span>

                  <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: nivelSub > 0 ? "var(--muted-2)" : "var(--muted)", width: nivelSub === 2 ? 54 : 38, flexShrink: 0 }}>
                    {item.numero ?? (idx + 1)}
                  </span>

                  <span style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 12, maxWidth: 320 }}>
                    {item.area && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(27,79,138,0.1)", fontFamily: "'DM Mono', monospace", color: "#1B4F8A" }}>{item.area}</span>
                    )}
                    {item.rubro
                      ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--surface-2)", fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>{item.rubro}</span>
                      : (!item.area && <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>)
                    }
                  </span>

                  <span style={{ flex: 1, fontSize: 13, color: "var(--ink)", textDecoration: item.estado === "completado" ? "line-through" : "none", opacity: item.estado === "completado" ? 0.55 : 1 }}>
                    {item.nombre}
                  </span>

                  {/* Badges */}
                  <span style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10, flexShrink: 0 }}>
                    {itemArchivos.length > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(45,166,95,0.12)", color: "#1B7A3E", fontFamily: "'DM Mono', monospace" }}>
                        {itemArchivos.length} archivo{itemArchivos.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {comentarios.length > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(66,153,225,0.12)", color: "#2B6CB0", fontFamily: "'DM Mono', monospace" }}>
                        {comentarios.length} nota{comentarios.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <ItemDeadlineBadge fecha={item.fecha_limite} extendida={item.extendida} />
                  </span>

                  {/* Reorder / Editar / Eliminar */}
                  {!esCliente && (
                    <span onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => handleReorder(item.id, "up")}
                        disabled={reorderingId === item.id + "up"}
                        title="Subir"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 3px", display: "flex", borderRadius: 4, fontSize: 13, opacity: reorderingId === item.id + "up" ? 0.3 : 1 }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleReorder(item.id, "down")}
                        disabled={reorderingId === item.id + "down"}
                        title="Bajar"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 3px", display: "flex", borderRadius: 4, fontSize: 13, opacity: reorderingId === item.id + "down" ? 0.3 : 1 }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setEditingItem({ id: item.id, nombre: item.nombre, area: item.area ?? null, rubro: item.rubro, descripcion: item.descripcion, numero: item.numero ?? null })}
                        title="Editar reactivo"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex", borderRadius: 4 }}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleEliminarItem(item.id)}
                        disabled={eliminandoId === item.id}
                        title="Eliminar reactivo"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex", borderRadius: 4, opacity: eliminandoId === item.id ? 0.4 : 1 }}
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  )}

                  {/* Estado */}
                  <span onClick={e => e.stopPropagation()} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    {!esCliente ? (
                      <>
                        {item.estado === "en_revision" && (
                          <span style={badgeStyle("#92400E", "rgba(251,191,36,0.15)")}>En revisión</span>
                        )}
                        <input
                          type="checkbox"
                          checked={item.estado === "completado"}
                          onChange={e => handleToggle(item.id, e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                        />
                      </>
                    ) : item.estado === "completado"
                      ? <span style={badgeStyle("#1B7A3E", "rgba(45,166,95,0.1)")}>Entregado</span>
                      : item.estado === "en_revision"
                      ? <span style={badgeStyle("#92400E", "rgba(251,191,36,0.15)")}>En revisión</span>
                      : <span style={badgeStyle("#6B7280", "rgba(107,114,128,0.1)")}>Pendiente</span>
                    }
                  </span>
                </div>

                {/* Panel expandido */}
                {isExpanded && (
                  <div style={{ background: "rgba(15,17,23,0.018)", borderTop: "1px solid var(--border)", display: "flex", gap: 0 }}>

                    {/* Columna izquierda: archivos + upload */}
                    <div style={{ flex: 1, padding: "16px 20px 20px 58px", borderRight: "1px solid var(--border)" }}>
                      {/* Descripción */}
                      {item.descripcion && (
                        <div style={{ marginBottom: 14, padding: "8px 12px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted-2)", lineHeight: 1.6 }}>
                          {item.descripcion}
                        </div>
                      )}

                      {/* Archivos subidos */}
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
                                    {formatBytes(archivo.size_bytes)}{archivo.subido_por_nombre && ` · ${archivo.subido_por_nombre}`}
                                  </div>
                                </div>
                                <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: "var(--surface-2)", color: "var(--muted-2)", textTransform: "uppercase", flexShrink: 0 }}>
                                  {archivo.tipo.slice(0, 4)}
                                </span>
                                <button
                                  onClick={() => handlePreview(archivo.id, archivo.ruta_storage)}
                                  disabled={previewingId === archivo.id}
                                  title="Visualizar"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, flexShrink: 0, opacity: previewingId === archivo.id ? 0.4 : 1 }}
                                >
                                  <EyeIcon />
                                </button>
                                <button
                                  onClick={() => handleDownload(archivo.id, archivo.ruta_storage, archivo.nombre)}
                                  disabled={downloadingId === archivo.id}
                                  title="Descargar"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, flexShrink: 0, opacity: downloadingId === archivo.id ? 0.4 : 1 }}
                                >
                                  <DownloadIcon />
                                </button>
                                {esAdmin && (
                                  <button onClick={() => handleDeleteArchivo(archivo.id)} disabled={deletingId === archivo.id}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, flexShrink: 0, opacity: deletingId === archivo.id ? 0.5 : 1 }}>
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
                            <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
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

                      {/* Plazo del reactivo (solo para empleados/admin) */}
                      {!esCliente && (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>Plazo:</span>
                            <input
                              type="date"
                              value={editFechas[item.id] ?? item.fecha_limite ?? ""}
                              onChange={e => setEditFechas(prev => ({ ...prev, [item.id]: e.target.value }))}
                              style={{ height: 28, padding: "0 8px", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none" }}
                            />
                            {item.extendida && !(editFechas[item.id] && editFechas[item.id] !== item.fecha_limite) && (
                              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(66,153,225,0.12)", color: "#2B6CB0", fontFamily: "'DM Mono', monospace" }}>
                                Tiempo extendido
                              </span>
                            )}
                          </div>

                          {/* Controles que aparecen cuando la fecha cambia */}
                          {editFechas[item.id] && editFechas[item.id] !== item.fecha_limite && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--ink)", fontFamily: "'DM Sans', sans-serif", userSelect: "none" }}>
                                <input
                                  type="checkbox"
                                  checked={esExtension[item.id] ?? false}
                                  onChange={e => setEsExtension(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                  style={{ width: 14, height: 14, accentColor: "#2B6CB0", cursor: "pointer" }}
                                />
                                Marcar como tiempo extendido
                              </label>
                              <textarea
                                value={notaExtension[item.id] ?? ""}
                                onChange={e => setNotaExtension(prev => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder="Nota para el cliente (opcional)…"
                                rows={2}
                                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, resize: "none", fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--surface)", outline: "none", boxSizing: "border-box" }}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button
                                  onClick={() => handleGuardarFecha(item.id)}
                                  style={{ height: 28, padding: "0 14px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditFechas(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                    setEsExtension(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                    setNotaExtension(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                  }}
                                  style={{ height: 28, padding: "0 10px", background: "none", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, cursor: "pointer", color: "var(--muted)" }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Columna derecha: comentarios */}
                    <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: 380 }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                          Notas del reactivo
                        </span>
                      </div>

                      {/* Lista de comentarios */}
                      <ComentariosList
                        comentarios={comentarios}
                        cargando={cargando}
                      />

                      {/* Input nuevo comentario */}
                      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", flexShrink: 0, background: "var(--card)" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <textarea
                            value={inputComentario[item.id] ?? ""}
                            onChange={e => setInputComentario(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleEnviarComentario(item.id);
                              }
                            }}
                            placeholder="Agregar nota… (Enter para enviar)"
                            rows={2}
                            style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, resize: "none", fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--surface)", outline: "none" }}
                          />
                          <button
                            onClick={() => handleEnviarComentario(item.id)}
                            disabled={!(inputComentario[item.id] ?? "").trim() || enviando === item.id}
                            style={{ padding: "0 10px", background: "var(--ink)", color: "white", border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0, opacity: (!(inputComentario[item.id] ?? "").trim() || enviando === item.id) ? 0.4 : 1 }}
                          >
                            {enviando === item.id ? <SpinnerIcon /> : <SendIcon />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showActualizarFecha && (
        <ActualizarFechaModal
          contratoId={contratoId}
          onClose={() => setShowActualizarFecha(false)}
          onUpdated={() => { setShowActualizarFecha(false); router.refresh(); }}
        />
      )}

      {showImport && (
        <ImportarCSVModal
          contratoId={contratoId}
          entidadId={entidadId}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); router.refresh(); }}
        />
      )}

      {showAddItem && (
        <AgregarReactivoModal
          contratoId={contratoId}
          entidadId={entidadId}
          onClose={() => setShowAddItem(false)}
          onAdded={() => { setShowAddItem(false); router.refresh(); }}
        />
      )}

      {editingItem && (
        <EditarItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); router.refresh(); }}
        />
      )}
    </>
  );
}

// ── Comentarios list ──────────────────────────────────────────────────────────

function ComentariosList({ comentarios, cargando }: { comentarios: Comentario[]; cargando: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comentarios.length]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      {cargando ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
          Cargando…
        </div>
      ) : comentarios.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
          Sin notas aún
        </div>
      ) : (
        comentarios.map(c => (
          <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {/* Avatar */}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {iniciales(c.usuario_nombre)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{c.usuario_nombre}</span>
                <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{tiempoRelativo(c.created_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-2)", lineHeight: 1.5, background: "var(--surface)", padding: "6px 10px", borderRadius: "0 8px 8px 8px", border: "1px solid var(--border)" }}>
                {c.mensaje}
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Agregar Reactivo Modal ────────────────────────────────────────────────────

function AgregarReactivoModal({ contratoId, entidadId, onClose, onAdded }: {
  contratoId: string; entidadId: string; onClose: () => void; onAdded: () => void;
}) {
  const [nombre, setNombre]           = useState("");
  const [area, setArea]               = useState("");
  const [rubro, setRubro]             = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleGuardar = async () => {
    if (!nombre.trim()) return;
    setSaving(true); setError(null);
    const result = await agregarItemContratoAction(contratoId, entidadId, { nombre, area, rubro, descripcion });
    if (result.error) { setError(result.error); setSaving(false); return; }
    onAdded();
  };

  const inputSt: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Agregar reactivo</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Se añadirá al final de la lista</div>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Nombre del reactivo <span style={{ color: "var(--accent)" }}>*</span>
            </label>
            <input autoFocus type="text" value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGuardar(); }} placeholder="Ej. Balance general 2024" style={inputSt} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Área <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="text" value={area} onChange={e => setArea(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGuardar(); }} placeholder="Ej. Tesorería, Contraloría…" style={inputSt} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Rubro <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="text" value={rubro} onChange={e => setRubro(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGuardar(); }} placeholder="Ej. Financiero, Legal…" style={inputSt} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Descripción <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Instrucciones o aclaraciones para el cliente…" rows={3}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {error && (
            <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>{error}</div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={!nombre.trim() || saving}
            style={{ padding: "8px 20px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!nombre.trim() || saving) ? "not-allowed" : "pointer", opacity: (!nombre.trim() || saving) ? 0.5 : 1 }}>
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Editar Item Modal ─────────────────────────────────────────────────────────

function EditarItemModal({ item, onClose, onSaved }: {
  item: { id: string; nombre: string; area: string | null; rubro: string | null; descripcion: string | null; numero: string | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre]           = useState(item.nombre);
  const [numero, setNumero]           = useState(item.numero ?? "");
  const [area, setArea]               = useState(item.area ?? "");
  const [rubro, setRubro]             = useState(item.rubro ?? "");
  const [descripcion, setDescripcion] = useState(item.descripcion ?? "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleGuardar = async () => {
    if (!nombre.trim()) return;
    setSaving(true); setError(null);
    const result = await editarItemAction(item.id, { nombre, area, rubro, descripcion, numero });
    if (result.error) { setError(result.error); setSaving(false); return; }
    onSaved();
  };

  const inputSt: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Editar reactivo</div>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 100, flexShrink: 0 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                Numeral
              </label>
              <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="1.1" style={{ ...inputSt, fontFamily: "'DM Mono', monospace" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                Nombre <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <input autoFocus type="text" value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGuardar(); }} style={inputSt} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Área <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="text" value={area} onChange={e => setArea(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGuardar(); }} placeholder="Ej. Tesorería, Contraloría…" style={inputSt} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Rubro <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="text" value={rubro} onChange={e => setRubro(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGuardar(); }} placeholder="Ej. Financiero, Legal…" style={inputSt} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Descripción <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Instrucciones o aclaraciones para el cliente…" rows={3}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--surface)", color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {error && (
            <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>{error}</div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={!nombre.trim() || saving}
            style={{ padding: "8px 20px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!nombre.trim() || saving) ? "not-allowed" : "pointer", opacity: (!nombre.trim() || saving) ? 0.5 : 1 }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Actualizar Fecha Modal ────────────────────────────────────────────────────

function ActualizarFechaModal({ contratoId, onClose, onUpdated }: {
  contratoId: string; onClose: () => void; onUpdated: () => void;
}) {
  const [fecha, setFecha]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [ok, setOk]         = useState(false);

  const handleGuardar = async () => {
    if (!fecha) return;
    setSaving(true); setError(null);
    const result = await actualizarFechaContratoAction(contratoId, fecha);
    if (result.error) { setError(result.error); setSaving(false); return; }
    setOk(true);
    setTimeout(onUpdated, 1000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Actualizar fecha límite</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Aplica la nueva fecha a todos los reactivos pendientes del contrato
          </div>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {ok ? (
            <div style={{ padding: "10px 14px", background: "rgba(45,166,95,0.08)", border: "1px solid rgba(45,166,95,0.25)", borderRadius: 6, fontSize: 13, color: "#1B7A3E" }}>
              ✓ Fecha actualizada correctamente
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                  Nueva fecha límite
                </label>
                <input
                  autoFocus
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ width: "100%", height: 36, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ padding: "8px 12px", background: "rgba(66,153,225,0.07)", borderRadius: 6, fontSize: 12, color: "#2B6CB0", fontFamily: "'DM Mono', monospace" }}>
                Los reactivos ya entregados no se modifican. Si el contrato estaba vencido, se reactiva automáticamente.
              </div>
              {error && (
                <div style={{ padding: "8px 12px", background: "rgba(200,71,42,0.06)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>{error}</div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13 }}>
            {ok ? "Cerrar" : "Cancelar"}
          </button>
          {!ok && (
            <button onClick={handleGuardar} disabled={!fecha || saving}
              style={{ padding: "8px 20px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!fecha || saving) ? "not-allowed" : "pointer", opacity: (!fecha || saving) ? 0.5 : 1 }}>
              {saving ? "Guardando…" : "Actualizar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Importar CSV Modal ────────────────────────────────────────────────────────

function ImportarCSVModal({ contratoId, entidadId, onClose, onImported }: {
  contratoId: string; entidadId: string; onClose: () => void; onImported: () => void;
}) {
  const [rows, setRows]               = useState<CSVRow[]>([]);
  const [parseErr, setParseErr]       = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [fechaLimite, setFechaLimite] = useState("");
  const [impacto, setImpacto]         = useState<{ archivos: number; items: number } | null>(null);
  const [resultado, setResultado]     = useState<{ actualizados: number; nuevos: number; eliminados: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chequearImpactoImportAction(contratoId).then(setImpacto);
  }, [contratoId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const buffer = ev.target?.result as ArrayBuffer;
      let texto: string;
      try {
        texto = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        // Si aún con UTF-8 válido hay caracteres de reemplazo (◆ U+FFFD),
        // el archivo tiene encoding mezclado — forzar Windows-1252
        if (texto.includes("�")) throw new Error("replacement chars");
      } catch {
        texto = new TextDecoder("windows-1252").decode(buffer);
      }
      const { rows: parsed, error: err } = parsearCSV(texto);
      setParseErr(err); setRows(parsed); setError(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const descargarPlantilla = () => {
    const hoy = new Date();
    const en90 = new Date(Date.now() + 90 * 86400000);
    const fDMY = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    const contenido = [
      "No.,Area,Rubro,Concepto,Fecha límite",
      `1,Contabilidad,Financiero,Balance general 2024,${fDMY(en90)}`,
      `1.1,Contabilidad,Financiero,Notas al balance,${fDMY(en90)}`,
      `1.1.1,Contabilidad,Financiero,Detalle de activos,${fDMY(en90)}`,
      `1.2,Contabilidad,Financiero,Estado de resultados,${fDMY(en90)}`,
      `2,Jurídico,Legal,Acta constitutiva,${fDMY(hoy)}`,
      `2.1,Jurídico,Legal,Poder notarial,${fDMY(hoy)}`,
    ].join("\r\n");
    const blob = csvBlob(contenido);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plantilla_reactivos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportar = async () => {
    if (!rows.length || parseErr) return;
    setSaving(true); setError(null);
    const result = await importarReactivosContratoAction(contratoId, entidadId, rows, fechaLimite || undefined);
    if (result.error) { setError(result.error); setSaving(false); return; }
    if ("actualizados" in result) {
      setResultado({ actualizados: result.actualizados ?? 0, nuevos: result.nuevos ?? 0, eliminados: result.eliminados ?? 0 });
    }
    setSaving(false);
    setTimeout(onImported, 1200);
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

          {/* Resultado de la importación */}
          {resultado && (
            <div style={{ padding: "10px 14px", background: "rgba(45,166,95,0.08)", border: "1px solid rgba(45,166,95,0.25)", borderRadius: 6, fontSize: 12, color: "#1B7A3E" }}>
              ✓ Importación completada —{" "}
              {resultado.actualizados > 0 && `${resultado.actualizados} actualizado${resultado.actualizados !== 1 ? "s" : ""} `}
              {resultado.nuevos > 0 && `${resultado.nuevos} nuevo${resultado.nuevos !== 1 ? "s" : ""} `}
              {resultado.eliminados > 0 && `· ${resultado.eliminados} eliminado${resultado.eliminados !== 1 ? "s" : ""} (archivos conservados)`}
            </div>
          )}

          {/* Aviso de impacto si ya hay reactivos */}
          {!resultado && impacto && impacto.items > 0 && (
            <div style={{ padding: "10px 14px", background: "rgba(66,153,225,0.08)", border: "1px solid rgba(66,153,225,0.25)", borderRadius: 6, fontSize: 12, color: "#2B6CB0" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                ℹ Ya existen {impacto.items} reactivo{impacto.items !== 1 ? "s" : ""} en este contrato
              </div>
              {impacto.archivos > 0
                ? `Los reactivos cuyo nombre coincida conservarán sus ${impacto.archivos} archivo${impacto.archivos !== 1 ? "s" : ""} vinculados. Solo los que desaparezcan del CSV perderán el vínculo (los archivos no se eliminan).`
                : "Los reactivos que coincidan por nombre se actualizarán. Solo se eliminarán los que no estén en el nuevo CSV."
              }
            </div>
          )}

          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted-2)" }}>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Formato del CSV:</div>
            <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, display: "block", lineHeight: 1.8 }}>
              No.,Area,Rubro,Concepto,Fecha límite<br />
              1,Contabilidad,Financiero,Balance general,30/09/2026<br />
              1.1,Contabilidad,Financiero,Notas al balance,30/09/2026<br />
              1.1.1,Contabilidad,Financiero,Detalle activos,30/09/2026<br />
              2,Jurídico,Legal,Acta constitutiva,15/08/2026
            </code>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
              Area es opcional. Sub-puntos: "1.1", "1.1.1" (hasta 3 niveles). Fecha en DD/MM/YYYY.
            </div>
            <button onClick={descargarPlantilla} style={{ marginTop: 10, fontSize: 12, color: "#1B4F8A", background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>
              <DownloadIcon /> Descargar plantilla de ejemplo
            </button>
          </div>

          {/* Fecha límite global (fallback) */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
              Fecha límite global <span style={{ color: "var(--muted)", fontWeight: 400 }}>(fallback)</span>
            </label>
            <input
              type="date"
              value={fechaLimite}
              onChange={e => setFechaLimite(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              style={{ height: 36, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
              Se aplica a los reactivos que no tengan fecha propia en el CSV
            </div>
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
                      <th style={thS}>No.</th>
                      {rows.some(r => r.area) && <th style={thS}>Area</th>}
                      <th style={thS}>Rubro</th>
                      <th style={{ ...thS, width: "100%" }}>Concepto</th>
                      {rows.some(r => r.fechaLimite) && <th style={thS}>Fecha límite</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const nivel = (r.numero.match(/\./g) || []).length;
                      const indent = nivel * 10;
                      return (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)", background: nivel > 0 ? `rgba(0,0,0,${0.01 * nivel})` : "transparent" }}>
                        <td style={{ padding: "7px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: nivel > 0 ? "var(--muted-2)" : "var(--muted)", whiteSpace: "nowrap", paddingLeft: 12 + indent }}>
                          {nivel > 0 ? "↳ " : ""}{r.numero}
                        </td>
                        {rows.some(r2 => r2.area) && (
                          <td style={{ padding: "7px 12px", fontSize: 12, whiteSpace: "nowrap" }}>
                            {r.area ? <span style={{ padding: "2px 8px", borderRadius: 100, background: "rgba(27,79,138,0.1)", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#1B4F8A" }}>{r.area}</span> : "—"}
                          </td>
                        )}
                        <td style={{ padding: "7px 12px", fontSize: 12, whiteSpace: "nowrap" }}>
                          {r.rubro ? <span style={{ padding: "2px 8px", borderRadius: 100, background: "var(--surface-2)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{r.rubro}</span> : "—"}
                        </td>
                        <td style={{ padding: "7px 12px", fontSize: 13, color: "var(--ink)" }}>{r.nombre}</td>
                        {rows.some(r2 => r2.fechaLimite) && (
                          <td style={{ padding: "7px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: r.fechaLimite ? "#1B4F8A" : "var(--muted)", whiteSpace: "nowrap" }}>
                            {r.fechaLimite ? isoADMY(r.fechaLimite) : (fechaLimite ? isoADMY(fechaLimite) : "—")}
                          </td>
                        )}
                      </tr>
                      );
                    })}
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

// ── Style / Icon helpers ──────────────────────────────────────────────────────

function ItemDeadlineBadge({ fecha, extendida }: { fecha: string | null; extendida: boolean }) {
  if (!fecha) return null;
  const dias = Math.ceil((new Date(fecha + "T23:59:59").getTime() - Date.now()) / 86400000);
  const ext = extendida ? "Ext · " : "";
  if (dias > 3)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(45,166,95,0.12)", color: "#1B7A3E", fontFamily: "'DM Mono', monospace" }}>{ext}A tiempo</span>;
  if (dias >= 1)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(251,191,36,0.18)", color: "#92400E", fontFamily: "'DM Mono', monospace" }}>{ext}Próx. vencer</span>;
  if (dias === 0)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(251,191,36,0.18)", color: "#92400E", fontFamily: "'DM Mono', monospace" }}>Vence hoy</span>;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(200,71,42,0.12)", color: "#C8472A", fontFamily: "'DM Mono', monospace" }}>{ext}En retraso</span>;
}

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

function btnSm(bg: string, color: string, border = "none"): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", background: bg, color, border, borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: "nowrap" };
}

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return { fontSize: 11, padding: "2px 8px", borderRadius: 100, background: bg, color, fontFamily: "'DM Mono', monospace" };
}

function CalendarIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>; }
function ChevronIcon()  { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function PlusIcon()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function EditIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function SearchIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function DownloadIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function EyeIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }
function UploadIconSm() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>; }
function TrashIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>; }
function SendIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }
function SpinnerIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>; }
