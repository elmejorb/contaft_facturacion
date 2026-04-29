import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { RefreshCw, Eye, Plus, ArrowUpRight, ArrowDownRight, FileText, DollarSign, X, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getConfigImpresion } from './ConfiguracionSistema';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/caja/movimientos.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function HistorialCajas() {
  const { user } = useAuth();
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filtroCaja, setFiltroCaja] = useState('');
  const [desde, setDesde] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [detalleSesion, setDetalleSesion] = useState<any>(null);
  const [showNuevoMov, setShowNuevoMov] = useState<'ingreso' | 'egreso' | null>(null);
  const [movValor, setMovValor] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movCaja, setMovCaja] = useState(0);
  const [showTrasladar, setShowTrasladar] = useState(false);
  const [trasladarValor, setTrasladarValor] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?desde=${desde}&hasta=${hasta}`;
      if (filtroCaja) url += `&caja=${filtroCaja}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setSesiones(d.sesiones || []);
        setMovimientos(d.movimientos || []);
        setCajas(d.cajas || []);
        setResumen(d.resumen || {});
      }
    } catch (e) {}
    setLoading(false);
  };

  const verDetalle = async (id: number) => {
    try {
      const r = await fetch(`${API}?sesion=${id}`);
      const d = await r.json();
      if (d.success) setDetalleSesion(d);
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const guardarNota = async (sesionId: number, obs: string) => {
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nota', sesion_id: sesionId, observacion: obs }) });
      const d = await r.json();
      if (d.success) toast.success('Nota guardada');
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const registrarMovimiento = async () => {
    const val = parseInt(movValor) || 0;
    if (val <= 0 || !movDesc || !movCaja) { toast.error('Complete los campos'); return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: showNuevoMov, caja_id: movCaja, valor: val, descripcion: movDesc, usuario_id: user?.id || 0 }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowNuevoMov(null); setMovValor(''); setMovDesc(''); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const trasladarManual = async () => {
    if (!detalleSesion) return;
    const val = parseInt(trasladarValor) || 0;
    if (val <= 0) { toast.error('Ingrese un valor'); return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trasladar', sesion_id: detalleSesion.sesion.Id_Sesion, valor: val, usuario_id: user?.id || 0 }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowTrasladar(false); setTrasladarValor(''); verDetalle(detalleSesion.sesion.Id_Sesion); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const imprimirCuadreHistorial = (s: any) => {
    const fecha = new Date(s.FechaApertura).toLocaleDateString('es-CO');
    const horaCierre = s.FechaCierre ? new Date(s.FechaCierre).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
    const diff = parseFloat(s.DiferenciaFinal) || 0;
    const conteoVal = parseFloat(s.ConteoFinal) || 0;
    const totalEf = parseFloat(s.TotalEfectivoSistema) || 0;
    const base = parseFloat(s.BaseInicial) || 0;
    const ventasEf = parseFloat(s.VentasContadoEfectivo) || 0;
    const ventasTr = parseFloat(s.VentasContadoTransf) || 0;
    const ventasCr = parseFloat(s.VentasCredito) || 0;
    const pagosEf = parseFloat(s.PagosEfectivo) || 0;
    const pagosTr = parseFloat(s.PagosTransf) || 0;
    const egresos = parseFloat(s.Egresos) || 0;
    const anulaciones = parseFloat(s.Anulaciones) || 0;
    const retiros = parseFloat(s.RetirosParciales) || 0;
    const totalVenta = ventasEf + ventasTr + ventasCr;
    const formato = getConfigImpresion().formatoCuadreCaja || 'tirilla';

    let html = '', pageStyle = '', winWidth = 500;

    if (formato === 'tirilla') {
      pageStyle = `@page { size: 80mm auto; margin: 2mm; }`;
      winWidth = 360;
      const lineDot = (label: string, value: string) =>
        `<div style="display:flex;justify-content:space-between;font-family:'Courier New',monospace;font-size:11px;line-height:1.4;"><span>${label}</span><span style="font-weight:bold;">${value}</span></div>`;
      const sepDouble = `<div style="border-top:1px dashed #000;margin:4px 0;"></div>`;
      const sepSolid = `<div style="border-top:1px solid #000;margin:5px 0;"></div>`;
      html = `
        <div style="width:76mm;font-family:'Courier New',monospace;color:#000;padding:4px 2mm;">
          <div style="text-align:center;font-size:14px;font-weight:bold;letter-spacing:1px;">CUADRE DE CAJA</div>
          <div style="text-align:center;font-size:9px;color:#666;font-style:italic;">- REIMPRESIÓN -</div>
          <div style="text-align:center;font-size:10px;">${s.NombreCaja || 'Caja'}</div>
          <div style="text-align:center;font-size:10px;">Cajero: ${s.NombreUsuario || 'Admin'}</div>
          <div style="text-align:center;font-size:10px;">${fecha} ${horaCierre ? '- Cierre ' + horaCierre : ''}</div>
          ${sepDouble}
          ${lineDot('Base', fmtMon(base))}
          ${lineDot('Vtas Contado Ef', fmtMon(ventasEf))}
          ${ventasTr > 0 ? lineDot('  Transferencia', fmtMon(ventasTr)) : ''}
          ${ventasCr > 0 ? lineDot('Vtas Crédito', fmtMon(ventasCr)) : ''}
          ${pagosEf > 0 ? lineDot('Pagos Cli Ef', fmtMon(pagosEf)) : ''}
          ${pagosTr > 0 ? lineDot('  Transferencia', fmtMon(pagosTr)) : ''}
          ${egresos > 0 ? lineDot('Egresos', '-' + fmtMon(egresos)) : ''}
          ${anulaciones > 0 ? lineDot('Anulaciones', '-' + fmtMon(anulaciones)) : ''}
          ${retiros > 0 ? lineDot('Retiros', '-' + fmtMon(retiros)) : ''}
          ${sepSolid}
          ${lineDot('TOTAL SISTEMA', fmtMon(totalEf))}
          ${lineDot('CONTEO REAL', fmtMon(conteoVal))}
          ${sepDouble}
          <div style="text-align:center;font-size:13px;font-weight:bold;padding:4px 0;${diff === 0 ? '' : 'border:1px solid #000;'}">
            ${diff === 0 ? '*** CUADRA ***' : diff > 0 ? `SOBRANTE: ${fmtMon(diff)}` : `FALTANTE: ${fmtMon(Math.abs(diff))}`}
          </div>
          ${sepSolid}
          ${lineDot('VENTA DEL DIA', fmtMon(totalVenta))}
          ${sepDouble}
          <div style="margin-top:18px;text-align:center;font-size:9px;">
            <div style="border-top:1px solid #000;width:60%;margin:0 auto;padding-top:2px;">Firma Cajero</div>
          </div>
          <div style="margin-top:14px;text-align:center;font-size:9px;">
            <div style="border-top:1px solid #000;width:60%;margin:0 auto;padding-top:2px;">Firma Administrador</div>
          </div>
          <div style="text-align:center;font-size:9px;margin-top:8px;color:#666;">- - - Conta FT - - -</div>
        </div>`;
    } else {
      pageStyle = `@page { size: auto; margin: 10mm; }`;
      const linea = (label: string, ef: number, tr?: number) =>
        `<tr><td style="padding:3px 6px;">${label}</td><td style="padding:3px 6px;text-align:right;font-weight:600;">${fmtMon(ef)}</td>${tr !== undefined ? `<td style="padding:3px 6px;text-align:right;color:#666;">${fmtMon(tr)}</td>` : ''}</tr>`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
          <div style="text-align:center;margin-bottom:8px;">
            <div style="font-size:16px;font-weight:bold;">CUADRE DE CAJA</div>
            <div style="font-size:11px;color:#999;font-style:italic;">— REIMPRESIÓN —</div>
            <div style="font-size:12px;color:#666;">${s.NombreCaja || 'Caja'} — ${s.NombreUsuario || 'Admin'}</div>
            <div style="font-size:12px;color:#666;">Fecha: ${fecha} — Cierre: ${horaCierre}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;">
            <tr style="background:#f0f0f0;font-weight:bold;">
              <td style="padding:4px 6px;">Concepto</td>
              <td style="padding:4px 6px;text-align:right;">Efectivo</td>
              <td style="padding:4px 6px;text-align:right;">Transferencia</td>
            </tr>
            ${linea('Base', base, 0)}
            ${linea('Ventas Contado', ventasEf, ventasTr)}
            ${linea('Ventas Crédito', 0, ventasCr)}
            ${linea('Pagos Clientes', pagosEf, pagosTr)}
            ${egresos > 0 ? linea('Egresos', -egresos, 0) : ''}
            ${anulaciones > 0 ? linea('Anulaciones', -anulaciones, 0) : ''}
            ${retiros > 0 ? linea('Retiros parciales', -retiros, 0) : ''}
          </table>
          <div style="border-top:3px solid #000;padding-top:8px;margin-bottom:12px;">
            <table style="width:100%;font-size:13px;">
              <tr><td style="font-weight:bold;">Total Efectivo (Sistema):</td><td style="text-align:right;font-weight:bold;">${fmtMon(totalEf)}</td></tr>
              <tr><td style="font-weight:bold;">Conteo de Caja:</td><td style="text-align:right;font-weight:bold;">${fmtMon(conteoVal)}</td></tr>
              <tr style="font-size:15px;${diff === 0 ? 'color:green;' : diff > 0 ? 'color:blue;' : 'color:red;'}">
                <td style="font-weight:bold;">Diferencia:</td>
                <td style="text-align:right;font-weight:bold;">${diff === 0 ? 'CUADRA ✓' : fmtMon(diff) + (diff > 0 ? ' (Sobrante)' : ' (Faltante)')}</td>
              </tr>
            </table>
          </div>
          <div style="border-top:2px solid #000;padding-top:8px;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="font-weight:bold;">Total Venta del Día:</td><td style="text-align:right;font-weight:bold;font-size:16px;">${fmtMon(totalVenta)}</td></tr>
            </table>
          </div>
          <div style="margin-top:30px;display:flex;justify-content:space-between;">
            <div style="text-align:center;width:45%;"><div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Cajero</div></div>
            <div style="text-align:center;width:45%;"><div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Administrador</div></div>
          </div>
        </div>`;
    }

    const win = window.open('', 'CuadreCaja', `width=${winWidth},height=720,menubar=no,toolbar=no`);
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Cuadre de Caja - ${fecha}</title>
      <style>@media print { ${pageStyle} body { margin: 0; } .no-print { display: none !important; } }</style>
      </head><body>
      <div class="no-print" style="padding:8px 16px;background:#7c3aed;display:flex;gap:8px;align-items:center;">
        <button onclick="window.print()" style="height:30px;padding:0 14px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Imprimir</button>
        <button onclick="window.close()" style="height:30px;padding:0 14px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:6px;font-size:12px;cursor:pointer;">Cerrar</button>
        <span style="color:rgba(255,255,255,0.8);font-size:12px;margin-left:auto;">Cuadre — ${s.NombreCaja || 'Caja'} — ${fecha} (${formato === 'tirilla' ? 'Tirilla' : 'Media carta'})</span>
      </div>${html}</body></html>`);
    win.document.close();
  };

  useEffect(() => { cargar(); }, [desde, hasta, filtroCaja]);

  const colsSesiones: ColDef[] = [
    { headerName: '#', field: 'Id_Sesion', width: 55, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Caja', field: 'NombreCaja', width: 90 },
    { headerName: 'Cajero', field: 'NombreUsuario', width: 120 },
    { headerName: 'Apertura', field: 'FechaApertura', width: 130, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' },
    { headerName: 'Base', field: 'BaseInicial', width: 90, cellRenderer: (p: any) => <span>{fmtMon(parseFloat(p.value) || 0)}</span> },
    { headerName: 'V. Efectivo', field: 'VentasContadoEfectivo', width: 100, cellRenderer: (p: any) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmtMon(parseFloat(p.value) || 0)}</span> },
    { headerName: 'Pagos', field: 'PagosEfectivo', width: 90, cellRenderer: (p: any) => <span style={{ color: '#2563eb' }}>{fmtMon(parseFloat(p.value) || 0)}</span> },
    { headerName: 'Retiros', field: 'RetirosParciales', width: 90, cellRenderer: (p: any) => { const v = parseFloat(p.value) || 0; return v > 0 ? <span style={{ color: '#d97706' }}>-{fmtMon(v)}</span> : '-'; } },
    { headerName: 'Conteo', field: 'ConteoFinal', width: 100, cellRenderer: (p: any) => <span style={{ fontWeight: 700 }}>{fmtMon(parseFloat(p.value) || 0)}</span> },
    { headerName: 'Dif.', field: 'DiferenciaFinal', width: 80, cellRenderer: (p: any) => {
      const v = parseFloat(p.value) || 0;
      if (p.data.Estado === 'abierta') return <span style={{ color: '#d97706' }}>Abierta</span>;
      return <span style={{ fontWeight: 700, color: v === 0 ? '#16a34a' : v > 0 ? '#2563eb' : '#dc2626' }}>{v === 0 ? '✓' : fmtMon(v)}</span>;
    }},
    { headerName: '', width: 70, sortable: false, cellRenderer: (p: any) => (
      <div style={{ display: 'flex', gap: 3 }}>
        <button title="Ver detalle" onClick={() => verDetalle(p.data.Id_Sesion)}
          style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Eye size={13} color="#6b7280" />
        </button>
        {p.data.Estado === 'cerrada' && (
          <button title="Imprimir cuadre" onClick={() => imprimirCuadreHistorial(p.data)}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Printer size={13} color="#7c3aed" />
          </button>
        )}
      </div>
    )}
  ];

  const colsMovimientos: ColDef[] = [
    { headerName: 'Fecha', field: 'Fecha', width: 130, cellRenderer: (p: any) => new Date(p.value).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { headerName: 'Tipo', field: 'Tipo', width: 100, cellRenderer: (p: any) => {
      const colors: Record<string, { bg: string; fg: string }> = { retiro_parcial: { bg: '#fef3c7', fg: '#d97706' }, traslado: { bg: '#dbeafe', fg: '#2563eb' }, deposito: { bg: '#dcfce7', fg: '#16a34a' }, gasto: { bg: '#fee2e2', fg: '#dc2626' } };
      const c = colors[p.value] || { bg: '#f3f4f6', fg: '#374151' };
      return <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: c.bg, color: c.fg }}>{p.value}</span>;
    }},
    { headerName: 'Descripción', field: 'Descripcion', flex: 1, minWidth: 150 },
    { headerName: 'Origen', field: 'CajaOrigen', width: 90 },
    { headerName: 'Destino', field: 'CajaDestino', width: 90 },
    { headerName: 'Valor', field: 'Valor', width: 110, cellRenderer: (p: any) => {
      const tipo = p.data.Tipo;
      const color = tipo === 'deposito' || tipo === 'traslado' ? '#16a34a' : '#dc2626';
      const signo = tipo === 'gasto' || tipo === 'retiro_parcial' ? '-' : '+';
      return <span style={{ fontWeight: 700, color }}>{signo}{fmtMon(parseFloat(p.value) || 0)}</span>;
    }},
    { headerName: 'Usuario', field: 'NombreUsuario', width: 100 },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Historial de Cajas</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Sesiones, movimientos, ingresos y egresos</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setShowNuevoMov('ingreso'); setMovCaja(cajas.find(c => c.Tipo === 'principal')?.Id_Caja || 1); }}
            style={{ height: 30, padding: '0 10px', background: '#dcfce7', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={13} /> Ingreso
          </button>
          <button onClick={() => { setShowNuevoMov('egreso'); setMovCaja(cajas.find(c => c.Tipo === 'principal')?.Id_Caja || 1); }}
            style={{ height: 30, padding: '0 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowDownRight size={13} /> Egreso
          </button>
          <button onClick={cargar}
            style={{ height: 30, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refrescar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Sesiones', value: resumen.total_sesiones || 0, color: '#7c3aed' },
          { label: 'Ventas Efectivo', value: fmtMon(resumen.total_ventas || 0), color: '#16a34a', text: true },
          { label: 'Pagos Recibidos', value: fmtMon(resumen.total_pagos || 0), color: '#2563eb', text: true },
          { label: 'Egresos', value: fmtMon(resumen.total_egresos || 0), color: '#dc2626', text: true },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
            <div style={{ fontSize: s.text ? 15 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>a</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }} />
        <select value={filtroCaja} onChange={e => setFiltroCaja(e.target.value)}
          style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value="">Todas las cajas</option>
          {cajas.map(c => <option key={c.Id_Caja} value={c.Id_Caja}>{c.Nombre}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>{sesiones.length} sesiones | {movimientos.length} movimientos</span>
      </div>

      {/* Sesiones o Resumen de Caja Principal */}
      {(() => {
        const cajaSel = cajas.find((c: any) => String(c.Id_Caja) === filtroCaja);
        const esPrincipal = cajaSel?.Tipo === 'principal';

        if (esPrincipal) {
          // Caja Principal: mostrar saldo y resumen
          const totalIngresos = movimientos.filter((m: any) => m.Tipo === 'deposito' || m.Tipo === 'traslado').reduce((s: number, m: any) => s + (parseFloat(m.Valor) || 0), 0);
          const totalEgresos = movimientos.filter((m: any) => m.Tipo === 'gasto' || m.Tipo === 'retiro_parcial').reduce((s: number, m: any) => s + (parseFloat(m.Valor) || 0), 0);
          return (
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <DollarSign size={22} color="#2563eb" />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1e40af' }}>Caja Principal</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>SALDO ACTUAL</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>{fmtMon(parseFloat(cajaSel.Saldo) || 0)}</div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>INGRESOS (período)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{fmtMon(totalIngresos)}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{movimientos.filter((m: any) => m.Tipo === 'deposito' || m.Tipo === 'traslado').length} movimientos</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>EGRESOS (período)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{fmtMon(totalEgresos)}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{movimientos.filter((m: any) => m.Tipo === 'gasto' || m.Tipo === 'retiro_parcial').length} movimientos</div>
                </div>
              </div>
            </div>
          );
        }

        // Cajas normales: mostrar grid de sesiones
        return (
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 12 }}>
            <div style={{ padding: '6px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600 }}>Sesiones de Caja ({sesiones.length})</div>
            <div style={{ height: 280 }}>
              <AgGridReact rowData={sesiones} columnDefs={colsSesiones} loading={loading} animateRows defaultColDef={{ resizable: true, sortable: true }} rowHeight={34} headerHeight={34} getRowId={p => String(p.data.Id_Sesion)} />
            </div>
          </div>
        );
      })()}

      {/* Movimientos */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '6px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600 }}>Movimientos de Caja</div>
        <div style={{ height: 250 }}>
          <AgGridReact rowData={movimientos} columnDefs={colsMovimientos} animateRows defaultColDef={{ resizable: true, sortable: true }} rowHeight={34} headerHeight={34} getRowId={p => String(p.data.Id_Mov)} />
        </div>
      </div>

      {/* Modal nuevo movimiento */}
      {showNuevoMov && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowNuevoMov(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: showNuevoMov === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                {showNuevoMov === 'ingreso' ? 'Nuevo Ingreso' : 'Nuevo Egreso'}
              </span>
              <button onClick={() => setShowNuevoMov(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Caja</label>
              <select value={movCaja} onChange={e => setMovCaja(parseInt(e.target.value))}
                style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}>
                {cajas.map(c => <option key={c.Id_Caja} value={c.Id_Caja}>{c.Nombre} {c.Tipo === 'principal' ? '(Principal)' : ''}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Descripción</label>
              <input type="text" value={movDesc} onChange={e => setMovDesc(e.target.value)} placeholder="Ej: Pago de servicios"
                style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor</label>
              <input type="text" value={movValor} onChange={e => setMovValor(e.target.value.replace(/[^0-9]/g, ''))} placeholder="$ 0"
                style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', fontWeight: 700, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNuevoMov(null)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={registrarMovimiento}
                style={{ height: 34, padding: '0 20px', background: showNuevoMov === 'ingreso' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {showNuevoMov === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle sesión */}
      {detalleSesion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setDetalleSesion(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 700, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Sesión #{detalleSesion.sesion.Id_Sesion}</span>
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 10 }}>{detalleSesion.sesion.NombreCaja} — {detalleSesion.sesion.NombreUsuario}</span>
              </div>
              <button onClick={() => setDetalleSesion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16, fontSize: 12 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Base</div>
                <div style={{ fontWeight: 700 }}>{fmtMon(parseFloat(detalleSesion.sesion.BaseInicial) || 0)}</div>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Conteo</div>
                <div style={{ fontWeight: 700, color: '#16a34a' }}>{fmtMon(parseFloat(detalleSesion.sesion.ConteoFinal) || 0)}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Sistema</div>
                <div style={{ fontWeight: 700 }}>{fmtMon(parseFloat(detalleSesion.sesion.TotalEfectivoSistema) || 0)}</div>
              </div>
              <div style={{ background: parseFloat(detalleSesion.sesion.DiferenciaFinal) === 0 ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Diferencia</div>
                <div style={{ fontWeight: 700, color: parseFloat(detalleSesion.sesion.DiferenciaFinal) === 0 ? '#16a34a' : '#dc2626' }}>
                  {parseFloat(detalleSesion.sesion.DiferenciaFinal) === 0 ? 'Cuadra ✓' : fmtMon(parseFloat(detalleSesion.sesion.DiferenciaFinal))}
                </div>
              </div>
            </div>

            {/* Nota */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observación / Nota</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" defaultValue={detalleSesion.sesion.Observacion || ''} id="nota-sesion"
                  placeholder="Agregar nota..."
                  style={{ flex: 1, height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} />
                <button onClick={() => { const v = (document.getElementById('nota-sesion') as HTMLInputElement)?.value; guardarNota(detalleSesion.sesion.Id_Sesion, v); }}
                  style={{ height: 30, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Guardar</button>
              </div>
            </div>

            {/* Trasladar manual */}
            {detalleSesion.sesion.Estado === 'cerrada' && (
              <div style={{ marginBottom: 16 }}>
                {!showTrasladar ? (
                  <button onClick={() => { setShowTrasladar(true); setTrasladarValor(String(Math.round(parseFloat(detalleSesion.sesion.ConteoFinal) || 0))); }}
                    style={{ height: 30, padding: '0 12px', background: '#dbeafe', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUpRight size={13} /> Trasladar a Caja Principal
                  </button>
                ) : (
                  <div style={{ border: '2px solid #2563eb', borderRadius: 10, padding: 12, background: '#eff6ff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>Trasladar a Caja Principal</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4 }}>VALOR A TRASLADAR</label>
                        <input type="text" value={trasladarValor} onChange={e => setTrasladarValor(e.target.value.replace(/[^0-9]/g, ''))}
                          autoFocus
                          style={{ width: 150, height: 32, textAlign: 'center', border: '2px solid #2563eb', borderRadius: 8, fontSize: 14, fontWeight: 700, outline: 'none' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        Conteo: <b>{fmtMon(parseFloat(detalleSesion.sesion.ConteoFinal) || 0)}</b><br />
                        Base: <b>{fmtMon(parseFloat(detalleSesion.sesion.BaseInicial) || 0)}</b>
                      </div>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setShowTrasladar(false)} style={{ height: 30, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={trasladarManual}
                        style={{ height: 30, padding: '0 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Trasladar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ventas */}
            {detalleSesion.ventas?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Ventas ({detalleSesion.ventas.length})</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>Factura</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Tipo</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Efectivo</th>
                  </tr></thead>
                  <tbody>
                    {detalleSesion.ventas.map((v: any) => (
                      <tr key={v.Factura_N} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '3px 6px', color: '#7c3aed', fontWeight: 600 }}>{v.Factura_N}</td>
                        <td style={{ padding: '3px 6px' }}>{v.A_nombre}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>{v.Tipo}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(parseFloat(v.Total) || 0)}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', color: '#16a34a' }}>{fmtMon(parseFloat(v.efectivo) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagos */}
            {detalleSesion.pagos?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Pagos Recibidos ({detalleSesion.pagos.length})</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>Recibo</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>Detalle</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Medio</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Valor</th>
                  </tr></thead>
                  <tbody>
                    {detalleSesion.pagos.map((p: any) => (
                      <tr key={p.Id_Pagos} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '3px 6px', color: '#7c3aed' }}>{p.RecCajaN}</td>
                        <td style={{ padding: '3px 6px' }}>{p.DetallePago}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>{p.MedioPago}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{fmtMon(parseFloat(p.ValorPago) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Movimientos */}
            {detalleSesion.movimientos?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Movimientos de Caja</div>
                {detalleSesion.movimientos.map((m: any) => (
                  <div key={m.Id_Mov} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                    <span style={{ fontSize: 10, color: '#6b7280' }}>{new Date(m.Fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ flex: 1 }}>{m.Descripcion}</span>
                    <span style={{ fontWeight: 700, color: m.Tipo === 'deposito' ? '#16a34a' : '#dc2626' }}>
                      {m.Tipo === 'gasto' || m.Tipo === 'retiro_parcial' ? '-' : '+'}{fmtMon(parseFloat(m.Valor) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
