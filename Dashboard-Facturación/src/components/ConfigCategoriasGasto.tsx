import { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/movimientos/categorias-gasto.php';

export function ConfigCategoriasGasto() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nuevaCat, setNuevaCat] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');

  const cargar = async () => {
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setCategorias(d.categorias || []);
    } catch (e) {}
  };

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    if (!nuevaCat.trim()) return;
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'crear', nombre: nuevaCat.trim() }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); setNuevaCat(''); cargar(); } else toast.error(d.message);
  };

  const editar = async (id: number) => {
    if (!editNombre.trim()) return;
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'editar', id, nombre: editNombre.trim() }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); setEditandoId(null); cargar(); } else toast.error(d.message);
  };

  const toggle = async (id: number, activa: boolean) => {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: activa ? 'eliminar' : 'activar', id }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); cargar(); }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Categorías de Gastos</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Administre las categorías para clasificar gastos</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input type="text" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
            placeholder="Nueva categoría..." onKeyDown={e => { if (e.key === 'Enter') crear(); }}
            style={{ flex: 1, height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 12px' }} />
          <button onClick={crear}
            style={{ height: 34, padding: '0 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Agregar
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {categorias.map(c => (
            <div key={c.Id_Categoria} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
              background: c.Activa ? '#fff' : '#f9fafb', border: '1px solid #e5e7eb',
              opacity: c.Activa ? 1 : 0.5
            }}>
              {editandoId === c.Id_Categoria ? (
                <>
                  <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') editar(c.Id_Categoria); if (e.key === 'Escape') setEditandoId(null); }}
                    autoFocus
                    style={{ flex: 1, height: 28, border: '1px solid #7c3aed', borderRadius: 6, fontSize: 13, padding: '0 8px' }} />
                  <button onClick={() => editar(c.Id_Categoria)}
                    style={{ height: 28, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>OK</button>
                  <button onClick={() => setEditandoId(null)}
                    style={{ height: 28, padding: '0 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>X</button>
                </>
              ) : (
                <>
                  <Tag size={14} color={c.Activa ? '#dc2626' : '#9ca3af'} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: c.Activa ? '#374151' : '#9ca3af' }}>{c.Nombre}</span>
                  <button title="Editar" onClick={() => { setEditandoId(c.Id_Categoria); setEditNombre(c.Nombre); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 14 }}>✏️</button>
                  <button title={c.Activa ? 'Desactivar' : 'Activar'} onClick={() => toggle(c.Id_Categoria, c.Activa)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {c.Activa ? <Trash2 size={15} color="#dc2626" /> : <RotateCcw size={15} color="#16a34a" />}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
