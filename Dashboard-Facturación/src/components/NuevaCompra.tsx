import { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Plus, Save, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { EditarArticuloModal } from './EditarArticuloModal';

const API = 'http://localhost:80/conta-app-backend/api/compras/nueva.php';
const fmtMon = (v: number) => {
  if (v % 1 !== 0) return '$ ' + v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$ ' + Math.round(v).toLocaleString('es-CO');
};
const fmtDec = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface LineaCompra {
  id: number;
  IdDetalle: number; // 0 = nuevo, >0 = existente en DB
  Items: number; Codigo: string; Nombre: string;
  Existencia: number; Cantidad: number;
  CostoSinIva: number; IvaPct: number; IvaVal: number;
  CostoConIva: number; FleteUnit: number; CostoFinal: number;
  CostoAnterior: number; CostoPromedio: number;
  PrecioVenta: number; Subtotal: number;
}

let lid = Date.now();
const LS_KEY = 'compra_actual';

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function NuevaCompra({ pedidoEditar, onClose }: { pedidoEditar?: number; onClose?: () => void } = {}) {
  const saved = pedidoEditar ? null : loadSaved();
  const [pedidoN, setPedidoN] = useState(pedidoEditar || 0);
  const [modoEdicion, setModoEdicion] = useState(!!pedidoEditar);
  const [tipo, setTipo] = useState(saved?.tipo || 'Crédito');
  const [dias, setDias] = useState(saved?.dias || 30);
  const [facturaCompra, setFacturaCompra] = useState(saved?.facturaCompra || '');
  const [proveedor, setProveedor] = useState(saved?.proveedor || { id: 0, nombre: '', nit: '' });
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [showProvModal, setShowProvModal] = useState(false);
  const [provBusqueda, setProvBusqueda] = useState('');
  const [opcionIva, setOpcionIva] = useState(saved?.opcionIva || 0);
  const [lineas, setLineas] = useState<LineaCompra[]>(saved?.lineas || []);
  const [flete, setFlete] = useState(saved?.flete || 0);
  const [descuento, setDescuento] = useState(saved?.descuento || 0);
  const [retencion, setRetencion] = useState(saved?.retencion || 0);
  const [buscarProd, setBuscarProd] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [showProdDrop, setShowProdDrop] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [showCrearProducto, setShowCrearProducto] = useState(false);
  const searchTimer = useRef<any>(null);
  const codigoRef = useRef<HTMLInputElement>(null);
  const buscarInputRef = useRef<HTMLInputElement>(null);

  // Persistir en localStorage
  useEffect(() => {
    const data = { tipo, dias, facturaCompra, proveedor, opcionIva, lineas, flete, descuento, retencion };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }, [tipo, dias, facturaCompra, proveedor, opcionIva, lineas, flete, descuento, retencion]);

  useEffect(() => {
    fetch(`${API}?proveedores=1`).then(r => r.json()).then(d => { if (d.success) setProveedores(d.proveedores); });
  }, []);

  // Cargar compra para edición
  useEffect(() => {
    if (!pedidoEditar) return;
    fetch(`${API}?detalle=${pedidoEditar}`).then(r => r.json()).then(d => {
      if (!d.success) { toast.error(d.message); return; }
      const c = d.compra;
      setPedidoN(c.Pedido_N);
      setTipo(c.TipoPedido);
      setDias(c.Dias);
      setFacturaCompra(c.FacturaCompra_N);
      setProveedor({ id: c.CodigoPro, nombre: c.RazonSocial || '', nit: c.ProvNit || '' });
      setOpcionIva(c.opcion_factura || 0);
      setFlete(c.Flete);
      setDescuento(c.Descuento);
      setRetencion(c.Retencion);
      setLineas(d.detalle.map((det: any) => ({
        id: ++lid,
        IdDetalle: det.Id_DetallePedido,
        Items: det.Items, Codigo: det.Codigo, Nombre: det.Nombres_Articulo,
        Existencia: det.Existencia, Cantidad: det.Cantidad,
        CostoSinIva: det.CostoSinIva, IvaPct: det.IvaPct,
        IvaVal: det.CostoSinIva * (det.IvaPct / 100),
        CostoConIva: det.CostoConIva, FleteUnit: det.FleteUnit,
        CostoFinal: det.CostoFinal, CostoAnterior: det.CostoAnterior,
        CostoPromedio: det.CostoPromedio,
        PrecioVenta: det.PrecioV, Subtotal: det.Cantidad * det.CostoConIva
      })));
      setModoEdicion(true);
    });
  }, [pedidoEditar]);

  const buscarProducto = (q: string) => {
    setBuscarProd(q);
    if (q.length < 1) { setProdResults([]); setShowProdDrop(false); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`${API}?buscar=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.success) { setProdResults(d.articulos); setShowProdDrop(true); }
    }, 200);
  };

  const agregarProducto = (art: any) => {
    const existe = lineas.find(l => l.Items === art.Items);
    if (existe) {
      setLineas(prev => prev.map(l => l.Items === art.Items ? { ...l, Cantidad: l.Cantidad + 1, Subtotal: (l.Cantidad + 1) * l.CostoConIva } : l));
      setBuscarProd(''); setShowProdDrop(false);
      return;
    }
    const costoAnt = art.Precio_Costo || 0;
    const nueva: LineaCompra = {
      id: ++lid, IdDetalle: 0, Items: art.Items, Codigo: art.Codigo, Nombre: art.Nombres_Articulo,
      Existencia: art.Existencia, Cantidad: 1,
      CostoSinIva: costoAnt, IvaPct: art.Iva || 0, IvaVal: costoAnt * ((art.Iva || 0) / 100),
      CostoConIva: costoAnt * (1 + (art.Iva || 0) / 100), FleteUnit: 0,
      CostoFinal: costoAnt, CostoAnterior: costoAnt, CostoPromedio: costoAnt,
      PrecioVenta: art.Precio_Venta || 0, Subtotal: costoAnt * (1 + (art.Iva || 0) / 100)
    };
    setLineas(prev => [...prev, nueva]);
    setBuscarProd(''); setShowProdDrop(false);
  };

  const actualizarLinea = (id: number, field: string, value: number) => {
    setLineas(prev => {
      // First pass: update the changed field and recalculate IVA
      let updated = prev.map(l => {
        if (l.id !== id) return l;
        const u = { ...l, [field]: value };
        if (field === 'CostoConIva') {
          const factor = 1 + (u.IvaPct / 100);
          u.CostoSinIva = factor > 0 ? Math.round((u.CostoConIva / factor) * 100) / 100 : u.CostoConIva;
          u.IvaVal = u.CostoConIva - u.CostoSinIva;
        } else if (field === 'IvaPct' || field === 'CostoSinIva') {
          u.IvaVal = u.CostoSinIva * (u.IvaPct / 100);
          u.CostoConIva = u.CostoSinIva + u.IvaVal;
        } else {
          u.IvaVal = u.CostoSinIva * (u.IvaPct / 100);
          u.CostoConIva = u.CostoSinIva + u.IvaVal;
        }
        u.Subtotal = u.Cantidad * u.CostoConIva;
        return u;
      });

      // Second pass: redistribute flete across all lines
      const totalSub = updated.reduce((s, l) => s + l.Subtotal, 0);
      updated = updated.map(l => {
        let fleteU = 0;
        if (flete > 0 && totalSub > 0 && l.Cantidad > 0) {
          const prop = l.Subtotal / totalSub;
          fleteU = Math.round(((flete * prop) / l.Cantidad) * 100) / 100;
        }
        const cf = Math.round((l.CostoSinIva + fleteU) * 100) / 100;
        const nuevaExist = l.Existencia + l.Cantidad;
        const prom = nuevaExist > 0
          ? Math.round(((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist) * 100) / 100
          : cf;
        return { ...l, FleteUnit: fleteU, CostoFinal: cf, CostoPromedio: prom };
      });

      return updated;
    });
  };

  // Recalcular flete cuando cambia
  useEffect(() => {
    setLineas(prev => {
      if (prev.length === 0) return prev;
      if (flete <= 0) {
        return prev.map(l => {
          const cf = l.CostoSinIva;
          const nuevaExist = l.Existencia + l.Cantidad;
          return { ...l, FleteUnit: 0, CostoFinal: cf, CostoPromedio: nuevaExist > 0 ? Math.round((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist * 100) / 100 : cf };
        });
      }
      const totalItems = prev.reduce((s, l) => s + l.Subtotal, 0);
      return prev.map(l => {
        const prop = totalItems > 0 ? l.Subtotal / totalItems : 0;
        const fleteU = l.Cantidad > 0 ? (flete * prop) / l.Cantidad : 0;
        const cf = l.CostoSinIva + fleteU;
        const nuevaExist = l.Existencia + l.Cantidad;
        const prom = nuevaExist > 0 ? (l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist : cf;
        return { ...l, FleteUnit: Math.round(fleteU * 100) / 100, CostoFinal: Math.round(cf * 100) / 100, CostoPromedio: Math.round(prom * 100) / 100 };
      });
    });
  }, [flete, lineas.length]);

  const eliminarLinea = (id: number) => setLineas(prev => prev.filter(l => l.id !== id));

  const subtotalCompra = lineas.reduce((s, l) => s + l.Subtotal, 0);
  const totalIva = lineas.reduce((s, l) => s + l.IvaVal * l.Cantidad, 0);
  const totalCompra = subtotalCompra + flete - descuento;

  const guardar = async () => {
    if (!proveedor.id) { toast.error('Seleccione un proveedor'); return; }
    if (tipo === 'Crédito' && proveedor.id === 220500) {
      toast.error('El proveedor genérico "COMPRAS AL CONTADO" no puede usarse en compras a crédito. Seleccione un proveedor real para que aparezca en Cuentas por Pagar.', { duration: 6000 });
      return;
    }
    if (lineas.length === 0) { toast.error('Agregue al menos un producto'); return; }
    if (!facturaCompra) { toast.error('Ingrese el Nº de factura del proveedor'); return; }
    setGuardando(true);
    try {
      const body: any = {
        tipo, dias, proveedor_id: proveedor.id, factura_compra: facturaCompra,
        flete, descuento, retencion, opcion_factura: opcionIva,
        items: lineas.map(l => ({
          id_detalle: l.IdDetalle || 0,
          items: l.Items, cantidad: l.Cantidad, costo_sin_iva: l.CostoSinIva,
          iva_pct: l.IvaPct, precio_venta: l.PrecioVenta
        }))
      };
      if (modoEdicion && pedidoN > 0) body.pedido_n = pedidoN;

      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message, { duration: 5000 });
        if (modoEdicion && onClose) {
          onClose();
        } else {
          setLineas([]); setFacturaCompra(''); setFlete(0); setDescuento(0); setRetencion(0);
          setProveedor({ id: 0, nombre: '', nit: '' });
          setPedidoN(0); setModoEdicion(false);
          localStorage.removeItem(LS_KEY);
        }
      } else toast.error(d.message);
    } catch (e) { toast.error('Error al guardar'); }
    setGuardando(false);
  };

  const soloNum = (e: React.KeyboardEvent) => {
    const ok = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (!ok.includes(e.key) && !e.ctrlKey) e.preventDefault();
  };

  // Input con formato moneda: muestra formateado sin foco, número crudo con foco
  const moneyInputHandlers = (value: number, onChange: (v: number) => void, fallback?: number) => ({
    defaultValue: fmtMon(value),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => { e.target.value = String(value); e.target.select(); },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
      if (!isNaN(v) && v >= 0) { onChange(v); e.target.value = fmtMon(v); }
      else if (fallback !== undefined) { onChange(fallback); e.target.value = fmtMon(fallback); }
      else { e.target.value = fmtMon(value); }
    },
    onKeyDown: soloNum
  });

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 };

  const provFiltrados = provBusqueda ? proveedores.filter(p => p.RazonSocial?.toLowerCase().includes(provBusqueda.toLowerCase()) || String(p.CodigoPro).includes(provBusqueda)) : proveedores;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* Header: datos compra */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '8px 16px', marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0 }}>
        {modoEdicion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>Editando Compra #{pedidoN}</span>
            {onClose && <button onClick={onClose} style={{ marginLeft: 'auto', height: 26, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>← Volver al listado</button>}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
          <div>
            <label style={lbl}>Nº FACT. COMPRA</label>
            <input type="text" value={facturaCompra} onChange={e => setFacturaCompra(e.target.value)}
              style={{ ...inp, width: 120, fontWeight: 700 }} placeholder="Nº factura" />
          </div>
          <div>
            <label style={lbl}>TIPO</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inp, width: 90 }}>
              <option>Contado</option><option>Crédito</option>
            </select>
          </div>
          {tipo === 'Crédito' && <div>
            <label style={lbl}>DÍAS</label>
            <input type="text" value={dias} onChange={e => setDias(parseInt(e.target.value) || 0)} onKeyDown={soloNum} style={{ ...inp, width: 45, textAlign: 'center' }} />
          </div>}
          <div>
            <label style={lbl}>MODO IVA</label>
            <select value={opcionIva} onChange={e => setOpcionIva(parseInt(e.target.value))} style={{ ...inp, width: 180, fontSize: 11 }}>
              <option value={0}>Precio sin IVA</option>
              <option value={1}>Precio con IVA incluido</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#6b7280' }}>TOTAL COMPRA</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: totalCompra > 0 ? '#dc2626' : '#9ca3af', lineHeight: 1 }}>{fmtMon(totalCompra)}</div>
          </div>
        </div>

        {/* Proveedor */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div>
            <label style={lbl}>CÓDIGO</label>
            <input type="text" value={proveedor.id || ''} readOnly style={{ ...inp, width: 60, textAlign: 'center', fontWeight: 700, color: '#7c3aed', background: '#f9fafb' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>PROVEEDOR</label>
            <input type="text" value={proveedor.nombre} readOnly style={{ ...inp, width: '100%', background: '#f9fafb', fontWeight: 600 }} placeholder="Seleccione proveedor..." />
          </div>
          <button onClick={() => setShowProvModal(true)} style={{ width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={14} color="#7c3aed" />
          </button>
          <div>
            <label style={lbl}>NIT</label>
            <input type="text" value={proveedor.nit} readOnly style={{ ...inp, width: 110, background: '#f9fafb' }} />
          </div>
        </div>
        {tipo === 'Crédito' && proveedor.id === 220500 && (
          <div style={{ marginTop: 6, padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
            ⚠ Proveedor genérico no válido para compras a crédito. Seleccione un proveedor real para que la deuda aparezca en Cuentas por Pagar.
          </div>
        )}
      </div>

      {/* Tabla de items */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#fff', borderBottom: '3px solid #dc2626', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '6px 6px', textAlign: 'left', width: 90 }}>Código</th>
                <th style={{ padding: '6px 6px', textAlign: 'left' }}>Artículo</th>
                <th style={{ padding: '6px 6px', textAlign: 'center', width: 50 }}>Cant.</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80 }}>Costo s/IVA</th>
                <th style={{ padding: '6px 6px', textAlign: 'center', width: 40 }}>IVA%</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80 }}>Costo c/IVA</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 65 }}>Flete/u</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80, color: '#16a34a' }}>C. Final</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 75, color: '#6b7280' }}>C. Anterior</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80, color: '#2563eb' }}>C. Promedio</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80, color: '#7c3aed' }}>P. Venta</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 85 }}>Subtotal</th>
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '3px 6px', color: '#6b7280', fontSize: 10 }}>{l.Codigo}</td>
                  <td style={{ padding: '3px 6px', fontWeight: 500, fontSize: 11 }}>{l.Nombre}</td>
                  <td style={{ padding: '2px 3px', textAlign: 'center' }}>
                    <input type="text" defaultValue={String(l.Cantidad)} onBlur={e => actualizarLinea(l.id, 'Cantidad', parseFloat(e.target.value) || 1)} onFocus={e => e.target.select()} onKeyDown={soloNum}
                      style={{ width: 40, height: 22, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <input type="text" {...moneyInputHandlers(l.CostoSinIva, v => actualizarLinea(l.id, 'CostoSinIva', v), l.CostoAnterior)}
                      style={{ width: 70, height: 22, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'center' }}>
                    <input type="text" defaultValue={String(l.IvaPct)} onBlur={e => actualizarLinea(l.id, 'IvaPct', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} onKeyDown={soloNum}
                      style={{ width: 32, height: 22, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <input type="text" key={`civa-${l.id}-${l.CostoSinIva}-${l.IvaPct}`}
                      {...moneyInputHandlers(Math.round(l.CostoConIva * 100) / 100, v => actualizarLinea(l.id, 'CostoConIva', v))}
                      style={{ width: 80, height: 22, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontSize: 10, color: flete > 0 ? '#d97706' : '#d1d5db' }}>{l.FleteUnit > 0 ? fmtMon(l.FleteUnit) : '-'}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: 11 }}>{fmtMon(l.CostoFinal)}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', color: '#9ca3af', fontSize: 10 }}>{fmtMon(l.CostoAnterior)}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: 11 }}>{fmtMon(l.CostoPromedio)}</td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <input type="text" {...moneyInputHandlers(l.PrecioVenta, v => actualizarLinea(l.id, 'PrecioVenta', v))}
                      style={{ width: 70, height: 22, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#7c3aed', fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700 }}>{fmtMon(l.Subtotal)}</td>
                  <td style={{ padding: '2px' }}><button onClick={() => eliminarLinea(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} color="#dc2626" /></button></td>
                </tr>
              ))}
              {/* Fila entrada */}
              <tr style={{ background: '#fef2f2', borderBottom: '2px solid #e5e7eb' }}>
                <td style={{ padding: '4px 6px' }}>
                  <input type="text" ref={codigoRef} placeholder="Código..." onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      const code = (e.target as HTMLInputElement).value.trim();
                      if (!code) return;
                      const r = await fetch(`${API}?buscar=${encodeURIComponent(code)}`);
                      const d = await r.json();
                      if (d.success && d.articulos.length > 0) {
                        agregarProducto(d.articulos.find((a: any) => a.Codigo === code) || d.articulos[0]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }} style={{ width: 80, height: 24, padding: '0 4px', border: '1px solid #dc2626', borderRadius: 4, fontSize: 11, fontWeight: 600 }} />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input type="text" ref={buscarInputRef} placeholder="Buscar por nombre..." value={buscarProd}
                    onChange={e => buscarProducto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && prodResults.length > 0) { agregarProducto(prodResults[0]); } if (e.key === 'Escape') { setShowProdDrop(false); setBuscarProd(''); } }}
                    style={{ width: '100%', height: 24, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  {showProdDrop && buscarInputRef.current && (() => {
                    const rect = buscarInputRef.current!.getBoundingClientRect();
                    return (
                      <div style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 500), background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 250, overflow: 'auto', zIndex: 9999 }}>
                        {prodResults.length > 0 ? prodResults.map(a => (
                          <div key={a.Items} onClick={() => agregarProducto(a)}
                            style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 6 }}
                            onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                            <span style={{ color: '#6b7280', width: 85, flexShrink: 0, fontSize: 11 }}>{a.Codigo}</span>
                            <span style={{ flex: 1, fontWeight: 500 }}>{a.Nombres_Articulo}</span>
                            <span style={{ color: '#16a34a', fontWeight: 600, width: 40, textAlign: 'right' }}>{a.Existencia}</span>
                            <span style={{ color: '#dc2626', fontWeight: 600, width: 80, textAlign: 'right' }}>{fmtMon(a.Precio_Costo)}</span>
                          </div>
                        )) : buscarProd.length >= 2 && (
                          <div style={{ padding: '12px 10px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                            No se encontró "{buscarProd}"
                          </div>
                        )}
                        {buscarProd.length >= 1 && (
                          <div onClick={() => { setShowProdDrop(false); setBuscarProd(''); setShowCrearProducto(true); }}
                            style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontWeight: 600, background: '#f9fafb' }}
                            onMouseOver={e => (e.currentTarget.style.background = '#f3e8ff')} onMouseOut={e => (e.currentTarget.style.background = '#f9fafb')}>
                            <span style={{ fontSize: 14 }}>+</span> Crear nuevo producto
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td colSpan={10} style={{ padding: '4px 6px', fontSize: 10, color: '#9ca3af' }}>Enter para agregar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* Footer: flete, descuento, retención, totales */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '8px 16px', marginTop: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}><b>{lineas.length}</b> producto(s)</div>
        <div>
          <label style={lbl}>FLETE</label>
          <input type="text" defaultValue={flete || ''} placeholder="0"
            onBlur={e => setFlete(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            onKeyDown={e => { soloNum(e); if (e.key === 'Enter') { setFlete(parseInt((e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')) || 0); (e.target as HTMLInputElement).blur(); } }}
            style={{ ...inp, width: 80, textAlign: 'right', fontSize: 11 }} />
        </div>
        <div>
          <label style={lbl}>DESCUENTO</label>
          <input type="text" value={descuento || ''} onChange={e => setDescuento(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} onKeyDown={soloNum} placeholder="0"
            style={{ ...inp, width: 80, textAlign: 'right', fontSize: 11 }} />
        </div>
        <div>
          <label style={lbl}>RETENCIÓN</label>
          <input type="text" value={retencion || ''} onChange={e => setRetencion(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} onKeyDown={soloNum} placeholder="0"
            style={{ ...inp, width: 80, textAlign: 'right', fontSize: 11 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12 }}>
          {totalIva > 0 && <div><span style={{ color: '#6b7280' }}>IVA:</span> <b>{fmtMon(totalIva)}</b></div>}
          {flete > 0 && <div><span style={{ color: '#d97706' }}>Flete:</span> <b>{fmtMon(flete)}</b></div>}
          {descuento > 0 && <div><span style={{ color: '#16a34a' }}>Desc:</span> <b>-{fmtMon(descuento)}</b></div>}
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{fmtMon(totalCompra)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setLineas([]); setFlete(0); setDescuento(0); setRetencion(0); setFacturaCompra(''); setProveedor({ id: 0, nombre: '', nit: '' }); localStorage.removeItem(LS_KEY); }}
            style={{ height: 30, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={13} /> Nueva
          </button>
          <button onClick={guardar} disabled={guardando || lineas.length === 0}
            style={{ height: 30, padding: '0 14px', background: lineas.length > 0 ? '#dc2626' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: lineas.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Save size={13} /> {modoEdicion ? 'Actualizar Compra' : 'Guardar Compra'}
          </button>
        </div>
      </div>

      {/* Modal buscar proveedor */}
      {showProvModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowProvModal(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 480, maxHeight: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Buscar Proveedor</span>
              <button onClick={() => setShowProvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '10px 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input type="text" placeholder="Nombre o código..." value={provBusqueda} onChange={e => setProvBusqueda(e.target.value)} autoFocus
                  style={{ width: '100%', height: 34, paddingLeft: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', maxHeight: 280 }}>
              {provFiltrados.map((p: any) => (
                <div key={p.CodigoPro} onClick={() => { setProveedor({ id: p.CodigoPro, nombre: p.RazonSocial?.trim(), nit: p.Nit || '' }); setShowProvModal(false); setProvBusqueda(''); codigoRef.current?.focus(); }}
                  style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10 }}
                  onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <span style={{ color: '#dc2626', fontWeight: 700, width: 55 }}>{p.CodigoPro}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{p.RazonSocial?.trim()}</span>
                  <span style={{ color: '#6b7280' }}>{p.Nit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal crear producto rápido */}
      {showCrearProducto && (
        <EditarArticuloModal
          isOpen={true}
          onClose={() => setShowCrearProducto(false)}
          articulo={null}
          onGuardado={async (nuevoProducto?: any) => {
            setShowCrearProducto(false);
            if (nuevoProducto?.Items) {
              try {
                const r = await fetch(`${API}?buscar=${nuevoProducto.Codigo || nuevoProducto.Items}`);
                const d = await r.json();
                if (d.success && d.articulos?.length > 0) {
                  agregarProducto(d.articulos[0]);
                  toast.success('Producto creado y agregado');
                } else {
                  toast.success('Producto creado. Búsquelo para agregarlo.');
                }
              } catch (e) { toast.success('Producto creado'); }
            } else {
              toast.success('Producto creado. Búsquelo para agregarlo.');
            }
          }}
          modo="nuevo"
        />
      )}
    </div>
  );
}
