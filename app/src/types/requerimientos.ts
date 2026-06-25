export type RequerimientoEstado = "pendiente" | "en_revision" | "completado" | "vencido";

export type ItemEstado = "pendiente" | "en_revision" | "parcial" | "completado";

export interface RequerimientoItem {
  id: string;
  requerimiento_id: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  completado: boolean;
  estado: ItemEstado;
  area: string | null;
  rubro: string | null;
  orden: number | null;
  numero: string | null;
  fecha_limite: string | null;
  extendida: boolean;
  created_at: string;
}

export interface Requerimiento {
  id: string;
  contrato_id: string | null;
  entidad_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string;
  estado: RequerimientoEstado;
  creado_por: string;
  notas_cierre: string | null;
  created_at: string;
  items: RequerimientoItem[];
  archivos_count: number;
  entidad_nombre?: string;
  contrato_nombre?: string;
}

export interface CrearRequerimientoInput {
  contratoId?: string;
  entidadId: string;
  titulo: string;
  descripcion?: string;
  fechaLimite: string;
  items: Array<{ nombre: string; descripcion?: string; obligatorio: boolean }>;
}
