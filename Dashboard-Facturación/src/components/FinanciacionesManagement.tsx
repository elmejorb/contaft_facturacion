import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Eye, Ban, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { NuevaFinanciacion } from './NuevaFinanciacion';
import { DetalleFinanciacion } from './DetalleFinanciacion';
import { useAuth } from '../contexts/AuthContext';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/financiaciones/';
const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const fmtDate = (s: string | null) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO') : '-';

/**
 * Módulo Financiaciones — vista principal con 3 estados:
 *  - listado (default)
 *  - creando (NuevaFinanciacion)
 *  - viendo (DetalleFinanciacion)
 *
 * Requiere permiso `financiaciones` para entrar; `financiaciones_editar`
 * para el botón "Nueva". El módulo solo aparece si
 * tbldatosempresa.modulo_financiaciones = 1 (control en Dashboard).
 */
export function FinanciacionesManagement() {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const permisos: string[] = (user as any)?.permisos || [];
  const puedeEditar = esAdmin || permisos.includes('financiaciones_editar');

  const [vista, setVista] = useState<'listado' | 'nueva' | 'detalle'>('listado');
  const [idSelected, setIdSelected] = useState<number | null>(null);

  const [financs, setFinancs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(0);
  const [estado, setEstado] = useState('Activa');
  const [busqueda, setBusqueda] = useState('');
  const [anios, setAnios] = useState<number[]>([]);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?listar=1&anio=${anio}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (estado) url += `&estado=${estado}`;
      if (busqueda) url += `&q=${encodeURIComponent(busqueda)}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setFinancs(d.financiaciones || []); setAnios(d.anios || []); }
    } catch { toast.error('Error cargando financiaciones'); }
    setLoading(false);
  };

  useEffect(() => {
    if (vista === 'listado') {
      const t = setTimeout(cargar, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [vista, anio, mes, estado, busqueda]);

  const abrirDetalle = (id: number) => { setIdSelected(id); setVista('detalle'); };

  const anular = async (f: any) => {
    if (f.cuotas_pagadas > 0) {
      toast.error('No se puede anular: la financiación tiene pagos registrados. Anule primero cada pago.', { duration: 6000 });
      return;
    }
    const ok = await confirmar({
      title: 'Anular financiación',
      message: `¿Anular la financiación ${f.Consecutivo} de ${f.cliente_nombre}?\n\nMonto: ${fmt(Number(f.MontoFinanciado))}`,
      type: 'danger',
      confirmText: 'Sí, anular',
    });
    if (!ok) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id_financiacion: f.Id_Financiacion }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
  };

  // ---- Rutas internas ----
  if (vista === 'nueva' && puedeEditar) {
    return (
      <NuevaFinanciacion
        onCreada={(id) => { setIdSelected(id); setVista('detalle'); }}
        onCancelar={() => setVista('listado')}
      />
    );
  }
  if (vista === 'detalle' && idSelected !== null) {
    return (
      <DetalleFinanciacion
        id={idSelected}
        onVolver={() => { setVista('listado'); setIdSelected(null); }}
      />
    );
  }

  // ---- Listado ----
  const meses = ['Todos','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const totalSaldo = financs.reduce((s, f) => s + Number(f.saldo_pendiente || 0), 0);
  const totalVencidas = financs.filter(f => f.cuotas_vencidas > 0).length;

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Financiaciones</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Cronograma de cuotas y cobros por cliente</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#eff6ff', padding: '6px 12px', borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Cartera</span>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb' }}>{fmt(totalSaldo)}</div>
          </div>
          {totalVencidas > 0 && (
            <div style={{ background: '#fef2f2', padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5' }}>
              <span style={{ fontSize: 10, color: '#991b1b', fontWeight: 600 }}>EN MORA</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={13} /> {totalVencidas}
              </div>
            </div>
          )}
          {puedeEditar && (
            <button onClick={() => setVista('nueva')}
              style={{ height: 34, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={14} /> Nueva Financiación
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, background: '#fff', padding: '8px 12px', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ ...inp, width: 80 }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ ...inp, width: 90 }}>
          {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inp, width: 110 }}>
          <option value="">Todas</option>
          <option value="Activa">Activas</option>
          <option value="Pagada">Pagadas</option>
          <option value="Anulada">Anuladas</option>
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar cliente, NIT o consecutivo..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...inp, width: '100%', paddingLeft: 28 }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={cargar}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Refrescar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Loader2 size={24} className="animate-spin" style={{ marginBottom: 6 }} /><br />Cargando…
          </div>
        ) : financs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin financiaciones para mostrar</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={th}>Consecutivo</th>
                <th style={th}>Fecha</th>
                <th style={th}>Cliente</th>
                <th style={th}>Descripción</th>
                <th style={{ ...th, textAlign: 'right' }}>Monto</th>
                <th style={{ ...th, textAlign: 'center' }}>Cuotas</th>
                <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
                <th style={{ ...th, textAlign: 'center' }}>Próxima cuota</th>
                <th style={{ ...th, textAlign: 'center' }}>Estado</th>
                <th style={{ ...th, width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {financs.map(f => {
                const vencida = f.cuotas_vencidas > 0 && f.Estado !== 'Pagada';
                const pagada = f.Estado === 'Pagada';
                const anulada = f.Estado === 'Anulada';
                return (
                  <tr key={f.Id_Financiacion} style={{ borderBottom: '1px solid #f3f4f6', background: vencida ? '#fef2f215' : anulada ? '#f9fafb' : undefined, opacity: anulada ? 0.6 : 1 }}>
                    <td style={{ ...td, fontWeight: 700, color: '#7c3aed' }}>{f.Consecutivo}</td>
                    <td style={td}>{fmtDate(f.Fecha)}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{f.cliente_nombre || '-'}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{f.cliente_nit}</div>
                    </td>
                    <td style={{ ...td, color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.Descripcion}>{f.Descripcion || '-'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(Number(f.MontoFinanciado))}</td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 11 }}>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>{f.cuotas_pagadas}</span>
                      <span style={{ color: '#9ca3af' }}> / {f.total_cuotas}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: Number(f.saldo_pendiente) > 0 ? '#dc2626' : '#16a34a' }}>{fmt(Number(f.saldo_pendiente))}</td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 11 }}>
                      {f.proxima_cuota ? fmtDate(f.proxima_cuota) : '-'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {anulada
                        ? <span style={badge('#fee2e2', '#991b1b')}>Anulada</span>
                        : pagada
                        ? <span style={badge('#dcfce7', '#166534')}>Pagada</span>
                        : vencida
                        ? <span style={badge('#fef2f2', '#dc2626')}>Mora ({f.cuotas_vencidas})</span>
                        : <span style={badge('#eff6ff', '#1d4ed8')}>Al día</span>}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => abrirDetalle(f.Id_Financiacion)} title="Ver detalle"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Eye size={14} color="#2563eb" />
                        </button>
                        {!pagada && !anulada && (
                          <button onClick={() => abrirDetalle(f.Id_Financiacion)} title="Registrar pago"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                            <CreditCard size={14} color="#16a34a" />
                          </button>
                        )}
                        {puedeEditar && !anulada && f.cuotas_pagadas === 0 && (
                          <button onClick={() => anular(f)} title="Anular"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                            <Ban size={14} color="#dc2626" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 8px', fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: '8px 8px', fontSize: 12 };
const badge = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color,
});

