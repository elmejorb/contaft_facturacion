import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Search, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import api from '../services/api';
import { Kardex } from './Kardex';

ModuleRegistry.registerModules([AllCommunityModule]);

interface DiagnosticoItem {
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Existencia: number;
  Precio_Costo: number;
  Precio_Venta: number;
  Margen_Porc: number;
  Unidades_Vendidas_30d: number;
  Veces_Vendido_30d: number;
  Capital_Invertido: number;
  Diagnostico: string;
}

const filtros = [
  { id: 'todos', label: 'Todos', color: '#6b7280' },
  { id: 'alta-buen', label: 'Alta rot. / Buen margen', color: '#22c55e', match: 'Alta rotación / Buen margen' },
  { id: 'alta-bajo', label: 'Alta rot. / Margen bajo', color: '#eab308', match: 'Alta rotación / Margen bajo' },
  { id: 'media-aceptable', label: 'Rot. media / Aceptable', color: '#f59e0b', match: 'Rotación media / Margen aceptable' },
  { id: 'media-bajo', label: 'Rot. media / Bajo', color: '#f97316', match: 'Rotación media / Margen bajo' },
  { id: 'baja-insuficiente', label: 'Baja rot. / Insuficiente', color: '#ef4444', match: 'Baja rotación / Margen insuficiente' },
  { id: 'baja-aceptable', label: 'Baja rot. / Aceptable', color: '#eab308', match: 'Baja rotación / Margen aceptable' },
  { id: 'costo-invalido', label: 'Costo inválido', color: '#dc2626', match: 'Costo inválido' },
  { id: 'precio-bajo', label: 'Precio ≤ Costo', color: '#dc2626', match: 'Precio por debajo' },
  { id: 'revisar', label: 'Revisar', color: '#9ca3af', match: 'Revisar' },
];

const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff',
  headerTextColor: '#6b21a8',
  headerFontSize: 11,
  headerFontWeight: 600,
  fontSize: 11,
  rowBorder: { color: '#f3f4f6', width: 1 },
  borderColor: '#e5e7eb',
  borderRadius: 8,
  rowHoverColor: '#faf5ff',
  spacing: 5,
});

const getDiagColor = (raw: any) => {
  const d = String(raw || '');
  if (d.includes('Alta rotación / Buen margen')) return { bg: '#dcfce7', color: '#16a34a' };
  if (d.includes('Alta rotación')) return { bg: '#fef9c3', color: '#a16207' };
  if (d.includes('Rotación media / Margen aceptable')) return { bg: '#fef3c7', color: '#b45309' };
  if (d.includes('Rotación media')) return { bg: '#ffedd5', color: '#c2410c' };
  if (d.includes('Baja rotación / Margen insuficiente')) return { bg: '#fee2e2', color: '#dc2626' };
  if (d.includes('Baja rotación')) return { bg: '#fef9c3', color: '#a16207' };
  if (d.includes('Costo inválido') || d.includes('Precio por debajo')) return { bg: '#fee2e2', color: '#dc2626' };
  return { bg: '#f3f4f6', color: '#6b7280' };
};

