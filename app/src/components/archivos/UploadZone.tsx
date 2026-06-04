"use client";

import { useState, useRef, useCallback } from "react";
import { calcularSHA256, formatHash } from "@/lib/sha256";
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/storage.service";
import { insertArchivoAction } from "@/app/actions/archivos";

type UploadStatus = "idle" | "hashing" | "uploading" | "saving" | "done" | "error";

const TIPOS_PERMITIDOS = ["pdf", "xlsx", "xls", "zip", "docx", "doc", "csv", "png", "jpg", "jpeg"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface UploadZoneProps {
  entidadId: string;
  onSuccess?: (archivoId: string) => void;
}

export default function UploadZone({ entidadId, onSuccess }: UploadZoneProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validarArchivo = (f: File): string | null => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!TIPOS_PERMITIDOS.includes(ext)) return `Tipo no permitido (.${ext}). Acepta: ${TIPOS_PERMITIDOS.join(", ")}`;
    if (f.size > MAX_SIZE_BYTES) return `El archivo supera 50 MB (${(f.size / 1024 / 1024).toFixed(1)} MB)`;
    return null;
  };

  const seleccionarArchivo = useCallback((f: File) => {
    const err = validarArchivo(f);
    if (err) { setError(err); return; }
    setFile(f);
    setError("");
    setStatus("idle");
    setHash("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) seleccionarArchivo(f);
  }, [seleccionarArchivo]);

  const handleUpload = async () => {
    if (!file) return;
    setError("");

    // Paso 1 — SHA-256
    setStatus("hashing");
    let sha: string;
    try {
      sha = await calcularSHA256(file);
      setHash(sha);
    } catch {
      setStatus("error");
      setError("Error al calcular el hash del archivo.");
      return;
    }

    // Paso 2 — Subir a storage
    setStatus("uploading");
    const { ruta, error: storageErr } = await uploadFileToStorage(file, entidadId);
    if (storageErr || !ruta) {
      setStatus("error");
      setError(storageErr ?? "Error al subir el archivo al storage.");
      return;
    }

    // Paso 3 — Guardar metadatos + audit log
    setStatus("saving");
    const tipo = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const result = await insertArchivoAction({
      nombre: file.name,
      ruta_storage: ruta,
      hash_sha256: sha,
      size_bytes: file.size,
      tipo,
      entidad_id: entidadId,
    });

    if (result.error) {
      await deleteFileFromStorage(ruta); // rollback storage
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("done");
    if (result.archivoId) onSuccess?.(result.archivoId);
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setError("");
    setHash("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const isBusy = status === "hashing" || status === "uploading" || status === "saving";

  const statusLabel: Record<UploadStatus, string> = {
    idle: "",
    hashing: "Calculando SHA-256…",
    uploading: "Subiendo archivo…",
    saving: "Guardando metadatos…",
    done: "Archivo guardado correctamente",
    error: "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Drop zone */}
      {status !== "done" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isBusy && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: 8,
            padding: "32px 24px",
            textAlign: "center",
            cursor: isBusy ? "default" : "pointer",
            background: dragOver ? "var(--red-light)" : "white",
            transition: "all 0.15s",
          }}
        >
          <div style={{
            width: 40, height: 40,
            background: "var(--surface-2)", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
            color: "rgba(15,17,23,0.4)",
          }}>
            <UploadIcon />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
            {file ? file.name : "Arrastra tu archivo aquí"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(15,17,23,0.4)" }}>
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.name.split(".").pop()?.toUpperCase()}`
              : "PDF, Excel, ZIP, Word — máx. 50 MB"}
          </div>
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            accept={TIPOS_PERMITIDOS.map(t => `.${t}`).join(",")}
            onChange={e => { const f = e.target.files?.[0]; if (f) seleccionarArchivo(f); }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "10px 14px",
          background: "var(--red-light)",
          border: "1px solid rgba(200,71,42,0.2)",
          borderRadius: 4, fontSize: 13, color: "var(--accent)",
          display: "flex", gap: 8,
        }}>
          <AlertIcon />
          {error}
        </div>
      )}

      {/* Status */}
      {isBusy && (
        <div style={{
          padding: "12px 16px",
          background: "var(--surface-2)", borderRadius: 6,
          fontSize: 13, color: "rgba(15,17,23,0.6)",
          display: "flex", alignItems: "center", gap: 10,
          fontFamily: "'DM Mono', monospace",
        }}>
          <Spinner />
          {statusLabel[status]}
        </div>
      )}

      {/* Success */}
      {status === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            padding: "16px",
            background: "var(--green-light)",
            border: "1px solid rgba(45,106,79,0.2)",
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <CheckIcon />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
                Archivo subido correctamente
              </span>
            </div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.5)" }}>
              SHA-256
            </div>
            <div style={{
              fontSize: 11, fontFamily: "'DM Mono', monospace",
              color: "var(--ink)", wordBreak: "break-all",
              background: "white", padding: "6px 10px", borderRadius: 4, marginTop: 4,
            }}>
              {hash}
            </div>
          </div>
          <button
            onClick={reset}
            style={{
              padding: "9px 16px",
              background: "white",
              color: "var(--ink)",
              border: "1.5px solid var(--border-strong)",
              borderRadius: 4, fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              alignSelf: "flex-start",
            }}
          >
            Subir otro archivo
          </button>
        </div>
      )}

      {/* Upload button */}
      {file && status !== "done" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleUpload}
            disabled={isBusy}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px",
              background: isBusy ? "rgba(15,17,23,0.3)" : "var(--ink)",
              color: "white", border: "none", borderRadius: 4,
              fontSize: 13, fontWeight: 600, cursor: isBusy ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {!isBusy && <UploadIcon />}
            {isBusy ? statusLabel[status] : "Calcular hash y subir"}
          </button>
          {!isBusy && (
            <button onClick={reset} style={{
              background: "none", border: "none", fontSize: 13,
              color: "rgba(15,17,23,0.45)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Hash preview mientras calcula */}
      {hash && status !== "done" && (
        <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.45)" }}>
          SHA-256: {formatHash(hash)}
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
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
