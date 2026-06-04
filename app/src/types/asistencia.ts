export type AsistenciaTipo = "entrada" | "salida";

export interface RegistroAsistencia {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  empleado_codigo: string | null;
  ubicacion_id: string | null;
  ubicacion_nombre: string | null;
  tipo: AsistenciaTipo;
  lat: number | null;
  lng: number | null;
  distancia_metros: number | null;
  dentro_radio: boolean | null;
  notas: string | null;
  created_at: string;
}

export interface RegistrarAsistenciaInput {
  empleado_id: string;
  tipo: AsistenciaTipo;
  lat?: number | null;
  lng?: number | null;
  ubicacion_id?: string | null;
  notas?: string;
}

export interface EmpleadoAsistenciaOption {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  codigo_empleado: string | null;
  estado: string;
}
