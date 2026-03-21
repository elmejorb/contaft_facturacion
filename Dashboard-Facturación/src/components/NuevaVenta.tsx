import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Trash2, Plus, Save, X, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { getConfigImpresion } from './ConfiguracionSistema';
import { imprimirFactura, buildDatosFactura } from './ImpresionFactura';

const API_VENTA = 'http://localhost:80/conta-app-backend/api/ventas/nueva.php';
const API_CLIENTES = 'http://localhost:80/conta-app-backend/api/clientes/buscar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface LineaVenta {
  id: number; // temporal
  Items: number;
  Codigo: string;
  Nombre: string;
  Existencia: number;
  Cantidad: number;
  PrecioCosto: number;
  PrecioVenta: number;
  Iva: number;
  Descuento: number;
  Subtotal: number;
}

export interface TabState {
  tipo: string;
  dias: number;
  listaPrecio: number;
  descuentoGlobal: number;
  cliente: { id: number; nombre: string; nit: string; tel: string; dir: string; cupo: number; esCliente: boolean };
  lineas: LineaVenta[];
}

let lineaId = Date.now();

interface NuevaVentaProps {
  onFacturaCreada?: (factN: number) => void;
  initialState?: TabState;
  onStateChange?: (state: TabState) => void;
}

export function NuevaVenta({ onFacturaCreada, initialState, onStateChange }: NuevaVentaProps) {
  const init = initialState || { tipo: 'Contado', dias: 0, listaPrecio: 1, descuentoGlobal: 0, cliente: { id: 130500, nombre: 'VENTAS AL CONTADO', nit: '0', tel: '0', dir: '-', cupo: 0, esCliente: false }, lineas: [] };
  const [tipo, setTipo] = useState(init.tipo);
  const [dias, setDias] = useState(init.dias);
  const [medioPago, setMedioPago] = useState(0);
  const [cliente, setCliente] = useState(init.cliente);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [clienteResults, setClienteResults] = useState<any[]>([]);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [listaPrecio, setListaPrecio] = useState(init.listaPrecio);
  const [lineas, setLineas] = useState<LineaVenta[]>(init.lineas);
  const [buscarProducto, setBuscarProducto] = useState('');
  const [productoResults, setProductoResults] = useState<any[]>([]);
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [descuentoGlobal, setDescuentoGlobal] = useState(init.descuentoGlobal);
  const [efectivo, setEfectivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [pagoEfectivo, setPagoEfectivo] = useState('');
  const [pagoTransferencia, setPagoTransferencia] = useState('');
  const [pagoMedioTransf, setPagoMedioTransf] = useState(2); // Bancolombia por defecto
  const [pagoAbono, setPagoAbono] = useState('');
  const [mediosPago] = useState([
    { id: 0, nombre: 'Efectivo' }, { id: 1, nombre: 'Tarjeta' },
    { id: 2, nombre: 'Bancolombia' }, { id: 3, nombre: 'Nequi' }
  ]);

  // Notificar cambios al parent (para persistencia)
  const stateChangeRef = useRef(onStateChange);
  stateChangeRef.current = onStateChange;
  useEffect(() => {
    if (stateChangeRef.current) {
      stateChangeRef.current({ tipo, dias, listaPrecio, descuentoGlobal, cliente, lineas });
    }
  }, [tipo, dias, listaPrecio, descuentoGlobal, cliente, lineas]);

  const productoInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<any>(null);

  // Buscar cliente
  const buscarCliente = (q: string) => {
    setClienteBusqueda(q);
    if (q.length < 2) { setClienteResults([]); setShowClienteDropdown(false); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_CLIENTES}?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (d.success) { setClienteResults(d.clientes || []); setShowClienteDropdown(true); }
      } catch (e) {}
    }, 300);
  };

  const seleccionarCliente = (c: any) => {
    setCliente({
      id: c.CodigoClien, nombre: c.Nombre_Cliente, nit: c.Identificacion || '0',
      tel: c.Telefono || '0', dir: c.Direccion || '-',
      cupo: parseFloat(c.Cupo) || 0, esCliente: true
    });
    setClienteBusqueda('');
    setShowClienteDropdown(false);
    productoInputRef.current?.focus();
  };

  const setClienteField = (field: string, value: string) => {
    setCliente(prev => ({ ...prev, [field]: value }));
  };

  // Buscar producto
  const buscarProductoFn = (q: string) => {
    setBuscarProducto(q);
    if (q.length < 1) { setProductoResults([]); setShowProductoDropdown(false); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_VENTA}?buscar=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (d.success) { setProductoResults(d.articulos); setShowProductoDropdown(true); }
      } catch (e) {}
    }, 200);
  };

  const agregarProducto = (art: any) => {
    // Check if already in list
    const existente = lineas.find(l => l.Items === art.Items);
    if (existente) {
      setLineas(prev => prev.map(l => l.Items === art.Items ? { ...l, Cantidad: l.Cantidad + 1, Subtotal: (l.Cantidad + 1) * l.PrecioVenta - l.Descuento } : l));
    } else {
      const precio = listaPrecio === 2 ? (art.Precio_Venta2 || art.Precio_Venta) : listaPrecio === 3 ? (art.Precio_Venta3 || art.Precio_Venta) : art.Precio_Venta;
      const nueva: LineaVenta = {
        id: ++lineaId, Items: art.Items, Codigo: art.Codigo, Nombre: art.Nombres_Articulo,
        Existencia: art.Existencia, Cantidad: 1, PrecioCosto: art.Precio_Costo,
        PrecioVenta: precio, Iva: art.Iva || 0, Descuento: 0, Subtotal: precio
      };
      setLineas(prev => [...prev, nueva]);
    }
    setBuscarProducto('');
    setShowProductoDropdown(false);
    productoInputRef.current?.focus();
  };

  const actualizarLinea = (id: number, field: keyof LineaVenta, value: number) => {
    setLineas(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.Subtotal = (updated.Cantidad * updated.PrecioVenta) - updated.Descuento;
      return updated;
    }));
  };

  const eliminarLinea = (id: number) => setLineas(prev => prev.filter(l => l.id !== id));

  // Totales
  const subtotal = lineas.reduce((s, l) => s + l.Subtotal, 0);
  const totalIva = lineas.reduce((s, l) => s + (l.Subtotal * (l.Iva / 100)), 0);
  const total = subtotal + totalIva - descuentoGlobal;
  const cambio = tipo === 'Contado' && efectivo ? Math.max(parseInt(efectivo) - total, 0) : 0;

  // Abrir modal de pago
  const finalizar = () => {
    if (lineas.length === 0) { setError('Agregue al menos un producto'); return; }
    setPagoEfectivo('');
    setPagoTransferencia('');
    setPagoAbono('');
    setShowPagoModal(true);
  };

  // Valores del modal de pago
  const pagoEfectivoNum = parseInt(pagoEfectivo || '0');
  const pagoTransfNum = parseInt(pagoTransferencia || '0');
  const pagoAbonoNum = parseInt(pagoAbono || '0');
  const totalPagado = tipo === 'Contado' ? pagoEfectivoNum + pagoTransfNum : pagoAbonoNum;
  const cambioPago = tipo === 'Contado' ? Math.max(totalPagado - total, 0) : 0;
  const faltaPagar = tipo === 'Contado' ? Math.max(total - totalPagado, 0) : 0;

  // Confirmar venta
  const confirmarVenta = async () => {
    if (tipo === 'Contado' && totalPagado < total) { setError('El pago no cubre el total'); return; }
    setGuardando(true); setError('');
    const medioFinal = pagoTransfNum > 0 && pagoEfectivoNum === 0 ? pagoMedioTransf : pagoTransfNum > 0 ? pagoMedioTransf : 0;
    try {
      const body = {
        tipo, dias: tipo === 'Contado' ? 0 : dias,
        cliente_id: cliente.id, cliente_nombre: cliente.nombre,
        cliente_identificacion: cliente.nit, cliente_direccion: cliente.dir, cliente_telefono: cliente.tel,
        medio_pago: medioFinal, vendedor: 0, descuento_global: descuentoGlobal,
        efectivo: pagoEfectivoNum, valor_pagado: pagoTransfNum,
        abono: tipo !== 'Contado' ? pagoAbonoNum : 0,
        items: lineas.map(l => ({
          items: l.Items, cantidad: l.Cantidad, precio: l.PrecioVenta,
          precio_costo: l.PrecioCosto, iva: l.Iva, descuento: l.Descuento
        }))
      };
      const r = await fetch(API_VENTA, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        const cfg = getConfigImpresion();
        // Imprimir si está configurado
        if (cfg.imprimirAlGuardar) {
          const medioNombre = pagoTransfNum > 0 ? (['','Tarjeta','Bancolombia','Nequi'][pagoMedioTransf] || 'Transferencia') : 'Efectivo';
          const datosImp = buildDatosFactura(d.Factura_N, lineas, cliente, tipo, dias, descuentoGlobal, pagoEfectivoNum, pagoTransfNum, cambioPago, tipo !== 'Contado' ? pagoAbonoNum : 0, medioNombre);
          imprimirFactura(datosImp);
        }
        setShowPagoModal(false);
        toast.success(
          cambioPago > 0
            ? `Factura #${d.Factura_N} guardada — Cambio: ${fmtMon(cambioPago)}`
            : `Factura #${d.Factura_N} guardada exitosamente`,
          { duration: cambioPago > 0 ? 8000 : 4000 }
        );
        setLineas([]); setDescuentoGlobal(0); setEfectivo('');
        setCliente({ id: 130500, nombre: 'VENTAS AL CONTADO', nit: '0', tel: '0', dir: '-', cupo: 0, esCliente: false });
        onFacturaCreada?.(d.Factura_N);
      } else { toast.error(d.message); }
    } catch (e) { toast.error('Error al crear factura'); }
    setGuardando(false);
  };

  // Nueva factura (reset)
  const nueva = () => {
    setLineas([]); setDescuentoGlobal(0); setEfectivo(''); setError(''); setSuccess('');
    setCliente({ id: 130500, nombre: 'VENTAS AL CONTADO', nit: '0', tel: '0', dir: '-', cupo: 0, esCliente: false });
    setTipo('Contado'); setDias(0);
    productoInputRef.current?.focus();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setListaPrecio(1); }
      if (e.key === 'F2') { e.preventDefault(); setListaPrecio(2); }
      if (e.key === 'F3') { e.preventDefault(); setListaPrecio(3); }
      if (e.key === 'F9') { e.preventDefault(); finalizar(); }
      if (e.key === 'Escape') { setShowProductoDropdown(false); setShowClienteDropdown(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lineas, tipo, cliente, efectivo]);

  const soloNum = (e: React.KeyboardEvent) => {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (!allowed.includes(e.key) && !e.ctrlKey) e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 14px', marginBottom: 8, color: '#dc2626', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>{error}<button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button></div>}
      {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 14px', marginBottom: 8, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>{success}</div>}

      {/* Fila 1: Datos factura */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '8px 16px', marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>TIPO</label>
          <select value={tipo} onChange={e => { setTipo(e.target.value); if (e.target.value === 'Contado') setDias(0); }}
            style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 4px', width: 90 }}>
            <option value="Contado">Contado</option>
            <option value="Crédito">Crédito</option>
          </select>
        </div>
        {tipo === 'Crédito' && (
          <div>
            <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>DÍAS</label>
            <input type="text" value={dias} onChange={e => setDias(parseInt(e.target.value) || 0)} onKeyDown={soloNum}
              style={{ height: 28, width: 40, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
          </div>
        )}
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>MEDIO PAGO</label>
          <select value={medioPago} onChange={e => setMedioPago(parseInt(e.target.value))}
            style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 4px', width: 100 }}>
            {mediosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>LISTA PRECIO</label>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setListaPrecio(n)} title={`F${n}: Precio ${n}`}
                style={{ width: 28, height: 28, border: listaPrecio === n ? '2px solid #7c3aed' : '1px solid #d1d5db', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: listaPrecio === n ? '#f3e8ff' : '#fff', color: listaPrecio === n ? '#7c3aed' : '#374151' }}>P{n}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#6b7280' }}>TOTAL</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: total > 0 ? '#16a34a' : '#9ca3af', lineHeight: 1 }}>{fmtMon(total)}</div>
        </div>
      </div>

      {/* Fila 2: Datos cliente */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '8px 16px', marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>CÓDIGO</label>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <input type="text" value={cliente.id} readOnly
              style={{ height: 28, width: 60, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#f9fafb', outline: 'none' }} />
            <button onClick={() => setShowClienteDropdown(true)} title="Buscar cliente"
              style={{ width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={14} color="#7c3aed" />
            </button>
            {cliente.esCliente && (
              <button onClick={() => setCliente({ id: 130500, nombre: 'VENTAS AL CONTADO', nit: '0', tel: '0', dir: '-', cupo: 0, esCliente: false })}
                title="Quitar cliente" style={{ width: 28, height: 28, border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color="#dc2626" />
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>CLIENTE</label>
          <input type="text" value={cliente.nombre}
            onChange={e => setClienteField('nombre', e.target.value)}
            readOnly={cliente.esCliente}
            style={{ width: '100%', height: 28, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 600, outline: 'none', background: cliente.esCliente ? '#f9fafb' : '#fff' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>NIT / CC</label>
          <input type="text" value={cliente.nit}
            onChange={e => setClienteField('nit', e.target.value)}
            readOnly={cliente.esCliente}
            style={{ height: 28, width: 110, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', background: cliente.esCliente ? '#f9fafb' : '#fff' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>TELÉFONO</label>
          <input type="text" value={cliente.tel}
            onChange={e => setClienteField('tel', e.target.value)}
            readOnly={cliente.esCliente}
            style={{ height: 28, width: 100, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', background: cliente.esCliente ? '#f9fafb' : '#fff' }} />
        </div>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>CUPO</label>
          <input type="text" value={cliente.cupo > 0 ? fmtMon(cliente.cupo) : '$ 0'} readOnly
            style={{ height: 28, width: 100, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, color: cliente.cupo > 0 ? '#2563eb' : '#9ca3af', background: '#f9fafb', outline: 'none', textAlign: 'right' }} />
        </div>
      </div>

      {/* Modal buscar cliente */}
      {showClienteDropdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowClienteDropdown(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 500, maxHeight: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Buscar Cliente</span>
              <button onClick={() => setShowClienteDropdown(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '10px 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input type="text" placeholder="Escriba nombre o NIT del cliente..." value={clienteBusqueda}
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
                <div key={c.CodigoClien}
                  onClick={() => { seleccionarCliente(c); setShowClienteDropdown(false); }}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f3e8ff')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <span style={{ color: '#7c3aed', fontWeight: 700, width: 55, flexShrink: 0 }}>{c.CodigoClien}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{c.Nombre_Cliente}</span>
                  <span style={{ color: '#6b7280', width: 100, textAlign: 'right' }}>{c.Identificacion}</span>
                  <span style={{ color: '#6b7280', width: 80, textAlign: 'right' }}>{c.Telefono !== '0' ? c.Telefono : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de items con fila de entrada */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#fff', borderBottom: '3px solid #7c3aed' }}>
              <th style={{ padding: '8px 8px', textAlign: 'left', width: 100, fontSize: 11, color: '#374151', fontWeight: 700 }}>Código</th>
              <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, color: '#374151', fontWeight: 700 }}>Artículo</th>
              <th style={{ padding: '8px 8px', textAlign: 'center', width: 55, fontSize: 11, color: '#374151', fontWeight: 700 }}>Exist.</th>
              <th style={{ padding: '8px 8px', textAlign: 'center', width: 65, fontSize: 11, color: '#374151', fontWeight: 700 }}>Cant.</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', width: 95, fontSize: 11, color: '#374151', fontWeight: 700 }}>Precio</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', width: 75, fontSize: 11, color: '#374151', fontWeight: 700 }}>Desc.</th>
              <th style={{ padding: '8px 8px', textAlign: 'center', width: 40, fontSize: 11, color: '#374151', fontWeight: 700 }}>IVA</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', width: 100, fontSize: 11, color: '#374151', fontWeight: 700 }}>Subtotal</th>
              <th style={{ padding: '8px 8px', width: 30 }}></th>
            </tr>
          </thead>
        </table>
        <div style={{ flex: 1, overflow: 'auto' }} ref={productoInputRef as any}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {lineas.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 8px', width: 100, color: '#6b7280', fontSize: 11 }}>{l.Codigo}</td>
                  <td style={{ padding: '4px 8px', fontWeight: 500 }}>{l.Nombre}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', width: 55, color: l.Existencia < l.Cantidad ? '#dc2626' : '#16a34a', fontWeight: 600, fontSize: 11 }}>{l.Existencia}</td>
                  <td style={{ padding: '3px 4px', textAlign: 'center', width: 65 }}>
                    <input type="text" defaultValue={String(l.Cantidad)} data-venta-cant={l.id}
                      onBlur={e => { const v = parseFloat(e.target.value) || 1; actualizarLinea(l.id, 'Cantidad', v); }}
                      onKeyDown={e => {
                        soloNum(e);
                        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); setTimeout(() => { const ci = document.querySelector('input[data-venta-codigo-input]') as HTMLInputElement; ci?.focus(); }, 50); }
                      }}
                      onFocus={e => e.target.select()}
                      style={{ width: 48, height: 24, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, fontWeight: 600, outline: 'none' }} />
                  </td>
                  <td style={{ padding: '3px 4px', textAlign: 'right', width: 95 }}>
                    <input type="text" defaultValue={String(l.PrecioVenta)}
                      onFocus={e => e.target.select()}
                      onBlur={e => { const v = parseFloat(e.target.value) || 0; actualizarLinea(l.id, 'PrecioVenta', v); e.target.value = v.toLocaleString('es-CO'); }}
                      onKeyDown={e => { soloNum(e); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      style={{ width: 80, height: 24, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none' }} />
                  </td>
                  <td style={{ padding: '3px 4px', textAlign: 'right', width: 75 }}>
                    <input type="text" defaultValue={l.Descuento > 0 ? String(l.Descuento) : ''} placeholder="0"
                      onFocus={e => e.target.select()}
                      onBlur={e => { const v = parseFloat(e.target.value) || 0; actualizarLinea(l.id, 'Descuento', v); }}
                      onKeyDown={e => { soloNum(e); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      style={{ width: 60, height: 24, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none' }} />
                  </td>
                  <td style={{ padding: '4px 4px', textAlign: 'center', width: 40, color: '#6b7280', fontSize: 10 }}>{l.Iva}%</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', width: 100, fontWeight: 700 }}>{fmtMon(l.Subtotal)}</td>
                  <td style={{ padding: '4px 4px', width: 30 }}>
                    <button onClick={() => eliminarLinea(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Fila de entrada - siempre visible */}
              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#fffbeb' }}>
                <td style={{ padding: '4px 8px', width: 100 }}>
                  <input type="text" data-venta-codigo-input="true" placeholder="Código..."
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const code = (e.target as HTMLInputElement).value.trim();
                        if (!code) return;
                        try {
                          const r = await fetch(`${API_VENTA}?buscar=${encodeURIComponent(code)}`);
                          const d = await r.json();
                          if (d.success && d.articulos.length > 0) {
                            const exact = d.articulos.find((a: any) => a.Codigo === code) || d.articulos[0];
                            agregarProducto(exact);
                            (e.target as HTMLInputElement).value = '';
                            // Focus cantidad of last added line
                            setTimeout(() => {
                              const cants = document.querySelectorAll('input[data-venta-cant]');
                              const last = cants[cants.length - 1] as HTMLInputElement;
                              last?.focus(); last?.select();
                            }, 50);
                          }
                        } catch (err) {}
                      }
                    }}
                    style={{ width: 85, height: 26, padding: '0 6px', border: '1px solid #7c3aed', borderRadius: 4, fontSize: 12, outline: 'none', fontWeight: 600 }}
                    autoFocus />
                </td>
                <td style={{ padding: '4px 8px', position: 'relative' }}>
                  <input type="text" placeholder="Buscar artículo por nombre..." data-venta-nombre-input="true"
                    value={buscarProducto}
                    onChange={e => buscarProductoFn(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown' && productoResults.length > 0) {
                        e.preventDefault();
                        const newIdx = Math.min((window as any).__prodIdx ?? -1, productoResults.length - 2) + 1;
                        (window as any).__prodIdx = newIdx;
                        setProductoResults([...productoResults]); // force re-render
                      }
                      if (e.key === 'ArrowUp' && productoResults.length > 0) {
                        e.preventDefault();
                        const newIdx = Math.max((window as any).__prodIdx ?? 0, 1) - 1;
                        (window as any).__prodIdx = newIdx;
                        setProductoResults([...productoResults]);
                      }
                      if (e.key === 'Enter' && productoResults.length > 0) {
                        const idx = (window as any).__prodIdx ?? 0;
                        agregarProducto(productoResults[idx]);
                        (e.target as HTMLInputElement).value = '';
                        (window as any).__prodIdx = 0;
                        setTimeout(() => {
                          const cants = document.querySelectorAll('input[data-venta-cant]');
                          const last = cants[cants.length - 1] as HTMLInputElement;
                          last?.focus(); last?.select();
                        }, 50);
                      }
                      if (e.key === 'Escape') { setShowProductoDropdown(false); setBuscarProducto(''); (window as any).__prodIdx = 0; }
                    }}
                    onFocus={() => { if (productoResults.length > 0) setShowProductoDropdown(true); (window as any).__prodIdx = 0; }}
                    style={{ width: '100%', height: 26, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none' }} />
                  {showProductoDropdown && productoResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 220, overflow: 'auto', zIndex: 100 }}>
                      {productoResults.map((a: any, i: number) => {
                        const selected = i === ((window as any).__prodIdx ?? 0);
                        return (
                          <div key={a.Items} onClick={() => { agregarProducto(a); (window as any).__prodIdx = 0;
                            setTimeout(() => { const cants = document.querySelectorAll('input[data-venta-cant]'); const last = cants[cants.length - 1] as HTMLInputElement; last?.focus(); last?.select(); }, 50);
                          }}
                            style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6, background: selected ? '#f3e8ff' : '' }}>
                            <span style={{ color: '#6b7280', width: 80, flexShrink: 0, fontSize: 11 }}>{a.Codigo}</span>
                            <span style={{ fontWeight: selected ? 700 : 500, flex: 1 }}>{a.Nombres_Articulo}</span>
                            <span style={{ color: a.Existencia > 0 ? '#16a34a' : '#dc2626', fontWeight: 600, width: 40, textAlign: 'right', fontSize: 11 }}>{a.Existencia}</span>
                            <span style={{ fontWeight: 700, color: '#7c3aed', width: 80, textAlign: 'right', fontSize: 11 }}>{fmtMon(a.Precio_Venta)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td colSpan={7} style={{ padding: '4px 8px', fontSize: 10, color: '#9ca3af' }}>
                  F1/F2/F3: Precio | F9: Finalizar
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: totales + botones */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', marginTop: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          <span style={{ fontWeight: 600 }}>{lineas.length}</span> producto(s)
          {' '} | Cant: <span style={{ fontWeight: 600 }}>{lineas.reduce((s, l) => s + l.Cantidad, 0)}</span>
        </div>
        <div>
          <label style={{ fontSize: 9, color: '#6b7280' }}>DESC. GLOBAL</label>
          <input type="text" value={descuentoGlobal || ''} placeholder="0"
            onChange={e => setDescuentoGlobal(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            style={{ display: 'block', height: 26, width: 80, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, padding: '0 6px' }} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
          {descuentoGlobal > 0 && <div><span style={{ color: '#6b7280' }}>Desc:</span> <span style={{ color: '#d97706', fontWeight: 600 }}>-{fmtMon(descuentoGlobal)}</span></div>}
          {totalIva > 0 && <div><span style={{ color: '#6b7280' }}>IVA:</span> <span style={{ fontWeight: 600 }}>{fmtMon(totalIva)}</span></div>}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{fmtMon(total)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={nueva} style={{ height: 32, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Nueva
          </button>
          <button onClick={finalizar} disabled={guardando || lineas.length === 0}
            style={{ height: 32, padding: '0 16px', background: lineas.length > 0 ? '#16a34a' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: lineas.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.6 : 1 }}>
            <Save size={14} /> Finalizar (F9)
          </button>
        </div>
      </div>

      {/* Modal de Pago */}
      {showPagoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPagoModal(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Guardar Factura</span>
              <button onClick={() => setShowPagoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* Total a pagar */}
              <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#f0fdf4', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>TOTAL A PAGAR</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{fmtMon(total)}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{tipo} — {cliente.nombre}</div>
              </div>

              {tipo === 'Contado' ? (
                /* CONTADO: transferencia primero, efectivo después */
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>Seleccione forma de pago</div>

                  {/* 1. Transferencia (primero - valor exacto) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏦</div>
                    <div style={{ flex: 1 }}>
                      <select value={pagoMedioTransf} onChange={e => setPagoMedioTransf(parseInt(e.target.value))}
                        style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 4px' }}>
                        <option value={1}>Tarjeta</option>
                        <option value={2}>Bancolombia</option>
                        <option value={3}>Nequi</option>
                      </select>
                    </div>
                    <input type="text" placeholder="$ 0" value={pagoTransferencia}
                      onChange={e => setPagoTransferencia(e.target.value.replace(/[^0-9]/g, ''))}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') { const next = document.querySelector('[data-pago-efectivo]') as HTMLInputElement; next?.focus(); next?.select(); } }}
                      style={{ width: 130, height: 32, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 10px', outline: 'none' }} />
                  </div>

                  {/* 2. Efectivo (segundo - puede ser más que el restante → genera cambio) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Efectivo</div>
                      {pagoTransfNum > 0 && <div style={{ fontSize: 10, color: '#6b7280' }}>Restante: {fmtMon(Math.max(total - pagoTransfNum, 0))}</div>}
                    </div>
                    <input type="text" data-pago-efectivo="true"
                      placeholder={pagoTransfNum > 0 ? fmtMon(Math.max(total - pagoTransfNum, 0)) : fmtMon(total)}
                      value={pagoEfectivo}
                      onChange={e => setPagoEfectivo(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') confirmarVenta(); }}
                      style={{ width: 130, height: 32, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 10px', outline: 'none' }} />
                  </div>

                  {/* Resumen */}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>Total factura:</span><span style={{ fontWeight: 600 }}>{fmtMon(total)}</span>
                    </div>
                    {pagoTransfNum > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>Transferencia:</span><span>{fmtMon(pagoTransfNum)}</span>
                    </div>}
                    {pagoEfectivoNum > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>Efectivo:</span><span>{fmtMon(pagoEfectivoNum)}</span>
                    </div>}
                    {faltaPagar > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#dc2626', fontWeight: 700, marginBottom: 4, padding: '4px 0', background: '#fef2f2', borderRadius: 6, paddingLeft: 8, paddingRight: 8 }}>
                      <span>Falta pagar:</span><span>{fmtMon(faltaPagar)}</span>
                    </div>}
                    {cambioPago > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 4, padding: '8px 10px', borderTop: '3px solid #2563eb', background: '#eff6ff', borderRadius: 8 }}>
                      <span>CAMBIO:</span><span>{fmtMon(cambioPago)}</span>
                    </div>}
                  </div>
                </div>
              ) : (
                /* CRÉDITO: abono inicial */
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>Abono inicial (opcional)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💰</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Abono</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Deje en 0 si no hay abono</div>
                    </div>
                    <input type="text" placeholder="$ 0" value={pagoAbono}
                      onChange={e => setPagoAbono(e.target.value.replace(/[^0-9]/g, ''))}
                      autoFocus
                      style={{ width: 130, height: 32, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 10px', outline: 'none' }} />
                  </div>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>Total factura:</span><span style={{ fontWeight: 600 }}>{fmtMon(total)}</span>
                    </div>
                    {pagoAbonoNum > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>Abono:</span><span style={{ color: '#16a34a', fontWeight: 600 }}>-{fmtMon(pagoAbonoNum)}</span>
                    </div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#dc2626', marginTop: 4, padding: '6px 0', borderTop: '2px solid #dc2626' }}>
                      <span>Saldo pendiente:</span><span>{fmtMon(Math.max(total - pagoAbonoNum, 0))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowPagoModal(false)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> Cerrar
              </button>
              <button onClick={confirmarVenta} disabled={guardando || (tipo === 'Contado' && faltaPagar > 0)}
                style={{
                  height: 34, padding: '0 20px',
                  background: (tipo === 'Contado' && faltaPagar > 0) ? '#d1d5db' : '#16a34a',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                  cursor: (tipo === 'Contado' && faltaPagar > 0) ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.6 : 1
                }}>
                <Save size={15} /> Guardar Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
