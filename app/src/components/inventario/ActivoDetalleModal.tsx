"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  fetchLogActivoAction,
  fetchArchivosActivoAction,
  agregarArchivoActivoAction,
  eliminarArchivoActivoAction,
  getArchivoUrlAction,
} from "@/app/actions/inventario";
import type { InventarioActivo, ActivoLogEntry, ActivoArchivo } from "@/types/inventario";

const BUCKET = "inventario-archivos";

const LOG_LABELS: Record<string, { icon: string; color: string }> = {
  REGISTRO:          { icon: "✚", color: "var(--green)" },
  ACTUALIZACIÓN:     { icon: "✏", color: "#1677ff" },
  ASIGNACIÓN:        { icon: "👤", color: "var(--green)" },
  DEVOLUCIÓN:        { icon: "↩", color: "var(--amber)" },
  FOTO_AGREGADA:     { icon: "📷", color: "#1677ff" },
  DOCUMENTO_AGREGADO:{ icon: "📎", color: "#1677ff" },
  ARCHIVO_ELIMINADO: { icon: "🗑", color: "var(--accent)" },
};

interface Props {
  activo: InventarioActivo;
  onClose: () => void;
}

type Tab = "datos" | "archivos" | "log";

export default function ActivoDetalleModal({ activo, onClose }: Props) {
  const [tab, setTab]         = useState<Tab>("datos");
  const [log, setLog]         = useState<ActivoLogEntry[]>([]);
  const [archivos, setArchivos] = useState<ActivoArchivo[]>([]);
  const [loadedLog, setLoadedLog]   = useState(false);
  const [loadedArch, setLoadedArch] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmArch, setConfirmArch] = useState<ActivoArchivo | null>(null);

  useEffect(() => {
    if (tab === "log" && !loadedLog) {
      startTransition(async () => {
        const r = await fetchLogActivoAction(activo.id);
        if (r.data) { setLog(r.data); setLoadedLog(true); }
      });
    }
    if (tab === "archivos" && !loadedArch) {
      startTransition(async () => {
        const r = await fetchArchivosActivoAction(activo.id);
        if (r.data) { setArchivos(r.data); setLoadedArch(true); }
      });
    }
  }, [activo.id, loadedArch, loadedLog, tab]);

  const handleUpload = async (file: File, tipo: "foto" | "documento") => {
    setUploading(true); setUploadError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const ruta = `activos/${activo.id}/${tipo}s/${crypto.randomUUID()}.${ext}`;

    const { error: storageErr } = await supabase.storage.from(BUCKET).upload(ruta, file, { upsert: false });
    if (storageErr) { setUploading(false); setUploadError("Error al subir: " + storageErr.message); return; }

    startTransition(async () => {
      const r = await agregarArchivoActivoAction(activo.id, tipo, file.name, ruta);
      setUploading(false);
      if (r.error) { setUploadError(r.error); return; }
      if (r.data) setArchivos(prev => [...prev, r.data as ActivoArchivo]);
    });
  };

  const handleEliminarArchivo = (arch: ActivoArchivo) => {
    setConfirmArch(arch);
    setConfirmOpen(true);
  };

  const doEliminarArchivo = () => {
    if (!confirmArch) return;
    setConfirmOpen(false);
    startTransition(async () => {
      await eliminarArchivoActivoAction(confirmArch.id, activo.id, confirmArch.ruta);
      setArchivos(prev => prev.filter(a => a.id !== confirmArch.id));
      setConfirmArch(null);
    });
  };

  const handleDescargar = async (arch: ActivoArchivo) => {
    const r = await getArchivoUrlAction(arch.ruta);
    if (r.url) window.open(r.url, "_blank");
  };

  const fotos = archivos.filter(a => a.tipo === "foto");
  const docs  = archivos.filter(a => a.tipo === "documento");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,17,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 8, width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(15,17,23,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>{activo.categoria_icono ?? "📦"}</span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{activo.nombre}</h2>
              {activo.numero_activo && <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--green)", fontWeight: 700 }}>{activo.numero_activo}</span>}
            </div>
            <div style={{ fontSize: 12, color: "rgba(15,17,23,0.45)", marginTop: 3 }}>
              {[activo.categoria_nombre, activo.marca, activo.modelo].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "rgba(15,17,23,0.4)", flexShrink: 0 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0, paddingLeft: 22 }}>
          {([["datos","📋 Datos"],["archivos","📁 Fotos y documentos"],["log","📜 Historial"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 16px", border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none", fontSize: 12, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--accent)" : "rgba(15,17,23,0.5)",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px" }}>
          {tab === "datos" && <TabDatos activo={activo} />}
          {tab === "archivos" && (
            <TabArchivos
              fotos={fotos} docs={docs} uploading={uploading} uploadError={uploadError}
              onUpload={handleUpload} onEliminar={handleEliminarArchivo} onDescargar={handleDescargar}
            />
          )}
          {tab === "log" && <TabLog log={log} cargado={loadedLog} isPending={isPending} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar archivo"
        message={`¿Eliminar "${confirmArch?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={doEliminarArchivo}
        onCancel={() => { setConfirmOpen(false); setConfirmArch(null); }}
      />
    </div>
  );
}

// ── Tab: Datos ────────────────────────────────────────────────────────────────

function TabDatos({ activo }: { activo: InventarioActivo }) {
  const COND: Record<string, string> = { nuevo:"Nuevo", bueno:"Bueno", regular:"Regular", deteriorado:"Deteriorado", danado:"Dañado" };
  const ADQUI: Record<string, string> = { propio:"Propio", renta:"Renta" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 40px" }}>
      <DR label="Nombre"         value={activo.nombre} />
      <DR label="Categoría"      value={activo.categoria_nombre} icon={activo.categoria_icono ?? undefined} />
      <DR label="Marca"          value={activo.marca} />
      <DR label="Modelo"         value={activo.modelo} />
      <DR label="Número de activo" value={activo.numero_activo} mono />
      <DR label="Número de serie"  value={activo.numero_serie} mono />
      <DR label="Condición"      value={activo.condicion ? COND[activo.condicion] : null} />
      <DR label="Tipo de adquisición" value={activo.tipo_adquisicion ? ADQUI[activo.tipo_adquisicion] : null} />
      <DR label="Fecha de registro" value={activo.fecha_registro ? new Date(activo.fecha_registro + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : null} />
      {activo.sistema_operativo && <DR label="Sistema operativo" value={activo.sistema_operativo} />}
      {activo.ubicacion_nombre && <DR label="Ubicación" value={activo.ubicacion_nombre} />}
      {activo.empleado_nombre && (
        <DR label="Asignado a" value={`${activo.empleado_nombre}${activo.fecha_asignacion ? ` · desde ${new Date(activo.fecha_asignacion + "T12:00:00").toLocaleDateString("es-MX")}` : ""}`} />
      )}
      {activo.descripcion && (
        <div style={{ gridColumn: "1 / -1" }}>
          <DR label="Descripción / Especificaciones" value={activo.descripcion} />
        </div>
      )}
      {activo.observaciones_fisicas && (
        <div style={{ gridColumn: "1 / -1" }}>
          <DR label="Observaciones físicas" value={activo.observaciones_fisicas} />
        </div>
      )}
      {activo.notas && (
        <div style={{ gridColumn: "1 / -1" }}>
          <DR label="Notas" value={activo.notas} />
        </div>
      )}
    </div>
  );
}

function DR({ label, value, mono, icon }: { label: string; value: string | null | undefined; mono?: boolean; icon?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(15,17,23,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--ink)" : "rgba(15,17,23,0.25)", fontFamily: mono ? "'DM Mono', monospace" : undefined }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {value ?? "—"}
      </div>
    </div>
  );
}

// ── Tab: Archivos ─────────────────────────────────────────────────────────────

function TabArchivos({ fotos, docs, uploading, uploadError, onUpload, onEliminar, onDescargar }: {
  fotos: ActivoArchivo[]; docs: ActivoArchivo[];
  uploading: boolean; uploadError: string | null;
  onUpload: (file: File, tipo: "foto" | "documento") => void;
  onEliminar: (a: ActivoArchivo) => void;
  onDescargar: (a: ActivoArchivo) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {uploadError && <div style={{ padding: 10, background: "var(--red-light)", color: "var(--accent)", borderRadius: 4, fontSize: 13 }}>{uploadError}</div>}

      {/* Fotos */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>📷 Fotos ({fotos.length})</div>
          <UploadBtn tipo="foto" uploading={uploading} onUpload={onUpload} accept="image/jpeg,image/png,image/webp" label="+ Agregar foto" />
        </div>
        {fotos.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", background: "var(--surface)", borderRadius: 6, fontSize: 13, color: "rgba(15,17,23,0.35)" }}>Sin fotos</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 10 }}>
            {fotos.map(f => (
              <div key={f.id} style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>
                <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🖼</div>
                <div style={{ padding: "6px 8px", borderTop: "1px solid var(--border)", display: "flex", gap: 4 }}>
                  <button onClick={() => onDescargar(f)} style={btnMini}>Ver</button>
                  <button onClick={() => onEliminar(f)} style={{ ...btnMini, color: "var(--accent)" }}>✕</button>
                </div>
                <div style={{ padding: "0 8px 6px", fontSize: 10, color: "rgba(15,17,23,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nombre}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentos */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>📎 Documentos ({docs.length})</div>
          <UploadBtn tipo="documento" uploading={uploading} onUpload={onUpload} accept=".pdf,image/*" label="+ Agregar doc" />
        </div>
        {docs.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", background: "var(--surface)", borderRadius: 6, fontSize: 13, color: "rgba(15,17,23,0.35)" }}>Sin documentos</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ flex: 1, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nombre}</div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onDescargar(d)} style={btnMini}>Descargar</button>
                  <button onClick={() => onEliminar(d)} style={{ ...btnMini, color: "var(--accent)" }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadBtn({ tipo, uploading, onUpload, accept, label }: {
  tipo: "foto" | "documento"; uploading: boolean;
  onUpload: (f: File, t: "foto" | "documento") => void;
  accept: string; label: string;
}) {
  return (
    <label style={{ padding: "6px 12px", background: "var(--green)", color: "white", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
      {uploading ? "Subiendo…" : label}
      <input type="file" accept={accept} style={{ display: "none" }} disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, tipo); e.target.value = ""; }} />
    </label>
  );
}

// ── Tab: Log ──────────────────────────────────────────────────────────────────

function TabLog({ log, cargado, isPending }: { log: ActivoLogEntry[]; cargado: boolean; isPending: boolean }) {
  if (!cargado || isPending) return <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(15,17,23,0.35)", fontSize: 13 }}>Cargando historial…</div>;
  if (!log.length) return <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(15,17,23,0.35)", fontSize: 13 }}>Sin eventos registrados</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {log.map((entry, i) => {
        const meta = LOG_LABELS[entry.accion] ?? { icon: "•", color: "rgba(15,17,23,0.4)" };
        const fecha = new Date(entry.created_at).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={entry.id} style={{ display: "flex", gap: 14, paddingBottom: i < log.length - 1 ? 18 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${meta.color}18`, border: `1px solid ${meta.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{meta.icon}</div>
              {i < log.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{entry.accion.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(15,17,23,0.4)", marginTop: 2 }}>
                {entry.usuario_nombre ? `${entry.usuario_nombre} · ` : ""}{fecha}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const btnMini: React.CSSProperties = { padding: "3px 8px", background: "white", border: "1px solid var(--border-strong)", borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: "rgba(15,17,23,0.65)" };
