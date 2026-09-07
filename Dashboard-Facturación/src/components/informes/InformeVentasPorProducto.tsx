import { useState, useRef } from 'react';
import { Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { InformeLayout, fmt, fmtCant } from './InformeLayout';
import { hoyLocal, inicioMesLocal } from '../../utils/fecha';

const API = 'http://localhost:80/conta-app-backend/api/informes/ventas-por-producto.php';
const API_BUSCAR = 'http://localhost:80/conta-app-backend/api/ventas/nueva.php';

interface LineaVenta {
  Factura_N: number;
  Fecha: string;
  TipoPedido: string;
  EstadoFact: string;
  Cliente: string;
  ClienteNit: string | null;
  Cantidad: number;
  PrecioUnitario: number;
  CostoUnitario: number;
  IvaPct: number;
  Descuento: number;
  Subtotal: number;
  Utilidad: number;
  DescripcionTemp: string;
}

export function InformeVentasPorProducto() {
  const [desde, setDesde] = useState(inicioMesLocal());
  const [hasta, setHasta] = useState(hoyLocal());
  const [busqueda, setBusqueda] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [producto, setProducto] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<any>(null);

  const buscar = (q: string) => {
    setBusqueda(q);
    if (q.length < 1) { setProdResults([]); setShowDrop(false); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`${API_BUSCAR}?buscar=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.success) { setProdResults(d.articulos); setShowDrop(true); }
    }, 200);
  };

  const seleccionar = (a: any) => {
    setProducto(a);
    setBusqueda(`${a.Codigo} — ${a.Nombres_Articulo}`);
    setShowDrop(false);
    setData(null);
  };

  const cargar = async () => {
    if (!producto) { toast.error('Seleccione un producto'); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams({
        items: String(producto.Items), desde, hasta, estado: 'Valida'
      });
      const r = await fetch(`${API}?${p}`);
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setData(d);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const inp: React.CSSProperties = { height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };

  const filtros = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', minWidth: 340 }}>
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3 }}>Producto</label>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: '#9ca3af' }} />
          <input value={busqueda} onChange={e => buscar(e.target.value)}
            placeholder="Código o nombre del producto..."
            style={{ ...inp, paddingLeft: 30, width: '100%' }} />
        </div>
        {showDrop && prodResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
            border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 240, overflowY: 'auto',
            zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: 4,
          }}>
            {prodResults.map((a: any) => (
              <div key={a.Items} onClick={() => seleccionar(a)}
                style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <span><strong style={{ color: '#7c3aed' }}>{a.Codigo}</strong> — {a.Nombres_Articulo}</span>
                <span style={{ color: '#6b7280' }}>Ex: {a.Existencia}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3 }}>Desde</label>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...inp, width: 140 }} />
      </div>
      <div>
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3 }}>Hasta</label>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...inp, width: 140 }} />
      </div>
      <button onClick={cargar} disabled={loading || !producto}
        style={{ height: 30, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: producto ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: producto ? 1 : 0.6 }}>
        Consultar
      </button>
    </div>
  );

  const t = data?.totales;
  const ventas: LineaVenta[] = data?.ventas || [];

  return (
    <InformeLayout
      titulo="Ventas por Producto"
      subtitulo={producto ? `${producto.Codigo} — ${producto.Nombres_Articulo}` : 'Seleccione un producto y un rango de fechas'}
      filtros={filtros}
      onRefresh={cargar}
      loading={loading}
    >
      {!data ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <Package size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <div>Elija un producto para ver todas sus ventas en el rango.</div>
        </div>
      ) : ventas.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin ventas de este producto en el rango.</div>
      ) : (
        <>
          {/* Resumen arriba de la tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
            <ResumenBox label="Facturas" valor={String(t.facturas)} color="#7c3aed" />
            <ResumenBox label="Unidades vendidas" valor={fmtCant(t.cantidad)} color="#0891b2" />
            <ResumenBox label="Venta bruta" valor={fmt(t.monto_bruto)} color="#16a34a" />
            <ResumenBox label="Costo" valor={fmt(t.costo_total)} color="#dc2626" />
            <ResumenBox label={`Utilidad (${t.margen_pct.toFixed(1)}%)`} valor={fmt(t.utilidad)} color="#f59e0b" />
          </div>

          {/* Tabla */}
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>N° Fact</th>
                <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>Cliente</th>
                <th style={{ padding: 6, textAlign: 'right', fontWeight: 600 }}>Cant.</th>
                <th style={{ padding: 6, textAlign: 'right', fontWeight: 600 }}>Precio Unit.</th>
                <th style={{ padding: 6, textAlign: 'right', fontWeight: 600 }}>Costo Unit.</th>
                <th style={{ padding: 6, textAlign: 'right', fontWeight: 600 }}>Subtotal</th>
                <th style={{ padding: 6, textAlign: 'right', fontWeight: 600 }}>Utilidad</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 5 }}>{l.Fecha ? new Date(l.Fecha).toLocaleDateString('es-CO') : ''}</td>
                  <td style={{ padding: 5, fontWeight: 600, color: '#7c3aed' }}>{l.Factura_N}</td>
                  <td style={{ padding: 5 }}>{l.TipoPedido}</td>
                  <td style={{ padding: 5 }}>{l.Cliente}</td>
                  <td style={{ padding: 5, textAlign: 'right', fontWeight: 600 }}>{fmtCant(l.Cantidad)}</td>
                  <td style={{ padding: 5, textAlign: 'right' }}>{fmt(l.PrecioUnitario)}</td>
                  <td style={{ padding: 5, textAlign: 'right', color: '#6b7280' }}>{fmt(l.CostoUnitario)}</td>
                  <td style={{ padding: 5, textAlign: 'right', fontWeight: 600 }}>{fmt(l.Subtotal)}</td>
                  <td style={{ padding: 5, textAlign: 'right', color: l.Utilidad >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(l.Utilidad)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#faf5ff', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: 6, textAlign: 'right' }}>TOTALES:</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{fmtCant(t.cantidad)}</td>
                <td style={{ padding: 6 }}></td>
                <td style={{ padding: 6, textAlign: 'right', color: '#6b7280' }}>{fmt(t.costo_total)}</td>
                <td style={{ padding: 6, textAlign: 'right', color: '#7c3aed' }}>{fmt(t.monto_bruto)}</td>
                <td style={{ padding: 6, textAlign: 'right', color: '#16a34a' }}>{fmt(t.utilidad)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </InformeLayout>
  );
}

function ResumenBox({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: 6, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{valor}</div>
    </div>
  );
}
