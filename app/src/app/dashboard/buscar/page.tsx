"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { buscarGlobalAction, type ResultadoBusqueda } from "@/app/actions/buscar";

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); setBuscado(false); return; }
    setBuscando(true);
    const { data } = await buscarGlobalAction(q);
    setResultados(data);
    setBuscado(true);
    setBuscando(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length >= 2) {
      timerRef.current = setTimeout(() => buscar(val), 350);
    } else {
      setResultados([]);
      setBuscado(false);
    }
  };

  const grupos = {
    cliente: resultados.filter(r => r.tipo === "cliente"),
    contrato: resultados.filter(r => r.tipo === "contrato"),
    archivo: resultados.filter(r => r.tipo === "archivo"),
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "var(--ink)", margin: 0 }}>Búsqueda</h1>
        <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
          Archivos, clientes y contratos
        </p>
      </div>

      {/* Search input */}
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
          <SearchIcon />
        </div>
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Buscar por nombre, contrato o empresa…"
          style={{
            width: "100%", padding: "12px 16px 12px 42px",
            fontSize: 15, color: "var(--ink)",
            border: "1.5px solid var(--border-strong)", borderRadius: 8,
            outline: "none", fontFamily: "'DM Sans', sans-serif",
            background: "var(--card)", boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15,17,23,0.06)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        />
        {buscando && (
          <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>
            <SpinnerIcon />
          </div>
        )}
      </div>

      {/* Results */}
      {!buscado && !buscando && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          Escribe al menos 2 caracteres para buscar
        </div>
      )}

      {buscado && resultados.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          Sin resultados para &ldquo;{query}&rdquo;
        </div>
      )}

      {buscado && resultados.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {grupos.cliente.length > 0 && (
            <GrupoResultados titulo="Clientes" items={grupos.cliente} onNavigate={href => router.push(href)} />
          )}
          {grupos.contrato.length > 0 && (
            <GrupoResultados titulo="Contratos" items={grupos.contrato} onNavigate={href => router.push(href)} />
          )}
          {grupos.archivo.length > 0 && (
            <GrupoResultados titulo="Archivos" items={grupos.archivo} onNavigate={href => router.push(href)} />
          )}
        </div>
      )}
    </div>
  );
}

function GrupoResultados({ titulo, items, onNavigate }: { titulo: string; items: ResultadoBusqueda[]; onNavigate: (href: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
        {titulo} · {items.length}
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.href)}
            style={{
              padding: "12px 16px", cursor: "pointer",
              borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(15,17,23,0.02)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <TipoIcon tipo={item.tipo} extra={item.extra} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.titulo}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.subtitulo}
              </div>
            </div>
            {item.extra && item.tipo !== "archivo" && (
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "2px 7px", borderRadius: 3, background: "var(--surface-2)", color: "var(--muted-2)", textTransform: "uppercase", flexShrink: 0 }}>
                {item.extra}
              </span>
            )}
            <ChevronRightIcon />
          </div>
        ))}
      </div>
    </div>
  );
}

function TipoIcon({ tipo, extra }: { tipo: string; extra?: string }) {
  if (tipo === "cliente") return (
    <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(33,150,243,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <BuildingIcon />
    </div>
  );
  if (tipo === "contrato") return (
    <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(45,166,95,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <DocIcon />
    </div>
  );
  const ext = (extra ?? "").toLowerCase();
  const colors: Record<string, string> = { pdf: "#E44", xlsx: "#2D6A4F", docx: "#2B5CE6", zip: "#C87941", csv: "#2D6A4F", png: "#9B59B6", jpg: "#9B59B6" };
  const color = colors[ext] ?? "#888";
  return (
    <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, fontFamily: "'DM Mono', monospace", color, textTransform: "uppercase" }}>
      {(extra ?? "???").slice(0, 3)}
    </div>
  );
}

function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function ChevronRightIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(15,17,23,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>; }
function BuildingIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 22V12h6v10" /><path d="M3 9h18" /></svg>; }
function DocIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B7A3E" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function SpinnerIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(15,17,23,0.3)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>; }
