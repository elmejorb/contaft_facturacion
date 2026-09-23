import { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Truck, RefreshCw, CheckCircle2, XCircle, Eye, ClipboardCheck, DollarSign, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#f0fdf4',
  headerTextColor: '#166534',
  headerFontSize: 12,
  headerFontWeight: 600,
  fontSize: 12,
  rowBorder: { color: '#f3f4f6', width: 1 },
  borderColor: '#e5e7eb',
  borderRadius: 8,
  rowHoverColor: '#f0fdf4',
  selectedRowBackgroundColor: '#dcfce7',
  spacing: 6,
});

const API = 'http://localhost:80/conta-app-backend/api/cargues-vendedor';

interface Cargue {
  id: number;
  id_cargue_hub: number | null;
  codigo_vendedor: string;
  nombre_vendedor: string;
  fecha: string;
  estado: 'pendiente' | 'aprobado' | 'cerrado' | 'rechazado';
  total_valor_cargue: number;
  total_valor_devuelto: number;
  total_valor_danado: number;
  dinero_recibido: number;
  valor_esperado: number;
  diferencia_caja: number;
  notas_vendedor: string | null;
  notas_admin: string | null;
  aprobado_at: string | null;
  cerrado_at: string | null;
  created_at: string;
  lineas: number;
}

interface Linea {
  id: number;
  items: number;
  nombre_articulo: string | null;
  cant_cargue: number;
  cant_devuelta: number;
  cant_danada: number;
  precio_venta_unitario: number;
  precio_costo_unitario: number;
  stock_actual: number | null;
}

interface Conteos { pendiente: number; aprobado: number; cerrado: number; rechazado: number; }

const fmt = (v: number | string | null | undefined) =>
  '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO');

const ESTADOS: Array<{ key: string; label: string; color: string; bg: string }> = [
  { key: 'todos',     label: 'Todos',     color: '#4b5563', bg: '#f3f4f6' },
  { key: 'pendiente', label: 'Pendientes', color: '#92400e', bg: '#fef3c7' },
  { key: 'aprobado',  label: 'Aprobados', color: '#166534',  bg: '#dcfce7' },
  { key: 'cerrado',   label: 'Cerrados',  color: '#1e40af',  bg: '#dbeafe' },
  { key: 'rechazado', label: 'Rechazados', color: '#991b1b', bg: '#fee2e2' },
];

const badgeEstado = (estado: string) => {
  const st = ESTADOS.find(e => e.key === estado);
  const bg = st?.bg ?? '#f3f4f6';
  const color = st?.color ?? '#4b5563';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: bg, color,
    }}>{estado}</span>
  );
};

