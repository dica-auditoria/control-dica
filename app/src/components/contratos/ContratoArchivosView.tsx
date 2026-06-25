"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadZone from "@/components/archivos/UploadZone";
import ArchivoExplorer from "@/components/archivos/ArchivoExplorer";
import RequerimientosTab from "@/components/requerimientos/RequerimientosTab";
import RequerimientosClienteSection from "@/components/requerimientos/RequerimientosClienteSection";
import type { ClienteArchivo } from "@/components/archivos/ClienteArchivosTable";
import type { ArchivoContratoItem } from "@/app/actions/archivos";
import type { Contrato } from "@/types/contratos";
import type { Requerimiento, RequerimientoItem } from "@/types/requerimientos";
import { fetchComentariosItemsAction } from "@/app/actions/comentarios";

// ── Export helpers ──────────────────────────────────────────────────────────

function isoADMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function csvBlob(contenido: string): Blob {
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
  a.href = url; a.download = `${nombre.replace(/[^a-zA-Z0-9_-]/g, "_")}_reactivos.csv`; a.click();
  URL.revokeObjectURL(url);
}

function estadoLabel(estado: string) {
  if (estado === "completado") return "Completado";
  if (estado === "parcial")    return "Parcial";
  if (estado === "en_revision") return "En revisión";
  return "Pendiente";
}

type TabDestino = "cliente" | "empleado" | "portal";

interface Props {
  contrato: Contrato;
  entidadNombre: string;
  entidadId: string;
  archivosCliente: ArchivoContratoItem[];
  archivosEmpleado: ArchivoContratoItem[];
  requerimientos: Requerimiento[];
  rol: string;
  usuarioActualId?: string;
}

