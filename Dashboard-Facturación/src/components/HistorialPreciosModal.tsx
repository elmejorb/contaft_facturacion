import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Package, DollarSign } from 'lucide-react';

// Modal que muestra el historial de compras (precios) de un producto específico.
// Se usa desde ComprasTabs / NuevaCompra para que el usuario detecte cambios
// de precio antes de aceptar una nueva compra.
//
// Datos vienen del endpoint /compras/historial-precios.php.

const API = 'http://localhost:80/conta-app-backend/api/compras/historial-precios.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '';
const fmtDelta = (d: number | null) => d === null ? '—' : (d > 0 ? '+' : '') + d.toFixed(1) + '%';

interface Compra {
  pedido_n: number;
  fecha: string;
  factura: string;
  codigo_pro: number;
  proveedor: string;
  cantidad: number;
  costo_unit: number;
  subtotal: number;
  delta_pct: number | null;
  delta_prom_pct: number | null;
}

interface Estadisticas {
  promedio: number;
  minimo: number;
  maximo: number;
  total_compras: number;
  primera_compra: string | null;
  ultima_compra: string | null;
}

interface Articulo { codigo: string; nombre: string }

interface Props {
  items: number;
  onClose: () => void;
}

export function HistorialPreciosModal({ items, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [stats, setStats] = useState<Estadisticas | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}?items=${items}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setArticulo(d.articulo);
          setCompras(d.compras);
          setStats(d.estadisticas);
        } else {
          setError(d.message || 'Error al cargar');
        }
      })
      .catch(() => setError('Error de red'))
      .finally(() => setLoading(false));
  }, [items]);

  // Color según variación: rojo=más caro, verde=más barato, gris=igual.
  const deltaColor = (d: number | null) => {
    if (d === null || d === 0) return { bg: '#f3f4f6', fg: '#6b7280', icon: Minus };
    if (d > 0) return { bg: '#fef2f2', fg: '#dc2626', icon: TrendingUp };
    return { bg: '#f0fdf4', fg: '#16a34a', icon: TrendingDown };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 900, maxWidth: '95vw', maxHeight: '90vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>Historial de Precios de Compra</div>
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

        {/* Estadísticas */}
        {stats && stats.total_compras > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
            padding: '12px 24px', borderBottom: '1px solid #f3f4f6', background: '#fafafa'
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Total Compras</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{stats.total_compras}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Precio Promedio</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{fmtMon(stats.promedio)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Mínimo</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{fmtMon(stats.minimo)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Máximo</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{fmtMon(stats.maximo)}</div>
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 24px' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
          )}

          {!loading && error && (
            <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && compras.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Package size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#9ca3af', fontSize: 14 }}>Este producto no tiene compras registradas todavía</div>
            </div>
          )}

          {!loading && !error && compras.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Fecha</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Pedido</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Factura</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Proveedor</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cant.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Costo Unit.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }} title="Variación vs compra anterior">vs Ant.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }} title="Variación vs promedio histórico">vs Prom.</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c, idx) => {
                  const cAnt = deltaColor(c.delta_pct);
                  const cProm = deltaColor(c.delta_prom_pct);
                  const IconAnt = cAnt.icon;
                  const IconProm = cProm.icon;
                  return (
                    <tr key={c.pedido_n} style={{
                      borderBottom: idx < compras.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: idx === 0 ? '#faf5ff' : undefined,
                    }}>
                      <td style={{ padding: '8px 10px' }}>{fmtFecha(c.fecha)}</td>
                      <td style={{ padding: '8px 10px', color: '#7c3aed', fontWeight: 600 }}>#{c.pedido_n}</td>
                      <td style={{ padding: '8px 10px', color: '#6b7280' }}>{c.factura || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#1f2937' }}>{c.proveedor}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{c.cantidad.toLocaleString('es-CO')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1f2937' }}>{fmtMon(c.costo_unit)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {c.delta_pct === null ? (
                          <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: cAnt.bg, color: cAnt.fg,
                          }}>
                            <IconAnt size={11} />{fmtDelta(c.delta_pct)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {c.delta_prom_pct === null ? (
                          <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: cProm.bg, color: cProm.fg,
                          }}>
                            <IconProm size={11} />{fmtDelta(c.delta_prom_pct)}
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

        {/* Footer */}
        <div style={{ padding: '10px 24px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
          <span>Costo unitario incluye IVA y flete prorrateado</span>
          <span>Últimas {compras.length} compras · Fila resaltada = más reciente</span>
        </div>
      </div>
    </div>
  );
}
