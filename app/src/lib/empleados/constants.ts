export const DOMINIO_EMAIL = "@dica-mx.com";

export const DEPARTAMENTOS = [
  "Dirección General",
  "Dirección de Administración",
  "Contabilidad",
  "Gerencia de RH",
  "Coordinación de Sistemas",
  "Gerencia de Auditoría",
  "Gerencia de Proyectos",
  "Líderes de Auditoría",
  "Auditores",
] as const;

export const TIPOS_CONTRATO = [
  { value: "indeterminado", label: "Indeterminado" },
  { value: "temporal", label: "Temporal" },
  { value: "honorarios", label: "Honorarios" },
  { value: "practicas", label: "Prácticas" },
  { value: "proyecto", label: "Proyecto" },
] as const;

export const ZONAS_UBICACION = [
  { value: "oficina_principal", label: "Oficina principal" },
  { value: "sucursal_norte", label: "Sucursal norte" },
  { value: "remoto", label: "Remoto" },
] as const;

export const ESTADOS_EMPLEADO = [
  { value: "activo", label: "Activo" },
  { value: "pendiente", label: "Pendiente" },
  { value: "inactivo", label: "Inactivo" },
] as const;

export const VERSION_AVISO_PRIVACIDAD = "2024.06.01";

export const SECCIONES_EXPEDIENTE = [
  { id: "datos_personales", label: "Datos personales", peso: 25 },
  { id: "relacion_laboral", label: "Relación laboral", peso: 15 },
  { id: "documentos", label: "Documentos", peso: 20 },
  { id: "emergencia", label: "Emergencia", peso: 10 },
  { id: "bancarios", label: "Bancarios", peso: 10 },
  { id: "credenciales", label: "Credenciales", peso: 10 },
  { id: "activos", label: "Activos asignados", peso: 10 },
] as const;
