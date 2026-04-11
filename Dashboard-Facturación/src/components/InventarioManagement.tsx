import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Package,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Search,
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import api from '../services/api';
import { Kardex } from './Kardex';
import { DetalleProductoModal } from './DetalleProductoModal';
import { EditarArticuloModal } from './EditarArticuloModal';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Articulo {
  Items: number;
  Codigo: string;
  Descripcion: string;
  Existencia: number;
  Iva: number;
  Costo: number;
  Precio1: number;
  Precio2: number;
  Precio3: number;
  PrecioMinimo: number;
  Categoria: string;
  Proveedor: string;
  Estado: string;
}

const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff',
  headerTextColor: '#6b21a8',
  headerFontSize: 12,
  headerFontWeight: 600,
  fontSize: 12,
  rowBorder: { color: '#f3f4f6', width: 1 },
  borderColor: '#e5e7eb',
  borderRadius: 8,
  rowHoverColor: '#faf5ff',
  selectedRowBackgroundColor: '#f3e8ff',
  spacing: 6,
});

export function InventarioManagement() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('Activos');
  const [kardexModal, setKardexModal] = useState<{ isOpen: boolean; producto: Articulo | null }>({
    isOpen: false,
    producto: null
  });
  const [detalleProducto, setDetalleProducto] = useState<number | null>(null);
  const [editarModal, setEditarModal] = useState<{ isOpen: boolean; producto: Articulo | null }>({
    isOpen: false,
    producto: null
  });

  useEffect(() => {
    cargarArticulos();
  }, [estado]);

  const cargarArticulos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventario/articulos.php', {
        params: { estado },
      });
      setArticulos(response.data.articulos || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los artículos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatearMoneda = (valor: number) => {
    return '$ ' + new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor || 0);
  };

  const calcularUtilidad = (precio: number, costo: number) => {
    if (!costo || costo === 0 || !precio || precio === 0) return 0;
    return Number((((precio - costo) / precio) * 100).toFixed(1));
  };

  // Column definitions
  const columnDefs = useMemo(() => [
    {
      headerName: 'Código',
      field: 'Codigo' as keyof Articulo,
      width: 140,
      cellStyle: { color: '#7c3aed', fontWeight: 500 },
    },
    {
      headerName: 'Nombre Artículo',
      field: 'Descripcion' as keyof Articulo,
      flex: 2,
      minWidth: 200,
      cellStyle: { fontWeight: 500 },
    },
    {
      headerName: 'Exist.',
      field: 'Existencia' as keyof Articulo,
      width: 90,
      type: 'numericColumn' as const,
      cellRenderer: (params: { value: number }) => {
        const val = params.value || 0;
        return <span style={{
          background: val > 0 ? '#dbeafe' : '#fee2e2',
          color: val > 0 ? '#1d4ed8' : '#dc2626',
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500
        }}>{val}</span>;
      },
    },
    {
      headerName: 'IVA',
      field: 'Iva' as keyof Articulo,
      width: 70,
      type: 'numericColumn' as const,
      valueFormatter: (params: { value: number }) => `${params.value || 0}%`,
    },
    {
      headerName: 'Costo',
      field: 'Costo' as keyof Articulo,
      width: 120,
      type: 'numericColumn' as const,
      valueFormatter: (params: { value: number }) => formatearMoneda(params.value),
    },
    {
      headerName: 'Precio Venta',
      field: 'Precio1' as keyof Articulo,
      width: 130,
      type: 'numericColumn' as const,
      valueFormatter: (params: { value: number }) => formatearMoneda(params.value),
      cellStyle: { color: '#16a34a', fontWeight: 600 },
    },
    {
      headerName: '% Util',
      width: 90,
      valueGetter: (params: { data: Articulo }) => calcularUtilidad(params.data.Precio1, params.data.Costo),
      cellRenderer: (params: { value: number }) => {
        const val = params.value;
        return <span style={{
          background: val >= 20 ? '#dcfce7' : val >= 0 ? '#dbeafe' : '#fee2e2',
          color: val >= 20 ? '#16a34a' : val >= 0 ? '#1d4ed8' : '#dc2626',
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500
        }}>{val}%</span>;
      },
    },
    {
      headerName: 'Categoría',
      field: 'Categoria' as keyof Articulo,
      width: 120,
      valueFormatter: (params: { value: string }) => params.value || 'VARIOS',
    },
    {
      headerName: 'Proveedor',
      field: 'Proveedor' as keyof Articulo,
      width: 180,
      valueFormatter: (params: { value: string }) => params.value || '-',
    },
    {
      headerName: 'Estado',
      field: 'Estado' as keyof Articulo,
      width: 90,
      cellRenderer: (params: { value: string }) => {
        const activo = params.value === 'Activo';
        return <span style={{
          background: activo ? '#22c55e' : '#ef4444',
          color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500
        }}>{params.value || 'Activo'}</span>;
      },
    },
    {
      headerName: 'Acciones',
      width: 110,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Articulo }) => {
        const btn = (color: string, hoverBg: string): React.CSSProperties => ({
          background: 'transparent', color, width: 30, height: 30,
          borderRadius: 6, border: `1.5px solid ${color}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        });
        return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseOver={(e) => {
            e.currentTarget.querySelectorAll('button').forEach(b => {
              b.addEventListener('mouseenter', () => { b.style.background = b.dataset.hc || ''; b.style.color = '#fff'; });
              b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; b.style.color = b.dataset.c || ''; });
            });
          }}
        >
          <button title="Detalle del producto" data-c="#7c3aed" data-hc="#7c3aed"
            onClick={() => setDetalleProducto(params.data.Items)}
            style={btn('#7c3aed', '#7c3aed')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
          </button>
          <button title="Ver Kardex" data-c="#3b82f6" data-hc="#3b82f6"
            onClick={() => setKardexModal({ isOpen: true, producto: params.data })}
            style={btn('#3b82f6', '#3b82f6')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </button>
          <button title="Editar producto" data-c="#f59e0b" data-hc="#f59e0b"
            onClick={() => setEditarModal({ isOpen: true, producto: params.data })}
            style={btn('#f59e0b', '#f59e0b')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
            </svg>
          </button>
          <button title="Eliminar producto" data-c="#ef4444" data-hc="#ef4444"
            onClick={() => console.log('Eliminar', params.data.Codigo)}
            style={btn('#ef4444', '#ef4444')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>;
      },
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Quick filter
  const onFilterTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
  }, []);

  // Stats
  const totalInventario = articulos.reduce((sum: number, art: Articulo) => sum + (art.Existencia * art.Costo || 0), 0);
  const sinStock = articulos.filter((a: Articulo) => a.Existencia <= 0).length;
  const conStock = articulos.filter((a: Articulo) => a.Existencia > 0).length;
  const promedioUtilidad = articulos.length > 0
    ? (articulos.reduce((sum: number, a: Articulo) => sum + calcularUtilidad(a.Precio1, a.Costo), 0) / articulos.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inventario de Artículos</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona el inventario de productos</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Artículos</p>
                <p className="text-2xl font-semibold text-gray-900">{articulos.length}</p>
                <p className="text-[10px] text-gray-400">{conStock} con stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor Inventario</p>
                <p className="text-xl font-semibold text-gray-900">{formatearMoneda(totalInventario)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Utilidad Promedio</p>
                <p className="text-2xl font-semibold text-gray-900">{promedioUtilidad}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sin Stock</p>
                <p className="text-2xl font-semibold text-red-600">{sinStock}</p>
                <p className="text-[10px] text-gray-400">{articulos.length > 0 ? ((sinStock / articulos.length) * 100).toFixed(0) : 0}% del total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por código, nombre, categoría o proveedor..."
              value={busqueda}
              onChange={onFilterTextChange}
              style={{ width: '100%', height: 36, paddingLeft: 34, paddingRight: 12, fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="Activos">Activos</option>
            <option value="Todos">Todos</option>
          </select>
          <Button
            onClick={cargarArticulos}
            disabled={loading}
            className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-sm rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          <button
            onClick={() => setEditarModal({ isOpen: true, producto: null })}
            style={{ height: 36, padding: '0 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* AG Grid Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
          <p className="text-gray-500">Cargando artículos...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={cargarArticulos} variant="outline">Reintentar</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 420px)', minHeight: '400px' }}>
          <AgGridReact
            theme={myTheme}
            rowData={articulos}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={busqueda}
            pagination={true}
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200]}
            animateRows={true}
            rowSelection={'single' as any}
            getRowStyle={(params: { data: Articulo }) => {
              if (params.data?.Existencia <= 0) {
                return { background: '#fef2f2' };
              }
              return undefined;
            }}
            overlayNoRowsTemplate='<span style="padding:10px;color:#6b7280">No se encontraron artículos</span>'
          />
        </div>
      )}

      {/* Footer */}
      <div className="bg-white rounded-xl shadow-sm p-4 text-center text-sm text-gray-500">
        Total: <span className="font-semibold text-purple-600">{articulos.length}</span> artículos
      </div>

      {/* Modal de Kardex */}
      <Kardex
        isOpen={kardexModal.isOpen}
        onClose={() => setKardexModal({ isOpen: false, producto: null })}
        producto={kardexModal.producto}
      />

      {/* Modal de Editar */}
      <EditarArticuloModal
        isOpen={editarModal.isOpen}
        onClose={() => setEditarModal({ isOpen: false, producto: null })}
        articulo={editarModal.producto}
        onGuardado={cargarArticulos}
        modo={editarModal.producto ? 'editar' : 'nuevo'}
      />

      {/* Modal detalle producto */}
      {detalleProducto && (
        <DetalleProductoModal items={detalleProducto} onClose={() => setDetalleProducto(null)} />
      )}
    </div>
  );
}
