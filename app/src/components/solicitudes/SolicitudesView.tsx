"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aprobarSolicitudAction, rechazarSolicitudAction } from "@/app/actions/solicitudes";

export interface SolicitudItem {
  id: string;
  motivo: string;
  estado: string;
  created_at: string;
  revisado_at: string | null;
  archivo_nombre: string;
  archivo_tipo: string;
  entidad_nombre: string | null;
  solicitante_nombre: string | null;
  revisor_nombre: string | null;
}

type Filtro = "pendientes" | "todas";

export default function SolicitudesView({ solicitudes: inicial }: { solicitudes: SolicitudItem[] }) {
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [processing, setProcessing] = useState<Record<string, "aprobando" | "rechazando">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const lista = filtro === "pendientes"
    ? inicial.filter(s => s.estado === "pendiente")
    : inicial;

  const pendientesCount = inicial.filter(s => s.estado === "pendiente").length;

  const handleAprobar = async (id: string) => {
    setProcessing(p => ({ ...p, [id]: "aprobando" }));
    setErrors(e => { const n = { ...e }; delete n[id]; return n; });

    const result = await aprobarSolicitudAction(id);

    if (result.error) {
      setErrors(e => ({ ...e, [id]: result.error! }));
      setProcessing(p => { const n = { ...p }; delete n[id]; return n; });
      return;
    }

    setProcessing(p => { const n = { ...p }; delete n[id]; return n; });
    router.refresh();
  };

  const handleRechazar = async (id: string) => {
    setProcessing(p => ({ ...p, [id]: "rechazando" }));
    setErrors(e => { const n = { ...e }; delete n[id]; return n; });

    const result = await rechazarSolicitudAction(id);

    if (result.error) {
      setErrors(e => ({ ...e, [id]: result.error! }));
      setProcessing(p => { const n = { ...p }; delete n[id]; return n; });
      return;
    }

    setProcessing(p => { const n = { ...p }; delete n[id]; return n; });
    router.refresh();
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)" }}>
            Solicitudes de Eliminación
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Requieren autorización del administrador
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 6 }}>
          {(["pendientes", "todas"] as Filtro[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                padding: "6px 14px",
                background: filtro === f ? "white" : "transparent",
                border: "none",
                borderRadius: 4,
                fontSize: 12, fontWeight: 500,
                color: filtro === f ? "var(--ink)" : "rgba(15,17,23,0.45)",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: filtro === f ? "0 1px 3px rgba(15,17,23,0.08)" : "none",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {f === "pendientes" ? "Pendientes" : "Todas"}
              {f === "pendientes" && pendientesCount > 0 && (
                <span style={{
                  background: "var(--accent)", color: "white",
                  fontSize: 10, fontWeight: 700, padding: "1px 6px",
                  borderRadius: 100, fontFamily: "'DM Mono', monospace",
                }}>
                  {pendientesCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        {lista.length === 0 ? (
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "48px 20px", textAlign: "center",
            color: "var(--muted)", fontSize: 13,
            fontFamily: "'DM Mono', monospace",
          }}>
            {filtro === "pendientes" ? "Sin solicitudes pendientes" : "No hay solicitudes registradas"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lista.map(s => (
              <SolicitudCard
                key={s.id}
                solicitud={s}
                processing={processing[s.id]}
                error={errors[s.id]}
                onAprobar={() => handleAprobar(s.id)}
                onRechazar={() => handleRechazar(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SolicitudCard({
  solicitud: s,
  processing,
  error,
  onAprobar,
  onRechazar,
}: {
  solicitud: SolicitudItem;
  processing?: "aprobando" | "rechazando";
  error?: string;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  const isPending = s.estado === "pendiente";
  const isBusy = !!processing;

  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${isPending ? "rgba(181,86,14,0.2)" : "var(--border)"}`,
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: isPending ? "var(--amber-light)" : "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExtBadge tipo={s.archivo_tipo} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.archivo_nombre}</span>
          {s.entidad_nombre && (
            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
              · {s.entidad_nombre}
            </span>
          )}
        </div>
        <EstadoBadge estado={s.estado} />
      </div>

      {/* Body */}
      <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 3 }}>
            Solicitante
          </div>
          <div style={{ fontSize: 13, color: "var(--ink)" }}>{s.solicitante_nombre ?? "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 3 }}>
            Fecha solicitud
          </div>
          <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
            {new Date(s.created_at).toLocaleDateString("es-MX")}
          </div>
        </div>
        {!isPending && s.revisor_nombre && (
          <>
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 3 }}>
                Revisado por
              </div>
              <div style={{ fontSize: 13, color: "var(--ink)" }}>{s.revisor_nombre}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 3 }}>
                Fecha revisión
              </div>
              <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>
                {s.revisado_at ? new Date(s.revisado_at).toLocaleDateString("es-MX") : "—"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Motivo */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>
          Motivo
        </div>
        <div style={{
          padding: "8px 12px",
          background: isPending ? "rgba(181,86,14,0.06)" : "var(--surface)",
          border: `1px solid ${isPending ? "rgba(181,86,14,0.15)" : "var(--border)"}`,
          borderRadius: 4,
          fontSize: 13, color: "var(--ink)", lineHeight: 1.5,
        }}>
          {s.motivo}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ padding: "8px 12px", background: "var(--red-light)", borderRadius: 4, fontSize: 12, color: "var(--accent)" }}>
            {error}
          </div>
        </div>
      )}

      {/* Acciones (solo pendientes) */}
      {isPending && (
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 10,
        }}>
          <button
            onClick={onAprobar}
            disabled={isBusy}
            style={{
              flex: 1, padding: "9px",
              background: processing === "aprobando" ? "rgba(45,106,79,0.3)" : "var(--green-light)",
              color: "var(--green)",
              border: "1px solid rgba(45,106,79,0.2)",
              borderRadius: 4, fontSize: 13, fontWeight: 600,
              cursor: isBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {processing === "aprobando" ? <Spinner color="var(--green)" /> : <CheckIcon />}
            {processing === "aprobando" ? "Aprobando…" : "Aprobar eliminación"}
          </button>
          <button
            onClick={onRechazar}
            disabled={isBusy}
            style={{
              flex: 1, padding: "9px",
              background: processing === "rechazando" ? "rgba(200,71,42,0.15)" : "var(--red-light)",
              color: "var(--accent)",
              border: "1px solid rgba(200,71,42,0.2)",
              borderRadius: 4, fontSize: 13, fontWeight: 600,
              cursor: isBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {processing === "rechazando" ? <Spinner color="var(--accent)" /> : <XIcon />}
            {processing === "rechazando" ? "Rechazando…" : "Rechazar"}
          </button>
        </div>
      )}
    </div>
  );
}

function ExtBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pdf:  { bg: "#fdecea", color: "var(--accent)" },
    xlsx: { bg: "#e8f5e9", color: "#2e7d32" },
    zip:  { bg: "#e8eaf6", color: "#3949ab" },
    docx: { bg: "#e3f2fd", color: "#1565c0" },
    csv:  { bg: "#f3e5f5", color: "#6a1b9a" },
  };
  const s = map[tipo.toLowerCase()] ?? { bg: "var(--surface-2)", color: "var(--muted-2)" };
  return (
    <span style={{ ...s, fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, flexShrink: 0 }}>
      {tipo.toLowerCase()}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pendiente:  { bg: "var(--amber-light)", color: "var(--amber)", label: "Pendiente" },
    aprobado:   { bg: "var(--red-light)",   color: "var(--accent)", label: "Aprobado" },
    rechazado:  { bg: "var(--green-light)", color: "var(--green)", label: "Rechazado" },
  };
  const { bg, color, label } = cfg[estado] ?? { bg: "var(--surface-2)", color: "var(--muted-2)", label: estado };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
      background: bg, color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
