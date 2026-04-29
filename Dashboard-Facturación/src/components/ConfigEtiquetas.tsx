import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X, Save, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/etiquetas/index.php';

const COLORES_PRESET = [
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a',
  '#0891b2', '#2563eb', '#7c3aed', '#9333ea', '#ec4899', '#6b7280',
];

interface Etiqueta {
  Id_Etiqueta: number;
  Nombre: string;
  Descripcion: string | null;
  Color: string;
  Activa: number;
  productos_count: number;
}

export function ConfigEtiquetas() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);
  const [verInactivas, setVerInactivas] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}${verInactivas ? '?todas=1' : ''}`);
      const d = await r.json();
      if (d.success) setEtiquetas(d.etiquetas || []);
    } catch (e) { toast.error('Error al cargar'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [verInactivas]);

  const eliminar = async (e: Etiqueta) => {
    if (!confirm(`¿Eliminar la etiqueta "${e.Nombre}"?`)) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id: e.Id_Etiqueta }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message, { duration: 6000 });
    } catch (err) { toast.error('Error'); }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={20} color="#7c3aed" /> Etiquetas
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            Etiqueta de clasificación para productos (Insumos, Producto Terminado, Reventa, etc.). No maneja stock por etiqueta — solo clasifica.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
            <input type="checkbox" checked={verInactivas} onChange={e => setVerInactivas(e.target.checked)} />
            Ver inactivas
          </label>
          <button onClick={() => setEditando({ Id_Etiqueta: 0, Nombre: '', Descripcion: '', Color: '#7c3aed', Activa: 1, productos_count: 0 })}
            style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Nueva etiqueta
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : etiquetas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Tag size={36} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13 }}>No hay etiquetas creadas</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #7c3aed', fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: 50 }}></th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Descripción</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: 100 }}>Productos</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: 80 }}>Estado</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {etiquetas.map(et => (
                <tr key={et.Id_Etiqueta} style={{ borderBottom: '1px solid #f3f4f6', opacity: et.Activa ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: 6, background: et.Color, border: '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb' }} />
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: et.Color }}>{et.Nombre}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 11 }}>{et.Descripcion || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, background: '#f3f4f6', fontSize: 11, fontWeight: 600 }}>
                      <Package size={11} /> {et.productos_count}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {et.Activa ? (
                      <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>ACTIVA</span>
                    ) : (
                      <span style={{ padding: '2px 8px', background: '#f3f4f6', color: '#6b7280', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>INACTIVA</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button onClick={() => setEditando(et)} title="Editar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Edit2 size={14} color="#7c3aed" />
                    </button>
                    <button onClick={() => eliminar(et)} title="Eliminar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && <EditarEtiquetaModal etiqueta={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); cargar(); }} />}
    </div>
  );
}

function EditarEtiquetaModal({ etiqueta, onClose, onSaved }: { etiqueta: Etiqueta; onClose: () => void; onSaved: () => void }) {
  const isNew = !etiqueta.Id_Etiqueta;
  const [nombre, setNombre] = useState(etiqueta.Nombre || '');
  const [descripcion, setDescripcion] = useState(etiqueta.Descripcion || '');
  const [color, setColor] = useState(etiqueta.Color || '#7c3aed');
  const [activa, setActiva] = useState(etiqueta.Activa ?? 1);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    const n = nombre.trim();
    if (!n) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    try {
      const body = {
        action: isNew ? 'crear' : 'editar',
        id: etiqueta.Id_Etiqueta, nombre: n, descripcion, color, activa,
      };
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); onSaved(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 460, borderRadius: 10, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: color, color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}>
          <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} /> {isNew ? 'Nueva etiqueta' : 'Editar etiqueta'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Nombre *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
              placeholder="Ej. Insumos, Producto Terminado, Reventa…"
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginTop: 2, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Descripción</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Opcional"
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginTop: 2, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Color del chip</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COLORES_PRESET.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                    border: color === c ? '3px solid #1f2937' : '2px solid #fff',
                    boxShadow: color === c ? '0 0 0 1px #1f2937' : '0 0 0 1px #e5e7eb',
                    transition: 'all 0.15s',
                  }} />
              ))}
            </div>
          </div>
          {!isNew && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!activa} onChange={e => setActiva(e.target.checked ? 1 : 0)} style={{ accentColor: color, width: 16, height: 16 }} />
              Etiqueta activa
            </label>
          )}
        </div>
        <div style={{ padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving || !nombre.trim()}
            style={{ padding: '6px 14px', background: nombre.trim() ? color : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: nombre.trim() ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Save size={12} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
