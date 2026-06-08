"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ArchivoContratoItem } from "@/app/actions/archivos";
import { deleteArchivoAction, renameArchivoAction, moveArchivoAction, bulkDeleteArchivosAction, crearCarpetaAction } from "@/app/actions/archivos";
import { getWasabiViewUrlAction } from "@/app/actions/storage";
import UploadZone from "@/components/archivos/UploadZone";

const IMAGE_THUMB_TYPES = ["png", "jpg", "jpeg"];

// ── Types ────────────────────────────────────────────────────────────────────

type SortCol = "nombre" | "size_bytes" | "created_at";
type SortDir = "asc" | "desc";
interface SortState { col: SortCol; dir: SortDir }

interface FileNode { type: "file"; name: string; archivo: ArchivoContratoItem }
interface FolderNode { type: "folder"; name: string; fullPath: string; children: Map<string, TreeNode>; fileCount: number }
type TreeNode = FileNode | FolderNode;

// ── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(archivos: ArchivoContratoItem[]): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();
  for (const archivo of archivos) {
    const parts = archivo.nombre.split("/").filter(Boolean);
    let current = root;
    let pathSoFar = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
      if (!current.has(part))
        current.set(part, { type: "folder", name: part, fullPath: pathSoFar, children: new Map(), fileCount: 0 });
      const node = current.get(part)!;
      if (node.type === "folder") current = node.children;
    }
    // skip virtual folder placeholder — it creates the folder path above but isn't a real file
    if (archivo.tipo === "carpeta") continue;
    current.set(archivo.id, { type: "file", name: parts[parts.length - 1] ?? archivo.nombre, archivo });
  }

  function countFiles(m: Map<string, TreeNode>): number {
    let n = 0;
    m.forEach(x => { n += x.type === "file" ? 1 : countFiles((x as FolderNode).children); });
    return n;
  }
  function setCounts(map: Map<string, TreeNode>) {
    map.forEach(node => {
      if (node.type === "folder") {
        node.fileCount = countFiles(node.children);
        setCounts(node.children);
      }
    });
  }
  setCounts(root);
  return root;
}

