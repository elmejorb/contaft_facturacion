import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Search, AlertTriangle, TrendingUp, DollarSign, PackageX, ShieldCheck } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import api from '../services/api';
import { Kardex } from './Kardex';

ModuleRegistry.registerModules([AllCommunityModule]);

interface AuditoriaItem {
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Existencia: number;
  Precio_Costo: number;
  Precio_Venta: number;
  Margen_Porc: number;
  Unidades_Vendidas_90d: number;
  Veces_Vendido_90d: number;
  Total_Vendido_90d: number;
  Ultima_Venta: string;
  Capital_Invertido: number;
  Dias_Stock: number;
  Categoria: string;
  Proveedor: string;
  Auditoria: string;
}

const filtros = [
  { id: 'todos', label: 'Todos', color: '#6b7280' },
  { id: 'excelente', label: 'Excelente', color: '#16a34a', match: 'Excelente' },
  { id: 'rotacion-normal', label: 'Rotación normal', color: '#3b82f6', match: 'Rotación normal' },
  { id: 'alta-margen-bajo', label: 'Alta rot. / Margen bajo', color: '#f59e0b', match: 'Alta rotación / Margen bajo' },
  { id: 'baja-rotacion', label: 'Baja rotación', color: '#f97316', match: 'Baja rotación' },
  { id: 'capital-muerto', label: 'Capital muerto', color: '#dc2626', match: 'Capital muerto' },
  { id: 'sobre-stock', label: 'Sobre-stock', color: '#7c3aed', match: 'Sobre-stock' },
  { id: 'sin-movimiento', label: 'Sin movimiento', color: '#6b7280', match: 'Sin movimiento' },
  { id: 'stock-negativo', label: 'Stock negativo', color: '#be123c', match: 'Stock negativo' },
  { id: 'costo-invalido', label: 'Costo inválido', color: '#dc2626', match: 'Costo inválido' },
  { id: 'precio-bajo', label: 'Precio bajo costo', color: '#dc2626', match: 'Precio bajo costo' },
  { id: 'margen-sosp', label: 'Margen sospechoso', color: '#9333ea', match: 'Margen sospechoso' },
];

const getAudColor = (raw: any) => {
  const a = String(raw || '');
  if (a.includes('Excelente')) return { bg: '#dcfce7', color: '#16a34a' };
  if (a.includes('Rotación normal')) return { bg: '#dbeafe', color: '#2563eb' };
  if (a.includes('Alta rotación')) return { bg: '#fef9c3', color: '#a16207' };
  if (a.includes('Baja rotación')) return { bg: '#ffedd5', color: '#c2410c' };
  if (a.includes('Capital muerto')) return { bg: '#fee2e2', color: '#dc2626' };
  if (a.includes('Sobre-stock')) return { bg: '#f3e8ff', color: '#7c3aed' };
  if (a.includes('Sin movimiento')) return { bg: '#f3f4f6', color: '#6b7280' };
  if (a.includes('Stock negativo')) return { bg: '#fce7f3', color: '#be123c' };
  if (a.includes('Costo inválido') || a.includes('Precio bajo')) return { bg: '#fee2e2', color: '#dc2626' };
  if (a.includes('Margen sospechoso')) return { bg: '#f3e8ff', color: '#9333ea' };
  return { bg: '#f3f4f6', color: '#6b7280' };
};

const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#fef3c7',
  headerTextColor: '#92400e',
  headerFontSize: 11,
  headerFontWeight: 600,
  fontSize: 11,
  rowBorder: { color: '#f3f4f6', width: 1 },
  borderColor: '#e5e7eb',
  borderRadius: 8,
  rowHoverColor: '#fffbeb',
  spacing: 5,
});

