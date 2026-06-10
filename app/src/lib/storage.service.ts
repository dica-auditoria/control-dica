import {
  getWasabiUploadUrlAction,
  deleteWasabiFileAction,
  initiateMultipartUploadAction,
  getPartUploadUrlAction,
  completeMultipartUploadAction,
  abortMultipartUploadAction,
} from "@/app/actions/storage";

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB — debajo: PUT simple
const PART_SIZE = 64 * 1024 * 1024;             // 64 MB por parte
const PARALLEL_PARTS = 3;                        // partes simultáneas

// Sube un archivo a Wasabi. Para archivos < 100 MB usa PUT pre-firmado.
// Para archivos ≥ 100 MB usa multipart upload (soporta decenas de GB).
export async function uploadFileToStorage(
  file: File,
  entidadId: string,
  contratoId?: string | null,
  carpetaPrefix?: string | null,
  onProgress?: (pct: number) => void
): Promise<{ ruta: string | null; error: string | null }> {
  if (file.size < MULTIPART_THRESHOLD) {
    return uploadSingle(file, entidadId, contratoId, carpetaPrefix, onProgress);
  }
  return uploadMultipart(file, entidadId, contratoId, carpetaPrefix, onProgress);
}

// ── Subida simple via XHR (soporta progress) ─────────────────────────────────

async function uploadSingle(
  file: File,
  entidadId: string,
  contratoId?: string | null,
  carpetaPrefix?: string | null,
  onProgress?: (pct: number) => void
): Promise<{ ruta: string | null; error: string | null }> {
  const { url, key, error: urlErr } = await getWasabiUploadUrlAction({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    entidadId,
    contratoId,
    relativePath: file.webkitRelativePath || null,
    carpetaPrefix: carpetaPrefix || null,
  });

  if (urlErr || !url || !key) return { ruta: null, error: urlErr ?? "Error al preparar la subida" };

  const error = await new Promise<string | null>(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? null : `Error al subir (${xhr.status})`);
    xhr.onerror = () => resolve("Error de red al subir el archivo");
    xhr.send(file);
  });

  if (error) return { ruta: null, error };
  return { ruta: key, error: null };
}

// ── Subida multipart (paralela, 64 MB por parte) ──────────────────────────────

async function uploadMultipart(
  file: File,
  entidadId: string,
  contratoId?: string | null,
  carpetaPrefix?: string | null,
  onProgress?: (pct: number) => void
): Promise<{ ruta: string | null; error: string | null }> {
  // 1. Iniciar multipart
  const { key, uploadId, error: initErr } = await initiateMultipartUploadAction({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    entidadId,
    contratoId,
    relativePath: file.webkitRelativePath || null,
    carpetaPrefix: carpetaPrefix || null,
  });
  if (initErr || !key || !uploadId) return { ruta: null, error: initErr ?? "Error al iniciar subida" };

  // 2. Dividir en partes
  const totalParts = Math.ceil(file.size / PART_SIZE);
  const bytesUploaded = new Array(totalParts).fill(0);

  const reportProgress = () => {
    if (!onProgress) return;
    const done = bytesUploaded.reduce((a, b) => a + b, 0);
    onProgress(Math.min(99, Math.round((done / file.size) * 100)));
  };

  // 3. Subir partes en grupos paralelos
  const parts: Array<{ PartNumber: number; ETag: string }> = [];

  const uploadPart = async (partNumber: number): Promise<string | null> => {
    const start = (partNumber - 1) * PART_SIZE;
    const end = Math.min(start + PART_SIZE, file.size);
    const blob = file.slice(start, end);

    const { url, error: urlErr } = await getPartUploadUrlAction(key, uploadId, partNumber);
    if (urlErr || !url) return urlErr ?? "Error URL de parte";

    const etag = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          bytesUploaded[partNumber - 1] = e.loaded;
          reportProgress();
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          bytesUploaded[partNumber - 1] = end - start;
          reportProgress();
          resolve(xhr.getResponseHeader("ETag"));
        } else {
          resolve(null);
        }
      };
      xhr.onerror = () => resolve(null);
      xhr.send(blob);
    });

    if (!etag) return `Error subiendo parte ${partNumber}`;
    parts.push({ PartNumber: partNumber, ETag: etag });
    return null;
  };

  // Procesar en batches de PARALLEL_PARTS
  for (let i = 0; i < totalParts; i += PARALLEL_PARTS) {
    const batch = Array.from({ length: Math.min(PARALLEL_PARTS, totalParts - i) }, (_, j) => i + j + 1);
    const errors = await Promise.all(batch.map(uploadPart));
    const firstError = errors.find(e => e !== null);
    if (firstError) {
      await abortMultipartUploadAction(key, uploadId);
      return { ruta: null, error: firstError };
    }
  }

  // 4. Completar — ordenar partes por número
  parts.sort((a, b) => a.PartNumber - b.PartNumber);
  const { error: completeErr } = await completeMultipartUploadAction(key, uploadId, parts);
  if (completeErr) {
    await abortMultipartUploadAction(key, uploadId);
    return { ruta: null, error: completeErr };
  }

  onProgress?.(100);
  return { ruta: key, error: null };
}

// Elimina un archivo de Wasabi
export async function deleteFileFromStorage(key: string): Promise<void> {
  await deleteWasabiFileAction(key);
}

// URL pública de descarga
export function getFileUrl(key: string): string {
  const endpoint = process.env.NEXT_PUBLIC_WASABI_ENDPOINT ?? "https://s3.us-central-1.wasabisys.com";
  const bucket = process.env.NEXT_PUBLIC_WASABI_BUCKET ?? "control-dica-docs";
  return `${endpoint}/${bucket}/${key}`;
}