export default function ContratoArchivosView({
  contrato, entidadNombre, entidadId, archivosCliente, archivosEmpleado, requerimientos, rol, usuarioActualId,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabDestino>("cliente");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showReporteMenu, setShowReporteMenu] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xlsxRef = useRef<any>(null);

  useEffect(() => {
    import("xlsx-js-style").then(mod => { xlsxRef.current = mod.default ?? mod; });
  }, []);

  const todosLosItems = requerimientos.flatMap(r => r.items);

  const handleExportarExcel = async () => {
    setExportingReport(true);
    setShowReporteMenu(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = xlsxRef.current ?? await import("xlsx-js-style");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (mod.default ?? mod) as any;
    const sorted = [...todosLosItems].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));

    // Cargar todos los comentarios en una sola consulta
    const itemIds = sorted.map(i => i.id);
    const { data: comentariosPorItem } = await fetchComentariosItemsAction(itemIds);
    const getComentarios = (itemId: string): string => {
      const lista = comentariosPorItem?.[itemId] ?? [];
      if (lista.length === 0) return "";
      return lista.map(c => {
        const fecha = new Date(c.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
        return `${c.usuario_nombre} (${fecha}):\n${c.mensaje}`;
      }).join("\n\n");
    };

    // ── Stats ──────────────────────────────────────────────────────────────
    const entregados = sorted.filter(i => i.estado === "completado").length;
    const parciales  = sorted.filter(i => i.estado === "parcial").length;
    const pendientes = sorted.filter(i => i.estado === "pendiente" || i.estado === "en_revision").length;
    const naCount    = sorted.filter(i => i.estado === "na").length;
    const total = sorted.length;
    const pct = (n: number) => total > 0 ? `${Math.round(n / total * 100)}%` : "0%";

    // Excel date serial (days since Dec 30, 1899)
    const toXlsSerial = (iso: string) =>
      Math.round((new Date(iso + "T12:00:00").getTime() - new Date(Date.UTC(1899, 11, 30)).getTime()) / 86400000);

    // ── Styles ────────────────────────────────────────────────────────────
    const NAVY = "002060";
    const bd = { top: { style: "thin", color: { rgb: "AAAAAA" } }, bottom: { style: "thin", color: { rgb: "AAAAAA" } }, left: { style: "thin", color: { rgb: "AAAAAA" } }, right: { style: "thin", color: { rgb: "AAAAAA" } } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: Record<string, any> = {
      meta:    { font: { bold: true, sz: 11, name: "Calibri" } },
      label:   { font: { bold: true, sz: 10, name: "Calibri" } },
      sumHead: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: NAVY } }, alignment: { horizontal: "center" }, border: bd },
      green:   { font: { sz: 10, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: "92D050" } }, border: bd },
      orange:  { font: { sz: 10, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: "FFC000" } }, border: bd },
      red:     { font: { sz: 10, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: "FF0000" } }, border: bd },
      yellow:  { font: { sz: 10, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: "FFFF00" } }, border: bd },
      num:     { font: { sz: 10, name: "Calibri" }, alignment: { horizontal: "center" }, border: bd },
      numB:    { font: { bold: true, sz: 10, name: "Calibri" }, alignment: { horizontal: "center" }, border: bd },
      colH:    { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: NAVY } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: { style: "thin", color: { rgb: "FFFFFF" } }, bottom: { style: "thin", color: { rgb: "FFFFFF" } }, left: { style: "thin", color: { rgb: "FFFFFF" } }, right: { style: "thin", color: { rgb: "FFFFFF" } } } },
      sec:     { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: NAVY } } },
      data:    { font: { sz: 10, name: "Calibri" }, alignment: { wrapText: true, vertical: "top" }, border: { bottom: { style: "thin", color: { rgb: "DDDDDD" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } } },
      dataC:   { font: { sz: 10, name: "Calibri" }, alignment: { horizontal: "center", vertical: "top", wrapText: true }, border: { bottom: { style: "thin", color: { rgb: "DDDDDD" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } } },
      dateC:   { font: { sz: 10, name: "Calibri" }, alignment: { horizontal: "right", vertical: "top" }, numFmt: "DD/MM/YYYY", border: { bottom: { style: "thin", color: { rgb: "DDDDDD" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } } },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const C = (r: number, c: number, v: unknown, st: any = {}, t?: string) => {
      ws[XLSX.utils.encode_cell({ r, c })] = { v, t: t ?? (typeof v === "number" ? "n" : "s"), s: st };
    };

    // ── Rows 0-2: Company / contrato info ──────────────────────────────────
    // (no merges — text overflows into empty adjacent cells, matching original)
    C(0, 0, entidadNombre, s.meta);
    C(1, 0, contrato.nombre, s.meta);
    C(2, 0, "Seguimiento a los requerimientos de información", s.meta);

    // ── Summary table (cols 4-6, rows 0-5) ────────────────────────────────
    C(0, 4, "Status",    s.sumHead); C(0, 5, "Total",      s.sumHead); C(0, 6, "%",              s.sumHead);
    C(1, 4, "Entregado", s.green);   C(1, 5, entregados,   s.num);     C(1, 6, pct(entregados),  s.num);
    C(2, 4, "Parcial",   s.orange);  C(2, 5, parciales,    s.num);     C(2, 6, pct(parciales),   s.num);
    C(3, 4, "Pendiente", s.red);     C(3, 5, pendientes,   s.num);     C(3, 6, pct(pendientes),  s.num);
    C(4, 4, "N/A",       s.yellow);  C(4, 5, naCount,      s.num);     C(4, 6, pct(naCount),     s.num);
    C(5, 5, total, s.numB); C(5, 6, pct(entregados + parciales), s.numB);

    // ── Row 7: date received ───────────────────────────────────────────────
    C(7, 0, "Fecha en la que se recibió requerimiento:", s.label);
    if (contrato.fecha_inicio) {
      ws[XLSX.utils.encode_cell({ r: 7, c: 2 })] = {
        v: toXlsSerial(contrato.fecha_inicio), t: "n",
        z: "DD/MM/YYYY", s: { font: { bold: true, sz: 10 }, alignment: { horizontal: "right" } },
      };
    }

    // ── Row 9: column headers ──────────────────────────────────────────────
    ["No.", "Información requerida", "Tipo de\narchivo", "Auditor", "Área", "Vencimiento",
     "Status al primer\ncorte", "Notas del Reactivo", "Comentarios"].forEach((h, c) => C(9, c, h, s.colH));

    // ── Rows 10+: data grouped by rubro ───────────────────────────────────
    const groups: { rubro: string; items: typeof sorted }[] = [];
    for (const it of sorted) {
      const rubro = it.rubro ?? "";
      const existing = groups.find(g => g.rubro === rubro);
      if (existing) existing.items.push(it);
      else groups.push({ rubro, items: [it] });
    }
    const mapEstado = (e: string) => e === "completado" ? "Entregado" : e === "parcial" ? "Parcial" : e === "na" ? "N/A" : "Pendiente";

    let row = 10;
    const rowHeights: Record<number, number> = { 9: 40 };

    for (const group of groups) {
      if (group.rubro) {
        // No merge — each cell styled individually (matches original)
        C(row, 0, "",                          s.sec);
        C(row, 1, group.rubro.toUpperCase(),   s.sec);
        for (let c = 2; c <= 8; c++) C(row, c, "", s.sec);
        rowHeights[row] = 18;
        row++;
      }
      for (const it of group.items) {
        C(row, 0, it.numero ?? "", s.dataC);
        C(row, 1, it.nombre,       s.data);
        C(row, 2, "",              s.dataC); // Tipo de archivo
        C(row, 3, "",              s.dataC); // Auditor
        C(row, 4, it.area ?? "",   s.data);
        if (it.fecha_limite) {
          ws[XLSX.utils.encode_cell({ r: row, c: 5 })] = { v: toXlsSerial(it.fecha_limite), t: "n", z: "DD/MM/YYYY", s: s.dateC };
        } else {
          C(row, 5, "", s.dataC);
        }
        C(row, 6, mapEstado(it.estado),  s.dataC);
        C(row, 7, getComentarios(it.id), s.data);
        C(row, 8, "",                    s.data); // Comentarios (manual)
        rowHeights[row] = Math.max(20, Math.ceil(it.nombre.length / 50) * 14);
        row++;
      }
    }

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: 8 } });
    ws["!cols"] = [{ wch: 9.83 }, { wch: 58.33 }, { wch: 9.83 }, { wch: 9.83 }, { wch: 18.5 }, { wch: 19.17 }, { wch: 9.83 }, { wch: 30 }, { wch: 23.67 }];
    ws["!rows"] = Array.from({ length: row }, (_, i) => rowHeights[i] ? { hpt: rowHeights[i] } : {});

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
    XLSX.writeFile(wb,
      `${entidadNombre}_${contrato.nombre}_reporte.xlsx`.replace(/[^a-zA-Z0-9_.\-áéíóúüñÁÉÍÓÚÜÑ]/g, "_")
    );
    setExportingReport(false);
  };

  const handleExportarPDF = () => {
    setShowReporteMenu(false);
    const sorted = [...todosLosItems].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
    const completados = sorted.filter(i => i.estado === "completado").length;
    const parciales   = sorted.filter(i => i.estado === "parcial").length;
    const enRevision  = sorted.filter(i => i.estado === "en_revision").length;
    const pendientes  = sorted.filter(i => i.estado === "pendiente").length;
    const pct = sorted.length > 0 ? Math.round((completados / sorted.length) * 100) : 0;
    const colorEstado = (e: string) => e === "completado" ? "#166534" : e === "parcial" ? "#C2410C" : e === "en_revision" ? "#92400E" : "#6B7280";
    const rows = sorted.map(it => {
      const count = archivosCliente.filter(a => a.requerimiento_item_id === it.id).length;
      return `<tr><td style="color:#555;font-family:monospace">${it.numero ?? ""}</td><td>${(it.area ?? "").replace(/</g, "&lt;")}</td><td>${(it.rubro ?? "").replace(/</g, "&lt;")}</td><td>${it.nombre.replace(/</g, "&lt;")}</td><td style="color:${colorEstado(it.estado)};font-weight:600">${estadoLabel(it.estado)}</td><td style="text-align:center">${count}</td><td style="color:#555;font-family:monospace">${it.fecha_limite ? isoADMY(it.fecha_limite) : "—"}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Reporte — ${entidadNombre}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}.header{border-bottom:2px solid #1B4F8A;padding-bottom:12px;margin-bottom:16px}.header h1{font-size:17px;color:#1B4F8A;margin-bottom:2px}.header h2{font-size:13px;color:#444;font-weight:400}.header .meta{font-size:10px;color:#888;margin-top:6px}.summary{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}.stat{background:#f5f5f5;border-radius:4px;padding:8px 14px}.stat .val{font-size:20px;font-weight:700}.stat .lbl{font-size:9px;color:#777;text-transform:uppercase;letter-spacing:.05em;margin-top:1px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#1B4F8A;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em}td{padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}tr:nth-child(even) td{background:#f9fafb}@media print{body{padding:16px}}</style></head><body><div class="header"><h1>${entidadNombre.replace(/</g,"&lt;")}</h1><h2>${contrato.nombre.replace(/</g,"&lt;")}</h2><div class="meta">Reporte generado el ${new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})}</div></div><div class="summary"><div class="stat"><div class="val" style="color:#166534">${completados}</div><div class="lbl">Completados</div></div><div class="stat"><div class="val" style="color:#C2410C">${parciales}</div><div class="lbl">Parciales</div></div><div class="stat"><div class="val" style="color:#92400E">${enRevision}</div><div class="lbl">En revisión</div></div><div class="stat"><div class="val" style="color:#6B7280">${pendientes}</div><div class="lbl">Pendientes</div></div><div class="stat"><div class="val" style="color:#1B4F8A">${pct}%</div><div class="lbl">Avance</div></div><div class="stat"><div class="val">${sorted.length}</div><div class="lbl">Total</div></div></div><table><thead><tr><th>No.</th><th>Área</th><th>Rubro</th><th>Reactivo</th><th>Estado</th><th>Archivos</th><th>Plazo</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
  };

  const isAdmin = rol === "admin" || rol === "superadmin";
  const isEmpleado = rol === "empleado" || rol === "rrhh";
  // Employees can upload/manage only in the "empleado" tab; nobody uploads in portal view
  const canUpload = tab !== "portal" && (isAdmin || (isEmpleado && tab === "empleado"));
  const explorerIsAdmin = isAdmin || (isEmpleado && tab === "empleado");
  const archivos = tab === "empleado" ? archivosEmpleado : archivosCliente;
  const requerimientosActivos = requerimientos.filter(r => r.estado !== "completado").length;

  const dirección = [
    contrato.calle && `${contrato.calle}${contrato.numero_exterior ? " " + contrato.numero_exterior : ""}`,
    contrato.colonia,
    contrato.municipio,
    contrato.estado_republica,
  ].filter(Boolean).join(", ");

  const handleUploadDone = () => {
    setUploadOpen(false);
    router.refresh();
  };

  // Close upload panel when switching to a tab where upload is not allowed
  const handleTabChange = (t: TabDestino) => {
    setTab(t);
    if (t === "portal" || (isEmpleado && t === "cliente")) setUploadOpen(false);
  };

  const tabConfig: Record<"cliente" | "empleado", { label: string; emptyMsg: string; uploadLabel: string }> = {
    cliente: {
      label: "Clientes",
      emptyMsg: "Sin archivos para clientes",
      uploadLabel: "Subir archivo de cliente",
    },
    empleado: {
      label: "Empleados",
      emptyMsg: "Sin archivos para empleados",
      uploadLabel: "Subir archivo de empleado",
    },
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px 0",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingBottom: 14 }}>
          {/* Breadcrumb + título */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Link href="/dashboard/directorio" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13, flexShrink: 0 }}>
              Directorio
            </Link>
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>/</span>
            <Link href={`/dashboard/directorio/empresa/${entidadId}`} style={{ color: "var(--muted-2)", textDecoration: "none", fontSize: 13, flexShrink: 0 }}>
              {entidadNombre}
            </Link>
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>/</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {contrato.nombre}
              </div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>
                {contrato.numero_contrato && `${contrato.numero_contrato} · `}
                {archivosCliente.length + archivosEmpleado.length} archivo{archivosCliente.length + archivosEmpleado.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Badge estado + botones topbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <EstadoBadge estado={contrato.estado} />
            {todosLosItems.length > 0 && (
              <>
                <button
                  onClick={() => exportarCSV(todosLosItems, contrato.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  <DownloadIcon /> CSV
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowReporteMenu(v => !v)}
                    disabled={exportingReport}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#1B4F8A", color: "white", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: exportingReport ? 0.6 : 1 }}
                  >
                    <DownloadIcon /> {exportingReport ? "Generando…" : "Reporte"} <span style={{ fontSize: 9, marginLeft: 1 }}>▾</span>
                  </button>
                  {showReporteMenu && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setShowReporteMenu(false)} />
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 1000, background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 6, boxShadow: "0 8px 24px rgba(15,17,23,0.15)", minWidth: 165, overflow: "hidden" }}>
                        <button onClick={handleExportarExcel} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--ink)", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ fontSize: 15 }}>📊</span> Excel (.xlsx)
                        </button>
                        <button onClick={handleExportarPDF} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 13, color: "var(--ink)", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ fontSize: 15 }}>📄</span> PDF / Imprimir
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {canUpload && (
              <button
                onClick={() => setUploadOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", background: "var(--ink)", color: "white",
                  border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <UploadIcon /> {tabConfig[tab].uploadLabel}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {(["cliente", "empleado"] as ("cliente" | "empleado")[]).map(t => {
            const count = t === "cliente" ? archivosCliente.length : archivosEmpleado.length;
            const isActive = tab === t;
            return (
              <button key={t} onClick={() => handleTabChange(t)}
                style={{ padding: "8px 18px", border: "none", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent", background: "none", color: isActive ? "var(--accent)" : "var(--muted-2)", fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1, display: "flex", alignItems: "center", gap: 8 }}>
                {tabConfig[t].label}
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: isActive ? "rgba(200,71,42,0.1)" : "var(--surface-2)", color: isActive ? "var(--accent)" : "var(--muted)" }}>{count}</span>
                {t === "cliente" && requerimientosActivos > 0 && (
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: isActive ? "rgba(200,71,42,0.1)" : "rgba(255,193,7,0.15)", color: isActive ? "var(--accent)" : "#B8860B" }}>{requerimientosActivos} req.</span>
                )}
              </button>
            );
          })}
          {requerimientos.length > 0 && (
            <button onClick={() => handleTabChange("portal")}
              style={{ padding: "8px 18px", border: "none", borderBottom: tab === "portal" ? "2px solid #1B4F8A" : "2px solid transparent", background: "none", color: tab === "portal" ? "#1B4F8A" : "var(--muted-2)", fontSize: 13, fontWeight: tab === "portal" ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1, display: "flex", alignItems: "center", gap: 8 }}>
              Vista Portal
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: tab === "portal" ? "rgba(27,79,138,0.1)" : "var(--surface-2)", color: tab === "portal" ? "#1B4F8A" : "var(--muted)" }}>{requerimientosActivos}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Vista Portal ── */}
      {tab === "portal" ? (
        <div style={{ padding: "24px 32px" }}>
          <RequerimientosClienteSection
            requerimientos={requerimientos}
            entidadId={entidadId}
            archivos={archivosCliente as unknown as (ClienteArchivo & { requerimiento_item_id: string | null })[]}
            areaUsuario={null}
            readOnly={true}
          />
        </div>
      ) : (
        <div style={{ padding: "24px 32px" }}>
          {/* Info contrato */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
            padding: "14px 20px", marginBottom: 20,
            display: "flex", gap: 32, flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
          }}>
            {contrato.fecha_inicio && (
              <InfoItem label="Vigencia">
                {new Date(contrato.fecha_inicio + "T12:00:00").toLocaleDateString("es-MX")}
                {contrato.fecha_fin && ` — ${new Date(contrato.fecha_fin + "T12:00:00").toLocaleDateString("es-MX")}`}
              </InfoItem>
            )}
            {dirección && <InfoItem label="Dirección">{dirección}</InfoItem>}
          </div>

          {/* Upload zone */}
          {uploadOpen && (
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
              padding: "20px 24px", marginBottom: 20,
              boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
            }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
                {tabConfig[tab as "cliente" | "empleado"].uploadLabel}
              </div>
              <UploadZone
                entidadId={entidadId}
                contratoId={contrato.id}
                destino={tab as "cliente" | "empleado"}
                onDone={handleUploadDone}
              />
            </div>
          )}

          {/* Requerimientos — solo en tab cliente */}
          {tab === "cliente" && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)", marginBottom: 20 }}>
              <RequerimientosTab
                requerimientos={requerimientos}
                archivos={archivosCliente}
                entidadId={entidadId}
                contratoId={contrato.id}
                isSuperAdmin={rol === "superadmin"}
                rol={rol}
                usuarioActualId={usuarioActualId}
              />
            </div>
          )}

          {/* Tabla archivos */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                Archivos — {tabConfig[tab as "cliente" | "empleado"].label}
              </div>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 7px", borderRadius: 100, background: "var(--surface-2)", color: "var(--muted-2)" }}>
                {archivos.length}
              </span>
            </div>
            <ArchivoExplorer
              archivos={archivos}
              isAdmin={explorerIsAdmin}
              entidadId={entidadId}
              contratoId={contrato.id}
              destino={tab as "cliente" | "empleado"}
              nombreZip={`${contrato.nombre}-${tab}`}
              emptyMsg={canUpload
                ? `${tabConfig[tab as "cliente" | "empleado"].emptyMsg} — usa el botón "Subir" para agregar`
                : tabConfig[tab as "cliente" | "empleado"].emptyMsg}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink)" }}>{children}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    vigente:   { bg: "var(--green-light)",  color: "var(--green)" },
    vencido:   { bg: "var(--surface-2)",    color: "var(--muted)" },
    cancelado: { bg: "var(--red-light)",    color: "var(--accent)" },
  };
  const s = map[estado] ?? map.vencido;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace", background: s.bg, color: s.color }}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}



function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
