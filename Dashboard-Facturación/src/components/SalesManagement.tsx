import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, TrendingUp, DollarSign, CreditCard, Wallet,
  Eye, X, Printer
} from 'lucide-react';
import { getConfigImpresion } from './ConfiguracionSistema';
import { imprimirFactura, type DatosFactura } from './ImpresionFactura';
import { DetalleFacturaModal } from './DetalleFacturaModal';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/ventas/listar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function SalesManagement() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('Valida');
  const [aniosDisp, setAniosDisp] = useState<any[]>([]);
  const [facturaDetalleN, setFacturaDetalleN] = useState<number | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async (buscar?: string) => {
    setLoading(true);
    try {
      let url = `${API}?anio=${anio}&estado=${filtroEstado}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setVentas(d.ventas);
        setResumen(d.resumen);
        setAniosDisp(d.anios_disponibles);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, filtroEstado]);

  const verDetalle = (factN: number) => setFacturaDetalleN(factN);

  // Imprimir factura desde listado
  const imprimirDesdeListado = async (factN: number) => {
    try {
      const r = await fetch(`${API}?id=${factN}`);
      const d = await r.json();
      if (!d.success) return;
      const fac = d.factura;
      const items = d.items || [];
      const datosImp: DatosFactura = {
        numero: fac.Factura_N,
        fecha: fac.Fecha ? new Date(fac.Fecha).toLocaleDateString('es-CO') + ' - ' + (fac.Hora || '') : '-',
        tipo: fac.Tipo || 'Contado',
        dias: parseInt(fac.Dias) || 0,
        cliente: { nombre: fac.A_nombre || '-', nit: fac.Identificacion || '0', telefono: fac.Telefono || '0', direccion: fac.Direccion || '-' },
        items: items.map((i: any) => ({
          codigo: i.Codigo || String(i.Items),
          nombre: i.Nombres_Articulo || i.DescripcionTemp || '-',
          cantidad: parseFloat(i.Cantidad) || 1,
          precio: parseFloat(i.PrecioV) || 0,
          iva: parseFloat(i.IVA) || 0,
          descuento: parseFloat(i.Descuento) || 0,
          subtotal: parseFloat(i.Subtotal) || 0
        })),
        subtotal: items.reduce((s: number, i: any) => s + (parseFloat(i.Subtotal) || 0), 0),
        descuento: parseFloat(fac.Descuento) || 0,
        iva: parseFloat(fac.Impuesto) || 0,
        total: parseFloat(fac.Total) || 0,
        efectivo: parseFloat(fac.efectivo) || 0,
        transferencia: parseFloat(fac.valorpagado1) || 0,
        cambio: parseFloat(fac.Cambio) || 0,
        abono: parseFloat(fac.Abono) || 0,
        saldo: parseFloat(fac.Saldo) || 0,
        medioPago: fac.MedioPago || 'Efectivo',
        vendedor: fac.Vendedor || 'Vendedor',
        empresa: {
          nombre: 'DISTRIBUIDORA DE SALSAS DE PLANETA RICA',
          nit: '901.529.697-3', telefono: '3128478781',
          direccion: 'CR 7 14 60 BRR LOS ABETOS PLANETA RICA',
          regimen: 'Régimen Común', propietario: '-', resolucion: '0'
        },
        caja: 1,
        logo: getConfigImpresion().logo || undefined
      };
      imprimirFactura(datosImp);
    } catch (e) { console.error(e); }
  };

  const filtrados = ventas.filter(v => {
    if (busqueda) {
      const b = busqueda.toLowerCase();
      if (!String(v.Factura_N).includes(busqueda) && !v.A_nombre?.toLowerCase().includes(b)) return false;
    }
    if (filtroTipo === 'contado' && v.Tipo !== 'Contado') return false;
    if (filtroTipo === 'credito' && v.Tipo === 'Contado') return false;
    return true;
  });

  const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const cols: ColDef[] = [
    { headerName: 'Factura', field: 'Factura_N', width: 80, sortable: true,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 95, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Hora', field: 'Hora', width: 60 },
    { headerName: 'Cliente', field: 'A_nombre', flex: 1, minWidth: 180, sortable: true, filter: true },
    { headerName: 'Tipo', field: 'Tipo', width: 80,
      cellRenderer: (p: any) => {
        const esCredito = p.value !== 'Contado';
        return <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: esCredito ? '#dbeafe' : '#f3f4f6', color: esCredito ? '#2563eb' : '#6b7280'
        }}>{esCredito ? 'Crédito' : 'Contado'}</span>;
      }
    },
    { headerName: 'Items', field: 'Total_Items', width: 60, cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Total', field: 'Total', width: 120, sortable: true, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700 }}>{fmtMon(p.value || 0)}</span> },
    { headerName: 'Saldo', field: 'Saldo', width: 100, sortable: true, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v > 0 ? <span style={{ fontWeight: 600, color: '#dc2626' }}>{fmtMon(v)}</span> : <span style={{ color: '#16a34a' }}>$ 0</span>;
      }
    },
    { headerName: 'Medio', field: 'MedioPago', width: 90,
      cellRenderer: (p: any) => <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#f3f4f6' }}>{p.value}</span> },
    { headerName: '', width: 75, sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button title="Ver detalle" onClick={() => verDetalle(p.data.Factura_N)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
            <Eye size={15} color="#7c3aed" />
          </button>
          <button title="Imprimir factura" onClick={() => imprimirDesdeListado(p.data.Factura_N)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
            <Printer size={15} color="#2563eb" />
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Listado de Ventas</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Consulta y gestión de facturas de venta</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Facturas', value: resumen.total_facturas || 0, icon: TrendingUp, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Monto Total', value: fmtMon(resumen.monto_total || 0), icon: DollarSign, bg: '#dcfce7', color: '#16a34a', isText: true },
          { label: 'Contado', value: fmtMon(resumen.contado || 0), icon: Wallet, bg: '#f3f4f6', color: '#374151', isText: true },
          { label: 'Crédito', value: fmtMon(resumen.credito || 0), icon: CreditCard, bg: '#dbeafe', color: '#2563eb', isText: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: (s as any).isText ? 16 : 20, fontWeight: 700 }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          {aniosDisp.map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value={0}>Todos</option>
          {meses.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value="Valida">Válidas</option>
          <option value="Anulada">Anuladas</option>
        </select>

        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="# Factura o cliente... (Enter para buscar)" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && busqueda.trim()) cargar(busqueda.trim()); }}
            style={{ width: '100%', height: 30, paddingLeft: 28, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none' }} />
        </div>

        {[
          { id: 'todos', label: 'Todos' },
          { id: 'contado', label: 'Contado' },
          { id: 'credito', label: 'Crédito' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltroTipo(f.id)} style={{
            height: 28, padding: '0 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
            border: filtroTipo === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
            background: filtroTipo === f.id ? '#f3e8ff' : '#fff',
            color: filtroTipo === f.id ? '#7c3aed' : '#374151', fontWeight: filtroTipo === f.id ? 600 : 400,
          }}>{f.label}</button>
        ))}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>{filtrados.length} factura(s)</span>
        <button onClick={cargar} style={{
          height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5
        }}><RefreshCw size={14} /></button>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 370px)', width: '100%' }}>
          <AgGridReact ref={gridRef} rowData={filtrados} columnDefs={cols} loading={loading} animateRows
            getRowId={p => String(p.data.Factura_N)} rowHeight={36} headerHeight={36}
            defaultColDef={{ resizable: true }}
            getRowStyle={p => {
              if (p.data?.EstadoFact === 'Anulada') return { background: '#fef2f2', textDecoration: 'line-through', opacity: 0.6 };
              return undefined;
            }} />
        </div>
      </div>

      {/* Modal detalle factura */}
      {facturaDetalleN && (
        <DetalleFacturaModal factN={facturaDetalleN} onClose={() => setFacturaDetalleN(null)} onUpdate={cargar} />
      )}

      {/* OLD MODAL - DISABLED */}
      {false && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setFacturaDetalle(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 700, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Factura #{facturaDetalle.Factura_N}</span>
                <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: facturaDetalle.EstadoFact === 'Valida' ? '#dcfce7' : '#fee2e2',
                  color: facturaDetalle.EstadoFact === 'Valida' ? '#16a34a' : '#dc2626'
                }}>{facturaDetalle.EstadoFact}</span>
              </div>
              <button onClick={() => setFacturaDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '14px 20px' }}>
              {/* Info factura */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', fontSize: 13, marginBottom: 14 }}>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>CLIENTE</span><div style={{ fontWeight: 600 }}>{facturaDetalle.A_nombre}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>FECHA</span><div>{new Date(facturaDetalle.Fecha).toLocaleDateString('es-CO')} {facturaDetalle.Hora}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>TIPO</span><div>{facturaDetalle.Tipo}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>MEDIO DE PAGO</span><div>{facturaDetalle.MedioPago || 'Efectivo'}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>VENDEDOR</span><div>{facturaDetalle.NombreUsuario || '-'}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>IDENTIFICACIÓN</span><div>{facturaDetalle.Identificacion || '-'}</div></div>
              </div>

              {/* Items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#f3e8ff', borderBottom: '2px solid #d8b4fe' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Código</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Artículo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>P. Venta</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleItems.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '5px 8px', color: '#6b7280' }}>{item.Codigo || '-'}</td>
                      <td style={{ padding: '5px 8px', fontWeight: 500 }}>{item.Nombres_Articulo || item.DescripcionTemp || '-'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600 }}>{item.Cantidad}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMon(item.PrecioV)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(item.Subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 250 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span>Subtotal:</span><span>{fmtMon(parseFloat(facturaDetalle.Total) + parseFloat(facturaDetalle.Descuento))}</span>
                  </div>
                  {parseFloat(facturaDetalle.Descuento) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#d97706' }}>
                      <span>Descuento:</span><span>- {fmtMon(parseFloat(facturaDetalle.Descuento))}</span>
                    </div>
                  )}
                  {parseFloat(facturaDetalle.Impuesto) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>IVA:</span><span>{fmtMon(parseFloat(facturaDetalle.Impuesto))}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 16, fontWeight: 700, borderTop: '2px solid #7c3aed', marginTop: 4 }}>
                    <span>Total:</span><span style={{ color: '#7c3aed' }}>{fmtMon(parseFloat(facturaDetalle.Total))}</span>
                  </div>
                  {parseFloat(facturaDetalle.Saldo) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#dc2626' }}>
                      <span>Saldo pendiente:</span><span style={{ fontWeight: 700 }}>{fmtMon(parseFloat(facturaDetalle.Saldo))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
