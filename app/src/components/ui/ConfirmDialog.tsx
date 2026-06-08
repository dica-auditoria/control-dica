"use client";

import React from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = "Confirmar",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,17,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div style={{ background: "white", borderRadius: 8, width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(15,17,23,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <p style={{ fontSize: 13, color: "rgba(15,17,23,0.65)", margin: 0, lineHeight: 1.65 }}>{message}</p>
        </div>
        <div style={{ padding: "12px 24px 18px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ padding: "8px 16px", background: "white", border: "1.5px solid var(--border-strong)", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: "var(--ink)" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ padding: "8px 18px", background: danger ? "var(--accent)" : "var(--green)", color: "white", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
