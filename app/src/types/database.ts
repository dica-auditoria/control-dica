export type UserRole = "cliente" | "empleado" | "admin" | "superadmin";
export type ArchivoEstado = "activo" | "pendiente_eliminacion" | "eliminado";
export type SolicitudEstado = "pendiente" | "aprobado" | "rechazado";
export type AuditAccion =
  | "UPLOAD"
  | "REQUEST_DELETE"
  | "APPROVE_DELETE"
  | "REJECT_DELETE"
  | "USER_CREATE"
  | "USER_ROLE_UPDATE"
  | "USER_ENTITY_UPDATE"
  | "LOGIN"
  | "LOGOUT";

export type EmpleadoEstado = "pendiente" | "activo" | "inactivo";
export type TipoContrato = "indeterminado" | "temporal" | "honorarios" | "practicas";
export type DocumentoEstado = "pendiente" | "vigente" | "por_vencer" | "vencido";

export interface Database {
  public: {
    Tables: {
      entidades: {
        Row: {
          id: string;
          nombre: string;
          activo: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["entidades"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["entidades"]["Insert"]>;
      };
      usuarios: {
        Row: {
          id: string;
          entidad_id: string | null;
          rol: UserRole;
          email: string;
          nombre: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["usuarios"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
      };
      archivos: {
        Row: {
          id: string;
          entidad_id: string;
          subido_por: string;
          nombre: string;
          ruta_storage: string;
          hash_sha256: string;
          size_bytes: number;
          tipo: string;
          estado: ArchivoEstado;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["archivos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["archivos"]["Insert"]>;
      };
      solicitudes_eliminacion: {
        Row: {
          id: string;
          archivo_id: string;
          solicitado_por: string;
          motivo: string;
          estado: SolicitudEstado;
          revisado_por: string | null;
          revisado_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["solicitudes_eliminacion"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["solicitudes_eliminacion"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          entidad_id: string | null;
          usuario_id: string;
          accion: AuditAccion;
          recurso_id: string | null;
          detalle_json: Record<string, unknown> | null;
          ip: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at">;
        Update: never;
      };
      empleados: {
        Row: {
          id: string;
          nombres: string;
          apellido_paterno: string;
          apellido_materno: string;
          email_institucional: string;
          email_local: string;
          puesto: string;
          departamento: string;
          supervisor_id: string | null;
          fecha_ingreso: string;
          tipo_contrato: TipoContrato;
          zona_ubicacion: string | null;
          estado: EmpleadoEstado;
          codigo_empleado: string | null;
          progreso_perfil: number;
          usuario_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["empleados"]["Row"],
          "id" | "created_at" | "updated_at" | "progreso_perfil" | "estado" | "codigo_empleado" | "usuario_id"
        > & {
          estado?: EmpleadoEstado;
          codigo_empleado?: string | null;
          progreso_perfil?: number;
          usuario_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["empleados"]["Insert"]>;
      };
      empleado_datos_personales: {
        Row: {
          empleado_id: string;
          fecha_nacimiento: string | null;
          curp: string | null;
          rfc: string | null;
          nss: string | null;
          estado_civil: string | null;
          nacionalidad: string | null;
          tipo_sangre: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["empleado_datos_personales"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["empleado_datos_personales"]["Insert"]>;
      };
      empleado_privacidad: {
        Row: {
          id: string;
          empleado_id: string;
          version_aviso: string;
          acepta_aviso: boolean;
          acepta_sensibles: boolean;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["empleado_privacidad"]["Row"], "id" | "created_at">;
        Update: never;
      };
      empleado_documentos: {
        Row: {
          id: string;
          empleado_id: string;
          tipo: string;
          nombre: string;
          fecha_vencimiento: string | null;
          estado: DocumentoEstado;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["empleado_documentos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["empleado_documentos"]["Insert"]>;
      };
      empleado_bitacora: {
        Row: {
          id: string;
          empleado_id: string;
          usuario_id: string | null;
          accion: string;
          detalle_json: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["empleado_bitacora"]["Row"], "id" | "created_at">;
        Update: never;
      };
      empleado_invitaciones: {
        Row: {
          id: string;
          empleado_id: string;
          token: string;
          tipo: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["empleado_invitaciones"]["Row"], "id" | "created_at" | "used_at">;
        Update: Partial<Pick<Database["public"]["Tables"]["empleado_invitaciones"]["Row"], "used_at">>;
      };
    };
  };
}
