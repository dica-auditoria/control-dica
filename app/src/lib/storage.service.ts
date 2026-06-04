import { createClient } from "@/lib/supabase/client";

export const BUCKET = "documentos";

export async function uploadFileToStorage(
  file: File,
  entidadId: string
): Promise<{ ruta: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const ruta = `${entidadId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) return { ruta: null, error: error.message };
  return { ruta, error: null };
}

export async function deleteFileFromStorage(ruta: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}

export async function getSignedUrl(ruta: string, expiresIn = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ruta, expiresIn);
  return data?.signedUrl ?? null;
}
