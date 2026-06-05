import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Smartphone, RefreshCw, CheckCircle, XCircle, Eye, Filter, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';
import { confirmar } from './ConfirmDialog';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/vendedores/pedidos.php';

interface Pedido {
  id: number;
  numero_pedido: string;
  fecha: string;
  nombre_vendedor: string;
  nombre_cliente: string;
  total: number;
  forma_pago: string;
  estado: string;
  convertido_factura_n?: number;
}

interface Props {
  onNavigate?: (view: string) => void;
}

export function VendedoresPedidos({ onNavigate }: Props) {
  const { config, habilitado, pullAhora, refetch } = useVendedoresConfig();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [detalle, setDetalle] = useState<any>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}?pagina=1&estado=${filtroEstado}`;
      if (filtroVendedor) url += `&vendedor=${encodeURIComponent(filtroVendedor)}`;
      if (fechaDesde) url += `&fecha_desde=${fechaDesde}`;
      if (fechaHasta) url += `&fecha_hasta=${fechaHasta}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) setPedidos(d.pedidos || []);
    } catch (e) {}
    setLoading(false);
  }, [filtroEstado, filtroVendedor, fechaDesde, fechaHasta]);

  useEffect(() => { if (habilitado) cargar(); }, [habilitado, cargar]);

  const convertir = (pedido: Pedido) => {
    // Guardar ID del pedido en localStorage para que NuevaVenta lo cargue
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

  const colDefs = [
    { field: 'fecha', headerName: 'Fecha', width: 100 },
    { field: 'numero_pedido', headerName: 'Pedido #', width: 110 },
    { field: 'nombre_vendedor', headerName: 'Vendedor', width: 150 },
    { field: 'nombre_cliente', headerName: 'Cliente', width: 160 },
    {
      field: 'total', headerName: 'Total', width: 110,
      valueFormatter: (p: any) => '$ ' + Math.round(p.value).toLocaleString('es-CO'),
    },
    { field: 'forma_pago', headerName: 'Pago', width: 90 },
    {
      field: 'estado', headerName: 'Estado', width: 100,
      cellRenderer: (p: any) => {
        const color = p.value === 'pendiente' ? '#f59e0b' : p.value === 'procesado' ? '#16a34a' : '#dc2626';
        return <span style={{ color, fontWeight: 600, fontSize: 12 }}>{p.value}</span>;
      },
    },
    {
      headerName: 'Acciones', width: 220,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => verDetalle(p.data.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 12 }}>Ver</button>
          {p.data.estado === 'pendiente' && (
            <>
              <button onClick={() => convertir(p.data)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                <ArrowRight size={12} /> Facturar
              </button>
              <button onClick={() => anular(p.data.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}>Anular</button>
            </>
          )}
          {p.data.convertido_factura_n && (
            <span style={{ fontSize: 10, color: '#6b7280' }}>→ FV-{p.data.convertido_factura_n}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={22} color="#7c3aed" />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pedidos de Campo</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Ventas creadas por vendedores desde la app móvil</p>
          </div>
        </div>
        <button onClick={async () => { const d = await pullAhora(); toast.success(d.message || 'Pull completado'); cargar(); }}
          style={{ height: 34, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Descargar ahora
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={14} color="#6b7280" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="procesado">Procesado</option>
          <option value="anulado">Anulado</option>
        </select>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} />
        <button onClick={cargar} style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Filtrar</button>
      </div>

      <div style={{ height: 500, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 12 }}>
        <AgGridReact rowData={pedidos} columnDefs={colDefs as any} pagination pageSize={20} />
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDetalle(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 520, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Pedido {detalle.numero_pedido}</h3>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <p><b>Vendedor:</b> {detalle.nombre_vendedor}</p>
              <p><b>Cliente:</b> {detalle.nombre_cliente} — {detalle.nit_cliente}</p>
              <p><b>Fecha:</b> {detalle.fecha}</p>
              <p><b>Forma de pago:</b> {detalle.forma_pago}</p>
              <p><b>Estado:</b> {detalle.estado}</p>
              {detalle.convertido_factura_n && <p><b>Convertido a:</b> FV-{detalle.convertido_factura_n}</p>}
            </div>
            <table style={{ width: '100%', marginTop: 12, fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '6px 0' }}>Producto</th><th style={{ textAlign: 'right' }}>Cant</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {(detalle.items || []).map((it: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 0' }}>{it.nombre_producto}</td>
                    <td style={{ textAlign: 'right' }}>{it.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>$ {Math.round(it.precio_unitario).toLocaleString('es-CO')}</td>
                    <td style={{ textAlign: 'right' }}>$ {Math.round(it.total).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 15, fontWeight: 700 }}>
              Total: $ {Math.round(detalle.total).toLocaleString('es-CO')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setDetalle(null)} style={{ height: 34, padding: '0 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
