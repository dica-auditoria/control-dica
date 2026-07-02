"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

type Via = "local-pdf-img" | "local-img-pdf" | "cloudconvert";

interface Conversion {
  id: string;
  de: string;
  a: string;
  label: string;
  accept: string;
  inputFormat: string;
  outputFormat: string;
  via: Via;
  ext: string;
}

const CONVERSIONES: Conversion[] = [
  { id: "pdf-word",  de: "PDF",  a: "Word",  label: "PDF → Word",  accept: ".pdf",              inputFormat: "pdf",  outputFormat: "docx", via: "cloudconvert",    ext: "docx" },
  { id: "pdf-excel", de: "PDF",  a: "Excel", label: "PDF → Excel", accept: ".pdf",              inputFormat: "pdf",  outputFormat: "xlsx", via: "cloudconvert",    ext: "xlsx" },
  { id: "pdf-png",   de: "PDF",  a: "PNG",   label: "PDF → PNG",   accept: ".pdf",              inputFormat: "pdf",  outputFormat: "png",  via: "local-pdf-img",   ext: "png"  },
  { id: "pdf-jpeg",  de: "PDF",  a: "JPEG",  label: "PDF → JPEG",  accept: ".pdf",              inputFormat: "pdf",  outputFormat: "jpeg", via: "local-pdf-img",   ext: "jpg"  },
  { id: "word-pdf",  de: "Word", a: "PDF",   label: "Word → PDF",  accept: ".doc,.docx",        inputFormat: "docx", outputFormat: "pdf",  via: "cloudconvert",    ext: "pdf"  },
  { id: "excel-pdf", de: "Excel",a: "PDF",   label: "Excel → PDF", accept: ".xls,.xlsx",        inputFormat: "xlsx", outputFormat: "pdf",  via: "cloudconvert",    ext: "pdf"  },
  { id: "png-pdf",   de: "PNG",  a: "PDF",   label: "PNG → PDF",   accept: ".png",              inputFormat: "png",  outputFormat: "pdf",  via: "local-img-pdf",   ext: "pdf"  },
  { id: "jpeg-pdf",  de: "JPEG", a: "PDF",   label: "JPEG → PDF",  accept: ".jpg,.jpeg",        inputFormat: "jpeg", outputFormat: "pdf",  via: "local-img-pdf",   ext: "pdf"  },
];

