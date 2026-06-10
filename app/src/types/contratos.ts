export type ContratoEstado = "vigente" | "vencido" | "cancelado";

export interface Contrato {
  id: string;
  entidad_id: string;
  nombre: string;
  numero_contrato: string | null;
  concepto: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: ContratoEstado;
  calle: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  colonia: string | null;
  municipio: string | null;
  estado_republica: string | null;
  cp: string | null;
  referencias: string | null;
  created_at: string;
  updated_at: string;
  // Computed field (not in DB), populated by fetchClienteConContratosAction
  totalReactivos?: number;
}

export interface CrearContratoInput {
  entidad_id: string;
  nombre: string;
  numero_contrato?: string;
  concepto?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: ContratoEstado;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  estado_republica?: string;
  cp?: string;
  referencias?: string;
}

export interface ActualizarContratoInput extends Partial<Omit<CrearContratoInput, "entidad_id">> {
  id: string;
}

export interface UsuarioAcceso {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  created_at: string;
}

export interface ClienteConContratos {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  contratos: Contrato[];
  totalRequerimientos: number;
  requerimientosActivos: number;
  totalReactivos: number;
  totalUsuarios: number;
}

export interface EmpleadoAcceso {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  departamento: string;
  email_institucional: string | null;
  tiene_acceso: boolean;
}
