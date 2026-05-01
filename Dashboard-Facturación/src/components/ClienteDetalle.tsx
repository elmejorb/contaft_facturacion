import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { X, FileText, ShoppingBag, BarChart3, DollarSign, Receipt, CreditCard, Wallet, Save, CheckCircle, Search, Ban, Pencil, Printer } from 'lucide-react';
import { ReciboImpresion } from './ReciboImpresion';
import { getConfigImpresion } from './ConfiguracionSistema';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { hoyLocal, inicioMesLocal, fechaLocal } from '../utils/fecha';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/clientes/detalle.php';
const API_PAGOS = 'http://localhost:80/conta-app-backend/api/clientes/pagos.php';

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Props {
  clienteId: number;
  onClose: () => void;
  tabInicial?: 'ventas' | 'pagar' | 'historial' | 'productos' | 'grafico';
}

export function ClienteDetalle({ clienteId, onClose, tabInicial = 'ventas' }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ventas' | 'productos' | 'grafico' | 'pagar' | 'historial'>(tabInicial);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<number | null>(null);
  const [filtroHistorial, setFiltroHistorial] = useState('');

  // Pagos state
  const [pagosData, setPagosData] = useState<any>(null);
  const [abonos, setAbonos] = useState<Map<number, number>>(new Map());
  const [medioPago, setMedioPago] = useState(0);
  const [fechaPago, setFechaPago] = useState(hoyLocal());
  const [reciboImprimir, setReciboImprimir] = useState<any>(null);
  const [pagoGlobal, setPagoGlobal] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [pagoSuccess, setPagoSuccess] = useState('');
  const [pagoError, setPagoError] = useState('');

  const cargar = async (year: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?id=${clienteId}&anio=${year}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarPagos = async () => {
    try {
      const r = await fetch(`${API_PAGOS}?cliente=${clienteId}`);
      const d = await r.json();
      if (d.success) { setPagosData(d); setAbonos(new Map()); setPagoGlobal(''); setDescuentoGlobal(''); }
    } catch (e) { console.error(e); }
  };

  const distribuirPagoGlobal = (valor: number) => {
    if (!pagosData?.pendientes) return;
    const newAbonos = new Map<number, number>();
    let restante = valor;
    for (const f of pagosData.pendientes) {
      if (restante <= 0) break;
      const pago = Math.min(restante, f.Saldo);
      newAbonos.set(f.Factura_N, pago);
      restante -= pago;
    }
    setAbonos(newAbonos);
  };

  const descGlobal = parseInt(descuentoGlobal.replace(/[^0-9]/g, '') || '0');

  // Calcular descuento proporcional por factura
  const calcDescuentoPorFactura = (factN: number): number => {
    if (descGlobal <= 0 || totalAbonos <= 0) return 0;
    const abono = abonos.get(factN) || 0;
    if (abono <= 0) return 0;
    return Math.round((abono / totalAbonos) * descGlobal);
  };

  const guardarPagos = async () => {
    const pagosArr = Array.from(abonos.entries())
      .filter(([_, v]) => v > 0)
      .map(([factN, valor]) => ({ factura_n: factN, valor, descuento: calcDescuentoPorFactura(factN) }));
    if (pagosArr.length === 0) { setPagoError('Ingrese al menos un valor'); return; }
    setGuardandoPago(true); setPagoError('');
    try {
      const r = await fetch(API_PAGOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pagar', cliente: clienteId, pagos: pagosArr, medio_pago: medioPago, fecha: fechaPago, id_usuario: user?.id || 0 })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setAbonos(new Map());
        setPagoGlobal('');
        setDescuentoGlobal('');
        setFormVersion(v => v + 1);
        cargarPagos();
        cargar(anio);
        // Preguntar si imprimir recibo
        if (confirm('Pago registrado. ¿Desea imprimir el recibo?')) {
          const cfg = getConfigImpresion();
          const pagoData = {
            RecCajaN: d.recibo,
            Fecha: fechaPago + ' ' + new Date().toLocaleTimeString('es-CO'),
            NFactAnt: pagosArr.map((p: any) => p.factura_n).join(', '),
            ValorPago: d.total_pagado,
            SaldoAct: 0,
            Descuento: descGlobal,
            MedioPago: mediosPago.find((m: any) => m.id_mediopago === medioPago)?.nombre_medio || 'Efectivo',
            DetallePago: `Pago de ${d.facturas_afectadas} factura(s)`
          };
          setReciboImprimir({ pago: pagoData, formato: cfg.formatoPago });
        }
      } else { setPagoError(d.message); }
    } catch (e) { setPagoError('Error al guardar pagos'); }
    setGuardandoPago(false);
  };

  const anularPago = async (idPago: number, recibo: number) => {
    if (!confirm(`¿Anular el pago Recibo #${recibo}? Se restaurará el saldo de la factura.`)) return;
    try {
      const r = await fetch(API_PAGOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id_pago: idPago })
      });
      const d = await r.json();
      if (d.success) {
        setPagoSuccess(d.message);
        setTimeout(() => setPagoSuccess(''), 5000);
        cargarPagos();
        cargar(anio);
      } else { setPagoError(d.message); }
    } catch (e) { setPagoError('Error al anular'); }
  };

  const editarPago = async (idPago: number) => {
    const valor = parseFloat(editValor.replace(/[^0-9.]/g, ''));
    if (!valor || valor <= 0) { setPagoError('Valor inválido'); return; }
    try {
      const r = await fetch(API_PAGOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', id_pago: idPago, nuevo_valor: valor, nuevo_medio: editMedio })
      });
      const d = await r.json();
      if (d.success) {
        setPagoSuccess(d.message);
        setTimeout(() => setPagoSuccess(''), 5000);
        setEditandoPago(null);
        cargarPagos();
        cargar(anio);
      } else { setPagoError(d.message); }
    } catch (e) { setPagoError('Error al editar'); }
  };

  const [filtroMesVentas, setFiltroMesVentas] = useState('todos');
  const [filtroMesHistorial, setFiltroMesHistorial] = useState('todos');
  const [filtroAnioHistorial, setFiltroAnioHistorial] = useState('todos');
  const [editandoPago, setEditandoPago] = useState<number | null>(null);
  const [editValor, setEditValor] = useState('');
  const [editMedio, setEditMedio] = useState(0);
  const [imprimirPago, setImprimirPago] = useState<any>(null);

  useEffect(() => { cargar(anio); cargarPagos(); }, [clienteId, anio]);

  if (!data && loading) return null;

  const cliente = data?.cliente;
  const resumen = data?.resumen || {};
  const ventas = data?.ventas || [];
  const topProd = data?.top_productos || [];
  const grafico = data?.grafico || [];
  const aniosDisp = data?.anios_disponibles || [];

  const maxMonto = Math.max(...grafico.map((g: any) => g.monto), 1);

  const ventasFiltradas = ventas.filter((v: any) => {
    if (filtroMesVentas === 'todos') return true;
    const mes = new Date(v.Fecha).getMonth() + 1;
    return String(mes) === filtroMesVentas;
  });

  const colsVentas: ColDef[] = [
    {
      headerName: 'Factura', field: 'Factura_N', width: 90, sortable: true,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>{p.value}</span>
    },
    {
      headerName: 'Fecha', field: 'Fecha', flex: 1, minWidth: 100, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-'
    },
    {
      headerName: 'Tipo', field: 'Tipo', width: 80, sortable: true,
      cellRenderer: (p: any) => {
        const tipo = p.value || 'Contado';
        const esCredito = tipo.toLowerCase().includes('cr');
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 4,
            fontSize: 11, fontWeight: 600,
            background: esCredito ? '#dbeafe' : '#f3f4f6',
            color: esCredito ? '#2563eb' : '#6b7280'
          }}>
            {esCredito ? 'Crédito' : 'Contado'}
          </span>
        );
      }
    },
    {
      headerName: 'Total', field: 'Total', flex: 1, minWidth: 110, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Saldo', field: 'Saldo', flex: 1, minWidth: 110, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return <span style={{ fontWeight: 600, color: v > 0 ? '#dc2626' : '#16a34a' }}>{fmtMon(v)}</span>;
      }
    },
    {
      headerName: 'Estado', field: 'Saldo', width: 95,
      cellRenderer: (p: any) => {
        const saldo = parseFloat(p.value) || 0;
        const pagada = saldo <= 0;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 4,
            fontSize: 11, fontWeight: 600,
            background: pagada ? '#dcfce7' : '#fef3c7',
            color: pagada ? '#16a34a' : '#d97706'
          }}>
            {pagada ? 'Pagada' : 'Pendiente'}
          </span>
        );
      }
    },
    {
      headerName: '', width: 65, sortable: false,
      cellRenderer: (p: any) => {
        const tipo = p.data.Tipo || 'Contado';
        const esCredito = tipo.toLowerCase().includes('cr');
        if (!esCredito) return null;
        return (
          <button
            onClick={() => {
              setFacturaSeleccionada(p.data.Factura_N);
              setFiltroHistorial(String(p.data.Factura_N));
              setTab('historial');
            }}
            title="Ver pagos de esta factura"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 11, fontWeight: 600 }}
          >
            Pagos
          </button>
        );
      }
    },
  ];

  const colsProductos: ColDef[] = [
    { headerName: '#', width: 45, cellRenderer: (p: any) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{(p.node?.rowIndex ?? 0) + 1}</span> },
    { headerName: 'Código', field: 'Codigo', width: 90 },
    { headerName: 'Artículo', field: 'Nombres_Articulo', flex: 1, minWidth: 180 },
    {
      headerName: 'Cantidad', field: 'total_cantidad', width: 90, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#7c3aed' }}>{(p.value || 0).toLocaleString('es-CO')}</span>
    },
    {
      headerName: 'Veces', field: 'veces_comprado', width: 70, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value}</span>
    },
    {
      headerName: 'P. Promedio', field: 'precio_promedio', width: 100, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Monto', field: 'monto_total', width: 110, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: '#16a34a' }}>{fmtMon(p.value || 0)}</span>
    },
  ];

  const pendientes = pagosData?.pendientes || [];
  const historialPagos = pagosData?.historial || [];
  const mediosPago = pagosData?.medios_pago || [];
  const totalAbonos = Array.from(abonos.values()).reduce((s, v) => s + v, 0);

  const aniosHistorial = [...new Set(historialPagos.map((h: any) => new Date(h.Fecha).getFullYear()))].sort((a: number, b: number) => b - a);

  const historialFiltrado = historialPagos.filter((h: any) => {
    if (filtroHistorial) {
      const nfact = String(h.NFactAnt || h.Fact_N);
      if (!nfact.includes(filtroHistorial)) return false;
    }
    if (filtroAnioHistorial !== 'todos') {
      const anio = new Date(h.Fecha).getFullYear();
      if (String(anio) !== filtroAnioHistorial) return false;
    }
    if (filtroMesHistorial !== 'todos') {
      const mes = new Date(h.Fecha).getMonth() + 1;
      if (String(mes) !== filtroMesHistorial) return false;
    }
    return true;
  });

  const tabs = [
    { id: 'ventas' as const, label: 'Ventas', icon: FileText, count: ventas.length },
    { id: 'pagar' as const, label: 'Pagar', icon: Wallet, count: pendientes.length },
    { id: 'historial' as const, label: 'Historial Pagos', icon: Receipt, count: historialPagos.length },
    { id: 'productos' as const, label: 'Top Productos', icon: ShoppingBag, count: topProd.length },
    { id: 'grafico' as const, label: 'Gráfico', icon: BarChart3 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 12, width: 850,
        height: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{cliente?.Razon_Social}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Código: {cliente?.CodigoClien} | NIT: {cliente?.Nit || '-'} | Tel: {cliente?.Telefonos || '-'}
            </div>
          </div>
          <select
            value={anio}
            onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, padding: '0 6px' }}
          >
            {aniosDisp.map((a: any) => <option key={a} value={a}>{a}</option>)}
            {!aniosDisp.includes(String(anio)) && !aniosDisp.includes(anio) && <option value={anio}>{anio}</option>}
          </select>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '12px 20px', flexShrink: 0 }}>
          {[
            { label: 'Facturas', value: resumen.total_facturas || 0, icon: Receipt, bg: '#f3e8ff', color: '#7c3aed' },
            { label: `Ventas ${anio}`, value: fmtMon(resumen.monto_total || 0), icon: DollarSign, bg: '#dcfce7', color: '#16a34a', isText: true },
            { label: 'Saldo Pendiente', value: fmtMon(resumen.saldo_pendiente || 0), icon: CreditCard, bg: resumen.saldo_pendiente > 0 ? '#fee2e2' : '#dcfce7', color: resumen.saldo_pendiente > 0 ? '#dc2626' : '#16a34a', isText: true },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #f3f4f6' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
                  <div style={{ fontSize: (s as any).isText ? 14 : 18, fontWeight: 700 }}>{s.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', padding: '0 20px', flexShrink: 0 }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  border: 'none', borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
                  background: 'none', cursor: 'pointer', fontSize: 13,
                  color: active ? '#7c3aed' : '#6b7280', fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={15} /> {t.label}
                {t.count !== undefined && <span style={{ fontSize: 10, opacity: 0.6 }}>({t.count})</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '12px 20px' }}>
          {tab === 'ventas' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <select
                  value={filtroMesVentas}
                  onChange={e => setFiltroMesVentas(e.target.value)}
                  style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}
                >
                  <option value="todos">Todos los meses</option>
                  {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                    <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {ventasFiltradas.length} factura(s) — Total: {fmtMon(ventasFiltradas.reduce((s: number, v: any) => s + (v.Total || 0), 0))}
                  {' '} — Saldo: <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmtMon(ventasFiltradas.reduce((s: number, v: any) => s + (v.Saldo || 0), 0))}</span>
                </span>
              </div>
              <div style={{ flex: 1 }}>
                {ventasFiltradas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin ventas</div>
                ) : (
                  <AgGridReact
                    rowData={ventasFiltradas}
                    columnDefs={colsVentas}
                    loading={loading}
                    animateRows
                    getRowId={p => String(p.data.Factura_N)}
                    rowHeight={34}
                    headerHeight={34}
                    defaultColDef={{ resizable: true }}
                    onRowClicked={(e) => {
                      setFacturaSeleccionada(e.data.Factura_N);
                      setFiltroHistorial(String(e.data.Factura_N));
                      setTab('historial');
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {tab === 'pagar' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
              {pagoError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 12px', color: '#dc2626', fontSize: 12 }}>{pagoError}</div>}
              {pagoSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 12px', color: '#16a34a', fontSize: 12 }}>{pagoSuccess}</div>}

              {/* Toolbar pagos */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <div>
                  <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>FECHA</label>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>MEDIO</label>
                  <select value={medioPago} onChange={e => setMedioPago(parseInt(e.target.value))}
                    style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 4px', width: 100 }}>
                    {mediosPago.map((m: any) => <option key={m.id_mediopago} value={m.id_mediopago}>{m.nombre_medio}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>PAGO GLOBAL</label>
                  <input
                    type="text" placeholder="Valor"
                    value={pagoGlobal}
                    onChange={e => setPagoGlobal(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter' && pagoGlobal) distribuirPagoGlobal(parseInt(pagoGlobal)); }}
                    style={{ height: 28, width: 110, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}
                  />
                </div>
                <button onClick={() => pagoGlobal && distribuirPagoGlobal(parseInt(pagoGlobal))}
                  style={{ height: 28, padding: '0 8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  Distribuir
                </button>
                <button onClick={() => { const t = pendientes.reduce((s: number, f: any) => s + f.Saldo, 0); distribuirPagoGlobal(t); setPagoGlobal(String(Math.round(t))); }}
                  style={{ height: 28, padding: '0 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  Todo
                </button>
                <div>
                  <label style={{ fontSize: 9, color: '#6b7280', display: 'block', marginBottom: 2 }}>DESC.</label>
                  <input type="text" placeholder="$ 0" value={descuentoGlobal}
                    onChange={e => setDescuentoGlobal(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{ height: 28, width: 80, padding: '0 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, textAlign: 'right' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 4 }} />
                {totalAbonos > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: '#6b7280' }}>TOTAL</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed', lineHeight: 1 }}>{fmtMon(totalAbonos)}</div>
                    {descGlobal > 0 && <div style={{ fontSize: 9, color: '#d97706' }}>+Desc: {fmtMon(descGlobal)}</div>}
                  </div>
                )}
                <button
                  onClick={guardarPagos}
                  disabled={guardandoPago || totalAbonos <= 0}
                  style={{
                    height: 28, padding: '0 12px', background: totalAbonos > 0 ? '#7c3aed' : '#d1d5db',
                    color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: totalAbonos > 0 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    opacity: guardandoPago ? 0.6 : 1
                  }}
                >
                  <Save size={13} /> Guardar
                </button>
              </div>

              {/* Facturas pendientes */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                Facturas pendientes ({pendientes.length}) — Saldo: {fmtMon(pagosData?.resumen?.total_pendiente || 0)}
              </div>
              <div style={{ flex: 1, minHeight: 150 }}>
                {pendientes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#16a34a', fontSize: 14 }}>
                    <CheckCircle size={32} style={{ marginBottom: 8 }} /> Sin saldos pendientes
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Factura</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Saldo</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Días</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, width: 130 }}>Abono</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Desc.</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Nvo. Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.map((f: any) => {
                        const abono = abonos.get(f.Factura_N) || 0;
                        const descFact = calcDescuentoPorFactura(f.Factura_N);
                        const nuevoSaldo = f.Saldo - abono - descFact;
                        const vencida = f.Dias_Vencida > 30;
                        return (
                          <tr key={f.Factura_N} style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: abono > 0 ? '#f0fdf4' : vencida ? '#fef2f2' : 'transparent'
                          }}>
                            <td style={{ padding: '5px 8px', fontWeight: 600, color: '#7c3aed' }}>{f.Factura_N}</td>
                            <td style={{ padding: '5px 8px' }}>{new Date(f.Fecha).toLocaleDateString('es-CO')}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMon(f.Total)}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{fmtMon(f.Saldo)}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'center', color: vencida ? '#dc2626' : '#6b7280', fontWeight: vencida ? 600 : 400 }}>{f.Dias_Vencida}d</td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                              <input
                                type="text"
                                data-pago-input="true"
                                key={`abono-cli-${f.Factura_N}-${formVersion}`}
                                defaultValue={abono > 0 ? abono.toLocaleString('es-CO') : ''}
                                onFocus={e => {
                                  const val = abonos.get(f.Factura_N) || 0;
                                  e.target.value = val > 0 ? String(val) : '';
                                  e.target.select();
                                }}
                                onBlur={e => {
                                  const raw = e.target.value.replace(/[^0-9]/g, '');
                                  const num = raw ? Math.min(parseInt(raw), f.Saldo) : 0;
                                  const newAbonos = new Map(abonos);
                                  if (num > 0) { newAbonos.set(f.Factura_N, num); }
                                  else { newAbonos.delete(f.Factura_N); }
                                  setAbonos(newAbonos);
                                  e.target.value = num > 0 ? num.toLocaleString('es-CO') : '';
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).blur();
                                    const allInputs = Array.from(document.querySelectorAll('input[data-pago-input]')) as HTMLInputElement[];
                                    const idx = allInputs.indexOf(e.target as HTMLInputElement);
                                    if (idx < allInputs.length - 1) {
                                      requestAnimationFrame(() => { allInputs[idx + 1]?.focus(); });
                                    }
                                  }
                                  const allowed = ['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
                                  if (!allowed.includes(e.key) && !e.ctrlKey) e.preventDefault();
                                }}
                                style={{
                                  width: 110, height: 26, textAlign: 'center', fontWeight: 600,
                                  border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12,
                                  outline: 'none', background: '#fffbeb'
                                }}
                              />
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, color: '#d97706' }}>
                              {descFact > 0 ? fmtMon(descFact) : '-'}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: nuevoSaldo <= 0 ? '#16a34a' : '#374151' }}>
                              {(abono > 0 || descFact > 0) ? fmtMon(Math.max(nuevoSaldo, 0)) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}

          {tab === 'historial' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <select
                  value={filtroAnioHistorial}
                  onChange={e => setFiltroAnioHistorial(e.target.value)}
                  style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}
                >
                  <option value="todos">Todos los años</option>
                  {aniosHistorial.map((a: number) => <option key={a} value={String(a)}>{a}</option>)}
                </select>
                <select
                  value={filtroMesHistorial}
                  onChange={e => setFiltroMesHistorial(e.target.value)}
                  style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}
                >
                  <option value="todos">Todos los meses</option>
                  {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                    <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <div style={{ position: 'relative', flex: '0 0 160px' }}>
                  <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text" placeholder="# Factura..."
                    value={filtroHistorial}
                    onChange={e => setFiltroHistorial(e.target.value)}
                    style={{ width: '100%', height: 28, paddingLeft: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }}
                  />
                </div>
                {(filtroHistorial || filtroMesHistorial !== 'todos' || filtroAnioHistorial !== 'todos') && (
                  <button
                    onClick={() => { setFiltroHistorial(''); setFiltroMesHistorial('todos'); setFiltroAnioHistorial('todos'); setFacturaSeleccionada(null); }}
                    style={{ height: 28, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <X size={12} /> Limpiar
                  </button>
                )}
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {historialFiltrado.length} pago(s)
                  {filtroHistorial && ` para factura "${filtroHistorial}"`}
                  {' '} — Total: <span style={{ fontWeight: 600, color: '#16a34a' }}>{fmtMon(historialFiltrado.reduce((s: number, h: any) => s + h.ValorPago, 0))}</span>
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {historialFiltrado.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    {filtroHistorial ? `Sin pagos para factura "${filtroHistorial}"` : 'Sin pagos registrados'}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Recibo</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Factura</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Valor Pago</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Saldo Qdo.</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Medio</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialFiltrado.map((h: any) => {
                        const fechaPago = fechaLocal(new Date(h.Fecha));
                        const hoy = hoyLocal();
                        const esHoy = fechaPago === hoy;
                        const editando = editandoPago === h.Id_Pagos;

                        return (
                          <tr key={h.Id_Pagos} style={{ borderBottom: '1px solid #f3f4f6', background: editando ? '#fffbeb' : 'transparent' }}>
                            <td style={{ padding: '5px 8px', color: '#7c3aed', fontWeight: 600 }}>{h.RecCajaN}</td>
                            <td style={{ padding: '5px 8px' }}>{new Date(h.Fecha).toLocaleDateString('es-CO')}</td>
                            <td style={{ padding: '5px 8px' }}>
                              <button
                                onClick={() => setFiltroHistorial(String(h.NFactAnt || h.Fact_N))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 600, fontSize: 12 }}
                              >
                                {h.NFactAnt || h.Fact_N}
                              </button>
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                              {editando ? (
                                <input
                                  type="text" value={editValor}
                                  onChange={e => setEditValor(e.target.value.replace(/[^0-9]/g, ''))}
                                  onKeyDown={e => { if (e.key === 'Enter') editarPago(h.Id_Pagos); if (e.key === 'Escape') setEditandoPago(null); }}
                                  autoFocus
                                  style={{ width: 90, height: 24, textAlign: 'right', border: '1px solid #f59e0b', borderRadius: 4, fontSize: 12, fontWeight: 600, padding: '0 6px', outline: 'none' }}
                                />
                              ) : (
                                <span style={{ fontWeight: 600, color: '#16a34a' }}>{fmtMon(h.ValorPago)}</span>
                              )}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', color: h.SaldoAct > 0 ? '#d97706' : '#16a34a' }}>{fmtMon(h.SaldoAct)}</td>
                            <td style={{ padding: '5px 8px' }}>
                              {editando ? (
                                <select value={editMedio} onChange={e => setEditMedio(parseInt(e.target.value))}
                                  style={{ height: 24, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }}>
                                  {mediosPago.map((m: any) => <option key={m.id_mediopago} value={m.id_mediopago}>{m.nombre_medio}</option>)}
                                </select>
                              ) : (
                                <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 11, background: '#f3f4f6', color: '#374151' }}>{h.MedioPago}</span>
                              )}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                              {editando ? (
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                  <button onClick={() => editarPago(h.Id_Pagos)} title="Guardar"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                    <Save size={14} color="#16a34a" />
                                  </button>
                                  <button onClick={() => setEditandoPago(null)} title="Cancelar"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                    <X size={14} color="#6b7280" />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                                  <button
                                    onClick={() => setImprimirPago(h)}
                                    title="Imprimir recibo"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                                  >
                                    <Printer size={14} color="#7c3aed" />
                                  </button>
                                  {esHoy && (
                                    <button
                                      onClick={() => { setEditandoPago(h.Id_Pagos); setEditValor(String(Math.round(h.ValorPago))); setEditMedio(h.id_mediopago); }}
                                      title="Editar (solo hoy)"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                      <Pencil size={14} color="#f59e0b" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => anularPago(h.Id_Pagos, h.RecCajaN)}
                                    title="Anular pago"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                                  >
                                    <Ban size={14} color="#dc2626" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tab === 'productos' && (
            <div style={{ height: '100%' }}>
              {topProd.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin productos comprados en los últimos 12 meses</div>
              ) : (
                <AgGridReact
                  rowData={topProd}
                  columnDefs={colsProductos}
                  animateRows
                  getRowId={p => p.data.Codigo}
                  rowHeight={34}
                  headerHeight={34}
                  defaultColDef={{ resizable: true }}
                />
              )}
            </div>
          )}

          {tab === 'grafico' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Ventas mensuales {anio}
              </div>
              <div style={{ flex: 1, minHeight: 250, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 4px 0' }}>
                {grafico.map((g: any, i: number) => {
                  const pct = maxMonto > 0 ? (g.monto / maxMonto) * 100 : 0;
                  const hasData = g.monto > 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                      {hasData && (
                        <div style={{ fontSize: 9, color: '#374151', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {fmtMon(g.monto)}
                        </div>
                      )}
                      {hasData && (
                        <div style={{ fontSize: 8, color: '#6b7280' }}>{g.facturas} fact.</div>
                      )}
                      <div style={{
                        width: '80%', maxWidth: 48,
                        height: hasData ? `${Math.max(pct, 5)}%` : 3,
                        background: hasData
                          ? `linear-gradient(to top, #7c3aed, #a78bfa)`
                          : '#e5e7eb',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                      }} title={hasData ? `${g.nombre}: ${fmtMon(g.monto)} (${g.facturas} facturas)` : g.nombre} />
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{g.nombre}</div>
                    </div>
                  );
                })}
              </div>
              {/* Resumen bajo el gráfico */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                borderTop: '1px solid #e5e7eb', paddingTop: 12
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Mejor mes</div>
                  <div style={{ fontWeight: 700, color: '#7c3aed' }}>
                    {grafico.reduce((best: any, g: any) => g.monto > (best?.monto || 0) ? g : best, null)?.nombre || '-'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Promedio mensual</div>
                  <div style={{ fontWeight: 700 }}>
                    {fmtMon(grafico.reduce((s: number, g: any) => s + g.monto, 0) / Math.max(grafico.filter((g: any) => g.monto > 0).length, 1))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Meses activos</div>
                  <div style={{ fontWeight: 700 }}>{grafico.filter((g: any) => g.monto > 0).length} de 12</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {imprimirPago && cliente && (
        <ReciboImpresion
          pago={imprimirPago}
          cliente={cliente}
          formato={getConfigImpresion().formatoPago}
          onClose={() => setImprimirPago(null)}
        />
      )}

      {/* Recibo de pago recién guardado */}
      {reciboImprimir && (
        <ReciboImpresion
          pago={reciboImprimir.pago}
          cliente={{ CodigoClien: clienteId, Razon_Social: cliente?.Razon_Social || '', Nit: cliente?.Nit || '', Telefonos: cliente?.Telefonos || '' }}
          formato={reciboImprimir.formato}
          onClose={() => setReciboImprimir(null)}
        />
      )}
    </div>
  );
}
