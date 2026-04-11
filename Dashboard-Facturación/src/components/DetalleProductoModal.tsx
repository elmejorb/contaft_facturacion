import { useState, useEffect } from 'react';
import { X, ShoppingCart, TrendingUp, RotateCcw, BarChart3, Users, Package } from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/inventario/detalle-producto.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Props { items: number; onClose: () => void; }

export function DetalleProductoModal({ items, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(0); // 0 = todos
  const [tab, setTab] = useState('ventas');

  const cargar = async (a: number) => {
    setLoading(true);
    try {
      let url = `${API}?items=${items}&anio=${a}`;
      if (mes > 0) url += `&mes=${mes}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(anio); }, [items, anio, mes]);

  if (loading || !data) return null;

  const prod = data.producto;
  const res = data.resumen;
  const estadisticas = data.estadisticas || [];
  const maxCant = Math.max(...estadisticas.map((e: any) => e.cantidad), 1);

  const tabs = [
    { id: 'ventas', label: 'Ventas', icon: TrendingUp, count: data.ventas?.length },
    { id: 'compras', label: 'Compras', icon: ShoppingCart, count: data.compras?.length },
    { id: 'devoluciones', label: 'Devoluciones', icon: RotateCcw, count: data.devoluciones?.length },
    { id: 'estadistica', label: 'Estadística', icon: BarChart3 },
    { id: 'clientes', label: 'Clientes', icon: Users, count: data.clientes?.length },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: 800, height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={20} color="#7c3aed" />
              <div>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{prod.Nombres_Articulo}</span>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Código: {prod.Codigo} | {prod.Categoria} | {prod.Proveedor || '-'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
                style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
                {(data.anios?.length > 0 ? data.anios : [new Date().getFullYear()]).map((a: any) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
                style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
                <option value={0}>Todos los meses</option>
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Existencia', value: Math.round(parseFloat(prod.Existencia) || 0), color: '#7c3aed' },
              { label: `Vendidas ${anio}`, value: Math.round(res.total_ventas || 0), color: '#16a34a' },
              { label: 'Ventas $', value: fmtMon(res.total_ventas_monto || 0), color: '#2563eb', text: true },
              { label: 'Compradas', value: Math.round(res.total_compras || 0), color: '#d97706' },
              { label: 'Devueltas', value: Math.round(res.total_devoluciones || 0), color: '#dc2626' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '4px 10px', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: s.text ? 12 : 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', padding: '0 20px', flexShrink: 0 }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: 'none', borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 12, color: active ? '#7c3aed' : '#6b7280', fontWeight: active ? 600 : 400 }}>
                <Icon size={14} /> {t.label}
                {t.count !== undefined && <span style={{ fontSize: 10, opacity: 0.6 }}>({t.count})</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>

          {/* VENTAS */}
          {tab === 'ventas' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Factura</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '5px 8px', textAlign: 'center' }}>Tipo</th>
                <th style={{ padding: '5px 8px', textAlign: 'center' }}>Cant.</th>
                <th style={{ padding: '5px 8px', textAlign: 'right' }}>Precio</th>
                <th style={{ padding: '5px 8px', textAlign: 'right' }}>Subtotal</th>
              </tr></thead>
              <tbody>
                {(data.ventas || []).map((v: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px 8px', color: '#7c3aed', fontWeight: 600 }}>{v.Factura_N}</td>
                    <td style={{ padding: '4px 8px' }}>{new Date(v.Fecha).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '4px 8px', fontWeight: 500 }}>{v.Cliente}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10 }}>{v.Tipo}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{v.Cantidad}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtMon(parseFloat(v.PrecioV) || 0)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(parseFloat(v.Subtotal) || 0)}</td>
                  </tr>
                ))}
                {(!data.ventas || data.ventas.length === 0) && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Sin ventas en {anio}</td></tr>}
              </tbody>
            </table>
          )}

          {/* COMPRAS */}
          {tab === 'compras' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Pedido</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Factura</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Proveedor</th>
                <th style={{ padding: '5px 8px', textAlign: 'center' }}>Cant.</th>
                <th style={{ padding: '5px 8px', textAlign: 'right' }}>Costo</th>
              </tr></thead>
              <tbody>
                {(data.compras || []).map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px 8px', color: '#7c3aed', fontWeight: 600 }}>{c.Pedido_N}</td>
                    <td style={{ padding: '4px 8px' }}>{new Date(c.Fecha).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '4px 8px' }}>{c.FacturaCompra_N || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: 500 }}>{c.Proveedor || '-'}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{c.Cantidad}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtMon(parseFloat(c.PrecioC) || 0)}</td>
                  </tr>
                ))}
                {(!data.compras || data.compras.length === 0) && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Sin compras en {anio}</td></tr>}
              </tbody>
              <tfoot><tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: '6px 8px' }}>Total Compras</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{res.total_compras}</td>
                <td></td>
              </tr></tfoot>
            </table>
          )}

          {/* DEVOLUCIONES */}
          {tab === 'devoluciones' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Factura</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '5px 8px', textAlign: 'center' }}>Cant. Dev.</th>
                <th style={{ padding: '5px 8px', textAlign: 'right' }}>Valor</th>
              </tr></thead>
              <tbody>
                {(data.devoluciones || []).map((d: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px 8px', color: '#dc2626', fontWeight: 600 }}>{d.Factura_N}</td>
                    <td style={{ padding: '4px 8px' }}>{new Date(d.Fecha).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '4px 8px' }}>{d.Cliente}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{d.Dev}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#dc2626' }}>{fmtMon(parseFloat(d.valor_dev) || 0)}</td>
                  </tr>
                ))}
                {(!data.devoluciones || data.devoluciones.length === 0) && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Sin devoluciones en {anio}</td></tr>}
              </tbody>
            </table>
          )}

          {/* ESTADÍSTICA */}
          {tab === 'estadistica' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ventas mensuales {anio}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, padding: '0 10px' }}>
                {estadisticas.map((e: any) => {
                  const h = maxCant > 0 ? (e.cantidad / maxCant) * 180 : 0;
                  return (
                    <div key={e.mes} style={{ flex: 1, textAlign: 'center' }}>
                      {e.cantidad > 0 && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{Math.round(e.cantidad)}</div>
                      )}
                      {e.monto > 0 && (
                        <div style={{ fontSize: 8, color: '#6b7280', marginBottom: 2 }}>{fmtMon(e.monto)}</div>
                      )}
                      <div style={{ height: Math.max(h, 2), background: e.cantidad > 0 ? '#7c3aed' : '#e5e7eb', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{e.nombre}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, fontSize: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Mejor mes</div>
                  <div style={{ fontWeight: 700, color: '#7c3aed' }}>{estadisticas.reduce((a: any, b: any) => a.cantidad > b.cantidad ? a : b, { nombre: '-' }).nombre}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Promedio mensual</div>
                  <div style={{ fontWeight: 700 }}>{Math.round(res.total_ventas / Math.max(estadisticas.filter((e: any) => e.cantidad > 0).length, 1))} und.</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Meses activos</div>
                  <div style={{ fontWeight: 700 }}>{estadisticas.filter((e: any) => e.cantidad > 0).length} de 12</div>
                </div>
              </div>
            </div>
          )}

          {/* CLIENTES */}
          {tab === 'clientes' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '5px 8px', textAlign: 'center' }}>Veces</th>
                <th style={{ padding: '5px 8px', textAlign: 'center' }}>Cantidad</th>
                <th style={{ padding: '5px 8px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Última compra</th>
              </tr></thead>
              <tbody>
                {(data.clientes || []).map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px 8px', color: '#7c3aed', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '4px 8px', fontWeight: 500 }}>{c.Cliente}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>{c.veces_comprado}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{Math.round(parseFloat(c.total_cantidad))}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{fmtMon(parseFloat(c.total_monto) || 0)}</td>
                    <td style={{ padding: '4px 8px', fontSize: 11 }}>{c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('es-CO') : '-'}</td>
                  </tr>
                ))}
                {(!data.clientes || data.clientes.length === 0) && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Sin clientes en {anio}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
