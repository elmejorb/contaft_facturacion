import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from 'ag-grid-community';
import { Package, CheckCircle, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getConfigImpresion } from './ConfiguracionSistema';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/ventas';

interface PendienteRow {
  origen: 'POS' | 'FE';
  numero: string;
  id_doc: number;
  doc_elec_id: number | null;
  Fecha: string;
  CodigoCli: number;
  cliente: string;
  codigo_art: string | null;
  articulo: string;
  items: number;
  cantidad: number;              // total facturado
  cantidad_entregada: number;    // ya entregado acumulado
  cantidad_faltante: number;     // lo que falta por entregar
  precio: number;
  subtotal: number;              // precio × cantidad_faltante
  id_detalle: number;
  dias_transcurridos: number;
  dias_restantes: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
}

const theme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff',
  headerTextColor: '#6b21a8',
  oddRowBackgroundColor: '#fafafa',
  rowHoverColor: '#f5f3ff',
  fontFamily: 'inherit', fontSize: 12,
  headerFontSize: 11, headerFontWeight: 700,
});

const fmtMon = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');

export default function PendientesEntrega() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PendienteRow[]>([]);
  const [resumen, setResumen] = useState<{ rojo: number; amarillo: number; verde: number }>({ rojo: 0, amarillo: 0, verde: 0 });
  const [diasEstimados, setDiasEstimados] = useState(getConfigImpresion().diasEstimadosEntrega || 7);
  const [cargando, setCargando] = useState(true);
  const [filtroSemaforo, setFiltroSemaforo] = useState<'todos' | 'rojo' | 'amarillo' | 'verde'>('todos');
  const [entregarRow, setEntregarRow] = useState<PendienteRow | null>(null);
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [cantidadAEntregar, setCantidadAEntregar] = useState<string>('');
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await fetch(`${API}/pendientes-entrega.php`);
      const d = await r.json();
      if (d.success) {
        setRows(d.pendientes || []);
        setResumen(d.resumen || { rojo: 0, amarillo: 0, verde: 0 });
        setDiasEstimados(d.dias_estimados || 7);
      } else {
        toast.error(d.message || 'Error cargando pendientes');
      }
    } catch (e) { toast.error('Error de red'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const marcarEntregado = async () => {
    if (!entregarRow) return;
    const cantNum = parseFloat(cantidadAEntregar) || 0;
    if (cantNum <= 0) { toast.error('Cantidad debe ser mayor que 0'); return; }
    if (cantNum > entregarRow.cantidad_faltante) {
      toast.error(`Máximo ${entregarRow.cantidad_faltante} unidades (faltante)`);
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch(`${API}/marcar-entregado.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: entregarRow.origen,
          id_detalle: entregarRow.id_detalle,
          fecha_entrega: fechaEntrega,
          cantidad_a_entregar: cantNum,
          usuario_id: user?.id || 0,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message || 'Entregado ✓');
        setEntregarRow(null);
        cargar();
      } else toast.error(d.message || 'Error');
    } catch (e) { toast.error('Error de red'); }
    finally { setEnviando(false); }
  };

  const filas = filtroSemaforo === 'todos' ? rows : rows.filter(r => r.semaforo === filtroSemaforo);

  const cols: ColDef[] = [
    { headerName: 'Origen', field: 'origen', width: 70,
      cellRenderer: (p: any) => (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: p.value === 'FE' ? '#dcfce7' : '#f3f4f6',
          color: p.value === 'FE' ? '#15803d' : '#6b7280' }}>{p.value}</span>
      )
    },
    { headerName: 'Factura', field: 'numero', width: 100, cellStyle: { fontWeight: 600, color: '#7c3aed' } },
    { headerName: 'Fecha', field: 'Fecha', width: 100,
      valueFormatter: (p: any) => p.value ? new Date(p.value.replace(' ', 'T')).toLocaleDateString('es-CO') : '-'
    },
    { headerName: 'Cliente', field: 'cliente', flex: 1, minWidth: 180, filter: true, sortable: true },
    { headerName: 'Artículo', field: 'articulo', flex: 1, minWidth: 180, filter: true, sortable: true,
      cellRenderer: (p: any) => (
        <span>{p.value} {p.data?.codigo_art && <span style={{ color: '#9ca3af', fontSize: 10 }}>({p.data.codigo_art})</span>}</span>
      )
    },
    { headerName: 'Cant.', field: 'cantidad', width: 65, cellStyle: { textAlign: 'center', color: '#6b7280' } },
    { headerName: 'Entreg.', field: 'cantidad_entregada', width: 70, cellStyle: { textAlign: 'center', color: '#16a34a' },
      cellRenderer: (p: any) => p.value > 0 ? String(p.value) : '-' },
    { headerName: 'Faltan', field: 'cantidad_faltante', width: 75, cellStyle: { textAlign: 'center', fontWeight: 700, color: '#dc2626' } },
    { headerName: 'Pendiente $', field: 'subtotal', width: 115, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => fmtMon(p.value || 0)
    },
    { headerName: 'Días', field: 'dias_transcurridos', width: 85, cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const colors = { rojo: '#dc2626', amarillo: '#d97706', verde: '#16a34a' };
        const bg = { rojo: '#fee2e2', amarillo: '#fef3c7', verde: '#dcfce7' };
        return (
          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: bg[p.data.semaforo as keyof typeof bg], color: colors[p.data.semaforo as keyof typeof colors] }}>
            {p.value}d {p.data.semaforo === 'rojo' && `(+${Math.abs(p.data.dias_restantes)})`}
          </span>
        );
      }
    },
    { headerName: '', width: 110, sortable: false,
      cellRenderer: (p: any) => (
        <button onClick={() => {
          setEntregarRow(p.data);
          setFechaEntrega(new Date().toISOString().slice(0, 10));
          setCantidadAEntregar(String(p.data.cantidad_faltante));
        }}
          style={{ height: 24, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle size={12} /> Entregar
        </button>
      )
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} color="#7c3aed" /> Pendientes por Entregar
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Productos vendidos que aún están por producir. Base: {diasEstimados} días estimados.</p>
        </div>
        <button onClick={cargar} disabled={cargando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: cargando ? 0.5 : 1 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Stats + filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { k: 'todos', label: 'Total', value: rows.length, color: '#6b7280', bg: '#f3f4f6' },
          { k: 'rojo', label: 'En retraso', value: resumen.rojo, color: '#dc2626', bg: '#fee2e2' },
          { k: 'amarillo', label: 'Por vencer', value: resumen.amarillo, color: '#d97706', bg: '#fef3c7' },
          { k: 'verde', label: 'En plazo', value: resumen.verde, color: '#16a34a', bg: '#dcfce7' },
        ].map(s => (
          <button key={s.k} onClick={() => setFiltroSemaforo(s.k as any)}
            style={{ padding: 14, background: '#fff', borderRadius: 10, border: filtroSemaforo === s.k ? `2px solid ${s.color}` : '1px solid #e5e7eb',
              cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 520 }}>
        <AgGridReact theme={theme} rowData={filas} columnDefs={cols}
          rowHeight={38} headerHeight={34}
          overlayNoRowsTemplate='<span style="color:#9ca3af;font-size:13px;">No hay pendientes por entregar</span>' />
      </div>

      {/* Modal entregar */}
      {entregarRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>Marcar como entregado</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              <b>{entregarRow.articulo}</b><br/>
              <span style={{ fontSize: 12 }}>{entregarRow.origen} {entregarRow.numero} · {entregarRow.cliente}</span><br/>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Facturado: {entregarRow.cantidad} · Entregado: {entregarRow.cantidad_entregada} · Faltan: <b style={{ color: '#dc2626' }}>{entregarRow.cantidad_faltante}</b></span>
            </p>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Cantidad a entregar
            </label>
            <input type="text" inputMode="decimal" value={cantidadAEntregar}
              onChange={e => setCantidadAEntregar(e.target.value.replace(/[^0-9.]/g, ''))}
              style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, textAlign: 'right', fontWeight: 700 }} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, marginBottom: 12 }}>
              Máximo {entregarRow.cantidad_faltante}. Puede entregar en varias veces (ej: 5 hoy, 5 mañana).
            </p>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
              Fecha de entrega
            </label>
            <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Se descuenta el inventario con esta fecha y se registra en kardex.</p>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEntregarRow(null)} disabled={enviando}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={marcarEntregado} disabled={enviando || !fechaEntrega}
                style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: enviando ? 0.5 : 1 }}>
                {enviando ? 'Entregando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
