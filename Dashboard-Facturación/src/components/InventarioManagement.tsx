import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit2, BarChart3, Info, Copy, Trash2, FileText, Download } from 'lucide-react';
import { confirmar } from './ConfirmDialog';
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
import * as XLSX from 'xlsx';
import api from '../services/api';
import { Kardex } from './Kardex';
import { DetalleProductoModal } from './DetalleProductoModal';
import { EditarArticuloModal } from './EditarArticuloModal';
import { esFarmacia } from './ConfiguracionSistema';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

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
  Servicio?: number;
  Id_Etiqueta?: number | null;
  Etiqueta?: string;
  Etiqueta_Color?: string;
  FactorConversion?: number;
  NombreEmpaque?: string | null;
  Precio_Venta_Empaque?: number | null;
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
  // Filtro de tipo: 'todos' (default) | 'producto' | 'servicio'.
  // Útil para el negocio que vende servicios mezclados con productos: si
  // quiere ver solo sus servicios cargados en catálogo, los filtra arriba.
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'producto' | 'servicio'>('todos');
  // Filtro por etiqueta: null = todas, 0 = sin etiqueta, N = etiqueta con id N
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<number | null>(null);
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; articulo: Articulo } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!contextMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    setTimeout(() => document.addEventListener('click', onClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const copiar = async (texto: string, etiqueta: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success(`${etiqueta} copiado`); }
    catch { toast.error('No se pudo copiar'); }
    setContextMenu(null);
  };

  const eliminarProducto = async (articulo: any) => {
    setContextMenu(null);
    const ok = await confirmar({
      title: 'Eliminar producto',
      message: `¿Seguro que quieres eliminar "${articulo.Descripcion}" (${articulo.Codigo})?\n\nSolo se podrá si no tiene ventas, compras ni movimientos en el kárdex. De lo contrario, te ofreceré desactivarlo.`,
      type: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    try {
      const r = await api.delete(`/inventario/eliminar-articulo.php?items=${articulo.Items}`);
      const d = r.data;
      if (d.success) {
        toast.success(d.message || 'Producto eliminado');
        cargarArticulos();
        return;
      }
      // Tiene dependencias → ofrecer desactivar
      if (d.sugerencia === 'desactivar') {
        const ok2 = await confirmar({
          title: 'No se puede eliminar',
          message: `${d.message}\n\n¿Desactivar el producto en su lugar? Conserva el historial pero no aparecerá en ventas nuevas.`,
          type: 'warning',
          confirmText: 'Sí, desactivar',
          cancelText: 'Cancelar',
        });
        if (!ok2) return;
        const r2 = await api.post('/inventario/eliminar-articulo.php', { action: 'desactivar', items: articulo.Items });
        if (r2.data.success) {
          toast.success(r2.data.message || 'Producto desactivado');
          cargarArticulos();
        } else {
          toast.error(r2.data.message || 'No se pudo desactivar');
        }
        return;
      }
      toast.error(d.message || 'No se pudo eliminar');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Error de red');
    }
  };

  useEffect(() => {
    cargarArticulos();
  }, [estado]);

  // Aplicar filtros pendientes provenientes del Panel de Sugerencias o
  // NotificacionEmergente. Ej.: sugerencia "Top producto" envía el código
  // aquí para que se muestre solo ese producto al abrir el módulo.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('filtros_pendientes:inventario');
      if (!raw) return;
      const f = JSON.parse(raw);
      localStorage.removeItem('filtros_pendientes:inventario');
      if (f.codigo) setBusqueda(String(f.codigo));
    } catch { /* silencio */ }
  }, []);

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

  // Muestra decimales solo si el número los tiene (ej. costo promedio con
  // flete prorrateado). Los enteros salen limpios. Mismo patrón que fmtMon
  // en NuevaCompra/NuevaVenta para consistencia visual entre pantallas.
  const formatearMoneda = (valor: number) => {
    const v = valor || 0;
    const tieneDecimales = v % 1 !== 0;
    return '$ ' + v.toLocaleString('es-CO', {
      minimumFractionDigits: tieneDecimales ? 2 : 0,
      maximumFractionDigits: tieneDecimales ? 2 : 0,
    });
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
      cellRenderer: (params: { value: string; data: Articulo }) => (
        <span
          onClick={() => setEditarModal({ isOpen: true, producto: params.data })}
          title="Click para editar"
          style={{ color: '#7c3aed', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          {params.value}
        </span>
      ),
    },
    {
      headerName: 'Nombre Artículo',
      field: 'Descripcion' as keyof Articulo,
      flex: 2,
      minWidth: 200,
      cellStyle: { fontWeight: 500, userSelect: 'text', textTransform: 'uppercase' },
    },
    {
      headerName: 'Exist.',
      field: 'Existencia' as keyof Articulo,
      width: 90,
      type: 'numericColumn' as const,
      cellRenderer: (params: { value: number }) => {
        const val = params.value || 0;
        // Formato colombiano con separador de miles (28175 → "28.175")
        // y hasta 3 decimales para productos por kilogramo/litro.
        const display = val.toLocaleString('es-CO', { maximumFractionDigits: 3 });
        return <span style={{
          background: val > 0 ? '#dbeafe' : '#fee2e2',
          color: val > 0 ? '#1d4ed8' : '#dc2626',
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500
        }}>{display}</span>;
      },
    },
    // Columna "En Cajas" — solo Farmacia. Muestra el desglose "3 CAJAs + 7 und"
    // para productos con FactorConversion > 1. En productos sin factor,
    // muestra guión "—".
    ...(esFarmacia() ? [{
      headerName: 'En Cajas',
      field: 'Existencia' as keyof Articulo,
      colId: 'existencia_cajas',
      width: 130,
      type: 'numericColumn' as const,
      cellRenderer: (params: { data: Articulo }) => {
        const factor = Math.max(1, Number(params.data.FactorConversion) || 1);
        if (factor <= 1) return <span style={{ color: '#d1d5db' }}>—</span>;
        const exist = Number(params.data.Existencia) || 0;
        const cajas = Math.floor(exist / factor);
        const sueltas = Math.round(exist - cajas * factor);
        const emp = params.data.NombreEmpaque || 'CAJA';
        return (
          <span style={{ fontSize: 11 }}>
            <b style={{ color: '#7c3aed' }}>{cajas}</b>
            <span style={{ color: '#9ca3af' }}> {emp.toLowerCase()}(s) + </span>
            <b style={{ color: '#7c3aed' }}>{sueltas}</b>
            <span style={{ color: '#9ca3af' }}> und</span>
          </span>
        );
      },
    }] : []),
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
      headerName: 'Etiqueta',
      field: 'Etiqueta' as keyof Articulo,
      width: 130,
      hide: true,
      cellRenderer: (params: { value: string; data: Articulo }) => {
        if (!params.value) return <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>;
        const color = params.data.Etiqueta_Color || '#7c3aed';
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px',
            borderRadius: 999, background: `${color}20`, color: color,
            fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            {params.value}
          </span>
        );
      },
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
      hide: true,
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
        const btn = (color: string): React.CSSProperties => ({
          background: 'transparent', color, width: 26, height: 26,
          borderRadius: 5, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        });
        return <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}
          onMouseOver={(e) => {
            e.currentTarget.querySelectorAll('button').forEach(b => {
              const c = b.dataset.c || '#000';
              b.addEventListener('mouseenter', () => { b.style.background = c + '18'; });
              b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; });
            });
          }}
        >
          <button title="Detalle del producto" data-c="#7c3aed" data-hc="#7c3aed"
            onClick={() => setDetalleProducto(params.data.Items)}
            style={btn('#7c3aed')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
          </button>
          <button title="Ver Kardex" data-c="#3b82f6" data-hc="#3b82f6"
            onClick={() => setKardexModal({ isOpen: true, producto: params.data })}
            style={btn('#3b82f6')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </button>
          <button title="Editar producto" data-c="#f59e0b" data-hc="#f59e0b"
            onClick={() => setEditarModal({ isOpen: true, producto: params.data })}
            style={btn('#f59e0b')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
            </svg>
          </button>
          <button title="Eliminar producto" data-c="#ef4444" data-hc="#ef4444"
            onClick={() => eliminarProducto(params.data)}
            style={btn('#ef4444')}>
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

  // Orden inteligente: cuando hay búsqueda, los productos cuyo Código o
  // Descripción EMPIEZA con el término aparecen primero, luego los que solo
  // lo contienen. Sin búsqueda, conserva el orden recibido del backend.
  // El filtro de tipo (producto/servicio) se aplica ANTES del orden.
  const articulosOrdenados = useMemo(() => {
    // 1) Filtrar por tipo (producto / servicio)
    let filtrados = filtroTipo === 'todos'
      ? articulos
      : articulos.filter(a => filtroTipo === 'servicio' ? !!a.Servicio : !a.Servicio);

    // 2) Filtrar por etiqueta (0 = sin etiqueta, N = etiqueta N, null = todas)
    if (filtroEtiqueta !== null) {
      filtrados = filtroEtiqueta === 0
        ? filtrados.filter(a => !a.Id_Etiqueta)
        : filtrados.filter(a => a.Id_Etiqueta === filtroEtiqueta);
    }

    // 3) Ordenar inteligente por búsqueda
    const term = (busqueda || '').toLowerCase().trim();
    if (!term) return filtrados;
    const rank = (a: Articulo) => {
      const cod = (a.Codigo || '').toLowerCase();
      const desc = (a.Descripcion || '').toLowerCase();
      if (cod.startsWith(term) || desc.startsWith(term)) return 0;
      if (cod.includes(term) || desc.includes(term)) return 1;
      return 2;
    };
    return [...filtrados].sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (a.Descripcion || '').localeCompare(b.Descripcion || '');
    });
  }, [articulos, busqueda, filtroTipo, filtroEtiqueta]);

  // Conteos para mostrar en los botones del filtro
  const totalProductos = useMemo(() => articulos.filter(a => !a.Servicio).length, [articulos]);
  const totalServicios = useMemo(() => articulos.filter(a => !!a.Servicio).length, [articulos]);

  // Etiquetas presentes en el inventario (deriva de los datos, con conteo y color).
  // Se calcula sobre el resultado de filtroTipo para que los conteos coincidan con
  // el pill activo (si estás en "Productos" y hay 3 Insumos entre productos, muestra 3).
  const etiquetasDisponibles = useMemo(() => {
    const base = filtroTipo === 'todos'
      ? articulos
      : articulos.filter(a => filtroTipo === 'servicio' ? !!a.Servicio : !a.Servicio);
    const mapa = new Map<number, { id: number; nombre: string; color: string; count: number }>();
    let sinEtiqueta = 0;
    base.forEach(a => {
      if (!a.Id_Etiqueta) { sinEtiqueta++; return; }
      const key = a.Id_Etiqueta;
      const prev = mapa.get(key);
      if (prev) prev.count++;
      else mapa.set(key, {
        id: key,
        nombre: a.Etiqueta || `Etiqueta ${key}`,
        color: a.Etiqueta_Color || '#7c3aed',
        count: 1,
      });
    });
    const lista = Array.from(mapa.values()).sort((a, b) => a.id - b.id);
    return { lista, sinEtiqueta };
  }, [articulos, filtroTipo]);

  // Exporta el inventario filtrado a un archivo .xlsx real (no CSV).
  // Las columnas numéricas quedan como números (no strings) — Excel les aplica
  // formato de moneda/porcentaje al abrirse y permite SUMA, filtros, etc.
  const exportarExcel = () => {
    const term = (busqueda || '').toLowerCase().trim();
    const filtrados = !term
      ? articulos
      : articulos.filter(a =>
          (a.Codigo || '').toLowerCase().includes(term) ||
          (a.Descripcion || '').toLowerCase().includes(term) ||
          (a.Categoria || '').toLowerCase().includes(term) ||
          (a.Proveedor || '').toLowerCase().includes(term)
        );

    if (filtrados.length === 0) {
      toast.error('No hay productos para exportar');
      return;
    }

    // Datos como array de objetos (XLSX detecta números automáticamente)
    const data = filtrados.map(a => ({
      'Código': a.Codigo || '',
      'Descripción': a.Descripcion || '',
      'Categoría': a.Categoria || '',
      'Proveedor': a.Proveedor || '',
      'Existencia': Number(a.Existencia || 0),
      'IVA %': Number(a.Iva || 0),
      'Costo (con IVA)': Number(a.Costo || 0),
      'Precio 1': Number(a.Precio1 || 0),
      'Precio 2': Number(a.Precio2 || 0),
      'Precio 3': Number(a.Precio3 || 0),
      'Precio Mínimo': Number(a.PrecioMinimo || 0),
      'Utilidad % P1': Math.round(calcularUtilidad(a.Precio1, a.Costo) * 10) / 10,
      'Valor en Costo': Math.round((a.Existencia || 0) * (a.Costo || 0)),
      'Etiqueta': a.Etiqueta || '',
      'Estado': a.Estado || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Anchos de columna (en caracteres aproximados)
    ws['!cols'] = [
      { wch: 12 }, // Código
      { wch: 35 }, // Descripción
      { wch: 18 }, // Categoría
      { wch: 22 }, // Proveedor
      { wch: 11 }, // Existencia
      { wch: 7 },  // IVA %
      { wch: 14 }, // Costo
      { wch: 12 }, // Precio 1
      { wch: 12 }, // Precio 2
      { wch: 12 }, // Precio 3
      { wch: 13 }, // Precio Mínimo
      { wch: 12 }, // Utilidad
      { wch: 14 }, // Valor en Costo
      { wch: 18 }, // Etiqueta
      { wch: 10 }, // Estado
    ];

    // Aplicar formato de moneda a las columnas de precio/costo
    // El formato $ #,##0 lo aplica Excel cuando ve el patrón
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const moneyCols = [6, 7, 8, 9, 10, 12]; // 0-indexed: Costo, P1, P2, P3, P. Min, Valor Costo
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      for (const C of moneyCols) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellRef]) ws[cellRef].z = '"$"#,##0';
      }
      // Utilidad % con un decimal
      const utilRef = XLSX.utils.encode_cell({ r: R, c: 11 });
      if (ws[utilRef]) ws[utilRef].z = '0.0"%"';
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `inventario_${fecha}.xlsx`);
    toast.success(`Exportados ${filtrados.length} productos a Excel`);
  };

  // Stats
  const totalInventario = articulos.reduce((sum: number, art: Articulo) => sum + (art.Existencia * art.Costo || 0), 0);
  const sinStock = articulos.filter((a: Articulo) => a.Existencia <= 0).length;
  const conStock = articulos.filter((a: Articulo) => a.Existencia > 0).length;
  const promedioUtilidad = articulos.length > 0
    ? (articulos.reduce((sum: number, a: Articulo) => sum + calcularUtilidad(a.Precio1, a.Costo), 0) / articulos.length).toFixed(1)
    : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header compacto — una sola línea, sin subtítulo (era obvio) */}
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Inventario de Artículos</h1>

      {/* Stats Cards compactas — dato al lado del icono en una línea */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Artículos', value: articulos.length, sub: `${conStock} con stock`, icon: Package, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Valor Inventario', value: formatearMoneda(totalInventario), icon: DollarSign, bg: '#cffafe', color: '#0891b2', isText: true },
          { label: 'Utilidad Promedio', value: `${promedioUtilidad}%`, icon: TrendingUp, bg: '#dcfce7', color: '#16a34a' },
          { label: 'Sin Stock', value: sinStock, sub: `${articulos.length > 0 ? ((sinStock / articulos.length) * 100).toFixed(0) : 0}% del total`, icon: AlertTriangle, bg: '#fee2e2', color: '#dc2626', danger: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={s.color} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.2 }}>{s.label}</div>
                <div style={{ fontSize: (s as any).isText ? 13 : 16, fontWeight: 700, color: (s as any).danger ? '#dc2626' : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                  {s.value}
                  {s.sub && <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>· {s.sub}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros compactos (sm) */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Fila 1: pills de tipo (solo si hay servicios) + pills de etiqueta */}
        {(totalServicios > 0 || etiquetasDisponibles.lista.length > 0) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {totalServicios > 0 && [
              { val: 'todos', label: 'Todos', count: totalProductos + totalServicios },
              { val: 'producto', label: 'Productos', count: totalProductos },
              { val: 'servicio', label: 'Servicios', count: totalServicios },
            ].map(opt => {
              const active = filtroTipo === opt.val;
              return (
                <button key={opt.val} type="button" onClick={() => setFiltroTipo(opt.val as any)}
                  style={{
                    height: 26, padding: '0 10px', borderRadius: 6,
                    border: `1px solid ${active ? '#7c3aed' : '#e5e7eb'}`,
                    background: active ? '#7c3aed' : '#fff',
                    color: active ? '#fff' : '#374151',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  <span>{opt.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8, lineHeight: '15px',
                    background: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                    color: active ? '#fff' : '#6b7280',
                  }}>{opt.count}</span>
                </button>
              );
            })}

            {/* Separador si hay ambas filas */}
            {totalServicios > 0 && etiquetasDisponibles.lista.length > 0 && (
              <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
            )}

            {/* Pills de etiquetas (con color propio) */}
            {etiquetasDisponibles.lista.length > 0 && (
              <>
                <button type="button" onClick={() => setFiltroEtiqueta(null)}
                  style={{
                    height: 26, padding: '0 10px', borderRadius: 6,
                    border: `1px solid ${filtroEtiqueta === null ? '#7c3aed' : '#e5e7eb'}`,
                    background: filtroEtiqueta === null ? '#7c3aed' : '#fff',
                    color: filtroEtiqueta === null ? '#fff' : '#374151',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Todas etiquetas
                </button>
                {etiquetasDisponibles.lista.map(e => {
                  const active = filtroEtiqueta === e.id;
                  return (
                    <button key={e.id} type="button" onClick={() => setFiltroEtiqueta(active ? null : e.id)}
                      style={{
                        height: 26, padding: '0 10px', borderRadius: 6,
                        border: `1px solid ${active ? e.color : '#e5e7eb'}`,
                        background: active ? e.color : '#fff',
                        color: active ? '#fff' : '#374151',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : e.color }} />
                      <span>{e.nombre}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8, lineHeight: '15px',
                        background: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                        color: active ? '#fff' : '#6b7280',
                      }}>{e.count}</span>
                    </button>
                  );
                })}
                {etiquetasDisponibles.sinEtiqueta > 0 && (() => {
                  const active = filtroEtiqueta === 0;
                  return (
                    <button type="button" onClick={() => setFiltroEtiqueta(active ? null : 0)}
                      style={{
                        height: 26, padding: '0 10px', borderRadius: 6,
                        border: `1px dashed ${active ? '#9ca3af' : '#d1d5db'}`,
                        background: active ? '#9ca3af' : '#fff',
                        color: active ? '#fff' : '#6b7280',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      <span>Sin etiqueta</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8, lineHeight: '15px',
                        background: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                        color: active ? '#fff' : '#6b7280',
                      }}>{etiquetasDisponibles.sinEtiqueta}</span>
                    </button>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Fila 2: búsqueda + estado + botones (todos altura sm=28) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por código, nombre, categoría o proveedor..."
              value={busqueda}
              onChange={onFilterTextChange}
              style={{ width: '100%', height: 28, paddingLeft: 28, paddingRight: 10, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            style={{ height: 28, padding: '0 8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            <option value="Activos">Activos</option>
            <option value="Inactivos">Inactivos</option>
            <option value="Todos">Todos</option>
          </select>
          <button onClick={cargarArticulos} disabled={loading}
            style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refrescar
          </button>
          <button onClick={exportarExcel} disabled={loading || articulos.length === 0}
            title="Exporta el inventario a Excel (respeta filtros)"
            style={{ height: 28, padding: '0 12px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: loading ? 0.6 : 1 }}>
            <Download size={13} />
            Excel
          </button>
          <button onClick={() => setEditarModal({ isOpen: true, producto: null })}
            style={{ height: 28, padding: '0 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 340px)', minHeight: '380px' }}>
          <AgGridReact
            theme={myTheme}
            localeText={AG_GRID_LOCALE_ES}
            rowData={articulosOrdenados}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={busqueda}
            pagination={true}
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200]}
            animateRows={true}
            rowSelection={'single' as any}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            preventDefaultOnContextMenu={true}
            onCellContextMenu={(e: any) => {
              const ev = e.event as MouseEvent;
              if (!ev || !e.data) return;
              ev.preventDefault();
              setContextMenu({ x: ev.clientX, y: ev.clientY, articulo: e.data });
            }}
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

      {/* Menú contextual (click derecho) */}
      {contextMenu && (() => {
        const W = 220, H = 320;
        const x = Math.min(contextMenu.x, window.innerWidth - W - 8);
        const y = Math.min(contextMenu.y, window.innerHeight - H - 8);
        const Item = ({ icon: Icon, label, onClick, color, danger }: any) => (
          <button onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: danger ? '#dc2626' : '#1f2937', textAlign: 'left' as const }}
            onMouseEnter={e => (e.currentTarget.style.background = danger ? '#fee2e2' : '#f3e8ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon size={15} color={color || (danger ? '#dc2626' : '#6b7280')} />
            <span>{label}</span>
          </button>
        );
        const sep = <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />;
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div ref={menuRef}
              style={{ position: 'fixed', top: y, left: x, width: W, background: '#fff', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '6px 0', zIndex: 9999, fontFamily: 'inherit' }}>
              <div style={{ padding: '6px 14px 8px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>{contextMenu.articulo.Codigo}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contextMenu.articulo.Descripcion}>
                  {contextMenu.articulo.Descripcion}
                </div>
              </div>
              <Item icon={Edit2} label="Editar producto" color="#f59e0b"
                onClick={() => { setEditarModal({ isOpen: true, producto: contextMenu.articulo }); setContextMenu(null); }} />
              <Item icon={BarChart3} label="Ver kardex" color="#3b82f6"
                onClick={() => { setKardexModal({ isOpen: true, producto: contextMenu.articulo }); setContextMenu(null); }} />
              <Item icon={Info} label="Ver detalle / movimientos" color="#7c3aed"
                onClick={() => { setDetalleProducto(contextMenu.articulo.Items); setContextMenu(null); }} />
              {sep}
              <Item icon={Copy} label="Copiar código"
                onClick={() => copiar(contextMenu.articulo.Codigo, 'Código')} />
              <Item icon={FileText} label="Copiar nombre"
                onClick={() => copiar(contextMenu.articulo.Descripcion, 'Nombre')} />
              {sep}
              <Item icon={Trash2} label="Eliminar producto" danger
                onClick={() => eliminarProducto(contextMenu.articulo)} />
            </div>
          </>
        );
      })()}
    </div>
  );
}
