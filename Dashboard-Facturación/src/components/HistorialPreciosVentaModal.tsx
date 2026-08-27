import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Package, DollarSign, User } from 'lucide-react';

// Modal con historial de VENTAS (precios) de un producto.
// Espejo funcional de HistorialPreciosModal pero mirando tblventas en vez de
// tblpedidos. Sirve al vendedor para responder "¿a cómo se lo vendí antes?"
// y detectar precios anómalos antes de facturar de nuevo.

const API = 'http://localhost:80/conta-app-backend/api/ventas/historial-precios.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '';
const fmtDelta = (d: number | null) => d === null ? '—' : (d > 0 ? '+' : '') + d.toFixed(1) + '%';

interface Venta {
  factura_n: number;
  fecha: string;
  cliente_id: number;
  cliente: string;
  cantidad: number;
  precio_unit: number;
  descuento: number;
  subtotal: number;
  delta_pct: number | null;
  delta_prom_pct: number | null;
}

interface Estadisticas {
  promedio: number;
  minimo: number;
  maximo: number;
  total_ventas: number;
  primera_venta: string | null;
  ultima_venta: string | null;
}

interface Articulo { codigo: string; nombre: string }

interface Props {
  items: number;
  onClose: () => void;
}

export function HistorialPreciosVentaModal({ items, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [stats, setStats] = useState<Estadisticas | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}?items=${items}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setArticulo(d.articulo);
          setVentas(d.ventas);
          setStats(d.estadisticas);
        } else {
          setError(d.message || 'Error al cargar');
        }
      })
      .catch(() => setError('Error de red'))
      .finally(() => setLoading(false));
  }, [items]);

  // Para VENTA: rojo = más barato (peor margen), verde = más caro (mejor margen).
  // Invertido respecto a compras (donde subir es malo).
  const deltaColor = (d: number | null) => {
    if (d === null || d === 0) return { bg: '#f3f4f6', fg: '#6b7280', icon: Minus };
    if (d > 0) return { bg: '#f0fdf4', fg: '#16a34a', icon: TrendingUp };
    return { bg: '#fef2f2', fg: '#dc2626', icon: TrendingDown };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 900, maxWidth: '95vw', maxHeight: '90vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 24px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>Historial de Precios de Venta</div>
              {articulo && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  <span style={{ fontWeight: 700, color: '#7c3aed' }}>{articulo.codigo}</span> · {articulo.nombre}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {stats && stats.total_ventas > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
            padding: '12px 24px', borderBottom: '1px solid #f3f4f6', background: '#fafafa'
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Total Ventas</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{stats.total_ventas}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Precio Promedio</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{fmtMon(stats.promedio)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Mínimo</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{fmtMon(stats.minimo)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Máximo</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{fmtMon(stats.maximo)}</div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 24px' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
          )}

          {!loading && error && (
            <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && ventas.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Package size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#9ca3af', fontSize: 14 }}>Este producto no tiene ventas registradas todavía</div>
            </div>
          )}

          {!loading && !error && ventas.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Fecha</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Factura</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cliente</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cant.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Precio Unit.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }} title="Variación vs venta anterior">vs Ant.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }} title="Variación vs promedio histórico">vs Prom.</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, idx) => {
                  const cAnt = deltaColor(v.delta_pct);
                  const cProm = deltaColor(v.delta_prom_pct);
                  const IconAnt = cAnt.icon;
                  const IconProm = cProm.icon;
                  const esContado = v.cliente_id === 130500;
                  return (
                    <tr key={`${v.factura_n}-${idx}`} style={{
                      borderBottom: idx < ventas.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: idx === 0 ? '#faf5ff' : undefined,
                    }}>
                      <td style={{ padding: '8px 10px' }}>{fmtFecha(v.fecha)}</td>
                      <td style={{ padding: '8px 10px', color: '#7c3aed', fontWeight: 600 }}>#{v.factura_n}</td>
                      <td style={{ padding: '8px 10px', color: '#1f2937' }}>
                        {esContado ? (
                          <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Contado</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <User size={11} color="#7c3aed" /> {v.cliente}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{v.cantidad.toLocaleString('es-CO')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1f2937' }}>{fmtMon(v.precio_unit)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {v.delta_pct === null ? (
                          <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: cAnt.bg, color: cAnt.fg,
                          }}>
                            <IconAnt size={11} />{fmtDelta(v.delta_pct)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {v.delta_prom_pct === null ? (
                          <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: cProm.bg, color: cProm.fg,
                          }}>
                            <IconProm size={11} />{fmtDelta(v.delta_prom_pct)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '10px 24px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
          <span>Precio unitario sin descuento por línea</span>
          <span>Últimas {ventas.length} ventas · Fila resaltada = más reciente</span>
        </div>
      </div>
    </div>
  );
}
