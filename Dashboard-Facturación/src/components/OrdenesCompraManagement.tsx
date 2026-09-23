import { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Plus, RefreshCw, FileText, PackageCheck, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { NuevaOrdenCompra } from './NuevaOrdenCompra';
import { useAuth } from '../contexts/AuthContext';

const API = 'http://localhost:80/conta-app-backend/api/ordenes-compra';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  Pendiente: { bg: '#fef3c7', color: '#d97706' },
  Parcial:   { bg: '#dbeafe', color: '#2563eb' },
  Recibida:  { bg: '#dcfce7', color: '#16a34a' },
  Anulada:   { bg: '#f3f4f6', color: '#6b7280' },
};

interface OC {
  id_oc: number;
  numero_oc: string;
  fecha: string;
  fecha_entrega: string | null;
  CodigoPro: number;
  proveedor: string | null;
  Total: number;
  Estado: string;
  pedido_generado_n: number | null;
  Comentario: string | null;
  lineas: number;
}

// Puente desde Stock Bajo — array de productos con cantidad sugerida.
const LS_PRECARGA_OC = 'precarga_oc_stockbajo';

export function OrdenesCompraManagement() {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<OC[]>([]);
  const [resumen, setResumen] = useState<Record<string, { n: number; monto: number }>>({});
  const [cargando, setCargando] = useState(false);
  const [modo, setModo] = useState<'lista' | 'nueva'>('lista');
  // Productos precargados desde Stock Bajo. Se lee al montar y si viene se
  // salta directo a modo 'nueva' con los productos ya cargados.
  const [precargaPendiente, setPrecargaPendiente] = useState<any[] | null>(() => {
    try {
      const raw = localStorage.getItem(LS_PRECARGA_OC);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        localStorage.removeItem(LS_PRECARGA_OC);
        return arr;
      }
    } catch (e) {}
    return null;
  });
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [buscar, setBuscar] = useState('');
  const [ocDetalle, setOcDetalle] = useState<any | null>(null);
  const [modalRecibir, setModalRecibir] = useState<OC | null>(null);
  const [modalAnular, setModalAnular] = useState<OC | null>(null);
  const gridRef = useRef<any>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      const r = await fetch(`${API}/listar.php?${params}`);
      const d = await r.json();
      if (d.success) {
        setOrdenes(d.ordenes);
        setResumen(d.resumen);
      } else {
        toast.error(d.message || 'Error');
      }
    } catch (e: any) {
      toast.error('Error al cargar: ' + e.message);
    }
    setCargando(false);
  }, [filtroEstado, fechaDesde, fechaHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (id_oc: number) => {
    const r = await fetch(`${API}/detalle.php?id=${id_oc}`);
    const d = await r.json();
    if (!d.success) { toast.error(d.message); return; }
    setOcDetalle(d);
  };

  // Si tenemos precarga y aún estamos en modo lista, activar 'nueva' automáticamente
  useEffect(() => {
    if (precargaPendiente && precargaPendiente.length > 0 && modo === 'lista') {
      setModo('nueva');
      toast.success(`${precargaPendiente.length} producto${precargaPendiente.length > 1 ? 's' : ''} precargado${precargaPendiente.length > 1 ? 's' : ''} desde Stock Bajo`);
    }
  }, [precargaPendiente, modo]);

  if (modo === 'nueva') {
    return <NuevaOrdenCompra
      onClose={() => { setModo('lista'); cargar(); }}
      precargaProductos={precargaPendiente || undefined}
      onPrecargaConsumida={() => setPrecargaPendiente(null)}
    />;
  }

  const filtradas = buscar
    ? ordenes.filter(o =>
        (o.numero_oc || '').toLowerCase().includes(buscar.toLowerCase()) ||
        (o.proveedor || '').toLowerCase().includes(buscar.toLowerCase()))
    : ordenes;

  const totalGlobal = filtradas.reduce((s, o) => s + Number(o.Total), 0);

  const colDefs: any[] = [
    { field: 'numero_oc', headerName: 'N° OC', width: 115, cellStyle: { color: '#7c3aed', fontWeight: 600 } },
    { field: 'fecha', headerName: 'Fecha', width: 105,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '' },
    { field: 'fecha_entrega', headerName: 'Entrega', width: 105,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '—' },
    { field: 'proveedor', headerName: 'Proveedor', flex: 1, minWidth: 200,
      valueFormatter: (p: any) => p.value || `Cod ${p.data.CodigoPro}` },
    { field: 'lineas', headerName: 'Ítems', width: 75, cellStyle: { textAlign: 'center' } },
    { field: 'Total', headerName: 'Total', width: 130, cellStyle: { textAlign: 'right', fontWeight: 700 },
      valueFormatter: (p: any) => fmtMon(p.value || 0) },
    { field: 'Estado', headerName: 'Estado', width: 105,
      cellRenderer: (p: any) => {
        const c = ESTADO_COLORS[p.value] || ESTADO_COLORS.Anulada;
        return <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{p.value}</span>;
      }
    },
    { field: 'pedido_generado_n', headerName: 'Pedido', width: 85, cellStyle: { textAlign: 'center', color: '#059669', fontWeight: 600 },
      valueFormatter: (p: any) => p.value ? `#${p.value}` : '—' },
    {
      headerName: 'Acciones', width: 120, sortable: false, filter: false,
      cellRenderer: (p: any) => {
        const o: OC = p.data;
        return (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <button onClick={() => verDetalle(o.id_oc)} title="Ver detalle"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <FileText size={15} color="#7c3aed" />
            </button>
            {(o.Estado === 'Pendiente' || o.Estado === 'Parcial') && (
              <>
                <button onClick={() => setModalRecibir(o)} title="Recibir mercancía"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <PackageCheck size={15} color="#16a34a" />
                </button>
                <button onClick={() => setModalAnular(o)} title="Anular"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <XCircle size={15} color="#dc2626" />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Órdenes de Compra</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Registre pedidos al proveedor antes de que llegue la mercancía</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#f3e8ff', padding: '6px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Total: </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>{fmtMon(totalGlobal)}</span>
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>({filtradas.length})</span>
          </div>
          <button onClick={() => setModo('nueva')}
            style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <Plus size={14} /> Nueva OC
          </button>
        </div>
      </div>

      {/* Chips resumen por estado */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['Pendiente', 'Parcial', 'Recibida', 'Anulada'] as const).map(est => {
          const c = ESTADO_COLORS[est];
          const activo = filtroEstado === est;
          return (
            <button key={est}
              onClick={() => setFiltroEstado(activo ? '' : est)}
              style={{
                flex: 1, padding: '8px 10px', border: `2px solid ${activo ? c.color : '#e5e7eb'}`,
                borderRadius: 10, background: activo ? c.bg : '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
              }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{est}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{resumen[est]?.n || 0}</span>
              <span style={{ fontSize: 10, color: '#6b7280' }}>{fmtMon(resumen[est]?.monto || 0)}</span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: '#fff', padding: '8px 12px', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ ...inp, width: 130 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ ...inp, width: 130 }} />
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320, marginTop: 14 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 7, color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar por N° o proveedor..." value={buscar}
            onChange={e => setBuscar(e.target.value)}
            style={{ ...inp, width: '100%', paddingLeft: 28 }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={cargar} disabled={cargando}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 14 }}>
          <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} /> Refrescar
        </button>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 320px)', width: '100%', fontSize: 12, ['--ag-font-size' as any]: '12px' }}>
        <AgGridReact
          ref={gridRef}
          rowData={filtradas}
          columnDefs={colDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          animateRows
          rowHeight={34}
          headerHeight={30}
          getRowId={(p: any) => String(p.data.id_oc)}
          overlayNoRowsTemplate="<span style='font-size:13px;color:#6b7280'>Sin órdenes de compra</span>"
        />
      </div>

      {/* Modales */}
      {ocDetalle && <ModalDetalle data={ocDetalle} onClose={() => setOcDetalle(null)} />}
      {modalRecibir && (
        <ModalRecibir
          oc={modalRecibir}
          idUsuario={(user as any)?.Id_Usuario ?? (user as any)?.id}
          onClose={() => setModalRecibir(null)}
          onSuccess={() => { setModalRecibir(null); cargar(); }}
        />
      )}
      {modalAnular && (
        <ModalAnular
          oc={modalAnular}
          onClose={() => setModalAnular(null)}
          onSuccess={() => { setModalAnular(null); cargar(); }}
        />
      )}
    </div>
  );
}

// ============= Modal Detalle =============
function ModalDetalle({ data, onClose }: { data: any; onClose: () => void }) {
  const o = data.orden;
  const c = ESTADO_COLORS[o.Estado] || ESTADO_COLORS.Anulada;
  return (
    <div style={overlay}>
      <div style={{ ...modalCard, width: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: '#7c3aed', fontWeight: 700 }}>{o.numero_oc}</h3>
            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, display: 'inline-block', marginTop: 4 }}>{o.Estado}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, marginBottom: 12, background: '#f9fafb', padding: 10, borderRadius: 8 }}>
          <div><span style={lbl}>Fecha:</span> {o.fecha}</div>
          <div><span style={lbl}>Entrega:</span> {o.fecha_entrega || '—'}</div>
          <div><span style={lbl}>Proveedor:</span> {o.proveedor_nombre}</div>
          <div><span style={lbl}>NIT:</span> {o.proveedor_nit || '—'}</div>
          <div><span style={lbl}>Usuario:</span> {o.usuario_nombre || '—'}</div>
          {o.pedido_generado_n && <div><span style={lbl}>Pedido generado:</span> <strong style={{ color: '#059669' }}>#{o.pedido_generado_n}</strong></div>}
        </div>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 10 }}>
          <thead style={{ background: '#f3e8ff' }}>
            <tr>
              <th style={{ padding: 6, textAlign: 'left', color: '#7c3aed' }}>Código</th>
              <th style={{ padding: 6, textAlign: 'left', color: '#7c3aed' }}>Producto</th>
              <th style={{ padding: 6, textAlign: 'right', color: '#7c3aed' }}>Cant.</th>
              <th style={{ padding: 6, textAlign: 'right', color: '#7c3aed' }}>Recibida</th>
              <th style={{ padding: 6, textAlign: 'right', color: '#7c3aed' }}>Precio</th>
              <th style={{ padding: 6, textAlign: 'right', color: '#7c3aed' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it: any) => (
              <tr key={it.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: 5 }}>{it.articulo_codigo}</td>
                <td style={{ padding: 5 }}>{it.articulo_nombre}</td>
                <td style={{ padding: 5, textAlign: 'right' }}>{it.Cantidad}</td>
                <td style={{ padding: 5, textAlign: 'right', fontWeight: 600, color: it.Cantidad_Recibida < it.Cantidad ? '#d97706' : '#16a34a' }}>
                  {it.Cantidad_Recibida}
                </td>
                <td style={{ padding: 5, textAlign: 'right' }}>{fmtMon(it.PrecioC)}</td>
                <td style={{ padding: 5, textAlign: 'right', fontWeight: 600 }}>{fmtMon(it.Subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8, fontSize: 12 }}>
          <div style={rowT}><span>Impuesto:</span><span>{fmtMon(+o.Impuesto)}</span></div>
          <div style={rowT}><span>Descuento:</span><span>{fmtMon(+o.Descuento)}</span></div>
          <div style={rowT}><span>Flete:</span><span>{fmtMon(+o.Flete)}</span></div>
          <div style={rowT}><span>Retención:</span><span>{fmtMon(+o.Retencion)}</span></div>
          <div style={{ ...rowT, fontWeight: 700, fontSize: 14, color: '#7c3aed', borderTop: '1px solid #d1d5db', paddingTop: 6, marginTop: 4 }}>
            <span>TOTAL:</span><span>{fmtMon(+o.Total)}</span>
          </div>
        </div>
        {o.Comentario && (
          <div style={{ marginTop: 10, fontSize: 12, background: '#fef9c3', padding: 8, borderRadius: 6, color: '#713f12' }}>
            <strong>Comentario:</strong> {o.Comentario}
          </div>
        )}
      </div>
    </div>
  );
}

// ============= Modal Recibir =============
function ModalRecibir({ oc, idUsuario, onClose, onSuccess }: {
  oc: OC; idUsuario?: number; onClose: () => void; onSuccess: () => void;
}) {
  const [facturaCompra, setFacturaCompra] = useState('');
  const [tipoPedido, setTipoPedido] = useState('Contado');
  const [dias, setDias] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!facturaCompra.trim()) { toast.error('Ingrese el N° de factura del proveedor'); return; }
    setEnviando(true);
    try {
      const r = await fetch(`${API}/recibir.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_oc: oc.id_oc,
          FacturaCompra_N: facturaCompra.trim(),
          TipoPedido: tipoPedido,
          Dias: dias,
          Id_Usuario: idUsuario,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success(`Recibida — Pedido #${d.pedido_n} · ${fmtMon(d.total_compra)}`);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    }
    setEnviando(false);
  };

  return (
    <div style={overlay}>
      <div style={modalCard}>
        <h3 style={{ margin: 0, marginBottom: 4, fontSize: 16, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <PackageCheck size={18} /> Recibir {oc.numero_oc}
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 12px' }}>
          Se creará el pedido de compra, se actualizará el kardex e inventario.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={lbl2}>N° Factura Proveedor *</label>
            <input autoFocus value={facturaCompra} onChange={e => setFacturaCompra(e.target.value)}
              style={inp2} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl2}>Tipo</label>
              <select value={tipoPedido} onChange={e => setTipoPedido(e.target.value)} style={inp2}>
                <option value="Contado">Contado</option>
                <option value="Credito">Crédito</option>
              </select>
            </div>
            <div>
              <label style={lbl2}>Días crédito</label>
              <input type="text" inputMode="numeric" value={dias}
                onChange={e => setDias(Number(e.target.value) || 0)}
                disabled={tipoPedido === 'Contado'} style={inp2} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={btnGris}>Cancelar</button>
          <button onClick={confirmar} disabled={enviando}
            style={{ ...btnVerde, opacity: enviando ? 0.6 : 1 }}>
            Confirmar recepción
          </button>
        </div>
      </div>
    </div>
  );
}

// ============= Modal Anular =============
function ModalAnular({ oc, onClose, onSuccess }: { oc: OC; onClose: () => void; onSuccess: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    try {
      const r = await fetch(`${API}/anular.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_oc: oc.id_oc, motivo }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('OC anulada');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    }
    setEnviando(false);
  };

  return (
    <div style={overlay}>
      <div style={modalCard}>
        <h3 style={{ margin: 0, marginBottom: 4, fontSize: 16, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <XCircle size={18} /> Anular {oc.numero_oc}
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>
          La OC quedará como <strong>Anulada</strong>. Kardex e inventario NO se ven afectados.
        </p>
        <label style={lbl2}>Motivo (opcional)</label>
        <input autoFocus value={motivo} onChange={e => setMotivo(e.target.value)} style={inp2} />
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={btnGris}>Cancelar</button>
          <button onClick={confirmar} disabled={enviando}
            style={{ ...btnRojo, opacity: enviando ? 0.6 : 1 }}>
            Anular
          </button>
        </div>
      </div>
    </div>
  );
}

// =============== Estilos compartidos ===============
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modalCard: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 18, width: 420, maxHeight: '85vh',
  overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
};
const lbl: React.CSSProperties = { color: '#6b7280', fontSize: 11 };
const lbl2: React.CSSProperties = { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 };
const inp2: React.CSSProperties = { width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, outline: 'none' };
const rowT: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '2px 0' };
const btnGris: React.CSSProperties = { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnVerde: React.CSSProperties = { background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnRojo: React.CSSProperties = { background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
