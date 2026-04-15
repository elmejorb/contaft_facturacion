import { useState, useEffect } from 'react';
import { Shield, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/usuarios/permisos.php';

export function ConfigPermisos() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);
  const [tipoSel, setTipoSel] = useState<number>(0);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) {
        setTipos(d.tipos || []);
        setModulos(d.modulos || []);
        if (d.tipos?.length > 0 && !tipoSel) {
          setTipoSel(d.tipos[0].Id_TiposUsuario);
          setPermisos(d.tipos[0].permisos_lista || []);
        }
      }
    } catch (e) {}
  };

  useEffect(() => { cargar(); }, []);

  const seleccionarTipo = (id: number) => {
    setTipoSel(id);
    const tipo = tipos.find(t => t.Id_TiposUsuario === id);
    setPermisos(tipo?.permisos_lista || []);
  };

  const togglePermiso = (id: string) => {
    setPermisos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const marcarTodos = () => setPermisos(modulos.map(m => m.id));
  const desmarcarTodos = () => setPermisos([]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', tipo_id: tipoSel, permisos }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    setGuardando(false);
  };

  // Agrupar módulos
  const grupos = modulos.reduce((acc: Record<string, any[]>, m) => {
    if (!acc[m.grupo]) acc[m.grupo] = [];
    acc[m.grupo].push(m);
    return acc;
  }, {});

  const tipoActual = tipos.find(t => t.Id_TiposUsuario === tipoSel);

  return (
    <div style={{ maxWidth: 650 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Permisos de Usuario</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Configure qué módulos puede ver cada tipo de usuario</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          style={{ height: 34, padding: '0 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.6 : 1 }}>
          <Save size={15} /> Guardar
        </button>
      </div>

      {/* Selector de tipo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tipos.map(t => (
          <button key={t.Id_TiposUsuario} onClick={() => seleccionarTipo(t.Id_TiposUsuario)}
            style={{
              flex: 1, height: 40, border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              background: tipoSel === t.Id_TiposUsuario ? '#7c3aed' : '#f3f4f6',
              color: tipoSel === t.Id_TiposUsuario ? '#fff' : '#374151',
            }}>
            {t.Nombre_TipoUsuario}
            <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.7 }}>
              {(t.permisos_lista || []).length} permisos
            </span>
          </button>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={marcarTodos} style={{ height: 28, padding: '0 10px', background: '#dcfce7', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Marcar todos</button>
        <button onClick={desmarcarTodos} style={{ height: 28, padding: '0 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Desmarcar todos</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{permisos.length} de {modulos.length} activos</span>
      </div>

      {/* Módulos por grupo */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {Object.entries(grupos).map(([grupo, mods]) => (
          <div key={grupo}>
            <div style={{ padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {grupo}
            </div>
            {(mods as any[]).map(m => {
              const activo = permisos.includes(m.id);
              return (
                <label key={m.id} onClick={() => togglePermiso(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, border: `2px solid ${activo ? '#7c3aed' : '#d1d5db'}`,
                    background: activo ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', flexShrink: 0
                  }}>
                    {activo && <Check size={14} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: activo ? 600 : 400, color: activo ? '#1f2937' : '#6b7280' }}>{m.label}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
