"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { registrarLoginAction } from "@/app/actions/audit";
import { DicaLogo } from "@/components/ui/DicaLogo";

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
        {/* Logos */}
        <div style={{ zIndex: 1, display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <DicaLogo variant="white" fontSize={32} />
            <AuditrackLogo />
          </div>

          <div>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 44,
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

function AuditrackLogo() {
  const green = "#8DC63F";
  return (
    <svg viewBox="0 0 220 44" width={160} height={32} xmlns="http://www.w3.org/2000/svg" aria-label="AUDITRACK">
      {/* A */}
      <polygon points="0,36 10,8 20,36 16,36 10,18 4,36" fill={green} />
      <rect x="4.5" y="26" width="11" height="3.5" fill={green} />
      {/* U */}
      <path d="M24,8 L24,28 Q24,38 34,38 Q44,38 44,28 L44,8 L40,8 L40,28 Q40,34 34,34 Q28,34 28,28 L28,8 Z" fill={green} />
      {/* D */}
      <path d="M48,8 L48,36 L58,36 Q72,36 72,22 Q72,8 58,8 Z M52,12 L57,12 Q68,12 68,22 Q68,32 57,32 L52,32 Z" fill={green} />
      {/* I */}
      <rect x="76" y="8" width="4" height="28" fill={green} />
      {/* T */}
      <rect x="84" y="8" width="20" height="4" fill={green} />
      <rect x="92" y="8" width="4" height="28" fill={green} />
      {/* R */}
      <path d="M108,8 L108,36 L112,36 L112,24 L119,24 L126,36 L131,36 L123,23 Q130,21 130,15.5 Q130,8 120,8 Z M112,12 L119,12 Q126,12 126,15.5 Q126,20 119,20 L112,20 Z" fill={green} />
      {/* A */}
      <polygon points="134,36 144,8 154,36 150,36 144,18 138,36" fill={green} />
      <rect x="138.5" y="26" width="11" height="3.5" fill={green} />
      {/* C */}
      <path d="M182,14 Q175,8 168,14 Q162,19 162,22 Q162,30 168,34 Q175,40 182,34 L179,31 Q175,36 170,31 Q165,27 165,22 Q165,17 170,13 Q175,8 179,13 Z" fill={green} />
      {/* K */}
      <rect x="186" y="8" width="4" height="28" fill={green} />
      <polygon points="190,21 203,8 208,8 195,21 208,36 203,36" fill={green} />
      {/* ® */}
      <circle cx="214" cy="11" r="5.5" fill="none" stroke={green} strokeWidth="1.2" />
      <text x="214" y="14.5" textAnchor="middle" fontSize="6" fill={green} fontFamily="sans-serif" fontWeight="bold">R</text>
    </svg>
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

