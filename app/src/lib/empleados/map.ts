import type { EmpleadoDetalle, EmpleadoListItem, EmpleadoBitacoraEntry } from "@/types/empleados";

export function mapEmpleadoDetalle(raw: Record<string, unknown>): EmpleadoDetalle {
  return {
    id: raw.id as string,
    nombres: raw.nombres as string,
    apellido_paterno: raw.apellido_paterno as string,
    apellido_materno: raw.apellido_materno as string,
    email_institucional: raw.email_institucional as string,
    email_local: raw.email_local as string,
    puesto: raw.puesto as string,
    departamento: raw.departamento as string,
    supervisor_id: (raw.supervisor_id as string) ?? null,
    supervisor_nombre: (raw.supervisor_nombre as string) ?? null,
    foto_url: (raw.foto_url as string) ?? null,
    fecha_ingreso: raw.fecha_ingreso as string,
    tipo_contrato: raw.tipo_contrato as EmpleadoDetalle["tipo_contrato"],
    zona_ubicacion: (raw.zona_ubicacion as string) ?? null,
    estado: raw.estado as EmpleadoDetalle["estado"],
    codigo_empleado: (raw.codigo_empleado as string) ?? null,
    progreso_perfil: raw.progreso_perfil as number,
    created_at: raw.created_at as string,
    tiene_privacidad: Boolean(raw.tiene_privacidad),
    datos_personales: (raw.datos_personales as EmpleadoDetalle["datos_personales"]) ?? null,
    documentos: (raw.documentos as EmpleadoDetalle["documentos"]) ?? [],
    bitacora: (raw.bitacora as EmpleadoBitacoraEntry[]) ?? [],
  };
}

export function mapEmpleadoListItem(raw: Record<string, unknown>): EmpleadoListItem {
  return {
    id: raw.id as string,
    nombres: raw.nombres as string,
    apellido_paterno: raw.apellido_paterno as string,
    apellido_materno: raw.apellido_materno as string,
    email_institucional: raw.email_institucional as string,
    puesto: raw.puesto as string,
    departamento: raw.departamento as string,
    estado: raw.estado as EmpleadoListItem["estado"],
    progreso_perfil: raw.progreso_perfil as number,
    fecha_ingreso: raw.fecha_ingreso as string,
    codigo_empleado: (raw.codigo_empleado as string) ?? null,
  };
}
