import { useState, useEffect, useMemo } from 'react';
import { Lock, Unlock, DollarSign, RefreshCw, Clock, ArrowDownRight, Plus, Settings, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getConfigImpresion } from './ConfiguracionSistema';
import { confirmar } from './ConfirmDialog';
import { AutorizacionAdminModal, type AdminAutorizado } from './AutorizacionAdminModal';

const API = 'http://localhost:80/conta-app-backend/api/caja/sesion.php';
const API_MOV = 'http://localhost:80/conta-app-backend/api/caja/movimientos.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function CajaRegistradora() {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1' || user?.role === 'Administrador';
  const [data, setData] = useState<any>(null);
  const [cajas, setCajas] = useState<any[]>([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState(1);
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState('');
  const [conteo, setConteo] = useState('');
  const [showCerrar, setShowCerrar] = useState(false);
  const [showRetiro, setShowRetiro] = useState(false);
  const [retiroValor, setRetiroValor] = useState('');
  const [retiroDesc, setRetiroDesc] = useState('');
  const [opcionTraslado, setOpcionTraslado] = useState<'todo' | 'ganancias' | 'nada'>('ganancias');
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);
  const [showAdminCajas, setShowAdminCajas] = useState(false);
  const [nuevaCajaNombre, setNuevaCajaNombre] = useState('');
  // Estado del modal "Corregir base": permite al admin arreglar la base cuando
  // se digitó mal al abrir. Requiere autorización si el usuario no es admin.
  const [showCorregirBase, setShowCorregirBase] = useState(false);
  const [baseCorreccion, setBaseCorreccion] = useState('');
  const [pedirAuthBase, setPedirAuthBase] = useState(false);

  // Estados para movimientos directos de caja principal
  const [movsPrincipal, setMovsPrincipal] = useState<any[]>([]);
  const [showIngresoPrincipal, setShowIngresoPrincipal] = useState(false);
  const [showEgresoPrincipal, setShowEgresoPrincipal] = useState(false);
  const [montoMov, setMontoMov] = useState('');
  const [descMov, setDescMov] = useState('');
  const [loadingMov, setLoadingMov] = useState(false);

  const esCajaPrincipal = useMemo(() => {
    const caja = cajas.find((c: any) => c.Id_Caja === cajaSeleccionada);
    return caja?.Tipo === 'principal';
  }, [cajas, cajaSeleccionada]);

  const cargarCajas = async () => {
    try {
      const r = await fetch(`${API}?cajas=1&usuario=${user?.id || 0}`);
      const d = await r.json();
      if (d.success) {
        setCajas(d.cajas || []);
        // Regla de auto-selección (prioridad):
        //  1) Única caja disponible → esa
        //  2) Alguna caja con sesión abierta → esa (para que aunque el usuario
        //     haya cerrado la app sin cerrar caja, la próxima vez vea directo
        //     la caja abierta con opción de operar/cerrar).
        //  3) Fallback: primera caja del listado (evita quedarse con un
        //     Id_Caja hardcoded que quizás no exista en la BD del cliente).
        if (d.cajas?.length === 1) {
          setCajaSeleccionada(d.cajas[0].Id_Caja);
        } else if (d.cajas?.length > 0) {
          const abierta = d.cajas.find((c: any) => c.sesiones_abiertas > 0 && c.Tipo !== 'principal');
          if (abierta) setCajaSeleccionada(abierta.Id_Caja);
          else if (!d.cajas.some((c: any) => c.Id_Caja === cajaSeleccionada)) {
            setCajaSeleccionada(d.cajas[0].Id_Caja);
          }
        }
      }
    } catch (e) {}
  };

  const cargarMovsPrincipal = async () => {
    try {
      const res = await fetch(`${API_MOV}?caja_principal=1`);
      const d = await res.json();
      if (d.success) setMovsPrincipal(d.movimientos ?? []);
    } catch { /* silencioso */ }
  };

  const cargar = async () => {
    if (esCajaPrincipal) {
      // No cargar sesión, cargar movimientos en su lugar
      setLoading(true);
      await cargarMovsPrincipal();
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}?caja=${cajaSeleccionada}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargarCajas(); }, []);
  useEffect(() => { cargar(); }, [cajaSeleccionada]);

  // Pre-rellenar la base con el residual del último cierre cuando NO hay sesión abierta
  useEffect(() => {
    if (data?.abierta) return; // si ya está abierta, no toca
    const c = cajas.find(c => c.Id_Caja === cajaSeleccionada);
    if (c && c.base_sugerida && parseFloat(c.base_sugerida) > 0) {
      setBase(String(Math.round(parseFloat(c.base_sugerida))));
    }
  }, [cajas, cajaSeleccionada, data?.abierta]);

  const abrirCaja = async () => {
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abrir', caja_id: cajaSeleccionada, usuario_id: user?.id || 0, base: parseInt(base) || 0 }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setBase(''); cargar(); cargarCajas(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  // Corregir la base de la sesión abierta (si se digitó mal).
  // Solo admin, deja trazabilidad en Observacion de la sesión.
  const ejecutarCorregirBase = async (admin: AdminAutorizado | null) => {
    if (!data?.sesion) return;
    const val = parseInt(baseCorreccion) || 0;
    if (val < 0) { toast.error('La base debe ser un número válido'); return; }
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'corregir_base',
          sesion_id: data.sesion.Id_Sesion,
          base_nueva: val,
          usuario_id: user?.id || 0,
          autorizado_por: admin?.id || 0,
          autorizado_por_nombre: admin?.nombre || '',
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setShowCorregirBase(false);
        setBaseCorreccion('');
        cargar();
      } else if (d.requiere_autorizacion) {
        setPedirAuthBase(true);
      } else {
        toast.error(d.message || 'No se pudo corregir');
      }
    } catch { toast.error('Error de conexión'); }
  };

  const solicitarCorregirBase = () => {
    // Bug histórico: el campo del backend es `resumen`, no `res` — al leer
    // `data?.res` siempre era undefined y el modal nunca abría. `res` es solo
    // el alias local declarado más abajo en el render.
    if (!data?.resumen) return;
    setBaseCorreccion(String(Math.round(data.resumen.base || 0)));
    setShowCorregirBase(true);
  };

  const cerrarCaja = async () => {
    if (!data?.sesion) return;
    if (!await confirmar({ title: 'Cerrar caja', message: '¿Está seguro de cerrar la caja?', type: 'warning', confirmText: 'Cerrar caja' })) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cerrar', sesion_id: data.sesion.Id_Sesion, conteo: parseInt(conteo) || 0, opcion_traslado: opcionTraslado }) });
      const d = await r.json();
      if (d.success) {
        if (d.diferencia === 0) toast.success(d.message, { duration: 6000 });
        else if (d.diferencia > 0) toast(d.message, { icon: '⬆️', duration: 6000 });
        else toast.error(d.message, { duration: 8000 });

        // Imprimir cuadre de caja
        imprimirCuadre(d, parseInt(conteo) || 0);

        setShowCerrar(false); setConteo(''); cargar(); cargarCajas();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const hacerRetiro = async () => {
    const val = parseInt(retiroValor) || 0;
    if (val <= 0) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retiro', sesion_id: data.sesion.Id_Sesion, valor: val, descripcion: retiroDesc || 'Retiro parcial', usuario_id: user?.id || 0 }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowRetiro(false); setRetiroValor(''); setRetiroDesc(''); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const crearCaja = async () => {
    if (!nuevaCajaNombre.trim()) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crear_caja', nombre: nuevaCajaNombre.trim(), tipo: 'punto_venta' }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setNuevaCajaNombre(''); cargarCajas(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const registrarIngresoPrincipal = async () => {
    const valor = parseFloat(montoMov.replace(/\./g, '').replace(',', '.'));
    if (!valor || valor <= 0 || !descMov.trim()) return;
    setLoadingMov(true);
    try {
      const r = await fetch(API_MOV, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingreso', caja_id: cajaSeleccionada, valor, descripcion: descMov, usuario_id: user?.id || 0 }) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setShowIngresoPrincipal(false); setMontoMov(''); setDescMov('');
        cargarMovsPrincipal(); cargarCajas();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    finally { setLoadingMov(false); }
  };

  const registrarEgresoPrincipal = async () => {
    const valor = parseFloat(montoMov.replace(/\./g, '').replace(',', '.'));
    if (!valor || valor <= 0 || !descMov.trim()) return;
    setLoadingMov(true);
    try {
      const r = await fetch(API_MOV, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'egreso', caja_id: cajaSeleccionada, valor, descripcion: descMov, usuario_id: user?.id || 0 }) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setShowEgresoPrincipal(false); setMontoMov(''); setDescMov('');
        cargarMovsPrincipal(); cargarCajas();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    finally { setLoadingMov(false); }
  };

  const cargarHistorial = async () => {
    try {
      const r = await fetch(`${API}?historial=1&caja=${cajaSeleccionada}`);
      const d = await r.json();
      if (d.success) setHistorial(d.sesiones || []);
    } catch (e) {}
  };

  const imprimirCuadre = (resultado: any, conteoVal: number) => {
    if (!res || !sesion) return;
    const fecha = new Date().toLocaleDateString('es-CO');
    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const diff = resultado.diferencia || 0;
    const trasladado = resultado.trasladado || 0;
    const formato = getConfigImpresion().formatoCuadreCaja || 'tirilla';

    let html = '', pageStyle = '', winWidth = 500;

    if (formato === 'tirilla') {
      // ===== Tirilla térmica 80mm =====
      pageStyle = `@page { size: 80mm auto; margin: 2mm; }`;
      winWidth = 360;
      const lineDot = (label: string, value: string) =>
        `<div style="display:flex;justify-content:space-between;font-family:'Courier New',monospace;font-size:11px;line-height:1.4;"><span>${label}</span><span style="font-weight:bold;">${value}</span></div>`;
      const sepDouble = `<div style="border-top:1px dashed #000;margin:4px 0;"></div>`;
      const sepSolid = `<div style="border-top:1px solid #000;margin:5px 0;"></div>`;

      html = `
        <div style="width:76mm;font-family:'Courier New',monospace;color:#000;padding:4px 2mm;">
          <div style="text-align:center;font-size:14px;font-weight:bold;letter-spacing:1px;">CUADRE DE CAJA</div>
          <div style="text-align:center;font-size:10px;">${sesion.NombreCaja}</div>
          <div style="text-align:center;font-size:10px;">Cajero: ${sesion.NombreUsuario || 'Admin'}</div>
          <div style="text-align:center;font-size:10px;">${fecha} ${hora}</div>
          ${sepDouble}
          ${lineDot('Base', fmtMon(res.base))}
          ${lineDot(`Vtas Cont (${res.ventas_contado_cantidad}) Ef`, fmtMon(res.ventas_contado_efectivo))}
          ${res.ventas_contado_transferencia > 0 ? lineDot('  Transferencia', fmtMon(res.ventas_contado_transferencia)) : ''}
          ${res.ventas_credito > 0 ? lineDot(`Vtas Cred (${res.ventas_credito_cantidad})`, fmtMon(res.ventas_credito)) : ''}
          ${res.pagos_efectivo > 0 ? lineDot(`Pagos Cli Ef (${res.pagos_cantidad})`, fmtMon(res.pagos_efectivo)) : ''}
          ${res.pagos_transferencia > 0 ? lineDot('  Transferencia', fmtMon(res.pagos_transferencia)) : ''}
          ${res.egresos > 0 ? lineDot(`Egresos (${res.egresos_cantidad})`, '-' + fmtMon(res.egresos)) : ''}
          ${res.anulaciones > 0 ? lineDot(`Anulac. (${res.anulaciones_cantidad})`, '-' + fmtMon(res.anulaciones)) : ''}
          ${res.retiros_parciales > 0 ? lineDot('Retiros', '-' + fmtMon(res.retiros_parciales)) : ''}
          ${sepSolid}
          ${lineDot('TOTAL SISTEMA', fmtMon(res.total_efectivo))}
          ${lineDot('CONTEO REAL', fmtMon(conteoVal))}
          ${sepDouble}
          <div style="text-align:center;font-size:13px;font-weight:bold;padding:4px 0;${diff === 0 ? '' : 'border:1px solid #000;'}">
            ${diff === 0 ? '*** CUADRA ***' : diff > 0 ? `SOBRANTE: ${fmtMon(diff)}` : `FALTANTE: ${fmtMon(Math.abs(diff))}`}
          </div>
          ${sepDouble}
          ${trasladado > 0 ? lineDot('Trasl. Principal', fmtMon(trasladado)) : ''}
          ${sepSolid}
          ${lineDot('VENTA DEL DIA', fmtMon(res.total_venta_dia))}
          ${sepDouble}
          <div style="margin-top:18px;text-align:center;font-size:9px;">
            <div style="border-top:1px solid #000;width:60%;margin:0 auto;padding-top:2px;">Firma Cajero</div>
          </div>
          <div style="margin-top:14px;text-align:center;font-size:9px;">
            <div style="border-top:1px solid #000;width:60%;margin:0 auto;padding-top:2px;">Firma Administrador</div>
          </div>
          <div style="text-align:center;font-size:9px;margin-top:8px;color:#666;">- - - Conta FT - - -</div>
        </div>
      `;
    } else {
      // ===== Media carta (formato actual) =====
      pageStyle = `@page { size: auto; margin: 10mm; }`;
      winWidth = 500;
      const linea = (label: string, ef: number, tr?: number) =>
        `<tr><td style="padding:3px 6px;">${label}</td><td style="padding:3px 6px;text-align:right;font-weight:600;">${fmtMon(ef)}</td>${tr !== undefined ? `<td style="padding:3px 6px;text-align:right;color:#666;">${fmtMon(tr)}</td>` : ''}</tr>`;

      html = `
        <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:16px;font-weight:bold;">CUADRE DE CAJA</div>
            <div style="font-size:12px;color:#666;">${sesion.NombreCaja} — ${sesion.NombreUsuario || 'Admin'}</div>
            <div style="font-size:12px;color:#666;">Fecha: ${fecha} ${hora}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;">
            <tr style="background:#f0f0f0;font-weight:bold;">
              <td style="padding:4px 6px;">Concepto</td>
              <td style="padding:4px 6px;text-align:right;">Efectivo</td>
              <td style="padding:4px 6px;text-align:right;">Transferencia</td>
            </tr>
            ${linea('Base', res.base, 0)}
            ${linea(`Ventas Contado (${res.ventas_contado_cantidad})`, res.ventas_contado_efectivo, res.ventas_contado_transferencia)}
            ${linea(`Ventas Crédito (${res.ventas_credito_cantidad})`, 0, res.ventas_credito)}
            ${linea(`Pagos Clientes (${res.pagos_cantidad})`, res.pagos_efectivo, res.pagos_transferencia)}
            ${res.egresos > 0 ? linea(`Egresos (${res.egresos_cantidad})`, -res.egresos, 0) : ''}
            ${res.anulaciones > 0 ? linea(`Anulaciones (${res.anulaciones_cantidad})`, -res.anulaciones, 0) : ''}
            ${res.retiros_parciales > 0 ? linea('Retiros parciales', -res.retiros_parciales, 0) : ''}
          </table>
          <div style="border-top:3px solid #000;padding-top:8px;margin-bottom:12px;">
            <table style="width:100%;font-size:13px;">
              <tr><td style="font-weight:bold;">Total en Efectivo (Sistema):</td><td style="text-align:right;font-weight:bold;">${fmtMon(res.total_efectivo)}</td></tr>
              <tr><td style="font-weight:bold;">Conteo de Caja:</td><td style="text-align:right;font-weight:bold;">${fmtMon(conteoVal)}</td></tr>
              <tr style="font-size:15px;${diff === 0 ? 'color:green;' : diff > 0 ? 'color:blue;' : 'color:red;'}">
                <td style="font-weight:bold;">Diferencia:</td>
                <td style="text-align:right;font-weight:bold;">${diff === 0 ? 'CUADRA ✓' : fmtMon(diff) + (diff > 0 ? ' (Sobrante)' : ' (Faltante)')}</td>
              </tr>
              ${trasladado > 0 ? `<tr><td>Trasladado a Principal:</td><td style="text-align:right;">${fmtMon(trasladado)}</td></tr>` : ''}
            </table>
          </div>
          <div style="border-top:2px solid #000;padding-top:8px;margin-bottom:8px;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="font-weight:bold;">Total Venta del Día:</td><td style="text-align:right;font-weight:bold;font-size:16px;">${fmtMon(res.total_venta_dia)}</td></tr>
            </table>
          </div>
          <div style="margin-top:30px;display:flex;justify-content:space-between;">
            <div style="text-align:center;width:45%;"><div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Cajero</div></div>
            <div style="text-align:center;width:45%;"><div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Administrador</div></div>
          </div>
        </div>
      `;
    }

    const win = window.open('', 'CuadreCaja', `width=${winWidth},height=720,menubar=no,toolbar=no`);
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Cuadre de Caja</title>
      <style>
        @media print { ${pageStyle} body { margin: 0; } .no-print { display: none !important; } }
      </style></head><body>
      <div class="no-print" style="padding:8px 16px;background:#7c3aed;display:flex;gap:8px;align-items:center;">
        <button onclick="window.print()" style="height:30px;padding:0 14px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Imprimir</button>
        <button onclick="window.close()" style="height:30px;padding:0 14px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:6px;font-size:12px;cursor:pointer;">Cerrar</button>
        <span style="color:rgba(255,255,255,0.8);font-size:12px;margin-left:auto;">Cuadre de Caja — ${sesion.NombreCaja} (${formato === 'tirilla' ? 'Tirilla' : 'Media carta'})</span>
      </div>
      ${html}</body></html>`);
    win.document.close();
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>;

  const abierta = data?.abierta;
  const sesion = data?.sesion;
  const res = data?.resumen;
  const cajaActual = cajas.find(c => c.Id_Caja === cajaSeleccionada);

  const linea = (label: string, efectivo: number, transferencia?: number, color?: string, bold?: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
      <span style={{ flex: 1, color: color || '#374151', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ width: 110, textAlign: 'right', fontWeight: bold ? 800 : 600, color: color }}>{fmtMon(efectivo)}</span>
      {transferencia !== undefined && <span style={{ width: 110, textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>{fmtMon(transferencia)}</span>}
    </div>
  );

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Caja Registradora</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
            {abierta ? `${sesion.NombreCaja} — Abierta por ${sesion.NombreUsuario || 'Admin'}` : 'Seleccione una caja para operar'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {esAdmin ? (
            <select value={cajaSeleccionada} onChange={e => setCajaSeleccionada(parseInt(e.target.value))}
              style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
              {cajas.map(c => (
                <option key={c.Id_Caja} value={c.Id_Caja}>{c.Nombre} {c.Tipo === 'principal' ? '(Principal)' : ''} {c.sesiones_abiertas > 0 ? '- Abierta' : ''}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', padding: '0 8px' }}>
              {cajaActual?.Nombre || 'Mi Caja'}
            </span>
          )}
          {esAdmin && (
            <>
              <button onClick={() => { cargarHistorial(); setShowHistorial(true); }}
                style={{ height: 30, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} /> Historial
              </button>
              <button onClick={() => setShowAdminCajas(true)}
                style={{ height: 30, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Settings size={13} /> Cajas
              </button>
            </>
          )}
          <button onClick={cargar}
            style={{ height: 30, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refrescar
          </button>
        </div>
      </div>

      {/* Caja Principal saldo - solo admin */}
      {esAdmin && cajas.filter(c => c.Tipo === 'principal').map(cp => (
        <div key={cp.Id_Caja} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <DollarSign size={16} color="#2563eb" />
          <span style={{ fontWeight: 600, color: '#2563eb' }}>{cp.Nombre}:</span>
          <span style={{ fontWeight: 800, color: '#1e40af', fontSize: 14 }}>{fmtMon(parseFloat(cp.Saldo) || 0)}</span>
          <span style={{ color: '#6b7280', fontSize: 11 }}>(acumulado de retiros)</span>
        </div>
      ))}

      {esCajaPrincipal ? (
        /* ===================== UI CAJA PRINCIPAL ===================== */
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Badge administrativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ background: '#1e40af', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
              ADMINISTRATIVA
            </span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              No tiene sesiones operativas · Solo recibe traslados y movimientos directos
            </span>
          </div>

          {/* Saldo actual */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#3b82f6', marginBottom: 4 }}>Saldo acumulado</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>
              {fmtMon(parseFloat(cajaActual?.Saldo) || 0)}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button onClick={() => { setShowIngresoPrincipal(true); setMontoMov(''); setDescMov(''); }}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Ingreso administrativo
            </button>
            <button onClick={() => { setShowEgresoPrincipal(true); setMontoMov(''); setDescMov(''); }}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              − Egreso administrativo
            </button>
          </div>

          {/* Historial de movimientos */}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Movimientos recientes</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', color: '#6b7280' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción / Origen</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {movsPrincipal.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#9ca3af' }}>Sin movimientos registrados</td>
                </tr>
              )}
              {movsPrincipal.map((m: any) => {
                const esIngreso = ['traslado', 'deposito'].includes(m.Tipo);
                const etiqueta: Record<string, string> = {
                  traslado: 'Traslado recibido',
                  deposito: 'Ingreso admin',
                  gasto: 'Egreso admin',
                  retiro_parcial: 'Retiro',
                };
                const origen = m.caja_origen ?? m.cajero ?? '';
                const desc = m.Descripcion ? m.Descripcion : origen;
                return (
                  <tr key={m.Id_Mov} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '5px 8px', color: '#6b7280' }}>{new Date(m.Fecha).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{ background: esIngreso ? '#dcfce7' : '#fee2e2', color: esIngreso ? '#16a34a' : '#dc2626', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>
                        {etiqueta[m.Tipo as string] ?? m.Tipo}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', color: '#374151' }}>{desc}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: esIngreso ? '#16a34a' : '#dc2626' }}>
                      {esIngreso ? '+' : '−'} {fmtMon(Math.abs(parseFloat(m.Valor) || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Modal Ingreso */}
          {showIngresoPrincipal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Ingreso administrativo</h3>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Descripción</label>
                <input value={descMov} onChange={e => setDescMov(e.target.value)} placeholder="Ej: Aporte de capital, préstamo..."
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12, fontSize: 13, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 12, color: '#6b7280' }}>Monto</label>
                <input value={montoMov} onChange={e => setMontoMov(e.target.value)} placeholder="0"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16, fontSize: 13, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowIngresoPrincipal(false)} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={registrarIngresoPrincipal} disabled={loadingMov}
                    style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    {loadingMov ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Egreso */}
          {showEgresoPrincipal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Egreso administrativo</h3>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Descripción</label>
                <input value={descMov} onChange={e => setDescMov(e.target.value)} placeholder="Ej: Pago servicios, gastos administrativos..."
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12, fontSize: 13, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 12, color: '#6b7280' }}>Monto</label>
                <input value={montoMov} onChange={e => setMontoMov(e.target.value)} placeholder="0"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16, fontSize: 13, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowEgresoPrincipal(false)} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={registrarEgresoPrincipal} disabled={loadingMov}
                    style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    {loadingMov ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        /* ===================== FIN UI CAJA PRINCIPAL ===================== */
      ) : (
        /* ===================== UI CAJA OPERATIVA ===================== */
        <div>
          {!abierta ? (
            /* CAJA CERRADA */
            <div style={{ background: '#fff', borderRadius: 14, padding: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Lock size={24} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{cajaActual?.Nombre || 'Caja'} — Cerrada</h3>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Ingrese la base para abrir</p>

              {cajaActual && cajaActual.base_sugerida > 0 && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 11, color: '#713f12', maxWidth: 360, margin: '0 auto 14px' }}>
                  💡 <b>Base sugerida {fmtMon(cajaActual.base_sugerida)}</b> — Es lo que quedó físicamente en el cajón después del último cierre. Cuente y confirme antes de abrir.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
                <input type="text" value={base} onChange={e => setBase(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="$ 0" autoFocus onKeyDown={e => { if (e.key === 'Enter') abrirCaja(); }}
                  style={{ width: 150, height: 38, textAlign: 'center', border: '2px solid #d1d5db', borderRadius: 10, fontSize: 16, fontWeight: 700, outline: 'none' }} />
                <button onClick={abrirCaja}
                  style={{ height: 38, padding: '0 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Unlock size={16} /> Abrir Caja
                </button>
              </div>
            </div>
          ) : (
            /* CAJA ABIERTA */
            <div>
              <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Unlock size={18} color="#16a34a" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', flex: 1 }}>
                  {sesion.NombreCaja} — Abierta
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: 11 }}>
                    Base: {fmtMon(res.base)} | Desde: {new Date(res.fecha_apertura).toLocaleString('es-CO')}
                  </span>
                </span>
                <button onClick={solicitarCorregirBase}
                  title="Corregir el valor de la base si se digitó mal al abrir. Requiere autorización de administrador."
                  style={{ height: 28, padding: '0 10px', background: '#eef2ff', color: '#4338ca', border: '1px solid #a5b4fc', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={13} /> Corregir base
                </button>
                <button onClick={() => setShowRetiro(true)}
                  style={{ height: 28, padding: '0 10px', background: '#fef3c7', color: '#d97706', border: '1px solid #d97706', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowDownRight size={13} /> Retiro
                </button>
                <button onClick={() => setShowCerrar(!showCerrar)}
                  style={{ height: 28, padding: '0 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={13} /> Cerrar
                </button>
              </div>

              {/* Resumen */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Resumen de Sesión</div>
                <div style={{ display: 'flex', padding: '4px 0', borderBottom: '2px solid #e5e7eb', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                  <span style={{ flex: 1 }}>Concepto</span>
                  <span style={{ width: 110, textAlign: 'right' }}>Efectivo</span>
                  <span style={{ width: 110, textAlign: 'right' }}>Transferencia</span>
                </div>
                {linea('Base', res.base, 0)}
                {linea(`Ventas Contado (${res.ventas_contado_cantidad})`, res.ventas_contado_efectivo, res.ventas_contado_transferencia)}
                {linea(`Ventas Crédito (${res.ventas_credito_cantidad})`, 0, res.ventas_credito, '#6b7280')}
                {linea(`Pagos Clientes (${res.pagos_cantidad})`, res.pagos_efectivo, res.pagos_transferencia, '#16a34a')}
                {res.egresos > 0 && linea(`Egresos (${res.egresos_cantidad})`, -res.egresos, 0, '#dc2626')}
                {res.anulaciones > 0 && linea(`Anulaciones (${res.anulaciones_cantidad})`, -res.anulaciones, 0, '#dc2626')}
                {res.retiros_parciales > 0 && linea('Retiros parciales', -res.retiros_parciales, 0, '#d97706')}
                <div style={{ display: 'flex', padding: '8px 0', borderTop: '3px solid #1f2937', marginTop: 6 }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>Total en Efectivo</span>
                  <span style={{ width: 110, textAlign: 'right', fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{fmtMon(res.total_efectivo)}</span>
                  <span style={{ width: 110 }} />
                </div>
                <div style={{ display: 'flex', padding: '6px 0', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>Total Venta del Día</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{fmtMon(res.total_venta_dia)}</span>
                </div>
              </div>

              {/* Movimientos de la sesión */}
              {res.movimientos && res.movimientos.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Movimientos de Caja</div>
                  {res.movimientos.map((m: any) => (
                    <div key={m.Id_Mov} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                      <ArrowDownRight size={13} color="#d97706" />
                      <span style={{ flex: 1, color: '#6b7280' }}>{m.Descripcion}</span>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>-{fmtMon(parseFloat(m.Valor))}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(m.Fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cerrar caja */}
              {showCerrar && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #dc2626' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>Cierre de Caja</div>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Cuente el efectivo y escriba el total:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4 }}>CONTEO EFECTIVO</label>
                      <input type="text" value={conteo} onChange={e => setConteo(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="$ 0" autoFocus
                        style={{ width: 160, height: 38, textAlign: 'center', border: '2px solid #dc2626', borderRadius: 10, fontSize: 16, fontWeight: 700, outline: 'none' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>SISTEMA</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{fmtMon(res.total_efectivo)}</div>
                    </div>
                    {conteo && (() => {
                      const d = (parseInt(conteo) || 0) - res.total_efectivo;
                      return (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>DIFERENCIA</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: d === 0 ? '#16a34a' : d > 0 ? '#2563eb' : '#dc2626' }}>
                            {d === 0 ? 'Cuadra' : d > 0 ? `Sobrante ${fmtMon(d)}` : `Faltante ${fmtMon(Math.abs(d))}`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Opción de traslado */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>¿Qué hacer con el efectivo?</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { id: 'ganancias' as const, label: 'Dejar base, pasar ganancias', desc: `Base ${fmtMon(res.base)} queda en caja`, color: '#16a34a' },
                        { id: 'todo' as const, label: 'Pasar todo a Principal', desc: 'La caja queda en $0', color: '#2563eb' },
                        { id: 'nada' as const, label: 'No trasladar', desc: 'Solo cerrar sesión', color: '#6b7280' },
                      ].map(opt => (
                        <div key={opt.id} onClick={() => setOpcionTraslado(opt.id)}
                          style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                            border: opcionTraslado === opt.id ? `2px solid ${opt.color}` : '2px solid #e5e7eb',
                            background: opcionTraslado === opt.id ? opt.color + '10' : '#fff',
                          }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: opcionTraslado === opt.id ? opt.color : '#374151' }}>{opt.label}</div>
                          <div style={{ fontSize: 9, color: '#9ca3af' }}>{opt.desc}</div>
                        </div>
                      ))}
                    </div>
                    {conteo && opcionTraslado !== 'nada' && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                        Trasladar a Caja Principal: <b style={{ color: '#16a34a' }}>
                          {fmtMon(opcionTraslado === 'todo' ? (parseInt(conteo) || 0) : Math.max((parseInt(conteo) || 0) - res.base, 0))}
                        </b>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setShowCerrar(false)} style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={cerrarCaja} style={{ height: 32, padding: '0 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Lock size={14} /> Cerrar Caja
                    </button>
                  </div>
                </div>
              )}

              {/* Retiro parcial */}
              {showRetiro && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #d97706', marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#d97706', marginBottom: 10 }}>Retiro Parcial</div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4 }}>DESCRIPCIÓN</label>
                      <input type="text" value={retiroDesc} onChange={e => setRetiroDesc(e.target.value)} placeholder="Retiro para caja principal"
                        style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, padding: '0 10px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4 }}>VALOR</label>
                      <input type="text" value={retiroValor} onChange={e => setRetiroValor(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="$ 0" autoFocus
                        style={{ width: 130, height: 32, textAlign: 'right', border: '2px solid #d97706', borderRadius: 8, fontSize: 13, fontWeight: 700, padding: '0 10px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setShowRetiro(false)} style={{ height: 30, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={hacerRetiro} disabled={!retiroValor || parseInt(retiroValor) <= 0}
                      style={{ height: 30, padding: '0 14px', background: parseInt(retiroValor) > 0 ? '#d97706' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: parseInt(retiroValor) > 0 ? 'pointer' : 'default' }}>
                      Registrar Retiro
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal historial */}
      {showHistorial && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowHistorial(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 750, maxHeight: '70vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Historial de Sesiones — {cajaActual?.Nombre}</span>
              <button onClick={() => setShowHistorial(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '5px 6px', textAlign: 'left' }}>Apertura</th>
                  <th style={{ padding: '5px 6px', textAlign: 'left' }}>Cajero</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right' }}>Base</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right' }}>Contado</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right' }}>Pagos</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right' }}>Retiros</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right' }}>Conteo</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right' }}>Dif.</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((s: any) => {
                  const d = parseFloat(s.DiferenciaFinal) || 0;
                  return (
                    <tr key={s.Id_Sesion} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '4px 6px' }}>{new Date(s.FechaApertura).toLocaleDateString('es-CO')} {new Date(s.FechaApertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '4px 6px' }}>{s.NombreUsuario || '-'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmtMon(parseFloat(s.BaseInicial) || 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmtMon(parseFloat(s.VentasContadoEfectivo) || 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmtMon(parseFloat(s.PagosEfectivo) || 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#d97706' }}>{fmtMon(parseFloat(s.RetirosParciales) || 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(parseFloat(s.ConteoFinal) || 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: d === 0 ? '#16a34a' : d > 0 ? '#2563eb' : '#dc2626' }}>
                        {s.Estado === 'abierta' ? '-' : d === 0 ? '✓' : fmtMon(d)}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: s.Estado === 'abierta' ? '#dcfce7' : '#f3f4f6', color: s.Estado === 'abierta' ? '#16a34a' : '#6b7280' }}>
                          {s.Estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Corregir base de la sesión abierta */}
      {showCorregirBase && data?.resumen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCorregirBase(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: 20, width: 380, maxWidth: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Edit3 size={20} color="#4338ca" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Corregir base de la caja</span>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#78350f', marginBottom: 12 }}>
              ⚠ Use solo si digitó mal la base al abrir. No afecta ventas ni pagos ya registrados — solo cambia el saldo inicial de referencia. Quedará registrado en la observación de la sesión con el usuario que autorizó.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#6b7280' }}>
              <span>Base actual:</span>
              <b style={{ color: '#1f2937' }}>{fmtMon(data.resumen.base || 0)}</b>
            </div>
            <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', fontWeight: 600 }}>Base correcta</label>
            <input type="text"
              value={baseCorreccion}
              onChange={e => setBaseCorreccion(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') ejecutarCorregirBase(null); }}
              onFocus={e => e.target.select()}
              onClick={e => (e.target as HTMLInputElement).select()}
              placeholder="Ingrese el valor real de la base"
              autoFocus
              style={{ width: '100%', height: 40, padding: '0 12px', border: '2px solid #4338ca', borderRadius: 8, fontSize: 18, fontWeight: 700, color: '#4338ca', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'right', minHeight: 14 }}>
              {baseCorreccion ? fmtMon(parseInt(baseCorreccion) || 0) : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCorregirBase(false)}
                style={{ height: 36, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => ejecutarCorregirBase(null)}
                disabled={!baseCorreccion}
                style={{ height: 36, padding: '0 16px', background: baseCorreccion ? '#4338ca' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: baseCorreccion ? 'pointer' : 'not-allowed' }}>
                Corregir base
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de autorización admin para corregir base (si el usuario no es admin) */}
      {pedirAuthBase && (
        <AutorizacionAdminModal
          motivo={`Corregir base de la sesión #${data?.sesion?.Id_Sesion ?? ''}`}
          onCancelar={() => setPedirAuthBase(false)}
          onAutorizado={(admin) => { setPedirAuthBase(false); setTimeout(() => ejecutarCorregirBase(admin), 100); }}
        />
      )}

      {/* Modal admin cajas */}
      {showAdminCajas && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAdminCajas(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Administrar Cajas</span>
              <button onClick={() => setShowAdminCajas(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {cajas.map(c => (
              <div key={c.Id_Caja} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <DollarSign size={16} color={c.Tipo === 'principal' ? '#2563eb' : '#16a34a'} />
                <span style={{ flex: 1, fontWeight: 600 }}>{c.Nombre}</span>
                <span style={{ fontSize: 10, color: '#6b7280', padding: '2px 6px', background: '#f3f4f6', borderRadius: 4 }}>{c.Tipo === 'principal' ? 'Principal' : 'Punto de venta'}</span>
                {c.Tipo === 'principal' && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{fmtMon(parseFloat(c.Saldo) || 0)}</span>}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input type="text" value={nuevaCajaNombre} onChange={e => setNuevaCajaNombre(e.target.value)} placeholder="Nombre de la nueva caja"
                onKeyDown={e => { if (e.key === 'Enter') crearCaja(); }}
                style={{ flex: 1, height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, padding: '0 10px' }} />
              <button onClick={crearCaja}
                style={{ height: 32, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={14} /> Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
