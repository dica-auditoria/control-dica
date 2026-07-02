import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface PerfilRow { rol: string }

const MODULOS = [
  {
    href: "/dashboard/herramientas/conversor",
    icon: "🔄",
    titulo: "Conversor de Archivos",
    descripcion: "Convierte entre PDF, Word, Excel, PNG y JPEG.",
    tags: ["PDF", "Word", "Excel", "PNG", "JPEG"],
    color: "#1B4F8A",
  },
];

export default async function HerramientasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || perfil.rol === "cliente") redirect("/dashboard");

  return (
    <div>
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>
          Herramientas
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Utilidades y módulos de productividad
        </p>
      </div>

      <div style={{ padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {MODULOS.map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
                overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
                transition: "box-shadow 0.15s, transform 0.15s",
                cursor: "pointer",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(15,17,23,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(15,17,23,0.06)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", background: `${m.color}08`, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${m.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {m.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{m.titulo}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{m.descripcion}</div>
                  </div>
                </div>
                <div style={{ padding: "12px 20px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.tags.map(t => (
                    <span key={t} style={{
                      padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600,
                      fontFamily: "'DM Mono', monospace",
                      background: "var(--surface-2)", color: "var(--muted)",
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
