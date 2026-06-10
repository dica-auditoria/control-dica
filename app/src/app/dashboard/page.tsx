import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ArchivoEstado, UserRole } from "@/types/database";
import ClienteArchivosTable, { type ClienteArchivo } from "@/components/archivos/ClienteArchivosTable";
import { fetchRequerimientosClienteAction } from "@/app/actions/requerimientos";
import RequerimientosClienteSection from "@/components/requerimientos/RequerimientosClienteSection";
import { fetchMiExpedienteAction } from "@/app/actions/empleados";
import { fetchComunicadosAction } from "@/app/actions/comunicados";
import { AsistenciaBarChart, DepartamentosChart } from "@/components/dashboard/DashboardCharts";

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

  const isAdmin    = perfil?.rol === "admin" || perfil?.rol === "superadmin";
  const isRrhh     = perfil?.rol === "rrhh";
  const isEmpleado = perfil?.rol === "empleado";

  // ── Vista RRHH ─────────────────────────────────────────────────────────────
  if (isRrhh) {
    const hoy  = new Date().toISOString().split("T")[0];
    const hace7 = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
    const en30  = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const [
      { count: totalEmp },
      { count: empActivos },
      { count: pendientesVac },
      { count: pendientesOtros },
      { data: asistSemana },
      { data: deptoData },
      { count: docsPorVencer },
      { data: comunicados },
    ] = await Promise.all([
      supabase.from("empleados").select("*", { count: "exact", head: true }),
      supabase.from("empleados").select("*", { count: "exact", head: true }).eq("estado", "activo"),
      supabase.from("solicitudes_vacaciones" as never).select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      (supabase.from("solicitudes_otros") as any).select("*", { count: "exact", head: true }).eq("estado", "pendiente_rh") as Promise<{ count: number | null }>,
      supabase.from("empleado_asistencia" as never).select("fecha, empleado_id").gte("fecha", hace7).lte("fecha", hoy),
      supabase.from("empleados").select("departamento").eq("estado", "activo"),
      supabase.from("empleado_documentos" as never).select("*", { count: "exact", head: true }).lte("fecha_vencimiento", en30).gte("fecha_vencimiento", hoy),
      supabase.from("comunicados" as never).select("id, titulo, tipo, created_at").eq("activo", true).order("created_at", { ascending: false }).limit(3),
    ]);

    // Calcular asistencia por día
    const diasMap: Record<string, { presentes: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0];
      diasMap[d] = { presentes: 0, total: 0 };
    }
    if (asistSemana) {
      const byDate: Record<string, Set<string>> = {};
      for (const r of asistSemana as unknown as { fecha: string; empleado_id: string }[]) {
        if (!byDate[r.fecha]) byDate[r.fecha] = new Set();
        byDate[r.fecha].add(r.empleado_id);
      }
      const actTotal = empActivos ?? 0;
      for (const [fecha, set] of Object.entries(byDate)) {
        if (diasMap[fecha] !== undefined) {
          diasMap[fecha].presentes = set.size;
          diasMap[fecha].total = actTotal;
        }
      }
      for (const d of Object.keys(diasMap)) {
        if (diasMap[d].total === 0) diasMap[d].total = actTotal;
      }
    }
    const asistChart = Object.entries(diasMap).map(([fecha, v]) => ({ fecha, ...v }));

    // Contar por departamento
    const deptoMap: Record<string, number> = {};
    for (const e of (deptoData ?? []) as unknown as { departamento: string }[]) {
      deptoMap[e.departamento] = (deptoMap[e.departamento] ?? 0) + 1;
    }
    const deptoChart = Object.entries(deptoMap).sort((a, b) => b[1] - a[1]).map(([departamento, count]) => ({ departamento, count }));

    return (
      <div className="page-pad">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Dashboard RRHH</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>Resumen del equipo</p>
        </div>

        <div className="grid-resp-4" style={{ marginBottom: 24 }}>
          <StatCard label="Total empleados" value={totalEmp ?? 0} meta="En el sistema" accent="var(--accent)" tint="var(--tint-red)" icon={<IconUsers />} />
          <StatCard label="Activos" value={empActivos ?? 0} meta="Estado activo" accent="var(--green)" tint="var(--tint-blue)" icon={<IconUser />} />
          <StatCard label="Vac. pendientes" value={pendientesVac ?? 0} meta="Por revisar" accent="var(--amber)" tint="var(--tint-amber)" icon={<IconAlert />} />
          <StatCard label="Otros pendientes" value={pendientesOtros ?? 0} meta="Comisiones / permisos" accent="#ea580c" tint="var(--tint-amber)" icon={<IconAlert />} />
          <StatCard label="Docs por vencer" value={docsPorVencer ?? 0} meta="Próximos 30 días" accent="#dc2626" tint="var(--tint-red)" icon={<IconAlert />} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px" }}>
            <AsistenciaBarChart datos={asistChart} />
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px" }}>
            <DepartamentosChart datos={deptoChart} />
          </div>
        </div>

        {(comunicados as unknown as { id: string; titulo: string; tipo: string; created_at: string }[] | null)?.length ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Comunicados recientes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(comunicados as unknown as { id: string; titulo: string; tipo: string; created_at: string }[]).map(c => (
                <div key={c.id} style={{ fontSize: 13, color: "var(--ink)" }}>• {c.titulo}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Vista Admin ────────────────────────────────────────────────────────────
  if (isAdmin) {
    const hoy   = new Date().toISOString().split("T")[0];
    const hace7 = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
    const en30  = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const [
      { count: totalArchivos },
      { count: totalEntidades },
      { count: totalSolicitudes },
      { count: archivosVerificados },
      { count: totalEmp },
      { count: docsPorVencer },
      { data: asistSemana },
      { data: deptoData },
    ] = await Promise.all([
      supabase.from("archivos").select("*", { count: "exact", head: true }).neq("estado", "eliminado").neq("tipo", "carpeta"),
      supabase.from("entidades").select("*", { count: "exact", head: true }).eq("activo", true),
      supabase.from("solicitudes_eliminacion").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("archivos").select("*", { count: "exact", head: true }).neq("estado", "eliminado").neq("tipo", "carpeta").neq("hash_sha256", "0000000000000000000000000000000000000000000000000000000000000000"),
      supabase.from("empleados").select("*", { count: "exact", head: true }).eq("estado", "activo"),
      supabase.from("empleado_documentos" as never).select("*", { count: "exact", head: true }).lte("fecha_vencimiento", en30).gte("fecha_vencimiento", hoy),
      supabase.from("empleado_asistencia" as never).select("fecha, empleado_id").gte("fecha", hace7).lte("fecha", hoy),
      supabase.from("empleados").select("departamento").eq("estado", "activo"),
    ]);

    const integridadPct = totalArchivos ? Math.round(((archivosVerificados ?? 0) / (totalArchivos ?? 1)) * 100) : 100;

    // Gráfica asistencia
    const diasMap: Record<string, { presentes: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0];
      diasMap[d] = { presentes: 0, total: totalEmp ?? 0 };
    }
    if (asistSemana) {
      const byDate: Record<string, Set<string>> = {};
      for (const r of asistSemana as unknown as { fecha: string; empleado_id: string }[]) {
        if (!byDate[r.fecha]) byDate[r.fecha] = new Set();
        byDate[r.fecha].add(r.empleado_id);
      }
      for (const [fecha, set] of Object.entries(byDate)) {
        if (diasMap[fecha]) diasMap[fecha].presentes = set.size;
      }
    }
    const asistChart = Object.entries(diasMap).map(([fecha, v]) => ({ fecha, ...v }));

    const deptoMap: Record<string, number> = {};
    for (const e of (deptoData ?? []) as unknown as { departamento: string }[]) {
      deptoMap[e.departamento] = (deptoMap[e.departamento] ?? 0) + 1;
    }
    const deptoChart = Object.entries(deptoMap).sort((a, b) => b[1] - a[1]).map(([departamento, count]) => ({ departamento, count }));

    const { data: archivosRecientes } = await supabase
      .from("archivos")
      .select("id, nombre, tipo, estado, created_at, entidades(nombre)")
      .neq("estado", "eliminado")
      .order("created_at", { ascending: false })
      .limit(5) as { data: ArchivoRow[] | null; error: unknown };

    return (
      <div className="page-pad">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Resumen general del sistema
          </p>
        </div>

        {/* Stats documentales */}
        <div className="grid-resp-4" style={{ marginBottom: 20 }}>
          <StatCard label="Total archivos" value={totalArchivos ?? 0} meta="En custodia activa"
            accent="var(--accent)" tint="var(--tint-red)" icon={<IconFiles />} />
          <StatCard label="Entidades" value={totalEntidades ?? 0} meta="Clientes activos"
            accent="var(--green)" tint="var(--tint-blue)" icon={<IconBuilding />} />
          <StatCard label="Solicitudes" value={totalSolicitudes ?? 0} meta="Pendientes de revisión"
            accent="var(--amber)" tint="var(--tint-amber)" icon={<IconAlert />} />
          <StatCard label="Integridad" value={`${integridadPct}%`} meta="SHA-256 verificado"
            accent="#2d7a3a" tint="var(--tint-green)" icon={<IconShieldCheck />} />
        </div>

        {/* Stats RRHH */}
        <div className="grid-resp-4" style={{ marginBottom: 20 }}>
          <StatCard label="Empleados activos" value={totalEmp ?? 0} meta="En el sistema"
            accent="#1B4F8A" tint="var(--tint-blue)" icon={<IconUsers />} />
          <StatCard label="Docs por vencer" value={docsPorVencer ?? 0} meta="Próximos 30 días"
            accent="#dc2626" tint="var(--tint-red)" icon={<IconAlert />} />
        </div>

        {/* Gráficas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px" }}>
            <AsistenciaBarChart datos={asistChart} />
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px" }}>
            <DepartamentosChart datos={deptoChart} />
          </div>
        </div>

        {/* Tabla archivos recientes */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.08)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Archivos recientes</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>Últimas cargas al sistema</div>
          </div>
          <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Archivo", "Entidad", "Fecha", "Estado"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
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
                  <td style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted-2)" }}>
                    {(f.entidades as { nombre: string } | null)?.nombre ?? "—"}
                  </td>
                  <td style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
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
      </div>
    );
  }

  // Vista empleado
  if (isEmpleado) {
    const [{ data: emp }, { data: comuns }] = await Promise.all([
      fetchMiExpedienteAction(),
      fetchComunicadosAction(),
    ]);

    return (
      <div className="page-pad">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
            Bienvenido{emp ? `, ${(emp as Record<string, unknown>).nombres as string}` : ""}
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Portal del empleado — Control DICA
          </p>
        </div>

        <div className="grid-resp-3" style={{ marginBottom: 28 }}>
          {emp && (
            <>
              <StatCard
                label="Progreso de perfil"
                value={`${(emp as Record<string, unknown>).progreso_perfil as number}%`}
                meta="Completitud de tu expediente"
                accent="var(--green)" tint="var(--tint-blue)" icon={<IconChart />}
              />
              <StatCard
                label="Departamento"
                value={(emp as Record<string, unknown>).departamento as string}
                meta={(emp as Record<string, unknown>).puesto as string}
                accent="#b89a5c" tint="var(--tint-gold)" icon={<IconBriefcase />}
              />
              <StatCard
                label="Estado"
                value={(emp as Record<string, unknown>).estado === "activo" ? "Activo" : "Pendiente"}
                meta={`Código: ${(emp as Record<string, unknown>).codigo_empleado ?? "—"}`}
                accent="#2d7a3a" tint="var(--tint-green)" icon={<IconUser />}
              />
            </>
          )}
        </div>

        <div className="grid-resp-2" style={{ marginBottom: 20 }}>
          <AccesoRapido href="/dashboard/mi-expediente" titulo="Mi Expediente" desc="Ver tus datos personales, documentos y más" color="var(--green)" />
          <AccesoRapido href="/dashboard/mi-asistencia" titulo="Mi Check-in" desc="Registrar entrada / salida del día" color="var(--gold)" />
          <AccesoRapido href="/dashboard/mis-vacaciones" titulo="Mis Vacaciones" desc="Solicitar días de vacaciones o permisos" color="#1B4F8A" />
          <AccesoRapido href="/dashboard/mi-credencial" titulo="Mi Credencial" desc="Credencial digital con código QR" color="var(--accent)" />
        </div>

        {/* Comunicados activos */}
        {(comuns?.length ?? 0) > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Comunicados
            </div>
            {comuns!.map(c => {
              const colors: Record<string, string> = { info: "#1B4F8A", urgente: "#dc2626", recordatorio: "#a16207" };
              const color = colors[c.tipo] ?? "#1B4F8A";
              return (
                <div key={c.id} style={{
                  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "12px 16px", borderLeft: `4px solid ${color}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{c.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-2)", lineHeight: 1.5 }}>{c.contenido}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Vista cliente
  const [{ data: misArchivos }, rReqs] = await Promise.all([
    supabase
      .from("archivos")
      .select("id, nombre, tipo, estado, size_bytes, ruta_storage, created_at, requerimiento_item_id")
      .eq("entidad_id", perfil!.entidad_id!)
      .neq("estado", "eliminado")
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: (ClienteArchivo & { requerimiento_item_id: string | null })[] | null; error: unknown }>,
    fetchRequerimientosClienteAction(),
  ]);

  const requerimientos = rReqs.data ?? [];
  const todosArchivos  = (misArchivos ?? []) as (ClienteArchivo & { requerimiento_item_id: string | null })[];

  // Archivos sin reactivo asignado — los que tienen requerimiento_item_id ya se ven en "Documentos requeridos"
  const archivosGenerales = todosArchivos.filter(a => !a.requerimiento_item_id);

  return (
    <div className="page-pad">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>Mi Portal</h1>
        <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
          Documentos y requerimientos de tu expediente
        </p>
      </div>

      {/* Requerimientos pendientes — solo si hay alguno */}
      {requerimientos.length > 0 && (
        <RequerimientosClienteSection
          requerimientos={requerimientos}
          entidadId={perfil!.entidad_id!}
          archivos={todosArchivos}
        />
      )}

      {/* Mis archivos generales — solo los que no están ligados a un reactivo */}
      {archivosGenerales.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "var(--ink)", margin: 0 }}>Mis archivos</h2>
          </div>
          <ClienteArchivosTable archivos={archivosGenerales} />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, meta, accent, tint, icon }: {
  label: string; value: string | number; meta: string;
  accent: string; tint: string; icon: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</div>
        <div style={{
          width: 36, height: 36, background: tint, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent, flexShrink: 0,
        }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "var(--ink)", lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{meta}</div>
    </div>
  );
}

function AccesoRapido({ href, titulo, desc, color }: { href: string; titulo: string; desc: string; color: string }) {
  return (
    <Link href={href} style={{
      display: "block", textDecoration: "none",
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
      padding: 20, boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
      borderLeft: `3px solid ${color}`,
      transition: "box-shadow 0.15s",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
    </Link>
  );
}

function ExtBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    pdf: { bg: "#fdecea", color: "var(--accent)" },
    xlsx: { bg: "#e8f5e9", color: "#2e7d32" },
    zip: { bg: "#e8eaf6", color: "#3949ab" },
  };
  const style = colors[tipo.toLowerCase()] ?? { bg: "var(--surface-2)", color: "var(--muted-2)" };
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

function IconFiles() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function IconBuilding() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconAlert() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function IconShieldCheck() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
}
function IconChart() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function IconBriefcase() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}
function IconUser() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IconUsers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

