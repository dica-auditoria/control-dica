"use server";

import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { wasabiClient, WASABI_BUCKET, WASABI_ENDPOINT } from "@/lib/wasabi";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

interface PerfilRow { rol: string }

async function verificarAuth() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { userId: null, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil) return { userId: null, error: "Perfil no encontrado" };

  return { userId: user.id, rol: perfil.rol, error: null };
}

// ---------- GENERAR URL PRE-FIRMADA PARA SUBIDA ----------

export async function getWasabiUploadUrlAction(opts: {
  filename: string;
  contentType: string;
  entidadId: string;
  contratoId?: string | null;
  relativePath?: string | null;
  carpetaPrefix?: string | null;
}) {
  const { userId, error: authErr } = await verificarAuth();
  if (authErr || !userId) return { error: authErr, url: null, key: null };

  const safeFilename = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Directorio desde carpeta arrastrada (webkitRelativePath sin el filename)
  const safeSubdir = opts.relativePath
    ? opts.relativePath
        .split("/")
        .slice(0, -1)
        .map(s => s.replace(/[^a-zA-Z0-9._-]/g, "_"))
        .filter(Boolean)
        .join("/")
    : null;

  // Prefijo de carpeta destino (cuando se sube "aquí" desde el explorador)
  const safePrefix = opts.carpetaPrefix
    ? opts.carpetaPrefix.split("/").map(s => s.replace(/[^a-zA-Z0-9._-]/g, "_")).filter(Boolean).join("/")
    : null;

  const base = opts.contratoId
    ? `documentos/${opts.entidadId}/${opts.contratoId}`
    : `documentos/${opts.entidadId}`;

  const dirParts = [safePrefix, safeSubdir].filter(Boolean);
  const folder = dirParts.length ? `${base}/${dirParts.join("/")}` : base;
  const key = `${folder}/${uuidv4()}-${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: WASABI_BUCKET,
    Key: key,
    ContentType: opts.contentType,
  });

  try {
    const url = await getSignedUrl(wasabiClient, command, { expiresIn: 3600 });
    return { url, key, error: null };
  } catch (err) {
    console.error("Wasabi presign error:", err);
    return { error: "Error al generar URL de subida", url: null, key: null };
  }
}

// ---------- GENERAR URL FIRMADA PARA VER/DESCARGAR ----------

export async function getWasabiViewUrlAction(key: string) {
  const { userId, error: authErr } = await verificarAuth();
  if (authErr || !userId) return { error: authErr, url: null };

  const command = new GetObjectCommand({ Bucket: WASABI_BUCKET, Key: key });
  try {
    const url = await getSignedUrl(wasabiClient, command, { expiresIn: 3600 });
    return { url, error: null };
  } catch (err) {
    console.error("Wasabi view url error:", err);
    return { error: "Error al generar URL", url: null };
  }
}

// ---------- ELIMINAR ARCHIVO DE WASABI ----------

export async function deleteWasabiFileAction(key: string) {
  const { userId, error: authErr } = await verificarAuth();
  if (authErr || !userId) return { error: authErr };

  try {
    await wasabiClient.send(new DeleteObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
    }));
    return { success: true };
  } catch (err) {
    console.error("Wasabi delete error:", err);
    return { error: "Error al eliminar archivo" };
  }
}
