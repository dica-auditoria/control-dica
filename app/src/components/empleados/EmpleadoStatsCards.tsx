import MetricCard from "@/components/ui/MetricCard";
import type { EmpleadosStats } from "@/types/empleados";

export default function EmpleadoStatsCards({ stats }: { stats: EmpleadosStats }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginBottom: 24,
    }}>
      <MetricCard
        label="Activos"
        value={stats.activos}
        meta={stats.nuevosEsteMes > 0 ? `+${stats.nuevosEsteMes} este mes` : "Personal en activo"}
        accent="var(--green)"
        bg="var(--green-light)"
      />
      <MetricCard
        label="Perfiles incompletos"
        value={stats.perfilesIncompletos}
        meta="Requieren atención"
        accent="var(--amber)"
        bg="var(--amber-light)"
      />
      <MetricCard
        label="Documentos por vencer"
        value={stats.documentosPorVencer}
        meta="Próximos 30 días"
        accent="var(--accent)"
        bg="var(--red-light)"
      />
      <MetricCard
        label="Capacitaciones pendientes"
        value={stats.capacitacionesPendientes}
        meta="Asignadas"
        accent="#1565c0"
        bg="#e3f2fd"
      />
    </div>
  );
}
