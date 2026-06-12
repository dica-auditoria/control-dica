import React, { useState } from 'react';
import {
  User, Mail, MapPin, FileText, Briefcase, Phone, Shirt, CreditCard,
  AlertCircle, Check, ChevronRight, ChevronLeft, Lock, Eye, EyeOff,
  Building2, UserCheck, Calendar, Hash, Shield, History, KeyRound,
  CheckCircle2, Circle, AlertTriangle, Heart, Users, ScrollText,
  Send, ArrowLeft, Search, Filter, Plus, MoreHorizontal, Bell,
  LayoutDashboard, FileCheck, Activity, ChevronDown, Info
} from 'lucide-react';

// ============================================
// PALETA INSTITUCIONAL DICA
// ============================================
// Color primario institucional DICA (navy / azul corporativo profundo).
// Si DICA ya tiene un color oficial distinto, reemplazar en esta constante.
const DICA_PRIMARY = '#1A3A5E';
const DICA_PRIMARY_SOFT = '#E8EEF5';
const ANT_BLUE = '#1677ff';
const ANT_BLUE_DARK = '#0958d9';

export default function EmpleadoDICAMockup() {
  const [activeView, setActiveView] = useState('list');
  const [fase2Step, setFase2Step] = useState(0);
  const [showCredential, setShowCredential] = useState(false);
  const [detailTab, setDetailTab] = useState('personal');

  // ============================================
  // TOP NAVIGATION
  // ============================================
  const TopNav = () => (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center text-white font-bold text-base shadow-sm"
            style={{ backgroundColor: DICA_PRIMARY }}
          >
            D
          </div>
          <div className="text-sm">
            <div className="font-semibold text-slate-800 leading-tight tracking-wide">DICA</div>
            <div className="text-[10px] text-slate-500 leading-tight uppercase tracking-wider">Gestión de Personal</div>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <button className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
            <LayoutDashboard size={14} /> Dashboard
          </button>
          <button
            className="px-3 py-1.5 rounded font-medium flex items-center gap-1.5"
            style={{ backgroundColor: DICA_PRIMARY_SOFT, color: DICA_PRIMARY }}
          >
            <Users size={14} /> Empleados
          </button>
          <button className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
            <FileCheck size={14} /> Resguardos
          </button>
          <button className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
            <Activity size={14} /> Auditoría
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-slate-400 hover:text-slate-600 relative">
          <Bell size={18} />
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: DICA_PRIMARY }}
          ></span>
        </button>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">RF</div>
          <div className="text-xs">
            <div className="font-medium text-slate-800 leading-tight">Rodrigo Fuentes</div>
            <div className="text-slate-500 leading-tight">Coord. Sistemas</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // VIEW SWITCHER (solo prototipo)
  // ============================================
  const ViewSwitcher = () => (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-xs">
      <Info size={14} className="text-amber-700" />
      <span className="text-amber-800 font-medium">Vista del prototipo:</span>
      {[
        { id: 'list', label: '1. Lista de empleados' },
        { id: 'fase1', label: '2. Fase 1 — Alta por RH' },
        { id: 'fase2', label: '3. Fase 2 — Autoservicio empleado' },
        { id: 'detail', label: '4. Detalle / edición' },
      ].map(v => (
        <button
          key={v.id}
          onClick={() => setActiveView(v.id)}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeView === v.id
              ? 'bg-amber-700 text-white'
              : 'text-amber-900 hover:bg-amber-100'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );

  // ============================================
  // VISTA 1: LISTA DE EMPLEADOS
  // ============================================
  const ListView = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Empleados</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión integral del personal DICA</p>
        </div>
        <button
          onClick={() => setActiveView('fase1')}
          className="text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium shadow-sm hover:opacity-90"
          style={{ backgroundColor: ANT_BLUE }}
        >
          <Plus size={16} /> Nuevo empleado
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Activos', value: '47', color: 'text-emerald-600', bg: 'bg-emerald-50', delta: '+3 este mes' },
          { label: 'Perfiles incompletos', value: '8', color: 'text-amber-600', bg: 'bg-amber-50', delta: 'Requieren atención' },
          { label: 'Documentos por vencer', value: '5', color: 'text-rose-600', bg: 'bg-rose-50', delta: 'Próximos 30 días' },
          { label: 'Capacitaciones pendientes', value: '12', color: '', bg: '', delta: 'Asignadas' },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`${kpi.bg || ''} rounded-lg p-4 border border-slate-200`}
            style={!kpi.bg ? { backgroundColor: DICA_PRIMARY_SOFT } : {}}
          >
            <div className="text-xs text-slate-600 font-medium">{kpi.label}</div>
            <div
              className={`text-3xl font-semibold ${kpi.color} mt-1`}
              style={!kpi.color ? { color: DICA_PRIMARY } : {}}
            >
              {kpi.value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#1677ff] focus:ring-2 focus:ring-blue-100"
              placeholder="Buscar por nombre, CURP, RFC o email…"
            />
          </div>
          <button className="text-sm px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <Filter size={14} /> Departamento: Todos
          </button>
          <button className="text-sm px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <Filter size={14} /> Estado: Activos
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Empleado</th>
              <th className="text-left font-medium px-4 py-2.5">Puesto</th>
              <th className="text-left font-medium px-4 py-2.5">Departamento</th>
              <th className="text-left font-medium px-4 py-2.5">Perfil</th>
              <th className="text-left font-medium px-4 py-2.5">Estado</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { ini: 'AL', nombre: 'Ana López Hernández', email: 'a.lopez@dica.mx', puesto: 'Asistente Administrativa', depto: 'Administración', perfil: 100, estado: 'Activo' },
              { ini: 'CR', nombre: 'Carlos Ramírez Soto', email: 'c.ramirez@dica.mx', puesto: 'Becario Sistemas', depto: 'Sistemas', perfil: 45, estado: 'Pendiente' },
              { ini: 'MV', nombre: 'María Vargas Ortiz', email: 'm.vargas@dica.mx', puesto: 'Coordinadora Operativa', depto: 'Operaciones', perfil: 100, estado: 'Activo' },
              { ini: 'JT', nombre: 'Javier Torres Núñez', email: 'j.torres@dica.mx', puesto: 'Analista Senior', depto: 'Administración', perfil: 85, estado: 'Activo' },
              { ini: 'LM', nombre: 'Lucía Mendoza Castro', email: 'l.mendoza@dica.mx', puesto: 'Auxiliar de Sistemas', depto: 'Sistemas', perfil: 65, estado: 'Activo' },
            ].map((emp, i) => (
              <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => setActiveView('detail')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: DICA_PRIMARY }}
                    >
                      {emp.ini}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{emp.nombre}</div>
                      <div className="text-xs text-slate-500">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{emp.puesto}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                    {emp.depto}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 max-w-[140px]">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${emp.perfil === 100 ? 'bg-emerald-500' : emp.perfil > 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${emp.perfil}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-600 w-9 text-right">{emp.perfil}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    emp.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {emp.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-slate-400 hover:text-slate-700"><MoreHorizontal size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // VISTA 2: FASE 1 — ALTA MÍNIMA POR RH
  // ============================================
  const Fase1View = () => (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => setActiveView('list')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Regresar a empleados
      </button>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div
          className="px-6 py-5 border-b border-slate-100"
          style={{ background: `linear-gradient(to right, ${DICA_PRIMARY_SOFT}, #ffffff)` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{ color: DICA_PRIMARY }}
              >
                Fase 1 de 2
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Alta de nuevo empleado</h2>
              <p className="text-sm text-slate-500 mt-1">
                Capture solo los datos esenciales. El empleado completará el resto desde su cuenta.
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 max-w-xs">
              <Info size={12} className="inline text-blue-600 mr-1" />
              Al guardar, se generará automáticamente el correo institucional y se enviará invitación al empleado.
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <User size={14} style={{ color: DICA_PRIMARY }} /> Datos personales
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nombre(s)" required>
                <input className="ant-input" placeholder="Ej. María" />
              </Field>
              <Field label="Apellido paterno" required>
                <input className="ant-input" placeholder="Ej. Vargas" />
              </Field>
              <Field label="Apellido materno" required>
                <input className="ant-input" placeholder="Ej. Ortiz" />
              </Field>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Mail size={14} style={{ color: DICA_PRIMARY }} /> Acceso al sistema
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email institucional" required hint="Se creará automáticamente">
                <div className="flex">
                  <input className="ant-input rounded-r-none" placeholder="mvargas" />
                  <span className="px-3 py-1.5 bg-slate-50 border border-l-0 border-slate-200 rounded-r-md text-sm text-slate-500">
                    @dica.mx
                  </span>
                </div>
              </Field>
              <Field label="Rol en el sistema" required>
                <select className="ant-input">
                  <option>Empleado</option>
                  <option>Supervisor</option>
                  <option>Recursos Humanos</option>
                  <option>Coordinación de Sistemas</option>
                  <option>Dirección</option>
                </select>
              </Field>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Briefcase size={14} style={{ color: DICA_PRIMARY }} /> Relación laboral
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de admisión" required>
                <input type="date" className="ant-input" />
              </Field>
              <Field label="Tipo de contrato" required>
                <select className="ant-input">
                  <option>Indeterminado</option>
                  <option>Determinado</option>
                  <option>Honorarios</option>
                  <option>Becario</option>
                </select>
              </Field>
              <Field label="Puesto" required>
                <input className="ant-input" placeholder="Ej. Coordinadora Operativa" />
              </Field>
              <Field label="Departamento" required>
                <select className="ant-input">
                  <option>Administración</option>
                  <option>Sistemas</option>
                  <option>Operaciones</option>
                  <option>Dirección</option>
                </select>
              </Field>
              <Field label="Supervisor directo" required hint="Responde a">
                <select className="ant-input">
                  <option>Seleccionar supervisor…</option>
                  <option>Rodrigo Fuentes Espinoza</option>
                  <option>Javier Torres Núñez</option>
                </select>
              </Field>
              <Field label="Centro de costos">
                <input className="ant-input" placeholder="Ej. CC-OPS-01" />
              </Field>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <Shield size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong>Aviso de privacidad (LFPDPPP):</strong> al continuar, se enviará al empleado un correo con el aviso de privacidad de DICA. El empleado deberá aceptarlo de forma explícita antes de poder completar su perfil. La aceptación quedará registrada con timestamp y versión.
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <CheckCircle2 size={12} className="inline text-emerald-600 mr-1" />
            Todos los campos requeridos completos
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveView('list')} className="px-4 py-1.5 text-sm border border-slate-200 rounded-md text-slate-700 hover:bg-white">
              Cancelar
            </button>
            <button
              onClick={() => setActiveView('fase2')}
              className="px-4 py-1.5 text-sm text-white rounded-md font-medium flex items-center gap-1.5 shadow-sm hover:opacity-90"
              style={{ backgroundColor: ANT_BLUE }}
            >
              <Send size={14} /> Crear empleado y enviar invitación
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // VISTA 3: FASE 2 — WIZARD DEL EMPLEADO
  // ============================================
  const Fase2View = () => {
    const steps = [
      { icon: ScrollText, label: 'Aviso de privacidad', short: 'Privacidad' },
      { icon: FileText, label: 'Documentos oficiales', short: 'Documentos' },
      { icon: MapPin, label: 'Domicilio', short: 'Domicilio' },
      { icon: Heart, label: 'Contactos emergencia', short: 'Emergencia' },
      { icon: CreditCard, label: 'Datos bancarios', short: 'Bancarios' },
      { icon: User, label: 'Datos complementarios', short: 'Personal' },
      { icon: Shirt, label: 'Uniforme', short: 'Uniforme' },
    ];

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div
            className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
            style={{ background: `linear-gradient(to right, ${DICA_PRIMARY_SOFT}, #ffffff)` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white"
                style={{ backgroundColor: DICA_PRIMARY }}
              >
                MV
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Bienvenida, María Vargas Ortiz</div>
                <div className="text-xs text-slate-500">Complete su perfil para finalizar el alta · Coordinadora Operativa · DICA</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Progreso</div>
              <div className="text-lg font-semibold" style={{ color: DICA_PRIMARY }}>
                {Math.round(((fase2Step + 1) / steps.length) * 100)}%
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between overflow-x-auto">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === fase2Step;
              const isDone = i < fase2Step;
              return (
                <React.Fragment key={i}>
                  <button
                    onClick={() => setFase2Step(i)}
                    className="flex flex-col items-center gap-1 min-w-[70px]"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                        !isActive ? 'bg-white border-slate-200 text-slate-400' : 'text-white'
                      }`}
                      style={isActive ? { backgroundColor: ANT_BLUE, borderColor: ANT_BLUE } : {}}
                    >
                      {isDone ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <span
                      className={`text-[10px] whitespace-nowrap ${
                        isDone ? 'text-emerald-600' : !isActive ? 'text-slate-400' : 'font-medium'
                      }`}
                      style={isActive ? { color: ANT_BLUE } : {}}
                    >
                      {step.short}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < fase2Step ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Paso {fase2Step + 1}: {steps[fase2Step].label}
            </h2>
          </div>
          <div className="p-6 min-h-[400px]">
            {fase2Step === 0 && <AvisoPrivacidadStep />}
            {fase2Step === 1 && <DocumentosStep />}
            {fase2Step === 2 && <DomicilioStep />}
            {fase2Step === 3 && <EmergenciaStep />}
            {fase2Step === 4 && <BancariosStep />}
            {fase2Step === 5 && <PersonalStep />}
            {fase2Step === 6 && <UniformeStep />}
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setFase2Step(Math.max(0, fase2Step - 1))}
              disabled={fase2Step === 0}
              className="px-4 py-1.5 text-sm border border-slate-200 rounded-md text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-white">
                Guardar y continuar después
              </button>
              {fase2Step < steps.length - 1 ? (
                <button
                  onClick={() => setFase2Step(fase2Step + 1)}
                  className="px-4 py-1.5 text-sm text-white rounded-md font-medium flex items-center gap-1.5 shadow-sm hover:opacity-90"
                  style={{ backgroundColor: ANT_BLUE }}
                >
                  Continuar <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => { setActiveView('list'); setFase2Step(0); }}
                  className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Check size={14} /> Finalizar perfil
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // VISTA 4: DETALLE / EDICIÓN
  // ============================================
  const DetailView = () => {
    const tabs = [
      { id: 'personal', label: 'Datos personales', icon: User, complete: 100 },
      { id: 'laboral', label: 'Relación laboral', icon: Briefcase, complete: 100 },
      { id: 'docs', label: 'Documentos', icon: FileText, complete: 80, warning: true },
      { id: 'emergencia', label: 'Emergencia', icon: Heart, complete: 100 },
      { id: 'bancarios', label: 'Bancarios', icon: CreditCard, complete: 100, sensitive: true },
      { id: 'credenciales', label: 'Credenciales', icon: KeyRound, complete: 100, sensitive: true },
      { id: 'activos', label: 'Activos asignados', icon: Shield, complete: 50 },
      { id: 'historial', label: 'Bitácora', icon: History, complete: null },
    ];

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <button onClick={() => setActiveView('list')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Regresar a empleados
        </button>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-4">
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${DICA_PRIMARY}, ${DICA_PRIMARY}dd)` }}
              >
                MV
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-800">María Vargas Ortiz</h2>
                  <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">Activa</span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">Coordinadora Operativa · Operaciones · Folio DICA-018</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>m.vargas@dica.mx</span>
                  <span>·</span>
                  <span>Ingreso: 15/Mar/2023</span>
                  <span>·</span>
                  <span>3 años de antigüedad</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1.5 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50">
                Generar resguardo
              </button>
              <button
                className="text-sm px-3 py-1.5 text-white rounded-md font-medium hover:opacity-90"
                style={{ backgroundColor: ANT_BLUE }}
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm border-l-2 transition-colors ${
                      isActive ? 'font-medium' : 'border-transparent text-slate-700 hover:bg-slate-50'
                    }`}
                    style={isActive ? {
                      backgroundColor: DICA_PRIMARY_SOFT,
                      borderLeftColor: DICA_PRIMARY,
                      color: DICA_PRIMARY,
                    } : {}}
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {tab.complete !== null && (
                      <>
                        {tab.complete === 100 ? (
                          tab.warning ? (
                            <AlertTriangle size={12} className="text-amber-500" />
                          ) : (
                            <Check size={12} className="text-emerald-500" />
                          )
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">{tab.complete}%</span>
                        )}
                        {tab.sensitive && <Lock size={10} className="text-slate-400" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900">Atención</div>
                  <div className="text-amber-800 mt-0.5">Pasaporte vence en 18 días.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-9">
            {detailTab === 'personal' && <PersonalDetailTab />}
            {detailTab === 'docs' && <DocsDetailTab />}
            {detailTab === 'bancarios' && <BancariosDetailTab showCredential={showCredential} setShowCredential={setShowCredential} />}
            {detailTab === 'credenciales' && <CredencialesDetailTab showCredential={showCredential} setShowCredential={setShowCredential} />}
            {detailTab === 'historial' && <HistorialDetailTab />}
            {!['personal', 'docs', 'bancarios', 'credenciales', 'historial'].includes(detailTab) && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
                Contenido de la sección "{tabs.find(t => t.id === detailTab)?.label}" — vista del prototipo.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // COMPONENTES AUXILIARES
  // ============================================
  const Field = ({ label, required, hint, children, error }) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">
        {label} {required && <span style={{ color: DICA_PRIMARY }}>*</span>}
      </label>
      {children}
      {hint && !error && <div className="text-[10px] text-slate-500 mt-1">{hint}</div>}
      {error && <div className="text-[10px] text-rose-600 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</div>}
    </div>
  );

  // ============================================
  // STEPS DE LA FASE 2
  // ============================================
  const AvisoPrivacidadStep = () => (
    <div>
      <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-4 max-h-64 overflow-y-auto text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold mb-2">AVISO DE PRIVACIDAD INTEGRAL — DICA</p>
        <p className="mb-2">En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), DICA hace de su conocimiento que los datos personales recabados serán utilizados con las siguientes finalidades:</p>
        <p className="mb-1">• Gestión de la relación laboral y administración de personal.</p>
        <p className="mb-1">• Generación de documentos oficiales (contratos, resguardos, comprobantes).</p>
        <p className="mb-1">• Cumplimiento de obligaciones ante IMSS, SAT, INFONAVIT.</p>
        <p className="mb-1">• Otorgamiento de prestaciones laborales y seguro de gastos médicos mayores.</p>
        <p className="mb-2">Los datos personales sensibles (financieros, biométricos, médicos) serán cifrados en reposo conforme al control 8.24 de ISO/IEC 27002:2022. Usted podrá ejercer sus derechos ARCO mediante solicitud dirigida al departamento de Sistemas de DICA…</p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer mb-2">
        <input type="checkbox" className="mt-0.5" style={{ accentColor: ANT_BLUE }} />
        <span className="text-sm text-slate-700">He leído y <strong>acepto</strong> el aviso de privacidad de DICA y consiento el tratamiento de mis datos personales con las finalidades descritas.</span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" className="mt-0.5" style={{ accentColor: ANT_BLUE }} />
        <span className="text-sm text-slate-700">Consiento el tratamiento de mis <strong>datos personales sensibles</strong> (financieros, biométricos, médicos) para los fines descritos.</span>
      </label>
      <div className="text-[10px] text-slate-500 mt-3 italic">
        Versión del aviso: 2026.06.01 — Su aceptación quedará registrada con fecha, hora e IP.
      </div>
    </div>
  );

  const DocumentosStep = () => (
    <div className="grid grid-cols-2 gap-4">
      <Field label="CURP" required hint="18 caracteres alfanuméricos">
        <div className="relative">
          <input
            className="ant-input font-mono uppercase"
            placeholder="VAOM850315MDFRRR09"
            defaultValue="VAOM850315MDFRRR09"
          />
          <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
        </div>
      </Field>
      <Field label="RFC con homoclave" required hint="13 caracteres">
        <div className="relative">
          <input
            className="ant-input font-mono uppercase"
            placeholder="VAOM850315H45"
            defaultValue="VAOM850315H45"
          />
          <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
        </div>
      </Field>
      <Field label="NSS" required hint="11 dígitos">
        <input className="ant-input font-mono" placeholder="12345678901" />
      </Field>
      <Field label="Credencial INE (clave de elector)">
        <input className="ant-input font-mono" placeholder="VAOMMR85031509M800" />
      </Field>
      <Field label="Pasaporte" hint="Si aplica">
        <input className="ant-input" placeholder="G12345678" />
      </Field>
      <Field label="Fecha de vencimiento pasaporte">
        <input type="date" className="ant-input" />
      </Field>
      <div className="col-span-2 mt-2">
        <label className="block text-xs font-medium text-slate-700 mb-2">Documentos digitalizados (PDF cifrados)</label>
        <div className="grid grid-cols-3 gap-2">
          {['INE (anverso y reverso)', 'CURP impresa', 'Comprobante de domicilio'].map((doc, i) => (
            <button
              key={i}
              className="border-2 border-dashed border-slate-200 rounded-md p-3 text-xs text-slate-500 hover:bg-slate-50 flex flex-col items-center gap-1"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = ANT_BLUE}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <FileText size={20} className="text-slate-400" />
              <span>{doc}</span>
              <span className="text-[10px] text-slate-400">Click para subir</span>
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
          <Lock size={10} /> Los archivos se cifran con AES-256 antes de almacenarse en Supabase Storage.
        </div>
      </div>
    </div>
  );

  const DomicilioStep = () => (
    <div className="grid grid-cols-6 gap-3">
      <div className="col-span-2">
        <Field label="Código postal" required hint="Se autocompletan colonia, municipio y estado">
          <input className="ant-input font-mono" placeholder="00000" />
        </Field>
      </div>
      <div className="col-span-4">
        <Field label="Estado" required>
          <input className="ant-input bg-slate-50" placeholder="Se completa automáticamente" readOnly />
        </Field>
      </div>
      <div className="col-span-3">
        <Field label="Municipio / Alcaldía" required>
          <input className="ant-input bg-slate-50" placeholder="Se completa automáticamente" readOnly />
        </Field>
      </div>
      <div className="col-span-3">
        <Field label="Colonia" required>
          <select className="ant-input">
            <option>Seleccionar después de capturar CP…</option>
          </select>
        </Field>
      </div>
      <div className="col-span-4">
        <Field label="Calle" required>
          <input className="ant-input" placeholder="Nombre de la calle" />
        </Field>
      </div>
      <div className="col-span-1">
        <Field label="Núm. ext." required>
          <input className="ant-input" placeholder="123" />
        </Field>
      </div>
      <div className="col-span-1">
        <Field label="Núm. int.">
          <input className="ant-input" placeholder="A" />
        </Field>
      </div>
      <div className="col-span-6">
        <Field label="Entre calles / referencias">
          <input className="ant-input" placeholder="Opcional" />
        </Field>
      </div>
    </div>
  );

  const EmergenciaStep = () => (
    <div>
      <div className="text-xs text-slate-500 mb-3">Puede registrar hasta 3 contactos de emergencia.</div>
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="border border-slate-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700">Contacto #{i}</span>
              {i === 2 && <button className="text-xs text-rose-600 hover:underline">Eliminar</button>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nombre completo" required>
                <input className="ant-input" placeholder="Nombre del contacto" />
              </Field>
              <Field label="Parentesco" required>
                <select className="ant-input">
                  <option>Seleccionar…</option>
                  <option>Cónyuge</option>
                  <option>Padre</option>
                  <option>Madre</option>
                  <option>Hijo/a</option>
                  <option>Hermano/a</option>
                  <option>Otro</option>
                </select>
              </Field>
              <Field label="Teléfono" required>
                <input className="ant-input font-mono" placeholder="+52 ## #### ####" />
              </Field>
            </div>
          </div>
        ))}
        <button
          className="w-full border-2 border-dashed border-slate-200 rounded-md py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5"
          onMouseEnter={(e) => e.currentTarget.style.borderColor = ANT_BLUE}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <Plus size={14} /> Agregar otro contacto
        </button>
      </div>
    </div>
  );

  const BancariosStep = () => (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-start gap-2 text-xs">
        <Lock size={14} className="text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-blue-900">
          Esta información se cifra con <strong>XChaCha20-Poly1305</strong> mediante Supabase Vault. Solo personal autorizado de RH y Dirección DICA puede consultarla.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Banco" required>
          <select className="ant-input">
            <option>Seleccionar…</option>
            <option>BBVA México</option>
            <option>Banorte</option>
            <option>Santander</option>
            <option>HSBC</option>
            <option>Citibanamex</option>
            <option>Scotiabank</option>
          </select>
        </Field>
        <Field label="Tipo de cuenta" required>
          <select className="ant-input">
            <option>Nómina</option>
            <option>Cheques</option>
            <option>Débito</option>
          </select>
        </Field>
        <Field label="Número de cuenta" required>
          <input className="ant-input font-mono" placeholder="0123456789" />
        </Field>
        <Field label="CLABE interbancaria" required hint="18 dígitos con validación módulo 10">
          <div className="relative">
            <input className="ant-input font-mono" placeholder="012180000000000000" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">0/18</span>
          </div>
        </Field>
        <Field label="Número de tarjeta" hint="Se almacena enmascarado">
          <input className="ant-input font-mono" placeholder="4111 1111 1111 1111" />
        </Field>
      </div>
    </div>
  );

  const PersonalStep = () => (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Fecha de nacimiento" required>
        <input type="date" className="ant-input" />
      </Field>
      <Field label="Género">
        <select className="ant-input">
          <option>Prefiero no decir</option>
          <option>Masculino</option>
          <option>Femenino</option>
          <option>No binario</option>
          <option>Otro</option>
        </select>
      </Field>
      <Field label="Estado civil">
        <select className="ant-input">
          <option>Soltero/a</option>
          <option>Casado/a</option>
          <option>Unión libre</option>
          <option>Divorciado/a</option>
          <option>Viudo/a</option>
        </select>
      </Field>
      <Field label="Nivel educativo">
        <select className="ant-input">
          <option>Secundaria</option>
          <option>Preparatoria/Bachillerato</option>
          <option>Técnico</option>
          <option>Licenciatura</option>
          <option>Maestría</option>
          <option>Doctorado</option>
        </select>
      </Field>
      <Field label="Nacionalidad">
        <input className="ant-input" defaultValue="Mexicana" />
      </Field>
      <Field label="Tipo de sangre" hint="Para emergencias médicas">
        <select className="ant-input">
          <option>No sé</option>
          <option>O+</option><option>O-</option>
          <option>A+</option><option>A-</option>
          <option>B+</option><option>B-</option>
          <option>AB+</option><option>AB-</option>
        </select>
      </Field>
      <div className="col-span-2">
        <Field label="Alergias o padecimientos relevantes" hint="Opcional, solo para emergencias">
          <textarea className="ant-input min-h-[60px]" placeholder="Ej. Alérgico a la penicilina" />
        </Field>
      </div>
    </div>
  );

  const UniformeStep = () => (
    <div>
      <div className="text-xs text-slate-500 mb-3">Si su puesto requiere uniforme, indique sus tallas.</div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Talla de camisa">
          <select className="ant-input">
            <option>Seleccionar…</option>
            <option>XS</option><option>S</option><option>M</option>
            <option>L</option><option>XL</option><option>XXL</option>
          </select>
        </Field>
        <Field label="Talla de pantalón">
          <input className="ant-input" placeholder="Ej. 32" />
        </Field>
        <Field label="Talla de zapato">
          <input className="ant-input" placeholder="Ej. 27 MX" />
        </Field>
      </div>
    </div>
  );

  // ============================================
  // TABS DEL DETALLE
  // ============================================
  const PersonalDetailTab = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Datos personales</h3>
        <span className="text-xs text-emerald-600 flex items-center gap-1"><Check size={12} /> Completo</span>
      </div>
      <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <InfoRow label="Nombre completo" value="María Vargas Ortiz" />
        <InfoRow label="Fecha de nacimiento" value="15/Mar/1985 — 41 años" />
        <InfoRow label="CURP" value="VAOM850315MDFRRR09" mono />
        <InfoRow label="RFC" value="VAOM850315H45" mono />
        <InfoRow label="NSS" value="12345678901" mono />
        <InfoRow label="Estado civil" value="Casada" />
        <InfoRow label="Nacionalidad" value="Mexicana" />
        <InfoRow label="Tipo de sangre" value="O+" />
      </div>
    </div>
  );

  const DocsDetailTab = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Documentos oficiales</h3>
        <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={12} /> 1 documento por vencer</span>
      </div>
      <div className="p-6 space-y-2">
        {[
          { doc: 'CURP', value: 'VAOM850315MDFRRR09', estado: 'Vigente', file: 'curp.pdf' },
          { doc: 'INE', value: 'VAOMMR85031509M800', estado: 'Vigente hasta 2028', file: 'ine.pdf' },
          { doc: 'Pasaporte', value: 'G12345678', estado: 'Vence en 18 días', warning: true, file: 'pasaporte.pdf' },
          { doc: 'Licencia de conducir', value: 'PUE-AB123456', estado: 'Vigente hasta 2027', file: 'licencia.pdf' },
        ].map((d, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-md border border-slate-100 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded ${d.warning ? 'bg-amber-50' : 'bg-slate-50'} flex items-center justify-center`}>
                <FileText size={14} className={d.warning ? 'text-amber-600' : 'text-slate-500'} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">{d.doc}</div>
                <div className="text-xs font-mono text-slate-500">{d.value}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${d.warning ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>{d.estado}</span>
              <button className="text-xs hover:underline" style={{ color: ANT_BLUE }}>Descargar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const BancariosDetailTab = ({ showCredential, setShowCredential }) => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          Datos bancarios
          <Lock size={14} className="text-slate-400" />
        </h3>
        <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-medium">Información sensible</span>
      </div>
      <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <InfoRow label="Banco" value="BBVA México" />
        <InfoRow label="Tipo de cuenta" value="Nómina" />
        <InfoRow label="Número de cuenta" value="•••• •••• 6789" mono masked onReveal={() => setShowCredential(!showCredential)} revealed={showCredential} revealedValue="0123 4567 6789" />
        <InfoRow label="CLABE" value="•••• •••• •••• •••• 12" mono masked onReveal={() => setShowCredential(!showCredential)} revealed={showCredential} revealedValue="012 180 01234567890 12" />
        <InfoRow label="Tarjeta" value="•••• •••• •••• 1234" mono />
        <InfoRow label="Salario" value="•••••••" masked onReveal={() => setShowCredential(!showCredential)} revealed={showCredential} revealedValue="$ 35,000.00 MXN" />
      </div>
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
        <Shield size={12} /> Cada operación de descifrado queda registrada en la bitácora con tu usuario, IP y timestamp.
      </div>
    </div>
  );

  const CredencialesDetailTab = ({ showCredential, setShowCredential }) => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          Credenciales de servicios externos
          <Lock size={14} className="text-slate-400" />
        </h3>
        <button
          className="text-xs px-2.5 py-1 text-white rounded-md hover:opacity-90 flex items-center gap-1"
          style={{ backgroundColor: ANT_BLUE }}
        >
          <Plus size={12} /> Nueva credencial
        </button>
      </div>
      <div className="p-4 space-y-2">
        {[
          { servicio: 'Email institucional DICA', usuario: 'm.vargas@dica.mx', rotacion: 'Hace 45 días', estado: 'Vigente' },
          { servicio: 'VPN corporativa DICA', usuario: 'mvargas', rotacion: 'Hace 92 días', estado: 'Próxima a rotar', warning: true },
        ].map((c, i) => (
          <div key={i} className={`p-3 rounded-md border ${c.warning ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-800">{c.servicio}</span>
              </div>
              <span className={`text-xs ${c.warning ? 'text-amber-700' : 'text-slate-500'}`}>{c.estado} · Rotación: {c.rotacion}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500 mb-0.5">Usuario</div>
                <div className="font-mono text-slate-800">{c.usuario}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Contraseña</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800">{showCredential ? 'P@ssw0rd!2026Demo' : '••••••••••••••••'}</span>
                  <button
                    onClick={() => setShowCredential(!showCredential)}
                    className="text-slate-400"
                    onMouseEnter={(e) => e.currentTarget.style.color = ANT_BLUE}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                  >
                    {showCredential ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-blue-50/50 border-t border-blue-100 text-xs text-blue-900 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>Las credenciales se cifran con XChaCha20-Poly1305 en <strong>Supabase Vault</strong>. La política exige rotación cada 90 días.</span>
      </div>
    </div>
  );

  const HistorialDetailTab = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Bitácora de cambios</h3>
        <button className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <Filter size={12} /> Filtrar
        </button>
      </div>
      <div className="p-4 space-y-3">
        {[
          { user: 'Rodrigo Fuentes', action: 'consultó la CLABE bancaria', time: 'Hace 12 min', ip: '192.168.1.42', type: 'sensitive' },
          { user: 'RH DICA', action: 'modificó el salario (anterior $32,000 → $35,000)', time: 'Ayer 15:42', ip: '192.168.1.10', type: 'edit' },
          { user: 'María Vargas', action: 'actualizó su teléfono personal', time: 'Hace 3 días', ip: '189.203.45.12', type: 'self' },
          { user: 'Rodrigo Fuentes', action: 'rotó la contraseña de email institucional', time: 'Hace 5 días', ip: '192.168.1.42', type: 'security' },
          { user: 'Sistema', action: 'envió alerta de pasaporte por vencer (18 días)', time: 'Hace 6 días', ip: '—', type: 'system' },
        ].map((entry, i) => (
          <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              entry.type === 'sensitive' ? 'bg-rose-500' :
              entry.type === 'edit' ? 'bg-amber-500' :
              entry.type === 'security' ? 'bg-blue-500' :
              entry.type === 'self' ? 'bg-emerald-500' :
              'bg-slate-400'
            }`}></div>
            <div className="flex-1">
              <div className="text-sm text-slate-800">
                <strong>{entry.user}</strong> {entry.action}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{entry.time}</span>
                <span>·</span>
                <span className="font-mono">IP: {entry.ip}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const InfoRow = ({ label, value, mono, masked, onReveal, revealed, revealedValue }) => (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''} flex items-center gap-2`}>
        <span>{revealed ? revealedValue : value}</span>
        {masked && (
          <button
            onClick={onReveal}
            className="text-slate-400"
            onMouseEnter={(e) => e.currentTarget.style.color = ANT_BLUE}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .ant-input {
          width: 100%;
          padding: 6px 11px;
          font-size: 13px;
          line-height: 1.5;
          color: #1f2937;
          background-color: #ffffff;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          transition: all 0.2s;
          outline: none;
          font-family: inherit;
        }
        .ant-input:focus {
          border-color: #1677ff;
          box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
        }
        .ant-input.font-mono {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
        }
        select.ant-input {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
        }
      `}</style>
      <TopNav />
      <ViewSwitcher />
      {activeView === 'list' && <ListView />}
      {activeView === 'fase1' && <Fase1View />}
      {activeView === 'fase2' && <Fase2View />}
      {activeView === 'detail' && <DetailView />}
    </div>
  );
}
