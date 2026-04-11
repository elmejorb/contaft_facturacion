import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, RefreshCw, DollarSign, CreditCard, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

ModuleRegistry.registerModules([AllCommunityModule]);

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

// ==========================================
// PAGOS DE CLIENTES
// ==========================================
export function ListadoPagosClientes() {
  const API = 'http://localhost:80/conta-app-backend/api/movimientos/pagos-clientes.php';
  const [pagos, setPagos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [anios, setAnios] = useState<any[]>([]);
  const [medios, setMedios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [filtroMedio, setFiltroMedio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Valida');
  const [busqueda, setBusqueda] = useState('');
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?anio=${anio}&estado=${filtroEstado}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (filtroMedio !== '') url += `&medio=${filtroMedio}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setPagos(d.pagos); setResumen(d.resumen); setAnios(d.anios || []); setMedios(d.medios || []); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, filtroMedio, filtroEstado]);

  const cols: ColDef[] = [
    { headerName: 'Recibo', field: 'RecCajaN', width: 70, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, sortable: true, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Cliente', field: 'NombreCliente', flex: 1, minWidth: 150, sortable: true },
    { headerName: 'Detalle', field: 'DetallePago', flex: 1, minWidth: 180 },
    { headerName: 'Medio', field: 'MedioPago', width: 100, cellRenderer: (p: any) => <span style={{ fontSize: 11, fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Valor', field: 'ValorPago', width: 120, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Saldo', field: 'SaldoAct', width: 100, cellRenderer: (p: any) => <span style={{ color: p.value > 0 ? '#dc2626' : '#16a34a' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Estado', field: 'Estado', width: 80, cellRenderer: (p: any) => {
      const ok = p.value === 'Valida';
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626' }}>{p.value}</span>;
    }},
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Pagos de Clientes</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Ingresos por cobro de cartera</p>
        </div>
        <button onClick={cargar} style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total Pagos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{resumen.total_pagos || 0}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Efectivo</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{fmtMon(resumen.total_efectivo || 0)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Transferencia</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>{fmtMon(resumen.total_transferencia || 0)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total General</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1f2937' }}>{fmtMon(resumen.total_general || 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value={0}>Todos</option>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={filtroMedio} onChange={e => setFiltroMedio(e.target.value)} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value="">Todos los medios</option>
          {medios.map((m: any) => <option key={m.id_mediopago} value={m.id_mediopago}>{m.nombre_medio}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value="Valida">Válidos</option>
          <option value="Anulada">Anulados</option>
          <option value="">Todos</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ height: 28, paddingLeft: 28, width: 200, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: 'calc(100vh - 380px)', minHeight: 300 }}>
        <AgGridReact ref={gridRef} rowData={pagos} columnDefs={cols} loading={loading} animateRows
          quickFilterText={busqueda} defaultColDef={{ resizable: true }} rowHeight={34} headerHeight={34}
          getRowId={p => String(p.data.Id_Pagos)} pagination paginationPageSize={50} />
      </div>
    </div>
  );
}

// ==========================================
// PAGOS A PROVEEDORES (EGRESOS)
// ==========================================
export function ListadoPagosProveedores() {
  const API = 'http://localhost:80/conta-app-backend/api/movimientos/pagos-proveedores.php';
  const [egresos, setEgresos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [anios, setAnios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [filtroEstado, setFiltroEstado] = useState('Valida');
  const [busqueda, setBusqueda] = useState('');
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?anio=${anio}&estado=${filtroEstado}`;
      if (mes > 0) url += `&mes=${mes}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setEgresos(d.egresos); setResumen(d.resumen); setAnios(d.anios || []); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, filtroEstado]);

  const cols: ColDef[] = [
    { headerName: 'Comp.', field: 'N_Comprobante', width: 65, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, sortable: true, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Proveedor', field: 'NombreProveedor', flex: 1, minWidth: 150, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 500 }}>{p.value || p.data.Orden || '-'}</span> },
    { headerName: 'Concepto', field: 'Concepto', flex: 1, minWidth: 180 },
    { headerName: 'Factura', field: 'NFacturaAnt', width: 100 },
    { headerName: 'Valor', field: 'Valor', width: 120, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Saldo', field: 'Saldoact', width: 100, cellRenderer: (p: any) => <span style={{ color: p.value > 0 ? '#dc2626' : '#16a34a' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Estado', field: 'Estado', width: 80, cellRenderer: (p: any) => {
      const ok = p.value === 'Valida';
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626' }}>{p.value}</span>;
    }},
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Pagos a Proveedores</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Egresos y comprobantes de pago</p>
        </div>
        <button onClick={cargar} style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total Egresos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{resumen.total_egresos || 0}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total Pagado</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{fmtMon(resumen.total_general || 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value={0}>Todos</option>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value="Valida">Válidos</option>
          <option value="Anulada">Anulados</option>
          <option value="">Todos</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar proveedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ height: 28, paddingLeft: 28, width: 200, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: 'calc(100vh - 340px)', minHeight: 300 }}>
        <AgGridReact ref={gridRef} rowData={egresos} columnDefs={cols} loading={loading} animateRows
          quickFilterText={busqueda} defaultColDef={{ resizable: true }} rowHeight={34} headerHeight={34}
          getRowId={p => String(p.data.Id_Egresos)} pagination paginationPageSize={50} />
      </div>
    </div>
  );
}
