import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import {
  Smartphone, Users, ShoppingCart, FileText, DollarSign, TrendingUp,
  Package, CreditCard, ArrowLeft, Calendar, Award,
} from 'lucide-react';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/informes/vendedores.php';

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

const fmt = (v: number | string) => '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO');

const fechaLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const HOY = fechaLocal(new Date());
const INICIO_MES = fechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

interface ResumenVendedor {
  id_vendedor: number;
  codigo: string;
  nombre: string;
  zona: string | null;
  empleado_nombre: string | null;
  codigo_emp: number | null;
  activo: boolean;
  pedidos_total: number;
  pedidos_pendientes: number;
  pedidos_procesados: number;
  pedidos_anulados: number;
  facturas_total: number;
  monto_contado: number;
  monto_credito: number;
  monto_total: number;
  facturado_total: number;
  facturado_contado: number;
  facturado_credito: number;
}

export function InformeVendedores() {
  const [resumen, setResumen] = useState<ResumenVendedor[]>([]);
  const [totales, setTotales] = useState({ pedidos: 0, facturas: 0, contado: 0, credito: 0, total: 0 });
  const [detPed, setDetPed] = useState<any[]>([]);
  const [detFact, setDetFact] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState(INICIO_MES);
  const [hasta, setHasta] = useState(HOY);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<ResumenVendedor | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ desde, hasta });
      if (vendedorSeleccionado) q.set('vendedor_id', String(vendedorSeleccionado.id_vendedor));
      const r = await fetch(`${API}?${q}`);
      const d = await r.json();
      if (d.success) {
        setResumen(d.resumen || []);
        setTotales(d.totales || {});
        setDetPed(d.detalle_pedidos || []);
        setDetFact(d.detalle_facturas || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [desde, hasta, vendedorSeleccionado]);

  useEffect(() => { cargar(); }, [cargar]);

  const setRango = (preset: 'hoy' | 'semana' | 'mes' | 'anterior' | 'anio') => {
    const hoy = new Date();
    if (preset === 'hoy') { const f = fechaLocal(hoy); setDesde(f); setHasta(f); }
    else if (preset === 'semana') { const i = new Date(hoy); i.setDate(hoy.getDate() - 6); setDesde(fechaLocal(i)); setHasta(fechaLocal(hoy)); }
    else if (preset === 'mes') { setDesde(fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1))); setHasta(fechaLocal(hoy)); }
    else if (preset === 'anterior') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      setDesde(fechaLocal(inicio)); setHasta(fechaLocal(fin));
    }
    else if (preset === 'anio') { setDesde(`${hoy.getFullYear()}-01-01`); setHasta(fechaLocal(hoy)); }
  };

  // ---- Vista detalle (drill-down) ----
  if (vendedorSeleccionado) {
    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
          padding: '14px 18px', borderRadius: 12,
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setVendedorSeleccionado(null)}
              style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} color="#fff" />
            </button>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>
                {vendedorSeleccionado.codigo} — {vendedorSeleccionado.nombre}
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
                {vendedorSeleccionado.zona || 'Sin zona'} · {desde} → {hasta}
                {vendedorSeleccionado.empleado_nombre && ` · ${vendedorSeleccionado.empleado_nombre} (Emp #${vendedorSeleccionado.codigo_emp})`}
              </p>
            </div>
          </div>
        </div>

        {/* 4 KPIs del vendedor */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'PEDIDOS TOMADOS', value: String(vendedorSeleccionado.pedidos_total), color: '#7c3aed', bg: '#f5f3ff', Icon: Package, sub: `${vendedorSeleccionado.pedidos_pendientes} pend · ${vendedorSeleccionado.pedidos_procesados} proc` },
            { label: 'FACTURADO', value: fmt(vendedorSeleccionado.facturado_total), color: '#16a34a', bg: '#f0fdf4', Icon: FileText, sub: `${vendedorSeleccionado.facturas_total} facturas emitidas` },
            { label: 'CONTADO', value: fmt(vendedorSeleccionado.facturado_contado), color: '#0891b2', bg: '#ecfeff', Icon: DollarSign, sub: 'Cobrado inmediato' },
            { label: 'CRÉDITO', value: fmt(vendedorSeleccionado.facturado_credito), color: '#dc2626', bg: '#fef2f2', Icon: CreditCard, sub: 'Cartera pendiente' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginTop: 4 }}>{c.value}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{c.sub}</div>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.Icon size={16} color={c.color} strokeWidth={2.2} />
              </div>
            </div>
          ))}
        </div>

        {/* Dos tablas: pedidos + facturas del vendedor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={16} color="#7c3aed" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Pedidos ({detPed.length})</div>
            </div>
            <div style={{ height: 400, padding: 8 }}>
              <AgGridReact theme={myTheme} rowData={detPed} localeText={AG_GRID_LOCALE_ES} suppressCellFocus
                defaultColDef={{ sortable: true, resizable: true }}
                columnDefs={[
                  { field: 'numero_pedido', headerName: 'Nº', width: 100 },
                  { field: 'fecha', headerName: 'Fecha', width: 100 },
                  { field: 'nombre_cliente', headerName: 'Cliente', flex: 1, minWidth: 140 },
                  {
                    field: 'total', headerName: 'Total', width: 110, type: 'numericColumn' as const,
                    valueFormatter: (p: any) => fmt(p.value), cellStyle: { color: '#16a34a', fontWeight: 600 },
                  },
                  {
                    field: 'estado', headerName: 'Estado', width: 110,
                    cellRenderer: (p: any) => {
                      const v = (p.value || '').toLowerCase();
                      const bg = v === 'pendiente' ? '#fef3c7' : v === 'procesado' ? '#dcfce7' : '#fee2e2';
                      const color = v === 'pendiente' ? '#92400e' : v === 'procesado' ? '#16a34a' : '#dc2626';
                      return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>;
                    },
                  },
                ] as any} />
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={16} color="#16a34a" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Facturas ({detFact.length})</div>
            </div>
            <div style={{ height: 400, padding: 8 }}>
              <AgGridReact theme={myTheme} rowData={detFact} localeText={AG_GRID_LOCALE_ES} suppressCellFocus
                defaultColDef={{ sortable: true, resizable: true }}
                columnDefs={[
                  { field: 'Factura_N', headerName: 'Nº', width: 90, cellStyle: { color: '#7c3aed', fontWeight: 600 } },
                  { field: 'fecha', headerName: 'Fecha', width: 100 },
                  { field: 'cliente', headerName: 'Cliente', flex: 1, minWidth: 140 },
                  { field: 'numero_pedido', headerName: 'Pedido', width: 100, cellStyle: { color: '#9ca3af', fontSize: 11 } },
                  {
                    field: 'Total', headerName: 'Total', width: 110, type: 'numericColumn' as const,
                    valueFormatter: (p: any) => fmt(p.value), cellStyle: { color: '#16a34a', fontWeight: 600 },
                  },
                  {
                    field: 'Tipo', headerName: 'Pago', width: 90,
                    cellRenderer: (p: any) => {
                      const v = (p.value || '').toLowerCase();
                      const bg = v.includes('contado') ? '#dcfce7' : '#fee2e2';
                      const color = v.includes('contado') ? '#16a34a' : '#dc2626';
                      return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{p.value}</span>;
                    },
                  },
                ] as any} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Vista principal: ranking de vendedores ----
  const btnRango = (label: string, key: 'hoy' | 'semana' | 'mes' | 'anterior' | 'anio') => (
    <button onClick={() => setRango(key)}
      style={{ height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #d1d5db' }}>
      {label}
    </button>
  );

  return (
    <div>
      {/* Header morado */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
        padding: '14px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: 0.2 }}>Ranking de Vendedores</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>Pedidos + facturas generados por cada vendedor móvil</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Calendar size={14} color="#6b7280" />
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} />
        <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }} />
        <div style={{ width: 12 }} />
        {btnRango('Hoy', 'hoy')}
        {btnRango('Últimos 7', 'semana')}
        {btnRango('Este mes', 'mes')}
        {btnRango('Mes anterior', 'anterior')}
        {btnRango('Año', 'anio')}
      </div>

      {/* KPIs globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'VENDEDORES ACTIVOS', value: String(resumen.length), color: '#7c3aed', bg: '#f5f3ff', Icon: Users },
          { label: 'PEDIDOS TOMADOS', value: String(totales.pedidos), color: '#d97706', bg: '#fffbeb', Icon: ShoppingCart },
          { label: 'FACTURAS EMITIDAS', value: String(totales.facturas), color: '#0891b2', bg: '#ecfeff', Icon: FileText },
          { label: 'CONTADO', value: fmt(totales.contado), color: '#16a34a', bg: '#f0fdf4', Icon: DollarSign },
          { label: 'CRÉDITO', value: fmt(totales.credito), color: '#dc2626', bg: '#fef2f2', Icon: CreditCard },
        ].map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginTop: 4 }}>{c.value}</div>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.Icon size={16} color={c.color} strokeWidth={2.2} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabla / ranking */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {resumen.length} {resumen.length === 1 ? 'vendedor con actividad' : 'vendedores con actividad'}
          </div>
        </div>

        {resumen.length === 0 && !loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <Smartphone size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Sin actividad en este rango</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Ajusta las fechas o espera a que los vendedores tomen pedidos.</div>
          </div>
        ) : (
          <div style={{ height: 500, padding: 8 }}>
            <AgGridReact
              theme={myTheme}
              rowData={resumen}
              localeText={AG_GRID_LOCALE_ES}
              suppressCellFocus
              onRowClicked={(e: any) => setVendedorSeleccionado(e.data)}
              defaultColDef={{ sortable: true, resizable: true }}
              columnDefs={[
                {
                  headerName: '#', width: 55, valueGetter: (p: any) => p.node.rowIndex + 1,
                  cellRenderer: (p: any) => {
                    const rank = p.node.rowIndex + 1;
                    if (rank === 1) return <span style={{ fontSize: 16 }}>🥇</span>;
                    if (rank === 2) return <span style={{ fontSize: 16 }}>🥈</span>;
                    if (rank === 3) return <span style={{ fontSize: 16 }}>🥉</span>;
                    return <span style={{ color: '#9ca3af', fontWeight: 600 }}>{rank}</span>;
                  },
                },
                {
                  field: 'codigo', headerName: 'Código', width: 90,
                  cellStyle: { color: '#7c3aed', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' },
                },
                { field: 'nombre', headerName: 'Vendedor', flex: 1.4, minWidth: 160, cellStyle: { fontWeight: 500 } },
                { field: 'zona', headerName: 'Zona', width: 120 },
                {
                  field: 'pedidos_total', headerName: 'Pedidos', width: 90, type: 'numericColumn' as const,
                  cellStyle: { fontWeight: 700, color: '#d97706' },
                },
                {
                  field: 'facturas_total', headerName: 'Facturas', width: 90, type: 'numericColumn' as const,
                  cellStyle: { fontWeight: 700, color: '#0891b2' },
                },
                {
                  field: 'monto_contado', headerName: 'Contado', width: 130, type: 'numericColumn' as const,
                  valueFormatter: (p: any) => fmt(p.value),
                  cellStyle: { color: '#16a34a', fontWeight: 600 },
                },
                {
                  field: 'monto_credito', headerName: 'Crédito', width: 130, type: 'numericColumn' as const,
                  valueFormatter: (p: any) => fmt(p.value),
                  cellStyle: { color: '#dc2626', fontWeight: 600 },
                },
                {
                  field: 'monto_total', headerName: 'Total vendido', width: 150, type: 'numericColumn' as const,
                  valueFormatter: (p: any) => fmt(p.value),
                  cellStyle: { color: '#7c3aed', fontWeight: 800, fontSize: 13 },
                },
              ] as any}
            />
          </div>
        )}
      </div>
    </div>
  );
}
