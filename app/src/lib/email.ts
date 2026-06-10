import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "noreply@controldica.mx";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function baseLayout(body: string): string {
  return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1B4F8A;padding:18px 28px;">
        <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Control DICA</span>
      </div>
      <div style="padding:28px;">${body}</div>
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 28px;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">Control DICA México · Este es un mensaje automático, no respondas a este correo.</p>
      </div>
    </div>`;
}

export interface BienvenidaEmpleadoData {
  email: string;
  nombre: string;
  puesto: string;
  departamento: string;
  codigoEmpleado: string;
  linkPrivacidad?: string;
}

export async function sendBienvenidaEmpleadoEmail(data: BienvenidaEmpleadoData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">¡Bienvenido/a, <strong>${data.nombre}</strong>!</p>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;">
      Tu cuenta en el sistema de gestión de DICA ha sido creada. A continuación tus datos de acceso:
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#374151;margin-bottom:6px;"><strong>Puesto:</strong> ${data.puesto}</div>
      <div style="font-size:13px;color:#374151;margin-bottom:6px;"><strong>Departamento:</strong> ${data.departamento}</div>
      <div style="font-size:13px;color:#374151;"><strong>Código de empleado:</strong> ${data.codigoEmpleado}</div>
    </div>
    ${data.linkPrivacidad ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-top:16px;">
      <p style="font-size:13px;color:#1e40af;margin:0 0 8px;"><strong>Acción requerida:</strong> Acepta el aviso de privacidad para activar tu perfil.</p>
      <a href="${data.linkPrivacidad}" style="display:inline-block;padding:8px 18px;background:#1B4F8A;color:white;text-decoration:none;border-radius:5px;font-size:13px;font-weight:600;">Aceptar aviso de privacidad</a>
    </div>` : ""}
    <p style="font-size:13px;color:#6b7280;margin-top:20px;">
      Ingresa a <a href="https://control.dica-mx.com" style="color:#1B4F8A;">control.dica-mx.com</a> con tu correo institucional.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Bienvenido/a a Control DICA — ${data.nombre}`,
    html,
  }).catch(err => console.error("[email] bienvenida:", err));
}

export interface DocVencimientoData {
  email: string;
  nombreEmpleado: string;
  documentos: Array<{ tipo: string; nombre: string; fecha_vencimiento: string }>;
}

export async function sendDocVencimientoEmail(data: DocVencimientoData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const docsHtml = data.documentos.map(d => {
    const dias = Math.ceil((new Date(d.fecha_vencimiento).getTime() - Date.now()) / 86400000);
    const color = dias <= 7 ? "#dc2626" : "#a16207";
    return `<li style="margin-bottom:8px;font-size:13px;color:#374151;">
      <strong>${d.nombre}</strong> (${d.tipo})
      <span style="color:${color};font-weight:600;"> — vence en ${dias} día${dias !== 1 ? "s" : ""}</span>
    </li>`;
  }).join("");

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.nombreEmpleado}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;">
      Los siguientes documentos de tu expediente están próximos a vencer:
    </p>
    <ul style="margin:0 0 20px;padding-left:20px;">${docsHtml}</ul>
    <p style="font-size:13px;color:#6b7280;">
      Ingresa a <a href="https://control.dica-mx.com/dashboard/mi-expediente" style="color:#1B4F8A;">tu expediente</a> para actualizar los documentos.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `[DICA] Documentos por vencer — ${data.nombreEmpleado}`,
    html,
  }).catch(err => console.error("[email] doc-vencimiento:", err));
}

export interface VacacionesNotifData {
  email: string;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: "aprobado" | "rechazado";
  comentario?: string | null;
}

export async function sendVacacionesNotifEmail(data: VacacionesNotifData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const esAprobado = data.estado === "aprobado";
  const color      = esAprobado ? "#16a34a" : "#dc2626";
  const badge      = esAprobado ? "APROBADA" : "RECHAZADA";

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.nombre}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;">
      Tu solicitud de <strong>${data.tipo}</strong> ha sido revisada:
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;color:${color};margin-bottom:10px;">● ${badge}</div>
      <div style="font-size:13px;color:#374151;margin-bottom:4px;"><strong>Período:</strong> ${fmt(data.fechaInicio)} al ${fmt(data.fechaFin)}</div>
      <div style="font-size:13px;color:#374151;"><strong>Días hábiles:</strong> ${data.dias}</div>
      ${data.comentario ? `<div style="font-size:13px;color:#374151;margin-top:8px;"><strong>Comentario:</strong> ${data.comentario}</div>` : ""}
    </div>
    <p style="font-size:13px;color:#6b7280;">Consulta el historial en <a href="https://control.dica-mx.com/dashboard/mis-vacaciones" style="color:#1B4F8A;">tus vacaciones</a>.</p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `[DICA] Solicitud ${badge.toLowerCase()} — ${data.tipo}`,
    html,
  }).catch(err => console.error("[email] vacaciones:", err));
}

// ── Deadline approaching (3 días) → cliente ──────────────────────────────────

export interface DeadlineApproachingData {
  clienteEmail: string;
  clienteNombre: string;
  items: Array<{ nombre: string; rubro: string | null; fecha_limite: string; contrato: string | null }>;
}

export async function sendDeadlineApproachingEmail(data: DeadlineApproachingData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const fmt = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const itemsHtml = data.items.map(i => `
    <li style="margin-bottom:10px;">
      <span style="font-size:13px;color:#0f1117;font-weight:600;">${i.nombre}</span>
      ${i.rubro ? `<span style="font-size:11px;color:#6b7280;margin-left:6px;">${i.rubro}</span>` : ""}
      ${i.contrato ? `<div style="font-size:12px;color:#6b7280;">Contrato: ${i.contrato}</div>` : ""}
      <div style="font-size:12px;color:#b45309;font-weight:600;">Vence: ${fmt(i.fecha_limite)}</div>
    </li>`).join("");

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.clienteNombre}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
      Los siguientes documentos vencen en <strong>3 días</strong>. Por favor, sube los archivos a tu portal antes de la fecha límite.
    </p>
    <ul style="margin:0 0 20px;padding-left:20px;">${itemsHtml}</ul>
    <p style="font-size:13px;color:#6b7280;">
      Accede a <a href="https://control.dica-mx.com/dashboard" style="color:#1B4F8A;">tu portal</a> para subir los documentos.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `[DICA] ⏰ Documentos por vencer en 3 días`,
    html,
  }).catch(err => console.error("[email] deadline-approaching:", err));
}

// ── Plazo extendido → cliente ─────────────────────────────────────────────────

export interface DeadlineExtendedData {
  clienteEmail: string;
  clienteNombre: string;
  itemNombre: string;
  nuevaFecha: string;
  nota?: string | null;
  contratoNombre?: string | null;
  extendida: boolean;
}

export async function sendDeadlineExtendedEmail(data: DeadlineExtendedData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const fmt = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const tipo = data.extendida ? "extendido" : "actualizado";

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.clienteNombre}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
      El plazo del siguiente documento ha sido <strong>${tipo}</strong>:
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:600;color:#0f1117;margin-bottom:6px;">${data.itemNombre}</div>
      ${data.contratoNombre ? `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Contrato: ${data.contratoNombre}</div>` : ""}
      <div style="font-size:13px;color:#1B4F8A;font-weight:600;">Nueva fecha límite: ${fmt(data.nuevaFecha)}</div>
    </div>
    ${data.nota ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af;"><strong>Nota del equipo DICA:</strong> ${data.nota}</div>` : ""}
    <p style="font-size:13px;color:#6b7280;">
      Accede a <a href="https://control.dica-mx.com/dashboard" style="color:#1B4F8A;">tu portal</a> para subir los documentos.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `[DICA] Plazo ${tipo}: ${data.itemNombre}`,
    html,
  }).catch(err => console.error("[email] deadline-extended:", err));
}

