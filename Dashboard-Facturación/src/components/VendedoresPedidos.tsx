import { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Smartphone, RefreshCw, Filter, ArrowRight, Receipt, FileText, Eye, Ban, DollarSign, CreditCard, Package, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';
import { confirmar } from './ConfirmDialog';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

// Mismo tema que InventarioManagement — coherente en toda la app.
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

const API = 'http://localhost:80/conta-app-backend/api/vendedores/pedidos.php';
const API_VENDEDORES = 'http://localhost:80/conta-app-backend/api/vendedores/vendedores.php';

interface Pedido {
  id: number;
  numero_pedido: string;
  fecha: string;
  id_vendedor_remoto: number;
  nombre_vendedor: string;
  nombre_cliente: string;
  total: number | string;
  forma_pago: string;
  estado: string;
  tipo: 'pedido' | 'factura';
  cufe?: string | null;
  convertido_factura_n?: number;
}

interface ResumenVendedor {
  id_vendedor: number;
  nombre_vendedor: string;
  pedidos: number;
  facturas: number;
  total_contado: number;
  total_credito: number;
  total_otro: number;
  total_general: number;
}

interface VendedorOpcion {
  id: number;
  codigo: string;
  nombre: string;
}

interface Props {
  onNavigate?: (view: string) => void;
}

const fmt = (v: number | string) => '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO');

// Fecha local YYYY-MM-DD (no usar toISOString que devuelve UTC y resta un día)
const fechaLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const HOY = fechaLocal(new Date());

