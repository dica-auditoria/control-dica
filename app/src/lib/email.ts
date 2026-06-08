import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "noreply@controldica.mx";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
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
