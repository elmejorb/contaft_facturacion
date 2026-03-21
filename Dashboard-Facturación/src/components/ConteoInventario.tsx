import { useState, useEffect, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, Plus, ClipboardCheck, X, ArrowLeft,
  CheckCircle, XCircle, AlertTriangle, Clock, Lock, Save,
  HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/inventario/conteo.php';
const API_OPC = 'http://localhost:80/conta-app-backend/api/inventario/opciones.php';

interface Conteo {
  Id_Conteo: number;
  Fecha: string;
  Usuario: string;
  Observacion: string;
  Tipo: string;
  Total_Items: number;
  Items_Contados: number;
  Items_Con_Diferencia: number;
  Estado: 'Abierto' | 'Cerrado' | 'Cancelado';
  Fecha_Cierre: string | null;
}

interface DetalleItem {
  Id_Detalle: number;
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Categoria: string;
  Precio_Costo: number;
  Existencia_Sistema: number;
  Existencia_Actual: number;
  Existencia_Contada: number | null;
  Vendido_Durante: number;
  Existencia_Esperada: number | null;
  Diferencia: number | null;
  Diferencia_Real: number | null;
  Observacion: string;
}

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function ConteoInventario() {
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [detalle, setDetalle] = useState<DetalleItem[]>([]);
  const [conteoActual, setConteoActual] = useState<Conteo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos, pendientes, contados, diferencias
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creando, setCreando] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroProv, setFiltroProv] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cambios, setCambios] = useState<Map<number, { contada: number | null; obs: string }>>(new Map());
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const gridRef = useRef<AgGridReact>(null);

  const cargarConteos = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setConteos(d.conteos);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarDetalle = async (id: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?id=${id}`);
      const d = await r.json();
      if (d.success) {
        setConteoActual(d.conteo);
        setDetalle(d.detalle);
        setCambios(new Map());
        setVista('detalle');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarOpciones = async () => {
    try {
      const r = await fetch(API_OPC);
      const d = await r.json();
      if (d.success) {
        setCategorias(d.categorias);
        setProveedores(d.proveedores);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarConteos(); cargarOpciones(); }, []);

  const crearConteo = async () => {
    setError('');
    try {
      const body: any = { action: 'crear', usuario: 'admin', observacion };
      if (filtroCat) body.filtro_categoria = parseInt(filtroCat);
      if (filtroProv) body.filtro_proveedor = parseInt(filtroProv);
      body.tipo = (!filtroCat && !filtroProv) ? 'Total' : 'Parcial';

      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        setCreando(false);
        setObservacion('');
        setFiltroCat('');
        setFiltroProv('');
        setSuccess(d.message);
        setTimeout(() => setSuccess(''), 3000);
        cargarConteos();
        cargarDetalle(d.Id_Conteo);
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al crear conteo');
    }
  };

  const guardarCambios = async () => {
    if (cambios.size === 0 || !conteoActual) return;
    setGuardando(true);
    setError('');
    try {
      const items = Array.from(cambios.entries()).map(([itemId, val]) => ({
        items: itemId,
        contada: val.contada,
        observacion: val.obs
      }));

      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', id_conteo: conteoActual.Id_Conteo, items })
      });
      const d = await r.json();
      if (d.success) {
        setSuccess('Guardado correctamente');
        setTimeout(() => setSuccess(''), 3000);
        setCambios(new Map());
        cargarDetalle(conteoActual.Id_Conteo);
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al guardar');
    }
    setGuardando(false);
  };

  const cerrarConteo = async () => {
    if (!conteoActual) return;
    // Save pending changes first
    if (cambios.size > 0) await guardarCambios();

    const sinContar = detalle.filter(d => d.Existencia_Contada === null).length;
    const msg = sinContar > 0
      ? `Hay ${sinContar} artículos sin contar. ¿Cerrar conteo de todas formas? Esto ajustará el inventario.`
      : '¿Cerrar conteo y ajustar inventario? Esta acción no se puede deshacer.';

    if (!confirm(msg)) return;
    setError('');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cerrar', id_conteo: conteoActual.Id_Conteo })
      });
      const d = await r.json();
      if (d.success) {
        setSuccess(d.message);
        setTimeout(() => setSuccess(''), 5000);
        cargarDetalle(conteoActual.Id_Conteo);
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al cerrar');
    }
  };

  const cancelarConteo = async () => {
    if (!conteoActual) return;
    if (!confirm('¿Cancelar este conteo? No se realizarán ajustes al inventario.')) return;
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelar', id_conteo: conteoActual.Id_Conteo })
      });
      const d = await r.json();
      if (d.success) {
        setSuccess(d.message);
        setTimeout(() => setSuccess(''), 3000);
        setVista('lista');
        cargarConteos();
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al cancelar');
    }
  };

  // Filter detalle
  const detalleFiltrado = detalle.filter(d => {
    const matchBusqueda = !busqueda ||
      d.Nombres_Articulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.Codigo.toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    const cambio = cambios.get(d.Items);
    const contada = cambio ? cambio.contada : d.Existencia_Contada;

    switch (filtro) {
      case 'pendientes': return contada === null;
      case 'contados': return contada !== null;
      case 'diferencias': {
        const diff = getDiffReal(d);
        return diff !== null && diff !== 0;
      }
      default: return true;
    }
  });

  const esAbierto = conteoActual?.Estado === 'Abierto';

  // Stats del detalle
  const totalItems = detalle.length;
  const contados = detalle.filter(d => d.Existencia_Contada !== null || cambios.has(d.Items)).length;
  const getDiffReal = (d: DetalleItem) => {
    const c = cambios.get(d.Items);
    const contada = c ? c.contada : d.Existencia_Contada;
    if (contada === null || contada === undefined) return null;
    const vendido = d.Vendido_Durante || 0;
    const esperado = d.Existencia_Sistema - vendido;
    return contada - esperado;
  };
  const conDiff = detalle.filter(d => {
    const diff = getDiffReal(d);
    return diff !== null && diff !== 0;
  }).length;
  const valorDiff = detalle.reduce((s, d) => {
    const diff = getDiffReal(d);
    if (diff === null) return s;
    return s + (diff * d.Precio_Costo);
  }, 0);

  // --- VISTA LISTA ---
  if (vista === 'lista') {
    const colsConteos: ColDef[] = [
      { headerName: 'ID', field: 'Id_Conteo', width: 70, sortable: true },
      {
        headerName: 'Fecha',
        field: 'Fecha',
        width: 150,
        sortable: true,
        cellRenderer: (p: any) => {
          if (!p.value) return '';
          const d = new Date(p.value);
          return d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        }
      },
      { headerName: 'Usuario', field: 'Usuario', width: 100 },
      { headerName: 'Tipo', field: 'Tipo', width: 80 },
      { headerName: 'Observación', field: 'Observacion', flex: 1, minWidth: 150 },
      {
        headerName: 'Artículos',
        field: 'Total_Items',
        width: 100,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{(p.value || 0).toLocaleString()}</span>
      },
      {
        headerName: 'Contados',
        field: 'Items_Contados',
        width: 100,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: any) => {
          const total = p.data.Total_Items || 1;
          const contados = p.value || 0;
          const pct = Math.round((contados / total) * 100);
          return <span style={{ color: pct === 100 ? '#16a34a' : '#d97706', fontWeight: 600 }}>{contados} ({pct}%)</span>;
        }
      },
      {
        headerName: 'Diferencias',
        field: 'Items_Con_Diferencia',
        width: 100,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: any) => {
          const v = p.value || 0;
          return <span style={{ color: v > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{v}</span>;
        }
      },
      {
        headerName: 'Estado',
        field: 'Estado',
        width: 110,
        cellRenderer: (p: any) => {
          const colors: Record<string, { bg: string; fg: string; icon: any }> = {
            'Abierto': { bg: '#dbeafe', fg: '#2563eb', icon: Clock },
            'Cerrado': { bg: '#dcfce7', fg: '#16a34a', icon: CheckCircle },
            'Cancelado': { bg: '#fee2e2', fg: '#dc2626', icon: XCircle }
          };
          const c = colors[p.value] || colors['Abierto'];
          const Icon = c.icon;
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: c.bg, color: c.fg
            }}>
              <Icon size={13} /> {p.value}
            </span>
          );
        }
      },
      {
        headerName: '',
        width: 80,
        sortable: false,
        cellRenderer: (p: any) => (
          <button
            onClick={() => cargarDetalle(p.data.Id_Conteo)}
            style={{
              height: 26, padding: '0 10px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer'
            }}
          >
            Ver
          </button>
        )
      }
    ];

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Conteo de Inventario</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Control de inventario físico por períodos</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#16a34a', fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Total Conteos', value: conteos.length, icon: ClipboardCheck, bg: '#f3e8ff', color: '#7c3aed' },
            { label: 'Abiertos', value: conteos.filter(c => c.Estado === 'Abierto').length, icon: Clock, bg: '#dbeafe', color: '#2563eb' },
            { label: 'Cerrados', value: conteos.filter(c => c.Estado === 'Cerrado').length, icon: CheckCircle, bg: '#dcfce7', color: '#16a34a' },
            { label: 'Cancelados', value: conteos.filter(c => c.Estado === 'Cancelado').length, icon: XCircle, bg: '#fee2e2', color: '#dc2626' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ flex: 1 }} />
          {!creando ? (
            <button
              onClick={() => setCreando(true)}
              style={{
                height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Plus size={14} /> Nuevo Conteo
            </button>
          ) : null}
          <button
            onClick={cargarConteos}
            style={{
              height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>

        {/* Form crear conteo */}
        {creando && (
          <div style={{
            background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: 16,
            marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#5b21b6' }}>Nuevo Conteo de Inventario</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>OBSERVACIÓN</label>
                <input
                  type="text" placeholder="Ej: Conteo mensual marzo"
                  value={observacion} onChange={e => setObservacion(e.target.value)}
                  style={{ width: '100%', height: 30, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>FILTRO CATEGORÍA (opcional)</label>
                <select
                  value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                  style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">-- Todas --</option>
                  {categorias.map(c => <option key={c.Id_Categoria} value={c.Id_Categoria}>{c.Categoria}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>FILTRO PROVEEDOR (opcional)</label>
                <select
                  value={filtroProv} onChange={e => setFiltroProv(e.target.value)}
                  style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">-- Todos --</option>
                  {proveedores.map(p => <option key={p.CodigoPro} value={p.CodigoPro}>{p.RazonSocial}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setCreando(false); setObservacion(''); setFiltroCat(''); setFiltroProv(''); }}
                style={{ height: 30, padding: '0 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={crearConteo}
                style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Crear Conteo
              </button>
            </div>
          </div>
        )}

        {/* Grid de conteos */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ height: 'calc(100vh - 480px)', width: '100%' }}>
            <AgGridReact
              rowData={conteos}
              columnDefs={colsConteos}
              loading={loading}
              animateRows
              getRowId={p => String(p.data.Id_Conteo)}
              rowHeight={38}
              headerHeight={38}
              defaultColDef={{ resizable: true }}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA DETALLE ---
  const colsDetalle: ColDef[] = [
    { headerName: 'Código', field: 'Codigo', width: 100, sortable: true, filter: true },
    { headerName: 'Artículo', field: 'Nombres_Articulo', flex: 1, minWidth: 160, sortable: true, filter: true },
    { headerName: 'Categoría', field: 'Categoria', width: 90, sortable: true, filter: true },
    {
      headerName: 'Snapshot',
      field: 'Existencia_Sistema',
      width: 85,
      sortable: true,
      headerTooltip: 'Existencia al momento de crear el conteo',
      cellStyle: { textAlign: 'right', fontWeight: 600 },
      cellRenderer: (p: any) => <span>{(p.value || 0).toLocaleString('es-CO')}</span>
    },
    {
      headerName: 'Vendido',
      field: 'Vendido_Durante',
      width: 80,
      sortable: true,
      headerTooltip: 'Unidades vendidas durante el conteo',
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        if (v === 0) return <span style={{ color: '#9ca3af' }}>-</span>;
        return <span style={{ color: '#d97706', fontWeight: 600 }}>-{v}</span>;
      }
    },
    {
      headerName: 'Esperado',
      width: 80,
      sortable: true,
      headerTooltip: 'Snapshot - Vendido = lo que debería haber',
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const vendido = p.data.Vendido_Durante || 0;
        if (vendido === 0) return <span style={{ color: '#9ca3af' }}>-</span>;
        const esperado = (p.data.Existencia_Sistema || 0) - vendido;
        return <span style={{ fontWeight: 600, color: '#6366f1' }}>{esperado.toLocaleString('es-CO')}</span>;
      }
    },
    {
      headerName: 'Exist. Contada',
      width: 115,
      sortable: false,
      cellRenderer: (p: any) => {
        const cambio = cambios.get(p.data.Items);
        const val = cambio ? cambio.contada : p.data.Existencia_Contada;

        if (!esAbierto) {
          return <span style={{ fontWeight: 600, textAlign: 'right', display: 'block' }}>
            {val !== null ? val!.toLocaleString('es-CO') : '-'}
          </span>;
        }

        return (
          <input
            type="text"
            defaultValue={val !== null && val !== undefined ? String(val) : ''}
            onFocus={e => e.target.select()}
            onBlur={e => {
              const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
              const num = raw === '' ? null : parseFloat(raw);
              const newCambios = new Map(cambios);
              const existing = newCambios.get(p.data.Items);
              newCambios.set(p.data.Items, { contada: num, obs: existing?.obs || p.data.Observacion || '' });
              setCambios(newCambios);
              if (num !== null) {
                e.target.value = num.toLocaleString('es-CO');
              }
            }}
            data-conteo-input="true"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const current = e.target as HTMLInputElement;

                // Find all inputs BEFORE blur (blur may cause re-render)
                const allInputs = Array.from(document.querySelectorAll('input[data-conteo-input]')) as HTMLInputElement[];
                const myPos = allInputs.indexOf(current);

                // Save value via blur
                current.blur();

                if (myPos >= 0 && myPos < allInputs.length - 1) {
                  // Next input exists in DOM, focus it after React settles
                  const nextTarget = allInputs[myPos + 1];
                  requestAnimationFrame(() => {
                    // Re-query in case DOM changed after blur
                    const freshInputs = Array.from(document.querySelectorAll('input[data-conteo-input]')) as HTMLInputElement[];
                    const target = freshInputs[myPos + 1] || freshInputs[myPos];
                    if (target && target !== current) {
                      target.focus();
                      target.select();
                    }
                  });
                }
                return;
              }
              const allowed = ['0','1','2','3','4','5','6','7','8','9','.',',','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
              if (!allowed.includes(e.key) && !e.ctrlKey) e.preventDefault();
            }}
            style={{
              width: '100%', height: 26, textAlign: 'center', fontWeight: 600,
              border: '1px solid #d1d5db', borderRadius: 4, padding: '0 6px',
              fontSize: 13, outline: 'none', background: '#fffbeb'
            }}
          />
        );
      }
    },
    {
      headerName: 'Dif. Real',
      width: 80,
      sortable: true,
      headerTooltip: 'Diferencia compensada: Contada - Esperado',
      cellRenderer: (p: any) => {
        const cambio = cambios.get(p.data.Items);
        const contada = cambio ? cambio.contada : p.data.Existencia_Contada;
        if (contada === null || contada === undefined) return <span style={{ color: '#9ca3af' }}>-</span>;
        const vendido = p.data.Vendido_Durante || 0;
        const esperado = p.data.Existencia_Sistema - vendido;
        const diff = contada - esperado;
        const color = diff === 0 ? '#16a34a' : diff > 0 ? '#2563eb' : '#dc2626';
        const prefix = diff > 0 ? '+' : '';
        return <span style={{ color, fontWeight: 700, textAlign: 'right', display: 'block' }}>{prefix}{diff.toLocaleString('es-CO')}</span>;
      }
    },
    {
      headerName: 'Valor Dif.',
      width: 95,
      sortable: true,
      cellRenderer: (p: any) => {
        const cambio = cambios.get(p.data.Items);
        const contada = cambio ? cambio.contada : p.data.Existencia_Contada;
        if (contada === null || contada === undefined) return <span style={{ color: '#9ca3af' }}>-</span>;
        const vendido = p.data.Vendido_Durante || 0;
        const esperado = p.data.Existencia_Sistema - vendido;
        const diff = contada - esperado;
        const valor = diff * p.data.Precio_Costo;
        const color = valor === 0 ? '#16a34a' : valor > 0 ? '#2563eb' : '#dc2626';
        return <span style={{ color, fontWeight: 600, textAlign: 'right', display: 'block' }}>{fmtMon(valor)}</span>;
      }
    },
  ];

  return (
    <div>
      {/* Header + Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => { setVista('lista'); cargarConteos(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 13, flexShrink: 0 }}
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>
            Conteo #{conteoActual?.Id_Conteo}
            <span style={{
              marginLeft: 10, fontSize: 12, padding: '2px 10px', borderRadius: 6, fontWeight: 600,
              background: conteoActual?.Estado === 'Abierto' ? '#dbeafe' : conteoActual?.Estado === 'Cerrado' ? '#dcfce7' : '#fee2e2',
              color: conteoActual?.Estado === 'Abierto' ? '#2563eb' : conteoActual?.Estado === 'Cerrado' ? '#16a34a' : '#dc2626',
            }}>
              {conteoActual?.Estado}
            </span>
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            {conteoActual?.Fecha && new Date(conteoActual.Fecha).toLocaleDateString('es-CO')} — {conteoActual?.Usuario}
            {conteoActual?.Observacion && ` — ${conteoActual.Observacion}`}
          </p>
        </div>
        {esAbierto && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {cambios.size > 0 && (
              <button
                onClick={guardarCambios}
                disabled={guardando}
                style={{
                  height: 32, padding: '0 14px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.6 : 1
                }}
              >
                <Save size={14} /> Guardar ({cambios.size})
              </button>
            )}
            <button
              onClick={cerrarConteo}
              style={{
                height: 32, padding: '0 14px', background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Lock size={14} /> Cerrar Conteo
            </button>
            <button
              onClick={cancelarConteo}
              style={{
                height: 32, padding: '0 14px', background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <XCircle size={14} /> Cancelar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#16a34a', fontSize: 13 }}>{success}</div>
      )}

      {/* Panel de ayuda */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        marginBottom: 12, overflow: 'hidden'
      }}>
        <button
          onClick={() => setMostrarAyuda(!mostrarAyuda)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#475569', fontWeight: 600
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HelpCircle size={15} color="#7c3aed" /> ¿Cómo funciona el conteo con compensación?
          </span>
          {mostrarAyuda ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {mostrarAyuda && (
          <div style={{ padding: '0 14px 14px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Las ventas NO se bloquean</div>
                <p style={{ margin: 0 }}>
                  Mientras el conteo está abierto, el negocio sigue operando normalmente.
                  El sistema registra automáticamente qué se vendió durante el período del conteo.
                </p>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 10, marginBottom: 6 }}>Columnas de la tabla</div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li><b>Snapshot:</b> Existencia al momento de crear el conteo</li>
                  <li><b>Vendido:</b> Unidades vendidas desde que se creó el conteo</li>
                  <li><b>Esperado:</b> Snapshot - Vendido = lo que debería haber en estante</li>
                  <li><b>Contada:</b> Lo que realmente contaste físicamente</li>
                  <li><b>Dif. Real:</b> Contada - Esperado (la diferencia verdadera)</li>
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Ejemplo práctico</div>
                <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #e2e8f0', fontSize: 11 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px' }}>
                    <span style={{ color: '#6b7280' }}>Snapshot:</span> <span><b>30</b> unidades al crear conteo</span>
                    <span style={{ color: '#d97706' }}>Vendido:</span> <span><b>5</b> unidades durante el conteo</span>
                    <span style={{ color: '#6366f1' }}>Esperado:</span> <span><b>25</b> unidades (30 - 5)</span>
                    <span style={{ color: '#1e293b' }}>Contada:</span> <span><b>25</b> unidades (lo que contaste)</span>
                    <span style={{ color: '#16a34a' }}>Dif. Real:</span> <span><b>0</b> — todo cuadra</span>
                  </div>
                  <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                    Si hubieras contado <b>23</b> → Dif. Real = <span style={{ color: '#dc2626' }}>-2</span> (faltan 2 unidades reales)
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 10, marginBottom: 6 }}>Colores de fila</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f0fdf4', border: '1px solid #bbf7d0' }}></span> Cuadra</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#fef2f2', border: '1px solid #fecaca' }}></span> Faltante</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#eff6ff', border: '1px solid #bfdbfe' }}></span> Sobrante</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={18} color="#7c3aed" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Total Artículos</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{totalItems.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Contados</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{contados.toLocaleString()} <span style={{ fontSize: 12, color: '#6b7280' }}>({totalItems > 0 ? Math.round((contados / totalItems) * 100) : 0}%)</span></div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Con Diferencia</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: conDiff > 0 ? '#dc2626' : '#16a34a' }}>{conDiff}</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: valorDiff < 0 ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {valorDiff < 0 ? <AlertTriangle size={18} color="#dc2626" /> : <CheckCircle size={18} color="#16a34a" />}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Valor Diferencia</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: valorDiff < 0 ? '#dc2626' : valorDiff > 0 ? '#2563eb' : '#16a34a' }}>{fmtMon(valorDiff)}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Buscar artículo..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 30, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Filter chips */}
        {[
          { id: 'todos', label: 'Todos', count: totalItems },
          { id: 'pendientes', label: 'Pendientes', count: totalItems - contados },
          { id: 'contados', label: 'Contados', count: contados },
          { id: 'diferencias', label: 'Diferencias', count: conDiff },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
              border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
              background: filtro === f.id ? '#f3e8ff' : '#fff',
              color: filtro === f.id ? '#7c3aed' : '#374151',
              fontWeight: filtro === f.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            {f.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}

      </div>

      {/* Grid detalle */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 430px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={detalleFiltrado}
            columnDefs={colsDetalle}
            loading={loading}
            animateRows
            getRowId={p => String(p.data.Items)}
            rowHeight={36}
            headerHeight={36}
            defaultColDef={{ resizable: true }}
            getRowStyle={(p) => {
              if (!p.data) return undefined;
              const cambio = cambios.get(p.data.Items);
              const contada = cambio ? cambio.contada : p.data.Existencia_Contada;
              if (contada === null || contada === undefined) return undefined;
              const vendido = p.data.Vendido_Durante || 0;
              const esperado = (p.data.Existencia_Sistema || 0) - vendido;
              const diff = contada - esperado;
              if (diff < 0) return { background: '#fef2f2' };
              if (diff > 0) return { background: '#eff6ff' };
              return { background: '#f0fdf4' };
            }}
          />
        </div>
      </div>
    </div>
  );
}
