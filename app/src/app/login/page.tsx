"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { registrarLoginAction } from "@/app/actions/audit";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    await registrarLoginAction().catch(() => {});
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="login-grid">
      {/* Panel izquierdo — oculto en móvil */}
      <div className="login-panel-brand" style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        background: "#1B4F8A",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ zIndex: 1 }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 48,
            lineHeight: 1.1,
            color: "rgba(255,255,255,0.88)",
            marginBottom: 20,
          }}>
            Gestión documental{" "}
            <em style={{ fontStyle: "italic", color: "#8DC63F" }}>segura</em>{" "}
            y auditable.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 340 }}>
            Plataforma centralizada para la carga, custodia y trazabilidad de documentos
            bajo estándares ISO 27001.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", zIndex: 1 }}>
          {["ISO 27001", "Audit Log", "WORM Ready", "Multi-entidad"].map(label => (
            <span key={label} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 100,
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.04em",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8DC63F" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 24px",
        background: "var(--surface)",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 30,
            color: "var(--ink)",
            marginBottom: 6,
          }}>Iniciar sesión</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 36 }}>
            Ingresa con tus credenciales asignadas.
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--muted-2)", marginBottom: 6,
                fontFamily: "'DM Mono', monospace",
              }}>Correo electrónico</label>
              <input
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: "100%", padding: "11px 14px",
                  background: "var(--card)",
                  border: "1.5px solid var(--border-strong)",
                  borderRadius: 4,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, color: "var(--ink)", outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--muted-2)", marginBottom: 6,
                fontFamily: "'DM Mono', monospace",
              }}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "11px 42px 11px 14px",
                    background: "var(--card)",
                    border: "1.5px solid var(--border-strong)",
                    borderRadius: 4,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14, color: "var(--ink)", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--muted)", padding: 0, display: "flex", lineHeight: 1,
                  }}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: 8, padding: "10px 12px",
                background: "var(--red-light)",
                border: "1px solid rgba(200,71,42,0.2)",
                borderRadius: 4, fontSize: 13, color: "var(--accent)",
                display: "flex", alignItems: "center", gap: 6,
                marginBottom: 8,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: 12,
                background: "#1B4F8A", color: "white",
                border: "none", borderRadius: 4,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                marginTop: 8,
              }}
            >
              {loading ? "Verificando..." : "Acceder al sistema"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

