import { useState, useEffect } from 'react';
import { X, Save, Printer, RotateCcw, Ban, Edit3, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getConfigImpresion } from './ConfiguracionSistema';
import { imprimirFactura, type DatosFactura } from './ImpresionFactura';
import { confirmar } from './ConfirmDialog';
import { AutorizacionAdminModal, type AdminAutorizado } from './AutorizacionAdminModal';
import { useAuth } from '../contexts/AuthContext';

const API = 'http://localhost:80/conta-app-backend/api/ventas/detalle-factura.php';
const API_CLIENTES = 'http://localhost:80/conta-app-backend/api/clientes/buscar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Props { factN: number; onClose: () => void; onUpdate?: () => void; }

export function DetalleFacturaModal({ factN, onClose, onUpdate }: Props) {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const [autorizacion, setAutorizacion] = useState<{ tipo: 'devolucion' | 'anulacion'; motivo: string } | null>(null);
  const [adminAutorizador, setAdminAutorizador] = useState<AdminAutorizado | null>(null);
  const [factura, setFactura] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<'ver' | 'editar' | 'devolucion'>('ver');
  const [editData, setEditData] = useState<any>({});
  const [devCantidades, setDevCantidades] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [showBuscarCliente, setShowBuscarCliente] = useState(false);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [clienteResults, setClienteResults] = useState<any[]>([]);
  const searchTimer = useState<any>(null);

  const buscarCliente = async (q: string) => {
    setClienteBusqueda(q);
    if (q.length < 2) { setClienteResults([]); return; }
    try {
      const r = await fetch(`${API_CLIENTES}?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.success) setClienteResults(d.clientes || []);
    } catch (e) {}
  };

  const seleccionarCliente = (c: any) => {
    setEditData((prev: any) => ({
      ...prev,
      cliente_id: c.CodigoClien,
      cliente_nombre: c.Nombre_Cliente || c.Razon_Social,
      identificacion: c.Identificacion || '0',
      direccion: c.Direccion || '-',
      telefono: c.Telefono || '0'
    }));
    setShowBuscarCliente(false);
    setClienteBusqueda('');
    setClienteResults([]);
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?id=${factN}`);
      const d = await r.json();
      if (d.success) {
        setFactura(d.factura);
        setItems(d.items);
        setPagos(d.pagos);
        setDevoluciones(d.devoluciones);
        setPuedeEditar(d.puede_editar);
        setEditData({
          tipo: d.factura.Tipo, dias: d.factura.Dias,
          fecha: d.factura.Fecha?.split(' ')[0] || '',
          cliente_id: d.factura.CodigoCli, cliente_nombre: d.factura.A_nombre,
          identificacion: d.factura.Identificacion, direccion: d.factura.Direccion,
          telefono: d.factura.Telefono
        });
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [factN]);

  const guardarEdicion = async () => {
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', factura_n: factN, ...editData })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setModo('ver'); cargar(); onUpdate?.(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error al guardar'); }
    setGuardando(false);
  };

  const procesarDevolucion = async (adminAuth?: AdminAutorizado) => {
    const itemsDev = Object.entries(devCantidades)
      .map(([id, cant]) => ({ id_detalle: parseInt(id), cant_devolver: parseFloat(cant) || 0 }))
      .filter(i => i.cant_devolver > 0);
    if (itemsDev.length === 0) { toast.error('No hay cantidades para devolver'); return; }

    // Si la config exige autorización admin y aún no la tenemos → pedir
    const cfg = getConfigImpresion();
    if (cfg.autorizarDevoluciones && !adminAuth) {
      setAutorizacion({ tipo: 'devolucion', motivo: `Devolución de Factura FV-${factN}` });
      return;
    }

    const ok = await confirmar({ title: 'Confirmar Devolución', message: '¿Confirma la devolución? Los productos se devolverán al inventario. Esta acción no se puede deshacer.', type: 'warning', confirmText: 'Procesar Devolución' });
    if (!ok) return;
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'devolucion', factura_n: factN, items: itemsDev,
          autorizado_por: adminAuth?.id || null,
          autorizado_por_nombre: adminAuth?.nombre || null,
        })
      });
      const d = await r.json();
      if (d.success) {
        const msg = adminAuth ? `${d.message} (autorizado por ${adminAuth.nombre})` : d.message;
        toast.success(msg);
        setModo('ver'); setDevCantidades({}); setAdminAutorizador(null); cargar(); onUpdate?.();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error al procesar devolución'); }
    setGuardando(false);
  };

  const anularFactura = async (adminAuth?: AdminAutorizado) => {
    const cfg = getConfigImpresion();

    // Reglas para vendedor sin admin auth:
    // - Solo puede anular SU propia venta + dentro de su sesión de caja abierta
    // - El backend valida y devuelve { requiere_autorizacion: true } si no cumple
    // Para admin: si config exige autorización, también pasa por el modal
    const necesitaAuth = cfg.autorizarAnulaciones && esAdmin && !adminAuth;
    if (necesitaAuth) {
      setAutorizacion({ tipo: 'anulacion', motivo: `Anular Factura FV-${factN}` });
      return;
    }

    const ok = await confirmar({ title: 'Anular Factura', message: '¿Está seguro de ANULAR esta factura? Se devolverá todo el inventario al stock. Esta acción es irreversible.', type: 'danger', confirmText: 'Sí, Anular Factura' });
    if (!ok) return;
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anular', factura_n: factN,
          usuario_id: user?.id || 0,
          autorizado_por: adminAuth?.id || null,
          autorizado_por_nombre: adminAuth?.nombre || null,
        })
      });
      const d = await r.json();
      // Si el backend devuelve que requiere autorización (vendedor con venta fuera de su sesión)
      if (!d.success && d.requiere_autorizacion) {
        setAutorizacion({ tipo: 'anulacion', motivo: `Anular Factura FV-${factN} — ${d.message || 'requiere autorización'}` });
        setGuardando(false);
        return;
      }
      // Si el backend dice que no hay caja abierta para procesar el reembolso
      if (!d.success && d.requiere_caja_abierta) {
        toast.error(d.message, { duration: 8000 });
        setGuardando(false);
        return;
      }
      if (d.success) {
        const msg = adminAuth ? `${d.message} (autorizado por ${adminAuth.nombre})` : d.message;
        toast.success(msg, { duration: 6000 });
        setAdminAutorizador(null); cargar(); onUpdate?.();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error al anular'); }
    setGuardando(false);
  };

  const imprimir = () => {
    if (!factura || !items.length) return;
    const config = getConfigImpresion();
    const datosImp: DatosFactura = {
      numero: factura.Factura_N,
      fecha: factura.Fecha ? new Date(factura.Fecha).toLocaleDateString('es-CO') + ' - ' + (factura.Hora || '') : '-',
      tipo: factura.Tipo || 'Contado', dias: parseInt(factura.Dias) || 0,
      cliente: { nombre: factura.A_nombre || '-', nit: factura.Identificacion || '0', telefono: factura.Telefono || '0', direccion: factura.Direccion || '-' },
      items: items.map(i => ({ codigo: i.Codigo || '', nombre: i.Nombres_Articulo || '-', cantidad: parseFloat(i.Cantidad) || 0, precio: parseFloat(i.PrecioV) || 0, iva: parseFloat(i.IVA) || 0, descuento: parseFloat(i.Descuento) || 0, subtotal: parseFloat(i.Subtotal) || 0 })),
      subtotal: items.reduce((s, i) => s + (parseFloat(i.Subtotal) || 0), 0),
      descuento: parseFloat(factura.Descuento) || 0, iva: parseFloat(factura.Impuesto) || 0,
      total: parseFloat(factura.Total) || 0, efectivo: parseFloat(factura.efectivo) || 0,
      transferencia: parseFloat(factura.valorpagado1) || 0, cambio: parseFloat(factura.Cambio) || 0,
      abono: parseFloat(factura.Abono) || 0, saldo: parseFloat(factura.Saldo) || 0,
      medioPago: factura.MedioPago || 'Efectivo', vendedor: factura.NombreUsuario || 'Vendedor',
      empresa: { nombre: 'DISTRIBUIDORA DE SALSAS DE PLANETA RICA', nit: '901.529.697-3', telefono: '3128478781', direccion: 'CR 7 14 60 BRR LOS ABETOS PLANETA RICA', regimen: 'Régimen Común', propietario: '-', resolucion: '0' },
      caja: 1, logo: config.logo || undefined
    };
    imprimirFactura(datosImp);
  };

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center' }}>Cargando...</div>
    </div>
  );

  if (!factura) return null;

  const esAnulada = factura.EstadoFact === 'Anulada';
  const total = parseFloat(factura.Total) || 0;
  const saldo = parseFloat(factura.Saldo) || 0;

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2, fontWeight: 600 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: pagos.length > 0 && factura?.Tipo !== 'Contado' ? 950 : 780, maxHeight: '90vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', transition: 'width 0.2s' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>Factura Nº {factura.Factura_N}</span>
            {esAnulada && <span style={{ padding: '2px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700 }}>ANULADA</span>}
            {!esAnulada && saldo > 0 && <span style={{ padding: '2px 10px', borderRadius: 6, background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700 }}>Pendiente</span>}
            {!esAnulada && saldo <= 0 && <span style={{ padding: '2px 10px', borderRadius: 6, background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700 }}>Pagada</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={imprimir} title="Imprimir" style={{ height: 30, padding: '0 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
              <Printer size={14} color="#2563eb" /> Imprimir
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>

          {/* Datos de la factura */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12, padding: 12, background: '#f9fafb', borderRadius: 10 }}>
            {modo === 'editar' ? (<>
              <div>
                <label style={lbl}>FECHA</label>
                <input type="date" value={editData.fecha} onChange={e => setEditData({ ...editData, fecha: e.target.value })} style={{ ...inp, width: '100%' }} />
              </div>
              <div>
                <label style={lbl}>TIPO</label>
                <select value={editData.tipo} onChange={e => setEditData({ ...editData, tipo: e.target.value })} style={{ ...inp, width: '100%' }}>
                  <option>Contado</option><option>Crédito</option>
                </select>
              </div>
              {editData.tipo === 'Crédito' && <div>
                <label style={lbl}>DÍAS</label>
                <input type="text" value={editData.dias} onChange={e => setEditData({ ...editData, dias: e.target.value })} style={{ ...inp, width: 60 }} />
              </div>}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>CLIENTE</label>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="text" value={editData.cliente_id} readOnly style={{ ...inp, width: 60, textAlign: 'center', fontWeight: 700, color: '#7c3aed', background: '#f9fafb' }} />
                  <input type="text" value={editData.cliente_nombre} onChange={e => setEditData({ ...editData, cliente_nombre: e.target.value })} style={{ ...inp, flex: 1 }} />
                  <button onClick={() => setShowBuscarCliente(true)} title="Buscar cliente"
                    style={{ width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Search size={14} color="#7c3aed" />
                  </button>
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>NIT: {editData.identificacion} | Tel: {editData.telefono} | Dir: {editData.direccion}</div>
              </div>
            </>) : (<>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>FECHA</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{factura.Fecha ? new Date(factura.Fecha).toLocaleDateString('es-CO') : '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>TIPO</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{factura.Tipo} {factura.Dias > 0 ? `(${factura.Dias} días)` : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>CLIENTE</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{factura.A_nombre}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>NIT: {factura.Identificacion} | Tel: {factura.Telefono}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>MEDIO PAGO</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{factura.MedioPago}</div>
              </div>
            </>)}
          </div>

          {/* Tabla de productos + Panel pagos lateral */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {/* Tabla productos */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #7c3aed' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11 }}>Código</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11 }}>Artículo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: 50, fontSize: 11 }}>Cant.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 80, fontSize: 11 }}>P. Costo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 80, fontSize: 11 }}>P. Venta</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 70, fontSize: 11 }}>Desc.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: 90, fontSize: 11 }}>Subtotal</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: 40, fontSize: 11 }}>Dev</th>
                    {modo === 'devolucion' && <th style={{ padding: '6px 8px', textAlign: 'center', width: 70, fontSize: 11, color: '#dc2626' }}>Devolver</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => {
                    const cant = parseFloat(item.Cantidad) || 0;
                    const dev = parseFloat(item.Dev) || 0;
                    return (
                      <tr key={item.Id_DetalleVenta} style={{ borderBottom: '1px solid #f3f4f6', background: cant === 0 ? '#fef2f2' : '' }}>
                        <td style={{ padding: '4px 8px', color: '#6b7280', fontSize: 11 }}>{item.Codigo}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 500 }}>{item.Nombres_Articulo}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600, color: cant === 0 ? '#dc2626' : '#1f2937' }}>{cant}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: '#6b7280', fontSize: 11 }}>{fmtMon(parseFloat(item.PrecioC) || 0)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(parseFloat(item.PrecioV) || 0)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: '#d97706' }}>{parseFloat(item.Descuento) > 0 ? fmtMon(parseFloat(item.Descuento)) : '-'}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}>{fmtMon(parseFloat(item.Subtotal) || 0)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: dev > 0 ? '#dc2626' : '#9ca3af', fontWeight: dev > 0 ? 700 : 400 }}>{dev > 0 ? dev : '-'}</td>
                        {modo === 'devolucion' && (
                          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                            {cant > 0 && (
                              <input type="text" placeholder="0"
                                value={devCantidades[item.Id_DetalleVenta] || ''}
                                onChange={e => setDevCantidades({ ...devCantidades, [item.Id_DetalleVenta]: e.target.value.replace(/[^0-9.]/g, '') })}
                                style={{ width: 50, height: 24, textAlign: 'center', border: '2px solid #dc2626', borderRadius: 4, fontSize: 12, fontWeight: 600, outline: 'none' }} />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Panel lateral: Lista de Pagos (solo crédito con pagos) */}
            {factura.Tipo !== 'Contado' && pagos.length > 0 && (
              <div style={{ width: 200, flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 8, borderBottom: '2px solid #2563eb', paddingBottom: 4 }}>Lista de Pagos</div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                        <th style={{ padding: '3px 4px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                        <th style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 600 }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map((p: any) => (
                        <tr key={p.Id_Pagos} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '3px 4px', color: '#6b7280' }}>{p.Fecha?.split(' ')[0]?.replace(/^\d{4}-/, '').split('-').reverse().join('/')}</td>
                          <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(parseFloat(p.ValorPago))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ borderTop: '2px solid #1f2937', marginTop: 6, paddingTop: 6, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#16a34a' }}><span>Total Pagos:</span><span>{fmtMon(pagos.reduce((s: number, p: any) => s + (parseFloat(p.ValorPago) || 0), 0))}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: saldo > 0 ? '#dc2626' : '#16a34a', marginTop: 3 }}><span>Saldo:</span><span>{fmtMon(saldo)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Totales + Resumen de pago */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
            {/* Info izquierda */}
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {factura.Tipo !== 'Contado' && (
                <div style={{ marginBottom: 4 }}>
                  <span>Valor Efectivo: <b>{fmtMon(parseFloat(factura.efectivo) || 0)}</b></span>
                  {' '} | Medio Pago: <b>{fmtMon(parseFloat(factura.valorpagado1) || 0)}</b>
                </div>
              )}
              {devoluciones.length > 0 && (
                <div style={{ color: '#dc2626' }}>
                  Devoluciones: <b>{devoluciones.length}</b> — Total: <b>{fmtMon(devoluciones.reduce((s: number, d: any) => s + (parseFloat(d.valor_dev) || 0), 0))}</b>
                </div>
              )}
            </div>

            {/* Totales derecha */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', minWidth: 220, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}><span>Subtotal:</span><span>{fmtMon(items.reduce((s: number, i: any) => s + (parseFloat(i.Subtotal) || 0), 0))}</span></div>
              {parseFloat(factura.Descuento) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3, color: '#d97706' }}><span>Descuento:</span><span>{fmtMon(parseFloat(factura.Descuento))}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}><span>IVA:</span><span>{fmtMon(parseFloat(factura.Impuesto) || 0)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontWeight: 800, fontSize: 15, borderTop: '2px solid #1f2937', paddingTop: 4 }}><span>Total:</span><span>{fmtMon(total)}</span></div>
              {saldo > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 3, color: '#dc2626', fontWeight: 700 }}><span>Saldo:</span><span>{fmtMon(saldo)}</span></div>}
            </div>
          </div>
        </div>

        {/* Footer botones */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 6, justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {!esAnulada && puedeEditar && modo === 'ver' && (
              <button onClick={() => setModo('editar')} style={{ height: 32, padding: '0 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Edit3 size={14} color="#7c3aed" /> Editar
              </button>
            )}
            {!esAnulada && modo === 'ver' && (
              <button onClick={() => setModo('devolucion')} style={{ height: 32, padding: '0 12px', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626' }}>
                <RotateCcw size={14} /> Devolución
              </button>
            )}
            {!esAnulada && puedeEditar && modo === 'ver' && (
              <button onClick={anularFactura} disabled={guardando} style={{ height: 32, padding: '0 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626' }}>
                <Ban size={14} /> Anular
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {modo === 'editar' && (<>
              <button onClick={() => setModo('ver')} style={{ height: 32, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Save size={14} /> Guardar Cambios
              </button>
            </>)}
            {modo === 'devolucion' && (<>
              <button onClick={() => { setModo('ver'); setDevCantidades({}); }} style={{ height: 32, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={procesarDevolucion} disabled={guardando} style={{ height: 32, padding: '0 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RotateCcw size={14} /> Procesar Devolución
              </button>
            </>)}
            {modo === 'ver' && (
              <button onClick={onClose} style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cerrar</button>
            )}
          </div>
        </div>
      </div>

      {/* Modal buscar cliente */}
      {showBuscarCliente && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowBuscarCliente(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 500, maxHeight: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Buscar Cliente</span>
              <button onClick={() => setShowBuscarCliente(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '10px 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input type="text" placeholder="Escriba nombre o NIT..." value={clienteBusqueda}
                  onChange={e => buscarCliente(e.target.value)} autoFocus
                  style={{ width: '100%', height: 34, paddingLeft: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', maxHeight: 280 }}>
              {clienteResults.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  {clienteBusqueda.length < 2 ? 'Escriba al menos 2 caracteres' : 'Sin resultados'}
                </div>
              ) : clienteResults.map((c: any) => (
                <div key={c.CodigoClien} onClick={() => seleccionarCliente(c)}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f3e8ff')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <span style={{ color: '#7c3aed', fontWeight: 700, width: 55, flexShrink: 0 }}>{c.CodigoClien}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{c.Nombre_Cliente || c.Razon_Social}</span>
                  <span style={{ color: '#6b7280', width: 100, textAlign: 'right' }}>{c.Identificacion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de autorización admin (para devolución / anulación) */}
      {autorizacion && (
        <AutorizacionAdminModal
          motivo={autorizacion.motivo}
          onCancelar={() => setAutorizacion(null)}
          onAutorizado={(admin) => {
            setAdminAutorizador(admin);
            const tipo = autorizacion.tipo;
            setAutorizacion(null);
            // Ejecutar la acción correspondiente con el admin autorizado
            setTimeout(() => {
              if (tipo === 'devolucion') procesarDevolucion(admin);
              else if (tipo === 'anulacion') anularFactura(admin);
            }, 100);
          }}
        />
      )}
    </div>
  );
}
