import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientePrivacidadStep from "@/components/clientes/ClientePrivacidadStep";

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
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "8px 16px",
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: 100,
          boxShadow: "0 1px 4px rgba(15,17,23,0.06)",
        }}>
          <span style={{
            width: 20, height: 20,
            background: "var(--accent)",
            borderRadius: 3,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "rgba(15,17,23,0.55)", fontWeight: 500,
          }}>
            Control DICA México
          </span>
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
