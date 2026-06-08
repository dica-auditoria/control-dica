import { DOMINIO_EMAIL } from "./constants";

export function generarEmailLocal(
  nombres: string,
  apellidoPaterno: string
): string {
  const primerNombre = nombres.trim().split(/\s+/)[0] ?? "";
  const inicial = primerNombre.charAt(0).toLowerCase();
  const apellido = apellidoPaterno
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  return `${inicial}${apellido}`;
}

export function emailInstitucional(emailLocal: string): string {
  return `${emailLocal}${DOMINIO_EMAIL}`;
}

export function nombreCompleto(
  nombres: string,
  apellidoPaterno: string,
  apellidoMaterno: string
): string {
  return `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
}

export function iniciales(
  nombres: string,
  apellidoPaterno: string
): string {
  const n = nombres.trim().split(/\s+/)[0]?.[0] ?? "";
  const a = apellidoPaterno.trim()[0] ?? "";
  return `${n}${a}`.toUpperCase();
}

// Weights: privacidad 15 + datos 30 + docs 25 + emergencia 10 + laboral 20 = 100
export function calcularProgresoPerfil(input: {
  tienePrivacidad: boolean;
  datosPersonales?: {
    curp?: string | null;
    rfc?: string | null;
    fecha_nacimiento?: string | null;
  } | null;
  documentosCount?: number;
  tieneEmergencia?: boolean;
}): number {
  let total = 0;
  if (input.tienePrivacidad) total += 15;
  const dp = input.datosPersonales;
  if (dp?.curp && dp?.rfc && dp?.fecha_nacimiento) total += 30;
  else if (dp?.curp || dp?.rfc) total += 12;
  const docs = input.documentosCount ?? 0;
  if (docs >= 3) total += 25;
  else if (docs >= 1) total += 12;
  if (input.tieneEmergencia) total += 10;
  total += 20; // relación laboral siempre completa al alta
  return Math.min(100, total);
}

export async function generarCodigoEmpleado(): Promise<string> {
  const num = Math.floor(100 + Math.random() * 900);
  return `DICA-PC-${num}`;
}
