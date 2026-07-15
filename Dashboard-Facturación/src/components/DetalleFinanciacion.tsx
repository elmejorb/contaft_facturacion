import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Loader2, X, Ban, Landmark, Banknote, Smartphone, Save, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/financiaciones/';
const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const fmtDate = (s: string | null) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO') : '-';

interface Props {
  id: number;
  onVolver: () => void;
}

export function DetalleFinanciacion({ id, onVolver }: Props) {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const permisos: string[] = (user as any)?.permisos || [];
  const puedePagar = esAdmin || permisos.includes('financiaciones_pagar') || permisos.includes('financiaciones_editar');

  const [loading, setLoading] = useState(true);
  const [financ, setFinanc] = useState<any>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  const [pagoModal, setPagoModal] = useState<{ cuota: any } | null>(null);
  const [pagoValor, setPagoValor] = useState('');
  const [pagoMedio, setPagoMedio] = useState(0);
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().slice(0, 10));
  const [guardandoPago, setGuardandoPago] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?detalle=${id}`);
      const d = await r.json();
      if (d.success) { setFinanc(d.financiacion); setCuotas(d.cuotas || []); setPagos(d.pagos || []); }
      else toast.error(d.message || 'No se pudo cargar');
    } catch { toast.error('Error de conexión'); }
    setLoading(false);
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  const abrirPago = (cuota: any) => {
    setPagoModal({ cuota });
    setPagoValor(String(Math.round(Number(cuota.Saldo))));
    setPagoMedio(0);
    setPagoFecha(new Date().toISOString().slice(0, 10));
  };
  const cerrarPago = () => { if (!guardandoPago) setPagoModal(null); };

  const confirmarPago = async () => {
    if (!pagoModal) return;
    const val = parseFloat(pagoValor.replace(/\D/g, '')) || 0;
    if (val <= 0) { toast.error('Ingrese un valor'); return; }
    setGuardandoPago(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pagar',
          id_cuota: pagoModal.cuota.Id_Cuota,
          valor: val,
          medio_pago: pagoMedio,
          fecha: pagoFecha,
          id_usuario: user?.id || null,
        }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setPagoModal(null); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
    setGuardandoPago(false);
  };

  const anularPago = async (p: any) => {
    const ok = await confirmar({
      title: 'Anular pago',
      message: `¿Anular el pago del ${fmtDate(p.Fecha)} por ${fmt(Number(p.Valor))}?\n\nLa cuota volverá a tener saldo pendiente.`,
      type: 'danger',
      confirmText: 'Sí, anular',
    });
    if (!ok) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular_pago', id_financpago: p.Id_FinancPago }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        <Loader2 size={26} className="animate-spin" /><br />Cargando…
      </div>
    );
  }
  if (!financ) return <div style={{ padding: 20 }}>No encontrada. <button onClick={onVolver}>Volver</button></div>;

  const saldo = cuotas.reduce((s, c) => s + Number(c.Saldo || 0), 0);
  const pagado = Number(financ.MontoFinanciado) - saldo;
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={onVolver}
          style={{ height: 32, padding: '0 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={13} /> Volver
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            Financiación {financ.Consecutivo}
            <span style={badge(estadoBg(financ.Estado), estadoFg(financ.Estado))}>{financ.Estado}</span>
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{financ.Descripcion || '(sin descripción)'}</p>
        </div>
      </div>

      {/* Info + resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={card}>
          <div style={label}>Cliente</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{financ.cliente_nombre}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            NIT {financ.cliente_nit} · {financ.cliente_telefono || '—'} · {financ.cliente_direccion || '—'}
          </div>
        </div>
        <div style={card}>
          <div style={label}>Fecha</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(financ.Fecha)}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>Vendedor: {financ.vendedor_nombre || '—'}</div>
        </div>
        <div style={card}>
          <div style={label}>Monto financiado</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed' }}>{fmt(Number(financ.MontoFinanciado))}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>Pagado: {fmt(pagado)}</div>
        </div>
        <div style={card}>
          <div style={label}>Saldo pendiente</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: saldo > 0 ? '#dc2626' : '#16a34a' }}>{fmt(saldo)}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
            {cuotas.filter(c => c.Estado === 'Pagada').length} de {cuotas.length} cuotas pagadas
          </div>
        </div>
      </div>

      {/* Tabla cuotas */}
      <div style={card2}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} /> Cronograma de cuotas
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'center', width: 50 }}>#</th>
              <th style={th}>Vencimiento</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor</th>
              <th style={{ ...th, textAlign: 'right' }}>Pagado</th>
              <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
              <th style={{ ...th, textAlign: 'center' }}>Estado</th>
              <th style={{ ...th, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {cuotas.map(c => {
              const vencida = c.Estado !== 'Pagada' && c.FechaVencimiento < hoy;
              return (
                <tr key={c.Id_Cuota} style={{ borderBottom: '1px solid #f3f4f6', background: vencida ? '#fef2f210' : undefined }}>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{c.NumCuota}</td>
                  <td style={{ ...td, fontWeight: 500 }}>
                    {fmtDate(c.FechaVencimiento)}
                    {vencida && <span style={{ marginLeft: 6, fontSize: 9, background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>VENCIDA</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(Number(c.ValorCuota))}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#16a34a' }}>{Number(c.ValorPagado) > 0 ? fmt(Number(c.ValorPagado)) : '-'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: Number(c.Saldo) > 0 ? '#dc2626' : '#16a34a' }}>{fmt(Number(c.Saldo))}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {c.Estado === 'Pagada'
                      ? <span style={badge('#dcfce7', '#166534')}>Pagada</span>
                      : c.Estado === 'Parcial'
                      ? <span style={badge('#fef3c7', '#92400e')}>Parcial</span>
                      : <span style={badge('#f3f4f6', '#6b7280')}>Pendiente</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {c.Estado !== 'Pagada' && puedePagar && financ.Estado === 'Activa' && (
                      <button onClick={() => abrirPago(c)}
                        style={{ height: 24, padding: '0 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <CreditCard size={11} /> Pagar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <div style={card2}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Historial de pagos</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={{ ...th, textAlign: 'center' }}>Cuota</th>
                <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                <th style={{ ...th, textAlign: 'center' }}>Medio</th>
                <th style={{ ...th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => {
                const cuota = cuotas.find(c => c.Id_Cuota === p.Id_Cuota);
                return (
                  <tr key={p.Id_FinancPago} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{fmtDate(p.Fecha)}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#7c3aed', fontWeight: 700 }}>#{cuota?.NumCuota || '?'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(Number(p.Valor))}</td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 11 }}>{medioLabel(Number(p.id_mediopago))}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {puedePagar && (
                        <button onClick={() => anularPago(p)} title="Anular pago"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Ban size={13} color="#dc2626" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal registrar pago */}
      {pagoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             onClick={cerrarPago}>
          <div style={{ background: '#fff', borderRadius: 12, width: 440, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Registrar Pago — Cuota #{pagoModal.cuota.NumCuota}</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Saldo: {fmt(Number(pagoModal.cuota.Saldo))}</div>
              </div>
              <button onClick={cerrarPago}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: 6, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Valor a pagar</label>
                <input type="text" value={pagoValor}
                  onChange={e => setPagoValor(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 20, fontWeight: 700, color: '#16a34a', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Fecha del pago</label>
                <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                  style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
              </div>
              <label style={label}>Medio de pago</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                {[
                  { id: 0, label: 'Efectivo',    Icon: Banknote,   color: '#16a34a' },
                  { id: 1, label: 'Tarjeta',     Icon: CreditCard, color: '#2563eb' },
                  { id: 2, label: 'Bancolombia', Icon: Landmark,   color: '#d97706' },
                  { id: 3, label: 'Nequi',       Icon: Smartphone, color: '#7c3aed' },
                ].map(m => {
                  const active = pagoMedio === m.id;
                  const Icon = m.Icon;
                  return (
                    <button key={m.id} onClick={() => setPagoMedio(m.id)}
                      style={{ height: 36, padding: '0 10px', border: `2px solid ${active ? m.color : '#e5e7eb'}`, background: active ? m.color + '15' : '#fff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: active ? m.color : '#374151' }}>
                      <Icon size={14} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: '10px 18px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button onClick={cerrarPago} disabled={guardandoPago}
                style={{ height: 34, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarPago} disabled={guardandoPago}
                style={{ height: 34, padding: '0 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: guardandoPago ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                {guardandoPago ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: 10, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const card2: React.CSSProperties = { background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 12 };
const label: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3, display: 'block' };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' };
const td: React.CSSProperties = { padding: '6px 8px', fontSize: 12 };
const badge = (bg: string, color: string): React.CSSProperties => ({ display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color, verticalAlign: 'middle' });
const estadoBg = (s: string) => s === 'Pagada' ? '#dcfce7' : s === 'Anulada' ? '#fee2e2' : '#eff6ff';
const estadoFg = (s: string) => s === 'Pagada' ? '#166534' : s === 'Anulada' ? '#991b1b' : '#1d4ed8';
const medioLabel = (id: number) => ({0:'Efectivo',1:'Tarjeta',2:'Bancolombia',3:'Nequi'}[id] || 'Otro');
