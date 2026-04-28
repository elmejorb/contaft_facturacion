import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Percent, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/retenciones/listar.php';

interface Retencion {
  Id_Retencion: number;
  Codigo: string;
  Nombre: string;
  Porcentaje: number;
  Codigo_Dian: string | null;
  Activa: number;
}

export function ConfigRetenciones() {
  const [items, setItems] = useState<Retencion[]>([]);
  const [editando, setEditando] = useState<Retencion | null>(null);

  const cargar = async () => {
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setItems(d.retenciones || []);
    } catch (e) { toast.error('Error al cargar retenciones'); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!editando) return;
    const isNew = !editando.Id_Retencion;
    if (!editando.Codigo.trim() || !editando.Nombre.trim() || editando.Porcentaje < 0) {
      toast.error('Código, nombre y porcentaje son requeridos'); return;
    }
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isNew ? 'crear' : 'editar',
          id: editando.Id_Retencion,
          codigo: editando.Codigo, nombre: editando.Nombre,
          porcentaje: editando.Porcentaje,
          codigo_dian: editando.Codigo_Dian || null,
          activa: editando.Activa ? 1 : 0,
        })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setEditando(null); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const eliminar = async (r: Retencion) => {
    if (!confirm(`¿Eliminar "${r.Nombre}"? Si tiene historial en facturas se marcará como inactiva.`)) return;
    try {
      const res = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id: r.Id_Retencion })
      });
      const d = await res.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const toggleActiva = async (r: Retencion) => {
    try {
      const res = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editar', id: r.Id_Retencion,
          codigo: r.Codigo, nombre: r.Nombre, porcentaje: r.Porcentaje,
          codigo_dian: r.Codigo_Dian, activa: r.Activa ? 0 : 1
        })
      });
      const d = await res.json();
      if (d.success) cargar();
    } catch (e) {}
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937' }}>Retenciones</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
            Tipos de retención que los clientes te aplican. Los % se editan aquí cuando cambia una reforma tributaria.
          </p>
        </div>
        <button onClick={() => setEditando({ Id_Retencion: 0, Codigo: '', Nombre: '', Porcentaje: 0, Codigo_Dian: null, Activa: 1 })}
          style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> Nueva retención
        </button>
      </div>

      <div style={{ padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 12, display: 'flex', gap: 8, fontSize: 12, color: '#1e40af' }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Marca "Activa" solo las retenciones que realmente usas. En los datos de cada cliente seleccionas cuáles le aplican.</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {items.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin retenciones configuradas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb', color: '#6b7280', fontSize: 11, fontWeight: 600 }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Código</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Porcentaje</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Código DIAN</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Activa</th>
                <th style={{ padding: 8, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.Id_Retencion} style={{ borderTop: '1px solid #f3f4f6', opacity: r.Activa ? 1 : 0.5 }}>
                  <td style={{ padding: 8, fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>{r.Codigo}</td>
                  <td style={{ padding: 8 }}>{r.Nombre}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{r.Porcentaje.toFixed(3)}%</td>
                  <td style={{ padding: 8, textAlign: 'center', fontFamily: 'monospace', color: '#6b7280' }}>{r.Codigo_Dian || '—'}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <label style={{ cursor: 'pointer', fontSize: 0 }}>
                      <input type="checkbox" checked={!!r.Activa} onChange={() => toggleActiva(r)} style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
                    </label>
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <button onClick={() => setEditando(r)} title="Editar"
                      style={{ width: 24, height: 22, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', marginRight: 4 }}>
                      <Pencil size={11} color="#f59e0b" />
                    </button>
                    <button onClick={() => eliminar(r)} title="Eliminar"
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

      {editando && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setEditando(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{editando.Id_Retencion ? 'Editar retención' : 'Nueva retención'}</span>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CÓDIGO INTERNO *</label>
                <input value={editando.Codigo} onChange={e => setEditando({ ...editando, Codigo: e.target.value.toUpperCase() })}
                  placeholder="RETEFUENTE_SERV_DECL"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 12, marginTop: 2, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>NOMBRE *</label>
                <input value={editando.Nombre} onChange={e => setEditando({ ...editando, Nombre: e.target.value })}
                  placeholder="ReteFuente servicios (declarante)"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13, marginTop: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PORCENTAJE *</label>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                    <input type="text" value={String(editando.Porcentaje)}
                      onChange={e => setEditando({ ...editando, Porcentaje: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                      style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 14, fontFamily: 'monospace', textAlign: 'right' }} />
                    <Percent size={14} color="#6b7280" style={{ marginLeft: -24, pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CÓDIGO DIAN (opcional)</label>
                  <input value={editando.Codigo_Dian || ''} onChange={e => setEditando({ ...editando, Codigo_Dian: e.target.value || null })}
                    placeholder="05 / 06 / 07"
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 12, marginTop: 2, fontFamily: 'monospace' }} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={!!editando.Activa} onChange={e => setEditando({ ...editando, Activa: e.target.checked ? 1 : 0 })}
                  style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
                Retención activa
              </label>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditando(null)} style={{ height: 30, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar}
                style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Save size={12} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