export function AuditoriaInventario() {
  const [datos, setDatos] = useState<AuditoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [kardexModal, setKardexModal] = useState<{ isOpen: boolean; producto: any }>({ isOpen: false, producto: null });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await api.get('/auditoria/inventario-90d.php');
      setDatos(r.data.auditoria || []);
      setError(null);
    } catch { setError('Error al cargar la auditoría'); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

  const datosFiltrados = useMemo(() => {
    return datos.filter(item => {
      const cumpleBusqueda = !busqueda ||
        item.Nombres_Articulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.Codigo?.toLowerCase().includes(busqueda.toLowerCase());
      if (filtroActivo === 'todos') return cumpleBusqueda;
      const f = filtros.find(f => f.id === filtroActivo);
      return cumpleBusqueda && f?.match && String(item.Auditoria || '').includes(f.match);
    });
  }, [datos, busqueda, filtroActivo]);

  // Stats
  const capitalMuerto = datos.filter(d => String(d.Auditoria || '').includes('Capital muerto')).reduce((s, d) => s + d.Capital_Invertido, 0);
  const sobreStock = datos.filter(d => String(d.Auditoria || '').includes('Sobre-stock')).length;
  const excelentes = datos.filter(d => String(d.Auditoria || '').includes('Excelente')).length;
  const problemas = datos.filter(d => {
    const a = String(d.Auditoria || '');
    return a.includes('Stock negativo') || a.includes('Costo inválido') || a.includes('Precio bajo');
  }).length;

  const columnDefs = useMemo(() => [
    { headerName: 'Código', field: 'Codigo' as keyof AuditoriaItem, width: 120, cellStyle: { color: '#92400e', fontWeight: 500 } },
    { headerName: 'Artículo', field: 'Nombres_Articulo' as keyof AuditoriaItem, flex: 2, minWidth: 180, cellStyle: { fontWeight: 500 } },
    { headerName: 'Exist.', field: 'Existencia' as keyof AuditoriaItem, width: 70, type: 'numericColumn' as const,
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return <span style={{ background: v > 0 ? '#dbeafe' : v < 0 ? '#fee2e2' : '#f3f4f6', color: v > 0 ? '#1d4ed8' : v < 0 ? '#dc2626' : '#6b7280',
          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{Math.round(v)}</span>;
      },
    },
    { headerName: 'Margen %', field: 'Margen_Porc' as keyof AuditoriaItem, width: 85, type: 'numericColumn' as const,
      cellRenderer: (p: any) => {
        const v = parseFloat(p.value) || 0;
        return <span style={{ background: v >= 20 ? '#dcfce7' : v >= 0 ? '#fef9c3' : '#fee2e2', color: v >= 20 ? '#16a34a' : v >= 0 ? '#a16207' : '#dc2626',
          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{v.toFixed(1)}%</span>;
      },
    },
    { headerName: 'Vendido 90d', field: 'Unidades_Vendidas_90d' as keyof AuditoriaItem, width: 90, type: 'numericColumn' as const,
      valueFormatter: (p: any) => Math.round(p.value || 0).toString(),
    },
    { headerName: 'Veces', field: 'Veces_Vendido_90d' as keyof AuditoriaItem, width: 65, type: 'numericColumn' as const },
    { headerName: 'Días Stock', field: 'Dias_Stock' as keyof AuditoriaItem, width: 85, type: 'numericColumn' as const,
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        const color = v > 180 ? '#dc2626' : v > 90 ? '#f59e0b' : '#16a34a';
        return <span style={{ color, fontWeight: 600, fontSize: 11 }}>{v >= 999 ? '∞' : v + 'd'}</span>;
      },
    },
    { headerName: 'Capital Inv.', field: 'Capital_Invertido' as keyof AuditoriaItem, width: 110, type: 'numericColumn' as const,
      valueFormatter: (p: any) => fmt(p.value),
    },
    { headerName: 'Categoría', field: 'Categoria' as keyof AuditoriaItem, width: 100 },
    { headerName: 'Auditoría', field: 'Auditoria' as keyof AuditoriaItem, flex: 1, minWidth: 160,
      cellRenderer: (p: any) => {
        const d = getAudColor(p.value);
        return <span style={{ background: d.bg, color: d.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
          whiteSpace: 'nowrap' }}>{String(p.value || '')}</span>;
      },
    },
    { headerName: '', width: 40, sortable: false, filter: false,
      cellRenderer: (p: any) => (
        <button title="Ver Kardex" onClick={() => setKardexModal({ isOpen: true, producto: p.data })}
          style={{ background: 'transparent', border: '1.5px solid #f59e0b', color: '#f59e0b', width: 26, height: 26,
            borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
        </button>
      ),
    },
  ], []);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true }), []);
  const onFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827' }}>Auditoría de Inventario (90 días)</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Análisis profundo de rotación, capital invertido y anomalías</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { icon: <ShieldCheck size={20} color="#16a34a" />, bg: '#dcfce7', label: 'Excelentes', value: excelentes, color: '#16a34a' },
          { icon: <PackageX size={20} color="#dc2626" />, bg: '#fee2e2', label: 'Capital Muerto', value: fmt(capitalMuerto), color: '#dc2626' },
          { icon: <TrendingUp size={20} color="#7c3aed" />, bg: '#f3e8ff', label: 'Sobre-stock', value: sobreStock, color: '#7c3aed' },
          { icon: <AlertTriangle size={20} color="#f59e0b" />, bg: '#fef3c7', label: 'Problemas', value: problemas, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar por código o nombre..." value={busqueda} onChange={onFilter}
              style={{ width: '100%', height: 34, paddingLeft: 34, paddingRight: 12, fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={cargar} disabled={loading}
            style={{ height: 34, padding: '0 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refrescar
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {filtros.map(f => {
            const count = f.match ? datos.filter(d => String(d.Auditoria || '').includes(f.match!)).length : datos.length;
            return (
              <button key={f.id} onClick={() => setFiltroActivo(f.id)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: filtroActivo === f.id ? f.color : '#f3f4f6',
                color: filtroActivo === f.id ? '#fff' : '#6b7280',
              }}>
                {f.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* AG Grid */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 13 }}>Cargando auditoría...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>
          <button onClick={cargar} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Reintentar</button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: 'calc(100vh - 460px)', minHeight: 350 }}>
          <AgGridReact
            theme={myTheme}
            rowData={datosFiltrados}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={busqueda}
            pagination={true}
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200]}
            animateRows={true}
            getRowStyle={(p: any) => {
              const a = String(p.data?.Auditoria || '');
              if (a.includes('Stock negativo')) return { background: '#fce7f3' };
              if (a.includes('Capital muerto')) return { background: '#fef2f2' };
              if (a.includes('Excelente')) return { background: '#f0fdf4' };
              return undefined;
            }}
            overlayNoRowsTemplate='<span style="padding:10px;color:#6b7280">No se encontraron resultados</span>'
          />
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 10, padding: '10px 16px', textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
        Mostrando <strong style={{ color: '#f59e0b' }}>{datosFiltrados.length}</strong> de <strong style={{ color: '#f59e0b' }}>{datos.length}</strong> productos
      </div>

      <Kardex isOpen={kardexModal.isOpen} onClose={() => setKardexModal({ isOpen: false, producto: null })} producto={kardexModal.producto} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
