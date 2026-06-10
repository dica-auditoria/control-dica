"use server";

import {
  PutObjectCommand, DeleteObjectCommand, GetObjectCommand,
  CreateMultipartUploadCommand, UploadPartCommand,
  CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
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

// ── Key generation helper ─────────────────────────────────────────────────────

function buildKey(opts: {
  filename: string;
  entidadId: string;
  contratoId?: string | null;
  relativePath?: string | null;
  carpetaPrefix?: string | null;
}): string {
  const safeFilename = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeSubdir = opts.relativePath
    ? opts.relativePath.split("/").slice(0, -1).map(s => s.replace(/[^a-zA-Z0-9._-]/g, "_")).filter(Boolean).join("/")
    : null;
  const safePrefix = opts.carpetaPrefix
    ? opts.carpetaPrefix.split("/").map(s => s.replace(/[^a-zA-Z0-9._-]/g, "_")).filter(Boolean).join("/")
    : null;
  const base = opts.contratoId ? `documentos/${opts.entidadId}/${opts.contratoId}` : `documentos/${opts.entidadId}`;
  const dirParts = [safePrefix, safeSubdir].filter(Boolean);
  const folder = dirParts.length ? `${base}/${dirParts.join("/")}` : base;
  return `${folder}/${uuidv4()}-${safeFilename}`;
}

// ---------- SUBIDA SIMPLE (< 100 MB) — URL pre-firmada ----------

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

  const key = buildKey(opts);
  const command = new PutObjectCommand({ Bucket: WASABI_BUCKET, Key: key, ContentType: opts.contentType });

  try {
    // 4h — cubre ~2 GB a 1 Mbps
    const url = await getSignedUrl(wasabiClient, command, { expiresIn: 14400 });
    return { url, key, error: null };
  } catch (err) {
    console.error("Wasabi presign error:", err);
    return { error: "Error al generar URL de subida", url: null, key: null };
  }
}

// ---------- MULTIPART UPLOAD (≥ 100 MB) ----------

export async function initiateMultipartUploadAction(opts: {
  filename: string;
  contentType: string;
  entidadId: string;
  contratoId?: string | null;
  relativePath?: string | null;
  carpetaPrefix?: string | null;
}) {
  const { error: authErr } = await verificarAuth();
  if (authErr) return { error: authErr, key: null, uploadId: null };

  const key = buildKey(opts);
  try {
    const resp = await wasabiClient.send(new CreateMultipartUploadCommand({
      Bucket: WASABI_BUCKET, Key: key, ContentType: opts.contentType,
    }));
    return { key, uploadId: resp.UploadId ?? null, error: null };
  } catch (err) {
    console.error("Multipart initiate error:", err);
    return { error: "Error al iniciar subida multipart", key: null, uploadId: null };
  }
}

export async function getPartUploadUrlAction(key: string, uploadId: string, partNumber: number) {
  const { error: authErr } = await verificarAuth();
  if (authErr) return { error: authErr, url: null };

  try {
    const url = await getSignedUrl(
      wasabiClient,
      new UploadPartCommand({ Bucket: WASABI_BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
      { expiresIn: 3600 }
    );
    return { url, error: null };
  } catch {
    return { error: "Error al generar URL de parte", url: null };
  }
}

export async function completeMultipartUploadAction(
  key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
) {
  const { error: authErr } = await verificarAuth();
  if (authErr) return { error: authErr };

  try {
    await wasabiClient.send(new CompleteMultipartUploadCommand({
      Bucket: WASABI_BUCKET, Key: key, UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }));
    return { error: null };
  } catch (err) {
    console.error("Multipart complete error:", err);
    return { error: "Error al completar subida" };
  }
}

export async function abortMultipartUploadAction(key: string, uploadId: string) {
  try {
    await wasabiClient.send(new AbortMultipartUploadCommand({ Bucket: WASABI_BUCKET, Key: key, UploadId: uploadId }));
  } catch { /* best effort */ }
}

// ---------- GENERAR URL FIRMADA PARA VER/DESCARGAR ----------

export async function getDownloadUrlAction(key: string, filename: string) {
  const { userId, error: authErr } = await verificarAuth();
  if (authErr || !userId) return { error: authErr, url: null };

  const safeFilename = filename.replace(/[^a-zA-Z0-9._\- ]/g, "_");
  const command = new GetObjectCommand({
    Bucket: WASABI_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
  });
  try {
    const url = await getSignedUrl(wasabiClient, command, { expiresIn: 3600 });
    return { url, error: null };
  } catch (err) {
    console.error("Wasabi download url error:", err);
    return { error: "Error al generar URL de descarga", url: null };
  }
}

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
