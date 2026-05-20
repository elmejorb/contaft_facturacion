import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { RefreshCw, Plus, ArrowLeftRight, Building2, Printer, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { hoyLocal, inicioMesLocal } from '../utils/fecha';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/movimientos/bancos.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function BancosManagement() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cuentaSel, setCuentaSel] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumenMov, setResumenMov] = useState<any>({});
  const [desde, setDesde] = useState(inicioMesLocal());
  const [hasta, setHasta] = useState(hoyLocal());
  const [showMov, setShowMov] = useState<'ingreso' | 'egreso' | 'traslado' | null>(null);
  const [movValor, setMovValor] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movRef, setMovRef] = useState('');
  const [movCuentaId, setMovCuentaId] = useState(0);
  // Traslado
  const [trasOrigenTipo, setTrasOrigenTipo] = useState('caja');
  const [trasOrigenId, setTrasOrigenId] = useState(0);
  const [trasDestinoTipo, setTrasDestinoTipo] = useState('banco');
  const [trasDestinoId, setTrasDestinoId] = useState(0);
  // Nueva cuenta
  const [showNuevaCuenta, setShowNuevaCuenta] = useState(false);
  const [ncNombre, setNcNombre] = useState('');
  const [ncBanco, setNcBanco] = useState('');
  const [ncNumero, setNcNumero] = useState('');
  const [ncTipo, setNcTipo] = useState('ahorros');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) { setCuentas(d.cuentas || []); setCajas(d.cajas || []); setTotalSaldo(d.total_saldo || 0); }
    } catch (e) {}
    setLoading(false);
  };

  const cargarMov = async (cuentaId: number) => {
    try {
      const r = await fetch(`${API}?cuenta=${cuentaId}&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) { setMovimientos(d.movimientos || []); setResumenMov(d.resumen || {}); }
    } catch (e) {}
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { if (cuentaSel) cargarMov(cuentaSel.idBancos); }, [cuentaSel, desde, hasta]);

  const registrarMov = async () => {
    const val = parseInt(movValor) || 0;
    if (val <= 0 || !movDesc) { toast.error('Valor y descripción requeridos'); return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: showMov, cuenta_id: movCuentaId || cuentaSel?.idBancos, valor: val, descripcion: movDesc, referencia: movRef }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowMov(null); setMovValor(''); setMovDesc(''); setMovRef(''); cargar(); if (cuentaSel) cargarMov(cuentaSel.idBancos); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const registrarTraslado = async () => {
    const val = parseInt(movValor) || 0;
    if (val <= 0) { toast.error('Valor requerido'); return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'traslado', origen_tipo: trasOrigenTipo, origen_id: trasOrigenId, destino_tipo: trasDestinoTipo, destino_id: trasDestinoId, valor: val, descripcion: movDesc || 'Traslado' }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowMov(null); setMovValor(''); setMovDesc(''); cargar(); if (cuentaSel) cargarMov(cuentaSel.idBancos); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const crearCuenta = async () => {
    if (!ncNombre || !ncBanco) { toast.error('Nombre y banco requeridos'); return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crear_cuenta', nombre: ncNombre, banco: ncBanco, numero_cuenta: ncNumero, tipo_cuenta: ncTipo }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowNuevaCuenta(false); setNcNombre(''); setNcBanco(''); setNcNumero(''); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const tipoLabel: Record<string, string> = {
    ingreso: 'Ingreso', egreso: 'Egreso',
    traslado_entrada: 'Entrada traslado', traslado_salida: 'Salida traslado',
  };

  const exportarCSV = () => {
    if (!movimientos.length) { toast.error('No hay movimientos para exportar'); return; }
    const cols = ['Fecha', 'Tipo', 'Descripcion', 'Referencia', 'Valor'];
    const rows = movimientos.map(m => [
      new Date(m.Fecha).toLocaleString('es-CO'),
      tipoLabel[m.Tipo] ?? m.Tipo,
      `"${(m.Descripcion ?? '').replace(/"/g, '""')}"`,
      m.Referencia ?? '',
      m.Valor,
    ]);
    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${cuentaSel?.NomCuenta ?? 'banco'}_${desde}_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimirHistorial = () => {
    if (!movimientos.length) { toast.error('No hay movimientos para imprimir'); return; }
    const esIngreso = (tipo: string) => ['ingreso', 'traslado_entrada'].includes(tipo);
    const filas = movimientos.map(m => `
      <tr>
        <td>${new Date(m.Fecha).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${tipoLabel[m.Tipo] ?? m.Tipo}</td>
        <td>${m.Descripcion ?? ''}</td>
        <td>${m.Referencia ?? ''}</td>
        <td style="text-align:right;font-weight:700;color:${esIngreso(m.Tipo) ? '#16a34a' : '#dc2626'}">
          ${esIngreso(m.Tipo) ? '+' : '-'}${fmtMon(parseFloat(m.Valor))}
        </td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Historial Movimientos — ${cuentaSel?.NomCuenta}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}
        h2{font-size:16px;margin:0 0 2px}
        .sub{font-size:11px;color:#555;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
        td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}
        tr:nth-child(even) td{background:#f8fafc}
        .resumen{display:flex;gap:24px;margin-top:14px;font-size:12px}
        .res-item strong{display:block;font-size:14px}
        @media print{body{margin:12px}}
      </style></head><body>
      <h2>Historial de Movimientos Bancarios</h2>
      <p class="sub">Cuenta: <strong>${cuentaSel?.NomCuenta}</strong> — ${cuentaSel?.Banco} &nbsp;|&nbsp; Período: ${desde} al ${hasta}</p>
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Referencia</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="resumen">
        <div class="res-item"><strong style="color:#16a34a">${fmtMon(resumenMov.ingresos ?? 0)}</strong>Total ingresos</div>
        <div class="res-item"><strong style="color:#dc2626">${fmtMon(resumenMov.egresos ?? 0)}</strong>Total egresos</div>
        <div class="res-item"><strong>${fmtMon((resumenMov.ingresos ?? 0) - (resumenMov.egresos ?? 0))}</strong>Diferencia</div>
        <div class="res-item"><strong>${fmtMon(cuentaSel?.Saldo ?? 0)}</strong>Saldo actual</div>
      </div>
      <script>window.onload=()=>{window.print()}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const colsMov: ColDef[] = [
    { headerName: 'Fecha', field: 'Fecha', width: 130, cellRenderer: (p: any) => new Date(p.value).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { headerName: 'Tipo', field: 'Tipo', width: 110, cellRenderer: (p: any) => {
      const c: Record<string, { bg: string; fg: string; label: string }> = { ingreso: { bg: '#dcfce7', fg: '#16a34a', label: 'Ingreso' }, egreso: { bg: '#fee2e2', fg: '#dc2626', label: 'Egreso' }, traslado_entrada: { bg: '#dbeafe', fg: '#2563eb', label: 'Entrada' }, traslado_salida: { bg: '#fef3c7', fg: '#d97706', label: 'Salida' } };
      const s = c[p.value] || c.ingreso;
      return <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: s.bg, color: s.fg }}>{s.label}</span>;
    }},
    { headerName: 'Descripción', field: 'Descripcion', flex: 1, minWidth: 150 },
    { headerName: 'Referencia', field: 'Referencia', width: 100 },
    { headerName: 'Valor', field: 'Valor', width: 120, cellRenderer: (p: any) => {
      const esIngreso = ['ingreso', 'traslado_entrada'].includes(p.data.Tipo);
      return <span style={{ fontWeight: 700, color: esIngreso ? '#16a34a' : '#dc2626' }}>{esIngreso ? '+' : '-'}{fmtMon(p.value)}</span>;
    }},
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Bancos</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Cuentas bancarias, ingresos, egresos y traslados</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowNuevaCuenta(true)} style={{ height: 30, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={13} /> Nueva Cuenta
          </button>
          <button onClick={() => { setShowMov('traslado'); setMovValor(''); setMovDesc(''); }} style={{ height: 30, padding: '0 10px', background: '#dbeafe', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeftRight size={13} /> Traslado
          </button>
          <button onClick={cargar} style={{ height: 30, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Cuentas */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cuentas.length + 1, 4)}, 1fr)`, gap: 12, marginBottom: 16 }}>
        {cuentas.filter(c => c.Activa).map(c => (
          <div key={c.idBancos} onClick={() => setCuentaSel(c)}
            style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', border: cuentaSel?.idBancos === c.idBancos ? '2px solid #2563eb' : '2px solid transparent', transition: 'border 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Building2 size={18} color="#2563eb" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.NomCuenta}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{c.Banco} — {c.TipoCuenta} {c.NumCuenta ? `• ${c.NumCuenta}` : ''}</div>
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.Saldo >= 0 ? '#16a34a' : '#dc2626' }}>{fmtMon(c.Saldo)}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <button onClick={e => { e.stopPropagation(); setCuentaSel(c); setShowMov('ingreso'); setMovCuentaId(c.idBancos); setMovValor(''); setMovDesc(''); }}
                style={{ flex: 1, height: 24, background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>+ Ingreso</button>
              <button onClick={e => { e.stopPropagation(); setCuentaSel(c); setShowMov('egreso'); setMovCuentaId(c.idBancos); setMovValor(''); setMovDesc(''); }}
                style={{ flex: 1, height: 24, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>- Egreso</button>
            </div>
          </div>
        ))}
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>TOTAL EN BANCOS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e40af' }}>{fmtMon(totalSaldo)}</div>
        </div>
      </div>

      {/* Movimientos de cuenta seleccionada */}
      {cuentaSel && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 120 }}>{cuentaSel.NomCuenta} — Movimientos</span>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 4px' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>a</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 4px' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Ing: {fmtMon(resumenMov.ingresos || 0)}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>Egr: {fmtMon(resumenMov.egresos || 0)}</span>
            <button onClick={exportarCSV} title="Exportar CSV" style={{ height: 26, padding: '0 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileDown size={12} /> CSV
            </button>
            <button onClick={imprimirHistorial} title="Imprimir historial" style={{ height: 26, padding: '0 8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Printer size={12} /> Imprimir
            </button>
          </div>
          <div style={{ height: 300 }}>
            <AgGridReact rowData={movimientos} columnDefs={colsMov} animateRows defaultColDef={{ resizable: true, sortable: true }} rowHeight={32} headerHeight={32} getRowId={p => String(p.data.Id_Mov)} />
          </div>
        </div>
      )}

      {/* Modal ingreso/egreso */}
      {(showMov === 'ingreso' || showMov === 'egreso') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowMov(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: showMov === 'ingreso' ? '#16a34a' : '#dc2626', marginBottom: 16 }}>
              {showMov === 'ingreso' ? 'Ingreso a cuenta' : 'Egreso de cuenta'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>DESCRIPCIÓN</label>
              <input type="text" value={movDesc} onChange={e => setMovDesc(e.target.value)} placeholder="Concepto" autoFocus
                style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>VALOR</label>
                <input type="text" value={movValor} onChange={e => setMovValor(e.target.value.replace(/[^0-9]/g, ''))} placeholder="$ 0"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>REFERENCIA</label>
                <input type="text" value={movRef} onChange={e => setMovRef(e.target.value)} placeholder="Nº transferencia"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowMov(null)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={registrarMov} style={{ height: 34, padding: '0 20px', background: showMov === 'ingreso' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal traslado */}
      {showMov === 'traslado' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowMov(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 16 }}>Traslado entre Caja ↔ Banco</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>ORIGEN</label>
                <select value={trasOrigenTipo} onChange={e => setTrasOrigenTipo(e.target.value)}
                  style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, marginBottom: 4 }}>
                  <option value="caja">Caja</option>
                  <option value="banco">Banco</option>
                </select>
                <select value={trasOrigenId} onChange={e => setTrasOrigenId(parseInt(e.target.value))}
                  style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                  <option value={0}>Seleccionar...</option>
                  {trasOrigenTipo === 'caja'
                    ? cajas.map(c => <option key={c.Id_Caja} value={c.Id_Caja}>{c.NomCuenta} ({fmtMon(parseFloat(c.Saldo) || 0)})</option>)
                    : cuentas.map(c => <option key={c.idBancos} value={c.idBancos}>{c.NomCuenta} ({fmtMon(c.Saldo)})</option>)
                  }
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>DESTINO</label>
                <select value={trasDestinoTipo} onChange={e => setTrasDestinoTipo(e.target.value)}
                  style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, marginBottom: 4 }}>
                  <option value="banco">Banco</option>
                  <option value="caja">Caja</option>
                </select>
                <select value={trasDestinoId} onChange={e => setTrasDestinoId(parseInt(e.target.value))}
                  style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                  <option value={0}>Seleccionar...</option>
                  {trasDestinoTipo === 'caja'
                    ? cajas.map(c => <option key={c.Id_Caja} value={c.Id_Caja}>{c.NomCuenta}</option>)
                    : cuentas.map(c => <option key={c.idBancos} value={c.idBancos}>{c.NomCuenta}</option>)
                  }
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>VALOR</label>
                <input type="text" value={movValor} onChange={e => setMovValor(e.target.value.replace(/[^0-9]/g, ''))} placeholder="$ 0" autoFocus
                  style={{ width: '100%', height: 32, border: '2px solid #2563eb', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>DESCRIPCIÓN</label>
                <input type="text" value={movDesc} onChange={e => setMovDesc(e.target.value)} placeholder="Traslado"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowMov(null)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={registrarTraslado} style={{ height: 34, padding: '0 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Realizar Traslado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva cuenta */}
      {showNuevaCuenta && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowNuevaCuenta(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nueva Cuenta Bancaria</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>NOMBRE</label>
              <input type="text" value={ncNombre} onChange={e => setNcNombre(e.target.value)} placeholder="Ej: Bancolombia Ahorros" autoFocus
                style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>BANCO</label>
                <input type="text" value={ncBanco} onChange={e => setNcBanco(e.target.value)} placeholder="Bancolombia"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>TIPO</label>
                <select value={ncTipo} onChange={e => setNcTipo(e.target.value)}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 4 }}>NÚMERO DE CUENTA</label>
              <input type="text" value={ncNumero} onChange={e => setNcNumero(e.target.value)} placeholder="000-0000000-00"
                style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNuevaCuenta(false)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearCuenta} style={{ height: 34, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
