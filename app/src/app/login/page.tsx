"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      background: "var(--ink)",
    }}>
      {/* Panel izquierdo */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        background: "var(--ink-2)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 38, height: 38,
            background: "var(--accent)",
            borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white",
          }}>
            <ShieldIcon />
          </div>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>control · dica-mx</span>
        </div>

        <div style={{ zIndex: 1 }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 48,
            lineHeight: 1.1,
            color: "white",
            marginBottom: 20,
          }}>
            Gestión documental{" "}
            <em style={{ fontStyle: "italic", color: "var(--gold)" }}>segura</em>{" "}
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
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 48,
        background: "var(--surface)",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 30,
            color: "var(--ink)",
            marginBottom: 6,
          }}>Iniciar sesión</h2>
          <p style={{ fontSize: 14, color: "rgba(15,17,23,0.45)", marginBottom: 36 }}>
            Ingresa con tus credenciales asignadas.
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(15,17,23,0.5)", marginBottom: 6,
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
                  background: "white",
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
                color: "rgba(15,17,23,0.5)", marginBottom: 6,
                fontFamily: "'DM Mono', monospace",
              }}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: "100%", padding: "11px 14px",
                  background: "white",
                  border: "1.5px solid var(--border-strong)",
                  borderRadius: 4,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, color: "var(--ink)", outline: "none",
                }}
              />
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
                background: "var(--ink)", color: "white",
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

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
