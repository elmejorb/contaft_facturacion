import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from 'ag-grid-community';
import { Warehouse, Plus, RefreshCw, Edit2, Trash2, Star, ArrowRightLeft, Search, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/bodegas/';

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

interface Bodega {
  Id_Bodega: number;
  Nombre: string;
  Direccion: string | null;
  Telefono: string | null;
  Principal: number;
  Activa: number;
  productos: number;
  FechaMod: string;
}

interface Traslado {
  Id_Traslado: number;
  Fecha: string;
  Id_Bodega_Origen: number;
  Id_Bodega_Destino: number;
  Origen_Nombre: string;
  Destino_Nombre: string;
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Cantidad: number;
  Comentario: string | null;
  NombreUsuario: string | null;
}

export function BodegasManagement() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Bodega | null>(null);
  const [creando, setCreando] = useState(false);
  const [showTrasladar, setShowTrasladar] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [rB, rT] = await Promise.all([
        fetch(API).then(r => r.json()),
        fetch(API + '?traslados=1').then(r => r.json()),
      ]);
      if (rB.success) setBodegas(rB.bodegas);
      if (rT.success) setTraslados(rT.traslados);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);

  const kpis = useMemo(() => ({
    total: bodegas.length,
    activas: bodegas.filter(b => b.Activa).length,
    productos: bodegas.reduce((s, b) => s + Number(b.productos), 0),
  }), [bodegas]);

  const eliminar = async (b: Bodega) => {
    const ok = await confirmar({
      title: 'Eliminar bodega',
      message: `¿Eliminar la bodega "${b.Nombre}"?`,
      type: 'danger',
      confirmText: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id: b.Id_Bodega }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const marcarPrincipal = async (b: Bodega) => {
    if (b.Principal) { toast('Ya es la bodega principal', { icon: 'ℹ️' }); return; }
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'marcar_principal', id: b.Id_Bodega }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const cols: ColDef[] = [
    { headerName: 'ID', field: 'Id_Bodega', width: 60,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Nombre', field: 'Nombre', flex: 1, minWidth: 180,
      cellRenderer: (p: any) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          {p.value}
          {p.data.Principal ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px',
              borderRadius: 10, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700,
            }}>
              <Star size={9} /> PRINCIPAL
            </span>
          ) : null}
        </span>
      ),
    },
    { headerName: 'Dirección', field: 'Direccion', flex: 1, minWidth: 180,
      cellRenderer: (p: any) => p.value || <span style={{ color: '#d1d5db' }}>—</span> },
    { headerName: 'Teléfono', field: 'Telefono', width: 130,
      cellRenderer: (p: any) => p.value || <span style={{ color: '#d1d5db' }}>—</span> },
    { headerName: 'Productos', field: 'productos', width: 100, type: 'numericColumn',
      cellRenderer: (p: any) => (
        <span style={{
          padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: p.value > 0 ? '#dbeafe' : '#f3f4f6',
          color: p.value > 0 ? '#1e40af' : '#6b7280',
        }}>{p.value}</span>
      ),
    },
    { headerName: 'Estado', field: 'Activa', width: 90,
      cellRenderer: (p: any) => (
        <span style={{
          padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
          background: p.value ? '#dcfce7' : '#fee2e2',
          color: p.value ? '#166534' : '#991b1b',
        }}>{p.value ? 'ACTIVA' : 'INACTIVA'}</span>
      ),
    },
    { headerName: 'Acciones', width: 130, pinned: 'right', sortable: false,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: '100%' }}>
          <button title={p.data.Principal ? 'Ya es la principal' : 'Marcar como principal'}
            onClick={() => marcarPrincipal(p.data)}
            disabled={!!p.data.Principal}
            style={{
              width: 26, height: 24, borderRadius: 4, border: '1px solid #fde68a',
              background: p.data.Principal ? '#fef3c7' : '#fffbeb', cursor: p.data.Principal ? 'default' : 'pointer',
              color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: p.data.Principal ? 0.5 : 1,
            }}>
            <Star size={12} />
          </button>
          <button title="Editar" onClick={() => setEditando(p.data)}
            style={{ width: 26, height: 24, borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Edit2 size={12} />
          </button>
          <button title="Eliminar" onClick={() => eliminar(p.data)}
            disabled={!!p.data.Principal || p.data.productos > 0}
            style={{
              width: 26, height: 24, borderRadius: 4,
              border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b',
              cursor: (p.data.Principal || p.data.productos > 0) ? 'not-allowed' : 'pointer',
              opacity: (p.data.Principal || p.data.productos > 0) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Warehouse size={20} color="#7c3aed" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Bodegas</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowTrasladar(true)}
            style={{ height: 28, padding: '0 12px', background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ArrowRightLeft size={14} /> Trasladar Producto
          </button>
          <button onClick={() => setCreando(true)}
            style={{ height: 28, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Nueva Bodega
          </button>
          <button onClick={cargar} disabled={loading}
            style={{ height: 28, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refrescar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total Bodegas', value: String(kpis.total), color: '#7c3aed', bg: '#f3e8ff', Ico: Warehouse },
          { label: 'Activas', value: String(kpis.activas), color: '#166534', bg: '#dcfce7', Ico: Warehouse },
          { label: 'Productos Asignados', value: String(kpis.productos), color: '#1e40af', bg: '#dbeafe', Ico: Warehouse },
        ].map((s, i) => (
          <div key={i} style={{ padding: 8, background: s.bg, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              <s.Ico size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid bodegas */}
      <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Warehouse size={12} /> Bodegas ({bodegas.length})
      </div>
      <div style={{ height: 260, width: '100%', marginBottom: 12 }}>
        <AgGridReact theme={myTheme} rowData={bodegas} columnDefs={cols}
          localeText={AG_GRID_LOCALE_ES} loading={loading} animateRows
          rowHeight={32} headerHeight={32}
          overlayNoRowsTemplate="<span style='padding:20px;color:#6b7280'>Sin bodegas registradas</span>" />
      </div>

      {/* Historial de traslados */}
      <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowRightLeft size={12} /> Historial de Traslados ({traslados.length})
      </div>
      <div style={{ height: 260, width: '100%' }}>
        <AgGridReact
          theme={myTheme}
          rowData={traslados}
          localeText={AG_GRID_LOCALE_ES}
          columnDefs={[
            { headerName: 'Fecha', field: 'Fecha', width: 140,
              cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-' },
            { headerName: 'Código', field: 'Codigo', width: 100 },
            { headerName: 'Producto', field: 'Nombres_Articulo', flex: 1, minWidth: 200 },
            { headerName: 'Origen', field: 'Origen_Nombre', width: 140,
              cellRenderer: (p: any) => <span style={{ color: '#991b1b' }}>{p.value}</span> },
            { headerName: '→', width: 40, valueGetter: () => '→',
              cellStyle: { textAlign: 'center', color: '#6b7280', fontWeight: 700 } },
            { headerName: 'Destino', field: 'Destino_Nombre', width: 140,
              cellRenderer: (p: any) => <span style={{ color: '#166534', fontWeight: 600 }}>{p.value}</span> },
            { headerName: 'Cant.', field: 'Cantidad', width: 80, type: 'numericColumn',
              cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>{Number(p.value).toFixed(2)}</span> },
            { headerName: 'Comentario', field: 'Comentario', flex: 1, minWidth: 150,
              cellRenderer: (p: any) => p.value || <span style={{ color: '#d1d5db' }}>—</span> },
            { headerName: 'Usuario', field: 'NombreUsuario', width: 100,
              cellRenderer: (p: any) => p.value || <span style={{ color: '#d1d5db' }}>—</span> },
          ]}
          rowHeight={32} headerHeight={32}
          overlayNoRowsTemplate="<span style='padding:20px;color:#6b7280'>Sin traslados registrados</span>"
        />
      </div>

      {(creando || editando) && (
        <BodegaModal
          bodega={editando}
          onClose={() => { setCreando(false); setEditando(null); }}
          onGuardado={() => { setCreando(false); setEditando(null); cargar(); }}
        />
      )}

      {showTrasladar && (
        <TrasladarModal
          bodegas={bodegas.filter(b => b.Activa)}
          onClose={() => setShowTrasladar(false)}
          onOk={() => { setShowTrasladar(false); cargar(); }}
        />
      )}
    </div>
  );
}

function BodegaModal({ bodega, onClose, onGuardado }: { bodega: Bodega | null; onClose: () => void; onGuardado: () => void }) {
  const esNueva = !bodega;
  const [nombre, setNombre] = useState(bodega?.Nombre || '');
  const [direccion, setDireccion] = useState(bodega?.Direccion || '');
  const [telefono, setTelefono] = useState(bodega?.Telefono || '');
  const [activa, setActiva] = useState<number>(bodega?.Activa ?? 1);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const body: any = esNueva
        ? { action: 'crear', nombre: nombre.trim(), direccion, telefono, activa }
        : { action: 'editar', id: bodega!.Id_Bodega, nombre: nombre.trim(), direccion, telefono, activa };
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onGuardado(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setSaving(false);
  };

  const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 10, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
           onClick={e => e.stopPropagation()}>
        <div style={{ background: '#7c3aed', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Warehouse size={16} /> {esNueva ? 'Nueva Bodega' : `Editar: ${bodega!.Nombre}`}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div>
            <label style={lbl}>Nombre *</label>
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} style={inp} placeholder="Ej: Sucursal Norte" />
          </div>
          <div>
            <label style={lbl}>Dirección</label>
            <input value={direccion} onChange={e => setDireccion(e.target.value)} style={inp} placeholder="Ej: Cra 5 #12-34" />
          </div>
          <div>
            <label style={lbl}>Teléfono</label>
            <input value={telefono} onChange={e => setTelefono(e.target.value)} style={inp} placeholder="Opcional" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!activa} onChange={e => setActiva(e.target.checked ? 1 : 0)} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Activa</span>
            <span style={{ fontSize: 10, color: '#6b7280' }}>(las inactivas no aparecen como destino en traslados)</span>
          </label>
        </div>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ height: 30, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving}
            style={{ height: 30, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Save size={12} /> {saving ? 'Guardando…' : (esNueva ? 'Crear bodega' : 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrasladarModal({ bodegas, onClose, onOk }: { bodegas: Bodega[]; onClose: () => void; onOk: () => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [producto, setProducto] = useState<any | null>(null);
  const [destino, setDestino] = useState<number>(0);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const buscar = async (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const r = await fetch(`http://localhost:80/conta-app-backend/api/familias/buscar-producto.php?q=${encodeURIComponent(q)}&exclude_familia=0`);
      const d = await r.json();
      if (d.success) setResults(d.articulos || []);
    } catch (e) {}
  };

  const seleccionar = async (a: any) => {
    // Cargar Id_Bodega del producto
    try {
      const r = await fetch(`http://localhost:80/conta-app-backend/api/inventario/articulos.php`);
      const d = await r.json();
      const full = (d.articulos || []).find((x: any) => x.Items === a.Items);
      setProducto(full || a);
    } catch (e) { setProducto(a); }
    setBusqueda(''); setResults([]);
  };

  const guardar = async () => {
    if (!producto) { toast.error('Selecciona un producto'); return; }
    if (!destino) { toast.error('Selecciona bodega destino'); return; }
    if (destino === producto.Id_Bodega) { toast.error('El producto ya está en esa bodega'); return; }
    setSaving(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trasladar', items: producto.Items,
          id_bodega_destino: destino, comentario,
        }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onOk(); }
      else toast.error(d.message);
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setSaving(false);
  };

  const bodegaOrigen = producto ? bodegas.find(b => b.Id_Bodega === Number(producto.Id_Bodega))?.Nombre : null;
  const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 10, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1e40af', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowRightLeft size={16} /> Trasladar Producto entre Bodegas
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 8, fontSize: 11, color: '#1e40af' }}>
            El traslado mueve el <b>producto completo</b> con toda su existencia. Se registra en el historial de traslados. No afecta cantidades ni kardex — solo cambia la bodega de origen.
          </div>

          {!producto ? (
            <>
              <label style={lbl}>Buscar producto *</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input autoFocus value={busqueda} onChange={e => buscar(e.target.value)} placeholder="Código o nombre…" style={{ ...inp, paddingLeft: 32 }} />
              </div>
              {results.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                  {results.map(r => (
                    <div key={r.Items} onClick={() => seleccionar(r)}
                      style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <span style={{ fontFamily: 'monospace', color: '#7c3aed', width: 90, flexShrink: 0 }}>{r.Codigo}</span>
                      <span style={{ flex: 1 }}>{r.Nombres_Articulo}</span>
                      <span style={{ color: '#6b7280' }}>Stock: <b>{r.Existencia}</b></span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{producto.Codigo} — {producto.Nombres_Articulo}</div>
                <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>
                  Stock: <b style={{ color: '#7c3aed' }}>{producto.Existencia}</b>
                  {bodegaOrigen && (<> · Bodega actual: <b>{bodegaOrigen}</b></>)}
                </div>
                <button onClick={() => { setProducto(null); setDestino(0); }} style={{ marginTop: 6, background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Cambiar producto</button>
              </div>
              <div>
                <label style={lbl}>Bodega destino *</label>
                <select value={destino} onChange={e => setDestino(parseInt(e.target.value))} style={inp}>
                  <option value={0}>Seleccione…</option>
                  {bodegas.filter(b => b.Id_Bodega !== Number(producto.Id_Bodega)).map(b => (
                    <option key={b.Id_Bodega} value={b.Id_Bodega}>{b.Nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Comentario (opcional)</label>
                <input value={comentario} onChange={e => setComentario(e.target.value)} style={inp} placeholder="Motivo del traslado" />
              </div>
            </>
          )}
        </div>
        <div style={{ padding: '10px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ height: 30, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving || !producto || !destino}
            style={{ height: 30, padding: '0 16px', background: (producto && destino) ? '#1e40af' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: (producto && destino) ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ArrowRightLeft size={12} /> {saving ? 'Trasladando…' : 'Confirmar traslado'}
          </button>
        </div>
      </div>
    </div>
  );
}
