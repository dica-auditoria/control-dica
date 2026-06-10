import { getWasabiUploadUrlAction, deleteWasabiFileAction } from "@/app/actions/storage";

// Sube un archivo a Wasabi via URL pre-firmada (el archivo va directo del browser a Wasabi)
export async function uploadFileToStorage(
  file: File,
  entidadId: string,
  contratoId?: string | null,
  carpetaPrefix?: string | null,
  onProgress?: (pct: number) => void
): Promise<{ ruta: string | null; error: string | null }> {
  // 1. Pedir URL pre-firmada al servidor
  const { url, key, error: urlErr } = await getWasabiUploadUrlAction({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    entidadId,
    contratoId,
    relativePath: file.webkitRelativePath || null,
    carpetaPrefix: carpetaPrefix || null,
  });

  if (urlErr || !url || !key) {
    return { ruta: null, error: urlErr ?? "Error al preparar la subida" };
  }

  // 2. Subir directo a Wasabi con XHR (soporta onprogress para archivos grandes)
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

// Elimina un archivo de Wasabi
export async function deleteFileFromStorage(key: string): Promise<void> {
  await deleteWasabiFileAction(key);
}

// URL pública de descarga (Wasabi — bucket privado requiere pre-signed, público directo)
export function getFileUrl(key: string): string {
  const endpoint = process.env.NEXT_PUBLIC_WASABI_ENDPOINT ?? "https://s3.us-central-1.wasabisys.com";
  const bucket = process.env.NEXT_PUBLIC_WASABI_BUCKET ?? "control-dica-docs";
  return `${endpoint}/${bucket}/${key}`;
}
