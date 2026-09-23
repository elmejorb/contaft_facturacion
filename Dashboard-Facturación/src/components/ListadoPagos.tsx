import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from 'ag-grid-community';
import { Search, RefreshCw, Printer, Ban, Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { ReciboImpresion } from './ReciboImpresion';
import { getConfigImpresion } from './ConfiguracionSistema';
import { confirmar } from './ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

// Mismo tema que Inventario/StockBajo/HistorialCajas — coherencia visual.
const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff',
  headerTextColor: '#6b21a8',
  headerFontSize: 12,
  headerFontWeight: 600,
  fontSize: 12,
  rowBorder: { color: '#f3f4f6', width: 1 },
  borderColor: '#e5e7eb',
  borderRadius: 8,
  rowHoverColor: '#faf5ff',
  selectedRowBackgroundColor: '#f3e8ff',
  spacing: 6,
});

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

/* ================================================================
 * Botones de acción reutilizables para AG Grid (compactos).
 * Se renderizan como cellRenderer en la columna final del grid.
 * ============================================================== */
function AccionesCell({
  onImprimir, onAnular, anulado,
}: { onImprimir: () => void; onAnular: () => void; anulado: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: '100%' }}>
      <button
        onClick={onImprimir}
        title="Ver / Imprimir comprobante"
        style={{
          width: 26, height: 22, borderRadius: 5, border: '1px solid #d1d5db',
          background: '#f9fafb', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Printer size={12} color="#374151" />
      </button>
      {!anulado && (
        <button
          onClick={onAnular}
          title="Anular"
          style={{
            width: 26, height: 22, borderRadius: 5, border: '1px solid #fecaca',
            background: '#fef2f2', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ban size={12} color="#dc2626" />
        </button>
      )}
    </div>
  );
}

// ==========================================
// PAGOS DE CLIENTES (ingresos)
// ==========================================
export function ListadoPagosClientes() {
  const API_LIST = 'http://localhost:80/conta-app-backend/api/movimientos/pagos-clientes.php';
  const API_MOD  = 'http://localhost:80/conta-app-backend/api/clientes/pagos.php';
  const { user } = useAuth();
  const [pagos, setPagos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [anios, setAnios] = useState<any[]>([]);
  const [medios, setMedios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [filtroMedio, setFiltroMedio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Valida');
  const [busqueda, setBusqueda] = useState('');
  const [imprimir, setImprimir] = useState<any>(null); // pago a mostrar en ReciboImpresion
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API_LIST}?anio=${anio}&estado=${filtroEstado}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (filtroMedio !== '') url += `&medio=${filtroMedio}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setPagos(d.pagos); setResumen(d.resumen); setAnios(d.anios || []); setMedios(d.medios || []); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, filtroMedio, filtroEstado]);

  const abrirImprimir = (p: any) => {
    setImprimir({
      pago: {
        RecCajaN: p.RecCajaN,
        Fecha: p.Fecha,
        NFactAnt: p.NFactAnt || p.Fact_N || '',
        ValorPago: p.ValorPago,
        SaldoAct: p.SaldoAct,
        Descuento: p.Descuento || 0,
        MedioPago: p.MedioPago || 'Efectivo',
        DetallePago: p.DetallePago || '',
      },
      cliente: {
        CodigoClien: p.Codigo,
        Razon_Social: p.NombreCliente || '',
        Nit: p.Cedula || '',
        Telefonos: p.Telefonos || '',
      },
    });
  };

  const anularPago = async (p: any) => {
    const ok = await confirmar({
      title: 'Anular pago',
      message: `¿Anular el pago #${p.RecCajaN} por ${fmtMon(p.ValorPago)}?\n\nSe restaurará el saldo de la factura #${p.NFactAnt || p.Fact_N}.`,
      type: 'danger',
      confirmText: 'Sí, anular pago',
    });
    if (!ok) return;
    try {
      const r = await fetch(API_MOD, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id_pago: p.Id_Pagos, id_usuario: user?.id || 0 }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message || 'No se pudo anular');
    } catch (e) { toast.error('Error de conexión'); }
  };

  const cols: ColDef[] = [
    { headerName: 'Recibo', field: 'RecCajaN', width: 70, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, sortable: true, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Cliente', field: 'NombreCliente', flex: 1, minWidth: 150, sortable: true },
    { headerName: 'Detalle', field: 'DetallePago', flex: 1, minWidth: 180 },
    { headerName: 'Medio', field: 'MedioPago', width: 100, cellRenderer: (p: any) => <span style={{ fontSize: 11, fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Valor', field: 'ValorPago', width: 120, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Saldo', field: 'SaldoAct', width: 100, cellRenderer: (p: any) => <span style={{ color: p.value > 0 ? '#dc2626' : '#16a34a' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Estado', field: 'Estado', width: 80, cellRenderer: (p: any) => {
      const ok = p.value === 'Valida';
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626' }}>{p.value}</span>;
    }},
    {
      headerName: 'Acciones', width: 88, pinned: 'right', sortable: false, filter: false, resizable: false,
      cellRenderer: (params: any) => (
        <AccionesCell
          anulado={params.data.Estado !== 'Valida'}
          onImprimir={() => abrirImprimir(params.data)}
          onAnular={() => anularPago(params.data)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      {/* Header compacto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={20} color="#16a34a" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Pagos de Clientes</h2>
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total Pagos', value: String(resumen.total_pagos || 0), color: '#7c3aed', bg: '#f3e8ff', Ico: Wallet },
          { label: 'Efectivo', value: fmtMon(resumen.total_efectivo || 0), color: '#166534', bg: '#dcfce7', Ico: TrendingUp },
          { label: 'Transferencia', value: fmtMon(resumen.total_transferencia || 0), color: '#1e40af', bg: '#dbeafe', Ico: CreditCard },
          { label: 'Total General', value: fmtMon(resumen.total_general || 0), color: '#1f2937', bg: '#f3f4f6', Ico: TrendingUp },
        ].map((s, i) => (
          <div key={i} style={{ padding: 8, background: s.bg, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              <s.Ico size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros inline */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer' }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer' }}>
          <option value={0}>Todos los meses</option>
          {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={filtroMedio} onChange={e => setFiltroMedio(e.target.value)}
          style={{
            height: 26, borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filtroMedio ? '#7c3aed' : '#d1d5db'}`,
            background: filtroMedio ? '#f3e8ff' : '#fff',
            color: filtroMedio ? '#6b21a8' : '#374151',
          }}>
          <option value="">Todos los medios</option>
          {medios.map((m: any) => <option key={m.id_mediopago} value={m.id_mediopago}>{m.nombre_medio}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{
            height: 26, borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filtroEstado === 'Anulada' ? '#dc2626' : '#d1d5db'}`,
            background: filtroEstado === 'Anulada' ? '#fee2e2' : '#fff',
            color: filtroEstado === 'Anulada' ? '#991b1b' : '#374151',
          }}>
          <option value="Valida">Válidos</option>
          <option value="Anulada">Anulados</option>
          <option value="">Todos</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ height: 26, paddingLeft: 28, width: 220, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, outline: 'none' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ height: 'calc(100vh - 300px)', minHeight: 300, width: '100%' }}>
        <AgGridReact ref={gridRef}
          theme={myTheme}
          rowData={pagos}
          columnDefs={cols}
          localeText={AG_GRID_LOCALE_ES}
          loading={loading}
          animateRows
          quickFilterText={busqueda}
          defaultColDef={{ resizable: true }}
          rowHeight={32}
          headerHeight={32}
          getRowId={p => String(p.data.Id_Pagos)}
          pagination
          paginationPageSize={50}
          overlayNoRowsTemplate="<span style='padding:20px;color:#6b7280'>Sin pagos en el período</span>"
        />
      </div>

      {/* Recibo (impresión / vista) */}
      {imprimir && (
        <ReciboImpresion
          pago={imprimir.pago}
          cliente={imprimir.cliente}
          formato={getConfigImpresion().formatoPago}
          onClose={() => setImprimir(null)}
          tipoTercero="cliente"
        />
      )}
    </div>
  );
}

// ==========================================
// PAGOS A PROVEEDORES (EGRESOS)
// ==========================================
export function ListadoPagosProveedores() {
  const API = 'http://localhost:80/conta-app-backend/api/movimientos/pagos-proveedores.php';
  const { user } = useAuth();
  const [egresos, setEgresos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [anios, setAnios] = useState<any[]>([]);
  const [medios, setMedios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [filtroEstado, setFiltroEstado] = useState('Valida');
  const [filtroMedio, setFiltroMedio] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [imprimir, setImprimir] = useState<any>(null); // egreso a mostrar
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?anio=${anio}&estado=${filtroEstado}`;
      if (mes > 0) url += `&mes=${mes}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setEgresos(d.egresos); setResumen(d.resumen); setAnios(d.anios || []); setMedios(d.medios || []); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, filtroEstado]);

  const abrirImprimir = (e: any) => {
    // El ReciboImpresion reutiliza el mismo shape que un pago de cliente,
    // marcando tipoTercero='proveedor' para cambiar títulos ("COMPROBANTE
    // DE EGRESO" en vez de "RECIBO DE PAGO", "Pagado a" en vez de "Recibido de").
    setImprimir({
      pago: {
        RecCajaN: e.N_Comprobante,
        Fecha: e.Fecha,
        NFactAnt: e.NFacturaAnt || e.FactN || '',
        ValorPago: e.Valor,
        SaldoAct: e.Saldoact || 0,
        Descuento: e.Descuento || 0,
        MedioPago: e.MedioPago || 'Efectivo',
        DetallePago: e.Concepto || '',
      },
      cliente: {
        CodigoClien: e.CodigoPro,
        Razon_Social: e.NombreProveedor || e.Orden || '',
        Nit: e.ProvNit || e.Cedula || '',
        Telefonos: e.ProvTelefono || '',
      },
    });
  };

  const anularEgreso = async (e: any) => {
    const efectivoMsg = (e.MedioPago || '').toLowerCase() === 'efectivo'
      ? ' El efectivo se devolverá a la caja abierta.'
      : ' No se afecta la caja porque el pago no fue en efectivo.';
    const ok = await confirmar({
      title: 'Anular egreso',
      message: `¿Anular el egreso #${e.N_Comprobante} por ${fmtMon(e.Valor)}?\n\nEl egreso queda marcado como Anulada y deja de contar en reportes. La compra ${e.NFacturaAnt ? '#' + e.NFacturaAnt : ''} NO se afecta.${efectivoMsg}`,
      type: 'danger',
      confirmText: 'Sí, anular egreso',
    });
    if (!ok) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id: e.Id_Egresos, id_usuario: user?.id || 0 }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message, { duration: 5000 }); cargar(); }
      else toast.error(d.message || 'No se pudo anular');
    } catch (err) { toast.error('Error de conexión'); }
  };

  const cols: ColDef[] = [
    { headerName: 'Comp.', field: 'N_Comprobante', width: 70, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, sortable: true, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Proveedor', field: 'NombreProveedor', flex: 1, minWidth: 150, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 500 }}>{p.value || p.data.Orden || '-'}</span> },
    { headerName: 'Concepto', field: 'Concepto', flex: 1, minWidth: 180 },
    { headerName: 'Factura', field: 'NFacturaAnt', width: 100 },
    { headerName: 'Medio', field: 'MedioPago', width: 100, cellRenderer: (p: any) => <span style={{ fontSize: 11, fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Valor', field: 'Valor', width: 120, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Estado', field: 'Estado', width: 80, cellRenderer: (p: any) => {
      const ok = p.value === 'Valida';
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626' }}>{p.value}</span>;
    }},
    {
      headerName: 'Acciones', width: 88, pinned: 'right', sortable: false, filter: false, resizable: false,
      cellRenderer: (params: any) => (
        <AccionesCell
          anulado={params.data.Estado !== 'Valida'}
          onImprimir={() => abrirImprimir(params.data)}
          onAnular={() => anularEgreso(params.data)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      {/* Header compacto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={20} color="#dc2626" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Pagos a Proveedores</h2>
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total Egresos', value: String(resumen.total_egresos || 0), color: '#7c3aed', bg: '#f3e8ff', Ico: Wallet },
          { label: 'Total Pagado', value: fmtMon(resumen.total_general || 0), color: '#991b1b', bg: '#fee2e2', Ico: TrendingDown },
        ].map((s, i) => (
          <div key={i} style={{ padding: 8, background: s.bg, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              <s.Ico size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros inline */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer' }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 26, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer' }}>
          <option value={0}>Todos los meses</option>
          {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        {medios.length > 0 && (
          <select value={filtroMedio} onChange={e => setFiltroMedio(e.target.value)}
            style={{
              height: 26, borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${filtroMedio ? '#7c3aed' : '#d1d5db'}`,
              background: filtroMedio ? '#f3e8ff' : '#fff',
              color: filtroMedio ? '#6b21a8' : '#374151',
            }}>
            <option value="">Todos los medios</option>
            {medios.map((m: any) => <option key={m.id_mediopago} value={m.id_mediopago}>{m.nombre_medio}</option>)}
          </select>
        )}
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{
            height: 26, borderRadius: 6, fontSize: 11, padding: '0 8px', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filtroEstado === 'Anulada' ? '#dc2626' : '#d1d5db'}`,
            background: filtroEstado === 'Anulada' ? '#fee2e2' : '#fff',
            color: filtroEstado === 'Anulada' ? '#991b1b' : '#374151',
          }}>
          <option value="Valida">Válidos</option>
          <option value="Anulada">Anulados</option>
          <option value="">Todos</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar proveedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ height: 26, paddingLeft: 28, width: 220, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, outline: 'none' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ height: 'calc(100vh - 260px)', minHeight: 300, width: '100%' }}>
        <AgGridReact ref={gridRef}
          theme={myTheme}
          rowData={egresos}
          columnDefs={cols}
          localeText={AG_GRID_LOCALE_ES}
          loading={loading}
          animateRows
          quickFilterText={busqueda}
          defaultColDef={{ resizable: true }}
          rowHeight={32}
          headerHeight={32}
          getRowId={p => String(p.data.Id_Egresos)}
          pagination
          paginationPageSize={50}
          overlayNoRowsTemplate="<span style='padding:20px;color:#6b7280'>Sin egresos en el período</span>"
        />
      </div>

      {/* Comprobante de egreso (impresión / vista) */}
      {imprimir && (
        <ReciboImpresion
          pago={imprimir.pago}
          cliente={imprimir.cliente}
          formato={getConfigImpresion().formatoPago}
          onClose={() => setImprimir(null)}
          tipoTercero="proveedor"
        />
      )}
    </div>
  );
}
