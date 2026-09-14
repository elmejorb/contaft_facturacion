import { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Plus, RefreshCw, XCircle, Search, ArrowUpFromLine, ArrowDownToLine, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { esFarmacia } from './ConfiguracionSistema';

const API = 'http://localhost:80/conta-app-backend/api/movs-directos';
const API_BUSCAR = 'http://localhost:80/conta-app-backend/api/compras/nueva.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

const MOTIVOS_ENTRADA = [
  { key: 'ajuste_positivo',    label: 'Ajuste (+) sobrante' },
  { key: 'regalo_proveedor',   label: 'Regalo / muestra proveedor' },
  { key: 'devolucion_cliente', label: 'Devolución de cliente' },
  { key: 'traslado',           label: 'Traslado entre bodegas' },
  { key: 'produccion',         label: 'Producción propia' },
  { key: 'reingreso',          label: 'Reingreso por corrección' },
  { key: 'otro',               label: 'Otro' },
];
const MOTIVOS_SALIDA = [
  { key: 'vencido',            label: 'Baja por vencido' },
  { key: 'danado',             label: 'Baja por dañado' },
  { key: 'robo',               label: 'Baja por robo/hurto' },
  { key: 'autoconsumo',        label: 'Autoconsumo' },
  { key: 'regalo_cliente',     label: 'Regalo a cliente' },
  { key: 'traslado_salida',    label: 'Traslado entre bodegas (salida)' },
  { key: 'correccion',         label: 'Corrección de inventario' },
  { key: 'otro',               label: 'Otro' },
];

interface Mov {
  id_mov: number;
  numero_mov: string;
  tipo: 'entrada' | 'salida';
  motivo: string;
  fecha: string;
  Items: number;
  Cantidad: number;
  Costo_Unitario: number;
  Costo_Total: number;
  Concepto: string | null;
  Estado: string;
  articulo_codigo: string | null;
  articulo_nombre: string | null;
  existencia_actual: number;
  usuario_nombre: string | null;
}

export function MovsDirectos() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'entrada' | 'salida'>('entrada');
  const [movs, setMovs] = useState<Mov[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [showNuevo, setShowNuevo] = useState(false);
  const [modalAnular, setModalAnular] = useState<Mov | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const gridRef = useRef<any>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const p = new URLSearchParams({ tipo: tab });
      if (fechaDesde) p.set('fecha_desde', fechaDesde);
      if (fechaHasta) p.set('fecha_hasta', fechaHasta);
      const r = await fetch(`${API}/listar.php?${p}`);
      const d = await r.json();
      if (d.success) { setMovs(d.movimientos); setResumen(d.resumen); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setCargando(false);
  }, [tab, fechaDesde, fechaHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const colDefs: any[] = [
    { field: 'numero_mov', headerName: 'N° Mov', width: 105, cellStyle: { fontWeight: 600, color: '#7c3aed' } },
    { field: 'fecha', headerName: 'Fecha', width: 100,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '' },
    { field: 'motivo', headerName: 'Motivo', width: 190,
      valueFormatter: (p: any) => (tab === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA).find(m => m.key === p.value)?.label || p.value },
    { field: 'articulo_codigo', headerName: 'Código', width: 85 },
    { field: 'articulo_nombre', headerName: 'Artículo', flex: 1, minWidth: 220 },
    { field: 'Cantidad', headerName: 'Cant.', width: 80, cellStyle: { textAlign: 'right', fontWeight: 600 } },
    { field: 'Costo_Unitario', headerName: 'Costo Unit.', width: 105, cellStyle: { textAlign: 'right' },
      valueFormatter: (p: any) => fmtMon(p.value || 0) },
    { field: 'Costo_Total', headerName: 'Costo Total', width: 115, cellStyle: { textAlign: 'right', fontWeight: 700 },
      valueFormatter: (p: any) => fmtMon(p.value || 0) },
    { field: 'Concepto', headerName: 'Concepto', flex: 1, minWidth: 180,
      cellStyle: { fontSize: 11, color: '#6b7280' } },
    { field: 'usuario_nombre', headerName: 'Usuario', width: 110 },
    { field: 'Estado', headerName: 'Estado', width: 90,
      cellRenderer: (p: any) => {
        const bg = p.value === 'Anulada' ? '#f3f4f6' : (tab === 'entrada' ? '#dcfce7' : '#fee2e2');
        const color = p.value === 'Anulada' ? '#6b7280' : (tab === 'entrada' ? '#16a34a' : '#dc2626');
        return <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: bg, color }}>{p.value}</span>;
      }
    },
    {
      headerName: '', width: 60, sortable: false, filter: false,
      cellRenderer: (p: any) => {
        if (p.data.Estado === 'Anulada') return null;
        return (
          <button onClick={() => setModalAnular(p.data)} title="Anular movimiento"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
            <XCircle size={15} />
          </button>
        );
      }
    }
  ];

  const inp: React.CSSProperties = { height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none' };
  const chipEntrada = tab === 'entrada';
  const totalTab = movs.reduce((s, m) => s + Number(m.Costo_Total), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Entradas y Salidas Directas</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Ajustes de inventario sin pasar por Compras/Ventas — regalos, mermas, traslados, correcciones</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: chipEntrada ? '#dcfce7' : '#fee2e2', padding: '6px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{chipEntrada ? 'Entradas' : 'Salidas'} en periodo: </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: chipEntrada ? '#16a34a' : '#dc2626' }}>{fmtMon(totalTab)}</span>
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>({movs.length})</span>
          </div>
          <button onClick={() => setShowNuevo(true)}
            style={{ height: 30, padding: '0 14px', background: chipEntrada ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <Plus size={14} /> Nuevo {chipEntrada ? 'ingreso' : 'egreso'}
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 10 }}>
        <button onClick={() => setTab('entrada')}
          style={{
            padding: '8px 18px', background: tab === 'entrada' ? '#16a34a' : '#fff',
            color: tab === 'entrada' ? '#fff' : '#374151',
            border: '1px solid ' + (tab === 'entrada' ? '#16a34a' : '#e5e7eb'),
            borderBottom: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <ArrowDownToLine size={14} /> Entradas
        </button>
        <button onClick={() => setTab('salida')}
          style={{
            padding: '8px 18px', background: tab === 'salida' ? '#dc2626' : '#fff',
            color: tab === 'salida' ? '#fff' : '#374151',
            border: '1px solid ' + (tab === 'salida' ? '#dc2626' : '#e5e7eb'),
            borderBottom: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <ArrowUpFromLine size={14} /> Salidas
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, background: '#fff', padding: '8px 12px', borderRadius: 10, alignItems: 'flex-end', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ ...inp, width: 130 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ ...inp, width: 130 }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={cargar} disabled={cargando}
          style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} className={cargando ? 'animate-spin' : ''} /> Refrescar
        </button>
      </div>

      {/* Grid */}
      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 340px)', width: '100%', fontSize: 12, ['--ag-font-size' as any]: '12px' }}>
        <AgGridReact ref={gridRef} rowData={movs} columnDefs={colDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          animateRows rowHeight={34} headerHeight={30}
          getRowId={(p: any) => String(p.data.id_mov)}
          overlayNoRowsTemplate={`<span style='font-size:13px;color:#6b7280'>Sin ${tab}s en el periodo</span>`}
        />
      </div>

      {showNuevo && (
        <ModalNuevo tipo={tab} idUsuario={(user as any)?.id}
          onClose={() => setShowNuevo(false)}
          onSuccess={() => { setShowNuevo(false); cargar(); }} />
      )}
      {modalAnular && (
        <ModalAnular mov={modalAnular}
          onClose={() => setModalAnular(null)}
          onSuccess={() => { setModalAnular(null); cargar(); }} />
      )}
    </div>
  );
}

// ================= Modal Nuevo =================
function ModalNuevo({ tipo, idUsuario, onClose, onSuccess }: {
  tipo: 'entrada' | 'salida'; idUsuario?: number; onClose: () => void; onSuccess: () => void;
}) {
  const motivos = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA;
  const [motivo, setMotivo] = useState(motivos[0].key);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [busqueda, setBusqueda] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [producto, setProducto] = useState<any>(null);
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [concepto, setConcepto] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Modo empaque: si el producto tiene FactorConversion>1 y es Farmacia,
  // el cajero puede ingresar cantidad/costo por CAJA en vez de por unidad.
  // Al guardar se multiplica cantidad por factor y se divide el costo.
  const [modoEmpaque, setModoEmpaque] = useState(false);
  // Precios de venta opcionales (solo entrada). Vacío = no toca los del producto.
  // Cuando el cajero encuentra sobrante o carga producto nuevo, puede aprovechar
  // para ajustar los precios sin salir del modal.
  const [precioVentaUnd, setPrecioVentaUnd] = useState('');
  const [precioVentaEmp, setPrecioVentaEmp] = useState('');
  const searchTimer = useRef<any>(null);

  const buscar = (q: string) => {
    setBusqueda(q);
    if (q.length < 1) { setProdResults([]); setShowDrop(false); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`${API_BUSCAR}?buscar=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.success) { setProdResults(d.articulos); setShowDrop(true); }
    }, 200);
  };

  const seleccionar = (a: any) => {
    setProducto(a);
    setBusqueda(`${a.Codigo} — ${a.Nombres_Articulo}`);
    setShowDrop(false);
    // Arrancar en modo empaque si el producto lo tiene marcado por defecto
    // para compras (regla de Farmacia). Usuario puede cambiar con el toggle.
    const factorA = Math.max(1, Number(a.factor_conversion || a.FactorConversion) || 1);
    const empDefault = factorA > 1 && esFarmacia() && (
      tipo === 'entrada'
        ? !!Number(a.comprar_como_empaque || a.ComprarComoEmpaque)
        : !!Number(a.vender_como_empaque || a.VenderComoEmpaque)
    );
    setModoEmpaque(empDefault);
    if (tipo === 'entrada' && !costoUnitario && a.Precio_Costo) {
      // Si arranca en modo caja, sugerir costo × factor (costo por caja).
      const costoUnit = Math.round(a.Precio_Costo);
      setCostoUnitario(String(empDefault ? costoUnit * factorA : costoUnit));
    }
    // Precios de venta como referencia (vacío si no vienen — no obliga)
    setPrecioVentaUnd('');
    setPrecioVentaEmp('');
  };

  const guardar = async () => {
    if (!producto) { toast.error('Seleccione un producto'); return; }
    const cant = Number(cantidad);
    if (!cant || cant <= 0) { toast.error('Cantidad debe ser mayor a 0'); return; }
    // Convertir a unidad base si el usuario ingresó por empaque
    const factor = Math.max(1, Number(producto.factor_conversion || producto.FactorConversion) || 1);
    const cantBase = modoEmpaque && factor > 1 ? cant * factor : cant;
    const costoIngresado = Number(costoUnitario) || 0;
    const costoBase = modoEmpaque && factor > 1 && costoIngresado > 0
      ? Math.round((costoIngresado / factor) * 10000) / 10000
      : costoIngresado;
    if (tipo === 'salida' && cantBase > (producto.Existencia || 0)) {
      toast.error(`Existencia actual (${producto.Existencia}) menor que la cantidad (${cantBase} en unidades)`); return;
    }
    setEnviando(true);
    try {
      const r = await fetch(`${API}/crear.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, motivo, fecha, Items: producto.Items,
          Cantidad: cantBase,
          Costo_Unitario: costoBase,
          Concepto: concepto, Id_Usuario: idUsuario,
          // Precios de venta opcionales (solo se aplican en tipo='entrada').
          // Vacío o 0 = no toca los precios actuales del producto.
          Precio_Venta: tipo === 'entrada' && precioVentaUnd ? Number(precioVentaUnd) : null,
          Precio_Venta_Empaque: tipo === 'entrada' && precioVentaEmp ? Number(precioVentaEmp) : null,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success(`${d.numero_mov} · Nueva existencia: ${d.nueva_existencia}`);
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    setEnviando(false);
  };

  const color = tipo === 'entrada' ? '#16a34a' : '#dc2626';
  const bg = tipo === 'entrada' ? '#dcfce7' : '#fee2e2';
  const inp: React.CSSProperties = { width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3, fontWeight: 500 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}>
        <div style={{ padding: '12px 18px', background: bg, borderBottom: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tipo === 'entrada' ? <ArrowDownToLine size={18} color={color} /> : <ArrowUpFromLine size={18} color={color} />}
            <span style={{ fontSize: 15, fontWeight: 700, color }}>Nueva {tipo === 'entrada' ? 'entrada' : 'salida'} directa</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 10 }}>
            <div>
              <label style={lbl}>Motivo *</label>
              <select value={motivo} onChange={e => setMotivo(e.target.value)} style={inp}>
                {motivos.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={lbl}>Producto *</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: '#9ca3af' }} />
              <input value={busqueda} onChange={e => buscar(e.target.value)}
                placeholder="Código o nombre del producto..."
                style={{ ...inp, paddingLeft: 30 }} />
            </div>
            {showDrop && prodResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
                border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 220, overflowY: 'auto',
                zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: 4,
              }}>
                {prodResults.map((a: any) => (
                  <div key={a.Items} onClick={() => seleccionar(a)}
                    style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span><strong style={{ color: '#7c3aed' }}>{a.Codigo}</strong> — {a.Nombres_Articulo}</span>
                    <span style={{ color: '#6b7280' }}>Ex: {a.Existencia}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {producto && (() => {
            const factorP = Math.max(1, Number(producto.factor_conversion || producto.FactorConversion) || 1);
            const nombreEmp = (producto.nombre_empaque || producto.NombreEmpaque || 'Caja');
            const puedeEmpaque = factorP > 1 && esFarmacia();
            const cantNum = Number(cantidad) || 0;
            const totalUndBase = modoEmpaque && factorP > 1 ? cantNum * factorP : cantNum;
            return (
              <>
                <div style={{ background: '#f9fafb', padding: 8, borderRadius: 6, fontSize: 11, color: '#374151' }}>
                  <b>{producto.Nombres_Articulo}</b> · Stock: <b>{producto.Existencia}</b> · Costo actual: {fmtMon(producto.Precio_Costo || 0)}
                  {puedeEmpaque && <> · 1 {nombreEmp} = <b>{factorP}</b> unidades</>}
                </div>

                {puedeEmpaque && (
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <button type="button"
                      onClick={() => setModoEmpaque(false)}
                      style={{
                        flex: 1, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: !modoEmpaque ? '#7c3aed' : '#f3e8ff', color: !modoEmpaque ? '#fff' : '#7c3aed',
                        border: '1px solid #c4b5fd', borderRadius: 6,
                      }}>
                      🔹 Por Unidad
                    </button>
                    <button type="button"
                      onClick={() => setModoEmpaque(true)}
                      style={{
                        flex: 1, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: modoEmpaque ? '#7c3aed' : '#f3e8ff', color: modoEmpaque ? '#fff' : '#7c3aed',
                        border: '1px solid #c4b5fd', borderRadius: 6,
                      }}>
                      📦 Por {nombreEmp} (×{factorP})
                    </button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Cantidad ({modoEmpaque ? nombreEmp + 's' : 'unidades'}) *</label>
                    <input type="text" inputMode="decimal" value={cantidad}
                      onChange={e => setCantidad(e.target.value.replace(/[^\d.]/g, ''))}
                      style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
                    {modoEmpaque && cantNum > 0 && (
                      <div style={{ fontSize: 10, color: '#7c3aed', marginTop: 2, textAlign: 'right' }}>
                        = <b>{totalUndBase}</b> unidades
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={lbl}>Costo unitario ({modoEmpaque ? 'por ' + nombreEmp : 'por unidad'})</label>
                    <input type="text" inputMode="decimal"
                      key={`costo-${producto.Items}-${costoUnitario}`}
                      defaultValue={costoUnitario ? fmtMon(Number(costoUnitario)) : ''}
                      onFocus={e => { e.target.value = costoUnitario; e.target.select(); }}
                      onBlur={e => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        setCostoUnitario(v);
                        e.target.value = v ? fmtMon(Number(v)) : '';
                      }}
                      placeholder="0 = hereda costo actual"
                      style={{ ...inp, textAlign: 'right' }} />
                  </div>
                </div>

                {/* Precios de venta OPCIONALES — solo en tipo entrada. Vacío
                    = no toca los del producto. Sirve para actualizar precios
                    al mismo tiempo que se registra sobrante / producto nuevo. */}
                {tipo === 'entrada' && (
                  <div style={{ display: 'grid', gridTemplateColumns: puedeEmpaque ? '1fr 1fr' : '1fr', gap: 10 }}>
                    <div>
                      <label style={lbl}>Precio venta unidad <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                      <input type="text" inputMode="decimal"
                        key={`pvu-${producto.Items}`}
                        defaultValue={precioVentaUnd ? fmtMon(Number(precioVentaUnd)) : ''}
                        onFocus={e => { e.target.value = precioVentaUnd; e.target.select(); }}
                        onBlur={e => {
                          const v = e.target.value.replace(/[^\d.]/g, '');
                          setPrecioVentaUnd(v);
                          e.target.value = v ? fmtMon(Number(v)) : '';
                        }}
                        placeholder="Vacío = no cambia el actual"
                        title="Si lo llenas, actualiza el precio de venta unitario del producto."
                        style={{ ...inp, textAlign: 'right' }} />
                    </div>
                    {puedeEmpaque && (
                      <div>
                        <label style={lbl}>Precio venta {nombreEmp} <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                        <input type="text" inputMode="decimal"
                          key={`pve-${producto.Items}`}
                          defaultValue={precioVentaEmp ? fmtMon(Number(precioVentaEmp)) : ''}
                          onFocus={e => { e.target.value = precioVentaEmp; e.target.select(); }}
                          onBlur={e => {
                            const v = e.target.value.replace(/[^\d.]/g, '');
                            setPrecioVentaEmp(v);
                            e.target.value = v ? fmtMon(Number(v)) : '';
                          }}
                          placeholder="Vacío = no cambia el actual"
                          title={`Si lo llenas, actualiza el precio de venta por ${nombreEmp.toLowerCase()} del producto (independiente del cálculo P.unidad × ${factorP}).`}
                          style={{ ...inp, textAlign: 'right', color: '#7c3aed', fontWeight: 600, background: '#faf5ff', borderColor: '#c4b5fd' }} />
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {!producto && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Cantidad *</label>
                <input type="text" inputMode="decimal" value={cantidad}
                  onChange={e => setCantidad(e.target.value.replace(/[^\d.]/g, ''))}
                  style={{ ...inp, textAlign: 'right' }} disabled />
              </div>
              <div>
                <label style={lbl}>Costo unitario (con IVA)</label>
                <input type="text" inputMode="decimal" value={costoUnitario}
                  onChange={e => setCostoUnitario(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="Seleccione un producto primero"
                  style={{ ...inp, textAlign: 'right' }} disabled />
              </div>
            </div>
          )}

          <div>
            <label style={lbl}>Concepto / Observaciones</label>
            <textarea value={concepto} onChange={e => setConcepto(e.target.value)} rows={2}
              placeholder="Ej: Sobrante encontrado tras conteo bodega 2, remito 4523"
              style={{ ...inp, height: 'auto', padding: 8, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
          <button onClick={guardar} disabled={enviando}
            style={{ padding: '7px 14px', background: color, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: enviando ? 0.6 : 1 }}>
            Guardar {tipo === 'entrada' ? 'entrada' : 'salida'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= Modal Anular =================
function ModalAnular({ mov, onClose, onSuccess }: { mov: Mov; onClose: () => void; onSuccess: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    try {
      const r = await fetch(`${API}/anular.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_mov: mov.id_mov, motivo }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success('Movimiento anulado · Existencia restaurada');
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    setEnviando(false);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 18, width: 420 }}>
        <h3 style={{ margin: 0, marginBottom: 8, fontSize: 15, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
          <XCircle size={17} /> Anular {mov.numero_mov}
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>
          El movimiento se marca como Anulado y se registra un asiento opuesto en kardex.
          La existencia del artículo se restaura al valor previo.
        </p>
        <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 }}>Motivo de la anulación (opcional)</label>
        <input autoFocus value={motivo} onChange={e => setMotivo(e.target.value)}
          style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, outline: 'none' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
          <button onClick={confirmar} disabled={enviando}
            style={{ padding: '7px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: enviando ? 0.6 : 1 }}>
            Anular
          </button>
        </div>
      </div>
    </div>
  );
}
