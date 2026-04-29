import { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, Key, Save, X, Shield, ShoppingCart, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/usuarios/listar.php';

const tipoIconos: Record<string, { icon: any; bg: string; color: string }> = {
  'Administrador': { icon: Shield, bg: '#f3e8ff', color: '#7c3aed' },
  'Vendedor': { icon: ShoppingCart, bg: '#dcfce7', color: '#16a34a' },
  'Secretaria': { icon: UserCheck, bg: '#dbeafe', color: '#2563eb' },
};

export function UsuariosManagement() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ Usuario: '', Nombre: '', Indentificacion: '', Id_TiposUsuario: 2, Id_Caja: 0, contrasena: '', confirmar: '' });
  const [passForm, setPassForm] = useState({ Id_Usuario: 0, nombre: '', contrasena: '', confirmar: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) { setUsuarios(d.usuarios); setTipos(d.tipos); setCajas(d.cajas || []); }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ Usuario: '', Nombre: '', Indentificacion: '', Id_TiposUsuario: 2, Id_Caja: 0, contrasena: '', confirmar: '' });
    setShowModal(true);
  };

  const abrirEditar = (u: any) => {
    setEditando(u);
    setForm({ Usuario: u.Usuario, Nombre: u.Nombre, Indentificacion: String(u.Indentificacion || ''), Id_TiposUsuario: u.Id_TiposUsuario, Id_Caja: u.Id_Caja || 0, contrasena: '', confirmar: '' });
    setShowModal(true);
  };

  const guardar = async () => {
    if (!form.Usuario.trim() || !form.Nombre.trim()) { toast.error('Usuario y Nombre son obligatorios'); return; }
    if (!editando && !form.contrasena) { toast.error('La contraseña es obligatoria para nuevos usuarios'); return; }
    if (form.contrasena && form.contrasena !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    setGuardando(true);
    try {
      const body: any = {
        action: editando ? 'update' : 'create',
        Usuario: form.Usuario, Nombre: form.Nombre,
        Indentificacion: form.Indentificacion,
        Id_TiposUsuario: form.Id_TiposUsuario,
        Id_Caja: form.Id_Caja || null,
      };
      if (editando) body.Id_Usuario = editando.Id_Usuario;
      if (form.contrasena) body.contrasena = form.contrasena;
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowModal(false); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error al guardar'); }
    setGuardando(false);
  };

  const cambiarPass = async () => {
    if (!passForm.contrasena) { toast.error('Ingrese la nueva contraseña'); return; }
    if (passForm.contrasena !== passForm.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    setGuardando(true);
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cambiar-pass', Id_Usuario: passForm.Id_Usuario, contrasena: passForm.contrasena })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowPassModal(false); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
    setGuardando(false);
  };

  const eliminar = async (u: any) => {
    if (u.Id_Usuario === 1) { toast.error('No se puede eliminar el usuario principal'); return; }
    const ok = await confirmar({ title: 'Eliminar Usuario', message: `¿Eliminar al usuario "${u.Nombre}"? Esta acción no se puede deshacer.`, type: 'danger', confirmText: 'Eliminar' });
    if (!ok) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', Id_Usuario: u.Id_Usuario }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const inp: React.CSSProperties = { height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 600 };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Usuarios</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Administración de usuarios del sistema</p>
        </div>
        <button onClick={abrirNuevo}
          style={{ height: 34, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Nuevo Usuario
        </button>
      </div>

      {/* Cards de tipos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {tipos.map((t: any) => {
          const ic = tipoIconos[t.Nombre_TipoUsuario] || tipoIconos['Vendedor'];
          const Icon = ic.icon;
          const count = usuarios.filter(u => u.Id_TiposUsuario === t.Id_TiposUsuario).length;
          return (
            <div key={t.Id_TiposUsuario} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={ic.color} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{t.Nombre_TipoUsuario}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: ic.color }}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de usuarios */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {usuarios.map((u: any) => {
          const ic = tipoIconos[u.Nombre_TipoUsuario] || tipoIconos['Vendedor'];
          const Icon = ic.icon;
          return (
            <div key={u.Id_Usuario} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={ic.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{u.Nombre}</span>
                  <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 4, background: ic.bg, color: ic.color, fontWeight: 600 }}>{u.Nombre_TipoUsuario}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  Usuario: <b>{u.Usuario}</b> | ID: {u.Id_Usuario} {u.Indentificacion ? `| CC: ${u.Indentificacion}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => abrirEditar(u)} title="Editar"
                  style={{ width: 30, height: 30, background: '#f3e8ff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={14} color="#7c3aed" />
                </button>
                <button onClick={() => { setPassForm({ Id_Usuario: u.Id_Usuario, nombre: u.Nombre, contrasena: '', confirmar: '' }); setShowPassModal(true); }}
                  title="Cambiar contraseña"
                  style={{ width: 30, height: 30, background: '#fef3c7', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={14} color="#d97706" />
                </button>
                {u.Id_Usuario !== 1 && (
                  <button onClick={() => eliminar(u)} title="Eliminar"
                    style={{ width: 30, height: 30, background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} color="#dc2626" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 440, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Usuario (login)</label>
                <input type="text" value={form.Usuario} onChange={e => setForm({ ...form, Usuario: e.target.value })} style={inp} autoFocus />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Nombre completo</label>
                <input type="text" value={form.Nombre} onChange={e => setForm({ ...form, Nombre: e.target.value })} style={inp} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Identificación</label>
                  <input type="text" value={form.Indentificacion} onChange={e => setForm({ ...form, Indentificacion: e.target.value.replace(/[^0-9]/g, '') })} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Tipo de Usuario</label>
                  <select value={form.Id_TiposUsuario} onChange={e => setForm({ ...form, Id_TiposUsuario: parseInt(e.target.value) })} style={inp}>
                    {tipos.map((t: any) => <option key={t.Id_TiposUsuario} value={t.Id_TiposUsuario}>{t.Nombre_TipoUsuario}</option>)}
                  </select>
                </div>
              </div>

              {/* Caja asignada (solo no-admin) */}
              {form.Id_TiposUsuario !== 1 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Caja asignada</label>
                  <select value={form.Id_Caja} onChange={e => setForm({ ...form, Id_Caja: parseInt(e.target.value) })} style={inp}>
                    <option value={0}>-- Sin asignación (puede usar cualquiera) --</option>
                    {cajas.map((c: any) => <option key={c.Id_Caja} value={c.Id_Caja}>{c.Nombre}</option>)}
                  </select>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
                    Si se asigna, el usuario solo podrá abrir esta caja
                  </div>
                </div>
              )}
              {!editando && (<>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Contraseña</label>
                  <input type="password" value={form.contrasena} onChange={e => setForm({ ...form, contrasena: e.target.value })} style={inp} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Confirmar contraseña</label>
                  <input type="password" value={form.confirmar} onChange={e => setForm({ ...form, confirmar: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') guardar(); }}
                    style={{ ...inp, borderColor: form.confirmar && form.contrasena !== form.confirmar ? '#dc2626' : '#d1d5db' }} />
                  {form.confirmar && form.contrasena !== form.confirmar && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>Las contraseñas no coinciden</div>}
                </div>
              </>)}
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                style={{ height: 32, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Save size={14} /> {editando ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {showPassModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPassModal(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 380, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '3px solid #d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Cambiar Contraseña</span>
              <button onClick={() => setShowPassModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Usuario: <b>{passForm.nombre}</b></div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Nueva contraseña</label>
                <input type="password" value={passForm.contrasena} onChange={e => setPassForm({ ...passForm, contrasena: e.target.value })} style={inp} autoFocus />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Confirmar contraseña</label>
                <input type="password" value={passForm.confirmar} onChange={e => setPassForm({ ...passForm, confirmar: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') cambiarPass(); }}
                  style={{ ...inp, borderColor: passForm.confirmar && passForm.contrasena !== passForm.confirmar ? '#dc2626' : '#d1d5db' }} />
                {passForm.confirmar && passForm.contrasena !== passForm.confirmar && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>No coinciden</div>}
              </div>
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowPassModal(false)} style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={cambiarPass} disabled={guardando}
                style={{ height: 32, padding: '0 16px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Key size={14} /> Cambiar Contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
