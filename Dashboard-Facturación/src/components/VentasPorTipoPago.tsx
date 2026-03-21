import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { DollarSign, CreditCard, Wallet, Banknote, RefreshCw, Printer } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/ventas/por-tipo-pago.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

const iconosMedio: Record<string, { icon: any; bg: string; color: string }> = {
  'Efectivo': { icon: Banknote, bg: '#dcfce7', color: '#16a34a' },
  'Tarjeta': { icon: CreditCard, bg: '#dbeafe', color: '#2563eb' },
  'Bancolombia': { icon: Wallet, bg: '#fef3c7', color: '#d97706' },
  'Nequi': { icon: Wallet, bg: '#f3e8ff', color: '#7c3aed' },
};

export function VentasPorTipoPago() {
  const [resumen, setResumen] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [mensual, setMensual] = useState<any[]>([]);
  const [medios, setMedios] = useState<any[]>([]);
  const [anios, setAnios] = useState<number[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [filtroMedio, setFiltroMedio] = useState<string>('');
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?anio=${anio}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (filtroMedio !== '') url += `&medio=${filtroMedio}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setResumen(d.resumen);
        setFacturas(d.facturas);
        setMensual(d.mensual);
        setMedios(d.medios);
        setAnios(d.anios);
        setTotalGeneral(parseFloat(d.total_general) || 0);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, filtroMedio]);

  const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesFull = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const cols: ColDef[] = [
    { headerName: 'Factura', field: 'Factura_N', width: 80, sortable: true,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 95, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Cliente', field: 'A_nombre', flex: 1, minWidth: 180, sortable: true, filter: true },
    { headerName: 'Tipo', field: 'Tipo', width: 75,
      cellRenderer: (p: any) => <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
        background: p.value !== 'Contado' ? '#dbeafe' : '#f3f4f6', color: p.value !== 'Contado' ? '#2563eb' : '#6b7280'
      }}>{p.value}</span> },
    { headerName: 'Total', field: 'Total', width: 110, sortable: true, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700 }}>{fmtMon(parseFloat(p.value) || 0)}</span> },
    { headerName: 'Efectivo', field: 'efectivo', width: 100, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => { const v = parseFloat(p.value) || 0; return v > 0 ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmtMon(v)}</span> : <span style={{ color: '#d1d5db' }}>-</span>; } },
    { headerName: 'Transf.', field: 'valorpagado1', width: 100, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => { const v = parseFloat(p.value) || 0; return v > 0 ? <span style={{ color: '#2563eb', fontWeight: 600 }}>{fmtMon(v)}</span> : <span style={{ color: '#d1d5db' }}>-</span>; } },
    { headerName: 'Medio', field: 'MedioPago', width: 100,
      cellRenderer: (p: any) => <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#f3f4f6', fontWeight: 500 }}>{p.value}</span> },
  ];

  // Tabla resumen mensual
  const mediosUnicos = [...new Set(mensual.map(m => m.MedioPago))];
  const mesesConDatos = [...new Set(mensual.map(m => m.mes))].sort((a, b) => a - b);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Ventas por Tipo de Pago</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Ingresos clasificados por medio de pago</p>
        </div>
        <button onClick={() => cargar()} style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Cards resumen por medio de pago */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resumen.length + 1}, 1fr)`, gap: 12, marginBottom: 12 }}>
        {resumen.map((r: any) => {
          const ic = iconosMedio[r.MedioPago] || iconosMedio['Efectivo'];
          const Icon = ic.icon;
          const isActive = filtroMedio === String(r.id_mediopago);
          return (
            <div key={r.id_mediopago} onClick={() => setFiltroMedio(isActive ? '' : String(r.id_mediopago))}
              style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', border: isActive ? `2px solid ${ic.color}` : '2px solid transparent', transition: 'border 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={ic.color} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{r.MedioPago}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{r.facturas} facturas</div>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ic.color }}>{fmtMon(parseFloat(r.total))}</div>
            </div>
          );
        })}
        {/* Total */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', border: filtroMedio === '' ? '2px solid #7c3aed' : '2px solid transparent' }}
          onClick={() => setFiltroMedio('')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total General</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{facturas.length} facturas</div>
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{fmtMon(totalGeneral)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          <option value={0}>Todos los meses</option>
          {mesesFull.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        {filtroMedio !== '' && (
          <span style={{ fontSize: 11, padding: '3px 10px', background: '#f3e8ff', color: '#7c3aed', borderRadius: 6, fontWeight: 600 }}>
            Filtro: {medios.find(m => String(m.id_mediopago) === filtroMedio)?.nombre_medio || 'Desconocido'}
            <button onClick={() => setFiltroMedio('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, color: '#7c3aed', fontWeight: 700 }}>✕</button>
          </span>
        )}
      </div>

      {/* Tabla resumen mensual (solo si mes = Todos) */}
      {mes === 0 && mesesConDatos.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Resumen Mensual</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #7c3aed' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700 }}>Medio</th>
                {mesesConDatos.map(m => <th key={m} style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{meses[m]}</th>)}
                <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {mediosUnicos.map(medio => {
                const ic = iconosMedio[medio] || iconosMedio['Efectivo'];
                const totalMedio = mensual.filter(m => m.MedioPago === medio).reduce((s, m) => s + parseFloat(m.total), 0);
                return (
                  <tr key={medio} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600, color: ic.color }}>{medio}</td>
                    {mesesConDatos.map(mesN => {
                      const dato = mensual.find(m => m.MedioPago === medio && m.mes === mesN);
                      const val = dato ? parseFloat(dato.total) : 0;
                      return <td key={mesN} style={{ padding: '4px 6px', textAlign: 'right', color: val > 0 ? '#1f2937' : '#d1d5db' }}>{val > 0 ? fmtMon(val) : '-'}</td>;
                    })}
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: ic.color }}>{fmtMon(totalMedio)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid #1f2937' }}>
                <td style={{ padding: '4px 8px', fontWeight: 800 }}>TOTAL</td>
                {mesesConDatos.map(mesN => {
                  const val = mensual.filter(m => m.mes === mesN).reduce((s, m) => s + parseFloat(m.total), 0);
                  return <td key={mesN} style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{fmtMon(val)}</td>;
                })}
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>{fmtMon(totalGeneral)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* AG Grid facturas */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 480px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={facturas}
            columnDefs={cols}
            defaultColDef={{ resizable: true }}
            animateRows
            rowHeight={32}
            headerHeight={34}
            getRowStyle={(p: any) => {
              if (p.node.rowIndex % 2 !== 0) return { background: '#fafafa' };
              return undefined;
            }}
          />
        </div>
        <div style={{ padding: '6px 14px', borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
          <span>{facturas.length} factura(s)</span>
          <span style={{ fontWeight: 700, color: '#7c3aed' }}>Total: {fmtMon(facturas.reduce((s, f) => s + (parseFloat(f.Total) || 0), 0))}</span>
        </div>
      </div>
    </div>
  );
}
