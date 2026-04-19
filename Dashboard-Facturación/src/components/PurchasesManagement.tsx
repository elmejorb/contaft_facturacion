import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Search, RefreshCw, Edit2, Eye, Printer, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { NuevaCompra } from './NuevaCompra';

const API = 'http://localhost:80/conta-app-backend/api/compras/nueva.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function PurchasesManagement() {
  const [compras, setCompras] = useState<any[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [editarPedido, setEditarPedido] = useState<number | null>(null);
  const gridRef = useRef<any>(null);

  const meses = ['Todos','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await fetch(`${API}?listar=1&anio=${anio}&mes=${mes}`);
      const d = await r.json();
      if (d.success) setCompras(d.compras);
    } catch (e) { toast.error('Error al cargar compras'); }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [anio, mes]);

  const filtradas = buscar
    ? compras.filter(c =>
        String(c.Pedido_N).includes(buscar) ||
        String(c.FacturaCompra_N).toLowerCase().includes(buscar.toLowerCase()) ||
        (c.Proveedor || '').toLowerCase().includes(buscar.toLowerCase()))
    : compras;

  const totalCompras = filtradas.reduce((s, c) => s + c.Total, 0);

  if (editarPedido !== null) {
    return <NuevaCompra pedidoEditar={editarPedido} onClose={() => { setEditarPedido(null); cargar(); }} />;
  }

  const colDefs: any[] = [
    { field: 'Pedido_N', headerName: 'Pedido', width: 80, cellStyle: { color: '#7c3aed', fontWeight: 600 } },
    { field: 'FacturaCompra_N', headerName: 'Fact. Compra', width: 120 },
    { field: 'Fecha', headerName: 'Fecha', width: 100, valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '' },
    { field: 'Proveedor', headerName: 'Proveedor', flex: 1, minWidth: 180 },
    { field: 'TipoPedido', headerName: 'Tipo', width: 80,
      cellRenderer: (p: any) => {
        const t = p.value;
        const bg = t === 'Contado' ? '#dcfce7' : '#fef3c7';
        const color = t === 'Contado' ? '#16a34a' : '#d97706';
        return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: bg, color }}>{t}</span>;
      }
    },
    { field: 'Items', headerName: 'Items', width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'Total', headerName: 'Total', width: 120, cellStyle: { textAlign: 'right', fontWeight: 700 },
      valueFormatter: (p: any) => fmtMon(p.value || 0) },
    { field: 'Saldo', headerName: 'Saldo', width: 100, cellStyle: (p: any) => ({ textAlign: 'right', fontWeight: 600, color: p.value > 0 ? '#dc2626' : '#16a34a' }),
      valueFormatter: (p: any) => fmtMon(p.value || 0) },
    { field: 'Flete', headerName: 'Flete', width: 80, cellStyle: { textAlign: 'right' },
      valueFormatter: (p: any) => p.value > 0 ? fmtMon(p.value) : '-' },
    {
      headerName: '', width: 70, sortable: false, filter: false,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: '100%' }}>
          <button onClick={() => setEditarPedido(p.data.Pedido_N)} title="Editar compra"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Edit2 size={14} color="#7c3aed" />
          </button>
        </div>
      )
    }
  ];

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Listado de Compras</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Historial de compras a proveedores</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#f3e8ff', padding: '6px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Total: </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>{fmtMon(totalCompras)}</span>
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>({filtradas.length} compras)</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: '#fff', padding: '8px 12px', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ ...inp, width: 80 }}>
          {[2026, 2025, 2024].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ ...inp, width: 90 }}>
          {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 7, color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar por pedido, factura o proveedor..." value={buscar}
            onChange={e => setBuscar(e.target.value)}
            style={{ ...inp, width: '100%', paddingLeft: 28 }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={cargar} disabled={cargando}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} /> Refrescar
        </button>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 240px)', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={filtradas}
          columnDefs={colDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          animateRows
          rowHeight={34}
          headerHeight={32}
          getRowId={(p: any) => String(p.data.Pedido_N)}
          overlayNoRowsTemplate="<span style='font-size:13px;color:#6b7280'>No hay compras para mostrar</span>"
        />
      </div>
    </div>
  );
}
