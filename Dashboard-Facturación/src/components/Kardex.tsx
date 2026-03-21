import { useState, useEffect } from 'react';
import { X, Search, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface KardexMovimiento {
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

interface Producto {
  Items: number;
  Codigo: string;
  Descripcion: string;
  Nombres_Articulo?: string;
  Existencia: number;
}

interface KardexProps {
  isOpen: boolean;
  onClose: () => void;
  producto: Producto | null;
}

const meses = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export function Kardex({ isOpen, onClose, producto }: KardexProps) {
  const [kardex, setKardex] = useState<KardexMovimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'mes' | 'rango'>('mes');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    if (isOpen && producto) cargarKardex();
  }, [isOpen, producto, filtroTipo, mes, anio, fechaInicio, fechaFin]);

  const cargarKardex = async () => {
    if (!producto) return;
    try {
      setLoading(true); setError(null);
      const params: any = { items: producto.Items };
      if (filtroTipo === 'mes') { params.mes = mes; params.anio = anio; }
      else { params.fecha_inicio = fechaInicio; params.fecha_fin = fechaFin; }
      const response = await api.get('/inventario/kardex.php', { params });
      setKardex(response.data.kardex || []);
    } catch { setError('Error al cargar el kardex'); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => {
    if (!v || v === 0) return '$ 0';
    return '$ ' + Math.round(v).toLocaleString('es-CO');
  };

  const fmtCant = (v: number) => {
    if (!v || v === 0) return '0';
    const num = parseFloat(String(v));
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  const fmtFecha = (f: string) => new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (!isOpen) return null;

  const s = {
    overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' },
    modal: { position: 'relative' as const, background: '#fff', borderRadius: 12, width: '95%', maxWidth: 1050, height: '70vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
    header: { background: 'linear-gradient(135deg, rgb(17,28,67), #1e3a5f)', padding: '12px 20px' },
    badge: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, marginRight: 8 },
    select: { height: 30, padding: '0 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', outline: 'none' },
    btn: { height: 30, padding: '0 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 },
    th: { padding: '8px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, whiteSpace: 'nowrap' as const },
    td: { padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap' as const },
  };

  return (
    <div style={s.overlay}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Kardex de Producto</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ ...s.badge, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  Código: {producto?.Codigo}
                </span>
                <span style={{ ...s.badge, background: 'rgba(255,255,255,0.15)', color: '#fff', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {producto?.Nombres_Articulo || producto?.Descripcion}
                </span>
                <span style={{ ...s.badge, background: '#7c3aed', color: '#fff' }}>
                  Existencia: {Math.round(producto?.Existencia || 0)}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                <input type="radio" name="filtroKardex" checked={filtroTipo === 'mes'} onChange={() => setFiltroTipo('mes')} style={{ accentColor: '#7c3aed' }} />
                Por Mes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                <input type="radio" name="filtroKardex" checked={filtroTipo === 'rango'} onChange={() => setFiltroTipo('rango')} style={{ accentColor: '#7c3aed' }} />
                Rango
              </label>
            </div>

            {filtroTipo === 'mes' ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Mes:</span>
                <select value={mes} onChange={e => setMes(Number(e.target.value))} style={s.select}>
                  {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Año:</span>
                <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={s.select}>
                  {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Desde:</span>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ ...s.select, width: 130 }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Hasta:</span>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ ...s.select, width: 130 }} />
              </div>
            )}

            <button onClick={cargarKardex} style={{ ...s.btn, background: '#7c3aed', color: '#fff' }}>
              <Search size={14} /> Buscar
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <RefreshCw size={32} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#6b7280', marginTop: 12, fontSize: 13 }}>Cargando kardex...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#dc2626', marginBottom: 12, fontSize: 13 }}>{error}</p>
              <button onClick={cargarKardex} style={{ ...s.btn, background: '#fff', color: '#374151', border: '1px solid #d1d5db' }}>Reintentar</button>
            </div>
          ) : (
            <div style={{ overflow: 'auto', height: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: 'rgb(17,28,67)', color: '#fff', position: 'sticky' as const, top: 0, zIndex: 1 }}>
                    <th style={{ ...s.th, textAlign: 'center', width: 85 }}>Fecha</th>
                    <th style={{ ...s.th, textAlign: 'left', minWidth: 200 }}>Detalle</th>
                    <th style={{ ...s.th, textAlign: 'center', width: 75 }}>Cant. Ent.</th>
                    <th style={{ ...s.th, textAlign: 'right', width: 95 }}>Cost. Ent.</th>
                    <th style={{ ...s.th, textAlign: 'center', width: 75 }}>Cant. Sal.</th>
                    <th style={{ ...s.th, textAlign: 'right', width: 95 }}>Cost. Sal.</th>
                    <th style={{ ...s.th, textAlign: 'center', width: 80, background: '#312e81' }}>Saldo</th>
                    <th style={{ ...s.th, textAlign: 'right', width: 95, background: '#312e81' }}>Cost. Saldo</th>
                    <th style={{ ...s.th, textAlign: 'right', width: 95 }}>Cost. Unit.</th>
                  </tr>
                </thead>
                <tbody>
                  {kardex.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                        No hay movimientos en el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    kardex.map((mov, index) => {
                      const esInicial = mov.Detalle?.toLowerCase().includes('inventario inicial');
                      let hayDescuadre = false;
                      if (!esInicial && index > 0) {
                        const saldoAnt = parseFloat(String(kardex[index - 1].Cantidad_Saldo || 0));
                        const ent = parseFloat(String(mov.Cantidad_Entrada || 0));
                        const sal = parseFloat(String(mov.Cantidad_Salida || 0));
                        hayDescuadre = Math.abs((saldoAnt + ent - sal) - parseFloat(String(mov.Cantidad_Saldo || 0))) > 0.01;
                      }

                      return (
                        <tr key={index} style={{
                          background: esInicial ? '#f0fdf4' : index % 2 === 1 ? '#f9fafb' : '#fff',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                        onMouseEnter={e => { if (!esInicial) (e.currentTarget as HTMLElement).style.background = '#faf5ff'; }}
                        onMouseLeave={e => { if (!esInicial) (e.currentTarget as HTMLElement).style.background = index % 2 === 1 ? '#f9fafb' : '#fff'; }}
                        >
                          <td style={{ ...s.td, textAlign: 'center', color: '#7c3aed', fontWeight: 500 }}>{fmtFecha(mov.Fecha)}</td>
                          <td style={{ ...s.td, fontWeight: 500, color: '#111827' }}>{mov.Detalle}</td>
                          <td style={{ ...s.td, textAlign: 'center', fontFamily: 'monospace' }}>{fmtCant(mov.Cantidad_Entrada)}</td>
                          <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{fmt(mov.Costo_Entrada)}</td>
                          <td style={{ ...s.td, textAlign: 'center', fontFamily: 'monospace' }}>{fmtCant(mov.Cantidad_Salida)}</td>
                          <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{fmt(mov.Costo_Salida)}</td>
                          <td style={{
                            ...s.td, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700,
                            background: hayDescuadre ? '#fee2e2' : '#f3e8ff',
                            color: hayDescuadre ? '#dc2626' : '#7c3aed',
                          }}>{fmtCant(mov.Cantidad_Saldo)}</td>
                          <td style={{
                            ...s.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700,
                            background: hayDescuadre ? '#fee2e2' : '#f3e8ff',
                            color: hayDescuadre ? '#dc2626' : '#7c3aed',
                          }}>{fmt(mov.Costo_Saldo)}</td>
                          <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{fmt(mov.Costo_Unitario)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            <strong style={{ color: '#7c3aed' }}>{kardex.length}</strong> movimientos
          </span>
          <button onClick={onClose} style={{ ...s.btn, background: '#fff', color: '#374151', border: '1px solid #d1d5db' }}>
            Cerrar
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
