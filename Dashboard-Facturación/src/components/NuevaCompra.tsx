import { useState, useEffect, useRef, Fragment } from 'react';
import { Search, Trash2, Plus, Save, X, Package, Landmark, CreditCard, Smartphone, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import { EditarArticuloModal } from './EditarArticuloModal';
import { useAuth } from '../contexts/AuthContext';
import { getConfigImpresion } from './ConfiguracionSistema';

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
  // Si true, el usuario editó manualmente FleteUnit (ej. flete por peso).
  // El recálculo automático de prorrateo respeta este valor y solo distribuye
  // el flete restante entre las líneas no marcadas.
  FleteManual?: boolean;
  RequiereLote?: number;
  FechaVencimiento?: string;
  NumeroLote?: string;
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
  const { user } = useAuth();
  // Si el negocio NO maneja lotes/vencimientos (boutique, ferretería, accesorios),
  // ignoramos completamente el flag requiere_lote del catálogo: no se muestra
  // la fila de vencimiento ni el badge "PERECEDERO". Se activa en
  // Configuración → Módulos opcionales del negocio → "Fechas de vencimiento / Lotes".
  const usarLotes = getConfigImpresion().usarLotes;
  const saved = pedidoEditar ? null : loadSaved();
  const [pedidoN, setPedidoN] = useState(pedidoEditar || 0);
  const [modoEdicion, setModoEdicion] = useState(!!pedidoEditar);
  const [tipo, setTipo] = useState(saved?.tipo || 'Crédito');
  const [dias, setDias] = useState(saved?.dias || 30);
  const [fecha, setFecha] = useState<string>(saved?.fecha || new Date().toISOString().slice(0, 10));
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
  // Medio de pago para compras al contado (mismo esquema que ventas).
  // 0=Efectivo, 1=Tarjeta, 2=Bancolombia, 3=Nequi. Solo el efectivo
  // descuenta la caja; los demás quedan como egreso registrado.
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [medioPago, setMedioPago] = useState(0);
  const searchTimer = useRef<any>(null);
  const codigoRef = useRef<HTMLInputElement>(null);
  const buscarInputRef = useRef<HTMLInputElement>(null);

  // Persistir en localStorage
  useEffect(() => {
    const data = { tipo, dias, fecha, facturaCompra, proveedor, opcionIva, lineas, flete, descuento, retencion };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }, [tipo, dias, fecha, facturaCompra, proveedor, opcionIva, lineas, flete, descuento, retencion]);

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
      if (c.Fecha) setFecha(String(c.Fecha).slice(0, 10));
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
    // art.Precio_Costo ahora viene CON IVA. Calculamos sin IVA dividiendo.
    const costoAntConIva = art.Precio_Costo || 0;
    // IVA por defecto: el de la última compra de este producto (si existe),
    // si no, el del catálogo. Útil para clientes Régimen Simple que ponen
    // Iva=0 en catálogo pero deben digitar el IVA real del proveedor.
    const ivaPct = (art.last_iva_compra !== null && art.last_iva_compra !== undefined)
      ? art.last_iva_compra
      : (art.Iva || 0);
    const costoAntSinIva = ivaPct > 0 ? costoAntConIva / (1 + ivaPct / 100) : costoAntConIva;
    const ivaVal = costoAntConIva - costoAntSinIva;
    const nueva: LineaCompra = {
      id: ++lid, IdDetalle: 0, Items: art.Items, Codigo: art.Codigo, Nombre: art.Nombres_Articulo,
      Existencia: art.Existencia, Cantidad: 1,
      CostoSinIva: Math.round(costoAntSinIva * 100) / 100,
      IvaPct: ivaPct,
      IvaVal: Math.round(ivaVal * 100) / 100,
      CostoConIva: costoAntConIva,
      FleteUnit: 0,
      // CostoFinal/Anterior/Promedio se manejan en base CON IVA (coinciden con Precio_Costo)
      CostoFinal: costoAntConIva,
      CostoAnterior: costoAntConIva,
      CostoPromedio: costoAntConIva,
      PrecioVenta: art.Precio_Venta || 0,
      Subtotal: costoAntConIva,
      RequiereLote: (usarLotes && art.requiere_lote) ? 1 : 0,
      FechaVencimiento: '',
      NumeroLote: '',
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
        } else if (field === 'FleteUnit') {
          // Edición manual del flete (ej. flete por peso). Marca la línea
          // como FleteManual para que el recálculo automático la respete.
          u.FleteManual = true;
        } else {
          u.IvaVal = u.CostoSinIva * (u.IvaPct / 100);
          u.CostoConIva = u.CostoSinIva + u.IvaVal;
        }
        u.Subtotal = u.Cantidad * u.CostoConIva;
        return u;
      });

      // Second pass: redistribute flete. Las líneas con FleteManual=true
      // conservan su FleteUnit; solo se distribuye el flete restante entre
      // las demás según proporción de subtotal.
      // CostoFinal y CostoPromedio se calculan en base CON IVA + flete.
      const fleteManualTotal = updated.reduce((s, l) =>
        s + (l.FleteManual ? (l.FleteUnit || 0) * (l.Cantidad || 0) : 0), 0);
      const fleteAuto = Math.max(0, flete - fleteManualTotal);
      const totalSubAuto = updated.reduce((s, l) =>
        s + (l.FleteManual ? 0 : l.Subtotal), 0);
      updated = updated.map(l => {
        let fleteU = l.FleteUnit || 0;
        if (!l.FleteManual) {
          fleteU = 0;
          if (fleteAuto > 0 && totalSubAuto > 0 && l.Cantidad > 0) {
            const prop = l.Subtotal / totalSubAuto;
            fleteU = Math.round(((fleteAuto * prop) / l.Cantidad) * 100) / 100;
          }
        }
        const cf = Math.round((l.CostoConIva + fleteU) * 100) / 100;
        const nuevaExist = l.Existencia + l.Cantidad;
        const prom = nuevaExist > 0
          ? Math.round(((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist) * 100) / 100
          : cf;
        return { ...l, FleteUnit: fleteU, CostoFinal: cf, CostoPromedio: prom };
      });

      // Cuando el usuario edita manualmente FleteUnit, el flete global debe
      // reflejar la suma real de las líneas — no acumular sobre el residual
      // del state anterior. Programamos setFlete en microtask para que corra
      // después de este setLineas y el useEffect([flete]) no genere loop
      // (las líneas manual conservan su FleteUnit, las auto respetan
      // fleteAuto = flete - fleteManualTotal → 0 cuando todas son manuales).
      if (field === 'FleteUnit') {
        const nuevoTotal = Math.round(
          updated.reduce((s, l) => s + (l.FleteUnit || 0) * (l.Cantidad || 0), 0)
        );
        queueMicrotask(() => setFlete(nuevoTotal));
      }

      return updated;
    });
  };

  // Re-prorrateo del flete cuando cambia el valor global (input "FLETE" del
  // footer). Antes: se cambiaba `flete` pero las líneas guardaban su
  // FleteUnit viejo → la pantalla mostraba prorrateo desactualizado hasta
  // que el usuario tocaba una línea; sin embargo el backend recalculaba con
  // el flete nuevo, así que quedaba discrepancia visible entre UI y BD.
  // Ahora cuando `flete` cambia, se re-prorratea el FleteUnit de todas las
  // líneas no-manuales, igual que hace `actualizarLinea` en su second pass.
  useEffect(() => {
    setLineas(prev => {
      if (prev.length === 0) return prev;
      const fleteManualTotal = prev.reduce((s, l) =>
        s + (l.FleteManual ? (l.FleteUnit || 0) * (l.Cantidad || 0) : 0), 0);
      const fleteAuto = Math.max(0, flete - fleteManualTotal);
      const totalSubAuto = prev.reduce((s, l) =>
        s + (l.FleteManual ? 0 : l.Subtotal), 0);
      return prev.map(l => {
        let fleteU = l.FleteUnit || 0;
        if (!l.FleteManual) {
          fleteU = 0;
          if (fleteAuto > 0 && totalSubAuto > 0 && l.Cantidad > 0) {
            const prop = l.Subtotal / totalSubAuto;
            fleteU = Math.round(((fleteAuto * prop) / l.Cantidad) * 100) / 100;
          }
        }
        const cf = Math.round((l.CostoConIva + fleteU) * 100) / 100;
        const nuevaExist = l.Existencia + l.Cantidad;
        const prom = nuevaExist > 0
          ? Math.round(((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist) * 100) / 100
          : cf;
        return { ...l, FleteUnit: fleteU, CostoFinal: cf, CostoPromedio: prom };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flete]);

  // Reinterpretar precios al cambiar Modo IVA — evita re-digitar cada precio.
  //   0 → 1 (sin → con IVA): lo que estaba en "Costo s/IVA" pasa a "Costo c/IVA"
  //                          y "Costo s/IVA" se recalcula dividiendo por (1+IVA%)
  //   1 → 0 (con → sin IVA): inverso simétrico, así un doble toggle restaura
  // Solo se dispara cuando el usuario cambia el select (no al montar el componente).
  const prevOpcionIvaRef = useRef(opcionIva);
  useEffect(() => {
    const prev = prevOpcionIvaRef.current;
    if (prev === opcionIva) return;
    prevOpcionIvaRef.current = opcionIva;
    setLineas(prevLineas => prevLineas.map(l => {
      const factor = 1 + (l.IvaPct || 0) / 100;
      if (factor <= 0) return l;
      let nuevoSinIva: number, nuevoConIva: number;
      if (opcionIva === 1) {
        // Cambia a "con IVA incluido": el valor s/IVA actual se interpreta ahora como c/IVA
        nuevoConIva = l.CostoSinIva;
        nuevoSinIva = Math.round((nuevoConIva / factor) * 100) / 100;
      } else {
        // Cambia a "sin IVA": el valor c/IVA actual se interpreta ahora como s/IVA
        nuevoSinIva = l.CostoConIva;
        nuevoConIva = Math.round((nuevoSinIva * factor) * 100) / 100;
      }
      const nuevoIvaVal = Math.round((nuevoConIva - nuevoSinIva) * 100) / 100;
      // CostoFinal en base CON IVA + flete (consistente con Precio_Costo)
      const cf = Math.round((nuevoConIva + (l.FleteUnit || 0)) * 100) / 100;
      const nuevaExist = l.Existencia + l.Cantidad;
      const prom = nuevaExist > 0
        ? Math.round(((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist) * 100) / 100
        : cf;
      return {
        ...l,
        CostoSinIva: nuevoSinIva,
        CostoConIva: nuevoConIva,
        IvaVal: nuevoIvaVal,
        CostoFinal: cf,
        CostoPromedio: prom,
        Subtotal: l.Cantidad * nuevoConIva,
      };
    }));
  }, [opcionIva]);

  // Recalcular flete cuando cambia. CostoFinal/CostoPromedio en base CON IVA + flete.
  useEffect(() => {
    setLineas(prev => {
      if (prev.length === 0) return prev;
      if (flete <= 0) {
        // Si quitan el flete total, también limpia las marcas manuales
        return prev.map(l => {
          const cf = l.CostoConIva;
          const nuevaExist = l.Existencia + l.Cantidad;
          return { ...l, FleteUnit: 0, FleteManual: false, CostoFinal: cf, CostoPromedio: nuevaExist > 0 ? Math.round((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist * 100) / 100 : cf };
        });
      }
      // Respetar líneas con FleteManual=true; distribuir el resto proporcional
      const fleteManualTotal = prev.reduce((s, l) =>
        s + (l.FleteManual ? (l.FleteUnit || 0) * (l.Cantidad || 0) : 0), 0);
      const fleteAuto = Math.max(0, flete - fleteManualTotal);
      const totalSubAuto = prev.reduce((s, l) =>
        s + (l.FleteManual ? 0 : l.Subtotal), 0);
      return prev.map(l => {
        let fleteU = l.FleteUnit || 0;
        if (!l.FleteManual) {
          const prop = totalSubAuto > 0 ? l.Subtotal / totalSubAuto : 0;
          fleteU = l.Cantidad > 0 ? (fleteAuto * prop) / l.Cantidad : 0;
          fleteU = Math.round(fleteU * 100) / 100;
        }
        const cf = l.CostoConIva + fleteU;
        const nuevaExist = l.Existencia + l.Cantidad;
        const prom = nuevaExist > 0 ? (l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist : cf;
        return { ...l, FleteUnit: fleteU, CostoFinal: Math.round(cf * 100) / 100, CostoPromedio: Math.round(prom * 100) / 100 };
      });
    });
  }, [flete, lineas.length]);

  const eliminarLinea = (id: number) => setLineas(prev => prev.filter(l => l.id !== id));

  // Vuelve la línea al prorrateo automático del flete (quita la marca manual)
  // y re-distribuye el flete total entre todas las líneas no manuales.
  const resetFleteAuto = (id: number) => {
    setLineas(prev => {
      const next = prev.map(l => l.id === id ? { ...l, FleteManual: false } : l);
      // Re-prorratear con la nueva configuración
      const fleteManualTotal = next.reduce((s, l) =>
        s + (l.FleteManual ? (l.FleteUnit || 0) * (l.Cantidad || 0) : 0), 0);
      const fleteAuto = Math.max(0, flete - fleteManualTotal);
      const totalSubAuto = next.reduce((s, l) =>
        s + (l.FleteManual ? 0 : l.Subtotal), 0);
      return next.map(l => {
        let fleteU = l.FleteUnit || 0;
        if (!l.FleteManual) {
          fleteU = 0;
          if (fleteAuto > 0 && totalSubAuto > 0 && l.Cantidad > 0) {
            const prop = l.Subtotal / totalSubAuto;
            fleteU = Math.round(((fleteAuto * prop) / l.Cantidad) * 100) / 100;
          }
        }
        const cf = Math.round((l.CostoConIva + fleteU) * 100) / 100;
        const nuevaExist = l.Existencia + l.Cantidad;
        const prom = nuevaExist > 0
          ? Math.round(((l.Existencia * l.CostoAnterior + l.Cantidad * cf) / nuevaExist) * 100) / 100
          : cf;
        return { ...l, FleteUnit: fleteU, CostoFinal: cf, CostoPromedio: prom };
      });
    });
  };

  // Recarga la línea desde el catálogo cuando el usuario borró el precio sin querer.
  // Mantiene la cantidad y el lote actuales — solo refresca precios, IVA y existencia.
  const recargarLinea = async (id: number) => {
    const linea = lineas.find(l => l.id === id);
    if (!linea) return;
    try {
      const r = await fetch(`${API}?buscar=${encodeURIComponent(linea.Codigo)}`);
      const d = await r.json();
      const art = (d.articulos || []).find((a: any) => a.Items === linea.Items);
      if (!art) {
        toast.error(`No se encontró ${linea.Codigo} en el catálogo`);
        return;
      }
      const costoAntConIva = art.Precio_Costo || 0;
      const ivaPct = (art.last_iva_compra !== null && art.last_iva_compra !== undefined)
        ? art.last_iva_compra
        : (art.Iva || 0);
      const costoAntSinIva = ivaPct > 0 ? costoAntConIva / (1 + ivaPct / 100) : costoAntConIva;
      const ivaVal = costoAntConIva - costoAntSinIva;
      setLineas(prev => prev.map(l => l.id === id ? {
        ...l,
        Existencia: art.Existencia,
        CostoSinIva: Math.round(costoAntSinIva * 100) / 100,
        IvaPct: ivaPct,
        IvaVal: Math.round(ivaVal * 100) / 100,
        CostoConIva: costoAntConIva,
        CostoFinal: costoAntConIva + (l.FleteUnit || 0),
        CostoAnterior: costoAntConIva,
        CostoPromedio: costoAntConIva,
        PrecioVenta: art.Precio_Venta || l.PrecioVenta,
        Subtotal: l.Cantidad * costoAntConIva,
      } : l));
      toast.success(`${linea.Codigo} recargado`);
    } catch (e) {
      toast.error('Error al recargar producto');
    }
  };

  const actualizarLote = (id: number, field: 'FechaVencimiento' | 'NumeroLote', value: string) => {
    setLineas(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

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
    if (!fecha) { toast.error('Ingrese la fecha de la compra'); return; }
    // La fecha de vencimiento ya no es obligatoria. Si el producto está marcado
    // como perecedero pero no se ingresa fecha, simplemente NO se crea el lote
    // (la compra se guarda igual). Esto permite registrar compras de productos
    // que NO son realmente perecederos sin tener que ir a desactivar el flag.
    setGuardando(true);
    try {
      const body: any = {
        tipo, dias, fecha, proveedor_id: proveedor.id, factura_compra: facturaCompra,
        flete, descuento, retencion, opcion_factura: opcionIva,
        id_usuario: user?.id || 0, // para egreso automático en compra contado
        medio_pago: tipo === 'Contado' ? medioPago : 0,
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
        // Crear lotes para productos perecederos
        const perecederas = lineas.filter(l => l.RequiereLote && l.FechaVencimiento);
        if (perecederas.length > 0) {
          const pedidoCreado = d.Pedido_N || pedidoN || null;
          let okLotes = 0, failLotes = 0;
          for (const l of perecederas) {
            try {
              const rl = await fetch('http://localhost:80/conta-app-backend/api/lotes/index.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'crear',
                  items: l.Items,
                  fecha_vencimiento: l.FechaVencimiento,
                  cantidad: l.Cantidad,
                  numero_lote: l.NumeroLote || null,
                  pedido_n: pedidoCreado,
                  comentario: `Compra #${pedidoCreado || ''} — ${facturaCompra}`,
                })
              });
              const dl = await rl.json();
              if (dl.success) okLotes++; else failLotes++;
            } catch (e) { failLotes++; }
          }
          if (okLotes > 0) toast.success(`${okLotes} lote(s) registrados`);
          if (failLotes > 0) toast.error(`${failLotes} lote(s) fallaron — revisa Productos por Vencer`);
        }
        if (modoEdicion && onClose) {
          onClose();
        } else {
          setLineas([]); setFacturaCompra(''); setFlete(0); setDescuento(0); setRetencion(0);
          setProveedor({ id: 0, nombre: '', nit: '' });
          setPedidoN(0); setModoEdicion(false);
          setFecha(new Date().toISOString().slice(0, 10));
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
          <div title="Fecha de la factura del proveedor. Por defecto es hoy, pero puedes ingresar una fecha pasada si la factura llega tarde.">
            <label style={lbl}>FECHA FACTURA</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ ...inp, width: 130, fontWeight: 600 }} />
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
          {lineas.length > 0 && (
            <div title="Asigna el IVA seleccionado a TODAS las líneas (útil cuando toda la factura del proveedor está al mismo IVA)">
              <label style={lbl}>APLICAR IVA A TODOS</label>
              <div style={{ display: 'flex', gap: 2 }}>
                {[0, 5, 19].map(pct => (
                  <button key={pct} type="button"
                    onClick={() => {
                      setLineas(prev => prev.map(l => {
                        const ivaVal = l.CostoSinIva * (pct / 100);
                        return {
                          ...l,
                          IvaPct: pct,
                          IvaVal: Math.round(ivaVal * 100) / 100,
                          CostoConIva: Math.round((l.CostoSinIva + ivaVal) * 100) / 100,
                          Subtotal: Math.round(l.Cantidad * (l.CostoSinIva + ivaVal) * 100) / 100,
                        };
                      }));
                    }}
                    style={{
                      height: 28, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: pct === 0 ? '#f3f4f6' : pct === 5 ? '#fef3c7' : '#fee2e2',
                      color: pct === 0 ? '#6b7280' : pct === 5 ? '#92400e' : '#991b1b',
                    }}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}
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
                <th style={{ padding: '6px 6px', textAlign: 'left', width: 200 }}>Artículo</th>
                <th style={{ padding: '6px 6px', textAlign: 'center', width: 50 }}>Cant.</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80 }}>Costo s/IVA</th>
                <th style={{ padding: '6px 6px', textAlign: 'center', width: 40 }}>IVA%</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80 }}>Costo c/IVA</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80 }} title="Editable: si tu proveedor cobra flete por peso, puedes ajustar el flete por unidad de cada producto.">Flete/u</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80, color: '#16a34a' }} title="Costo final por unidad (con IVA + flete prorrateado). Es lo que entra al promedio ponderado del catálogo.">C. Final<br/><span style={{ fontSize: 8, fontWeight: 400, color: '#6b7280' }}>(c/IVA)</span></th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 75, color: '#6b7280' }} title="Precio_Costo actual del catálogo (con IVA)">C. Anterior</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80, color: '#2563eb' }} title="Promedio ponderado tras esta compra. Se guarda como Precio_Costo del artículo.">C. Promedio<br/><span style={{ fontSize: 8, fontWeight: 400, color: '#6b7280' }}>(c/IVA)</span></th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 80, color: '#7c3aed' }}>P. Venta</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: 115 }}>Subtotal</th>
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map(l => (
                <Fragment key={l.id}>
                <tr style={{ borderBottom: l.RequiereLote ? 'none' : '1px solid #f3f4f6' }}>
                  <td style={{ padding: '3px 6px', fontSize: 10 }}>
                    <button type="button" onClick={() => recargarLinea(l.id)}
                      title="Clic para recargar precios del catálogo (útil si borraste el costo sin querer)"
                      style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, fontSize: 10, fontFamily: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}>
                      {l.Codigo}
                    </button>
                  </td>
                  <td style={{ padding: '3px 6px', fontWeight: 500, fontSize: 11 }}>
                    {l.Nombre}
                    {l.RequiereLote ? <span style={{ marginLeft: 6, padding: '1px 6px', background: '#fef3c7', color: '#92400e', fontSize: 9, borderRadius: 3, fontWeight: 700 }}>PERECEDERO</span> : null}
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'center' }}>
                    <input type="text" defaultValue={String(l.Cantidad)} onBlur={e => actualizarLinea(l.id, 'Cantidad', parseFloat(e.target.value) || 1)} onFocus={e => e.target.select()} onKeyDown={soloNum}
                      style={{ width: 40, height: 22, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <input type="text" key={`siva-${l.id}-${l.CostoConIva}-${l.IvaPct}`}
                      {...moneyInputHandlers(l.CostoSinIva, v => actualizarLinea(l.id, 'CostoSinIva', v), l.CostoAnterior)}
                      style={{ width: 70, height: 22, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'center' }}>
                    <input type="text" key={`iva-${l.id}-${l.IvaPct}`}
                      defaultValue={String(l.IvaPct)} onBlur={e => actualizarLinea(l.id, 'IvaPct', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} onKeyDown={soloNum}
                      style={{ width: 32, height: 22, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <input type="text" key={`civa-${l.id}-${l.CostoSinIva}-${l.IvaPct}`}
                      {...moneyInputHandlers(Math.round(l.CostoConIva * 100) / 100, v => actualizarLinea(l.id, 'CostoConIva', v))}
                      style={{ width: 80, height: 22, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                  </td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      {l.FleteManual && (
                        <button type="button" title="Flete editado manualmente. Click para volver al prorrateo automático."
                          onClick={() => resetFleteAuto(l.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#d97706', padding: 0, fontSize: 10 }}>📌</button>
                      )}
                      {/* FleteUnit siempre habilitado: el usuario puede meter flete
                          por línea aunque el flete global sea 0 (patrón "flete por peso"
                          donde cada ítem tiene su propio costo de transporte). Al
                          editar manualmente, el flete global se sincroniza para
                          reflejar el total (ver actualizarLinea). */}
                      <input type="text" key={`flu-${l.id}-${l.FleteUnit}-${l.FleteManual ? 'm' : 'a'}`}
                        {...moneyInputHandlers(l.FleteUnit, v => actualizarLinea(l.id, 'FleteUnit', v))}
                        style={{
                          width: 60, height: 22, textAlign: 'right',
                          border: l.FleteManual ? '1px solid #d97706' : '1px solid #d1d5db',
                          background: l.FleteManual ? '#fffbeb' : '#fff',
                          color: l.FleteManual ? '#92400e' : '#d97706',
                          borderRadius: 4, fontSize: 10, fontWeight: l.FleteManual ? 700 : 400,
                        }} />
                    </div>
                  </td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: 11 }}>{fmtMon(l.CostoFinal)}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', color: '#9ca3af', fontSize: 10 }}>{fmtMon(l.CostoAnterior)}</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: 11 }}>{fmtMon(l.CostoPromedio)}</td>
                  <td style={{ padding: '2px 3px', textAlign: 'right' }}>
                    <input type="text" {...moneyInputHandlers(l.PrecioVenta, v => actualizarLinea(l.id, 'PrecioVenta', v))}
                      style={{ width: 70, height: 22, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#7c3aed', fontWeight: 600 }} />
                  </td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMon(l.Subtotal)}</td>
                  <td style={{ padding: '2px' }}><button onClick={() => eliminarLinea(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} color="#dc2626" /></button></td>
                </tr>
                {l.RequiereLote ? (
                  <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fffbeb' }}>
                    <td colSpan={2} style={{ padding: '3px 6px 5px 24px', fontSize: 10, color: '#92400e', fontWeight: 600 }}>
                      ↳ Lote / Vencimiento <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                    </td>
                    <td colSpan={11} style={{ padding: '3px 6px 5px 6px' }}>
                      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 10 }}>
                        <span style={{ color: '#92400e', fontWeight: 600 }}>Vence:</span>
                        <input type="date" value={l.FechaVencimiento || ''}
                          onChange={e => actualizarLote(l.id, 'FechaVencimiento', e.target.value)}
                          style={{ height: 22, padding: '0 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                        <span style={{ color: '#92400e', fontWeight: 600, marginLeft: 6 }}>N° Lote:</span>
                        <input type="text" placeholder="(opcional)" value={l.NumeroLote || ''}
                          onChange={e => actualizarLote(l.id, 'NumeroLote', e.target.value)}
                          style={{ width: 120, height: 22, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
                      </span>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
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
          {/* key={flete} fuerza re-mount cuando `flete` cambia externamente
              (ej. tras Guardar Compra o botón "+ Nueva" que hacen setFlete(0)
              o cuando se edita FleteUnit manual y el total se sincroniza).
              Con solo `defaultValue` el input mostraba el valor viejo. */}
          <input type="text" key={`flete-${flete}`} defaultValue={flete || ''} placeholder="0"
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
          <button
            onClick={() => {
              // Validaciones básicas antes de abrir el modal de pago
              if (!proveedor.id) { toast.error('Seleccione un proveedor'); return; }
              if (lineas.length === 0) { toast.error('Agregue al menos un producto'); return; }
              if (!facturaCompra) { toast.error('Ingrese el N° de factura del proveedor'); return; }
              // Modo edición o crédito: guarda directo. Contado nuevo:
              // abre modal para elegir medio de pago (efectivo/banco/etc).
              if (modoEdicion || tipo !== 'Contado') { guardar(); return; }
              setShowPagoModal(true);
            }}
            disabled={guardando || lineas.length === 0}
            style={{ height: 30, padding: '0 14px', background: lineas.length > 0 ? '#dc2626' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: lineas.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Save size={13} /> {modoEdicion ? 'Actualizar Compra' : (tipo === 'Contado' ? 'Registrar Pago' : 'Guardar Compra')}
          </button>
        </div>
      </div>

      {/* Modal Confirmar Pago (solo compras contado nuevas) */}
      {showPagoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
               onClick={() => { if (!guardando) setShowPagoModal(false); }} />
          <div style={{
            position: 'relative', background: '#fff', borderRadius: 14, width: 460,
            boxShadow: '0 25px 60px rgba(0,0,0,0.30)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Registrar Pago de la Compra</div>
                <div style={{ color: '#fecaca', fontSize: 11, marginTop: 2 }}>
                  {proveedor.nombre} · Factura {facturaCompra}
                </div>
              </div>
              <button
                onClick={() => { if (!guardando) setShowPagoModal(false); }}
                disabled={guardando}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 20px' }}>
              {/* Total a pagar */}
              <div style={{ textAlign: 'center', marginBottom: 16, padding: '14px 0', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                <div style={{ fontSize: 10, color: '#7f1d1d', letterSpacing: 1.5, fontWeight: 700 }}>TOTAL A PAGAR</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#dc2626', letterSpacing: -0.5, marginTop: 2 }}>{fmtMon(totalCompra)}</div>
              </div>

              {/* Medio de pago */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: 0.3 }}>
                ¿Con qué medio se pagó?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                {[
                  { id: 0, label: 'Efectivo',    hint: 'Descuenta caja',      Icon: Banknote,   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
                  { id: 1, label: 'Tarjeta',     hint: 'Débito o crédito',    Icon: CreditCard, color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
                  { id: 2, label: 'Bancolombia', hint: 'Transferencia',       Icon: Landmark,   color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
                  { id: 3, label: 'Nequi',       hint: 'Transferencia móvil', Icon: Smartphone, color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd' },
                ].map((m) => {
                  const active = medioPago === m.id;
                  const Icon = m.Icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMedioPago(m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: active ? m.bg : '#fff',
                        border: `2px solid ${active ? m.color : '#e5e7eb'}`,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: m.bg, border: `1px solid ${m.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={18} color={m.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: active ? m.color : '#111827', lineHeight: 1.1 }}>{m.label}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{m.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Aviso según el medio */}
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: medioPago === 0 ? '#f0fdf4' : '#eff6ff',
                borderRadius: 8, fontSize: 11,
                color: medioPago === 0 ? '#166534' : '#1e40af',
                border: `1px solid ${medioPago === 0 ? '#bbf7d0' : '#bfdbfe'}`,
              }}>
                {medioPago === 0
                  ? '💵 Se descontará el valor de tu caja abierta y quedará el egreso registrado.'
                  : '🏦 Queda como egreso registrado con el medio elegido. La caja física NO se afecta.'}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 18px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
            }}>
              <button
                onClick={() => { if (!guardando) setShowPagoModal(false); }}
                disabled={guardando}
                style={{ height: 34, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#374151', cursor: guardando ? 'not-allowed' : 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await guardar();
                  setShowPagoModal(false);
                }}
                disabled={guardando}
                style={{ height: 34, padding: '0 16px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.7 : 1 }}
              >
                <Save size={13} /> {guardando ? 'Registrando…' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

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
