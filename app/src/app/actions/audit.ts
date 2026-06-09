"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

async function getIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function registrarLoginAction() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase
      .from("usuarios").select("nombre").eq("id", user.id).single() as { data: { nombre: string } | null; error: unknown };

    const admin = createAdminClient();
    await (admin.from("audit_log") as any).insert({
      usuario_id: user.id,
      accion: "LOGIN",
      ip: await getIp(),
      detalle_json: { email: user.email, nombre: perfil?.nombre ?? null },
    });
  } catch { /* non-critical */ }
}

export async function registrarLogoutAction() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const admin = createAdminClient();
    await (admin.from("audit_log") as any).insert({
      usuario_id: user.id,
      accion: "LOGOUT",
      ip: await getIp(),
      detalle_json: { email: user.email },
    });
  } catch { /* non-critical */ }
}
