import { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from 'ag-grid-community';
import { AlertTriangle, RefreshCw, Package, ShoppingCart, DollarSign, Boxes, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { esFarmacia } from './ConfiguracionSistema';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';
import { EditarArticuloModal } from './EditarArticuloModal';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/familias/stock-bajo.php';
// Llave que Órdenes de Compra lee al montar para precargar productos.
// Los productos van a OC (no a Compra directa) porque en ese momento aún no
// hay factura del proveedor — solo se le está pidiendo la mercancía. Cuando
// llegue la factura, el operador entra a Órdenes de Compra → Recibir y ahí
// la OC se convierte en compra real (tblpedidos + kardex).
const LS_PRECARGA_OC = 'precarga_oc_stockbajo';

// Mismo tema que Inventario — mantiene coherencia visual en todo el módulo.
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

interface Producto {
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Existencia: number;
  Stock_Minimo: number;
  Precio_Venta: number;
  Precio_Costo: number;
  Iva: number;
  FactorConversion: number;
  factor_conversion: number;
  NombreEmpaque: string | null;
  nombre_empaque: string | null;
  vender_como_empaque: number;
  comprar_como_empaque: number;
  precio_venta_empaque: number | null;
  Id_Etiqueta: number | null;
  Etiqueta: string;
  Etiqueta_Color: string;
  Id_Familia: number;
  Familia_Nombre: string;
  CodigoPro: number | null;
  Proveedor_Nombre: string;
}

interface Props {
  onNavigate?: (view: string) => void;
}

export function StockBajo({ onNavigate }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<number | null>(null);
  const [filtroProveedor, setFiltroProveedor] = useState<string>(''); // '' = todos, o CodigoPro string
  const [provQuery, setProvQuery] = useState('');
  const [provOpen, setProvOpen] = useState(false);
  const provInputRef = useRef<HTMLInputElement | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [editarProducto, setEditarProducto] = useState<any | null>(null);
  const farmacia = esFarmacia();

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setProductos(d.productos || []);
      else toast.error(d.message || 'Error al cargar');
    } catch (e: any) { toast.error('Error de red: ' + e.message); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  // Etiquetas disponibles (deriva de los datos, con conteo y color)
  const etiquetasDisponibles = useMemo(() => {
    const mapa = new Map<number, { id: number; nombre: string; color: string; count: number }>();
    productos.forEach(a => {
      if (!a.Id_Etiqueta) return;
      const key = a.Id_Etiqueta;
      const prev = mapa.get(key);
      if (prev) prev.count++;
      else mapa.set(key, {
        id: key, nombre: a.Etiqueta || `Etiqueta ${key}`,
        color: a.Etiqueta_Color || '#7c3aed', count: 1,
      });
    });
    return Array.from(mapa.values()).sort((a, b) => a.id - b.id);
  }, [productos]);

  // Proveedores disponibles (deriva de los datos con conteo)
  const proveedoresDisponibles = useMemo(() => {
    const mapa = new Map<string, { codigo: string; nombre: string; count: number }>();
    productos.forEach(a => {
      const cod = a.CodigoPro != null ? String(a.CodigoPro) : '';
      const nom = a.Proveedor_Nombre || '';
      if (!cod || !nom) return;
      const prev = mapa.get(cod);
      if (prev) prev.count++;
      else mapa.set(cod, { codigo: cod, nombre: nom, count: 1 });
    });
    return Array.from(mapa.values()).sort((a, b) => b.count - a.count);
  }, [productos]);

  // Filtrar por etiqueta + proveedor
  const productosFiltrados = useMemo(() => {
    let arr = productos;
    if (filtroEtiqueta !== null) arr = arr.filter(a => a.Id_Etiqueta === filtroEtiqueta);
    if (filtroProveedor) arr = arr.filter(a => String(a.CodigoPro || '') === filtroProveedor);
    return arr;
  }, [productos, filtroEtiqueta, filtroProveedor]);

  // KPIs
  const kpis = useMemo(() => {
    const total = productosFiltrados.length;
    const criticos = productosFiltrados.filter(p => p.Existencia <= 0).length;
    const valorReposicion = productosFiltrados.reduce((s, p) => {
      const faltan = Math.max(0, Number(p.Stock_Minimo) - Number(p.Existencia));
      return s + faltan * (Number(p.Precio_Costo) || 0);
    }, 0);
    return { total, criticos, valorReposicion };
  }, [productosFiltrados]);

  const toggleSel = (items: number) => {
    setSeleccionados(prev => {
      const n = new Set(prev);
      if (n.has(items)) n.delete(items); else n.add(items);
      return n;
    });
  };
  const toggleSelTodos = () => {
    if (seleccionados.size === productosFiltrados.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(productosFiltrados.map(p => p.Items)));
  };

  // Enviar productos seleccionados a Orden de Compra (no a Compra directa).
  // Regla del negocio: la OC es lo que se le envía al proveedor pidiendo la
  // mercancía. Cuando llega la factura, se entra a Órdenes de Compra → Recibir
  // y ahí se convierte en compra real. Aquí NO hay factura de compra todavía.
  const enviarAOrdenCompra = (unSoloItem?: number) => {
    const lista = unSoloItem !== undefined
      ? productos.filter(p => p.Items === unSoloItem)
      : productos.filter(p => seleccionados.has(p.Items));
    if (lista.length === 0) { toast.error('No hay productos para enviar'); return; }
    try {
      const payload = lista.map(p => ({
        ...p,
        cantidad_sugerida: Math.max(1, Math.ceil(Number(p.Stock_Minimo) - Number(p.Existencia))),
      }));
      localStorage.setItem(LS_PRECARGA_OC, JSON.stringify(payload));
      toast.success(`${lista.length} producto${lista.length > 1 ? 's' : ''} enviado${lista.length > 1 ? 's' : ''} a Orden de Compra`);
      setSeleccionados(new Set());
      if (onNavigate) onNavigate('ordenes-compra');
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const cols: ColDef[] = useMemo(() => [
    {
      headerName: '',
      colId: 'sel',
      width: 42,
      pinned: 'left',
      headerComponent: () => (
        <input
          type="checkbox"
          checked={productosFiltrados.length > 0 && seleccionados.size === productosFiltrados.length}
          ref={el => { if (el) el.indeterminate = seleccionados.size > 0 && seleccionados.size < productosFiltrados.length; }}
          onChange={toggleSelTodos}
          style={{ cursor: 'pointer', width: 15, height: 15 }}
        />
      ),
      cellRenderer: (p: any) => (
        <input
          type="checkbox"
          checked={seleccionados.has(p.data.Items)}
          onChange={() => toggleSel(p.data.Items)}
          style={{ cursor: 'pointer', width: 15, height: 15 }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      headerName: 'Código', field: 'Codigo', width: 100,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.value}</span>,
    },
    {
      headerName: 'Producto', field: 'Nombres_Articulo', flex: 1, minWidth: 240,
      cellStyle: { fontWeight: 500 },
    },
    ...(etiquetasDisponibles.length > 0 ? [{
      headerName: 'Etiqueta', field: 'Etiqueta' as keyof Producto, width: 120,
      cellRenderer: (p: any) => {
        if (!p.data.Id_Etiqueta) return <span style={{ color: '#d1d5db', fontSize: 10 }}>—</span>;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
            background: (p.data.Etiqueta_Color || '#7c3aed') + '20',
            color: p.data.Etiqueta_Color || '#7c3aed',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.data.Etiqueta_Color || '#7c3aed' }} />
            {p.data.Etiqueta}
          </span>
        );
      },
    } as ColDef] : []),
    {
      headerName: 'Proveedor', field: 'Proveedor_Nombre', width: 180,
      cellRenderer: (p: any) => p.value
        ? <span style={{ color: '#4b5563', fontSize: 11 }} title={p.value}>{p.value}</span>
        : <span style={{ color: '#d1d5db', fontSize: 10 }}>—</span>,
    },
    {
      headerName: 'Existencia', field: 'Existencia', width: 100, sortable: true,
      type: 'numericColumn',
      cellRenderer: (p: any) => {
        const v = Number(p.value) || 0;
        const critico = v <= 0;
        return <span style={{
          fontFamily: 'monospace', fontWeight: 700,
          color: critico ? '#dc2626' : '#f59e0b',
        }}>{v.toFixed(v % 1 === 0 ? 0 : 2)}</span>;
      },
    },
    {
      headerName: 'Mínimo', field: 'Stock_Minimo', width: 90, sortable: true,
      type: 'numericColumn',
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>
        {Number(p.value).toFixed(Number(p.value) % 1 === 0 ? 0 : 2)}
      </span>,
    },
    {
      headerName: 'Faltan', width: 90, sortable: true, type: 'numericColumn',
      valueGetter: (p: any) => Number(p.data.Stock_Minimo) - Number(p.data.Existencia),
      cellRenderer: (p: any) => <span style={{
        fontFamily: 'monospace', fontWeight: 700, color: '#dc2626',
      }}>{Math.max(0, p.value).toFixed(p.value % 1 === 0 ? 0 : 2)}</span>,
    },
    // Columna "En Cajas" — solo Farmacia
    ...(farmacia ? [{
      headerName: 'Faltan (cajas)', width: 140, colId: 'faltan_cajas',
      cellRenderer: (p: any) => {
        const factor = Math.max(1, Number(p.data.FactorConversion) || 1);
        if (factor <= 1) return <span style={{ color: '#d1d5db' }}>—</span>;
        const faltan = Math.max(0, Number(p.data.Stock_Minimo) - Number(p.data.Existencia));
        const cajas = Math.ceil(faltan / factor);
        const emp = (p.data.NombreEmpaque || 'caja').toLowerCase();
        return (
          <span style={{ fontSize: 11 }}>
            <b style={{ color: '#7c3aed' }}>{cajas}</b>
            <span style={{ color: '#9ca3af' }}> {emp}{cajas === 1 ? '' : 's'}</span>
            <span style={{ color: '#d1d5db', fontSize: 10 }}> · ×{factor}</span>
          </span>
        );
      },
    } as ColDef] : []),
    {
      headerName: 'Costo', field: 'Precio_Costo', width: 100, type: 'numericColumn',
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
        $ {Math.round(Number(p.value) || 0).toLocaleString('es-CO')}
      </span>,
    },
    {
      headerName: 'Reposición', width: 110, type: 'numericColumn',
      valueGetter: (p: any) => Math.max(0, Number(p.data.Stock_Minimo) - Number(p.data.Existencia)) * Number(p.data.Precio_Costo || 0),
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#7c3aed', fontSize: 11 }}>
        $ {Math.round(p.value).toLocaleString('es-CO')}
      </span>,
    },
    {
      headerName: '', width: 50, pinned: 'right', colId: 'acciones',
      cellRenderer: (p: any) => (
        <button
          onClick={() => setEditarProducto(p.data)}
          title="Editar producto"
          style={{
            width: 26, height: 24, borderRadius: 4,
            border: '1px solid #e5e7eb', background: '#fff', color: '#7c3aed',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f3e8ff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}>
          <Edit2 size={12} />
        </button>
      ),
    },
  ], [seleccionados, productosFiltrados, farmacia, etiquetasDisponibles]);

  const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

  return (
    <div style={{ padding: 12 }}>
      {/* Header compacto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} color="#dc2626" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Productos con stock bajo</h2>
        </div>
        <button onClick={cargar} disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', height: 28, background: '#7c3aed',
            color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, opacity: loading ? 0.6 : 1,
          }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* KPIs compactos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: 8, background: '#fef2f2', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#dc2626' }}>{kpis.total}</div>
            <div style={{ fontSize: 10, color: '#991b1b', opacity: 0.8 }}>Bajo mínimo</div>
          </div>
        </div>
        <div style={{ padding: 8, background: '#fef3c7', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <Package size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#d97706' }}>{kpis.criticos}</div>
            <div style={{ fontSize: 10, color: '#92400e', opacity: 0.8 }}>Sin existencia</div>
          </div>
        </div>
        <div style={{ padding: 8, background: '#f3e8ff', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <DollarSign size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: '#7c3aed' }}>{fmtMon(kpis.valorReposicion)}</div>
            <div style={{ fontSize: 10, color: '#6b21a8', opacity: 0.8 }}>Reposición estimada</div>
          </div>
        </div>
      </div>

      {/* Filtros: proveedor (combobox filtrable) + etiqueta (pills) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {proveedoresDisponibles.length > 0 && (
          <>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Proveedor:</span>
            <div style={{ position: 'relative', width: 260 }}>
              <input
                ref={provInputRef}
                type="text"
                value={provOpen ? provQuery : (filtroProveedor
                  ? proveedoresDisponibles.find(p => p.codigo === filtroProveedor)?.nombre || ''
                  : `Todos los proveedores (${productos.length})`)}
                onFocus={() => { setProvOpen(true); setProvQuery(''); }}
                onBlur={() => setTimeout(() => setProvOpen(false), 150)}
                onChange={(e) => { setProvQuery(e.target.value); setProvOpen(true); }}
                placeholder="Escribe para buscar..."
                style={{
                  width: '100%', height: 26, padding: '0 26px 0 8px', borderRadius: 6,
                  border: `1px solid ${filtroProveedor ? '#7c3aed' : '#d1d5db'}`,
                  background: filtroProveedor && !provOpen ? '#f3e8ff' : '#fff',
                  color: filtroProveedor && !provOpen ? '#6b21a8' : '#374151',
                  fontSize: 11, fontWeight: 600, cursor: 'text', outline: 'none',
                }}
              />
              <span style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 9, color: '#9ca3af', pointerEvents: 'none',
              }}>▾</span>
              {provOpen && (() => {
                const q = provQuery.trim().toLowerCase();
                const filtrados = q
                  ? proveedoresDisponibles.filter(p => p.nombre.toLowerCase().includes(q))
                  : proveedoresDisponibles;
                return (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
                    background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 50,
                    maxHeight: 280, overflowY: 'auto',
                  }}>
                    <div
                      onClick={() => { setFiltroProveedor(''); setProvOpen(false); provInputRef.current?.blur(); }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: !filtroProveedor ? '#f3e8ff' : 'transparent',
                        color: !filtroProveedor ? '#6b21a8' : '#374151',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                      onMouseEnter={(e) => { if (filtroProveedor) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={(e) => { if (filtroProveedor) e.currentTarget.style.background = 'transparent'; }}
                    >
                      Todos los proveedores ({productos.length})
                    </div>
                    {filtrados.length === 0 ? (
                      <div style={{ padding: '12px', color: '#9ca3af', fontSize: 11, textAlign: 'center' }}>
                        Sin coincidencias para "{q}"
                      </div>
                    ) : filtrados.map(pr => {
                      const activo = filtroProveedor === pr.codigo;
                      return (
                        <div
                          key={pr.codigo}
                          onClick={() => { setFiltroProveedor(pr.codigo); setProvOpen(false); provInputRef.current?.blur(); }}
                          style={{
                            padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                            background: activo ? '#f3e8ff' : 'transparent',
                            color: activo ? '#6b21a8' : '#374151',
                            display: 'flex', justifyContent: 'space-between', gap: 8,
                          }}
                          onMouseEnter={(e) => { if (!activo) e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseLeave={(e) => { if (!activo) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: activo ? 600 : 500 }}>
                            {pr.nombre}
                          </span>
                          <span style={{
                            flexShrink: 0, fontSize: 10, fontWeight: 700,
                            padding: '1px 6px', borderRadius: 8,
                            background: activo ? 'rgba(124,58,237,0.15)' : '#f3f4f6',
                            color: activo ? '#7c3aed' : '#6b7280',
                          }}>{pr.count}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            {filtroProveedor && (
              <button onClick={() => setFiltroProveedor('')}
                title="Quitar filtro proveedor"
                style={{
                  height: 26, width: 26, borderRadius: 6, border: '1px solid #e5e7eb',
                  background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280',
                }}>×</button>
            )}
            {etiquetasDisponibles.length > 0 && <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />}
          </>
        )}
      {etiquetasDisponibles.length > 0 && (
        <>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginRight: 4 }}>Etiqueta:</span>
          <button onClick={() => setFiltroEtiqueta(null)}
            style={{
              padding: '4px 10px', height: 26, borderRadius: 12,
              border: `1px solid ${filtroEtiqueta === null ? '#7c3aed' : '#e5e7eb'}`,
              background: filtroEtiqueta === null ? '#7c3aed' : 'white',
              color: filtroEtiqueta === null ? '#fff' : '#6b7280',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Todas</button>
          {etiquetasDisponibles.map(e => {
            const active = filtroEtiqueta === e.id;
            return (
              <button key={e.id} onClick={() => setFiltroEtiqueta(active ? null : e.id)}
                style={{
                  padding: '4px 10px', height: 26, borderRadius: 12,
                  border: `1px solid ${active ? e.color : '#e5e7eb'}`,
                  background: active ? e.color : 'white',
                  color: active ? '#fff' : '#374151',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#fff' : e.color }} />
                {e.nombre}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '0 4px', borderRadius: 8,
                  background: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                  color: active ? '#fff' : '#6b7280',
                }}>{e.count}</span>
              </button>
            );
          })}
        </>
      )}
      </div>

      {/* Grid o mensaje vacío */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
      ) : productos.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center', color: '#9ca3af',
          background: '#f9fafb', borderRadius: 8, border: '1px dashed #e5e7eb',
        }}>
          <Boxes size={48} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#374151' }}>Todo en orden</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>Ningún producto está por debajo de su stock mínimo.</p>
          <p style={{ margin: '12px 0 0', fontSize: 11 }}>
            <b>Tip:</b> Edita un producto y ajusta su <b>Stock mínimo</b> para recibir alertas.
          </p>
        </div>
      ) : (
        <div style={{ height: `calc(100vh - ${seleccionados.size > 0 ? '360' : '300'}px)`, width: '100%' }}>
          <AgGridReact
            theme={myTheme}
            rowData={productosFiltrados}
            columnDefs={cols}
            localeText={AG_GRID_LOCALE_ES}
            rowHeight={32}
            headerHeight={32}
            animateRows
            overlayNoRowsTemplate="<span style='padding:20px;color:#6b7280'>Sin productos con esta etiqueta</span>"
          />
        </div>
      )}

      {/* Barra flotante inferior con acciones cuando hay selección */}
      {seleccionados.size > 0 && (
        <div style={{
          position: 'sticky', bottom: 0, marginTop: 10,
          background: '#7c3aed', borderRadius: 8, padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 20px rgba(124, 58, 237, 0.25)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {seleccionados.size} producto{seleccionados.size > 1 ? 's' : ''} seleccionado{seleccionados.size > 1 ? 's' : ''}
            </span>
            {farmacia && (() => {
              // Resumen en cajas si es farmacia
              const totalCajas = productos
                .filter(p => seleccionados.has(p.Items))
                .reduce((s, p) => {
                  const factor = Math.max(1, Number(p.FactorConversion) || 1);
                  if (factor <= 1) return s;
                  const faltan = Math.max(0, Number(p.Stock_Minimo) - Number(p.Existencia));
                  return s + Math.ceil(faltan / factor);
                }, 0);
              return totalCajas > 0 && (
                <span style={{ fontSize: 11, opacity: 0.85 }}>
                  · ≈ {totalCajas} caja{totalCajas > 1 ? 's' : ''} totales
                </span>
              );
            })()}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setSeleccionados(new Set())}
              style={{
                padding: '6px 12px', height: 28, background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: 6, color: 'white',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Cancelar</button>
            <button onClick={() => enviarAOrdenCompra()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', height: 28, background: 'white',
                color: '#7c3aed', border: 'none', borderRadius: 6,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
              <ShoppingCart size={14} /> Crear Orden de Compra
            </button>
          </div>
        </div>
      )}

      {/* Modal editar producto — abre desde el botón lápiz de la fila.
          Al guardar, refresca el listado para reflejar cambios (p. ej. si
          ajustó el stock mínimo, el producto puede salir de la vista). */}
      <EditarArticuloModal
        isOpen={!!editarProducto}
        onClose={() => setEditarProducto(null)}
        articulo={editarProducto ? {
          // Mapeamos las columnas de StockBajo al shape que espera el modal
          // (que espera 'Descripcion', 'Precio1' etc de Inventario).
          Items: editarProducto.Items,
          Codigo: editarProducto.Codigo,
          Descripcion: editarProducto.Nombres_Articulo,
          Nombres_Articulo: editarProducto.Nombres_Articulo,
          Existencia: editarProducto.Existencia,
          Existencia_minima: editarProducto.Stock_Minimo,
          Precio_Venta: editarProducto.Precio_Venta,
          Precio_Costo: editarProducto.Precio_Costo,
          Iva: editarProducto.Iva,
          Id_Etiqueta: editarProducto.Id_Etiqueta,
          FactorConversion: editarProducto.FactorConversion,
          NombreEmpaque: editarProducto.NombreEmpaque,
          Precio_Venta_Empaque: editarProducto.precio_venta_empaque,
          CodigoPro: editarProducto.CodigoPro,
        } : null}
        onGuardado={cargar}
        modo="editar"
      />
    </div>
  );
}

// Hook movido a src/hooks/useStockBajoCount.ts para permitir code-splitting.
// Importa desde allá: `import { useStockBajoCount } from '../hooks/useStockBajoCount'`.
export { useStockBajoCount } from '../hooks/useStockBajoCount';
