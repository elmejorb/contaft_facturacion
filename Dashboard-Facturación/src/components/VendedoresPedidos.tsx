import { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Smartphone, RefreshCw, Filter, ArrowRight, Receipt, FileText, Eye, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';
import { confirmar } from './ConfirmDialog';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

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
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
            background: isFactura ? '#dcfce7' : '#fef3c7',
            color: isFactura ? '#15803d' : '#92400e',
          }}>
            {isFactura ? <FileText size={11} /> : <Receipt size={11} />}
            {isFactura ? 'FACTURA' : 'PEDIDO'}
          </span>
        );
      },
    },
    { field: 'fecha', headerName: 'Fecha', width: 105 },
    { field: 'numero_pedido', headerName: 'Nº', width: 105 },
    { field: 'nombre_vendedor', headerName: 'Vendedor', width: 150, filter: true },
    { field: 'nombre_cliente', headerName: 'Cliente', width: 180, filter: true },
    {
      field: 'total', headerName: 'Total', width: 115,
      type: 'numericColumn',
      valueFormatter: (p: any) => fmt(p.value),
      cellStyle: { fontWeight: 700, textAlign: 'right' },
    },
    {
      field: 'forma_pago', headerName: 'Pago', width: 100,
      cellRenderer: (p: any) => {
        const v = (p.value || '').toLowerCase();
        const color = v === 'contado' ? '#16a34a' : v === 'credito' ? '#dc2626' : '#6b7280';
        return <span style={{ color, fontWeight: 600, textTransform: 'capitalize' }}>{v || '—'}</span>;
      },
    },
    {
      field: 'estado', headerName: 'Estado', width: 110,
      cellRenderer: (p: any) => {
        const v = (p.value || '').toLowerCase();
        const color = v === 'pendiente' ? '#f59e0b' :
                      v === 'procesado' || v === 'autorizado' || v === 'enviado' ? '#16a34a' :
                      v === 'anulado' || v === 'error' ? '#dc2626' : '#6b7280';
        return <span style={{ color, fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>{p.value || '—'}</span>;
      },
    },
    {
      headerName: 'Acciones', width: 160, pinned: 'right' as any,
      cellRenderer: (p: any) => {
        const btnBase: React.CSSProperties = {
          width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
        };
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: '100%' }}>
            <button
              onClick={() => verDetalle(p.data.id)}
              title={p.data.tipo === 'factura' ? 'Ver factura' : 'Ver pedido'}
              style={{ ...btnBase, background: '#eff6ff', color: '#2563eb' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dbeafe'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#eff6ff'; }}
            >
              <Eye size={15} />
            </button>
            {p.data.tipo === 'pedido' && p.data.estado === 'pendiente' && (
              <>
                <button
                  onClick={() => convertir(p.data)}
                  title="Convertir pedido a factura (pedirá confirmación)"
                  style={{ ...btnBase, background: '#dcfce7', color: '#16a34a' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#bbf7d0'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#dcfce7'; }}
                >
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => anular(p.data.id)}
                  title="Anular pedido"
                  style={{ ...btnBase, background: '#fee2e2', color: '#dc2626' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fecaca'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                >
                  <Ban size={15} />
                </button>
              </>
            )}
            {p.data.convertido_factura_n && (
              <span title="Factura creada a partir de este pedido"
                style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>
                → FV-{p.data.convertido_factura_n}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={22} color="#7c3aed" />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pedidos y Facturas de Campo</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Cuadre de lo que vendieron los vendedores desde la app móvil</p>
          </div>
        </div>
        <button onClick={async () => { const d = await pullAhora(); toast.success(d.message || 'Pull completado'); cargar(); }}
          style={{ height: 34, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Descargar ahora
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'TOTAL VENDIDO', value: fmt(totales.total), color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'CONTADO', value: fmt(totales.contado), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'CRÉDITO', value: fmt(totales.credito), color: '#dc2626', bg: '#fef2f2' },
          { label: 'PEDIDOS', value: String(totales.pedidos), color: '#d97706', bg: '#fffbeb' },
          { label: 'FACTURAS', value: String(totales.facturas), color: '#0891b2', bg: '#ecfeff' },
        ].map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla principal */}
      <div style={{ height: 460, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 12, marginBottom: 16 }}>
        <AgGridReact
          rowData={pedidosFiltrados}
          columnDefs={colDefs as any}
          localeText={AG_GRID_LOCALE_ES}
          pagination
          paginationPageSize={20}
          defaultColDef={{ sortable: true, resizable: true }}
          rowHeight={36}
        />
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
