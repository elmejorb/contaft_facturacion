import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { RefreshCw, Trophy, Users, DollarSign, TrendingUp } from 'lucide-react';
import { ClienteDetalle } from './ClienteDetalle';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/clientes/top.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function TopClientes() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async (year: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?anio=${year}`);
      const d = await r.json();
      if (d.success) setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(anio); }, [anio]);

  const clientes = data?.clientes || [];
  const aniosDisp = data?.anios_disponibles || [];
  const totalVentas = data?.total_ventas || 0;

  const columnDefs: ColDef[] = [
    {
      headerName: '#', width: 55, sortable: false,
      cellRenderer: (p: any) => {
        const pos = (p.node?.rowIndex ?? 0) + 1;
        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '';
        return <span style={{ fontWeight: 600, color: '#6b7280' }}>{medal || pos}</span>;
      }
    },
    {
      headerName: 'Cliente', field: 'Razon_Social', flex: 1, minWidth: 200, sortable: true, filter: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, cursor: 'pointer' }}>{p.value}</span>
    },
    { headerName: 'NIT / CC', field: 'Nit', width: 110, sortable: true },
    {
      headerName: 'Facturas', field: 'Total_Facturas', width: 85, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: '#7c3aed' }}>{(p.value || 0).toLocaleString()}</span>
    },
    {
      headerName: 'Total Compras', field: 'Monto_Total', width: 140, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Promedio', field: 'Promedio_Factura', width: 110, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: '% Ventas', field: 'Porcentaje', width: 90, sortable: true,
      cellRenderer: (p: any) => {
        const pct = p.value || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: '#7c3aed', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', minWidth: 35, textAlign: 'right' }}>{pct}%</span>
          </div>
        );
      }
    },
    {
      headerName: 'Últ. Compra', field: 'Ultima_Compra', width: 95, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-'
    },
  ];

  // Top 3 for podium
  const top3 = clientes.slice(0, 3);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Top Clientes</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Ranking de clientes por volumen de compras</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={anio}
            onChange={e => setAnio(parseInt(e.target.value))}
            style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}
          >
            {aniosDisp.map((a: any) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => cargar(anio)} style={{
            height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Clientes', value: clientes.length, icon: Users, bg: '#f3e8ff', color: '#7c3aed' },
          { label: `Ventas ${anio}`, value: fmtMon(totalVentas), icon: DollarSign, bg: '#dcfce7', color: '#16a34a', isText: true },
          { label: 'Promedio por Cliente', value: fmtMon(clientes.length > 0 ? totalVentas / clientes.length : 0), icon: TrendingUp, bg: '#dbeafe', color: '#2563eb', isText: true },
          { label: 'Top 1', value: top3[0]?.Razon_Social || '-', icon: Trophy, bg: '#fef3c7', color: '#d97706', isText: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={s.color} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: (s as any).isText ? 14 : 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Podium Top 3 */}
      {top3.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, alignItems: 'flex-end' }}>
          {[top3[1], top3[0], top3[2]].map((c, i) => {
            const pos = i === 0 ? 2 : i === 1 ? 1 : 3;
            const heights = { 1: 110, 2: 85, 3: 65 };
            const colors = { 1: '#7c3aed', 2: '#6366f1', 3: '#8b5cf6' };
            const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
            return (
              <div key={pos} style={{ textAlign: 'center', width: 180, cursor: 'pointer' }} onClick={() => setDetalleId(c.CodigoClien)}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.Razon_Social}
                </div>
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>{fmtMon(c.Monto_Total)}</div>
                <div style={{
                  height: heights[pos as 1|2|3], background: `linear-gradient(to top, ${colors[pos as 1|2|3]}, ${colors[pos as 1|2|3]}99)`,
                  borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 28
                }}>
                  {medals[pos as 1|2|3]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid completo */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: top3.length >= 3 ? 'calc(100vh - 520px)' : 'calc(100vh - 350px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={clientes}
            columnDefs={columnDefs}
            loading={loading}
            animateRows
            getRowId={p => String(p.data.CodigoClien)}
            rowHeight={36}
            headerHeight={36}
            defaultColDef={{ resizable: true }}
            onRowClicked={e => setDetalleId(e.data.CodigoClien)}
            getRowStyle={p => {
              const idx = p.node?.rowIndex ?? 0;
              if (idx === 0) return { background: '#fefce8' };
              if (idx === 1) return { background: '#f9fafb' };
              if (idx === 2) return { background: '#fff7ed' };
              return undefined;
            }}
          />
        </div>
      </div>

      {detalleId !== null && (
        <ClienteDetalle clienteId={detalleId} onClose={() => setDetalleId(null)} />
      )}
    </div>
  );
}
