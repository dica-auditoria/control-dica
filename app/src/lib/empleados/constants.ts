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

export const VERSION_AVISO_PRIVACIDAD = "2026.06.08";

export const AVISO_PRIVACIDAD_EMPLEADO = `AVISO DE PRIVACIDAD INTEGRAL PARA COLABORADORES — DICA

RESPONSABLE DEL TRATAMIENTO
Despacho Integral de Contadores Asociados S.C. ("DICA"), con domicilio en Homero 229, Departamento 501, Piso 5, Colonia Polanco V Sección, C.P. 11560, Miguel Hidalgo, Ciudad de México.

DATOS PERSONALES QUE SE RECABAN
Con motivo de la relación laboral, DICA recaba las siguientes categorías de datos:

• Identificación y contacto: nombre completo, CURP, RFC, NSS, fecha de nacimiento, género, domicilio, teléfono y correo electrónico.
• Laborales: puesto, departamento, fecha de ingreso, tipo de contrato, historial académico y laboral, competencias.
• Financieros: banco, tipo de cuenta, CLABE, número de tarjeta y salario.
• Seguridad social: información IMSS, INFONAVIT y fiscal (SAT).
• Contactos de emergencia: nombre, parentesco y teléfono de personas de confianza.
• Salud: condiciones médicas relevantes para la relación laboral e incapacidades.
• Biométricos: ubicación GPS para registro de asistencia y control de acceso.

FINALIDADES DEL TRATAMIENTO
• Gestión y administración de la relación laboral.
• Generación de contratos, recibos de nómina y documentos oficiales.
• Cumplimiento de obligaciones ante IMSS, SAT e INFONAVIT.
• Otorgamiento de prestaciones, seguros y beneficios.
• Control de asistencia, puntualidad y gestión de incapacidades.
• Administración del inventario de activos asignados al colaborador.
• Protección contra fraudes y cumplimiento de obligaciones legales.

DATOS PERSONALES SENSIBLES
Los datos financieros, médicos y biométricos se consideran sensibles conforme a la LFPDPPP y requieren su consentimiento expreso. Serán tratados con medidas de seguridad reforzadas alineadas a ISO/IEC 27002:2022.

TRANSFERENCIAS
Sus datos podrán compartirse con: IMSS, SAT, INFONAVIT, instituciones financieras para pago de nómina, y autoridades competentes cuando la ley lo requiera. No se realizarán transferencias con fines comerciales sin su consentimiento previo.

CONSERVACIÓN
Sus datos se conservarán durante la vigencia de la relación laboral y hasta por 6 años adicionales conforme a la legislación laboral y fiscal aplicable.

DERECHOS ARCO
Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Para ejercerlos contáctenos en:

  Correo:    m.solis@dica-mx.com
  Teléfono:  22 29 64 89 00
  Web:       https://dicaintl.com/

MODIFICACIONES AL AVISO
Cualquier cambio a este aviso será notificado a través de los medios internos de DICA antes de su entrada en vigor.

Este aviso se rige por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.`;

export const SECCIONES_EXPEDIENTE = [
  { id: "datos_personales", label: "Datos personales", peso: 25 },
  { id: "relacion_laboral", label: "Relación laboral", peso: 15 },
  { id: "documentos", label: "Documentos", peso: 20 },
  { id: "emergencia", label: "Emergencia", peso: 10 },
  { id: "bancarios", label: "Bancarios", peso: 10 },
  { id: "credenciales", label: "Credenciales", peso: 10 },
  { id: "activos", label: "Activos asignados", peso: 10 },
] as const;
