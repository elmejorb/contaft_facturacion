import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { AlertTriangle, RefreshCw, Package } from 'lucide-react';
import toast from 'react-hot-toast';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/familias/stock-bajo.php';

export function StockBajo() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setProductos(d.productos || []);
    } catch (e) { toast.error('Error al cargar'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const cols: ColDef[] = [
    { headerName: 'Código', field: 'Codigo', width: 110, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Producto', field: 'Nombres_Articulo', flex: 1, minWidth: 220 },
    { headerName: 'Familia', field: 'Familia_Nombre', width: 180, cellRenderer: (p: any) => p.value
        ? <span style={{ color: '#6b7280' }}>{p.value}</span>
        : <span style={{ color: '#d1d5db', fontSize: 10 }}>—</span> },
    { headerName: 'Existencia', field: 'Existencia', width: 110, sortable: true, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>{parseFloat(p.value).toFixed(2)}</span> },
    { headerName: 'Mínimo', field: 'Stock_Minimo', width: 100, sortable: true, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>{parseFloat(p.value).toFixed(2)}</span> },
    { headerName: 'Faltan', width: 100, sortable: true,
      valueGetter: (p: any) => parseFloat(p.data.Stock_Minimo) - parseFloat(p.data.Existencia),
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{p.value.toFixed(2)}</span>
    },
    { headerName: 'Precio', field: 'Precio_Venta', width: 110, cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>$ {Math.round(parseFloat(p.value || 0)).toLocaleString('es-CO')}</span> },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={24} color="#dc2626" />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Productos con stock bajo</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
              {productos.length > 0 ? <><b>{productos.length}</b> producto(s) por debajo del mínimo configurado</> : 'Ningún producto por debajo del mínimo'}
            </p>
          </div>
        </div>
        <button onClick={cargar}
          style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : productos.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
            <Package size={40} color="#d1d5db" style={{ margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Todo bien</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Ningún producto está por debajo de su stock mínimo.</p>
            <p style={{ margin: '12px 0 0', fontSize: 11 }}>Tip: edita un producto y ajusta su <b>Stock mínimo</b> para empezar a recibir alertas.</p>
          </div>
        ) : (
          <div className="ag-theme-quartz" style={{ height: 560 }}>
            <AgGridReact rowData={productos} columnDefs={cols} rowHeight={32} headerHeight={34} animateRows />
          </div>
        )}
      </div>
    </div>
  );
}

// Hook reutilizable: cuenta productos con stock bajo (para badge en sidebar)
export function useStockBajoCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      try {
        const r = await fetch(API);
        const d = await r.json();
        if (!cancelled && d.success) setCount(d.total || 0);
      } catch (e) {}
    };
    cargar();
    const timer = setInterval(cargar, 5 * 60 * 1000); // cada 5 min
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  return count;
}