type Estado = "idle" | "converting" | "done" | "error";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConversorArchivos() {
  const [seleccion, setSeleccion] = useState<Conversion | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [progreso, setProgreso] = useState("");
  const [resultados, setResultados] = useState<{ nombre: string; url: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);
  const pdfLibRef = useRef<typeof import("pdf-lib") | null>(null);

  // Preload libraries
  useEffect(() => {
    import("pdfjs-dist").then(lib => {
      lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.js`;
      pdfjsRef.current = lib;
    }).catch(() => {});
    import("pdf-lib").then(lib => {
      pdfLibRef.current = lib;
    }).catch(() => {});
  }, []);

  const handleSeleccion = (c: Conversion) => {
    setSeleccion(c);
    setArchivo(null);
    setEstado("idle");
    setResultados([]);
    setProgreso("");
  };

  const handleArchivo = (file: File) => {
    setArchivo(file);
    setEstado("idle");
    setResultados([]);
    setProgreso("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleArchivo(f);
  }, []);

  const convertirPdfAImagen = async (formato: "png" | "jpeg") => {
    const lib = pdfjsRef.current;
    if (!lib) throw new Error("Librería PDF no cargada");
    const buf = await archivo!.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    const total = pdf.numPages;
    const blobs: { nombre: string; url: string }[] = [];

    for (let i = 1; i <= total; i++) {
      setProgreso(`Procesando página ${i} de ${total}…`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const mimeType = formato === "jpeg" ? "image/jpeg" : "image/png";
      const quality = formato === "jpeg" ? 0.92 : undefined;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      const baseName = archivo!.name.replace(/\.pdf$/i, "");
      const nombre = total === 1 ? `${baseName}.${formato === "jpeg" ? "jpg" : "png"}` : `${baseName}_pag${i}.${formato === "jpeg" ? "jpg" : "png"}`;
      blobs.push({ nombre, url: dataUrl });
    }

    // If multiple pages, create ZIP
    if (blobs.length > 1) {
      setProgreso("Comprimiendo imágenes…");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const b of blobs) {
        const base64 = b.url.split(",")[1];
        zip.file(b.nombre, base64, { base64: true });
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const baseName = archivo!.name.replace(/\.pdf$/i, "");
      return [{ nombre: `${baseName}_imágenes.zip`, url }];
    }

    return blobs;
  };

  const convertirImagenAPdf = async () => {
    const lib = pdfLibRef.current;
    if (!lib) throw new Error("Librería PDF no cargada");
    const { PDFDocument } = lib;
    const buf = await archivo!.arrayBuffer();
    const pdfDoc = await PDFDocument.create();

    let img;
    if (archivo!.type === "image/png") {
      img = await pdfDoc.embedPng(buf);
    } else {
      img = await pdfDoc.embedJpg(buf);
    }

    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    const bytes = await pdfDoc.save();
    // pdf-lib returns Uint8Array<ArrayBufferLike>; cast needed for strict TS
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const baseName = archivo!.name.replace(/\.(png|jpe?g)$/i, "");
    return [{ nombre: `${baseName}.pdf`, url }];
  };

  const convertirConCloudConvert = async () => {
    if (!seleccion) return [];
    setProgreso("Subiendo archivo al servidor…");

    const fd = new FormData();
    fd.append("file", archivo!);
    fd.append("inputFormat", seleccion.inputFormat);
    fd.append("outputFormat", seleccion.outputFormat);

    const res = await fetch("/api/conversor", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error ?? "Error al convertir");

    setProgreso("Descargando resultado…");

    // Download the file from the URL returned by CloudConvert
    const dlRes = await fetch(data.url);
    const blob = await dlRes.blob();
    const url = URL.createObjectURL(blob);
    const baseName = archivo!.name.replace(/\.[^.]+$/, "");
    return [{ nombre: `${baseName}.${seleccion.ext}`, url }];
  };

  const handleConvertir = async () => {
    if (!seleccion || !archivo) return;
    setEstado("converting");
    setResultados([]);
    setProgreso("Iniciando conversión…");

    try {
      let res: { nombre: string; url: string }[] = [];

      if (seleccion.via === "local-pdf-img") {
        const fmt = seleccion.outputFormat as "png" | "jpeg";
        res = await convertirPdfAImagen(fmt);
      } else if (seleccion.via === "local-img-pdf") {
        res = await convertirImagenAPdf();
      } else {
        res = await convertirConCloudConvert();
      }

      setResultados(res);
      setEstado("done");
      setProgreso("");
    } catch (err: unknown) {
      setEstado("error");
      setProgreso(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const descargar = (item: { nombre: string; url: string }) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.nombre;
    a.click();
  };

  const isCloud = seleccion?.via === "cloudconvert";
  const apiKeyMissing = false; // Checked server-side

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/dashboard/herramientas" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>
          ← Herramientas
        </Link>
        <span style={{ color: "var(--border)", fontSize: 13 }}>/</span>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)", margin: 0 }}>
          Conversor de Archivos
        </h1>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 720 }}>

        {/* Step 1 — Select conversion */}
        <div style={{ marginBottom: 28 }}>
          <div style={stepLabel}>1. Selecciona el tipo de conversión</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {CONVERSIONES.map(c => {
              const active = seleccion?.id === c.id;
              return (
                <button key={c.id} onClick={() => handleSeleccion(c)} style={{
                  padding: "10px 8px", border: `1.5px solid ${active ? "#1B4F8A" : "var(--border-strong)"}`,
                  borderRadius: 6, background: active ? "rgba(27,79,138,0.08)" : "var(--card)",
                  color: active ? "#1B4F8A" : "var(--ink)", fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "center",
                  transition: "all 0.12s",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>
                    {c.de === "PDF" ? "📄" : c.de === "Word" ? "📝" : c.de === "Excel" ? "📊" : "🖼️"}
                    <span style={{ margin: "0 3px", opacity: 0.4 }}>→</span>
                    {c.a === "PDF" ? "📄" : c.a === "Word" ? "📝" : c.a === "Excel" ? "📊" : "🖼️"}
                  </div>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Upload file */}
        {seleccion && (
          <div style={{ marginBottom: 28 }}>
            <div style={stepLabel}>2. Sube el archivo ({seleccion.de})</div>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "#1B4F8A" : archivo ? "var(--green)" : "var(--border-strong)"}`,
                borderRadius: 8, padding: "28px 20px", textAlign: "center",
                background: dragging ? "rgba(27,79,138,0.04)" : archivo ? "rgba(45,106,79,0.03)" : "var(--surface)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={seleccion.accept}
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleArchivo(f); }}
              />
              {archivo ? (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{archivo.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{formatSize(archivo.size)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Haz clic para cambiar el archivo</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                    Arrastra tu archivo aquí
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    o haz clic para seleccionar · Acepta: <span style={{ fontFamily: "'DM Mono', monospace" }}>{seleccion.accept}</span>
                  </div>
                </div>
              )}
            </div>

            {isCloud && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(27,79,138,0.06)", borderRadius: 4, fontSize: 11, color: "var(--muted-2)", fontFamily: "'DM Sans', sans-serif" }}>
                Esta conversión usa <strong>CloudConvert</strong>. Requiere API key configurada y conexión a internet.
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Convert */}
        {seleccion && archivo && (
          <div style={{ marginBottom: 24 }}>
            <div style={stepLabel}>3. Convertir</div>
            <button
              onClick={handleConvertir}
              disabled={estado === "converting"}
              style={{
                padding: "12px 28px", background: estado === "converting" ? "var(--muted)" : "#1B4F8A",
                color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600,
                cursor: estado === "converting" ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {estado === "converting" ? (
                <>
                  <SpinnerIcon />
                  Convirtiendo…
                </>
              ) : "Convertir →"}
            </button>

            {/* Progress / Error */}
            {progreso && estado === "converting" && (
              <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted-2)", fontFamily: "'DM Mono', monospace" }}>
                {progreso}
              </div>
            )}
            {estado === "error" && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>
                {progreso}
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Download */}
        {estado === "done" && resultados.length > 0 && (
          <div>
            <div style={stepLabel}>4. Descargar resultado</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resultados.map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", background: "rgba(45,106,79,0.06)",
                  border: "1.5px solid rgba(45,106,79,0.2)", borderRadius: 6,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--green)", marginTop: 2 }}>Conversión completada</div>
                  </div>
                  <button onClick={() => descargar(r)} style={{
                    padding: "8px 16px", background: "var(--green)", color: "white",
                    border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>
                    ⬇ Descargar
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => { setEstado("idle"); setArchivo(null); setResultados([]); setProgreso(""); }} style={{
              marginTop: 12, padding: "7px 16px", background: "var(--card)",
              color: "var(--muted-2)", border: "1px solid var(--border-strong)",
              borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Convertir otro archivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const stepLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase",
  letterSpacing: "0.07em", marginBottom: 10,
};

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