function sortedEntries(map: Map<string, TreeNode>, sort?: SortState | null): Array<[string, TreeNode]> {
  return Array.from(map.entries()).sort(([, a], [, b]) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    if (a.type === "folder") return a.name.localeCompare(b.name, "es");
    if (!sort) return a.name.localeCompare(b.name, "es");
    const fa = (a as FileNode).archivo, fb = (b as FileNode).archivo;
    let cmp = 0;
    if (sort.col === "nombre") cmp = a.name.localeCompare(b.name, "es");
    else if (sort.col === "size_bytes") cmp = fa.size_bytes - fb.size_bytes;
    else if (sort.col === "created_at") cmp = fa.created_at.localeCompare(fb.created_at);
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

function collectFolderPaths(map: Map<string, TreeNode>): string[] {
  const paths: string[] = [];
  map.forEach(node => {
    if (node.type === "folder") {
      paths.push(node.fullPath);
      paths.push(...collectFolderPaths(node.children));
    }
  });
  return paths;
}

function getAllFileIds(map: Map<string, TreeNode>): string[] {
  const ids: string[] = [];
  map.forEach(node => {
    if (node.type === "file") ids.push(node.archivo.id);
    else ids.push(...getAllFileIds((node as FolderNode).children));
  });
  return ids;
}

function filterTree(nodes: Map<string, TreeNode>, search: string, tipos: Set<string>): Map<string, TreeNode> {
  const lower = search.toLowerCase();
  const result = new Map<string, TreeNode>();
  nodes.forEach((node, key) => {
    if (node.type === "file") {
      if ((!search || node.name.toLowerCase().includes(lower)) && (tipos.size === 0 || tipos.has(node.archivo.tipo)))
        result.set(key, node);
    } else {
      const fc = filterTree(node.children, search, tipos);
      if (fc.size > 0) {
        let n = 0;
        fc.forEach(x => { n += x.type === "file" ? 1 : (x as FolderNode).fileCount; });
        result.set(key, { ...node, children: fc, fileCount: n });
      }
    }
  });
  return result;
}

function allFolderPathsFromArchivos(archivos: ArchivoContratoItem[]): string[] {
  const folders = new Set<string>();
  for (const a of archivos) {
    const parts = a.nombre.split("/").filter(Boolean);
    for (let i = 0; i < parts.length - 1; i++) folders.add(parts.slice(0, i + 1).join("/"));
  }
  return Array.from(folders).sort();
}

// ── Row context ──────────────────────────────────────────────────────────────

interface RowCtx {
  expanded: Set<string>;
  toggle: (p: string) => void;
  sort: SortState | null;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  onPreview: (a: ArchivoContratoItem) => void;
  onMoveRequest: (a: ArchivoContratoItem) => void;
  onRenamed: () => void;
  activeUploadFolder: string | null;
  setActiveUploadFolder: (p: string | null) => void;
  onNuevaCarpeta: (parentPath: string) => void;
  onFolderZip: (folderPath: string, folderName: string) => void;
  entidadId: string;
  contratoId?: string;
  destino?: "cliente" | "empleado";
  isAdmin: boolean;
}

// ── Row renderer ─────────────────────────────────────────────────────────────

function renderRows(nodes: Map<string, TreeNode>, depth: number, ctx: RowCtx): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  const indent = depth * 20;

  for (const [, node] of sortedEntries(nodes, ctx.sort)) {
    if (node.type === "folder") {
      const isOpen = ctx.expanded.has(node.fullPath);
      const isUploadActive = ctx.activeUploadFolder === node.fullPath;
      rows.push(<FolderRow key={`f-${node.fullPath}`} node={node} indent={indent} isOpen={isOpen} isUploadActive={isUploadActive} ctx={ctx} />);
      if (isUploadActive) {
        rows.push(
          <tr key={`upload-${node.fullPath}`}>
            <td colSpan={6} style={{ padding: "12px 20px 16px", paddingLeft: indent + 52, background: "rgba(245,166,35,0.04)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Subir a: {node.name}
              </div>
              <UploadZone
                entidadId={ctx.entidadId}
                contratoId={ctx.contratoId}
                destino={ctx.destino}
                carpetaPrefix={node.fullPath}
                onDone={() => { ctx.setActiveUploadFolder(null); ctx.onRenamed(); }}
              />
            </td>
          </tr>
        );
      }
      if (isOpen) rows.push(...renderRows(node.children, depth + 1, ctx));
    } else {
      rows.push(<FileRow key={`a-${node.archivo.id}`} node={node} indent={indent} ctx={ctx} />);
    }
  }
  return rows;
}

// ── Folder row ────────────────────────────────────────────────────────────────

function FolderRow({ node, indent, isOpen, isUploadActive, ctx }: { node: FolderNode; indent: number; isOpen: boolean; isUploadActive: boolean; ctx: RowCtx }) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      style={{ cursor: "pointer", borderBottom: "1px solid var(--border)", background: isUploadActive ? "rgba(245,166,35,0.05)" : hov ? "rgba(15,17,23,0.03)" : "var(--surface)" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      <td style={{ padding: "8px 0 8px 16px", width: 32 }} onClick={e => e.stopPropagation()} />
      <td style={{ padding: "8px 20px" }} onClick={() => ctx.toggle(node.fullPath)}>
        <div style={{ paddingLeft: indent, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-flex", flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", color: "rgba(15,17,23,0.35)" }}><ChevronIcon /></span>
          <FolderSvg open={isOpen} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{node.name}</span>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: "rgba(15,17,23,0.07)", color: "rgba(15,17,23,0.4)", marginLeft: 2 }}>{node.fileCount}</span>
        </div>
      </td>
      <td colSpan={3} onClick={() => ctx.toggle(node.fullPath)} style={{ padding: "8px 20px" }}>
        <span style={{ fontSize: 11, color: "rgba(15,17,23,0.2)", fontFamily: "'DM Mono', monospace" }}>{node.fileCount} archivo{node.fileCount !== 1 ? "s" : ""}</span>
      </td>
      <td style={{ padding: "8px 14px" }} onClick={e => e.stopPropagation()}>
        <div style={{ opacity: hov || isUploadActive ? 1 : 0, transition: "opacity 0.1s", display: "flex", gap: 2 }}>
          <ActionBtn title="Descargar carpeta ZIP" onClick={() => ctx.onFolderZip(node.fullPath, node.name)}><ZipIcon /></ActionBtn>
          {ctx.isAdmin && (
            <>
              <ActionBtn title={isUploadActive ? "Cerrar zona de subida" : "Subir aquí"} onClick={() => ctx.setActiveUploadFolder(isUploadActive ? null : node.fullPath)}>
                {isUploadActive ? <XSmallIcon /> : <UploadHereIcon />}
              </ActionBtn>
              <ActionBtn title="Nueva subcarpeta" onClick={() => ctx.onNuevaCarpeta(node.fullPath)}><NewFolderIcon /></ActionBtn>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── File row ─────────────────────────────────────────────────────────────────

function FileRow({ node, indent, ctx }: { node: FileNode; indent: number; ctx: RowCtx }) {
  const [hov, setHov] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.name);
  const [renameSaving, setRenameSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const a = node.archivo;
  const selected = ctx.selectedIds.has(a.id);

  const handleDownload = async () => {
    setDownloading(true);
    const { url } = await getWasabiViewUrlAction(a.ruta_storage);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = node.name;
      link.click();
    }
    setDownloading(false);
  };

  const startRename = () => {
    setRenameVal(node.name);
    setRenaming(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  };

  const commitRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === node.name) { setRenaming(false); return; }
    setRenameSaving(true);
    await renameArchivoAction(a.id, trimmed);
    setRenameSaving(false);
    setRenaming(false);
    ctx.onRenamed();
  };

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", background: selected ? "rgba(200,71,42,0.04)" : hov ? "rgba(15,17,23,0.015)" : "white" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <td style={{ padding: "10px 0 10px 16px", width: 32 }} onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => ctx.toggleSelected(a.id)}
          style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
      </td>
      <td style={{ padding: "10px 20px" }}>
        <div style={{ paddingLeft: indent + 28, display: "flex", alignItems: "center", gap: 10 }}>
          {IMAGE_THUMB_TYPES.includes(a.tipo) ? <ImageThumb archivo={a} /> : <FileTypeIcon tipo={a.tipo} />}
          {renaming ? (
            <input ref={inputRef} value={renameVal} onChange={e => setRenameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
              disabled={renameSaving}
              style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", border: "1.5px solid var(--accent)", borderRadius: 4, padding: "2px 8px", outline: "none", width: 260, fontFamily: "'DM Sans', sans-serif" }} />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", cursor: "pointer" }} onClick={() => ctx.onPreview(a)}>{node.name}</span>
          )}
        </div>
      </td>
      <td style={{ padding: "10px 20px" }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: "var(--surface-2)", color: "rgba(15,17,23,0.6)", textTransform: "uppercase" }}>{a.tipo}</span>
      </td>
      <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.5)" }}>{formatBytes(a.size_bytes)}</td>
      <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.5)" }}>{new Date(a.created_at).toLocaleDateString("es-MX")}</td>
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 2, opacity: hov && !renaming ? 1 : 0, transition: "opacity 0.1s" }}>
          <ActionBtn title="Vista previa" onClick={() => ctx.onPreview(a)}><EyeIcon /></ActionBtn>
          <ActionBtn title={downloading ? "Descargando…" : "Descargar"} onClick={handleDownload}><DownloadSmIcon /></ActionBtn>
          {ctx.isAdmin && <ActionBtn title="Renombrar" onClick={startRename}><PencilIcon /></ActionBtn>}
          {ctx.isAdmin && <ActionBtn title="Mover" onClick={() => ctx.onMoveRequest(a)}><MoveIcon /></ActionBtn>}
          {ctx.isAdmin && <ActionBtn title="Eliminar" onClick={() => ctx.onPreview(a)} danger><TrashIcon /></ActionBtn>}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 4, border: "none", cursor: "pointer", background: hov ? (danger ? "rgba(200,71,42,0.1)" : "rgba(15,17,23,0.07)") : "transparent", color: danger ? "var(--accent)" : "rgba(15,17,23,0.5)", transition: "background 0.1s" }}>
      {children}
    </button>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

