import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, Plus, Edit2, Trash2, X, Package, Layers, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/familias';

interface FamiliaItem {
  Id_Familia_Item: number;
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Factor: number;
  Es_Base: number;
  Existencia: number;
  Precio_Venta: number;
  Stock_Minimo: number;
}

interface Familia {
  Id_Familia: number;
  Nombre: string;
  Descripcion: string | null;
  Activa: number;
  total_items?: number;
  existencia_total?: number;
  items?: FamiliaItem[];
}

export function FamiliasProducto() {
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Familia | null>(null);
  const [detalle, setDetalle] = useState<Familia | null>(null);
  const [showAgregarProducto, setShowAgregarProducto] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/listar.php${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      const d = await r.json();
      if (d.success) setFamilias(d.familias || []);
    } catch (e) { toast.error('Error al cargar familias'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardarFamilia = async () => {
    if (!editando) return;
    const isNew = !editando.Id_Familia;
    try {
      const body = {
        action: isNew ? 'crear' : 'editar',
        id: editando.Id_Familia,
        nombre: editando.Nombre,
        descripcion: editando.Descripcion,
        activa: editando.Activa ?? 1,
      };
      const r = await fetch(`${API}/guardar.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setEditando(null);
        cargar();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const eliminarFamilia = async (fam: Familia) => {
    if (!confirm(`¿Eliminar la familia "${fam.Nombre}"? Se quitarán todos los productos de la familia (los productos NO se eliminan).`)) return;
    try {
      const r = await fetch(`${API}/guardar.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'eliminar', id: fam.Id_Familia }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const verDetalle = async (fam: Familia) => {
    try {
      const r = await fetch(`${API}/listar.php?id=${fam.Id_Familia}`);
      const d = await r.json();
      if (d.success) setDetalle(d.familia);
    } catch (e) { toast.error('Error'); }
  };

  const removerProducto = async (idFamItem: number) => {
    if (!confirm('¿Remover este producto de la familia?')) return;
    try {
      const r = await fetch(`${API}/guardar.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remover_item', id_familia_item: idFamItem }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); if (detalle) verDetalle(detalle); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const cols: ColDef[] = [
    { headerName: 'Familia', field: 'Nombre', flex: 1, minWidth: 200,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: '#7c3aed' }}>{p.value}</span> },
    { headerName: 'Descripción', field: 'Descripcion', flex: 1, minWidth: 200,
      cellRenderer: (p: any) => <span style={{ color: '#6b7280', fontSize: 12 }}>{p.value || '-'}</span> },
    { headerName: 'Productos', field: 'total_items', width: 100, sortable: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value || 0}</span> },
    { headerName: 'Existencia total', field: 'existencia_total', width: 130, sortable: true,
      cellRenderer: (p: any) => <span style={{ fontFamily: 'monospace' }}>{parseFloat(p.value || 0).toFixed(2)}</span> },
    { headerName: 'Estado', field: 'Activa', width: 90, sortable: true,
      cellRenderer: (p: any) => p.value
        ? <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}><CheckCircle size={12} style={{ display: 'inline', marginRight: 2 }} />Activa</span>
        : <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>Inactiva</span>
    },
    { headerName: '', width: 120, sortable: false,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button title="Ver productos" onClick={() => verDetalle(p.data)}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={13} color="#2563eb" />
          </button>
          <button title="Editar" onClick={() => setEditando(p.data)}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Edit2 size={13} color="#7c3aed" />
          </button>
          <button title="Eliminar" onClick={() => eliminarFamilia(p.data)}
            style={{ width: 26, height: 24, border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={13} color="#dc2626" />
          </button>
        </div>
      )
    }
  ];

  const familiasFiltradas = familias.filter(f => !search || f.Nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Familias de Productos</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Agrupa unidades del mismo producto (Bulto, Kilo, Libra) con su equivalencia</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" placeholder="Buscar familia..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ height: 30, paddingLeft: 28, paddingRight: 8, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, width: 200 }} />
          </div>
          <button onClick={() => setEditando({ Id_Familia: 0, Nombre: '', Descripcion: '', Activa: 1 })}
            style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Nueva familia
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : familiasFiltradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Package size={32} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13 }}>No hay familias. Crea la primera.</p>
          </div>
        ) : (
          <div className="ag-theme-quartz" style={{ height: 500 }}>
            <AgGridReact rowData={familiasFiltradas} columnDefs={cols} rowHeight={36} headerHeight={36} animateRows />
          </div>
        )}
      </div>

      {editando && <EditarFamiliaModal familia={editando} setFamilia={setEditando} guardar={guardarFamilia} />}
      {detalle && <DetalleFamiliaModal familia={detalle} onClose={() => setDetalle(null)} onRefresh={() => verDetalle(detalle)} onAgregar={() => setShowAgregarProducto(true)} onRemover={removerProducto} />}
      {showAgregarProducto && detalle && (
        <AgregarProductoModal
          idFamilia={detalle.Id_Familia}
          onClose={() => setShowAgregarProducto(false)}
          onAgregado={() => { setShowAgregarProducto(false); verDetalle(detalle); cargar(); }}
        />
      )}
    </div>
  );
}

// ---------- Modal: Editar/Crear Familia ----------
function EditarFamiliaModal({ familia, setFamilia, guardar }: { familia: Familia; setFamilia: (f: Familia | null) => void; guardar: () => void }) {
  const isNew = !familia.Id_Familia;
  // Estado local — evita re-renders del padre en cada tecla y que se pierda el foco
  const [nombre, setNombre] = useState(familia.Nombre || '');
  const [descripcion, setDescripcion] = useState(familia.Descripcion || '');
  const [activa, setActiva] = useState(familia.Activa ?? 1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Asegurar foco aunque autoFocus no se aplique
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const onGuardar = () => {
    const n = nombre.trim();
    if (!n) return;
    setFamilia({ ...familia, Nombre: n, Descripcion: descripcion, Activa: activa });
    // Pequeño delay para que el setState propague antes de llamar guardar
    setTimeout(() => guardar(), 0);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setFamilia(null)} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{isNew ? 'Nueva Familia' : 'Editar Familia'}</span>
          <button onClick={() => setFamilia(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>NOMBRE *</label>
            <input ref={inputRef} value={nombre} onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nombre.trim()) onGuardar(); }}
              style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>DESCRIPCIÓN</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Opcional"
              style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2 }} />
          </div>
          {!isNew && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!activa} onChange={e => setActiva(e.target.checked ? 1 : 0)}
                style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
              Familia activa
            </label>
          )}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setFamilia(null)} style={{ height: 30, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onGuardar} disabled={!nombre.trim()}
            style={{ height: 30, padding: '0 14px', background: nombre.trim() ? '#7c3aed' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: nombre.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Save size={12} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal: Detalle (productos de una familia) ----------
function DetalleFamiliaModal({ familia, onClose, onRefresh, onAgregar, onRemover }: {
  familia: Familia; onClose: () => void; onRefresh: () => void; onAgregar: () => void; onRemover: (id: number) => void;
}) {
  const [editandoItem, setEditandoItem] = useState<FamiliaItem | null>(null);

  const guardarItem = async () => {
    if (!editandoItem) return;
    try {
      const r = await fetch(`${API}/guardar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar_item', id_familia_item: editandoItem.Id_Familia_Item, factor: editandoItem.Factor, es_base: editandoItem.Es_Base })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setEditandoItem(null); onRefresh(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 820, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{familia.Nombre}</div>
            {familia.Descripcion && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{familia.Descripcion}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onAgregar} style={{ height: 28, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={12} /> Agregar producto
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: 12 }}>
          {(!familia.items || familia.items.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin productos. Agrega el primero.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb', color: '#6b7280', fontSize: 11, fontWeight: 600 }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Código</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Nombre</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Factor</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Existencia</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Base</th>
                  <th style={{ padding: 8, width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {familia.items!.sort((a, b) => b.Factor - a.Factor).map(it => (
                  <tr key={it.Id_Familia_Item} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8, color: '#7c3aed', fontWeight: 600 }}>{it.Codigo}</td>
                    <td style={{ padding: 8 }}>{it.Nombres_Articulo}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{Number(it.Factor)}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontFamily: 'monospace', color: it.Existencia > 0 ? '#16a34a' : '#9ca3af' }}>{Number(it.Existencia).toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      {it.Es_Base ? <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>BASE</span> : ''}
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <button onClick={() => setEditandoItem(it)} title="Editar factor"
                        style={{ width: 24, height: 22, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', marginRight: 4 }}>
                        <Edit2 size={11} color="#7c3aed" />
                      </button>
                      <button onClick={() => onRemover(it.Id_Familia_Item)} title="Remover"
                        style={{ width: 24, height: 22, border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', background: '#fef2f2' }}>
                        <Trash2 size={11} color="#dc2626" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {editandoItem && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setEditandoItem(null)} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 14, fontWeight: 700 }}>Editar producto en familia</div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PRODUCTO</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{editandoItem.Codigo} — {editandoItem.Nombres_Articulo}</div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>FACTOR (cuántas unidades base contiene) *</label>
                  <input type="text" defaultValue={String(editandoItem.Factor)}
                    onBlur={e => setEditandoItem({ ...editandoItem, Factor: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2, fontFamily: 'monospace' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editandoItem.Es_Base} onChange={e => setEditandoItem({ ...editandoItem, Es_Base: e.target.checked ? 1 : 0 })}
                    style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
                  Esta es la unidad base (factor 1)
                </label>
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setEditandoItem(null)} style={{ height: 30, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardarItem}
                  style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Modal: Agregar producto a familia ----------
function AgregarProductoModal({ idFamilia, onClose, onAgregado }: { idFamilia: number; onClose: () => void; onAgregado: () => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [factor, setFactor] = useState('1');
  const [esBase, setEsBase] = useState(false);
  const timerRef = useRef<any>(null);

  const buscar = (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/buscar-producto.php?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (d.success) setResults(d.articulos || []);
      } catch (e) {}
    }, 250);
  };

  const agregar = async () => {
    if (!seleccionado) return;
    const f = parseFloat(factor) || 1;
    if (f <= 0) { toast.error('Factor debe ser mayor a 0'); return; }
    try {
      const r = await fetch(`${API}/guardar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'agregar_item', id_familia: idFamilia, items: seleccionado.Items, factor: f, es_base: esBase })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onAgregado(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 520, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Agregar producto a familia</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!seleccionado ? (
            <>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input autoFocus type="text" placeholder="Buscar por código o nombre..." value={busqueda}
                  onChange={e => buscar(e.target.value)}
                  style={{ width: '100%', height: 34, paddingLeft: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ maxHeight: 280, overflow: 'auto' }}>
                {results.map(r => (
                  <div key={r.Items} onClick={() => setSeleccionado(r)}
                    style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}
                    onMouseOver={e => (e.currentTarget.style.background = '#f5f3ff')}
                    onMouseOut={e => (e.currentTarget.style.background = '')}>
                    <span style={{ color: '#7c3aed', fontWeight: 600, width: 70, flexShrink: 0 }}>{r.Codigo}</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{r.Nombres_Articulo}</span>
                    <span style={{ color: '#6b7280' }}>Stock: {Number(r.Existencia).toFixed(2)}</span>
                  </div>
                ))}
                {busqueda.length >= 2 && results.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Sin resultados (puede que ya esté en otra familia)</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: 10, background: '#f5f3ff', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>PRODUCTO SELECCIONADO</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{seleccionado.Codigo} — {seleccionado.Nombres_Articulo}</div>
                <button onClick={() => setSeleccionado(null)} style={{ marginTop: 4, background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', padding: 0 }}>Cambiar</button>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>FACTOR (cuántas unidades base contiene este producto) *</label>
                <input type="text" value={factor} onChange={e => setFactor(e.target.value)} autoFocus
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2, fontFamily: 'monospace' }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Ejemplo: si es "Bulto de 50 kilos" y el base es "Kilo", ponga 50. Si este es el base (ej. Kilo), ponga 1.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={esBase} onChange={e => setEsBase(e.target.checked)}
                  style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
                Esta es la unidad base de la familia
              </label>
            </>
          )}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 30, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={agregar} disabled={!seleccionado}
            style={{ height: 30, padding: '0 14px', background: seleccionado ? '#7c3aed' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: seleccionado ? 'pointer' : 'not-allowed' }}>
            Agregar a familia
          </button>
        </div>
      </div>
    </div>
  );
}
