export type EmpleadoEstado = "pendiente" | "activo" | "inactivo";
export type TipoContrato = "indeterminado" | "temporal" | "honorarios" | "practicas";
export type DocumentoEstado = "pendiente" | "vigente" | "por_vencer" | "vencido";

export interface EmpleadoListItem {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  email_institucional: string;
  puesto: string;
  departamento: string;
  estado: EmpleadoEstado;
  progreso_perfil: number;
  fecha_ingreso: string;
  codigo_empleado: string | null;
}

export interface EmpleadoDetalle extends EmpleadoListItem {
  email_local: string;
  tipo_contrato: TipoContrato;
  zona_ubicacion: string | null;
  supervisor_id: string | null;
  supervisor_nombre: string | null;
  foto_url: string | null;
  created_at: string;
  tiene_privacidad: boolean;
  hora_entrada: string | null;
  hora_salida: string | null;
  tolerancia_minutos: number;
  datos_personales: EmpleadoDatosPersonales | null;
  documentos: EmpleadoDocumento[];
  bitacora: EmpleadoBitacoraEntry[];
}

export interface EmpleadoDatosPersonales {
  fecha_nacimiento: string | null;
  curp: string | null;
  rfc: string | null;
  nss: string | null;
  fecha_alta_imss: string | null;
  estado_civil: string | null;
  nacionalidad: string | null;
  tipo_sangre: string | null;
}

export interface EmpleadoDocumento {
  id: string;
  tipo: string;
  nombre: string;
  numero_documento: string | null;
  fecha_vencimiento: string | null;
  estado: DocumentoEstado;
  ruta_archivo: string | null;
}

export interface EmpleadoBitacoraEntry {
  id: string;
  accion: string;
  detalle_json: Record<string, unknown> | null;
  created_at: string;
}

export interface EmpleadosStats {
  activos: number;
  perfilesIncompletos: number;
  documentosPorVencer: number;
  capacitacionesPendientes: number;
  nuevosEsteMes: number;
}

export interface CrearEmpleadoInput {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  email_local: string;
  puesto: string;
  departamento: string;
  supervisor_id: string | null;
  fecha_ingreso: string;
  tipo_contrato: TipoContrato;
  zona_ubicacion: string;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  password?: string;
}

export interface InvitacionEmpleadoInfo {
  empleado_id: string;
  nombre_completo: string;
  email: string;
  tipo_invitacion: string;
}
