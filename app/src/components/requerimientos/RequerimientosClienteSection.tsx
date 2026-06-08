"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoEstado } from "@/types/requerimientos";
import { confirmarSubidaAction } from "@/app/actions/requerimientos";
import UploadZone from "@/components/archivos/UploadZone";

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasRestantes(fechaLimite: string): number {
  const limite = new Date(fechaLimite + "T23:59:59");
  return Math.ceil((limite.getTime() - Date.now()) / 86400000);
}

function formatFecha(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_STYLE: Record<RequerimientoEstado, { bg: string; color: string; label: string; icon: string }> = {
  pendiente:   { bg: "rgba(255,193,7,0.12)",  color: "#B8860B", label: "Pendiente de entrega", icon: "⏳" },
  en_revision: { bg: "rgba(33,150,243,0.1)",  color: "#1565C0", label: "En revisión",          icon: "🔍" },
  completado:  { bg: "rgba(45,166,95,0.1)",   color: "#1B7A3E", label: "Completado",            icon: "✅" },
  vencido:     { bg: "rgba(200,71,42,0.1)",   color: "var(--accent)", label: "Plazo vencido",   icon: "⚠️" },
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  requerimientos: Requerimiento[];
  entidadId: string;
}

export default function RequerimientosClienteSection({ requerimientos, entidadId }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const primero = requerimientos.find(r => r.estado === "pendiente" || r.estado === "vencido");
    return primero?.id ?? null;
  });

  const activos = requerimientos.filter(r => r.estado !== "completado");
  const completados = requerimientos.filter(r => r.estado === "completado");

  if (requerimientos.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "var(--ink)", margin: 0 }}>Documentos pendientes</h2>
        {activos.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(200,71,42,0.1)", color: "var(--accent)", fontFamily: "'DM Mono', monospace" }}>
            {activos.length} activo{activos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {activos.map(req => (
          <RequerimientoCard
            key={req.id}
            req={req}
            entidadId={entidadId}
            isOpen={expandedId === req.id}
            onToggle={() => setExpandedId(prev => prev === req.id ? null : req.id)}
            onRefresh={() => router.refresh()}
          />
        ))}

        {completados.length > 0 && (
          <details style={{ marginTop: 4 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", listStyle: "none", userSelect: "none", padding: "4px 0" }}>
              ▸ {completados.length} requerimiento{completados.length !== 1 ? "s" : ""} completado{completados.length !== 1 ? "s" : ""}
            </summary>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {completados.map(req => (
                <RequerimientoCard key={req.id} req={req} entidadId={entidadId} isOpen={false} onToggle={() => {}} onRefresh={() => router.refresh()} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ── Card individual ───────────────────────────────────────────────────────────

function RequerimientoCard({ req, entidadId, isOpen, onToggle, onRefresh }: {
  req: Requerimiento; entidadId: string; isOpen: boolean; onToggle: () => void; onRefresh: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const dias = diasRestantes(req.fecha_limite);
  const st = ESTADO_STYLE[req.estado];
  const itemsDone = req.items.filter(i => i.completado).length;
  const itemsTotal = req.items.length;
  const pct = itemsTotal > 0 ? Math.round((itemsDone / itemsTotal) * 100) : req.archivos_count > 0 ? 60 : 0;
  const canUpload = req.estado !== "completado" && req.estado !== "vencido";
  const canConfirm = canUpload && req.archivos_count > 0 && req.estado !== "en_revision";

  const handleConfirmar = async () => {
    setConfirming(true);
    await confirmarSubidaAction(req.id);
    setConfirmando(false);
    setConfirming(false);
    onRefresh();
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>

        {/* Estado icon */}
        <span style={{ fontSize: 20, flexShrink: 0 }}>{st.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{req.titulo}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", background: st.bg, color: st.color }}>{st.label}</span>
          </div>

          {/* Progress */}
          {(itemsTotal > 0 || req.archivos_count > 0) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 120, height: 5, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: req.estado === "completado" ? "#2D6A4F" : pct === 100 ? "#2D6A4F" : "var(--accent)", borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              {itemsTotal > 0 && <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{itemsDone}/{itemsTotal} confirmados</span>}
              {req.archivos_count > 0 && <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>· {req.archivos_count} archivo{req.archivos_count !== 1 ? "s" : ""} subido{req.archivos_count !== 1 ? "s" : ""}</span>}
            </div>
          )}
        </div>

        {/* Deadline */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {req.estado === "completado" ? (
            <div style={{ fontSize: 12, color: "#1B7A3E", fontWeight: 600 }}>✓ Listo</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: req.estado === "vencido" ? "var(--accent)" : dias <= 3 ? "#B8860B" : "var(--muted-2)" }}>
                {dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? "Vence hoy" : `${dias}d`}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{formatFecha(req.fecha_limite)}</div>
            </>
          )}
        </div>

        <span style={{ color: "var(--muted)", flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-flex" }}>
          <ChevronIcon />
        </span>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          {req.descripcion && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-2)", lineHeight: 1.5 }}>{req.descripcion}</p>
          )}

          {/* Vencido notice */}
          {req.estado === "vencido" && (
            <div style={{ padding: "10px 14px", background: "rgba(200,71,42,0.06)", borderRadius: 6, border: "1px solid rgba(200,71,42,0.15)", fontSize: 13, color: "var(--accent)" }}>
              El plazo venció el {formatFecha(req.fecha_limite)}. Contacta a tu asesor para solicitar una extensión.
            </div>
          )}

          {/* En revisión notice */}
          {req.estado === "en_revision" && (
            <div style={{ padding: "10px 14px", background: "rgba(33,150,243,0.06)", borderRadius: 6, border: "1px solid rgba(33,150,243,0.2)", fontSize: 13, color: "#1565C0" }}>
              Tu documentación está siendo revisada. Te notificarán si hace falta algo.
            </div>
          )}

          {/* Items list */}
          {req.items.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                Documentos solicitados
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {req.items.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", borderRadius: 6, border: "1px solid var(--border)", background: item.completado ? "rgba(45,166,95,0.04)" : "var(--surface)" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", background: item.completado ? "#2D6A4F" : "transparent", border: item.completado ? "none" : "1.5px solid var(--border-strong)" }}>
                      {item.completado && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: item.completado ? 400 : 500, textDecoration: item.completado ? "line-through" : "none", opacity: item.completado ? 0.55 : 1 }}>{item.nombre}</div>
                      {item.descripcion && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{item.descripcion}</div>}
                    </div>
                    {item.obligatorio && !item.completado && (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "rgba(200,71,42,0.08)", color: "var(--accent)", fontFamily: "'DM Mono', monospace", fontWeight: 700, flexShrink: 0 }}>obligatorio</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload zone */}
          {canUpload && (
            <div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                Subir documentos
              </div>
              {uploadOpen ? (
                <div>
                  <UploadZone
                    entidadId={entidadId}
                    contratoId={req.contrato_id ?? undefined}
                    destino="cliente"
                    carpetaPrefix={`Requerimiento-${req.id.slice(0, 8)}`}
                    onDone={() => { setUploadOpen(false); onRefresh(); }}
                  />
                  <button onClick={() => setUploadOpen(false)}
                    style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <button onClick={() => setUploadOpen(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "var(--surface)", border: "1.5px dashed var(--border-strong)", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "var(--muted-2)", fontFamily: "'DM Sans', sans-serif" }}>
                  <UploadIcon /> Seleccionar archivos para subir
                </button>
              )}
            </div>
          )}

          {/* Confirm button */}
          {canConfirm && (
            <div>
              {confirmando ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--muted-2)" }}>¿Ya subiste todos los documentos solicitados?</span>
                  <button onClick={handleConfirmar} disabled={confirming}
                    style={{ padding: "7px 14px", background: "#1565C0", color: "white", border: "none", borderRadius: 4, cursor: confirming ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: confirming ? 0.7 : 1 }}>
                    {confirming ? "Enviando…" : "Sí, enviar para revisión"}
                  </button>
                  <button onClick={() => setConfirmando(false)} style={{ padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 12 }}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setConfirmando(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#1565C0", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                  <SendIcon /> Enviar para revisión
                </button>
              )}
            </div>
          )}

          {req.notas_cierre && (
            <div style={{ padding: "10px 12px", background: "rgba(45,166,95,0.06)", borderRadius: 6, border: "1px solid rgba(45,166,95,0.2)", fontSize: 12, color: "#1B7A3E" }}>
              <strong>Nota del asesor:</strong> {req.notas_cierre}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function UploadIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>; }
function SendIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }
