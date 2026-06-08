"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

interface PerfilRow { rol: string }

async function verificarAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, admin: null, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin"].includes(perfil.rol))
    return { supabase: null, admin: null, error: "No autorizado" };
  return { supabase, admin: createAdminClient(), error: null };
}

export interface CredencialesData {
  email_institucional: string;
  privacidad: {
    aceptada: boolean;
    fecha: string | null;
    ip: string | null;
  };
  portal: {
    tiene_acceso: boolean;
    usuario_id: string | null;
    ultimo_acceso: string | null;
    email_auth: string | null;
  };
  invitaciones: {
    id: string;
    tipo: string;
    expires_at: string;
    usada: boolean;
    created_at: string;
  }[];
}

export async function fetchCredencialesEmpleadoAction(empleadoId: string): Promise<{
  data: CredencialesData | null;
  error: string | null;
}> {
  const { supabase, admin, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !admin) return { data: null, error: authErr };

  // 1. Email institucional
  const { data: emp } = await supabase
    .from("empleados")
    .select("email_institucional")
    .eq("id", empleadoId)
    .single() as { data: { email_institucional: string } | null; error: unknown };

  if (!emp) return { data: null, error: "Empleado no encontrado" };

  // 2. Privacidad
  const { data: priv } = await supabase
    .from("empleado_privacidad")
    .select("acepta_aviso, acepta_sensibles, created_at, ip_address")
    .eq("empleado_id", empleadoId)
    .maybeSingle() as { data: { acepta_aviso: boolean; acepta_sensibles: boolean; created_at: string; ip_address: string | null } | null; error: unknown };

  // 3. Usuario en tabla usuarios (acceso al portal)
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, email, created_at")
    .eq("email", emp.email_institucional)
    .maybeSingle() as { data: { id: string; email: string; created_at: string } | null; error: unknown };

  // 4. Auth metadata (last sign in) via admin
  let ultimoAcceso: string | null = null;
  if (usuario?.id) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(usuario.id);
      ultimoAcceso = authUser?.user?.last_sign_in_at ?? null;
    } catch {
      // ignore if user not found in auth
    }
  }

  // 5. Invitaciones recientes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invs } = await (supabase.from("empleado_invitaciones") as any)
    .select("id, tipo, expires_at, usada, created_at")
    .eq("empleado_id", empleadoId)
    .order("created_at", { ascending: false })
    .limit(5) as { data: { id: string; tipo: string; expires_at: string; usada: boolean; created_at: string }[] | null; error: unknown };

  return {
    data: {
      email_institucional: emp.email_institucional,
      privacidad: {
        aceptada: Boolean(priv?.acepta_aviso),
        fecha: priv?.created_at ?? null,
        ip: priv?.ip_address ?? null,
      },
      portal: {
        tiene_acceso: Boolean(usuario),
        usuario_id: usuario?.id ?? null,
        ultimo_acceso: ultimoAcceso,
        email_auth: usuario?.email ?? null,
      },
      invitaciones: invs ?? [],
    },
    error: null,
  };
}

export async function invitarPortalEmpleadoAction(empleadoId: string) {
  const { supabase, admin, error: authErr } = await verificarAdmin();
  if (authErr || !supabase || !admin) return { error: authErr, inviteUrl: null };

  const { data: emp } = await supabase
    .from("empleados")
    .select("email_institucional, nombres, apellido_paterno")
    .eq("id", empleadoId)
    .single() as { data: { email_institucional: string; nombres: string; apellido_paterno: string } | null; error: unknown };

  if (!emp) return { error: "Empleado no encontrado", inviteUrl: null };

  const { data, error } = await admin.auth.admin.inviteUserByEmail(emp.email_institucional, {
    data: { role: "empleado", empleado_id: empleadoId },
  });

  if (error) return { error: error.message ?? "Error al enviar invitación", inviteUrl: null };

  revalidatePath(`/dashboard/empleados/${empleadoId}`);
  return { inviteUrl: data?.user?.confirmation_sent_at ? "enviado" : null, error: null };
}

export async function resetPasswordEmpleadoAction(email: string) {
  const { admin, error: authErr } = await verificarAdmin();
  if (authErr || !admin) return { error: authErr, resetUrl: null };

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) return { error: error.message ?? "Error al generar enlace", resetUrl: null };
  return { resetUrl: (data as { properties?: { action_link?: string } })?.properties?.action_link ?? null, error: null };
}
