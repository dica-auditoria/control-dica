"use client";

interface AsistenciaDia { fecha: string; presentes: number; total: number }
interface DeptoCount    { departamento: string; count: number }

export function AsistenciaBarChart({ datos }: { datos: AsistenciaDia[] }) {
  if (!datos.length) return null;
  const maxPct = 100;
  const W = 460; const H = 100; const barW = Math.floor((W - 40) / datos.length) - 4;

  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Asistencia últimos 7 días
      </div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: "100%", maxWidth: W }}>
        {datos.map((d, i) => {
          const pct    = d.total > 0 ? Math.round((d.presentes / d.total) * 100) : 0;
          const barH   = Math.max(4, Math.round((pct / maxPct) * H));
          const x      = 20 + i * (barW + 4);
          const y      = H - barH;
          const color  = pct >= 80 ? "#16a34a" : pct >= 50 ? "#a16207" : "#dc2626";
          const label  = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short" }).slice(0, 2);
          return (
            <g key={d.fecha}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} fillOpacity={0.8} />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted)" fontFamily="'DM Mono', monospace">{label}</text>
              {pct > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill={color} fontFamily="'DM Mono', monospace" fontWeight="700">{pct}%</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DepartamentosChart({ datos }: { datos: DeptoCount[] }) {
  if (!datos.length) return null;
  const total = datos.reduce((s, d) => s + d.count, 0);
  const colors = ["#1B4F8A", "#2563a8", "#8DC63F", "#a16207", "#16a34a", "#7c3aed", "#0891b2"];

  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Empleados por departamento
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {datos.slice(0, 7).map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          const color = colors[i % colors.length];
          return (
            <div key={d.departamento}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: "var(--ink)", fontFamily: "'DM Sans', sans-serif" }}>{d.departamento}</span>
                <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{d.count}</span>
              </div>
              <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
