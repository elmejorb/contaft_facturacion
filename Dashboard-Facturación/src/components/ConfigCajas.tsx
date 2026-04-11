import { useState, useEffect } from 'react';
import { Plus, DollarSign, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/caja/sesion.php';

export function ConfigCajas() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('punto_venta');

  const cargar = async () => {
    try {
      const r = await fetch(`${API}?cajas=1`);
      const d = await r.json();
      if (d.success) setCajas(d.cajas || []);
    } catch (e) {}
  };

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    if (!nuevaNombre.trim()) return;
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'crear_caja', nombre: nuevaNombre.trim(), tipo: nuevoTipo }) });
    const d = await r.json();
    if (d.success) { toast.success(d.message); setNuevaNombre(''); cargar(); } else toast.error(d.message);
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Administrar Cajas</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Cajas de punto de venta y caja principal</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Lista de cajas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {cajas.map(c => (
            <div key={c.Id_Caja} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
              <DollarSign size={18} color={c.Tipo === 'principal' ? '#2563eb' : '#16a34a'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.Nombre}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {c.Tipo === 'principal' ? 'Caja Principal' : 'Punto de venta'}
                  {c.sesiones_abiertas > 0 && <span style={{ color: '#16a34a', marginLeft: 8 }}>Abierta por: {c.cajero_actual}</span>}
                </div>
              </div>
              {c.Tipo === 'principal' && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>
                  $ {Math.round(parseFloat(c.Saldo) || 0).toLocaleString('es-CO')}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Nueva caja */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Crear nueva caja</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={nuevaNombre} onChange={e => setNuevaNombre(e.target.value)}
              placeholder="Nombre de la caja" onKeyDown={e => { if (e.key === 'Enter') crear(); }}
              style={{ flex: 1, height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 12px' }} />
            <select value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)}
              style={{ height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, padding: '0 8px' }}>
              <option value="punto_venta">Punto de venta</option>
              <option value="principal">Principal</option>
            </select>
            <button onClick={crear}
              style={{ height: 34, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={14} /> Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
