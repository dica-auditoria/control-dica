"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoItem, ItemEstado } from "@/types/requerimientos";
import type { ClienteArchivo } from "@/components/archivos/ClienteArchivosTable";
import UploadZone from "@/components/archivos/UploadZone";

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasRestantes(fechaLimite: string): number {
  const limite = new Date(fechaLimite + "T23:59:59");
  return Math.ceil((limite.getTime() - Date.now()) / 86400000);
}

function formatFecha(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

const ITEM_ESTADO: Record<ItemEstado, { bg: string; color: string; label: string }> = {
  pendiente:   { bg: "rgba(107,114,128,0.1)",   color: "#6B7280",  label: "Pendiente"   },
  en_revision: { bg: "rgba(251,191,36,0.15)",   color: "#92400E",  label: "En revisión" },
  completado:  { bg: "rgba(45,166,95,0.1)",     color: "#1B7A3E",  label: "Entregado"   },
};

// ── Main component ────────────────────────────────────────────────────────────

type ArchivoConItemId = ClienteArchivo & { requerimiento_item_id: string | null };

interface Props {
  requerimientos: Requerimiento[];
  entidadId: string;
  archivos: ArchivoConItemId[];
}

export default function RequerimientosClienteSection({ requerimientos, entidadId, archivos }: Props) {
  const router = useRouter();

  const activos    = requerimientos.filter(r => r.estado !== "completado");
  const completados = requerimientos.filter(r => r.estado === "completado");

  if (requerimientos.length === 0) return null;

  const totalItems   = activos.flatMap(r => r.items).length;
  const entregados   = activos.flatMap(r => r.items).filter(i => i.estado === "completado").length;
  const enRevision   = activos.flatMap(r => r.items).filter(i => i.estado === "en_revision").length;
  const porcentaje   = totalItems > 0 ? Math.round((entregados / totalItems) * 100) : 0;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header + barra de progreso general */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "var(--ink)", margin: 0 }}>
            Documentos requeridos
          </h2>
          {enRevision > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(251,191,36,0.15)", color: "#92400E", fontFamily: "'DM Mono', monospace" }}>
              {enRevision} en revisión
            </span>
          )}
        </div>

        {totalItems > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 280, height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, transition: "width 0.4s",
                width: `${porcentaje}%`,
                background: porcentaje === 100 ? "var(--green)" : porcentaje >= 60 ? "#F6AD55" : "var(--accent)",
              }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
              {entregados}/{totalItems} entregados
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {activos.map(req => (
          <RequerimientoCard
            key={req.id}
            req={req}
            entidadId={entidadId}
            archivos={archivos}
            onRefresh={() => router.refresh()}
          />
        ))}

        {completados.length > 0 && (
          <details style={{ marginTop: 4 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", listStyle: "none", userSelect: "none", padding: "4px 0" }}>
              ▸ {completados.length} requerimiento{completados.length !== 1 ? "s" : ""} completado{completados.length !== 1 ? "s" : ""}
            </summary>
          </details>
        )}
      </div>
    </div>
  );
}

// ── Card de requerimiento ─────────────────────────────────────────────────────

