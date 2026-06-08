import { getWasabiUploadUrlAction, deleteWasabiFileAction } from "@/app/actions/storage";

// Sube un archivo a Wasabi via URL pre-firmada (el archivo va directo del browser a Wasabi)
export async function uploadFileToStorage(
  file: File,
  entidadId: string,
  contratoId?: string | null,
  carpetaPrefix?: string | null
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

  // 2. Subir directo a Wasabi con PUT (sin pasar por el servidor)
  const response = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!response.ok) {
    return { ruta: null, error: `Error al subir a Wasabi (${response.status})` };
  }

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
