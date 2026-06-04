const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: "var(--green-light)", color: "var(--green)", label: "Activo" },
  pendiente: { bg: "var(--amber-light)", color: "var(--amber)", label: "Pendiente" },
  inactivo: { bg: "var(--surface-2)", color: "rgba(15,17,23,0.5)", label: "Inactivo" },
};

export default function StatusBadge({ estado }: { estado: string }) {
  const cfg = STATUS_STYLES[estado] ?? STATUS_STYLES.pendiente;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      background: cfg.bg,
      color: cfg.color,
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: cfg.color,
      }} />
      {cfg.label}
    </span>
  );
}
