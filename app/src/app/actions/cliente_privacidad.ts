"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const VERSION_AVISO_CLIENTE = "2026.06.01";

export async function aceptarPrivacidadClienteAction() {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "No autenticado" };

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("usuarios") as any)
    .update({
      privacidad_aceptada_at: new Date().toISOString(),
      privacidad_version: VERSION_AVISO_CLIENTE,
      privacidad_ip: ip,
    })
    .eq("id", user.id);

  if (error) return { error: "Error al registrar la aceptación" };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function verificarPrivacidadClienteAction() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { aceptada: false, esCliente: false };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("usuarios") as any)
    .select("rol, privacidad_aceptada_at")
    .eq("id", user.id)
    .single() as { data: { rol: string; privacidad_aceptada_at: string | null } | null; error: unknown };

  if (!data) return { aceptada: false, esCliente: false };

  return {
    esCliente: data.rol === "cliente",
    aceptada: Boolean(data.privacidad_aceptada_at),
  };
}
