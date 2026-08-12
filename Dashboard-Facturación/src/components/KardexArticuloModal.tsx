import { useState, useEffect } from 'react';
import { X, BookOpen, ArrowUpCircle, ArrowDownCircle, Package } from 'lucide-react';

// Modal compacto de kardex por producto — para consulta rápida desde una venta
// o compra sin abrir el módulo Kardex completo. Solo lectura. Reservado a admin
// para no exponer costos al vendedor.

const API = 'http://localhost:80/conta-app-backend/api/inventario/kardex.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
const fmtCant = (v: number) => (v || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '';

interface KardexRow {
  Fecha: string;
  Detalle: string;
  Cantidad_Entrada: number;
  Costo_Entrada: number;
  Cantidad_Salida: number;
  Costo_Salida: number;
  Cantidad_Saldo: number;
  Costo_Saldo: number;
  Costo_Unitario: number;
}

interface Props {
  items: number;
  nombre?: string;
  codigo?: string;
  onClose: () => void;
}

export function KardexArticuloModal({ items, nombre, codigo, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<KardexRow[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState<number>(0);
  const meses = ['Todos', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  useEffect(() => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ items: String(items), anio: String(anio) });
    if (mes > 0) params.set('mes', String(mes));
    fetch(`${API}?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setRows(d.kardex || d.movimientos || []);
        else setError(d.message || 'Error al cargar');
      })
      .catch(() => setError('Error de red'))
      .finally(() => setLoading(false));
  }, [items, anio, mes]);

  // Resumen agregado (entradas / salidas del periodo mostrado)
  const totalEnt = rows.reduce((s, r) => s + (Number(r.Cantidad_Entrada) || 0), 0);
  const totalSal = rows.reduce((s, r) => s + (Number(r.Cantidad_Salida) || 0), 0);
  const saldoFinal = rows.length > 0 ? Number(rows[rows.length - 1].Cantidad_Saldo) || 0 : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 1000, maxWidth: '96vw', maxHeight: '92vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 24px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>Kardex del artículo</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {codigo && <span style={{ fontWeight: 700, color: '#7c3aed' }}>{codigo}</span>}
                {codigo && nombre ? ' · ' : ''}
                {nombre}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '10px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            style={{ height: 32, padding: '0 8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff' }}>
            {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 32, padding: '0 8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff' }}>
            {[0, 1, 2, 3].map(o => {
              const y = new Date().getFullYear() - o;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpCircle size={13} color="#16a34a" /> Entradas: <strong style={{ color: '#16a34a' }}>{fmtCant(totalEnt)}</strong>
          </span>
          <span style={{ fontSize: 11, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowDownCircle size={13} color="#dc2626" /> Salidas: <strong style={{ color: '#dc2626' }}>{fmtCant(totalSal)}</strong>
          </span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            Saldo final: <strong style={{ color: '#7c3aed' }}>{fmtCant(saldoFinal)}</strong>
          </span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {loading && <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>}
          {!loading && error && (
            <div style={{ margin: 20, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Package size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#9ca3af', fontSize: 14 }}>Sin movimientos en este período</div>
            </div>
          )}
          {!loading && !error && rows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Fecha</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Detalle</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cant. Ent.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Costo Ent.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cant. Sal.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Costo Sal.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#7c3aed', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>Saldo</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Costo Unit.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{fmtFecha(r.Fecha)}</td>
                    <td style={{ padding: '6px 10px', color: '#374151' }}>{r.Detalle}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#16a34a' }}>{r.Cantidad_Entrada ? fmtCant(r.Cantidad_Entrada) : '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{r.Costo_Entrada ? fmtMon(r.Costo_Entrada) : '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#dc2626' }}>{r.Cantidad_Salida ? fmtCant(r.Cantidad_Salida) : '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{r.Costo_Salida ? fmtMon(r.Costo_Salida) : '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>{fmtCant(r.Cantidad_Saldo)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtMon(r.Costo_Unitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '10px 24px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          Kardex informativo — para el detalle completo abrir el módulo Kardex desde Inventario
        </div>
      </div>
    </div>
  );
}
