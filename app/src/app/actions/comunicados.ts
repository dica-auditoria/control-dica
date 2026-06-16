"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function logAudit(userId: string, accion: "COMUNICADO_CREAR" | "COMUNICADO_ARCHIVAR", recurso_id: string, detalle: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await (admin.from("audit_log") as any).insert({ usuario_id: userId, accion, recurso_id, ip, detalle_json: detalle });
  } catch { /* non-critical */ }
}

export interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  tipo: "info" | "urgente" | "recordatorio";
  activo: boolean;
  imagen_url: string | null;
  created_at: string;
  imagen_signed?: string | null;
}

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, user: null };
  const { data: p } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: { rol: string } | null; error: unknown };
  return { supabase, ok: ["admin", "superadmin", "rrhh"].includes(p?.rol ?? "") as boolean, user };
}

async function signImagen(path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from("empleado-docs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function fetchComunicadosAction() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from("comunicados")
    .select("*")
    .order("created_at", { ascending: false }) as { data: Comunicado[] | null; error: unknown };
  if (error) return { data: null, error: "Error al cargar comunicados" };

  // Generar URLs firmadas para imágenes usando admin client (bypasa RLS del storage)
  const withSigned = await Promise.all(
    (data ?? []).map(async c => ({
      ...c,
      imagen_signed: await signImagen(c.imagen_url),
    }))
  );

  return { data: withSigned, error: null };
}

export async function crearComunicadoAction(input: {
  titulo: string;
  contenido: string;
  tipo: Comunicado["tipo"];
  imagenFormData?: FormData;
}) {
  const { supabase, ok, user } = await verificarAdmin();
  if (!ok) return { error: "Sin permisos", id: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nuevo, error } = await (supabase.from("comunicados") as any)
    .insert({
      titulo:        input.titulo.trim(),
      contenido:     input.contenido.trim(),
      tipo:          input.tipo,
      activo:        true,
      publicado_por: user!.id,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (error || !nuevo) return { error: "Error al crear comunicado", id: null };

  // Subir imagen si se proporcionó
  if (input.imagenFormData) {
    const file = input.imagenFormData.get("imagen") as File | null;
    if (file && file.size > 0) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const ruta = `comunicados/${nuevo.id}/imagen.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("empleado-docs")
        .upload(ruta, file, { upsert: true, contentType: file.type });

      if (!uploadErr) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("comunicados") as any)
          .update({ imagen_url: ruta })
          .eq("id", nuevo.id);
      }
    }
  }

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/dashboard");
  await logAudit(user!.id, "COMUNICADO_CREAR", nuevo.id, { titulo: input.titulo.trim(), tipo: input.tipo });
  return { success: true, id: nuevo.id, error: null };
}

export async function subirImagenComunicadoAction(id: string, formData: FormData) {
  const { supabase, ok } = await verificarAdmin();
  if (!ok) return { error: "Sin permisos", url: null };

  const file = formData.get("imagen") as File | null;
  if (!file || file.size === 0) return { error: "Sin archivo", url: null };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const ruta = `comunicados/${id}/imagen.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("empleado-docs")
    .upload(ruta, file, { upsert: true, contentType: file.type });

  if (uploadErr) return { error: "Error al subir imagen", url: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("comunicados") as any).update({ imagen_url: ruta }).eq("id", id);

  const { data: signed } = await supabase.storage.from("empleado-docs").createSignedUrl(ruta, 3600);
  revalidatePath("/dashboard/comunicados");
  revalidatePath("/dashboard");
  return { url: signed?.signedUrl ?? null, error: null };
}

export async function desactivarComunicadoAction(id: string) {
  const { supabase, ok, user } = await verificarAdmin();
  if (!ok) return { error: "Sin permisos" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("comunicados") as any)
    .update({ activo: false })
    .eq("id", id);
  if (error) return { error: "Error al archivar" };

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/dashboard");
  if (user) await logAudit(user.id, "COMUNICADO_ARCHIVAR", id, {});
  return { success: true };
}
