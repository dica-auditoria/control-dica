"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Requerimiento, RequerimientoItem, ItemEstado } from "@/types/requerimientos";
import type { ClienteArchivo } from "@/components/archivos/ClienteArchivosTable";
import type { Comentario } from "@/app/actions/comentarios";
import UploadZone from "@/components/archivos/UploadZone";
import { fetchComentariosItemAction, agregarComentarioAction } from "@/app/actions/comentarios";
import { getDownloadUrlAction } from "@/app/actions/storage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasRestantes(fechaLimite: string): number {
  const limite = new Date(fechaLimite + "T23:59:59");
  return Math.ceil((limite.getTime() - Date.now()) / 86400000);
}

function formatFecha(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFechaCorta(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

function diasLabel(f: string): string {
  const dias = Math.ceil((new Date(f + "T23:59:59").getTime() - Date.now()) / 86400000);
  if (dias === 0) return "hoy";
  if (dias > 0) return `${dias}d`;
  return `${dias}d`;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function iniciales(nombre: string) {
  return nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const ITEM_ESTADO: Record<ItemEstado, { bg: string; color: string; label: string }> = {
  pendiente:   { bg: "rgba(107,114,128,0.1)",   color: "#6B7280",  label: "Pendiente"   },
  en_revision: { bg: "rgba(251,191,36,0.15)",   color: "#92400E",  label: "En revisión" },
  parcial:     { bg: "rgba(251,146,60,0.12)",   color: "#C2410C",  label: "Parcial"     },
  completado:  { bg: "rgba(45,166,95,0.1)",     color: "#1B7A3E",  label: "Entregado"   },
};

// ── Deadline badge ────────────────────────────────────────────────────────────

function DeadlineBadge({ fecha, extendida }: { fecha: string | null; extendida: boolean }) {
  if (!fecha) return null;
  const dias = diasRestantes(fecha);
  const ext = extendida ? "Ext · " : "";
  if (dias > 3)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(45,166,95,0.12)", color: "#1B7A3E", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{ext}A tiempo</span>;
  if (dias >= 1)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(251,191,36,0.18)", color: "#92400E", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{ext}Próx. vencer</span>;
  if (dias === 0)
    return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(251,191,36,0.18)", color: "#92400E", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>Vence hoy</span>;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(200,71,42,0.12)", color: "#C8472A", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{ext}En retraso</span>;
}

// ── Types ────────────────────────────────────────────────────────────────────

type ArchivoConItemId = ClienteArchivo & { requerimiento_item_id: string | null };

interface Props {
  requerimientos: Requerimiento[];
  entidadId: string;
  archivos: ArchivoConItemId[];
  areaUsuario?: string | null;
  readOnly?: boolean;
}

interface SeccionInfo {
  key: string;
  label: string;
  total: number;
  completados: number;
  enRevision: number;
}

function filtrarItemsPorArea(items: RequerimientoItem[], area?: string | null): RequerimientoItem[] {
  if (!area) return items;
  return items.filter(i => !i.area || i.area === area);
}

function seccionKey(item: RequerimientoItem): string {
  return item.numero ? item.numero.split(".")[0] : "0";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RequerimientosClienteSection({ requerimientos, entidadId, archivos, areaUsuario, readOnly }: Props) {
  const router = useRouter();
  const topRef  = useRef<HTMLDivElement>(null);

  const [busqueda, setBusqueda]             = useState("");
  const [filtroArea, setFiltroArea]         = useState("");
  const [filtroRubro, setFiltroRubro]       = useState("");
  const [filtroEstado, setFiltroEstado]     = useState("");
  const [filtroSeccion, setFiltroSeccion]   = useState("");
  const [showScrollTop, setShowScrollTop]   = useState(false);
  const [activeSeccion, setActiveSeccion]   = useState<string>("");
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const activos    = requerimientos.filter(r => r.estado !== "completado");
  const completados = requerimientos.filter(r => r.estado === "completado");

  if (requerimientos.length === 0) return null;

  const todosItemsActivos = activos.flatMap(r => filtrarItemsPorArea(r.items, areaUsuario));
  const totalItems    = todosItemsActivos.length;
  const entregados    = todosItemsActivos.filter(i => i.estado === "completado").length;
  const enRevision    = todosItemsActivos.filter(i => i.estado === "en_revision").length;
  const pendientes    = todosItemsActivos.filter(i => i.estado === "pendiente").length;
  const porcentaje    = totalItems > 0 ? Math.round((entregados / totalItems) * 100) : 0;
  const totalArchivos = archivos.filter(a => todosItemsActivos.some(i => i.id === a.requerimiento_item_id)).length;

  // Computar secciones para la barra lateral
  const seccionesMap = new Map<string, SeccionInfo>();
  for (const item of todosItemsActivos) {
    const key = seccionKey(item);
    if (!seccionesMap.has(key)) {
      seccionesMap.set(key, { key, label: item.area ?? "", total: 0, completados: 0, enRevision: 0 });
    }
    const s = seccionesMap.get(key)!;
    s.total++;
    if (item.estado === "completado") s.completados++;
    if (item.estado === "en_revision") s.enRevision++;
  }
  const secciones = Array.from(seccionesMap.values()).sort((a, b) => parseInt(a.key) - parseInt(b.key));

  // Opciones únicas para los filtros
  const areas  = Array.from(new Set(todosItemsActivos.map(i => i.area).filter(Boolean))).sort() as string[];
  const rubros = Array.from(new Set(todosItemsActivos.map(i => i.rubro).filter(Boolean))).sort() as string[];

  const hayFiltros = busqueda || filtroArea || filtroRubro || filtroEstado || filtroSeccion;

  const filtroFn = (item: RequerimientoItem): boolean => {
    const norm = busqueda.toLowerCase().trim();
    if (norm && !item.nombre.toLowerCase().includes(norm) && !(item.rubro ?? "").toLowerCase().includes(norm)) return false;
    if (filtroArea && item.area !== filtroArea) return false;
    if (filtroRubro && item.rubro !== filtroRubro) return false;
    if (filtroEstado && item.estado !== filtroEstado) return false;
    if (filtroSeccion && seccionKey(item) !== filtroSeccion) return false;
    return true;
  };

  const limpiar = () => { setBusqueda(""); setFiltroArea(""); setFiltroRubro(""); setFiltroEstado(""); setFiltroSeccion(""); };

  // Scroll-to-top + active section via IntersectionObserver
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (secciones.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSeccion(entry.target.getAttribute("data-seccion") ?? "");
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    secciones.forEach(s => {
      const el = document.getElementById(`seccion-${s.key}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secciones.length]);

  const scrollToSeccion = (key: string) => {
    const el = document.getElementById(`seccion-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const selectSt: React.CSSProperties = {
    height: 32, padding: "0 8px", border: "1px solid var(--border-strong)", borderRadius: 4,
    fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)",
    color: "var(--ink)", cursor: "pointer", outline: "none",
  };

  return (
    <div style={{ marginBottom: 28 }} ref={topRef}>
      {/* Header + barra de progreso */}
      <div style={{ marginBottom: 12 }}>
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
              <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s", width: `${porcentaje}%`, background: porcentaje === 100 ? "var(--green)" : porcentaje >= 60 ? "#F6AD55" : "var(--accent)" }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
              {entregados}/{totalItems} entregados
            </span>
          </div>
        )}
      </div>

      {/* Cards de resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <StatCard label="Pendientes"     value={pendientes}    color="#6B7280" bg="rgba(107,114,128,0.08)" icon={<ClockIcon />}  onClick={() => setFiltroEstado(filtroEstado === "pendiente"  ? "" : "pendiente")}  active={filtroEstado === "pendiente"} />
        <StatCard label="En revisión"    value={enRevision}    color="#92400E" bg="rgba(251,191,36,0.12)" icon={<ReviewIcon />} onClick={() => setFiltroEstado(filtroEstado === "en_revision" ? "" : "en_revision")} active={filtroEstado === "en_revision"} />
        <StatCard label="Entregados"     value={entregados}    color="#1B7A3E" bg="rgba(45,166,95,0.1)"   icon={<CheckIcon />}  onClick={() => setFiltroEstado(filtroEstado === "completado"  ? "" : "completado")}  active={filtroEstado === "completado"} />
        <StatCard label="Archivos subidos" value={totalArchivos} color="#1B4F8A" bg="rgba(27,79,138,0.08)" icon={<FileIcon />} />
      </div>

      {/* Layout: sidebar + contenido */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

        {/* ── Barra lateral ── */}
        {secciones.length > 1 && (
          <div style={{
            width: sidebarVisible ? 196 : 40, flexShrink: 0,
            position: "sticky", top: 8,
            maxHeight: "calc(100vh - 48px)", overflowY: sidebarVisible ? "auto" : "hidden",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 8, boxShadow: "0 1px 4px rgba(15,17,23,0.06)",
            scrollbarWidth: "thin", transition: "width 0.2s",
          }}>
            <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              {sidebarVisible && (
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                  Secciones
                </span>
              )}
              <button
                onClick={() => setSidebarVisible(v => !v)}
                title={sidebarVisible ? "Ocultar secciones" : "Mostrar secciones"}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex", marginLeft: sidebarVisible ? "auto" : 0 }}
              >
                {sidebarVisible ? <PanelCollapseIcon /> : <PanelExpandIcon />}
              </button>
            </div>
            <div style={{ padding: "6px 0 8px", display: sidebarVisible ? "block" : "none" }}>
              {secciones.map(s => {
                const pct = s.total > 0 ? Math.round((s.completados / s.total) * 100) : 0;
                const isActive = activeSeccion === s.key;
                const isFiltro = filtroSeccion === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      scrollToSeccion(s.key);
                      if (isFiltro) setFiltroSeccion(""); else setFiltroSeccion(s.key);
                    }}
                    style={{
                      width: "100%", textAlign: "left",
                      border: "none", cursor: "pointer",
                      padding: "7px 12px",
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      background: isActive ? "rgba(200,71,42,0.04)" : isFiltro ? "rgba(27,79,138,0.06)" : "transparent",
                    } as React.CSSProperties}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: isActive ? "var(--accent)" : "var(--muted)", fontWeight: isActive ? 700 : 400, minWidth: 20 }}>
                        {s.key}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {s.label}
                      </span>
                      {s.enRevision > 0 && (
                        <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 100, background: "rgba(251,191,36,0.2)", color: "#92400E", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                          {s.enRevision}
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ height: 3, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${pct}%`,
                        background: pct === 100 ? "var(--green)" : pct > 0 ? "#F6AD55" : "transparent",
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
                        {s.completados}/{s.total}
                      </span>
                      <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: pct === 100 ? "var(--green)" : "var(--muted)" }}>
                        {pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Contenido principal ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Barra de filtros sticky */}
          <div style={{
            position: "sticky", top: 0, zIndex: 30,
            background: "var(--surface)", borderRadius: 8,
            border: "1px solid var(--border)",
            padding: "10px 12px", marginBottom: 12,
            display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
            boxShadow: "0 2px 8px rgba(15,17,23,0.07)",
          }}>
            {/* Buscador */}
            <div style={{ position: "relative", flex: "1 1 160px", minWidth: 140 }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", display: "flex" }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Buscar reactivo…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ width: "100%", paddingLeft: 28, paddingRight: busqueda ? 24 : 8, height: 32, border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans', sans-serif", background: "var(--card)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
              )}
            </div>

            {areas.length > 0 && (
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} style={selectSt}>
                <option value="">Área</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}

            {rubros.length > 0 && (
              <select value={filtroRubro} onChange={e => setFiltroRubro(e.target.value)} style={selectSt}>
                <option value="">Rubro</option>
                {rubros.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}

            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selectSt}>
              <option value="">Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_revision">En revisión</option>
              <option value="completado">Entregado</option>
            </select>

            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap" }}>
              {hayFiltros
                ? `${todosItemsActivos.filter(filtroFn).length} de ${totalItems}`
                : `${totalItems} reactivos`}
            </span>

            {hayFiltros && (
              <button onClick={limpiar} style={{ height: 32, padding: "0 12px", background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, cursor: "pointer", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                × Limpiar
              </button>
            )}
          </div>

          {/* Sin resultados */}
          {hayFiltros && todosItemsActivos.filter(filtroFn).length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}>
              Sin resultados para los filtros aplicados
            </div>
          )}

          {/* Cards de requerimientos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activos.map(req => (
              <RequerimientoCard
                key={req.id}
                req={req}
                entidadId={entidadId}
                archivos={archivos}
                readOnly={readOnly}
                areaUsuario={areaUsuario}
                filtroFn={hayFiltros ? filtroFn : undefined}
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
      </div>

      {/* Botón flotante scroll al inicio */}
      {showScrollTop && (
        <button
          onClick={scrollTop}
          title="Ir al inicio"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 100,
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--ink)", color: "white", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(15,17,23,0.25)", fontSize: 18,
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
}

// ── Card de requerimiento ─────────────────────────────────────────────────────

function RequerimientoCard({ req, entidadId, archivos, areaUsuario, filtroFn, onRefresh, readOnly }: {
  req: Requerimiento; entidadId: string; archivos: ArchivoConItemId[]; areaUsuario?: string | null;
  filtroFn?: (item: RequerimientoItem) => boolean;
  onRefresh: () => void; readOnly?: boolean;
}) {
  const canUpload = req.estado !== "completado" && req.estado !== "vencido";

  let items = filtrarItemsPorArea(req.items, areaUsuario);

  // Agrupar por sección para insertar dividers con anchors
  const grupos = new Map<string, RequerimientoItem[]>();
  for (const item of items) {
    const key = seccionKey(item);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(item);
  }
  const gruposOrdenados = Array.from(grupos.entries()).sort(([a], [b]) => parseInt(a) - parseInt(b));

  if (filtroFn) items = items.filter(filtroFn);
  const completados = items.filter(i => i.estado === "completado").length;
  const porcentaje  = items.length > 0 ? Math.round((completados / items.length) * 100) : 0;

  if (items.length === 0) return null;

  // Ítems visibles como Set para filtrado rápido
  const itemsVisiblesIds = new Set(items.map(i => i.id));

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{req.titulo}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 100, height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
              <div style={{ width: `${porcentaje}%`, height: "100%", background: porcentaje === 100 ? "var(--green)" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>{completados}/{items.length}</span>
          </div>
        </div>
        {req.estado === "vencido" && (
          <span style={{ fontSize: 11, color: "#C8472A", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>Plazo vencido</span>
        )}
      </div>

      {req.estado === "vencido" && (
        <div style={{ padding: "10px 18px", background: "rgba(200,71,42,0.06)", fontSize: 13, color: "#C8472A", borderBottom: "1px solid var(--border)" }}>
          El plazo venció. Contacta a tu asesor para solicitar una extensión.
        </div>
      )}

      {/* Lista con dividers de sección */}
      <div>
        {gruposOrdenados.map(([key, grupoItems], gIdx) => {
          const visibles = grupoItems.filter(i => itemsVisiblesIds.has(i.id)).sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
          if (visibles.length === 0) return null;
          const primeraArea = grupoItems[0]?.area;
          return (
            <div key={key}>
              {/* Anchor + divider de sección */}
              <div
                id={`seccion-${key}`}
                data-seccion={key}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 18px",
                  background: "var(--surface)",
                  borderBottom: "1px solid var(--border)",
                  borderTop: gIdx > 0 ? "2px solid var(--border-strong)" : "none",
                }}
              >
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--accent)", fontWeight: 700, minWidth: 28 }}>
                  {key}
                </span>
                {primeraArea && (
                  <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 100, background: "rgba(27,79,138,0.1)", fontFamily: "'DM Mono', monospace", color: "#1B4F8A" }}>
                    {primeraArea}
                  </span>
                )}
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginLeft: "auto" }}>
                  {visibles.length} reactivo{visibles.length !== 1 ? "s" : ""}
                </span>
              </div>

              {visibles.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  entidadId={entidadId}
                  contratoId={req.contrato_id ?? undefined}
                  archivosItem={archivos.filter(a => a.requerimiento_item_id === item.id)}
                  canUpload={canUpload}
                  readOnly={readOnly}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fila de item ──────────────────────────────────────────────────────────────

function ItemRow({ item, idx, entidadId, contratoId, archivosItem, canUpload, readOnly, onRefresh }: {
  item: RequerimientoItem; idx: number; entidadId: string; contratoId?: string;
  archivosItem: ArchivoConItemId[]; canUpload: boolean; readOnly?: boolean; onRefresh: () => void;
}) {
  const [open, setOpen]               = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [inputMsg, setInputMsg]       = useState("");
  const [enviando, setEnviando]       = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rowRef    = useRef<HTMLDivElement>(null);

  const handleDownload = async (archivoId: string, key: string, filename: string) => {
    setDownloadingId(archivoId);
    const result = await getDownloadUrlAction(key, filename.split("/").pop() ?? filename);
    setDownloadingId(null);
    if (result.url) { const a = document.createElement("a"); a.href = result.url; a.download = filename.split("/").pop() ?? filename; a.click(); }
  };

  const estado = item.estado ?? "pendiente";
  const st     = ITEM_ESTADO[estado];

  const handleToggle = async () => {
    const nuevo = !open;
    setOpen(nuevo);
    if (nuevo && comentarios === null) {
      setLoadingChat(true);
      const result = await fetchComentariosItemAction(item.id);
      setComentarios(result.data ?? []);
      setLoadingChat(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    setTimeout(() => rowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  useEffect(() => {
    if (comentarios !== null) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comentarios?.length]);

  const handleEnviar = async () => {
    const texto = inputMsg.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    const result = await agregarComentarioAction(item.id, texto);
    if (result.data) { setComentarios(prev => [...(prev ?? []), result.data!]); setInputMsg(""); }
    setEnviando(false);
  };

  const nivelSub = (item.numero?.match(/\./g) || []).length;

  return (
    <div ref={rowRef} style={{ borderBottom: "1px solid var(--border)", borderLeft: nivelSub > 0 ? "2px solid var(--border-strong)" : "none", marginLeft: nivelSub * 14 }}>
      <div onClick={handleToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", cursor: "pointer", background: estado === "completado" ? "rgba(45,166,95,0.025)" : estado === "en_revision" ? "rgba(251,191,36,0.04)" : "transparent", minHeight: 44 }}>
        <span style={{ color: "var(--muted)", flexShrink: 0, display: "inline-flex", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none" }}><ChevronIcon /></span>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: nivelSub > 0 ? "var(--muted-2)" : "var(--muted)", width: nivelSub === 2 ? 54 : 38, flexShrink: 0 }}>{item.numero ?? (idx + 1)}</span>
        <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {item.area && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 100, background: "rgba(27,79,138,0.1)", fontFamily: "'DM Mono', monospace", color: "#1B4F8A" }}>{item.area}</span>}
          {item.rubro && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 100, background: "var(--surface-2)", fontFamily: "'DM Mono', monospace", color: "var(--muted-2)" }}>{item.rubro}</span>}
        </span>
        <span style={{ flex: 1, fontSize: 13, color: "var(--ink)", textDecoration: estado === "completado" ? "line-through" : "none", opacity: estado === "completado" ? 0.55 : 1 }}>{item.nombre}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {archivosItem.length > 0 && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(45,166,95,0.12)", color: "#1B7A3E", fontFamily: "'DM Mono', monospace" }}>{archivosItem.length} archivo{archivosItem.length !== 1 ? "s" : ""}</span>}
          <DeadlineBadge fecha={item.fecha_limite} extendida={item.extendida} />
          {item.fecha_limite && (
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
              {formatFechaCorta(item.fecha_limite)}
              <span style={{
                marginLeft: 4,
                color: diasLabel(item.fecha_limite).startsWith("-") ? "#C8472A" : diasLabel(item.fecha_limite) === "hoy" ? "#92400E" : "var(--muted-2)",
                fontWeight: 600,
              }}>
                · {diasLabel(item.fecha_limite)}
              </span>
            </span>
          )}
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: st.bg, color: st.color, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{st.label}</span>
        </span>
      </div>

      {open && (
        <div style={{ background: "rgba(15,17,23,0.015)", borderTop: "1px solid var(--border)", display: "flex", gap: 0, position: "relative" }}>
          <button onClick={handleClose} title="Cerrar" style={{ position: "absolute", top: 10, right: 10, zIndex: 10, width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

          {/* Columna izquierda */}
          <div style={{ flex: 1, padding: "14px 18px 18px 56px", borderRight: "1px solid var(--border)", minWidth: 0 }}>
            {item.descripcion && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, color: "var(--muted-2)", lineHeight: 1.6 }}>{item.descripcion}</div>
            )}
            {item.fecha_limite && (
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>Plazo:</span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--ink)" }}>{formatFecha(item.fecha_limite)}</span>
                {item.extendida && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(66,153,225,0.12)", color: "#2B6CB0", fontFamily: "'DM Mono', monospace" }}>Tiempo extendido</span>}
              </div>
            )}
            {archivosItem.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Documentos subidos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {archivosItem.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}>
                      <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: "var(--surface-2)", color: "var(--muted-2)", textTransform: "uppercase" }}>{a.tipo.slice(0, 4)}</span>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre.split("/").pop()}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{formatBytes(a.size_bytes)}</span>
                      <button onClick={e => { e.stopPropagation(); handleDownload(a.id, a.ruta_storage, a.nombre); }} disabled={downloadingId === a.id} title="Descargar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, flexShrink: 0, opacity: downloadingId === a.id ? 0.4 : 1, display: "flex" }}><DownloadIcon /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {canUpload && estado !== "completado" && !readOnly ? (
              <div>
                {archivosItem.length === 0 && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Subir documento</div>}
                <UploadZone entidadId={entidadId} contratoId={contratoId} destino="cliente" requerimientoItemId={item.id} onDone={onRefresh} />
                {estado === "en_revision" && <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(251,191,36,0.08)", borderRadius: 6, fontSize: 12, color: "#92400E", border: "1px solid rgba(251,191,36,0.2)" }}>Tu documento está siendo revisado. Puedes subir una versión corregida si te lo solicitan.</div>}
              </div>
            ) : estado === "completado" ? (
              <div style={{ fontSize: 12, color: "#1B7A3E", fontFamily: "'DM Mono', monospace" }}>✓ Documento verificado por el equipo DICA</div>
            ) : archivosItem.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>Sin documentos subidos aún</div>
            ) : null}
          </div>

          {/* Columna derecha: chat */}
          <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: 360 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Mensajes del reactivo</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {loadingChat ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Cargando…</div>
              ) : (comentarios ?? []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Sin mensajes aún</div>
              ) : (
                (comentarios ?? []).map(c => (
                  <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{iniciales(c.usuario_nombre)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{c.usuario_nombre}</span>
                        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{tiempoRelativo(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-2)", lineHeight: 1.5, background: "var(--surface)", padding: "5px 10px", borderRadius: "0 8px 8px 8px", border: "1px solid var(--border)" }}>{c.mensaje}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", flexShrink: 0, background: "var(--card)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <textarea value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }} placeholder="Escribe un mensaje… (Enter)" rows={2} style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, resize: "none", fontFamily: "'DM Sans', sans-serif", color: "var(--ink)", background: "var(--surface)", outline: "none" }} />
                <button onClick={handleEnviar} disabled={!inputMsg.trim() || enviando} style={{ padding: "0 10px", background: "var(--ink)", color: "white", border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0, opacity: (!inputMsg.trim() || enviando) ? 0.4 : 1 }}><SendIcon /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, bg, icon, onClick, active }: {
  label: string; value: number; color: string; bg: string;
  icon: React.ReactNode; onClick?: () => void; active?: boolean;
}) {
  return (
    <div onClick={onClick} style={{ background: active ? bg : "var(--card)", border: `1px solid ${active ? color + "44" : "var(--border)"}`, borderRadius: 8, padding: "14px 16px", cursor: onClick ? "pointer" : "default", transition: "background 0.15s, border-color 0.15s", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 3px rgba(15,17,23,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ color, opacity: 0.7, display: "flex" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>{value}</div>
      {onClick && <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: active ? color : "var(--muted)" }}>{active ? "Clic para limpiar filtro" : "Clic para filtrar"}</div>}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ClockIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }
function ReviewIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }
function CheckIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>; }
function FileIcon()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function SearchIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function ChevronIcon()  { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function SendIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }
function DownloadIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function PanelCollapseIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="5 9 3 9" /><polyline points="15 9 21 9" /><line x1="15" y1="12" x2="21" y2="12" /><line x1="15" y1="15" x2="21" y2="15" /></svg>; }
function PanelExpandIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="13 9 9 9" /></svg>; }