// ── Documento verificado → cliente ────────────────────────────────────────────

export interface ItemCompletadoData {
  clienteEmail: string;
  clienteNombre: string;
  itemNombre: string;
  contratoNombre?: string | null;
}

export async function sendItemCompletadoEmail(data: ItemCompletadoData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.clienteNombre}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
      El siguiente documento ha sido <strong>verificado y aprobado</strong> por el equipo DICA:
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-size:13px;color:#16a34a;font-weight:700;margin-bottom:4px;">✓ Documento verificado</div>
      <div style="font-size:14px;font-weight:600;color:#0f1117;">${data.itemNombre}</div>
      ${data.contratoNombre ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">Contrato: ${data.contratoNombre}</div>` : ""}
    </div>
    <p style="font-size:13px;color:#6b7280;">
      Revisa el estado de todos tus documentos en <a href="https://control.dica-mx.com/dashboard" style="color:#1B4F8A;">tu portal</a>.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `[DICA] ✓ Documento verificado: ${data.itemNombre}`,
    html,
  }).catch(err => console.error("[email] item-completado:", err));
}

// ── Reactivos en retraso → empleado ──────────────────────────────────────────

export interface EnRetrasoData {
  empleadoEmail: string;
  empleadoNombre: string;
  items: Array<{ nombre: string; entidad: string; contrato: string | null; fecha_limite: string; diasRetraso: number }>;
}