export function DiagnosticoInventario() {
  const [datos, setDatos] = useState<DiagnosticoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [kardexModal, setKardexModal] = useState<{ isOpen: boolean; producto: any }>({ isOpen: false, producto: null });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await api.get('/diagnostico/inventario-30d.php');
      setDatos(r.data.diagnostico || []);
      setError(null);
    } catch { setError('Error al cargar el diagnóstico'); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

  const datosFiltrados = useMemo(() => {
    return datos.filter(item => {
      const cumpleBusqueda = !busqueda || item.Nombres_Articulo?.toLowerCase().includes(busqueda.toLowerCase());
      if (filtroActivo === 'todos') return cumpleBusqueda;
      const f = filtros.find(f => f.id === filtroActivo);
      return cumpleBusqueda && f?.match && String(item.Diagnostico || '').includes(f.match);
    });
  }, [datos, busqueda, filtroActivo]);

  // Stats
  const altaRotacion = datos.filter(d => String(d.Diagnostico || '').includes('Alta rotación / Buen margen')).length;
  const rotMedia = datos.filter(d => String(d.Diagnostico || '').includes('Rotación media')).length;
  const problemas = datos.filter(d =>
    String(d.Diagnostico || '').includes('Margen insuficiente') || String(d.Diagnostico || '').includes('Costo inválido') || String(d.Diagnostico || '').includes('Precio por debajo')
  ).length;

  const columnDefs = useMemo(() => [
    { headerName: 'Artículo', field: 'Nombres_Articulo' as keyof DiagnosticoItem, flex: 2, minWidth: 180, cellStyle: { fontWeight: 500 } },
    {
      headerName: 'Exist.', field: 'Existencia' as keyof DiagnosticoItem, width: 75, type: 'numericColumn' as const,
      valueFormatter: (p: any) => Math.round(p.value || 0).toString(),
    },
    {
      headerName: 'P. Costo', field: 'Precio_Costo' as keyof DiagnosticoItem, width: 100, type: 'numericColumn' as const,
      valueFormatter: (p: any) => fmt(p.value),
    },
    {
      headerName: 'P. Venta', field: 'Precio_Venta' as keyof DiagnosticoItem, width: 100, type: 'numericColumn' as const,
      valueFormatter: (p: any) => fmt(p.value), cellStyle: { color: '#16a34a', fontWeight: 600 },
    },
    {
      headerName: 'Margen %', field: 'Margen_Porc' as keyof DiagnosticoItem, width: 90, type: 'numericColumn' as const,
      cellRenderer: (p: any) => {
        const val = parseFloat(p.value) || 0;
        return <span style={{
          background: val >= 20 ? '#dcfce7' : val >= 0 ? '#fef9c3' : '#fee2e2',
          color: val >= 20 ? '#16a34a' : val >= 0 ? '#a16207' : '#dc2626',
          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
        }}>{val.toFixed(1)}%</span>;
      },
    },
    {
      headerName: 'Uni. Vend.', field: 'Unidades_Vendidas_30d' as keyof DiagnosticoItem, width: 85, type: 'numericColumn' as const,
      valueFormatter: (p: any) => Math.round(p.value || 0).toString(),
    },
    {
      headerName: 'Veces', field: 'Veces_Vendido_30d' as keyof DiagnosticoItem, width: 70, type: 'numericColumn' as const,
    },
    {
      headerName: 'Capital Inv.', field: 'Capital_Invertido' as keyof DiagnosticoItem, width: 110, type: 'numericColumn' as const,
      valueFormatter: (p: any) => fmt(p.value),
    },
    {
      headerName: 'Diagnóstico', field: 'Diagnostico' as keyof DiagnosticoItem, flex: 1, minWidth: 180,
      cellRenderer: (p: any) => {
        const d = getDiagColor(p.value || '');
        return <span style={{
          background: d.bg, color: d.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>{p.value}</span>;
      },
    },
    {
      headerName: '', width: 45, sortable: false, filter: false,
      cellRenderer: (p: any) => {
        return <button title="Ver Kardex" onClick={() => setKardexModal({ isOpen: true, producto: p.data })}
          style={{ background: 'transparent', border: '1.5px solid #3b82f6', color: '#3b82f6', width: 28, height: 28,
            borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
        </button>;
      },
    },
  ], []);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true }), []);
  const onFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value), []);

  const s = {
    card: (bg: string, color: string): React.CSSProperties => ({
      background: bg, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }),
    chip: (active: boolean, color: string): React.CSSProperties => ({
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none',
      background: active ? color : '#f3f4f6', color: active ? '#fff' : '#6b7280',
      transition: 'all 0.15s',
    }),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827' }}>Diagnóstico de Inventario (30 días)</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Análisis de rotación y márgenes de utilidad</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={s.card('#fff', '#111')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="#7c3aed" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Total Analizados</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{datos.length}</div>
          </div>
        </div>
        <div style={s.card('#fff', '#111')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Alta Rotación</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#16a34a' }}>{altaRotacion}</div>
          </div>
        </div>
        <div style={s.card('#fff', '#111')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Rotación Media</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#f59e0b' }}>{rotMedia}</div>
          </div>
        </div>
        <div style={s.card('#fff', '#111')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color="#dc2626" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Problemas</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#dc2626' }}>{problemas}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar por nombre de artículo..." value={busqueda} onChange={onFilter}
              style={{ width: '100%', height: 34, paddingLeft: 34, paddingRight: 12, fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={cargar} disabled={loading}
            style={{ height: 34, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refrescar
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {filtros.map(f => (
            <button key={f.id} onClick={() => setFiltroActivo(f.id)} style={s.chip(filtroActivo === f.id, f.color)}>
              {f.label}
              {filtroActivo === f.id && f.id !== 'todos' && f.match && (
                <span style={{ marginLeft: 4 }}>({datos.filter(d => String(d.Diagnostico || '').includes(f.match!)).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* AG Grid */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 13 }}>Cargando diagnóstico...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>
          <button onClick={cargar} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Reintentar</button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: 'calc(100vh - 440px)', minHeight: 350 }}>
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
              const diag = String(p.data?.Diagnostico || '');
              if (diag.includes('Costo inválido') || diag.includes('Precio por debajo'))
                return { background: '#fef2f2' };
              return undefined;
            }}
            overlayNoRowsTemplate='<span style="padding:10px;color:#6b7280">No se encontraron resultados</span>'
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '10px 16px', textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
        Mostrando <strong style={{ color: '#7c3aed' }}>{datosFiltrados.length}</strong> de <strong style={{ color: '#7c3aed' }}>{datos.length}</strong> productos
      </div>

      <Kardex isOpen={kardexModal.isOpen} onClose={() => setKardexModal({ isOpen: false, producto: null })} producto={kardexModal.producto} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
