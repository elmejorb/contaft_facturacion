import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, RefreshCw, Users, DollarSign, AlertTriangle, Clock, Wallet, Eye, Printer } from 'lucide-react';
import { ClienteDetalle } from './ClienteDetalle';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/clientes/cartera.php';

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface ClienteCartera {
  CodigoClien: number;
  Razon_Social: string;
  Nit: string;
  Telefonos: string;
  Facturas_Pendientes: number;
  Saldo_Total: number;
  Factura_Mas_Antigua: string;
  Dias_Mayor_Vencimiento: number;
  CupoAutorizado: number;
}

export function CuentasPorCobrar() {
  const [clientes, setClientes] = useState<ClienteCartera[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const generarReportePDF = () => {
    const fmtM = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
    const hoy = new Date().toLocaleDateString('es-CO');
    const datos = filtrados;

    // Calcular totales por rango
    const sinVencer = datos.filter(c => c.Dias_Mayor_Vencimiento <= 0).reduce((s, c) => s + c.Saldo_Total, 0);
    const de1a30 = datos.filter(c => c.Dias_Mayor_Vencimiento >= 1 && c.Dias_Mayor_Vencimiento <= 30).reduce((s, c) => s + c.Saldo_Total, 0);
    const de31a60 = datos.filter(c => c.Dias_Mayor_Vencimiento >= 31 && c.Dias_Mayor_Vencimiento <= 60).reduce((s, c) => s + c.Saldo_Total, 0);
    const mas60 = datos.filter(c => c.Dias_Mayor_Vencimiento > 60).reduce((s, c) => s + c.Saldo_Total, 0);
    const total = datos.reduce((s, c) => s + c.Saldo_Total, 0);

    const filas = datos.map(c => {
      const d = c.Dias_Mayor_Vencimiento;
      return `<tr>
        <td style="padding:3px 6px">${c.CodigoClien}</td>
        <td style="padding:3px 6px">${c.Razon_Social}</td>
        <td style="padding:3px 6px;text-align:center">${c.Facturas_Pendientes}</td>
        <td style="padding:3px 6px;text-align:center">${d}d</td>
        <td style="padding:3px 6px;text-align:right">${fmtM(c.Saldo_Total)}</td>
        <td style="padding:3px 6px;text-align:right">${d <= 0 ? fmtM(c.Saldo_Total) : '-'}</td>
        <td style="padding:3px 6px;text-align:right">${d >= 1 && d <= 30 ? fmtM(c.Saldo_Total) : '-'}</td>
        <td style="padding:3px 6px;text-align:right">${d >= 31 && d <= 60 ? fmtM(c.Saldo_Total) : '-'}</td>
        <td style="padding:3px 6px;text-align:right;${d > 60 ? 'font-weight:700;color:#c00' : ''}">${d > 60 ? fmtM(c.Saldo_Total) : '-'}</td>
      </tr>`;
    }).join('');

    const html = `<html><head><title>Cartera de Clientes</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 15mm; }
      @page { size: letter landscape; margin: 10mm; }
      table { width:100%; border-collapse:collapse; }
      th { background:#f0f0f0; border:1px solid #999; padding:4px 6px; font-size:10px; }
      td { border:1px solid #ccc; font-size:10px; }
      .header { text-align:center; margin-bottom:15px; }
      .header h1 { font-size:18px; margin-bottom:2px; }
      .header h2 { font-size:14px; font-weight:400; margin-bottom:8px; }
      .fecha { font-size:11px; margin-bottom:12px; }
      .resumen { margin-top:20px; width:400px; margin-left:auto; }
      .resumen td { padding:4px 10px; }
      .resumen .label { font-weight:600; }
      .resumen .total { font-weight:700; font-size:12px; border-top:2px solid #000; }
    </style></head><body>
      <div class="header">
        <h1>DISTRIBUIDORA DE SALSAS DE PLANETA RICA</h1>
        <h2>Cartera de Clientes</h2>
      </div>
      <div class="fecha"><strong>Fecha Impresión:</strong> ${hoy} &nbsp;&nbsp; <strong>Clientes:</strong> ${datos.length} &nbsp;&nbsp; <strong>Filtro:</strong> ${filtro === 'todos' ? 'Todos' : filtro}</div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Código</th>
            <th style="text-align:left">Cliente</th>
            <th>Fact.</th>
            <th>Días</th>
            <th style="text-align:right">Total Saldo</th>
            <th style="text-align:right">Sin Vencer</th>
            <th style="text-align:right">De 1 a 30</th>
            <th style="text-align:right">De 31 a 60</th>
            <th style="text-align:right">Más de 60</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
          <tr style="font-weight:700;background:#f9f9f9">
            <td colspan="4" style="padding:5px 6px;text-align:right;border:1px solid #999">TOTALES</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(total)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(sinVencer)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(de1a30)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(de31a60)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999;color:#c00">${fmtM(mas60)}</td>
          </tr>
        </tbody>
      </table>

      <table class="resumen">
        <tr><td colspan="2" style="text-align:center;font-weight:700;font-size:13px;padding:10px 0 6px">RESUMEN GENERAL</td></tr>
        <tr><td class="label">Monto Total</td><td style="text-align:right">${fmtM(total)}</td></tr>
        <tr><td class="label">Sin Vencer</td><td style="text-align:right">${fmtM(sinVencer)}</td></tr>
        <tr><td class="label">De 1 a 30 días</td><td style="text-align:right">${fmtM(de1a30)}</td></tr>
        <tr><td class="label">De 31 a 60 días</td><td style="text-align:right">${fmtM(de31a60)}</td></tr>
        <tr><td class="label">Más de 60 días</td><td style="text-align:right;color:#c00">${fmtM(mas60)}</td></tr>
        <tr class="total"><td class="label">TOTAL CARTERA</td><td style="text-align:right">${fmtM(total)}</td></tr>
      </table>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const generarReporteDetallado = async () => {
    const fmtM = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
    const hoy = new Date().toLocaleDateString('es-CO');

    // Fetch detallado
    try {
      const r = await fetch(API + '?detallado=1');
      const d = await r.json();
      if (!d.success) return;

      const clientesDetalle = d.clientes.filter((c: any) => {
        // Apply same filter
        const dias = c.Dias_Mayor_Vencimiento;
        switch (filtro) {
          case 'sin_vencer': return dias <= 0;
          case '1a30': return dias >= 1 && dias <= 30;
          case '31a60': return dias >= 31 && dias <= 60;
          case 'mas60': return dias > 60;
          case 'alto': return c.Saldo_Total >= 500000;
          default: return true;
        }
      });

      let totalGeneral = 0, totalSinVencer = 0, total1a30 = 0, total31a60 = 0, totalMas60 = 0;

      const bloques = clientesDetalle.map((c: any) => {
        const facturas = c.Facturas || [];
        let cSinVencer = 0, c1a30 = 0, c31a60 = 0, cMas60 = 0, cTotal = 0;

        const filasFacturas = facturas.map((f: any) => {
          const dm = f.Dias_Mora;
          const saldo = f.Saldo;
          cTotal += saldo;
          let sinV = 0, d1 = 0, d31 = 0, d60 = 0;
          if (dm <= 0) { sinV = saldo; cSinVencer += saldo; }
          else if (dm <= 30) { d1 = saldo; c1a30 += saldo; }
          else if (dm <= 60) { d31 = saldo; c31a60 += saldo; }
          else { d60 = saldo; cMas60 += saldo; }

          return `<tr>
            <td style="padding:2px 6px">${f.Factura_N}</td>
            <td style="padding:2px 6px">${new Date(f.Fecha).toLocaleDateString('es-CO')}</td>
            <td style="padding:2px 6px;text-align:center">${f.Dias_Plazo}</td>
            <td style="padding:2px 6px;text-align:center">${dm}</td>
            <td style="padding:2px 6px;text-align:right">${fmtM(saldo)}</td>
            <td style="padding:2px 6px;text-align:right">${sinV > 0 ? fmtM(sinV) : ''}</td>
            <td style="padding:2px 6px;text-align:right">${d1 > 0 ? fmtM(d1) : ''}</td>
            <td style="padding:2px 6px;text-align:right">${d31 > 0 ? fmtM(d31) : ''}</td>
            <td style="padding:2px 6px;text-align:right;${d60 > 0 ? 'font-weight:700;color:#c00' : ''}">${d60 > 0 ? fmtM(d60) : ''}</td>
          </tr>`;
        }).join('');

        totalGeneral += cTotal;
        totalSinVencer += cSinVencer;
        total1a30 += c1a30;
        total31a60 += c31a60;
        totalMas60 += cMas60;

        return `
          <tr style="background:#e8e0f3">
            <td colspan="9" style="padding:4px 6px;font-weight:700;font-size:11px;border:1px solid #999">
              CLIENTE: &nbsp; ${c.CodigoClien} &nbsp;&nbsp;&nbsp; ${c.Razon_Social}
            </td>
          </tr>
          ${filasFacturas}
          <tr style="background:#f5f5f5;font-weight:600">
            <td colspan="4" style="padding:3px 6px;text-align:right;border:1px solid #ccc">TOTAL SALDO</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${fmtM(cTotal)}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${cSinVencer > 0 ? fmtM(cSinVencer) : ''}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${c1a30 > 0 ? fmtM(c1a30) : ''}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${c31a60 > 0 ? fmtM(c31a60) : ''}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc;color:#c00">${cMas60 > 0 ? fmtM(cMas60) : ''}</td>
          </tr>
          <tr><td colspan="9" style="padding:2px;border:none"></td></tr>
        `;
      }).join('');

      const html = `<html><head><title>Cartera Detallada</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding: 10mm; }
        @page { size: letter landscape; margin: 8mm; }
        table { width:100%; border-collapse:collapse; }
        th { background:#d0d0d0; border:1px solid #999; padding:3px 6px; font-size:9px; }
        td { border:1px solid #ddd; font-size:9px; }
        .header { text-align:center; margin-bottom:10px; }
        .header h1 { font-size:16px; margin-bottom:2px; }
        .header h2 { font-size:12px; font-weight:400; }
        .resumen { margin-top:15px; width:380px; margin-left:auto; }
        .resumen td { padding:3px 8px; border:1px solid #ccc; font-size:10px; }
        .resumen .total { font-weight:700; font-size:11px; border-top:2px solid #000; }
      </style></head><body>
        <div class="header">
          <h1>DISTRIBUIDORA DE SALSAS DE PLANETA RICA</h1>
          <h2>Saldos de Clientes - Detallado</h2>
        </div>
        <div style="font-size:10px;margin-bottom:8px"><strong>Fecha:</strong> ${hoy} &nbsp; <strong>Clientes:</strong> ${clientesDetalle.length}</div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">Nº Factura</th>
              <th style="text-align:left">Fecha</th>
              <th>Días</th>
              <th>Días V.</th>
              <th style="text-align:right">Saldo</th>
              <th style="text-align:right">Sin Vencer</th>
              <th style="text-align:right">De 1 a 30</th>
              <th style="text-align:right">De 31 a 60</th>
              <th style="text-align:right">Más de 60</th>
            </tr>
          </thead>
          <tbody>
            ${bloques}
            <tr style="font-weight:700;background:#e0e0e0;font-size:10px">
              <td colspan="4" style="padding:5px 6px;text-align:center;border:2px solid #999">TOTAL CARTERA</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(totalGeneral)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(totalSinVencer)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(total1a30)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(total31a60)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999;color:#c00">${fmtM(totalMas60)}</td>
            </tr>
          </tbody>
        </table>

        <table class="resumen">
          <tr><td colspan="2" style="text-align:center;font-weight:700;font-size:12px;padding:8px 0 4px">RESUMEN GENERAL</td></tr>
          <tr><td style="font-weight:600">Monto Total</td><td style="text-align:right">${fmtM(totalGeneral)}</td></tr>
          <tr><td style="font-weight:600">Sin Vencer</td><td style="text-align:right">${fmtM(totalSinVencer)}</td></tr>
          <tr><td style="font-weight:600">De 1 a 30 días</td><td style="text-align:right">${fmtM(total1a30)}</td></tr>
          <tr><td style="font-weight:600">De 31 a 60 días</td><td style="text-align:right">${fmtM(total31a60)}</td></tr>
          <tr><td style="font-weight:600">Más de 60 días</td><td style="text-align:right;color:#c00">${fmtM(totalMas60)}</td></tr>
          <tr class="total"><td style="font-weight:700">TOTAL CARTERA</td><td style="text-align:right;font-weight:700">${fmtM(totalGeneral)}</td></tr>
        </table>
      </body></html>`;

      const win = window.open('', '_blank', 'width=1100,height=700');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };
    } catch (e) { console.error(e); }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) {
        setClientes(d.clientes);
        setResumen(d.resumen);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = clientes.filter(c => {
    const b = busqueda.toLowerCase();
    const matchBusqueda = !busqueda ||
      c.Razon_Social?.toLowerCase().includes(b) ||
      c.Nit?.includes(busqueda) ||
      c.Telefonos?.includes(busqueda);
    if (!matchBusqueda) return false;
    const d = c.Dias_Mayor_Vencimiento;
    switch (filtro) {
      case 'sin_vencer': return d <= 0;
      case '1a30': return d >= 1 && d <= 30;
      case '31a60': return d >= 31 && d <= 60;
      case 'mas60': return d > 60;
      case 'alto': return c.Saldo_Total >= 500000;
      default: return true;
    }
  });

  const columnDefs: ColDef[] = [
    {
      headerName: 'Código', field: 'CodigoClien', width: 80, sortable: true,
    },
    {
      headerName: 'Cliente', field: 'Razon_Social', flex: 1, minWidth: 200, sortable: true, filter: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, cursor: 'pointer', color: '#1f2937' }}>{p.value}</span>
    },
    {
      headerName: 'NIT / CC', field: 'Nit', width: 110, sortable: true,
    },
    {
      headerName: 'Teléfono', field: 'Telefonos', width: 110,
      cellRenderer: (p: any) => {
        const v = p.value || '';
        return (!v || v === '0' || v === '-') ? <span style={{ color: '#9ca3af' }}>-</span> : <span>{v}</span>;
      }
    },
    {
      headerName: 'Facturas', field: 'Facturas_Pendientes', width: 80, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: '#7c3aed' }}>{p.value}</span>
    },
    {
      headerName: 'Saldo Total', field: 'Saldo_Total', width: 130, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Días', field: 'Dias_Mayor_Vencimiento', width: 70, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const d = p.value || 0;
        const color = d > 60 ? '#dc2626' : d > 30 ? '#d97706' : '#16a34a';
        return <span style={{ fontWeight: 600, color }}>{d}d</span>;
      }
    },
    {
      headerName: 'Cupo', field: 'CupoAutorizado', width: 100, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v === 0 ? <span style={{ color: '#9ca3af' }}>-</span> : <span>{fmtMon(v)}</span>;
      }
    },
    {
      headerName: '', width: 50, sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: any) => (
        <button
          onClick={() => setDetalleId(p.data.CodigoClien)}
          title="Ver facturas y pagar"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}
        >
          <Eye size={16} color="#7c3aed" />
        </button>
      )
    }
  ];

  const totalSaldo = resumen.total_saldo || 0;
  const totalClientes = resumen.total_clientes || 0;
  const totalVencidos = resumen.total_vencidos || 0;
  const saldoVencido = resumen.saldo_vencido || 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Cartera de Clientes</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Clientes con saldos pendientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generarReportePDF} title="Imprime un resumen con una línea por cliente y su saldo total" style={{
            height: 30, padding: '0 12px', background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <Printer size={14} /> Resumen
          </button>
          <button onClick={generarReporteDetallado} title="Imprime cada cliente con todas sus facturas pendientes desglosadas por días de mora" style={{
            height: 30, padding: '0 12px', background: '#9333ea', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <Printer size={14} /> Detallado
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Clientes con Saldo', value: totalClientes, icon: Users, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Total Cartera', value: fmtMon(totalSaldo), icon: DollarSign, bg: '#fee2e2', color: '#dc2626', isText: true },
          { label: 'Clientes Vencidos (>30d)', value: totalVencidos, icon: AlertTriangle, bg: '#fef3c7', color: '#d97706' },
          { label: 'Saldo Vencido', value: fmtMon(saldoVencido), icon: Clock, bg: '#fef3c7', color: '#d97706', isText: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: (s as any).isText ? 16 : 20, fontWeight: 700 }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Buscar por nombre, NIT..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 32, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>

        {[
          { id: 'todos', label: 'Todos' },
          { id: 'sin_vencer', label: 'Sin Vencer' },
          { id: '1a30', label: 'De 1 a 30' },
          { id: '31a60', label: 'De 31 a 60' },
          { id: 'mas60', label: 'Más de 60' },
          { id: 'alto', label: 'Saldo >$500k' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
            border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
            background: filtro === f.id ? '#f3e8ff' : '#fff',
            color: filtro === f.id ? '#7c3aed' : '#374151',
            fontWeight: filtro === f.id ? 600 : 400,
          }}>
            {f.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={cargar} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 370px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filtrados}
            columnDefs={columnDefs}
            loading={loading}
            animateRows
            getRowId={p => String(p.data.CodigoClien)}
            rowHeight={36}
            headerHeight={36}
            defaultColDef={{ resizable: true }}
            onRowClicked={e => setDetalleId(e.data.CodigoClien)}
            getRowStyle={p => {
              const dias = p.data?.Dias_Mayor_Vencimiento || 0;
              if (dias > 60) return { background: '#fef2f2' };
              if (dias > 30) return { background: '#fffbeb' };
              return undefined;
            }}
          />
        </div>
      </div>

      {detalleId !== null && (
        <ClienteDetalle clienteId={detalleId} tabInicial="pagar" onClose={() => { setDetalleId(null); cargar(); }} />
      )}
    </div>
  );
}
