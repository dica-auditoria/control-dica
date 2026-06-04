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

export function calcularProgresoPerfil(input: {
  tienePrivacidad: boolean;
  datosPersonales?: {
    curp?: string | null;
    rfc?: string | null;
    fecha_nacimiento?: string | null;
  } | null;
  documentosCount?: number;
}): number {
  let total = 0;
  if (input.tienePrivacidad) total += 15;
  const dp = input.datosPersonales;
  if (dp?.curp && dp?.rfc && dp?.fecha_nacimiento) total += 35;
  else if (dp?.curp || dp?.rfc) total += 15;
  const docs = input.documentosCount ?? 0;
  if (docs >= 3) total += 30;
  else if (docs >= 1) total += 15;
  total += 20; // relación laboral siempre completa al alta
  return Math.min(100, total);
}

export async function generarCodigoEmpleado(): Promise<string> {
  const num = Math.floor(100 + Math.random() * 900);
  return `DICA-PC-${num}`;
}