const PREVIEWABLE = ["pdf", "png", "jpg", "jpeg", "svg"];
const IMAGE_TYPES = ["png", "jpg", "jpeg", "svg"];

function PreviewModal({ archivo, isAdmin, onClose, onDeleted }: { archivo: ArchivoContratoItem; isAdmin: boolean; onClose: () => void; onDeleted: () => void }) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][] | null>(null);

  const fileName = archivo.nombre.split("/").pop() ?? archivo.nombre;
  const canPreview = PREVIEWABLE.includes(archivo.tipo);
  const isImage = IMAGE_TYPES.includes(archivo.tipo);
  const isCsv = archivo.tipo === "csv";

  useEffect(() => {
    getWasabiViewUrlAction(archivo.ruta_storage).then(({ url }) => {
      setViewUrl(url);
      setLoadingUrl(false);
      if (url && isCsv) {
        fetch(url).then(r => r.text()).then(text => {
          const rows = text.trim().split("\n").map(line => {
            const cols: string[] = [];
            let inQ = false, cur = "";
            for (const ch of line) {
              if (ch === '"') { inQ = !inQ; }
              else if (ch === "," && !inQ) { cols.push(cur); cur = ""; }
              else cur += ch;
            }
            cols.push(cur);
            return cols;
          });
          setCsvData(rows);
        }).catch(() => {});
      }
    });
  }, [archivo.ruta_storage, isCsv]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true); setDeleteError(null);
    const { error } = await deleteArchivoAction(archivo.id);
    if (error) { setDeleteError(error); setDeleting(false); return; }
    onDeleted(); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 960, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <FileTypeIcon tipo={archivo.tipo} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)", marginTop: 2 }}>
              {formatBytes(archivo.size_bytes)} · {archivo.subido_por_nombre ?? "—"} · {new Date(archivo.created_at).toLocaleDateString("es-MX")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {viewUrl && <a href={viewUrl} download={fileName} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 4, border: "1.5px solid var(--border-strong)", fontSize: 13, fontWeight: 500, color: "var(--ink)", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}><DownloadIcon /> Descargar</a>}
            <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "rgba(15,17,23,0.4)" }}><XIcon /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", background: (canPreview || isCsv) ? "#f5f5f5" : "white", display: "flex", alignItems: isCsv ? "flex-start" : "center", justifyContent: "center", minHeight: 0 }}>
          {loadingUrl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "rgba(15,17,23,0.4)", padding: 48 }}><SpinnerLg /><span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Cargando…</span></div>
          ) : isCsv && csvData ? (
            <div style={{ width: "100%", overflow: "auto", padding: 20 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Mono', monospace", width: "100%", background: "var(--card)", borderRadius: 6, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <thead>
                  <tr>{csvData[0]?.map((h, i) => <th key={i} style={{ padding: "8px 14px", textAlign: "left", background: "var(--surface)", borderBottom: "2px solid var(--border)", fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {csvData.slice(1).map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                      {row.map((cell, ci) => <td key={ci} style={{ padding: "7px 14px", color: "rgba(15,17,23,0.7)", whiteSpace: "nowrap" }}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(15,17,23,0.35)", fontFamily: "'DM Mono', monospace" }}>{csvData.length - 1} filas · {csvData[0]?.length ?? 0} columnas</div>
            </div>
          ) : canPreview && isImage ? (
            <img src={viewUrl!} alt={fileName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : canPreview ? (
            <iframe src={viewUrl!} title={fileName} style={{ width: "100%", height: "100%", minHeight: 500, border: "none" }} />
          ) : (
            <div style={{ textAlign: "center", padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: "var(--surface-2)", color: "rgba(15,17,23,0.35)", textTransform: "uppercase" }}>{archivo.tipo.slice(0, 3)}</div>
              <div style={{ color: "rgba(15,17,23,0.5)", fontSize: 13 }}>Vista previa no disponible para <strong>.{archivo.tipo}</strong></div>
              {viewUrl && <a href={viewUrl} download={fileName} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "var(--ink)", color: "white", borderRadius: 4, fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}><DownloadIcon /> Descargar archivo</a>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.3)" }}>SHA-256: {archivo.hash_sha256}</span>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {deleteError && <span style={{ fontSize: 12, color: "var(--accent)" }}>{deleteError}</span>}
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: 12, color: "rgba(15,17,23,0.6)" }}>¿Eliminar permanentemente?</span>
                  <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "5px 12px", cursor: "pointer", color: "rgba(15,17,23,0.6)" }}>Cancelar</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ fontSize: 12, background: "var(--accent)", border: "none", borderRadius: 4, padding: "5px 12px", cursor: deleting ? "not-allowed" : "pointer", color: "white", fontWeight: 600, opacity: deleting ? 0.7 : 1 }}>{deleting ? "Eliminando…" : "Sí, eliminar"}</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "none", border: "1px solid rgba(200,71,42,0.3)", borderRadius: 4, padding: "5px 12px", cursor: "pointer", color: "var(--accent)" }}><TrashIcon /> Eliminar archivo</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Move modal ────────────────────────────────────────────────────────────────

function MoveModal({ archivo, folderPaths, onClose, onMoved }: { archivo: ArchivoContratoItem; folderPaths: string[]; onClose: () => void; onMoved: () => void }) {
  const [selected, setSelected] = useState<string>(() => {
    const parts = archivo.nombre.split("/");
    return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleMove = async () => {
    setSaving(true);
    await moveArchivoAction(archivo.id, selected);
    onMoved();
    onClose();
  };

  const filename = archivo.nombre.split("/").pop() ?? archivo.nombre;
  const all = ["", ...folderPaths];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Mover archivo</div>
          <div style={{ fontSize: 12, color: "rgba(15,17,23,0.45)", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{filename}</div>
        </div>
        <div style={{ padding: 16, maxHeight: 320, overflowY: "auto" }}>
          {all.map(path => {
            const depth = path ? path.split("/").length : 0;
            const label = path ? path.split("/").pop()! : "Raíz del contrato";
            const isCurrent = path === selected;
            return (
              <button key={path} onClick={() => setSelected(path)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", borderRadius: 6, cursor: "pointer", background: isCurrent ? "rgba(200,71,42,0.08)" : "transparent", color: isCurrent ? "var(--accent)" : "var(--ink)", textAlign: "left", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 2 }}>
                <span style={{ paddingLeft: depth * 16 }} />
                {path ? <FolderSvg open={false} /> : <span style={{ fontSize: 14 }}>📁</span>}
                <span style={{ fontWeight: isCurrent ? 600 : 400 }}>{label}</span>
                {isCurrent && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--accent)" }}>✓ actual</span>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13, color: "rgba(15,17,23,0.6)" }}>Cancelar</button>
          <button onClick={handleMove} disabled={saving} style={{ padding: "7px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Moviendo…" : "Mover aquí"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ArchivoExplorerProps {
  archivos: ArchivoContratoItem[];
  emptyMsg: string;
  isAdmin?: boolean;
  entidadId: string;
  contratoId?: string;
  destino?: "cliente" | "empleado";
  nombreZip?: string;
}

export default function ArchivoExplorer({ archivos, emptyMsg, isAdmin = false, entidadId, contratoId, destino, nombreZip }: ArchivoExplorerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tiposFiltro, setTiposFiltro] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ArchivoContratoItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<ArchivoContratoItem | null>(null);
  const [activeUploadFolder, setActiveUploadFolder] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [nuevaCarpetaParent, setNuevaCarpetaParent] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(archivos), [archivos]);
  const folderPaths = useMemo(() => new Set(collectFolderPaths(tree)), [tree]);
  const isFiltering = search.length > 0 || tiposFiltro.size > 0;
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(() => new Set(collectFolderPaths(buildTree(archivos))));
  const expanded = isFiltering ? folderPaths : manualExpanded;

  const displayTree = useMemo(() => isFiltering ? filterTree(tree, search, tiposFiltro) : tree, [tree, search, tiposFiltro, isFiltering]);
  const allDisplayIds = useMemo(() => getAllFileIds(displayTree), [displayTree]);

  const totalBytes = useMemo(() => archivos.filter(a => a.tipo !== "carpeta").reduce((s, a) => s + a.size_bytes, 0), [archivos]);
  const tiposDisponibles = useMemo(() => Array.from(new Set(archivos.map(a => a.tipo))).sort(), [archivos]);
  const allFolders = useMemo(() => allFolderPathsFromArchivos(archivos), [archivos]);

  const toggle = useCallback((path: string) => setManualExpanded(prev => {
    const next = new Set(prev);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  }), []);

  const toggleSelected = useCallback((id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const toggleSort = (col: SortCol) => setSort(prev => {
    if (!prev || prev.col !== col) return { col, dir: "asc" };
    if (prev.dir === "asc") return { col, dir: "desc" };
    return null;
  });

  const allSelected = allDisplayIds.length > 0 && allDisplayIds.every(id => selectedIds.has(id));
  const someSelected = allDisplayIds.some(id => selectedIds.has(id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); allDisplayIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); allDisplayIds.forEach(id => next.add(id)); return next; });
    }
  };

  const handleBulkZip = () => {
    const ids = Array.from(selectedIds).join(",");
    const url = `/api/download-zip?ids=${ids}&nombre=${nombreZip ?? "seleccion"}`;
    setDownloadingZip(true);
    const a = document.createElement("a"); a.href = url; a.click();
    setTimeout(() => setDownloadingZip(false), 2000);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.size} archivos permanentemente?`)) return;
    setBulkDeleting(true);
    await bulkDeleteArchivosAction(Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    router.refresh();
  };

  const handleFolderZip = (folderPath: string, folderName: string) => {
    if (!contratoId) return;
    const params = new URLSearchParams({ contratoId, folderPath, nombre: folderName });
    if (destino) params.set("destino", destino);
    setDownloadingZip(true);
    const a = document.createElement("a"); a.href = `/api/download-zip?${params}`; a.click();
    setTimeout(() => setDownloadingZip(false), 2000);
  };

  const handleZipAll = () => {
    if (!contratoId) return;
    const params = new URLSearchParams({ contratoId });
    if (destino) params.set("destino", destino);
    if (nombreZip) params.set("nombre", nombreZip);
    setDownloadingZip(true);
    const a = document.createElement("a"); a.href = `/api/download-zip?${params}`; a.click();
    setTimeout(() => setDownloadingZip(false), 2000);
  };

  const allExpanded = manualExpanded.size >= folderPaths.size;
  const hasFolders = folderPaths.size > 0;

  const ctx: RowCtx = {
    expanded, toggle, sort, selectedIds, toggleSelected,
    onPreview: setPreview, onMoveRequest: setMoveTarget,
    onRenamed: () => router.refresh(),
    activeUploadFolder, setActiveUploadFolder,
    onNuevaCarpeta: setNuevaCarpetaParent,
    onFolderZip: handleFolderZip,
    entidadId, contratoId, destino, isAdmin,
  };

  if (archivos.length === 0) {
    return <div style={{ padding: "48px 20px", textAlign: "center", color: "rgba(15,17,23,0.35)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{emptyMsg}</div>;
  }

  return (
    <>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ padding: "8px 20px", background: "rgba(200,71,42,0.06)", borderBottom: "1px solid rgba(200,71,42,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}</span>
          <button onClick={handleBulkZip} disabled={downloadingZip} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "5px 12px", border: "1px solid var(--border-strong)", borderRadius: 4, background: "var(--card)", cursor: "pointer", color: "var(--ink)", fontFamily: "'DM Sans', sans-serif" }}>
            <ZipIcon /> {downloadingZip ? "Preparando…" : "Descargar ZIP"}
          </button>
          {isAdmin && (
            <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "5px 12px", border: "1px solid rgba(200,71,42,0.3)", borderRadius: 4, background: "none", cursor: bulkDeleting ? "not-allowed" : "pointer", color: "var(--accent)", fontFamily: "'DM Sans', sans-serif", opacity: bulkDeleting ? 0.7 : 1 }}>
              <TrashIcon /> {bulkDeleting ? "Eliminando…" : "Eliminar"}
            </button>
          )}
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: "auto", fontSize: 11, color: "rgba(15,17,23,0.4)", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Limpiar selección</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 300 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "rgba(15,17,23,0.3)", pointerEvents: "none" }}><SearchIcon /></span>
          <input type="text" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: 30, paddingRight: search ? 26 : 10, paddingTop: 6, paddingBottom: 6, border: "1.5px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--ink)", outline: "none", fontFamily: "'DM Sans', sans-serif", background: "var(--card)", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(15,17,23,0.35)", padding: 0, display: "flex" }}><XSmallIcon /></button>}
        </div>

        {/* Tipo pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {tiposDisponibles.map(tipo => {
            const active = tiposFiltro.has(tipo);
            return (
              <button key={tipo} onClick={() => setTiposFiltro(prev => { const next = new Set(prev); if (active) next.delete(tipo); else next.add(tipo); return next; })}
                style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "3px 9px", borderRadius: 100, border: "1.5px solid", textTransform: "uppercase", cursor: "pointer", borderColor: active ? "var(--accent)" : "var(--border)", background: active ? "rgba(200,71,42,0.08)" : "white", color: active ? "var(--accent)" : "rgba(15,17,23,0.45)", transition: "all 0.1s" }}>
                {tipo}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)", whiteSpace: "nowrap" }}>
            {isFiltering ? `${allDisplayIds.length} resultado${allDisplayIds.length !== 1 ? "s" : ""}` : `${archivos.length} archivo${archivos.length !== 1 ? "s" : ""} · ${formatBytes(totalBytes)}`}
          </span>
          {hasFolders && !isFiltering && (
            <button onClick={() => setManualExpanded(allExpanded ? new Set() : new Set(collectFolderPaths(tree)))}
              style={{ fontSize: 11, color: "rgba(15,17,23,0.45)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
              {allExpanded ? "Contraer" : "Expandir"}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setNuevaCarpetaParent("")}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 4, border: "1.5px solid var(--border-strong)", fontSize: 12, fontWeight: 500, color: "var(--ink)", background: "var(--card)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              <NewFolderIcon /> Nueva carpeta
            </button>
          )}
          {contratoId && (
            <button onClick={handleZipAll} disabled={downloadingZip}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 4, border: "1.5px solid var(--border-strong)", fontSize: 12, fontWeight: 500, color: "var(--ink)", background: "var(--card)", cursor: downloadingZip ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: downloadingZip ? 0.6 : 1, whiteSpace: "nowrap" }}>
              <ZipIcon /> ZIP
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            <th style={{ padding: "9px 0 9px 16px", width: 32, borderBottom: "1px solid var(--border)" }}>
              <input type="checkbox" checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={handleSelectAll}
                style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
            </th>
            <SortableTh col="nombre" sort={sort} onSort={toggleSort}>Nombre</SortableTh>
            <SortableTh col="nombre" sort={sort} onSort={toggleSort} style={{ width: 70 }}>Tipo</SortableTh>
            <SortableTh col="size_bytes" sort={sort} onSort={toggleSort} style={{ width: 90 }}>Tamaño</SortableTh>
            <SortableTh col="created_at" sort={sort} onSort={toggleSort} style={{ width: 110 }}>Fecha</SortableTh>
            <th style={{ padding: "9px 14px", width: 110, borderBottom: "1px solid var(--border)" }} />
          </tr>
        </thead>
        <tbody>
          {renderRows(displayTree, 0, ctx)}
          {isFiltering && allDisplayIds.length === 0 && (
            <tr><td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "rgba(15,17,23,0.35)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Sin resultados{search ? ` para "${search}"` : ""}</td></tr>
          )}
        </tbody>
      </table>

      {preview && <PreviewModal archivo={preview} isAdmin={isAdmin} onClose={() => setPreview(null)} onDeleted={() => { setPreview(null); router.refresh(); }} />}
      {moveTarget && <MoveModal archivo={moveTarget} folderPaths={allFolders} onClose={() => setMoveTarget(null)} onMoved={() => { setMoveTarget(null); router.refresh(); }} />}
      {nuevaCarpetaParent !== null && (
        <NuevaCarpetaModal
          parentPath={nuevaCarpetaParent}
          entidadId={entidadId}
          contratoId={contratoId}
          destino={destino}
          onClose={() => setNuevaCarpetaParent(null)}
          onCreated={() => { setNuevaCarpetaParent(null); router.refresh(); }}
        />
      )}
    </>
  );
}

// ── Nueva carpeta modal ───────────────────────────────────────────────────────

function NuevaCarpetaModal({ parentPath, entidadId, contratoId, destino, onClose, onCreated }: {
  parentPath: string; entidadId: string; contratoId?: string; destino?: "cliente" | "empleado";
  onClose: () => void; onCreated: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = parentPath ? `${parentPath}/${nombre || "…"}` : (nombre || "…");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nombre.trim().replace(/[/\\]/g, "-");
    if (!trimmed) return;
    setSaving(true); setError(null);
    const carpetaPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
    const result = await crearCarpetaAction({ carpetaPath, entidadId, contratoId, destino });
    if (result.error) { setError(result.error); setSaving(false); return; }
    onCreated();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card)", borderRadius: 10, width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(15,17,23,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
          <NewFolderIcon />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Nueva carpeta</div>
            {parentPath && <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)", marginTop: 1 }}>dentro de {parentPath}</div>}
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(15,17,23,0.4)", marginBottom: 8 }}>
            Nombre de la carpeta
          </label>
          <input
            ref={inputRef}
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="ej. Facturas 2025"
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--ink)", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          {nombre && (
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.35)" }}>
              Ruta: <span style={{ color: "rgba(15,17,23,0.6)" }}>{preview}</span>
            </div>
          )}
          {error && <div style={{ marginTop: 8, fontSize: 12, color: "var(--accent)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 16px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 13, color: "rgba(15,17,23,0.6)" }}>Cancelar</button>
            <button type="submit" disabled={!nombre.trim() || saving} style={{ padding: "7px 16px", background: "var(--ink)", color: "white", border: "none", borderRadius: 4, cursor: (!nombre.trim() || saving) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: (!nombre.trim() || saving) ? 0.5 : 1 }}>
              {saving ? "Creando…" : "Crear carpeta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Image thumbnail ───────────────────────────────────────────────────────────

function ImageThumb({ archivo }: { archivo: ArchivoContratoItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getWasabiViewUrlAction(archivo.ruta_storage).then(({ url: u }) => {
      if (u) setUrl(u);
      else setFailed(true);
    }).catch(() => setFailed(true));
  }, [archivo.ruta_storage]);

  if (failed || !url) return <FileTypeIcon tipo={archivo.tipo} />;

  return (
    <div style={{ width: 28, height: 28, borderRadius: 3, flexShrink: 0, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <img
        src={url}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── Helpers & icons ───────────────────────────────────────────────────────────

function SortableTh({ col, sort, onSort, children, style }: { col: SortCol; sort: SortState | null; onSort: (c: SortCol) => void; children: React.ReactNode; style?: React.CSSProperties }) {
  const active = sort?.col === col;
  return (
    <th onClick={() => onSort(col)} style={{ padding: "9px 20px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "var(--accent)" : "rgba(15,17,23,0.4)", borderBottom: "1px solid var(--border)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", ...style }}>
      {children}
      {active && <span style={{ marginLeft: 4 }}>{sort!.dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function ChevronIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function FolderSvg({ open }: { open: boolean }) {
  return open
    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="#F5A623" stroke="#C8861A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="2" y1="10" x2="22" y2="10" strokeWidth="1.5" /></svg>
    : <svg width="17" height="17" viewBox="0 0 24 24" fill="#F5A623" stroke="#C8861A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}
function FileTypeIcon({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = { pdf: "#E44", xlsx: "#2D6A4F", xls: "#2D6A4F", docx: "#2B5CE6", doc: "#2B5CE6", zip: "#C87941", csv: "#2D6A4F", png: "#9B59B6", jpg: "#9B59B6", jpeg: "#9B59B6" };
  const color = colors[tipo] ?? "#888";
  return <div style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", color, textTransform: "uppercase" }}>{tipo.slice(0, 3)}</div>;
}
function EyeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }
function PencilIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function MoveIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>; }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function DownloadSmIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function XIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
function XSmallIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function ZipIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function UploadHereIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>; }
function NewFolderIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>; }
function SpinnerLg() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(15,17,23,0.2)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
}
