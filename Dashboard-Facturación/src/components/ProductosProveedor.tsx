import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, RefreshCw, Package, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/proveedores/productos.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function ProductosProveedor() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [provId, setProvId] = useState<string>('');
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    fetch(API).then(r => r.json()).then(d => { if (d.success) setProveedores(d.proveedores); });
  }, []);

  const cargar = async () => {
    if (!provId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}?proveedor=${provId}&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (provId) cargar(); }, [provId, desde, hasta]);

  const productos = data?.productos || [];
  const resumen = data?.resumen || {};
  const diasRango = data?.dias_rango || 0;

  const filtrados = productos.filter((p: any) => {
    if (busqueda && !p.Nombres_Articulo?.toLowerCase().includes(busqueda.toLowerCase()) && !p.Codigo?.includes(busqueda)) return false;
    switch (filtro) {
      case 'con_ventas': return p.Cantidad_Vendida > 0;
      case 'sin_ventas': return p.Cantidad_Vendida === 0;
      case 'sin_stock': return p.Existencia <= 0;
      case 'pedir': return p.Sugerido > 0;
      default: return true;
    }
  });

  const cols: ColDef[] = [
    { headerName: 'Código', field: 'Codigo', width: 100, sortable: true, filter: true },
    { headerName: 'Artículo', field: 'Nombres_Articulo', flex: 1, minWidth: 180, sortable: true, filter: true },
    {
      headerName: 'Exist.', field: 'Existencia', width: 70, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return <span style={{ fontWeight: 600, color: v <= 0 ? '#dc2626' : v < (p.data.Existencia_minima || 0) ? '#d97706' : '#16a34a' }}>{v}</span>;
      }
    },
    {
      headerName: 'Vendido', field: 'Cantidad_Vendida', width: 80, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: p.value > 0 ? '#7c3aed' : '#9ca3af' }}>{p.value || 0}</span>
    },
    {
      headerName: 'Veces', field: 'Veces_Vendido', width: 65, sortable: true,
      cellStyle: { textAlign: 'center' },
    },
    {
      headerName: 'Rot/día', field: 'Rotacion_Diaria', width: 70, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value || 0}</span>
    },
    {
      headerName: 'Días Stock', field: 'Dias_Stock', width: 85, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        const color = v >= 999 ? '#9ca3af' : v < 7 ? '#dc2626' : v < 15 ? '#d97706' : '#16a34a';
        return <span style={{ fontWeight: 600, color }}>{v >= 999 ? 'N/A' : v + 'd'}</span>;
      }
    },
    {
      headerName: 'Sugerido', field: 'Sugerido', width: 80, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        if (v <= 0) return <span style={{ color: '#9ca3af' }}>-</span>;
        return <span style={{ fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: 4 }}>{v}</span>;
      }
    },
    {
      headerName: 'Costo', field: 'Precio_Costo', width: 95, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Monto Vend.', field: 'Monto_Vendido', width: 110, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => p.value > 0 ? <span style={{ fontWeight: 600, color: '#16a34a' }}>{fmtMon(p.value)}</span> : <span style={{ color: '#9ca3af' }}>-</span>
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Productos por Proveedor</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Consulta rotación de productos y genera sugeridos de pedido</p>
      </div>

      {/* Selector proveedor + rango */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'flex-end', gap: 12
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3 }}>PROVEEDOR</label>
          <select value={provId} onChange={e => setProvId(e.target.value)}
            style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}>
            <option value="">-- Seleccionar proveedor --</option>
            {proveedores.map((p: any) => (
              <option key={p.CodigoPro} value={p.CodigoPro}>{p.RazonSocial} ({p.Total_Productos} prod.)</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3 }}>DESDE</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }} />
        </div>
        <button onClick={cargar} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <RefreshCw size={14} /> Consultar
        </button>
      </div>

      {data && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 12 }}>
            {[
              { label: 'Productos', value: resumen.total_productos || 0, icon: Package, bg: '#f3e8ff', color: '#7c3aed' },
              { label: `Con ventas (${diasRango}d)`, value: resumen.con_ventas || 0, icon: TrendingUp, bg: '#dcfce7', color: '#16a34a' },
              { label: 'Sin Stock', value: resumen.sin_stock || 0, icon: AlertTriangle, bg: '#fee2e2', color: '#dc2626' },
              { label: 'Total Vendido', value: (resumen.total_vendido || 0).toLocaleString() + ' uds', icon: ShoppingCart, bg: '#dbeafe', color: '#2563eb', isText: true },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={s.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
                    <div style={{ fontSize: (s as any).isText ? 14 : 18, fontWeight: 700 }}>{s.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toolbar filtros */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '8px 16px', marginBottom: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <div style={{ position: 'relative', flex: '0 0 240px' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', height: 28, paddingLeft: 28, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none' }} />
            </div>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'con_ventas', label: 'Con ventas' },
              { id: 'sin_ventas', label: 'Sin ventas' },
              { id: 'sin_stock', label: 'Sin stock' },
              { id: 'pedir', label: 'Sugerido pedir' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                height: 26, padding: '0 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                background: filtro === f.id ? '#f3e8ff' : '#fff',
                color: filtro === f.id ? '#7c3aed' : '#374151', fontWeight: filtro === f.id ? 600 : 400,
              }}>{f.label}</button>
            ))}
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{filtrados.length} producto(s)</span>
          </div>

          {/* Grid */}
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ height: 'calc(100vh - 440px)', width: '100%' }}>
              <AgGridReact ref={gridRef} rowData={filtrados} columnDefs={cols} loading={loading} animateRows
                getRowId={p => String(p.data.Items)} rowHeight={34} headerHeight={34}
                defaultColDef={{ resizable: true }}
                getRowStyle={p => {
                  if ((p.data?.Existencia || 0) <= 0) return { background: '#fef2f2' };
                  if ((p.data?.Sugerido || 0) > 0) return { background: '#fffbeb' };
                  return undefined;
                }} />
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Package size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 15 }}>Selecciona un proveedor para consultar sus productos</div>
        </div>
      )}
    </div>
  );
}