function RequerimientoCard({ req, entidadId, archivos, onRefresh }: {
  req: Requerimiento; entidadId: string; archivos: ArchivoConItemId[]; onRefresh: () => void;
}) {
  const dias = diasRestantes(req.fecha_limite);
  const canUpload = req.estado !== "completado" && req.estado !== "vencido";

  const completados  = req.items.filter(i => i.estado === "completado").length;
  const porcentaje   = req.items.length > 0 ? Math.round((completados / req.items.length) * 100) : 0;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
      {/* Header del requerimiento */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{req.titulo}</div>
          {req.items.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 100, height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${porcentaje}%`, height: "100%", background: porcentaje === 100 ? "var(--green)" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                {completados}/{req.items.length}
              </span>
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {req.estado === "vencido" ? (
            <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "'DM Mono', monospace" }}>
              Venció hace {Math.abs(dias)}d
            </span>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: dias <= 3 ? "#B8860B" : "var(--muted-2)" }}>
                {dias === 0 ? "Vence hoy" : `${dias}d`}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                {formatFecha(req.fecha_limite)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aviso vencido */}
      {req.estado === "vencido" && (
        <div style={{ padding: "10px 18px", background: "rgba(200,71,42,0.06)", fontSize: 13, color: "var(--accent)", borderBottom: "1px solid var(--border)" }}>
          El plazo venció. Contacta a tu asesor para solicitar una extensión.
        </div>
      )}

      {/* Lista de items */}
      {req.items.length === 0 ? (
        <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          Sin documentos definidos aún
        </div>
      ) : (
        <div>
          {req.items
            .sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999))
            .map((item, idx) => (
              <ItemRow
                key={item.id}
                item={item}
                idx={idx}
                entidadId={entidadId}
                contratoId={req.contrato_id ?? undefined}
                archivosItem={archivos.filter(a => a.requerimiento_item_id === item.id)}
                canUpload={canUpload}
                onRefresh={onRefresh}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ── Fila de item con upload expandible ───────────────────────────────────────

function ItemRow({ item, idx, entidadId, contratoId, archivosItem, canUpload, onRefresh }: {
  item: RequerimientoItem;
  idx: number;
  entidadId: string;
  contratoId?: string;
  archivosItem: ArchivoConItemId[];
  canUpload: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const estado = item.estado ?? "pendiente";
  const st = ITEM_ESTADO[estado];

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Fila colapsada */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 18px", cursor: "pointer",
          background: estado === "completado" ? "rgba(45,166,95,0.025)" : estado === "en_revision" ? "rgba(251,191,36,0.04)" : "transparent",
          minHeight: 44,
        }}
      >
        <span style={{ color: "var(--muted)", flexShrink: 0, display: "inline-flex", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none" }}>
          <ChevronIcon />
        </span>

        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)", width: 28, flexShrink: 0 }}>
          {item.orden ?? (idx + 1)}
        </span>

        {item.rubro && (
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 100, background: "var(--surface-2)", fontFamily: "'DM Mono', monospace", color: "var(--muted-2)", flexShrink: 0 }}>
            {item.rubro}
          </span>
        )}

        <span style={{ flex: 1, fontSize: 13, color: "var(--ink)", textDecoration: estado === "completado" ? "line-through" : "none", opacity: estado === "completado" ? 0.55 : 1 }}>
          {item.nombre}
        </span>

        {archivosItem.length > 0 && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(45,166,95,0.12)", color: "#1B7A3E", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
            {archivosItem.length} archivo{archivosItem.length !== 1 ? "s" : ""}
          </span>
        )}

        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: st.bg, color: st.color, fontFamily: "'DM Mono', monospace", fontWeight: 600, flexShrink: 0 }}>
          {st.label}
        </span>
      </div>

      {/* Panel expandido */}
      {open && (
        <div style={{ padding: "14px 18px 18px 56px", background: "rgba(15,17,23,0.015)", borderTop: "1px solid var(--border)" }}>

          {/* Archivos ya subidos */}
          {archivosItem.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                Documentos subidos
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {archivosItem.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: "var(--surface-2)", color: "var(--muted-2)", textTransform: "uppercase" }}>
                      {a.tipo.slice(0, 4)}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.nombre.split("/").pop()}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                      {formatBytes(a.size_bytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload zone */}
          {canUpload && estado !== "completado" ? (
            <div>
              {archivosItem.length === 0 && (
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                  Subir documento
                </div>
              )}
              <UploadZone
                entidadId={entidadId}
                contratoId={contratoId}
                destino="cliente"
                requerimientoItemId={item.id}
                onDone={onRefresh}
              />
              {estado === "en_revision" && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(251,191,36,0.08)", borderRadius: 6, fontSize: 12, color: "#92400E", border: "1px solid rgba(251,191,36,0.2)" }}>
                  Tu documento está siendo revisado. Puedes subir una versión corregida si te lo solicitan.
                </div>
              )}
            </div>
          ) : estado === "completado" ? (
            <div style={{ fontSize: 12, color: "#1B7A3E", fontFamily: "'DM Mono', monospace" }}>
              ✓ Documento verificado por el equipo DICA
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
              Sin documentos subidos aún
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>;
}
