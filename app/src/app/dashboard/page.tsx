import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ArchivoEstado, UserRole } from "@/types/database";
import ClienteArchivosTable, { type ClienteArchivo } from "@/components/archivos/ClienteArchivosTable";
import { fetchRequerimientosClienteAction } from "@/app/actions/requerimientos";
import RequerimientosClienteSection from "@/components/requerimientos/RequerimientosClienteSection";
import { fetchMiExpedienteAction } from "@/app/actions/empleados";

interface PerfilRow { rol: UserRole; entidad_id: string | null }
interface ArchivoRow { id: string; nombre: string; tipo: string; estado: ArchivoEstado; created_at: string; size_bytes: number; entidades: { nombre: string } | null }

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, entidad_id")
    .eq("id", user!.id)
    .single() as { data: PerfilRow | null; error: unknown };

  const isAdmin = perfil?.rol === "admin" || perfil?.rol === "superadmin";
  const isEmpleado = perfil?.rol === "empleado";

  if (isAdmin) {
    const [
      { count: totalArchivos },
      { count: totalEntidades },
      { count: totalSolicitudes },
      { count: archivosVerificados },
    ] = await Promise.all([
      supabase.from("archivos").select("*", { count: "exact", head: true }).neq("estado", "eliminado").neq("tipo", "carpeta"),
      supabase.from("entidades").select("*", { count: "exact", head: true }).eq("activo", true),
      supabase.from("solicitudes_eliminacion").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("archivos").select("*", { count: "exact", head: true }).neq("estado", "eliminado").neq("tipo", "carpeta").neq("hash_sha256", "0000000000000000000000000000000000000000000000000000000000000000"),
    ]);

    const integridadPct = totalArchivos ? Math.round(((archivosVerificados ?? 0) / (totalArchivos ?? 1)) * 100) : 100;

    const { data: archivosRecientes } = await supabase
      .from("archivos")
      .select("id, nombre, tipo, estado, created_at, entidades(nombre)")
      .neq("estado", "eliminado")
      .order("created_at", { ascending: false })
      .limit(5) as { data: ArchivoRow[] | null; error: unknown };

    return (
      <div style={{ padding: "28px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "rgba(15,17,23,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Resumen general del sistema
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard label="Total archivos" value={totalArchivos ?? 0} meta="En custodia activa" accent="var(--accent)" />
          <StatCard label="Entidades" value={totalEntidades ?? 0} meta="Clientes activos" accent="var(--gold)" />
          <StatCard label="Solicitudes" value={totalSolicitudes ?? 0} meta="Pendientes de revisión" accent="var(--amber)" />
          <StatCard label="Integridad" value={`${integridadPct}%`} meta="SHA-256 verificado" accent="var(--green)" />
        </div>

        {/* Tabla archivos recientes */}
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.08)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Archivos recientes</div>
            <div style={{ fontSize: 11, color: "rgba(15,17,23,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>Últimas cargas al sistema</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Archivo", "Entidad", "Fecha", "Estado"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(15,17,23,0.4)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(archivosRecientes ?? []).map(f => (
                <tr key={f.id}>
                  <td style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                      <ExtBadge tipo={f.tipo} />
                      {f.nombre}
                    </div>
                  </td>
                  <td style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "rgba(15,17,23,0.55)" }}>
                    {(f.entidades as { nombre: string } | null)?.nombre ?? "—"}
                  </td>
                  <td style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.45)" }}>
                    {new Date(f.created_at).toLocaleDateString("es-MX")}
                  </td>
                  <td style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                    <EstadoBadge estado={f.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Vista empleado
  if (isEmpleado) {
    const { data: emp } = await fetchMiExpedienteAction();

    return (
      <div style={{ padding: "28px 32px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
            Bienvenido{emp ? `, ${(emp as Record<string, unknown>).nombres as string}` : ""}
          </h1>
          <p style={{ fontSize: 12, color: "rgba(15,17,23,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Portal del empleado — Control DICA
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {emp && (
            <>
              <StatCard
                label="Progreso de perfil"
                value={`${(emp as Record<string, unknown>).progreso_perfil as number}%`}
                meta="Completitud de tu expediente"
                accent="var(--green)"
              />
              <StatCard
                label="Departamento"
                value={(emp as Record<string, unknown>).departamento as string}
                meta={(emp as Record<string, unknown>).puesto as string}
                accent="var(--gold)"
              />
              <StatCard
                label="Estado"
                value={(emp as Record<string, unknown>).estado === "activo" ? "Activo" : "Pendiente"}
                meta={`Código: ${(emp as Record<string, unknown>).codigo_empleado ?? "—"}`}
                accent="var(--accent)"
              />
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <AccesoRapido
            href="/dashboard/mi-expediente"
            titulo="Mi Expediente"
            desc="Ver tus datos personales, documentos y más"
            color="var(--green)"
          />
          <AccesoRapido
            href="/dashboard/mi-asistencia"
            titulo="Mi Check-in"
            desc="Registrar entrada / salida del día"
            color="var(--gold)"
          />
          <AccesoRapido
            href="/dashboard/directorio"
            titulo="Directorio"
            desc="Ubicaciones de oficinas y zonas cliente"
            color="var(--accent)"
          />
          <AccesoRapido
            href="/dashboard/buscar"
            titulo="Búsqueda"
            desc="Buscar archivos, clientes y contratos"
            color="rgba(15,17,23,0.5)"
          />
        </div>
      </div>
    );
  }

  // Vista cliente
  const [{ data: misArchivos }, rReqs] = await Promise.all([
    supabase
      .from("archivos")
      .select("id, nombre, tipo, estado, size_bytes, created_at")
      .eq("entidad_id", perfil!.entidad_id!)
      .neq("estado", "eliminado")
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ClienteArchivo[] | null; error: unknown }>,
    fetchRequerimientosClienteAction(),
  ]);

  const requerimientos = rReqs.data ?? [];

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Mi Portal</h1>
        <p style={{ fontSize: 12, color: "rgba(15,17,23,0.4)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
          Documentos y requerimientos de tu expediente
        </p>
      </div>

      {/* Requerimientos pendientes — solo si hay alguno */}
      {requerimientos.length > 0 && (
        <RequerimientosClienteSection requerimientos={requerimientos} entidadId={perfil!.entidad_id!} />
      )}

      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "var(--ink)", margin: 0 }}>Mis archivos</h2>
      </div>
      <ClienteArchivosTable archivos={misArchivos ?? []} />
    </div>
  );
}

function StatCard({ label, value, meta, accent }: { label: string; value: string | number; meta: string; accent: string }) {
  return (
    <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(15,17,23,0.08)", borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(15,17,23,0.4)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "var(--ink)", lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(15,17,23,0.4)" }}>{meta}</div>
    </div>
  );
}

function AccesoRapido({ href, titulo, desc, color }: { href: string; titulo: string; desc: string; color: string }) {
  return (
    <Link href={href} style={{
      display: "block", textDecoration: "none",
      background: "white", border: "1px solid var(--border)", borderRadius: 8,
      padding: 20, boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
      borderLeft: `3px solid ${color}`,
      transition: "box-shadow 0.15s",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 12, color: "rgba(15,17,23,0.45)" }}>{desc}</div>
    </Link>
  );
}

function ExtBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    pdf: { bg: "#fdecea", color: "var(--accent)" },
    xlsx: { bg: "#e8f5e9", color: "#2e7d32" },
    zip: { bg: "#e8eaf6", color: "#3949ab" },
  };
  const style = colors[tipo.toLowerCase()] ?? { bg: "var(--surface-2)", color: "rgba(15,17,23,0.5)" };
  return (
    <span style={{ ...style, fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
      {tipo}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const isActivo = estado === "activo";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 100,
      fontSize: 11, fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      background: isActivo ? "var(--green-light)" : "var(--amber-light)",
      color: isActivo ? "var(--green)" : "var(--amber)",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: isActivo ? "var(--green)" : "var(--amber)" }} />
      {isActivo ? "Activo" : "Pend. eliminación"}
    </span>
  );
}

