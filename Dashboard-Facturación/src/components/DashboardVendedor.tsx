import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Receipt, TrendingUp, Clock } from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/ventas/listar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Props { user: any; }

export function DashboardVendedor({ user }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const hoy = new Date();
      const r = await fetch(`${API}?anio=${hoy.getFullYear()}&mes=${hoy.getMonth() + 1}&estado=Valida`);
      const d = await r.json();
      if (d.success) setVentas(d.ventas || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = ventas.filter(v => v.Fecha && v.Fecha.startsWith(hoy));
  const totalHoy = ventasHoy.reduce((s, v) => s + (parseFloat(v.Total) || 0), 0);
  const contadoHoy = ventasHoy.filter(v => v.Tipo === 'Contado').reduce((s, v) => s + (parseFloat(v.Total) || 0), 0);
  const creditoHoy = ventasHoy.filter(v => v.Tipo !== 'Contado').reduce((s, v) => s + (parseFloat(v.Total) || 0), 0);
  const totalMes = ventas.reduce((s, v) => s + (parseFloat(v.Total) || 0), 0);

  const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const fechaStr = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Saludo */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1f2937', margin: 0 }}>
          Hola, {user?.nombre || user?.username || 'Vendedor'}
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0', textTransform: 'capitalize' }}>
          {fechaStr} — {hora}
        </p>
      </div>

      {/* Stats del día */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Ventas Hoy', value: ventasHoy.length, icon: ShoppingCart, color: '#7c3aed', bg: '#f3e8ff' },
          { label: 'Total Hoy', value: fmtMon(totalHoy), icon: DollarSign, color: '#16a34a', bg: '#dcfce7', text: true },
          { label: 'Contado', value: fmtMon(contadoHoy), icon: Receipt, color: '#2563eb', bg: '#dbeafe', text: true },
          { label: 'Crédito', value: fmtMon(creditoHoy), icon: TrendingUp, color: '#d97706', bg: '#fef3c7', text: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={s.color} />
                </div>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: s.text ? 18 : 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Ventas del mes */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Total del Mes</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{fmtMon(totalMes)}</span>
        </div>
        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3 }}>
          <div style={{ height: '100%', background: '#7c3aed', borderRadius: 3, width: `${Math.min((ventas.length / 100) * 100, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{ventas.length} facturas en el mes</div>
      </div>

      {/* Últimas ventas del día */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>
          Mis Ventas de Hoy ({ventasHoy.length})
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Cargando...</div>
        ) : ventasHoy.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
            <ShoppingCart size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>Sin ventas hoy</div>
            <div style={{ fontSize: 12 }}>Las ventas que realices aparecerán aquí</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Factura</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Hora</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Cliente</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Items</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventasHoy.slice(0, 20).map((v: any) => (
                <tr key={v.Factura_N} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '5px 8px', color: '#7c3aed', fontWeight: 700 }}>{v.Factura_N}</td>
                  <td style={{ padding: '5px 8px', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {v.Hora || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '5px 8px', fontWeight: 500 }}>{v.A_nombre}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: v.Tipo === 'Contado' ? '#dcfce7' : '#dbeafe',
                      color: v.Tipo === 'Contado' ? '#16a34a' : '#2563eb'
                    }}>{v.Tipo}</span>
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>{v.Total_Items}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmtMon(parseFloat(v.Total) || 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1f2937' }}>
                <td colSpan={5} style={{ padding: '8px', fontWeight: 800, fontSize: 14 }}>Total del Día</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#16a34a' }}>{fmtMon(totalHoy)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