export async function sendEnRetrasoEmail(data: EnRetrasoData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const fmt = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  const itemsHtml = data.items.map(i => `
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:8px 12px;font-size:13px;color:#0f1117;">${i.nombre}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${i.entidad}${i.contrato ? ` / ${i.contrato}` : ""}</td>
      <td style="padding:8px 12px;font-size:12px;color:#dc2626;font-weight:600;">+${i.diasRetraso}d (${fmt(i.fecha_limite)})</td>
    </tr>`).join("");

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.empleadoNombre}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
      Los siguientes reactivos tienen <strong>retraso</strong> en la entrega de documentos:
    </p>
    <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Reactivo</th>
            <th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Cliente</th>
            <th style="padding:8px 12px;font-size:11px;text-align:left;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Retraso</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
    <p style="font-size:13px;color:#6b7280;">
      Revisa el estado en <a href="https://control.dica-mx.com/dashboard/pendientes" style="color:#1B4F8A;">la vista de pendientes</a>.
    </p>
  `);

  await resend.emails.send({
    from: FROM,
    to: data.empleadoEmail,
    subject: `[DICA] ${data.items.length} reactivo${data.items.length !== 1 ? "s" : ""} con retraso`,
    html,
  }).catch(err => console.error("[email] en-retraso:", err));
}

// ── Requerimiento ─────────────────────────────────────────────────────────────

export interface RequerimientoEmailData {
  clienteEmail: string;
  clienteNombre: string;
  titulo: string;
  descripcion?: string | null;
  fechaLimite: string;
  items: Array<{ nombre: string; obligatorio: boolean }>;
  contratoNombre?: string | null;
}

export async function sendRequerimientoEmail(data: RequerimientoEmailData): Promise<void> {
  const resend = getResend();
  if (!resend) return; // silent when not configured

  const fecha = new Date(data.fechaLimite + "T12:00:00").toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const itemsHtml = data.items.length
    ? `<ul style="margin:12px 0;padding-left:20px;">
        ${data.items.map(i => `<li style="margin-bottom:6px;">${i.nombre}${i.obligatorio ? ' <span style="color:#c8472a;font-size:11px;">(obligatorio)</span>' : ""}</li>`).join("")}
       </ul>`
    : "";

  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#0f1117;padding:20px 28px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Control DICA</span>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 8px;font-size:15px;color:#0f1117;">Hola <strong>${data.clienteNombre}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#4b5563;">
          Se ha creado un nuevo requerimiento de documentos que requiere tu atención antes del <strong>${fecha}</strong>.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
          <div style="font-size:16px;font-weight:600;color:#0f1117;margin-bottom:4px;">${data.titulo}</div>
          ${data.contratoNombre ? `<div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Contrato: ${data.contratoNombre}</div>` : ""}
          ${data.descripcion ? `<p style="font-size:13px;color:#374151;margin:8px 0 0;">${data.descripcion}</p>` : ""}
        </div>
        ${itemsHtml ? `<p style="font-size:13px;font-weight:600;color:#0f1117;margin:0 0 4px;">Documentos solicitados:</p>${itemsHtml}` : ""}
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-top:16px;">
          <span style="font-size:13px;color:#92400e;">
            <strong>Fecha límite:</strong> ${fecha}
          </span>
        </div>
        <p style="font-size:13px;color:#6b7280;margin-top:20px;">
          Ingresa a tu portal para subir los documentos y marcar el requerimiento como enviado.
        </p>
      </div>
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 28px;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">Control DICA México · Este es un mensaje automático, no respondas a este correo.</p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to: data.clienteEmail,
    subject: `[Requerimiento] ${data.titulo} — vence ${fecha}`,
    html,
  }).catch(err => {
    console.error("[email] Error al enviar notificación:", err);
  });
}
