"use client";

import { useTheme, type AppTheme } from "./ThemeProvider";

const OPTIONS: { value: AppTheme; label: string }[] = [
  { value: "system", label: "Usar tema del dispositivo" },
  { value: "dark",   label: "Tema oscuro" },
  { value: "light",  label: "Tema claro" },
];

export default function ThemeSelector({ onBack }: { onBack: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 14px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 4, display: "flex", borderRadius: 4 }}
          aria-label="Volver"
        >
          <ArrowLeftIcon />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
          Aspecto
        </span>
      </div>

      {/* Subtitle */}
      <p style={{
        fontSize: 11, color: "rgba(255,255,255,0.38)",
        padding: "12px 16px 4px",
        lineHeight: 1.5, margin: 0,
        fontFamily: "'DM Mono', monospace",
      }}>
        La configuración solo se aplica a este navegador
      </p>

      {/* Options */}
      <div style={{ padding: "4px 8px" }}>
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "10px 8px",
              background: "none", border: "none",
              borderRadius: 4, cursor: "pointer",
              textAlign: "left",
              color: theme === opt.value ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.52)",
              fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ width: 18, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              {theme === opt.value && <CheckIcon />}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8DC63F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
