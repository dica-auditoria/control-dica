export type UbicacionTipo = "oficina" | "zona_cliente";

export interface Ubicacion {
  id: string;
  tipo: UbicacionTipo;
  nombre: string;
  entidad_id: string | null;
  entidad_nombre: string | null;
  calle: string | null;
  numero_ext: string | null;
  numero_int: string | null;
  colonia: string | null;
  municipio: string | null;
  estado_dir: string | null;
  cp: string | null;
  pais: string;
  lat: number | null;
  lng: number | null;
  plus_code: string | null;
  radio_metros: number;
  telefono: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

export interface CrearUbicacionInput {
  tipo: UbicacionTipo;
  nombre: string;
  entidad_id?: string | null;
  calle?: string;
  numero_ext?: string;
  numero_int?: string;
  colonia?: string;
  municipio?: string;
  estado_dir?: string;
  cp?: string;
  pais?: string;
  lat?: number | null;
  lng?: number | null;
  plus_code?: string | null;
  radio_metros?: number;
  telefono?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  notas?: string;
}

export interface EntidadOption {
  id: string;
  nombre: string;
}

export interface PlaceData {
  nombre_lugar: string;
  calle: string;
  numero_ext: string;
  colonia: string;
  municipio: string;
  estado_dir: string;
  cp: string;
  pais: string;
  lat: number;
  lng: number;
  plus_code: string;
}