export function CarguesVendedor() {
  const [cargues, setCargues] = useState<Cargue[]>([]);
  const [conteos, setConteos] = useState<Conteos>({ pendiente: 0, aprobado: 0, cerrado: 0, rechazado: 0 });
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [loading, setLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [detalle, setDetalle] = useState<{ cargue: any; detalle: Linea[] } | null>(null);
  const [notasAdmin, setNotasAdmin] = useState('');
  const [notasCuadre, setNotasCuadre] = useState('');
  const [accionLoading, setAccionLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado && filtroEstado !== 'todos') params.set('estado', filtroEstado);
      const r = await fetch(`${API}/list.php?${params.toString()}`);
      const d = await r.json();
      if (d.success) {
        setCargues(d.cargues || []);
        setConteos(d.conteos_30d || { pendiente: 0, aprobado: 0, cerrado: 0, rechazado: 0 });
      } else {
        toast.error(d.message || 'Error cargando cargues');
      }
    } catch (e: any) {
      toast.error('Error de red: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const pullDelHub = async () => {
    setPullLoading(true);
    try {
      const r = await fetch(`${API}/pull-from-hub.php`);
      const d = await r.json();
      if (d.success) {
        toast.success(d.message || 'Pull OK');
        await cargar();
      } else {
        toast.error(d.message || 'Error en pull');
      }
    } catch (e: any) {
      toast.error('Error de red: ' + e.message);
    } finally {
      setPullLoading(false);
    }
  };

  const abrirDetalle = async (id: number) => {
    try {
      const r = await fetch(`${API}/detalle.php?id=${id}`);
      const d = await r.json();
      if (d.success) {
        setDetalle({ cargue: d.cargue, detalle: d.detalle || [] });
        setNotasAdmin(d.cargue?.notas_admin || '');
        setNotasCuadre('');
      } else {
        toast.error(d.message);
      }
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const aprobar = async () => {
    if (!detalle) return;
    setAccionLoading(true);
    try {
      const r = await fetch(`${API}/aprobar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detalle.cargue.id, notas_admin: notasAdmin }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Aprobado'); setDetalle(null); await cargar(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setAccionLoading(false); }
  };

  const rechazar = async () => {
    if (!detalle) return;
    if (!notasAdmin.trim()) { toast.error('Escriba el motivo del rechazo'); return; }
    if (!confirm(`¿Rechazar el cargue de ${detalle.cargue.nombre_vendedor}? El vendedor podrá crear uno nuevo.`)) return;
    setAccionLoading(true);
    try {
      const r = await fetch(`${API}/rechazar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detalle.cargue.id, notas_admin: notasAdmin }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Rechazado'); setDetalle(null); await cargar(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setAccionLoading(false); }
  };

  const cuadrar = async () => {
    if (!detalle) return;
    if (!notasCuadre.trim()) { toast.error('Escriba la nota del cuadre'); return; }
    setAccionLoading(true);
    try {
      const r = await fetch(`${API}/cuadrar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detalle.cargue.id, notas_admin_final: notasCuadre }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Cuadre registrado'); setDetalle(null); await cargar(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setAccionLoading(false); }
  };

  const columnDefs = useMemo(() => [
    { field: 'fecha', headerName: 'Fecha', width: 100 },
    { field: 'codigo_vendedor', headerName: 'Cod', width: 70 },
    { field: 'nombre_vendedor', headerName: 'Vendedor', flex: 1, minWidth: 180 },
    {
      field: 'estado', headerName: 'Estado', width: 110,
      cellRenderer: (p: any) => badgeEstado(p.value),
    },
    { field: 'lineas', headerName: 'Ítems', width: 70, cellStyle: { textAlign: 'right' } },
    {
      field: 'total_valor_cargue', headerName: 'Cargue', width: 110,
      valueFormatter: (p: any) => fmt(p.value), cellStyle: { textAlign: 'right' },
    },
    {
      field: 'valor_esperado', headerName: 'Esperado', width: 110,
      valueFormatter: (p: any) => fmt(p.value), cellStyle: { textAlign: 'right', color: '#1e40af' },
    },
    {
      field: 'dinero_recibido', headerName: 'Recibido', width: 110,
      valueFormatter: (p: any) => fmt(p.value), cellStyle: { textAlign: 'right' },
    },
    {
      field: 'diferencia_caja', headerName: 'Dif. caja', width: 110,
      valueFormatter: (p: any) => fmt(p.value),
      cellStyle: (p: any) => ({
        textAlign: 'right',
        color: Math.abs(Number(p.value) || 0) < 1 ? '#166534' : (Number(p.value) < 0 ? '#991b1b' : '#92400e'),
        fontWeight: 600,
      }),
    },
    {
      headerName: 'Acciones', width: 90,
      cellRenderer: (p: any) => (
        <button
          onClick={() => abrirDetalle(p.data.id)}
          title="Ver detalle"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', height: 24, background: '#f0fdf4',
            border: '1px solid #86efac', borderRadius: 4, color: '#166534',
            cursor: 'pointer', fontSize: 11, fontWeight: 500,
          }}>
          <Eye size={12} /> Ver
        </button>
      ),
    },
  ], []);

  return (
    <div style={{ padding: 12 }}>
      {/* Header compacto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={20} color="#166534" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Cargues de Vendedores</h2>
        </div>
        <button
          onClick={pullDelHub}
          disabled={pullLoading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', height: 28, background: '#059669',
            color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, opacity: pullLoading ? 0.6 : 1,
          }}>
          <RefreshCw size={14} className={pullLoading ? 'animate-spin' : ''} />
          {pullLoading ? 'Sincronizando...' : 'Sincronizar del hub'}
        </button>
      </div>

      {/* KPIs compactos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        {ESTADOS.filter(e => e.key !== 'todos').map(st => (
          <div key={st.key} style={{
            padding: 8, background: st.bg, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.color,
            }}>
              {st.key === 'pendiente' ? <Package size={18} /> :
               st.key === 'aprobado' ? <CheckCircle2 size={18} /> :
               st.key === 'cerrado' ? <ClipboardCheck size={18} /> :
               <XCircle size={18} />}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: st.color }}>
                {conteos[st.key as keyof Conteos]}
              </div>
              <div style={{ fontSize: 10, color: st.color, opacity: 0.8 }}>{st.label} (30 d)</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {ESTADOS.map(st => (
          <button
            key={st.key}
            onClick={() => setFiltroEstado(st.key)}
            style={{
              padding: '4px 10px', height: 26, borderRadius: 12,
              border: filtroEstado === st.key ? `1px solid ${st.color}` : '1px solid #e5e7eb',
              background: filtroEstado === st.key ? st.bg : 'white',
              color: filtroEstado === st.key ? st.color : '#6b7280',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
            {st.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ height: 'calc(100vh - 280px)', width: '100%' }}>
        <AgGridReact
          theme={myTheme}
          rowData={cargues}
          columnDefs={columnDefs as any}
          localeText={AG_GRID_LOCALE_ES}
          rowHeight={32}
          headerHeight={32}
          loading={loading}
          overlayNoRowsTemplate="<span style='padding:20px;color:#6b7280'>Sin cargues</span>"
        />
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div
          onClick={() => setDetalle(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 8, width: '90%', maxWidth: 900,
              maxHeight: '90vh', overflow: 'auto', padding: 16,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Cargue #{detalle.cargue.id} — {detalle.cargue.nombre_vendedor}
                </h3>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  Fecha {detalle.cargue.fecha} · {badgeEstado(detalle.cargue.estado)}
                </div>
              </div>
              <button
                onClick={() => setDetalle(null)}
                style={{ padding: '4px 10px', height: 26, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                Cerrar
              </button>
            </div>

            {/* Cifras */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: '#166534' }}>Total cargue</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(detalle.cargue.total_valor_cargue)}</div>
              </div>
              <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: '#92400e' }}>Devuelto + Dañado</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {fmt(Number(detalle.cargue.total_valor_devuelto) + Number(detalle.cargue.total_valor_danado))}
                </div>
              </div>
              <div style={{ padding: 8, background: '#dbeafe', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: '#1e40af' }}>Esperado (venta)</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(detalle.cargue.valor_esperado)}</div>
              </div>
              <div style={{
                padding: 8,
                background: Math.abs(Number(detalle.cargue.diferencia_caja) || 0) < 1 ? '#dcfce7' : '#fee2e2',
                borderRadius: 4,
              }}>
                <div style={{ fontSize: 10, color: '#374151' }}>Dif. caja</div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: Math.abs(Number(detalle.cargue.diferencia_caja) || 0) < 1 ? '#166534' :
                         (Number(detalle.cargue.diferencia_caja) < 0 ? '#991b1b' : '#92400e'),
                }}>
                  {fmt(detalle.cargue.diferencia_caja)}
                </div>
              </div>
            </div>

            {/* Notas vendedor */}
            {detalle.cargue.notas_vendedor && (
              <div style={{ padding: 8, background: '#f9fafb', borderRadius: 4, marginBottom: 10, fontSize: 12 }}>
                <strong style={{ color: '#4b5563' }}>Nota del vendedor:</strong> {detalle.cargue.notas_vendedor}
              </div>
            )}

            {/* Líneas */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
              <thead>
                <tr style={{ background: '#f0fdf4', color: '#166534' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #86efac' }}>Producto</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #86efac' }}>Cargue</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #86efac' }}>Devuelto</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #86efac' }}>Dañado</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #86efac' }}>Vendido</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #86efac' }}>PVP</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #86efac' }}>Total vendido</th>
                </tr>
              </thead>
              <tbody>
                {detalle.detalle.map(l => {
                  const vend = Number(l.cant_cargue) - Number(l.cant_devuelta) - Number(l.cant_danada);
                  const totalV = vend * Number(l.precio_venta_unitario);
                  return (
                    <tr key={l.id}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                        {l.nombre_articulo || <em style={{ color: '#9ca3af' }}>items {l.items} (no local)</em>}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{l.cant_cargue}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#92400e' }}>{l.cant_devuelta}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#991b1b' }}>{l.cant_danada}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>{vend}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{fmt(l.precio_venta_unitario)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>{fmt(totalV)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Acciones según estado */}
            {detalle.cargue.estado === 'pendiente' && (
              <div style={{ padding: 10, background: '#fef3c7', borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#92400e' }}>
                  Aprobar / Rechazar
                </div>
                <textarea
                  placeholder="Notas para el vendedor (opcional al aprobar, obligatorio al rechazar)"
                  value={notasAdmin}
                  onChange={e => setNotasAdmin(e.target.value)}
                  style={{ width: '100%', padding: 6, border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12, minHeight: 50 }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={rechazar}
                    disabled={accionLoading}
                    style={{ padding: '6px 12px', height: 28, background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <XCircle size={14} /> Rechazar
                  </button>
                  <button
                    onClick={aprobar}
                    disabled={accionLoading}
                    style={{ padding: '6px 12px', height: 28, background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> Aprobar
                  </button>
                </div>
              </div>
            )}

            {detalle.cargue.estado === 'aprobado' && (
              <div style={{ padding: 10, background: '#dcfce7', borderRadius: 4, fontSize: 12, color: '#166534' }}>
                Cargue aprobado. Esperando cierre del vendedor al final del día.
                {detalle.cargue.aprobado_at && <div style={{ fontSize: 10, marginTop: 2 }}>Aprobado el {detalle.cargue.aprobado_at}</div>}
              </div>
            )}

            {detalle.cargue.estado === 'cerrado' && (
              <div style={{ padding: 10, background: '#dbeafe', borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DollarSign size={14} /> Cuadre del admin
                </div>
                <textarea
                  placeholder="Notas del cuadre (ej: 'Falta $2000, se descontará')"
                  value={notasCuadre}
                  onChange={e => setNotasCuadre(e.target.value)}
                  style={{ width: '100%', padding: 6, border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12, minHeight: 50 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    onClick={cuadrar}
                    disabled={accionLoading}
                    style={{ padding: '6px 12px', height: 28, background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ClipboardCheck size={14} /> Registrar cuadre
                  </button>
                </div>
                {detalle.cargue.notas_admin && (
                  <div style={{ marginTop: 8, padding: 6, background: 'white', borderRadius: 4, fontSize: 11, whiteSpace: 'pre-wrap' }}>
                    {detalle.cargue.notas_admin}
                  </div>
                )}
              </div>
            )}

            {detalle.cargue.estado === 'rechazado' && (
              <div style={{ padding: 10, background: '#fee2e2', borderRadius: 4, fontSize: 12, color: '#991b1b' }}>
                Cargue rechazado. {detalle.cargue.notas_admin && <div style={{ marginTop: 4 }}>{detalle.cargue.notas_admin}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
