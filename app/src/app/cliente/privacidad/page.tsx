import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientePrivacidadStep from "@/components/clientes/ClientePrivacidadStep";
import { DicaLogo } from "@/components/ui/DicaLogo";

export const metadata = { title: "Aviso de Privacidad — Control DICA" };

interface PerfilRow {
  nombre: string;
  rol: string;
  privacidad_aceptada_at: string | null;
}

export default async function ClientePrivacidadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: perfil } = await (supabase.from("usuarios") as any)
    .select("nombre, rol, privacidad_aceptada_at")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil) redirect("/login");

  // Si ya aceptó o no es cliente → va al dashboard
  if (perfil.privacidad_aceptada_at || perfil.rol !== "cliente") {
    redirect("/dashboard");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--surface)",
      padding: "24px 16px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 16 }}>
        <div style={{ display: "inline-block" }}>
          <DicaLogo variant="color" fontSize={22} />
        </div>
      </div>

      <ClientePrivacidadStep
        nombre={perfil.nombre}
        email={user.email ?? ""}
      />

      <p style={{
        textAlign: "center", marginTop: 24,
        fontSize: 11, color: "rgba(15,17,23,0.3)",
        fontFamily: "'DM Mono', monospace",
      }}>
        Este portal es de uso exclusivo para clientes de DICA México · ISO 27001
      </p>
    </div>
  );
}
