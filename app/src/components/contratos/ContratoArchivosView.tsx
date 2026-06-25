"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadZone from "@/components/archivos/UploadZone";
import ArchivoExplorer from "@/components/archivos/ArchivoExplorer";
import RequerimientosTab from "@/components/requerimientos/RequerimientosTab";
import RequerimientosClienteSection from "@/components/requerimientos/RequerimientosClienteSection";
import type { ClienteArchivo } from "@/components/archivos/ClienteArchivosTable";
import type { ArchivoContratoItem } from "@/app/actions/archivos";
import type { Contrato } from "@/types/contratos";
import type { Requerimiento } from "@/types/requerimientos";

type TabDestino = "cliente" | "empleado" | "portal";

interface Props {
  contrato: Contrato;
  entidadNombre: string;
  entidadId: string;
  archivosCliente: ArchivoContratoItem[];
  archivosEmpleado: ArchivoContratoItem[];
  requerimientos: Requerimiento[];
  rol: string;
  usuarioActualId?: string;
}

export default function ContratoArchivosView({
  contrato, entidadNombre, entidadId, archivosCliente, archivosEmpleado, requerimientos, rol, usuarioActualId,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabDestino>("cliente");
  const [uploadOpen, setUploadOpen] = useState(false);

  const isAdmin = rol === "admin" || rol === "superadmin";
  const isEmpleado = rol === "empleado" || rol === "rrhh";
  // Employees can upload/manage only in the "empleado" tab; nobody uploads in portal view
  const canUpload = tab !== "portal" && (isAdmin || (isEmpleado && tab === "empleado"));
  const explorerIsAdmin = isAdmin || (isEmpleado && tab === "empleado");
  const archivos = tab === "empleado" ? archivosEmpleado : archivosCliente;
  const requerimientosActivos = requerimientos.filter(r => r.estado !== "completado").length;

  const dirección = [
    contrato.calle && `${contrato.calle}${contrato.numero_exterior ? " " + contrato.numero_exterior : ""}`,
    contrato.colonia,
    contrato.municipio,
    contrato.estado_republica,
  ].filter(Boolean).join(", ");

  const handleUploadDone = () => {
    setUploadOpen(false);
    router.refresh();
  };

  // Close upload panel when switching to a tab where upload is not allowed
  const handleTabChange = (t: TabDestino) => {
    setTab(t);
    if (t === "portal" || (isEmpleado && t === "cliente")) setUploadOpen(false);
  };

  const tabConfig: Record<"cliente" | "empleado", { label: string; emptyMsg: string; uploadLabel: string }> = {
    cliente: {
      label: "Clientes",
      emptyMsg: "Sin archivos para clientes",
      uploadLabel: "Subir archivo de cliente",
    },
    empleado: {
      label: "Empleados",
      emptyMsg: "Sin archivos para empleados",
      uploadLabel: "Subir archivo de empleado",
    },
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: "20px 32px 0",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingBottom: 14 }}>
          {/* Breadcrumb + título */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Link href="/dashboard/directorio" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13, flexShrink: 0 }}>
              Directorio
            </Link>
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>/</span>
            <Link href={`/dashboard/directorio/empresa/${entidadId}`} style={{ color: "var(--muted-2)", textDecoration: "none", fontSize: 13, flexShrink: 0 }}>
              {entidadNombre}
            </Link>
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>/</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {contrato.nombre}
              </div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginTop: 2 }}>
                {contrato.numero_contrato && `${contrato.numero_contrato} · `}
                {archivosCliente.length + archivosEmpleado.length} archivo{archivosCliente.length + archivosEmpleado.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Badge estado + botón subir */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <EstadoBadge estado={contrato.estado} />
            {canUpload && (
              <button
                onClick={() => setUploadOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", background: "var(--ink)", color: "white",
                  border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <UploadIcon /> {tabConfig[tab].uploadLabel}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {(["cliente", "empleado"] as ("cliente" | "empleado")[]).map(t => {
            const count = t === "cliente" ? archivosCliente.length : archivosEmpleado.length;
            const isActive = tab === t;
            return (
              <button key={t} onClick={() => handleTabChange(t)}
                style={{ padding: "8px 18px", border: "none", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent", background: "none", color: isActive ? "var(--accent)" : "var(--muted-2)", fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1, display: "flex", alignItems: "center", gap: 8 }}>
                {tabConfig[t].label}
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: isActive ? "rgba(200,71,42,0.1)" : "var(--surface-2)", color: isActive ? "var(--accent)" : "var(--muted)" }}>{count}</span>
                {t === "cliente" && requerimientosActivos > 0 && (
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: isActive ? "rgba(200,71,42,0.1)" : "rgba(255,193,7,0.15)", color: isActive ? "var(--accent)" : "#B8860B" }}>{requerimientosActivos} req.</span>
                )}
              </button>
            );
          })}
          {requerimientos.length > 0 && (
            <button onClick={() => handleTabChange("portal")}
              style={{ padding: "8px 18px", border: "none", borderBottom: tab === "portal" ? "2px solid #1B4F8A" : "2px solid transparent", background: "none", color: tab === "portal" ? "#1B4F8A" : "var(--muted-2)", fontSize: 13, fontWeight: tab === "portal" ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1, display: "flex", alignItems: "center", gap: 8 }}>
              Vista Portal
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 100, background: tab === "portal" ? "rgba(27,79,138,0.1)" : "var(--surface-2)", color: tab === "portal" ? "#1B4F8A" : "var(--muted)" }}>{requerimientosActivos}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Vista Portal ── */}
      {tab === "portal" ? (
        <div style={{ padding: "24px 32px" }}>
          <RequerimientosClienteSection
            requerimientos={requerimientos}
            entidadId={entidadId}
            archivos={archivosCliente as unknown as (ClienteArchivo & { requerimiento_item_id: string | null })[]}
            areaUsuario={null}
            readOnly={true}
          />
        </div>
      ) : (
        <div style={{ padding: "24px 32px" }}>
          {/* Info contrato */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
            padding: "14px 20px", marginBottom: 20,
            display: "flex", gap: 32, flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
          }}>
            {contrato.fecha_inicio && (
              <InfoItem label="Vigencia">
                {new Date(contrato.fecha_inicio + "T12:00:00").toLocaleDateString("es-MX")}
                {contrato.fecha_fin && ` — ${new Date(contrato.fecha_fin + "T12:00:00").toLocaleDateString("es-MX")}`}
              </InfoItem>
            )}
            {dirección && <InfoItem label="Dirección">{dirección}</InfoItem>}
          </div>

          {/* Upload zone */}
          {uploadOpen && (
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
              padding: "20px 24px", marginBottom: 20,
              boxShadow: "0 1px 3px rgba(15,17,23,0.06)",
            }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
                {tabConfig[tab as "cliente" | "empleado"].uploadLabel}
              </div>
              <UploadZone
                entidadId={entidadId}
                contratoId={contrato.id}
                destino={tab as "cliente" | "empleado"}
                onDone={handleUploadDone}
              />
            </div>
          )}

          {/* Requerimientos — solo en tab cliente */}
          {tab === "cliente" && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)", marginBottom: 20 }}>
              <RequerimientosTab
                requerimientos={requerimientos}
                archivos={archivosCliente}
                entidadId={entidadId}
                contratoId={contrato.id}
                isSuperAdmin={rol === "superadmin"}
                rol={rol}
                usuarioActualId={usuarioActualId}
              />
            </div>
          )}

          {/* Tabla archivos */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,17,23,0.06)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                Archivos — {tabConfig[tab as "cliente" | "empleado"].label}
              </div>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "1px 7px", borderRadius: 100, background: "var(--surface-2)", color: "var(--muted-2)" }}>
                {archivos.length}
              </span>
            </div>
            <ArchivoExplorer
              archivos={archivos}
              isAdmin={explorerIsAdmin}
              entidadId={entidadId}
              contratoId={contrato.id}
              destino={tab as "cliente" | "empleado"}
              nombreZip={`${contrato.nombre}-${tab}`}
              emptyMsg={canUpload
                ? `${tabConfig[tab as "cliente" | "empleado"].emptyMsg} — usa el botón "Subir" para agregar`
                : tabConfig[tab as "cliente" | "empleado"].emptyMsg}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink)" }}>{children}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    vigente:   { bg: "var(--green-light)",  color: "var(--green)" },
    vencido:   { bg: "var(--surface-2)",    color: "var(--muted)" },
    cancelado: { bg: "var(--red-light)",    color: "var(--accent)" },
  };
  const s = map[estado] ?? map.vencido;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace", background: s.bg, color: s.color }}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}



function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}
