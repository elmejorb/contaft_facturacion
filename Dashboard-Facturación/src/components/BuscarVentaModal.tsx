import { useState, useEffect } from 'react';
import { X, Search, FileText, ArrowRight, Package, User } from 'lucide-react';

// Modal para buscar y abrir una venta existente sin salir del contexto actual.
// Espejo funcional de BuscarCompraModal — al seleccionar una factura, se pasa
// el Factura_N al padre que decide qué hacer (típicamente abrir el modal de
// detalle de la venta o cargarla en un tab nuevo de solo lectura).
//
// Filtros: por mes/año + búsqueda libre (# factura, nombre cliente, NIT).
// Si se recibe `soloClienteId`, se filtran solo ventas de ese cliente.

const API = 'http://localhost:80/conta-app-backend/api/ventas/listar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-CO') : '';

interface Venta {
  Factura_N: number;
  Fecha: string;
  A_nombre: string;
  Identificacion: string;
  CodigoCli: number;
  Tipo: string;
  Total: number;
  EstadoFact: string;
}

interface Props {
  onClose: () => void;
  onAbrir: (facturaN: number) => void;
  soloClienteId?: number;      // Filtrar solo por un cliente
  soloClienteNombre?: string;  // Nombre para mostrar en el título
}

export function BuscarVentaModal({ onClose, onAbrir, soloClienteId, soloClienteNombre }: Props) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const meses = ['Todos', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('anio', String(anio));
    if (mes > 0) params.set('mes', String(mes));
    if (soloClienteId && soloClienteId !== 130500) params.set('cliente', String(soloClienteId));
    // Sin JOIN a saldo — más rápido y no lo necesitamos aquí.
    params.set('con_saldo', '0');
    params.set('estado', 'Todas');
    fetch(`${API}?${params.toString()}`)
      .then(r => r.json())
      .then(d => { if (d.success) setVentas(d.facturas || d.ventas || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [anio, mes, soloClienteId]);

  const filtro = busqueda.toLowerCase();
  const filtradas = filtro
    ? ventas.filter(v =>
        String(v.Factura_N).includes(filtro) ||
        (v.A_nombre || '').toLowerCase().includes(filtro) ||
        (v.Identificacion || '').toLowerCase().includes(filtro))
    : ventas;
  const total = filtradas.reduce((s, v) => s + (Number(v.Total) || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 800, maxWidth: '95vw', maxHeight: '85vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 24px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>Buscar Venta</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {soloClienteNombre && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8, padding: '1px 8px', background: '#f3e8ff', color: '#7c3aed', borderRadius: 10, fontWeight: 600 }}>
                  <User size={11} /> {soloClienteNombre}
                </span>
              )}
              {filtradas.length} de {ventas.length} · Total: <span style={{ fontWeight: 700, color: '#7c3aed' }}>{fmtMon(total)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '10px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" placeholder="Buscar por factura, cliente o NIT..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus
              style={{ width: '100%', height: 34, paddingLeft: 34, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
          </div>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            style={{ height: 34, padding: '0 8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff' }}>
            <option value={0}>Todos los meses</option>
            {meses.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 34, padding: '0 8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff' }}>
            {[0, 1, 2, 3].map(o => {
              const y = new Date().getFullYear() - o;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Package size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#9ca3af', fontSize: 14 }}>
                {ventas.length === 0 ? 'No hay ventas en este período' : 'Sin resultados para esta búsqueda'}
              </div>
            </div>
          ) : (
            filtradas.map(v => {
              const anulada = v.EstadoFact === 'Anulada';
              return (
                <div key={v.Factura_N} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', margin: '0 8px',
                  borderRadius: 10, cursor: 'pointer', opacity: anulada ? 0.55 : 1,
                }}
                  onClick={() => onAbrir(v.Factura_N)}
                  onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: anulada ? '#fee2e2' : v.Tipo === 'Contado' ? '#f0fdf4' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} color={anulada ? '#dc2626' : v.Tipo === 'Contado' ? '#16a34a' : '#d97706'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>#{v.Factura_N}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{v.A_nombre || 'Sin cliente'}</span>
                      {v.Identificacion && v.Identificacion !== '0' && <span style={{ fontSize: 11, color: '#6b7280' }}>NIT {v.Identificacion}</span>}
                      {anulada && <span style={{ padding: '1px 6px', borderRadius: 4, background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700 }}>ANULADA</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {fmtFecha(v.Fecha)} · {v.Tipo || '-'}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', flexShrink: 0, minWidth: 100, textAlign: 'right' }}>
                    {fmtMon(Number(v.Total) || 0)}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onAbrir(v.Factura_N); }}
                    style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRight size={13} /> Ver detalle
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
