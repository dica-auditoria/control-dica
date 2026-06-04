interface MetricCardProps {
  label: string;
  value: string | number;
  meta: string;
  accent: string;
  bg?: string;
}

export default function MetricCard({ label, value, meta, accent, bg = "white" }: MetricCardProps) {
  return (
    <div style={{
      background: bg,
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 20,
      boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "rgba(15,17,23,0.4)",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 32,
        color: "var(--ink)",
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "rgba(15,17,23,0.45)" }}>{meta}</div>
    </div>
  );
}
