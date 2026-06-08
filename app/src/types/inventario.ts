export type ActivoEstado = "disponible" | "asignado" | "mantenimiento" | "baja";
export type ActivoCondicion = "nuevo" | "bueno" | "regular" | "deteriorado" | "danado";

export interface InventarioCategoria {
  id: string;
  nombre: string;
  icono: string;
}

export interface InventarioActivo {
  id: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
  categoria_icono: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  numero_activo: string | null;
  descripcion: string | null;
  fecha_registro: string | null;
  condicion: ActivoCondicion | null;
  sistema_operativo: string | null;
  procesador: string | null;
  ram: string | null;
  almacenamiento: string | null;
  cargador: string | null;
  tipo_adquisicion: "propio" | "renta" | null;
  ubicacion_id: string | null;
  ubicacion_nombre: string | null;
  observaciones_fisicas: string | null;
  estado: ActivoEstado;
  notas: string | null;
  created_at: string;
  // asignación activa (computed)
  asignacion_id: string | null;
  empleado_id: string | null;
  empleado_nombre: string | null;
  fecha_asignacion: string | null;
}

export interface ActivoLogEntry {
  id: string;
  accion: string;
  detalle: Record<string, unknown> | null;
  usuario_nombre: string | null;
  created_at: string;
}

export interface ActivoArchivo {
  id: string;
  tipo: "foto" | "documento";
  nombre: string;
  ruta: string;
  created_at: string;
}

export interface AsignacionActivo {
  id: string;
  activo_id: string;
  activo_nombre: string;
  categoria_nombre: string | null;
  categoria_icono: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  numero_activo: string | null;
  fecha_asignacion: string;
  notas: string | null;
}

export interface CrearActivoInput {
  categoria_id: string | null;
  nombre: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  numero_activo?: string;
  descripcion?: string;
  fecha_registro?: string;
  condicion?: string;
  sistema_operativo?: string;
  procesador?: string;
  ram?: string;
  almacenamiento?: string;
  cargador?: string;
  tipo_adquisicion?: string;
  ubicacion_id?: string | null;
  observaciones_fisicas?: string;
  notas?: string;
  // asignación al crear (opcional)
  asignar_empleado_id?: string | null;
  asignar_notas?: string;
}
