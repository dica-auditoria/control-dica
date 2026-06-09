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
