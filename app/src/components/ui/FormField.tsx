interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export default function FormField({ label, required, hint, children }: FormFieldProps) {
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--green)",
        marginBottom: 6,
        fontFamily: "'DM Mono', monospace",
      }}>
        {label}{required && " *"}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--card)",
  border: "1.5px solid var(--border-strong)",
  borderRadius: 4,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  color: "var(--ink)",
  outline: "none",
  boxSizing: "border-box",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};
