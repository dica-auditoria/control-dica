import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPendientesRevisionAction, type PendienteItem } from "@/app/actions/requerimientos";
import Link from "next/link";

interface PerfilRow { rol: string; entidad_id: string | null }

function diasStr(d: number) {
  if (d === 0) return "hoy";
  if (d === 1) return "hace 1 día";
  return `hace ${d} días`;
}

function fmtFecha(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ estado, diasRetraso }: { estado: string; diasRetraso: number }) {
  if (estado === "en_revision") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
        En revisión
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
      Retraso · {diasStr(diasRetraso)}
    </span>
  );
}

function ItemRow({ item }: { item: PendienteItem }) {
  const href = item.contrato_id
    ? `/dashboard/directorio/empresa/${item.entidad_id}/${item.contrato_id}`
    : `/dashboard/directorio/empresa/${item.entidad_id}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 2 }}>{item.nombre}</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          {item.entidad_nombre}{item.contrato_nombre ? ` · ${item.contrato_nombre}` : ""}
          {item.fecha_limite ? ` · Vence ${fmtFecha(item.fecha_limite)}` : ""}
        </div>
      </div>
      <Badge estado={item.estado} diasRetraso={item.diasRetraso} />
      <Link href={href} style={{ fontSize: 11, color: "#1B4F8A", textDecoration: "none", padding: "4px 10px", border: "1px solid #1B4F8A", borderRadius: 4, whiteSpace: "nowrap" }}>
        Ver contrato →
      </Link>
    </div>
  );
}

export default async function PendientesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("rol, entidad_id").eq("id", user.id).single() as { data: PerfilRow | null; error: unknown };
  if (!perfil || !["admin", "superadmin", "rrhh", "empleado"].includes(perfil.rol)) redirect("/dashboard");

  const { data: items, error } = await fetchPendientesRevisionAction();

  const enRevision = (items ?? []).filter(i => i.estado === "en_revision");
  const enRetraso = (items ?? []).filter(i => i.estado !== "en_revision" && i.diasRetraso > 0);
  const soloFecha = (items ?? []).filter(i => i.estado !== "en_revision" && i.diasRetraso === 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", margin: "0 0 4px" }}>Pendientes</h1>
      <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: "0 0 32px" }}>
        Reactivos que requieren atención — en revisión o con retraso
      </p>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 24 }}>
          {error}
        </div>
      )}

      {!items?.length && !error && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--fg-muted)", fontSize: 14 }}>
          Sin pendientes — todo al día ✓
        </div>
      )}

      {enRevision.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", margin: 0 }}>En revisión</h2>
            <span style={{ fontSize: 12, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 100, padding: "1px 8px", fontWeight: 600 }}>{enRevision.length}</span>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Documentos subidos esperando verificación</span>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {enRevision.map(i => <ItemRow key={i.id} item={i} />)}
          </div>
        </section>
      )}

      {(enRetraso.length > 0 || soloFecha.length > 0) && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", margin: 0 }}>En retraso</h2>
            <span style={{ fontSize: 12, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 100, padding: "1px 8px", fontWeight: 600 }}>{enRetraso.length + soloFecha.length}</span>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Fecha límite vencida sin documento</span>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {[...enRetraso, ...soloFecha].sort((a, b) => b.diasRetraso - a.diasRetraso).map(i => <ItemRow key={i.id} item={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
