import { useState } from "react";

const MOCK_USERS = {
  "admin@dica-mx.com": { password: "admin123", role: "admin", name: "Admin DICA", entidad: "DICA México" },
  "cliente@empresa.com": { password: "cliente123", role: "cliente", name: "Carlos Mendoza", entidad: "Constructora Omega S.A." },
};

const MOCK_FILES = [
  { id: 1, nombre: "Contrato_2024_Q1.pdf", entidad: "Constructora Omega S.A.", subido_por: "Carlos Mendoza", fecha: "2024-03-15", estado: "activo", size: "2.4 MB", tipo: "pdf" },
  { id: 2, nombre: "Reporte_Auditoria.xlsx", entidad: "Grupo Nexo Industrial", subido_por: "Ana Torres", fecha: "2024-03-18", estado: "activo", size: "1.1 MB", tipo: "xlsx" },
  { id: 3, nombre: "Acta_Entrega.pdf", entidad: "Logística del Norte", subido_por: "Miguel Ríos", fecha: "2024-03-20", estado: "pendiente_eliminacion", size: "890 KB", tipo: "pdf" },
  { id: 4, nombre: "Facturas_Marzo.zip", entidad: "Constructora Omega S.A.", subido_por: "Carlos Mendoza", fecha: "2024-03-21", estado: "activo", size: "5.7 MB", tipo: "zip" },
  { id: 5, nombre: "Inventario_Q1.xlsx", entidad: "Distribuidora Sol", subido_por: "Lucía Vega", fecha: "2024-03-22", estado: "activo", size: "3.2 MB", tipo: "xlsx" },
];

const MOCK_ENTIDADES = [
  { id: 1, nombre: "Constructora Omega S.A.", archivos: 12, pendientes: 1, activo: true },
  { id: 2, nombre: "Grupo Nexo Industrial", archivos: 8, pendientes: 0, activo: true },
  { id: 3, nombre: "Logística del Norte", archivos: 5, pendientes: 1, activo: true },
  { id: 4, nombre: "Distribuidora Sol", archivos: 19, pendientes: 0, activo: true },
];

const SOLICITUDES = [
  { id: 1, archivo: "Acta_Entrega.pdf", entidad: "Logística del Norte", solicitante: "Miguel Ríos", motivo: "Documento duplicado, versión incorrecta", fecha: "2024-03-20" },
];