export function VendedoresPedidos({ onNavigate }: Props) {
  const { habilitado, pullAhora } = useVendedoresConfig();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [resumen, setResumen] = useState<ResumenVendedor[]>([]);
  const [vendedores, setVendedores] = useState<VendedorOpcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'pedido' | 'factura'>('todos');
  // Por defecto: HOY (cuadre del día)
  const [fechaDesde, setFechaDesde] = useState(HOY);
  const [fechaHasta, setFechaHasta] = useState(HOY);
  const [detalle, setDetalle] = useState<any>(null);

  const cargarVendedores = useCallback(async () => {
    try {
      const r = await fetch(API_VENDEDORES);
      const d = await r.json();
      if (d.success) {
        setVendedores((d.vendedores || []).map((v: any) => ({
          id: v.id, // tbl_vendedores_movil.id — coincide con id_vendedor_remoto de los pedidos
          codigo: v.codigo,
          nombre: v.nombre,
        })));
      }
    } catch (e) {}
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroVendedor) params.set('vendedor', filtroVendedor);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      const r = await fetch(`${API}?${params.toString()}`);
      const d = await r.json();
      if (d.success) {
        setPedidos(d.pedidos || []);
        setResumen(d.resumen || []);
      }
    } catch (e) {}
    setLoading(false);
  }, [filtroEstado, filtroVendedor, fechaDesde, fechaHasta]);

  useEffect(() => { cargarVendedores(); }, [cargarVendedores]);
  useEffect(() => { if (habilitado) cargar(); }, [habilitado, cargar]);

  const pedidosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return pedidos;
    return pedidos.filter(p => p.tipo === filtroTipo);
  }, [pedidos, filtroTipo]);

  const convertir = async (pedido: Pedido) => {
    const ok = await confirmar({
      title: 'Convertir pedido a factura',
      message: `¿Deseas facturar el pedido ${pedido.numero_pedido} de ${pedido.nombre_cliente} por ${fmt(pedido.total)}? Se abrirá la pantalla de Nueva Venta con los datos cargados para que confirmes y guardes.`,
      type: 'info',
      confirmText: 'Sí, facturar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    localStorage.setItem('pedido_para_venta_id', String(pedido.id));
    toast.success('Pedido cargado en pantalla de ventas');
    onNavigate?.('nueva-venta');
  };

  const anular = async (id: number) => {
    if (!await confirmar({ title: 'Anular pedido', message: '¿Anular este pedido?', type: 'danger', confirmText: 'Anular' })) return;
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Pedido anulado'); cargar(); }
    } catch (e) {}
  };

  const verDetalle = async (id: number) => {
    try {
      const r = await fetch(`${API}?id=${id}`);
      const d = await r.json();
      if (d.success) setDetalle(d.pedido);
    } catch (e) {}
  };

  // Atajos de fecha
  const setRango = (preset: 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo') => {
    const hoy = new Date();
    if (preset === 'hoy') {
      const f = fechaLocal(hoy);
      setFechaDesde(f); setFechaHasta(f);
    } else if (preset === 'ayer') {
      const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
      const f = fechaLocal(ayer);
      setFechaDesde(f); setFechaHasta(f);
    } else if (preset === 'semana') {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - 6);
      setFechaDesde(fechaLocal(ini)); setFechaHasta(fechaLocal(hoy));
    } else if (preset === 'mes') {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaDesde(fechaLocal(ini)); setFechaHasta(fechaLocal(hoy));
    } else {
      setFechaDesde(''); setFechaHasta('');
    }
  };

  const rangoActivo: string = useMemo(() => {
    if (fechaDesde === HOY && fechaHasta === HOY) return 'hoy';
    if (!fechaDesde && !fechaHasta) return 'todo';
    return '';
  }, [fechaDesde, fechaHasta]);

  const colDefs = [
    {
      field: 'tipo', headerName: 'Tipo', width: 95,
      cellRenderer: (p: any) => {
        const isFactura = p.value === 'factura';
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
            background: isFactura ? '#dcfce7' : '#fef3c7',
            color: isFactura ? '#15803d' : '#92400e',
          }}>
            {isFactura ? <FileText size={11} /> : <Receipt size={11} />}
            {isFactura ? 'Factura' : 'Pedido'}
          </span>
        );
      },
    },
    { field: 'fecha', headerName: 'Fecha', width: 105 },
    {
      field: 'numero_pedido', headerName: 'Nº', width: 110,
      cellStyle: { color: '#7c3aed', fontWeight: 600 },
    },
    { field: 'nombre_vendedor', headerName: 'Vendedor', width: 160, filter: true, cellStyle: { fontWeight: 500 } },
    { field: 'nombre_cliente', headerName: 'Cliente', flex: 1, minWidth: 200, filter: true, cellStyle: { fontWeight: 500 } },
    {
      field: 'total', headerName: 'Total', width: 120,
      type: 'numericColumn' as const,
      valueFormatter: (p: any) => fmt(p.value),
      cellStyle: { color: '#16a34a', fontWeight: 600 },
    },
    {
      field: 'forma_pago', headerName: 'Pago', width: 100,
      cellRenderer: (p: any) => {
        const v = (p.value || '').toLowerCase();
        if (!v) return <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>;
        const bg = v === 'contado' ? '#dcfce7' : v === 'credito' ? '#fee2e2' : '#f3f4f6';
        const color = v === 'contado' ? '#16a34a' : v === 'credito' ? '#dc2626' : '#6b7280';
        return <span style={{
          background: bg, color,
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
          textTransform: 'capitalize',
        }}>{v}</span>;
      },
    },
    {
      field: 'estado', headerName: 'Estado', width: 110,
      cellRenderer: (p: any) => {
        const v = (p.value || '').toLowerCase();
        if (!v) return <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>;
        const bg = v === 'pendiente' ? '#fef3c7' :
                   v === 'procesado' || v === 'autorizado' || v === 'enviado' ? '#dcfce7' :
                   v === 'anulado' || v === 'error' ? '#fee2e2' : '#f3f4f6';
        const color = v === 'pendiente' ? '#92400e' :
                      v === 'procesado' || v === 'autorizado' || v === 'enviado' ? '#16a34a' :
                      v === 'anulado' || v === 'error' ? '#dc2626' : '#6b7280';
        return <span style={{
          background: bg, color,
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
          textTransform: 'capitalize',
        }}>{v}</span>;
      },
    },
    {
      headerName: 'Acciones', width: 180, pinned: 'right' as any,
      sortable: false, filter: false,
      cellRenderer: (p: any) => {
        const btn = (color: string): React.CSSProperties => ({
          background: 'transparent', color, width: 30, height: 30,
          borderRadius: 6, border: `1.5px solid ${color}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        });
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: '100%' }}
            onMouseOver={(e) => {
              e.currentTarget.querySelectorAll('button').forEach(b => {
                b.addEventListener('mouseenter', () => { b.style.background = b.dataset.hc || ''; b.style.color = '#fff'; });
                b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; b.style.color = b.dataset.c || ''; });
              });
            }}
          >
            <button title={p.data.tipo === 'factura' ? 'Ver factura' : 'Ver pedido'}
              data-c="#7c3aed" data-hc="#7c3aed"
              onClick={() => verDetalle(p.data.id)}
              style={btn('#7c3aed')}>
              <Eye size={15} />
            </button>
            {p.data.tipo === 'pedido' && p.data.estado === 'pendiente' && (
              <>
                <button title="Convertir pedido a factura"
                  data-c="#16a34a" data-hc="#16a34a"
                  onClick={() => convertir(p.data)}
                  style={btn('#16a34a')}>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
                <button title="Anular pedido"
                  data-c="#ef4444" data-hc="#ef4444"
                  onClick={() => anular(p.data.id)}
                  style={btn('#ef4444')}>
                  <Ban size={15} />
                </button>
              </>
            )}
            {p.data.convertido_factura_n && (
              <span title="Factura creada a partir de este pedido"
                style={{
                  background: '#dcfce7', color: '#16a34a',
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                  marginLeft: 4,
                }}>
                ✓ FV-{p.data.convertido_factura_n}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // Totales globales (sobre lo que se ve filtrado por tipo también)
  const totales = useMemo(() => {
    const t = { count: pedidosFiltrados.length, contado: 0, credito: 0, otro: 0, total: 0, pedidos: 0, facturas: 0 };
    for (const r of pedidosFiltrados) {
      const monto = Number(r.total) || 0;
      const fp = (r.forma_pago || '').toLowerCase();
      if (fp === 'contado') t.contado += monto;
      else if (fp === 'credito') t.credito += monto;
      else t.otro += monto;
      t.total += monto;
      if (r.tipo === 'factura') t.facturas++; else t.pedidos++;
    }
    return t;
  }, [pedidosFiltrados]);

  const btnRapido = (label: string, key: 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo') => {
    const active = rangoActivo === key;
    return (
      <button onClick={() => setRango(key)}
        style={{
          height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: active ? '#7c3aed' : '#fff',
          color: active ? '#fff' : '#374151',
          border: active ? 'none' : '1px solid #d1d5db',
        }}>
        {label}
      </button>
    );
  };

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
        padding: '14px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            <Smartphone size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: 0.2 }}>
              Pedidos y Facturas de Campo
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
              Cuadre de lo que vendieron los vendedores desde la app móvil
            </p>
          </div>
        </div>
        <button onClick={async () => { const d = await pullAhora(); toast.success(d.message || 'Pull completado'); cargar(); }}
          style={{
            height: 38, padding: '0 16px',
            background: '#fff', color: '#7c3aed',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
        >
          <RefreshCw size={15} /> Descargar ahora
        </button>
      </div>

      {/* Atajos de rango de fecha */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Rango:</span>
        {btnRapido('Hoy', 'hoy')}
        {btnRapido('Ayer', 'ayer')}
        {btnRapido('Últimos 7 días', 'semana')}
        {btnRapido('Este mes', 'mes')}
        {btnRapido('Todo', 'todo')}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={14} color="#6b7280" />
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} title="Desde" />
        <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} title="Hasta" />

        <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', minWidth: 160 }}>
          <option value="">Todos los vendedores</option>
          {vendedores.map(v => (
            <option key={v.id} value={String(v.id)}>{v.codigo} — {v.nombre}</option>
          ))}
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          <option value="todos">Pedidos + Facturas</option>
          <option value="pedido">Solo pedidos</option>
          <option value="factura">Solo facturas</option>
        </select>

        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          <option value="">Cualquier estado</option>
          <option value="pendiente">Pendiente</option>
          <option value="procesado">Procesado</option>
          <option value="anulado">Anulado</option>
        </select>

        <button onClick={cargar} disabled={loading}
          style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          {loading ? 'Cargando...' : 'Filtrar'}
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL VENDIDO', value: fmt(totales.total), color: '#7c3aed', bg: '#f5f3ff', Icon: DollarSign },
          { label: 'CONTADO', value: fmt(totales.contado), color: '#16a34a', bg: '#f0fdf4', Icon: DollarSign },
          { label: 'CRÉDITO', value: fmt(totales.credito), color: '#dc2626', bg: '#fef2f2', Icon: CreditCard },
          { label: 'PEDIDOS', value: String(totales.pedidos), color: '#d97706', bg: '#fffbeb', Icon: Package },
          { label: 'FACTURAS', value: String(totales.facturas), color: '#0891b2', bg: '#ecfeff', Icon: FileText },
        ].map((c, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            borderLeft: `4px solid ${c.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 }}>{c.value}</div>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <c.Icon size={18} color={c.color} strokeWidth={2.2} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabla principal */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        marginBottom: 16, overflow: 'hidden',
      }}>
        {/* Header de la tabla */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: '#f5f3ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Package size={16} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'registro' : 'registros'}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {totales.pedidos} pedidos · {totales.facturas} facturas
              </div>
            </div>
          </div>
        </div>

        {pedidosFiltrados.length === 0 && !loading ? (
          <div style={{
            padding: '60px 20px', textAlign: 'center', color: '#9ca3af',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, background: '#f3f4f6',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Inbox size={36} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Sin pedidos en este rango
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Cuando los vendedores creen pedidos desde la app móvil aparecerán aquí.
            </div>
            <button
              onClick={async () => { const d = await pullAhora(); toast.success(d.message || 'Pull completado'); cargar(); }}
              style={{
                height: 36, padding: '0 18px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <RefreshCw size={14} /> Descargar ahora
            </button>
          </div>
        ) : (
          <div style={{ height: 460, padding: 8 }}>
            <AgGridReact
              theme={myTheme}
              rowData={pedidosFiltrados}
              columnDefs={colDefs as any}
              localeText={AG_GRID_LOCALE_ES}
              pagination
              paginationPageSize={20}
              paginationPageSizeSelector={[25, 50, 100]}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              animateRows
              rowSelection={'single' as any}
              enableCellTextSelection
              suppressCellFocus
              overlayNoRowsTemplate='<span style="padding:10px;color:#6b7280">Sin registros en este rango</span>'
              getRowStyle={(p: any) => {
                if (p.data?.estado === 'anulado') return { background: '#fef2f2', color: '#9ca3af' };
                return undefined;
              }}
            />
          </div>
        )}
      </div>

      {/* Cuadre por vendedor */}
      {resumen.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#374151' }}>Cuadre por vendedor</h3>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', textTransform: 'uppercase', fontSize: 10 }}>
                <th style={{ textAlign: 'left', padding: '8px 6px' }}>Vendedor</th>
                <th style={{ textAlign: 'right', padding: '8px 6px' }}>Pedidos</th>
                <th style={{ textAlign: 'right', padding: '8px 6px' }}>Facturas</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#16a34a' }}>Contado</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#dc2626' }}>Crédito</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#6b7280' }}>Otro</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7c3aed' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.id_vendedor} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 600 }}>{r.nombre_vendedor}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{r.pedidos}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>{r.facturas}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', color: '#16a34a', fontWeight: 600 }}>{fmt(r.total_contado)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', color: '#dc2626', fontWeight: 600 }}>{fmt(r.total_credito)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', color: '#6b7280' }}>{fmt(r.total_otro)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 6px', color: '#7c3aed', fontWeight: 800, fontSize: 13 }}>{fmt(r.total_general)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #d1d5db', background: '#f9fafb' }}>
                <td style={{ padding: '10px 6px', fontWeight: 800 }}>TOTAL</td>
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 800 }}>{resumen.reduce((s, r) => s + r.pedidos, 0)}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 800 }}>{resumen.reduce((s, r) => s + r.facturas, 0)}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px', color: '#16a34a', fontWeight: 800 }}>{fmt(resumen.reduce((s, r) => s + r.total_contado, 0))}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px', color: '#dc2626', fontWeight: 800 }}>{fmt(resumen.reduce((s, r) => s + r.total_credito, 0))}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px', color: '#6b7280', fontWeight: 800 }}>{fmt(resumen.reduce((s, r) => s + r.total_otro, 0))}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px', color: '#7c3aed', fontWeight: 900, fontSize: 14 }}>{fmt(resumen.reduce((s, r) => s + r.total_general, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDetalle(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 560, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
              {detalle.tipo === 'factura' ? 'Factura' : 'Pedido'} {detalle.numero_pedido}
            </h3>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <p><b>Vendedor:</b> {detalle.nombre_vendedor}</p>
              <p><b>Cliente:</b> {detalle.nombre_cliente} — {detalle.nit_cliente}</p>
              <p><b>Fecha:</b> {detalle.fecha}</p>
              <p><b>Forma de pago:</b> <span style={{ textTransform: 'capitalize' }}>{detalle.forma_pago}</span></p>
              <p><b>Estado:</b> <span style={{ textTransform: 'capitalize' }}>{detalle.estado}</span></p>
              {detalle.cufe && <p style={{ fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}><b>CUFE:</b> {detalle.cufe}</p>}
              {detalle.convertido_factura_n && <p><b>Convertido a:</b> FV-{detalle.convertido_factura_n}</p>}
            </div>
            {detalle.items && detalle.items.length > 0 && (
              <table style={{ width: '100%', marginTop: 12, fontSize: 13, borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }}>Producto</th>
                  <th style={{ textAlign: 'right' }}>Cant</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr></thead>
                <tbody>
                  {detalle.items.map((it: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 0' }}>{it.nombre_producto}</td>
                      <td style={{ textAlign: 'right' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(it.precio_unitario)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 15, fontWeight: 700 }}>
              Total: {fmt(detalle.total)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setDetalle(null)}
                style={{ height: 34, padding: '0 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
