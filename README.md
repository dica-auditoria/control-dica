# Control DICA-MX

Plataforma de gestión documental segura y administración de recursos humanos para **DICA México / TKS México**, alineada a ISO 27001 y LFPDPPP.

---

## Índice

1. [Objetivo](#objetivo)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura general](#arquitectura-general)
4. [Roles y permisos](#roles-y-permisos)
5. [Módulos del sistema](#módulos-del-sistema)
   - [Autenticación](#autenticación)
   - [Módulo Documental](#módulo-documental)
   - [Módulo Requerimientos](#módulo-requerimientos)
   - [Módulo RRHH](#módulo-rrhh)
   - [Módulo Asistencia](#módulo-asistencia)
   - [Módulo Vacaciones y Permisos](#módulo-vacaciones-y-permisos)
   - [Módulo Comunicados](#módulo-comunicados)
   - [Módulo Cumpleaños](#módulo-cumpleaños)
   - [Módulo Directorio](#módulo-directorio)
   - [Módulo Inventario](#módulo-inventario)
   - [Módulo Clientes](#módulo-clientes)
6. [Notificaciones por email](#notificaciones-por-email)
7. [Almacenamiento](#almacenamiento)
8. [Base de datos](#base-de-datos)
9. [Flujos clave](#flujos-clave)
10. [Rutas por rol](#rutas-por-rol)
11. [Variables de entorno](#variables-de-entorno)
12. [Instalación y desarrollo local](#instalación-y-desarrollo-local)

---

## Objetivo

Centralizar la **custodia, trazabilidad y autorización** de documentos entregados por entidades externas (clientes), bajo un esquema de audit log inmutable y verificación SHA-256, con extensión completa de RRHH: expedientes digitales, asistencia geolocalizada, vacaciones, permisos, comunicados, inventario y credencial digital.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + CSS tokens inline (DM Sans / DM Serif / DM Mono) |
| Auth + Base de datos | Supabase (PostgreSQL + RLS + Auth) |
| Storage docs empleados | Supabase Storage (`empleado-docs`, `documentos`, `comunicados`) |
| Storage contratos/clientes | Wasabi S3-compatible |
| Email | Resend (`RESEND_API_KEY` + `RESEND_FROM`) |
| Deploy | Vercel |
| Cron jobs | Vercel Cron Jobs |

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel (Next.js 14)                     │
│                                                                  │
│  ┌─────────────┐   Server Actions    ┌──────────────────────┐   │
│  │  App Router │ ──────────────────► │  Supabase PostgreSQL  │   │
│  │  (RSC + CC) │                     │  + RLS + Auth        │   │
│  └─────────────┘                     └──────────────────────┘   │
│         │                                      │                 │
│         │ API Routes                           │ Storage         │
│         ▼                                      ▼                 │
│  ┌─────────────┐              ┌────────────────────────────┐    │
│  │  /api/cron  │              │ Supabase Storage           │    │
│  │  (Vercel    │              │  • empleado-docs           │    │
│  │   Cron 9am) │              │  • documentos              │    │
│  └─────────────┘              │  • comunicados             │    │
│         │                     └────────────────────────────┘    │
│         │ Resend                                                  │
│         ▼                     ┌────────────────────────────┐    │
│  ┌─────────────┐              │ Wasabi S3-compatible        │    │
│  │  Emails     │              │  • archivos clientes        │    │
│  │  notif.     │              │  • archivos contratos       │    │
│  └─────────────┘              └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Roles y permisos

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Control total | Todo + crear entidades, gestionar usuarios, eliminar requerimientos |
| `admin` | Administrador operativo | Todo excepto crear entidades y gestionar usuarios a nivel sistema |
| `rrhh` | Recursos Humanos | Empleados, asistencia, vacaciones, permisos, expedientes |
| `empleado` | Colaborador interno | Mi Expediente (solo lectura propia), Check-in, Comunicados, Directorio, Mi Equipo, Cumpleaños |
| `cliente` | Entidad externa | Mi Portal: ver y subir archivos de sus requerimientos |

### Matriz de permisos por módulo

| Módulo | superadmin | admin | rrhh | empleado | cliente |
|--------|:---:|:---:|:---:|:---:|:---:|
| Archivos / Contratos | ✓ | ✓ | — | — | lectura |
| Requerimientos | ✓ | ✓ | — | pendientes | subir |
| Empleados | ✓ | ✓ | ✓ | propio | — |
| Asistencia | ✓ | ✓ | ✓ | propio | — |
| Vacaciones | ✓ | ✓ | ✓ | solicitar | — |
| Comunicados | ✓ | ✓ | lectura | lectura | — |
| Inventario | ✓ | ✓ | — | — | — |
| Audit Log | ✓ | ✓ | — | — | — |
| Directorio | ✓ | ✓ | ✓ | lectura | — |
| Usuarios / Acceso | ✓ | ✓ | — | — | — |

---

## Módulos del sistema

### Autenticación

- Login con email + contraseña vía Supabase Auth
- Toggle ojo para mostrar/ocultar contraseña
- Aviso de privacidad LFPDPPP obligatorio antes de acceder (clientes y empleados)
- Middleware de sesión con `@supabase/ssr`
- Registro de login/logout en audit log

```
Usuario → /login → Supabase Auth
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
      privacidad_aceptada?    empleado_privacidad?
              │                    │
         No ─► /cliente/privacidad │
              │               No ─► /empleado/aviso-privacidad
              ▼                    ▼
         /dashboard ◄──────────────┘
```

---

### Módulo Documental

Gestión de archivos entregados por entidades externas con trazabilidad completa.

**Funcionalidades:**
- Upload de archivos con cálculo de hash **SHA-256** en el navegador (Web Crypto API) antes de subir
- Verificación de integridad posterior (SHA-256 al 100%)
- Almacenamiento en Wasabi S3-compatible
- Audit log inmutable de todas las operaciones (subida, descarga, eliminación)
- Flujo de autorización de eliminación: el admin solicita, superadmin aprueba/rechaza
- Búsqueda global por archivo, cliente, contrato
- Filtros por entidad y contrato en tabla de archivos
- Multi-selección y eliminación masiva (admin)
- Vista previa inline + descarga forzada con `Content-Disposition: attachment`

**Rutas:**

| Ruta | Descripción |
|------|-------------|
| `/dashboard/archivos` | Tabla completa + upload + filtros |
| `/dashboard/solicitudes` | Flujo aprobación/rechazo de eliminaciones |
| `/dashboard/audit-log` | Log inmutable con filtros por acción |
| `/dashboard/buscar` | Búsqueda global |

---

### Módulo Requerimientos

Sistema de requerimientos documentales por contrato, con reactivos individuales, plazos, estados y flujo de revisión.

**Flujo de estados de un reactivo:**

```
pendiente
    │
    │ Cliente sube archivo
    ▼
en_revision
    │
    │ Admin verifica
    ├──────────────────────────────────┐
    ▼                                  ▼
completado                    pendiente (rechazado)
```

**Funcionalidades:**
- Reactivos (items) con nombre, rubro, descripción y fecha límite individual
- Importación masiva vía **CSV** (4 columnas: No., Rubro, Concepto, Fecha límite)
  - Compatible con formato antiguo de 3 columnas (sin fecha)
  - Fecha límite global como fallback si el reactivo no tiene fecha individual
  - Smart merge al re-importar: preserva archivos ya subidos
- Exportación de plantilla CSV con fechas reales
- **Reordenar reactivos** con flechas ↑↓ (swap de campo `orden`)
- **Descripción por reactivo** — campo opcional visible al cliente
- **Descargar archivos** subidos por cliente (forzado con `Content-Disposition: attachment`)
- **Comentarios por reactivo** — chat interno entre admin y cliente
- **Extender plazo** con nota opcional (se guarda como comentario y notifica al cliente por email)
- **Marcar completado** — notifica al cliente por email automáticamente
- Barra de progreso de documentación por contrato
- Alertas de color en fechas límite:
  - Verde: más de 3 días
  - Naranja: ≤ 3 días
  - Rojo: vencido

**Portal del cliente (`/dashboard` rol cliente):**
- Ve únicamente sus requerimientos y reactivos
- Zona de upload por reactivo
- Badge en menú con conteo de requerimientos activos

---

### Módulo RRHH

Expediente digital completo de cada empleado.

**Secciones del expediente:**

| Sección | Campos |
|---------|--------|
| Relación laboral | Puesto, departamento, tipo contrato, supervisor, código empleado, zona |
| Datos personales | CURP, RFC, NSS, fecha nacimiento, estado civil, escolaridad |
| Datos bancarios | Banco, CLABE, número de cuenta |
| Emergencia | Contacto, parentesco, condiciones médicas, grupo sanguíneo |
| Documentos | INE, CURP, comprobante domicilio, contrato, acta nacimiento |
| Bitácora | Historial de cambios con timestamp y responsable |

**Funcionalidades:**
- Alta de empleado: genera código único (ej. `DICA-PC-591`), email institucional, envía invitación de privacidad
- Foto de perfil con avatar circular y URL firmada (1 hora)
- Progreso de perfil por secciones: privacidad (15%) + datos (30%) + docs (25%) + emergencia (10%) + laboral (20%) = 100%
- Empleado ve su propio expediente en modo solo-lectura (`/dashboard/mi-expediente`)
  - No muestra fecha de ingreso en vista propia
- Exportar tabla de empleados a CSV con BOM (compatible Excel)
- Paginación de 20 empleados por página
- **Credencial digital** con QR en `/dashboard/mi-credencial`

**Rutas:**

| Ruta | Acceso |
|------|--------|
| `/dashboard/empleados` | admin / rrhh |
| `/dashboard/empleados/nuevo` | admin / rrhh |
| `/dashboard/empleados/[id]` | admin / rrhh |
| `/dashboard/mi-expediente` | empleado (solo lectura) |
| `/dashboard/mi-credencial` | todos los empleados |

---

### Módulo Asistencia

Control de asistencia con geofencing y portal público de check-in.

**Funcionalidades:**
- Check-in / Check-out con geolocalización del navegador
- Validación por **geofencing haversine** server-side (radio configurable en metros)
- Portal público `/checkin` — sin login, para dispositivos fijos en oficina
- Reporte por rango de fechas exportable
- Gráfica de asistencia últimos 7 días en el Dashboard

**Flujo de check-in:**

```
Empleado abre /dashboard/mi-asistencia
         │
         ▼
Navegador solicita geolocalización
         │
         ▼ coords
Server Action: asistencia.ts
         │
         ├── Calcula distancia haversine vs. coordenadas de oficina
         │
         ├── Dentro del radio ──► Registra entrada/salida en DB
         │
         └── Fuera del radio ──► Error "Fuera del área permitida"
```

---

### Módulo Vacaciones y Permisos

Flujo de solicitud y aprobación con notificaciones por email.

**Flujo de vacaciones:**

```
Empleado solicita (/dashboard/mis-vacaciones)
         │
         ▼
Admin / RRHH revisa (/dashboard/vacaciones)
         │
    ┌────┴────┐
    ▼         ▼
Aprobado   Rechazado
    │         │
    └────┬────┘
         ▼
  Email automático vía Resend al empleado
```

**Flujo de permisos y comisiones (`/dashboard/otros`):**

```
Empleado solicita
    │
    ▼
Supervisor aprueba/rechaza
    │
    ▼
RRHH valida (estado final)
```

---

### Módulo Comunicados

Publicación de anuncios internos con imagen opcional.

**Tipos de comunicado:** Informativo · Urgente · Recordatorio

**Funcionalidades:**
- Upload de imagen ≤ 5 MB (Supabase Storage bucket `comunicados`)
- URL firmada de imagen con TTL de 1 hora
- Visible para todos los roles (empleado, rrhh, admin)
- Paginación y filtro por tipo

---

### Módulo Cumpleaños

Vista de cumpleaños del equipo con **calendario interactivo**.

**Funcionalidades:**
- Lee `fecha_nacimiento` desde `empleado_datos_personales`
- Sólo empleados con estado `activo`
- Agrupación por proximidad: Hoy · Esta semana · Este mes · Próximos
- **Calendario navegable** por mes/año con indicadores visuales:
  - Fondo ámbar + punto naranja en días con cumpleaños
  - Badge `×N` cuando hay más de uno ese día
  - Click en día → muestra tarjeta del empleado con foto, edad y departamento
- Diseño en dos columnas: calendario izquierda, lista derecha

---

### Módulo Directorio

Catálogo de ubicaciones físicas: oficinas propias y zonas de clientes.

- Integración con **Google Places Autocomplete** para autocompletar direcciones
- Tipos: Oficina · Zona cliente
- Vista de detalle por empresa con sus contratos

---

### Módulo Inventario

Registro de activos de TI y mobiliario.

- Tipos de activo: equipo de cómputo, mobiliario, periféricos
- Asignación a empleado y ubicación
- Modal de detalle con especificaciones técnicas
- Campos specs: RAM, almacenamiento, procesador, SO, número de serie

---

### Módulo Clientes

Gestión de entidades externas (clientes).

- Alta y toggle de activación de clientes
- Portal privado de privacidad (`/cliente/privacidad`) — requerido antes de acceder al sistema
- Vista de detalle con stats de documentos entregados

---

## Notificaciones por email

Todas las notificaciones usan **Resend** y el template `baseLayout(body)`.

| Trigger | Destinatario | Tipo |
|---------|-------------|------|
| Reactivo vence en ≤ 3 días | Cliente (entidad) | Alerta de plazo próximo |
| Reactivo vencido (en retraso) | Admin + Empleados | Lista de items en retraso |
| Admin extiende plazo de reactivo | Cliente | Nuevo plazo + nota opcional |
| Admin marca reactivo como completado | Cliente | Confirmación de verificación |
| Solicitud de vacaciones aprobada/rechazada | Empleado | Resultado de solicitud |

**Cron job diario (9:00 AM UTC):**

```
GET /api/cron/notificaciones
        │
        ├── Consulta items con fecha_limite ≤ hoy + 3 días
        │         └── Agrupa por entidad → sendDeadlineApproachingEmail
        │
        └── Consulta items con fecha_limite < hoy (en retraso)
                  └── sendEnRetrasoEmail → todos los admin/empleado
```

Autenticado con `Authorization: Bearer CRON_SECRET`.

---

## Almacenamiento

| Bucket / Servicio | Contenido | Acceso |
|-------------------|-----------|--------|
| **Wasabi** (S3-compatible) | Archivos de contratos y clientes | URL presignada (descarga forzada o vista inline) |
| **Supabase `empleado-docs`** | Foto perfil, INE, CURP, docs personales | URL firmada (1 hora) |
| **Supabase `documentos`** | Módulo documental original | Privado + SHA-256 |
| **Supabase `comunicados`** | Imágenes de comunicados | URL firmada (1 hora) |

**Límite de upload:** hasta **50 GB** por archivo (multipart upload vía Wasabi).

---

## Base de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Perfiles: id, nombre, rol, entidad_id |
| `entidades` | Clientes / empresas externas |
| `contratos` | Contratos por entidad |
| `archivos` | Archivos subidos con hash SHA-256 |
| `requerimientos` | Requerimientos documentales por contrato |
| `requerimiento_items` | Reactivos individuales (nombre, rubro, descripción, fecha_limite, orden, estado) |
| `requerimiento_item_comentarios` | Chat por reactivo |
| `solicitudes_eliminacion` | Solicitudes de borrado pendientes de aprobación |
| `audit_log` | Log inmutable de operaciones |
| `empleados` | Datos laborales del empleado |
| `empleado_datos_personales` | CURP, RFC, fecha_nacimiento, etc. |
| `empleado_bancarios` | Datos bancarios |
| `empleado_emergencia` | Contactos de emergencia |
| `empleado_asistencia` | Registros check-in/out con coordenadas |
| `solicitudes_vacaciones` | Solicitudes y estados |
| `solicitudes_otros` | Comisiones y permisos |
| `comunicados` | Anuncios internos |
| `inventario_activos` | Activos de TI y mobiliario |
| `ubicaciones` | Directorio de oficinas y zonas |

### Seguridad RLS

- Todas las tablas tienen **Row Level Security** activo
- Clientes sólo ven datos de su propia `entidad_id`
- Empleados sólo ven su propio expediente
- Operaciones privilegiadas usan `createAdminClient()` (service role) que omite RLS

---

## Flujos clave

### Flujo de subida de documento (cliente)

```
Cliente accede a Mi Portal
         │
         ▼
Selecciona reactivo → zona de upload
         │
         ▼
Sube archivo → estado cambia a "en_revision"
         │
         ▼
Admin ve en Pendientes / en el contrato
         │
    ┌────┴────┐
    ▼         ▼
Aprueba    Rechaza
(completado) (pendiente)
    │
    ▼
Email automático al cliente: "documento verificado"
```

### Flujo CSV de reactivos

```
Admin descarga plantilla CSV
(4 columnas: No., Rubro, Concepto, Fecha límite)
         │
         ▼
Llena y sube el CSV
         │
         ▼
Preview en modal con tabla + fecha límite individual o global
         │
         ▼
Importar → Smart merge:
  • Reactivo existe → actualiza nombre/rubro/fecha
  • Reactivo nuevo → inserta con orden siguiente
  • Archivos ya subidos → se preservan (no se borran)
```

---

## Rutas por rol

### Admin / Superadmin

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Dashboard con métricas y gráficas |
| `/dashboard/buscar` | Búsqueda global |
| `/dashboard/empleados` | Tabla de empleados |
| `/dashboard/empleados/nuevo` | Alta de empleado |
| `/dashboard/empleados/[id]` | Detalle/expediente |
| `/dashboard/otros` | Permisos y comisiones |
| `/dashboard/comunicados` | Publicar comunicados |
| `/dashboard/archivos` | Gestión de archivos |
| `/dashboard/clientes` | Gestión de clientes |
| `/dashboard/directorio` | Directorio de ubicaciones |
| `/dashboard/asistencia` | Asistencia del equipo |
| `/dashboard/mi-asistencia` | Mi check-in personal |
| `/dashboard/mi-credencial` | Mi credencial digital |
| `/dashboard/cumpleanos` | Cumpleaños del equipo |
| `/dashboard/inventario` | Inventario de activos |
| `/dashboard/usuarios` | Gestión de accesos |
| `/dashboard/solicitudes` | Aprobación de eliminaciones |
| `/dashboard/pendientes` | Reactivos en revisión o en retraso |
| `/dashboard/audit-log` | Log inmutable |

### RRHH

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Dashboard |
| `/dashboard/empleados` | Tabla de empleados |
| `/dashboard/otros` | Validación de permisos |
| `/dashboard/comunicados` | Ver comunicados |
| `/dashboard/asistencia` | Asistencia del equipo |
| `/dashboard/mi-asistencia` | Mi check-in |
| `/dashboard/mi-expediente` | Mi expediente (solo lectura) |
| `/dashboard/mi-credencial` | Mi credencial |
| `/dashboard/cumpleanos` | Cumpleaños |
| `/dashboard/directorio` | Directorio |
| `/dashboard/pendientes` | Reactivos pendientes |

### Empleado

| Ruta | Descripción |
|------|-------------|
| `/dashboard/mi-asistencia` | Mi check-in |
| `/dashboard` | Dashboard |
| `/dashboard/pendientes` | Documentos pendientes de revisión |
| `/dashboard/directorio` | Directorio de oficinas |
| `/dashboard/comunicados` | Comunicados de la empresa |
| `/dashboard/cumpleanos` | Cumpleaños del equipo |
| `/dashboard/mi-credencial` | Mi credencial digital |
| `/dashboard/mi-expediente` | Mi expediente (solo lectura) |
| `/dashboard/empleados` | Mi equipo |
| `/dashboard/otros` | Mis permisos y comisiones |

### Cliente

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Mi Portal: requerimientos y archivos |

---

## Variables de entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Wasabi S3
WASABI_ACCESS_KEY_ID=
WASABI_SECRET_ACCESS_KEY=
WASABI_BUCKET=
WASABI_REGION=
WASABI_ENDPOINT=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM=

# Cron seguridad
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Instalación y desarrollo local

```bash
# 1. Clonar el repositorio
git clone https://github.com/dica-auditoria/control-dica.git
cd control-dica/app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con los valores reales

# 4. Ejecutar en desarrollo
npm run dev

# 5. Build de producción
npm run build
```

**Requisitos:** Node.js 18+, cuenta Supabase activa, bucket Wasabi configurado.

---

> Desarrollado por **Rodrigo Fuentes Espinoza** — Coordinador de Sistemas, DICA México / TKS México.