// Icons
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconFiles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15"/><polyline points="17 2 12 7 7 2"/>
  </svg>
);
const IconLog = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0f1117;
    --ink-2: #1e2130;
    --ink-3: #2d3048;
    --surface: #f5f4f0;
    --surface-2: #eceae3;
    --surface-3: #e2dfd6;
    --accent: #c8472a;
    --accent-2: #e05a3a;
    --gold: #b89a5c;
    --green: #2d6a4f;
    --green-light: #d8f3dc;
    --amber: #b5560e;
    --amber-light: #fff3e0;
    --red-light: #fdecea;
    --border: rgba(15,17,23,0.10);
    --border-strong: rgba(15,17,23,0.18);
    --shadow-sm: 0 1px 3px rgba(15,17,23,0.08), 0 1px 2px rgba(15,17,23,0.04);
    --shadow-md: 0 4px 16px rgba(15,17,23,0.10), 0 1px 4px rgba(15,17,23,0.06);
    --shadow-lg: 0 12px 40px rgba(15,17,23,0.14), 0 4px 12px rgba(15,17,23,0.08);
    --radius: 4px;
    --radius-lg: 8px;
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--ink); }

  /* LOGIN */
  .login-root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--ink);
  }
  .login-left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 56px;
    background: var(--ink-2);
    position: relative;
    overflow: hidden;
  }
  .login-left::before {
    content: '';
    position: absolute;
    top: -120px; right: -120px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(200,71,42,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .login-left::after {
    content: '';
    position: absolute;
    bottom: -80px; left: -80px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(184,154,92,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .login-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .login-brand-icon {
    width: 38px; height: 38px;
    background: var(--accent);
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    color: white;
  }
  .login-brand-name {
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .login-hero {
    z-index: 1;
  }
  .login-hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 48px;
    line-height: 1.1;
    color: white;
    margin-bottom: 20px;
  }
  .login-hero h1 em {
    font-style: italic;
    color: var(--gold);
  }
  .login-hero p {
    font-size: 15px;
    color: rgba(255,255,255,0.45);
    line-height: 1.7;
    max-width: 340px;
  }
  .login-badges {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    z-index: 1;
  }
  .login-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.04em;
  }
  .login-badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gold);
  }
  .login-right {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    background: var(--surface);
  }
  .login-form-wrap {
    width: 100%;
    max-width: 380px;
  }
  .login-form-title {
    font-family: 'DM Serif Display', serif;
    font-size: 30px;
    color: var(--ink);
    margin-bottom: 6px;
  }
  .login-form-sub {
    font-size: 14px;
    color: rgba(15,17,23,0.45);
    margin-bottom: 36px;
  }
  .form-group {
    margin-bottom: 20px;
  }
  .form-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(15,17,23,0.5);
    margin-bottom: 6px;
    font-family: 'DM Mono', monospace;
  }
  .form-input {
    width: 100%;
    padding: 11px 14px;
    background: white;
    border: 1.5px solid var(--border-strong);
    border-radius: var(--radius);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--ink);
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  .form-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(200,71,42,0.10);
  }
  .form-error {
    margin-top: 8px;
    padding: 10px 12px;
    background: var(--red-light);
    border: 1px solid rgba(200,71,42,0.2);
    border-radius: var(--radius);
    font-size: 13px;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-primary {
    width: 100%;
    padding: 12px;
    background: var(--ink);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    margin-top: 8px;
    letter-spacing: 0.01em;
  }
  .btn-primary:hover { background: var(--ink-3); }
  .btn-primary:active { transform: scale(0.99); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .login-hint {
    margin-top: 28px;
    padding: 14px;
    background: var(--surface-2);
    border-radius: var(--radius);
    font-size: 12px;
    color: rgba(15,17,23,0.45);
    font-family: 'DM Mono', monospace;
    line-height: 1.8;
  }

  /* DASHBOARD */
  .dash-root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 220px 1fr;
    grid-template-rows: auto 1fr;
    background: var(--surface);
  }
  .dash-sidebar {
    grid-row: 1 / 3;
    background: var(--ink);
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .sidebar-brand {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sidebar-brand-icon {
    width: 32px; height: 32px;
    background: var(--accent);
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  .sidebar-brand-text {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1.4;
  }
  .sidebar-brand-text strong {
    display: block;
    color: rgba(255,255,255,0.85);
    font-size: 12px;
  }
  .sidebar-nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sidebar-nav-label {
    font-size: 9px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.2);
    padding: 12px 8px 6px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
    transition: all 0.15s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    position: relative;
  }
  .nav-item:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
  .nav-item.active {
    background: rgba(200,71,42,0.15);
    color: white;
  }
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 4px; bottom: 4px;
    width: 3px;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
  }
  .nav-badge {
    margin-left: auto;
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 100px;
    font-family: 'DM Mono', monospace;
  }
  .sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
  }
  .sidebar-avatar {
    width: 32px; height: 32px;
    background: var(--ink-3);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--gold);
    flex-shrink: 0;
  }
  .sidebar-user-info {
    flex: 1;
    min-width: 0;
  }
  .sidebar-user-name {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .btn-logout {
    background: none;
    border: none;
    color: rgba(255,255,255,0.3);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius);
    transition: color 0.15s;
    display: flex;
  }
  .btn-logout:hover { color: rgba(255,255,255,0.7); }

  /* TOPBAR */
  .dash-topbar {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
  }
  .topbar-title {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--ink);
  }
  .topbar-subtitle {
    font-size: 12px;
    color: rgba(15,17,23,0.4);
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.04em;
    margin-top: 2px;
  }
  .topbar-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .btn-action {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    background: var(--ink);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-action:hover { background: var(--ink-3); }
  .btn-outline {
    background: white;
    color: var(--ink);
    border: 1.5px solid var(--border-strong);
  }
  .btn-outline:hover { background: var(--surface-2); }

  /* MAIN CONTENT */
  .dash-main {
    padding: 28px 32px;
    overflow-y: auto;
  }

  /* STATS */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .stat-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    box-shadow: var(--shadow-sm);
  }
  .stat-label {
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(15,17,23,0.4);
    margin-bottom: 8px;
  }
  .stat-value {
    font-family: 'DM Serif Display', serif;
    font-size: 32px;
    color: var(--ink);
    line-height: 1;
    margin-bottom: 6px;
  }
  .stat-meta {
    font-size: 12px;
    color: rgba(15,17,23,0.4);
  }
  .stat-accent { border-top: 3px solid var(--accent); }
  .stat-gold { border-top: 3px solid var(--gold); }
  .stat-green { border-top: 3px solid var(--green); }
  .stat-amber { border-top: 3px solid var(--amber); }

  /* CONTENT GRID */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 20px;
  }

  /* TABLE */
  .card {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }
  .card-subtitle {
    font-size: 11px;
    color: rgba(15,17,23,0.4);
    font-family: 'DM Mono', monospace;
    margin-top: 1px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    padding: 10px 20px;
    text-align: left;
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(15,17,23,0.4);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 12px 20px;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface); }
  .file-name {
    font-weight: 500;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .file-ext {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .ext-pdf { background: #fdecea; color: var(--accent); }
  .ext-xlsx { background: #e8f5e9; color: #2e7d32; }
  .ext-zip { background: #e8eaf6; color: #3949ab; }

  /* STATUS BADGES */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.03em;
  }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; }
  .badge-active { background: var(--green-light); color: var(--green); }
  .badge-active .badge-dot { background: var(--green); }
  .badge-pending { background: var(--amber-light); color: var(--amber); }
  .badge-pending .badge-dot { background: var(--amber); }

  /* SIDEBAR CARDS */
  .sidebar-cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .entidad-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }
  .entidad-item:last-child { border-bottom: none; }
  .entidad-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .entidad-meta {
    font-size: 11px;
    color: rgba(15,17,23,0.4);
    font-family: 'DM Mono', monospace;
    margin-top: 2px;
  }
  .entidad-count {
    font-family: 'DM Serif Display', serif;
    font-size: 20px;
    color: var(--ink);
    text-align: right;
  }
  .entidad-count-label {
    font-size: 10px;
    color: rgba(15,17,23,0.35);
    font-family: 'DM Mono', monospace;
    text-align: right;
  }

  /* SOLICITUDES */
  .solicitud-item {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }
  .solicitud-item:last-child { border-bottom: none; }
  .solicitud-file {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 3px;
  }
  .solicitud-meta {
    font-size: 11px;
    color: rgba(15,17,23,0.45);
    margin-bottom: 8px;
    line-height: 1.5;
  }
  .solicitud-motivo {
    font-size: 12px;
    color: var(--amber);
    background: var(--amber-light);
    padding: 6px 10px;
    border-radius: var(--radius);
    margin-bottom: 10px;
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  .solicitud-actions {
    display: flex;
    gap: 8px;
  }
  .btn-approve {
    flex: 1;
    padding: 7px;
    background: var(--green-light);
    color: var(--green);
    border: 1px solid rgba(45,106,79,0.2);
    border-radius: var(--radius);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .btn-approve:hover { background: #c8e6c9; }
  .btn-reject {
    flex: 1;
    padding: 7px;
    background: var(--red-light);
    color: var(--accent);
    border: 1px solid rgba(200,71,42,0.2);
    border-radius: var(--radius);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .btn-reject:hover { background: #fbd0cb; }

  .empty-state {
    padding: 32px 20px;
    text-align: center;
    color: rgba(15,17,23,0.35);
    font-size: 13px;
    font-family: 'DM Mono', monospace;
  }

  /* Upload zone */
  .upload-zone {
    border: 2px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
    background: white;
    margin-bottom: 20px;
  }
  .upload-zone:hover {
    border-color: var(--accent);
    background: var(--red-light);
  }
  .upload-icon {
    width: 40px; height: 40px;
    background: var(--surface-2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px;
    color: rgba(15,17,23,0.4);
  }
  .upload-title { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .upload-sub { font-size: 12px; color: rgba(15,17,23,0.4); }

  @media (max-width: 900px) {
    .login-root { grid-template-columns: 1fr; }
    .login-left { display: none; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .content-grid { grid-template-columns: 1fr; }
    .dash-root { grid-template-columns: 1fr; }
    .dash-sidebar { display: none; }
  }
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [solicitudes, setSolicitudes] = useState(MOCK_SOLICITUDES);
  const [files, setFiles] = useState(MOCK_FILES);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 600));
    const found = MOCK_USERS[email];
    if (found && found.password === password) {
      setUser({ email, ...found });
    } else {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
    }
    setLoading(false);
  };

  const handleApprove = (id) => {
    setSolicitudes(s => s.filter(x => x.id !== id));
    setFiles(f => f.map(x => x.nombre === solicitudes.find(s => s.id === id)?.archivo
      ? { ...x, estado: "eliminado" } : x).filter(x => x.estado !== "eliminado"));
  };

  const handleReject = (id) => {
    setSolicitudes(s => s.filter(x => x.id !== id));
    setFiles(f => f.map(x => x.nombre === solicitudes.find(s => s.id === id)?.archivo
      ? { ...x, estado: "activo" } : x));
  };

  const navItems = user?.role === "admin" ? [
    { id: "dashboard", label: "Dashboard", icon: <IconShield /> },
    { id: "archivos", label: "Archivos", icon: <IconFiles /> },
    { id: "entidades", label: "Entidades", icon: <IconBuilding /> },
    { id: "solicitudes", label: "Solicitudes", icon: <IconAlert />, badge: solicitudes.length },
    { id: "auditlog", label: "Audit Log", icon: <IconLog /> },
  ] : [
    { id: "dashboard", label: "Mis Archivos", icon: <IconFiles /> },
    { id: "subir", label: "Subir Archivo", icon: <IconUpload /> },
  ];

  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const topbarTitles = {
    dashboard: { title: "Dashboard", sub: "Resumen general del sistema" },
    archivos: { title: "Archivos", sub: "Gestión de documentos" },
    entidades: { title: "Entidades", sub: "Clientes registrados" },
    solicitudes: { title: "Solicitudes de Eliminación", sub: "Pendientes de revisión" },
    auditlog: { title: "Audit Log", sub: "Registro de actividad inmutable" },
    subir: { title: "Subir Archivo", sub: "Nuevo documento" },
  };

  if (!user) {
    return (
      <>
        <style>{styles}</style>
        <div className="login-root">
          <div className="login-left">
            <div className="login-brand">
              <div className="login-brand-icon"><IconShield /></div>
              <span className="login-brand-name">control · dica-mx</span>
            </div>
            <div className="login-hero">
              <h1>Gestión documental <em>segura</em> y auditable.</h1>
              <p>Plataforma centralizada para la carga, custodia y trazabilidad de documentos de entidades externas bajo estándares ISO 27001.</p>
            </div>
            <div className="login-badges">
              <span className="login-badge"><span className="login-badge-dot" />ISO 27001</span>
              <span className="login-badge"><span className="login-badge-dot" />Audit Log</span>
              <span className="login-badge"><span className="login-badge-dot" />WORM Ready</span>
              <span className="login-badge"><span className="login-badge-dot" />Multi-entidad</span>
            </div>
          </div>
          <div className="login-right">
            <div className="login-form-wrap">
              <h2 className="login-form-title">Iniciar sesión</h2>
              <p className="login-form-sub">Ingresa con tus credenciales asignadas.</p>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input className="form-input" type="email" placeholder="usuario@empresa.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input className="form-input" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && (
                  <div className="form-error">
                    <IconAlert />{error}
                  </div>
                )}
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Verificando..." : "Acceder al sistema"}
                </button>
              </form>
              <div className="login-hint">
                Demo admin: admin@dica-mx.com / admin123<br />
                Demo cliente: cliente@empresa.com / cliente123
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="dash-root">
        {/* Sidebar */}
        <aside className="dash-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon"><IconShield /></div>
            <div className="sidebar-brand-text">
              <strong>Control</strong>
              DICA México
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-nav-label">Navegación</div>
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}>
                {item.icon}
                {item.label}
                {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{getInitials(user.name)}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
              <button className="btn-logout" onClick={() => setUser(null)} title="Cerrar sesión">
                <IconLogout />
              </button>
            </div>
          </div>
        </aside>

        {/* Topbar */}
        <header className="dash-topbar">
          <div>
            <div className="topbar-title">{topbarTitles[activeTab]?.title}</div>
            <div className="topbar-subtitle">{topbarTitles[activeTab]?.sub}</div>
          </div>
          <div className="topbar-actions">
            {activeTab === "archivos" && user.role === "admin" && (
              <button className="btn-action btn-outline"><IconUpload />Subir archivo</button>
            )}
            {activeTab === "subir" && (
              <button className="btn-action btn-outline"><IconFiles />Ver mis archivos</button>
            )}
          </div>
        </header>

        {/* Main */}
        <main className="dash-main">

          {/* DASHBOARD */}
          {activeTab === "dashboard" && user.role === "admin" && (
            <>
              <div className="stats-grid">
                <div className="stat-card stat-accent">
                  <div className="stat-label">Total archivos</div>
                  <div className="stat-value">{files.length}</div>
                  <div className="stat-meta">En custodia activa</div>
                </div>
                <div className="stat-card stat-gold">
                  <div className="stat-label">Entidades</div>
                  <div className="stat-value">{MOCK_ENTIDADES.length}</div>
                  <div className="stat-meta">Clientes activos</div>
                </div>
                <div className="stat-card stat-amber">
                  <div className="stat-label">Solicitudes</div>
                  <div className="stat-value">{solicitudes.length}</div>
                  <div className="stat-meta">Pendientes de revisión</div>
                </div>
                <div className="stat-card stat-green">
                  <div className="stat-label">Integridad</div>
                  <div className="stat-value">100%</div>
                  <div className="stat-meta">SHA-256 verificado</div>
                </div>
              </div>

              <div className="content-grid">
                <div>
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Archivos recientes</div>
                        <div className="card-subtitle">Últimas cargas al sistema</div>
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Archivo</th>
                          <th>Entidad</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.slice(0, 5).map(f => (
                          <tr key={f.id}>
                            <td>
                              <div className="file-name">
                                <span className={`file-ext ext-${f.tipo}`}>{f.tipo}</span>
                                {f.nombre}
                              </div>
                            </td>
                            <td style={{ color: "rgba(15,17,23,0.55)", fontSize: "12px" }}>{f.entidad}</td>
                            <td style={{ color: "rgba(15,17,23,0.45)", fontSize: "12px", fontFamily: "DM Mono, monospace" }}>{f.fecha}</td>
                            <td>
                              <span className={`badge ${f.estado === "activo" ? "badge-active" : "badge-pending"}`}>
                                <span className="badge-dot" />
                                {f.estado === "activo" ? "Activo" : "Pend. eliminación"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sidebar-cards">
                  {/* Solicitudes */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Solicitudes pendientes</div>
                        <div className="card-subtitle">Requieren autorización</div>
                      </div>
                    </div>
                    {solicitudes.length === 0 ? (
                      <div className="empty-state">Sin solicitudes pendientes</div>
                    ) : solicitudes.map(s => (
                      <div key={s.id} className="solicitud-item">
                        <div className="solicitud-file">{s.archivo}</div>
                        <div className="solicitud-meta">{s.entidad} · {s.solicitante}<br />{s.fecha}</div>
                        <div className="solicitud-motivo"><IconAlert />{s.motivo}</div>
                        <div className="solicitud-actions">
                          <button className="btn-approve" onClick={() => handleApprove(s.id)}>
                            <IconCheck />Aprobar
                          </button>
                          <button className="btn-reject" onClick={() => handleReject(s.id)}>
                            <IconX />Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Entidades */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Entidades activas</div>
                    </div>
                    {MOCK_ENTIDADES.slice(0, 3).map(e => (
                      <div key={e.id} className="entidad-item">
                        <div>
                          <div className="entidad-name">{e.nombre}</div>
                          <div className="entidad-meta">{e.pendientes > 0 ? `${e.pendientes} solicitud pendiente` : "Sin pendientes"}</div>
                        </div>
                        <div>
                          <div className="entidad-count">{e.archivos}</div>
                          <div className="entidad-count-label">archivos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CLIENTE DASHBOARD */}
          {activeTab === "dashboard" && user.role === "cliente" && (
            <>
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                <div className="stat-card stat-accent">
                  <div className="stat-label">Mis archivos</div>
                  <div className="stat-value">4</div>
                  <div className="stat-meta">En custodia</div>
                </div>
                <div className="stat-card stat-amber">
                  <div className="stat-label">Pendientes</div>
                  <div className="stat-value">1</div>
                  <div className="stat-meta">Solicitudes activas</div>
                </div>
                <div className="stat-card stat-green">
                  <div className="stat-label">Entidad</div>
                  <div className="stat-value" style={{ fontSize: "16px", paddingTop: "8px" }}>{user.entidad}</div>
                  <div className="stat-meta">Cuenta activa</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Mis documentos</div>
                </div>
                <table>
                  <thead>
                    <tr><th>Archivo</th><th>Fecha</th><th>Tamaño</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {files.filter(f => f.entidad === user.entidad).map(f => (
                      <tr key={f.id}>
                        <td><div className="file-name"><span className={`file-ext ext-${f.tipo}`}>{f.tipo}</span>{f.nombre}</div></td>
                        <td style={{ color: "rgba(15,17,23,0.45)", fontSize: "12px", fontFamily: "DM Mono" }}>{f.fecha}</td>
                        <td style={{ color: "rgba(15,17,23,0.45)", fontSize: "12px", fontFamily: "DM Mono" }}>{f.size}</td>
                        <td><span className={`badge ${f.estado === "activo" ? "badge-active" : "badge-pending"}`}><span className="badge-dot" />{f.estado === "activo" ? "Activo" : "Pend. eliminación"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ARCHIVOS (admin) */}
          {activeTab === "archivos" && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Todos los archivos</div>
                  <div className="card-subtitle">{files.length} documentos en custodia</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr><th>Archivo</th><th>Entidad</th><th>Subido por</th><th>Fecha</th><th>Tamaño</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.id}>
                      <td><div className="file-name"><span className={`file-ext ext-${f.tipo}`}>{f.tipo}</span>{f.nombre}</div></td>
                      <td style={{ fontSize: "12px", color: "rgba(15,17,23,0.55)" }}>{f.entidad}</td>
                      <td style={{ fontSize: "12px", color: "rgba(15,17,23,0.55)" }}>{f.subido_por}</td>
                      <td style={{ fontSize: "12px", fontFamily: "DM Mono", color: "rgba(15,17,23,0.45)" }}>{f.fecha}</td>
                      <td style={{ fontSize: "12px", fontFamily: "DM Mono", color: "rgba(15,17,23,0.45)" }}>{f.size}</td>
                      <td><span className={`badge ${f.estado === "activo" ? "badge-active" : "badge-pending"}`}><span className="badge-dot" />{f.estado === "activo" ? "Activo" : "Pend. eliminación"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ENTIDADES */}
          {activeTab === "entidades" && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Entidades registradas</div>
              </div>
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Archivos</th><th>Pendientes</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {MOCK_ENTIDADES.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.nombre}</td>
                      <td style={{ fontFamily: "DM Mono", fontSize: "13px" }}>{e.archivos}</td>
                      <td>
                        {e.pendientes > 0
                          ? <span className="badge badge-pending"><span className="badge-dot" />{e.pendientes} pendiente</span>
                          : <span style={{ fontSize: "12px", color: "rgba(15,17,23,0.35)" }}>—</span>}
                      </td>
                      <td><span className="badge badge-active"><span className="badge-dot" />Activa</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SOLICITUDES */}
          {activeTab === "solicitudes" && (
            <div style={{ maxWidth: 600 }}>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Solicitudes de eliminación</div>
                    <div className="card-subtitle">Requieren autorización del administrador</div>
                  </div>
                </div>
                {solicitudes.length === 0
                  ? <div className="empty-state">No hay solicitudes pendientes</div>
                  : solicitudes.map(s => (
                    <div key={s.id} className="solicitud-item">
                      <div className="solicitud-file">{s.archivo}</div>
                      <div className="solicitud-meta">{s.entidad} · {s.solicitante} · {s.fecha}</div>
                      <div className="solicitud-motivo"><IconAlert />{s.motivo}</div>
                      <div className="solicitud-actions">
                        <button className="btn-approve" onClick={() => handleApprove(s.id)}><IconCheck />Aprobar eliminación</button>
                        <button className="btn-reject" onClick={() => handleReject(s.id)}><IconX />Rechazar</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* AUDIT LOG */}
          {activeTab === "auditlog" && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Audit Log</div>
                  <div className="card-subtitle">Registro inmutable — solo lectura</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr><th>Timestamp</th><th>Usuario</th><th>Acción</th><th>Recurso</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {[
                    { ts: "2024-03-22 14:32:10", user: "Carlos Mendoza", action: "UPLOAD", resource: "Facturas_Marzo.zip", ip: "187.x.x.x" },
                    { ts: "2024-03-22 09:15:44", user: "Lucía Vega", action: "UPLOAD", resource: "Inventario_Q1.xlsx", ip: "201.x.x.x" },
                    { ts: "2024-03-20 16:02:31", user: "Miguel Ríos", action: "REQUEST_DELETE", resource: "Acta_Entrega.pdf", ip: "189.x.x.x" },
                    { ts: "2024-03-18 11:48:22", user: "Ana Torres", action: "UPLOAD", resource: "Reporte_Auditoria.xlsx", ip: "200.x.x.x" },
                    { ts: "2024-03-15 08:30:05", user: "Carlos Mendoza", action: "UPLOAD", resource: "Contrato_2024_Q1.pdf", ip: "187.x.x.x" },
                  ].map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "DM Mono", fontSize: "11px", color: "rgba(15,17,23,0.45)" }}>{log.ts}</td>
                      <td style={{ fontSize: "13px" }}>{log.user}</td>
                      <td>
                        <span style={{
                          fontFamily: "DM Mono", fontSize: "11px", padding: "2px 7px", borderRadius: "3px", fontWeight: 600,
                          background: log.action === "UPLOAD" ? "#e8f5e9" : "#fff3e0",
                          color: log.action === "UPLOAD" ? "#2e7d32" : "#b5560e"
                        }}>{log.action}</span>
                      </td>
                      <td style={{ fontSize: "13px", fontWeight: 500 }}>{log.resource}</td>
                      <td style={{ fontFamily: "DM Mono", fontSize: "11px", color: "rgba(15,17,23,0.35)" }}>{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SUBIR ARCHIVO */}
          {activeTab === "subir" && (
            <div style={{ maxWidth: 520 }}>
              <div className="upload-zone">
                <div className="upload-icon"><IconUpload /></div>
                <div className="upload-title">Arrastra tu archivo aquí</div>
                <div className="upload-sub">PDF, Excel, ZIP — máx. 50 MB por archivo</div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Detalles del documento</div></div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre del documento</label>
                    <input className="form-input" type="text" placeholder="Ej. Contrato_Servicio_2024.pdf" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Descripción (opcional)</label>
                    <input className="form-input" type="text" placeholder="Breve descripción del contenido" />
                  </div>
                  <button className="btn-primary" style={{ marginTop: 4 }}>Subir documento</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
