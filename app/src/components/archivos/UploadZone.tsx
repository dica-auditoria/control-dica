"use client";

import { useState, useRef, useCallback, useId, useEffect } from "react";
import { calcularSHA256, formatHash } from "@/lib/sha256";
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/storage.service";
import { insertArchivoAction } from "@/app/actions/archivos";

type FileStatus = "pendiente" | "hashing" | "subiendo" | "guardando" | "listo" | "error";

interface FileEntry {
  uid: string;
  file: File;
  status: FileStatus;
  error?: string;
  hash?: string;
  progreso?: number; // 0-100 durante la subida
}

const TIPOS_PERMITIDOS = ["pdf", "xlsx", "xls", "zip", "docx", "doc", "csv", "png", "jpg", "jpeg", "xml", "htm", "html"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB

interface UploadZoneProps {
  entidadId: string;
  contratoId?: string | null;
  destino?: "cliente" | "empleado";
  carpetaPrefix?: string | null;
  requerimientoItemId?: string | null;
  onSuccess?: (archivoId: string) => void;
  onDone?: () => void;
}

export default function UploadZone({ entidadId, contratoId, destino = "cliente", carpetaPrefix, requerimientoItemId, onSuccess, onDone }: UploadZoneProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  // webkitdirectory no está en los tipos de React — se setea en el DOM directamente
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute("webkitdirectory", "");
      folderRef.current.setAttribute("directory", "");
    }
  }, []);

  const validarArchivo = (f: File): string | null => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!TIPOS_PERMITIDOS.includes(ext))
      return `Tipo no permitido (.${ext})`;
    if (f.size === 0)
      return "Archivo vacío — puede estar en la nube (OneDrive) sin descargarse";
    if (f.size > MAX_SIZE_BYTES)
      return `Supera 50 GB (${(f.size / 1024 / 1024 / 1024).toFixed(2)} GB)`;
    return null;
  };

  const agregarArchivos = useCallback((fileList: FileList | File[]) => {
    const nuevos: FileEntry[] = Array.from(fileList).map((file, i) => {
      const err = validarArchivo(file);
      return {
        uid: `${baseId}-${Date.now()}-${i}`,
        file,
        status: err ? "error" : "pendiente",
        error: err ?? undefined,
      };
    });
    setEntries(prev => {
      const fileKey = (f: File) => (f.webkitRelativePath || f.name) + f.size;
      const existentes = new Set(prev.map(e => fileKey(e.file)));
      return [...prev, ...nuevos.filter(n => !existentes.has(fileKey(n.file)))];
    });
    setDone(false);
  }, [baseId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    const files: File[] = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    } else {
      Array.from(e.dataTransfer.files).forEach(f => files.push(f));
    }
    if (files.length) agregarArchivos(files);
  }, [agregarArchivos]);

  const setStatus = (uid: string, patch: Partial<FileEntry>) =>
    setEntries(prev => prev.map(e => e.uid === uid ? { ...e, ...patch } : e));

  const procesarEntradas = async (cola: FileEntry[]) => {
    for (const entry of cola) {
      setStatus(entry.uid, { status: "hashing" });
      let sha: string;
      try {
        sha = await calcularSHA256(entry.file);
      } catch {
        setStatus(entry.uid, { status: "error", error: entry.file.size === 0 ? "Archivo vacío o no disponible localmente" : "No se pudo leer el archivo" });
        continue;
      }

      setStatus(entry.uid, { status: "subiendo", hash: sha, progreso: 0 });
      const { ruta, error: storageErr } = await uploadFileToStorage(
        entry.file, entidadId, contratoId, carpetaPrefix,
        pct => setStatus(entry.uid, { progreso: pct })
      );
      if (storageErr || !ruta) {
        setStatus(entry.uid, { status: "error", error: storageErr ?? "Error al subir" });
        continue;
      }

      setStatus(entry.uid, { status: "guardando" });
      const tipo = entry.file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const relativePath = entry.file.webkitRelativePath || entry.file.name;
      const nombre = carpetaPrefix ? `${carpetaPrefix}/${relativePath}` : relativePath;
      const result = await insertArchivoAction({
        nombre,
        ruta_storage: ruta,
        hash_sha256: sha,
        size_bytes: entry.file.size,
        tipo,
        entidad_id: entidadId,
        contrato_id: contratoId ?? null,
        destino,
        requerimiento_item_id: requerimientoItemId ?? null,
      });

      if (result.error) {
        await deleteFileFromStorage(ruta);
        setStatus(entry.uid, { status: "error", error: result.error });
      } else {
        setStatus(entry.uid, { status: "listo", hash: sha });
        if (result.archivoId) onSuccess?.(result.archivoId);
      }
    }
  };

  const handleUpload = async () => {
    const cola = entries.filter(e => e.status === "pendiente");
    if (!cola.length) return;
    setUploading(true);
    await procesarEntradas(cola);
    setUploading(false);
    setDone(true);
    onDone?.();
  };

  const handleReintentar = async () => {
    const fallidos = entries.filter(e => e.status === "error");
    if (!fallidos.length || uploading) return;
    setEntries(prev => prev.map(e =>
      e.status === "error" ? { ...e, status: "pendiente" as FileStatus, error: undefined, hash: undefined, progreso: undefined } : e
    ));
    setDone(false);
    setUploading(true);
    await procesarEntradas(fallidos);
    setUploading(false);
    setDone(true);
    onDone?.();
  };

  const remover = (uid: string) =>
    setEntries(prev => prev.filter(e => e.uid !== uid));

  const reset = () => { setEntries([]); setDone(false); };

  const pendientes   = entries.filter(e => e.status === "pendiente").length;
  const listos       = entries.filter(e => e.status === "listo").length;
  const errores      = entries.filter(e => e.status === "error" && !e.error?.startsWith("Tipo") && !e.error?.startsWith("Supera")).length;
  const enProceso    = entries.some(e => ["hashing","subiendo","guardando"].includes(e.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Drop zone — siempre visible si no hay archivos o se quiere agregar más */}
      {(!entries.length || (!uploading && !done)) && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: 8,
            padding: entries.length ? "16px 20px" : "32px 24px",
            textAlign: "center",
            background: dragOver ? "var(--red-light)" : "var(--surface)",
            transition: "all 0.15s",
          }}
        >
          {!entries.length && (
            <>
              <div style={{ width: 40, height: 40, background: "var(--surface-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "var(--muted)" }}>
                <UploadIcon />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                Arrastra archivos o una carpeta aquí
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                PDF, Excel, ZIP, Word, CSV, PNG, XML, HTM — máx. 50 GB por archivo
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={btnSecondary}
            >
              <FilesIcon /> Seleccionar archivos
            </button>
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              style={btnSecondary}
            >
              <FolderIcon /> Seleccionar carpeta
            </button>
          </div>

          {/* Inputs ocultos */}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={TIPOS_PERMITIDOS.map(t => `.${t}`).join(",")}
            style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) agregarArchivos(e.target.files); e.target.value = ""; }}
          />
          {/* Folder input — webkitdirectory no está en los tipos de React, se setea via ref */}
          <input
            ref={folderRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) agregarArchivos(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {/* Lista de archivos */}
      {entries.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {/* Header lista */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
              {entries.length} archivo{entries.length !== 1 ? "s" : ""}
              {pendientes > 0 && !uploading && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>}
              {listos > 0 && <span style={{ color: "var(--green)", fontWeight: 400 }}> · {listos} listo{listos !== 1 ? "s" : ""}</span>}
              {errores > 0 && <span style={{ color: "var(--accent)", fontWeight: 400 }}> · {errores} error{errores !== 1 ? "es" : ""}</span>}
            </div>
            {!uploading && (
              <button type="button" onClick={reset} style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>
                Limpiar todo
              </button>
            )}
          </div>

          {/* Filas */}
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {entries.map(entry => (
              <div key={entry.uid} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                background: entry.status === "listo" ? "rgba(45,106,79,0.03)" : entry.status === "error" ? "rgba(200,71,42,0.03)" : "white",
              }}>
                {/* Icono estado */}
                <div style={{ flexShrink: 0, width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <StatusIcon status={entry.status} />
                </div>

                {/* Nombre + info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.file.name}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 1 }}>
                    {formatBytes(entry.file.size)}
                    {entry.status === "error" && entry.error && (
                      <span style={{ color: "var(--accent)", marginLeft: 8 }}>{entry.error}</span>
                    )}
                    {entry.status === "listo" && entry.hash && (
                      <span style={{ color: "var(--muted)", marginLeft: 8 }}>SHA-256: {formatHash(entry.hash)}</span>
                    )}
                    {entry.status === "hashing"   && <span style={{ color: "var(--muted-2)", marginLeft: 8 }}>Calculando hash…</span>}
                    {entry.status === "subiendo"  && (
                      <span style={{ color: "var(--muted-2)", marginLeft: 8 }}>
                        Subiendo{entry.progreso != null && entry.progreso > 0 ? ` ${entry.progreso}%` : "…"}
                      </span>
                    )}
                    {entry.status === "guardando" && <span style={{ color: "var(--muted-2)", marginLeft: 8 }}>Guardando…</span>}
                  </div>
                  {/* Barra de progreso durante la subida */}
                  {entry.status === "subiendo" && entry.progreso != null && (
                    <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: "var(--accent)", width: `${entry.progreso}%`, transition: "width 0.2s" }} />
                    </div>
                  )}
                </div>

                {/* Ext badge */}
                <span style={{
                  fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700,
                  padding: "2px 6px", borderRadius: 3,
                  background: "var(--surface-2)", color: "var(--muted-2)",
                  textTransform: "uppercase", flexShrink: 0,
                }}>
                  {entry.file.name.split(".").pop()?.slice(0, 4)}
                </span>

                {/* Botón eliminar (solo si no está en proceso) */}
                {!["hashing","subiendo","guardando"].includes(entry.status) && !uploading && (
                  <button type="button" onClick={() => remover(entry.uid)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, flexShrink: 0 }}>
                    <XSmallIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen final */}
      {done && !enProceso && (
        <div style={{
          padding: "12px 16px", borderRadius: 6,
          background: errores > 0 ? "var(--red-light)" : "var(--green-light)",
          border: `1px solid ${errores > 0 ? "rgba(200,71,42,0.2)" : "rgba(45,106,79,0.2)"}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {errores > 0 ? <AlertIcon /> : <CheckIcon />}
          <span style={{ fontSize: 13, color: errores > 0 ? "var(--accent)" : "var(--green)", fontWeight: 500 }}>
            {listos} archivo{listos !== 1 ? "s" : ""} subido{listos !== 1 ? "s" : ""} correctamente
            {errores > 0 && ` · ${errores} con error`}
          </span>
        </div>
      )}

      {/* Botones de acción */}
      {entries.length > 0 && pendientes > 0 && !done && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px",
              background: uploading ? "var(--disabled)" : "var(--ink)",
              color: "white", border: "none", borderRadius: 4,
              fontSize: 13, fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {uploading ? <Spinner /> : <UploadIcon />}
            {uploading ? `Subiendo…` : `Subir ${pendientes} archivo${pendientes !== 1 ? "s" : ""}`}
          </button>
          {!uploading && (
            <button type="button" onClick={reset} style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Cancelar
            </button>
          )}
        </div>
      )}

      {done && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={{ ...btnSecondary, alignSelf: "flex-start" }}>
            Subir más archivos
          </button>
          {errores > 0 && (
            <button
              type="button"
              onClick={handleReintentar}
              disabled={uploading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px",
                background: "rgba(200,71,42,0.08)", color: "var(--accent)",
                border: "1px solid rgba(200,71,42,0.25)", borderRadius: 4,
                fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ↺ Reintentar {errores} fallido{errores !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const btnSecondary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "8px 16px", background: "var(--card)",
  border: "1.5px solid var(--border-strong)", borderRadius: 4,
  fontSize: 13, cursor: "pointer", color: "var(--ink)",
  fontFamily: "'DM Sans', sans-serif",
};

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "listo")
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;
  if (status === "error")
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  if (["hashing","subiendo","guardando"].includes(status))
    return <Spinner />;
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(15,17,23,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /></svg>;
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function FilesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function XSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
