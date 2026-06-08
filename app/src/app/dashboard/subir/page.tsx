import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadZone from "@/components/archivos/UploadZone";

interface PerfilRow { rol: string; entidad_id: string | null; entidades: { nombre: string } | null }

export default async function SubirPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, entidad_id, entidades(nombre)")
    .eq("id", user.id)
    .single() as { data: PerfilRow | null; error: unknown };

  if (!perfil?.entidad_id) redirect("/dashboard");

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
          Subir Archivo
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
          {perfil.entidades?.nombre ?? "Tu entidad"}
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        <div style={{ maxWidth: 560 }}>
          {/* Info */}
          <div style={{
            padding: "12px 16px", marginBottom: 20,
            background: "var(--surface-2)", borderRadius: 6,
            fontSize: 12, color: "var(--muted-2)",
            fontFamily: "'DM Mono', monospace",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <InfoIcon />
            <span>
              El hash SHA-256 se calcula en tu navegador antes de subir.
              Ningún archivo puede ser eliminado sin autorización del administrador.
            </span>
          </div>

          {/* Upload card */}
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(15,17,23,0.08)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13, fontWeight: 600, color: "var(--ink)",
            }}>
              Documento a subir
            </div>
            <div style={{ padding: 20 }}>
              <UploadZone
                entidadId={perfil.entidad_id}
                onSuccess={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
