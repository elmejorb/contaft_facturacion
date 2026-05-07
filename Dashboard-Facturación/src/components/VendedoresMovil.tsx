import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Smartphone, Plus, RefreshCw, Save, X, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/vendedores/vendedores.php';

interface Vendedor {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono?: string;
  cedula?: string;
  zona?: string;
  can_edit_clients: number;
  activo: number;
  sincronizado: number;
}

export function VendedoresMovil() {
  const { config, habilitado, refetch } = useVendedoresConfig();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    codigo: '', nombre: '', email: '', password: '', telefono: '', cedula: '', zona: '',
    can_edit_clients: true, activo: true,
  });
  const [syncing, setSyncing] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setVendedores(d.vendedores || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { if (habilitado) cargar(); }, [habilitado, cargar]);

  const abrirCrear = () => {
    setEditId(null);
    const nextCode = 'V' + String(vendedores.length + 1).padStart(3, '0');
    setForm({ codigo: nextCode, nombre: '', email: '', password: '', telefono: '', cedula: '', zona: '', can_edit_clients: true, activo: true });
    setShowModal(true);
  };

  const abrirEditar = (v: Vendedor) => {
    setEditId(v.id);
    setForm({
      codigo: v.codigo, nombre: v.nombre, email: v.email, password: '',
      telefono: v.telefono || '', cedula: v.cedula || '', zona: v.zona || '',
      can_edit_clients: !!v.can_edit_clients, activo: !!v.activo,
    });
    setShowModal(true);
  };

  const guardar = async () => {
    if (!form.codigo || !form.nombre || !form.email || (!editId && !form.password)) {
      toast.error('Complete código, nombre, email y contraseña');
      return;
    }
    const action = editId ? 'editar' : 'crear';
    const payload = editId ? { action, id: editId, ...form } : { action, ...form };
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setShowModal(false);
        cargar();
      } else {
        toast.error(d.message);
      }
    } catch (e) { toast.error('Error de conexión'); }
  };

  const sincronizar = async () => {
    setSyncing(true);
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sincronizar' }) });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        cargar();
        refetch();
      } else {
        toast.error(d.message);
      }
    } catch (e) { toast.error('Error de conexión'); }
    setSyncing(false);
  };

  const toggleActivo = async (id: number) => {
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_activo', id }) });
      const d = await r.json();
      if (d.success) cargar();
    } catch (e) {}
  };

  const colDefs = [
    { field: 'codigo', headerName: 'Código', width: 90 },
    { field: 'nombre', headerName: 'Nombre', width: 180 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'zona', headerName: 'Zona', width: 130 },
    {
      field: 'can_edit_clients', headerName: 'Edita Clientes', width: 110,
      cellRenderer: (p: any) => p.value ? 'Sí' : 'No',
    },
    {
      field: 'activo', headerName: 'Activo', width: 80,
      cellRenderer: (p: any) => (
        <button onClick={() => toggleActivo(p.data.id)}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          {p.value ? <CheckCircle size={16} color="#16a34a" /> : <AlertCircle size={16} color="#dc2626" />}
        </button>
      ),
    },
    {
      field: 'sincronizado', headerName: 'Sync', width: 70,
      cellRenderer: (p: any) => p.value ? <CheckCircle size={16} color="#16a34a" /> : <AlertCircle size={16} color="#f59e0b" />,
    },
    {
      headerName: 'Acciones', width: 90, cellRenderer: (p: any) => (
        <button onClick={() => abrirEditar(p.data)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#7c3aed' }}>
          Editar
        </button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={22} color="#7c3aed" />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Gestión de Vendedores</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Vendedores móviles sincronizados con la app</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={sincronizar} disabled={syncing}
            style={{ height: 34, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sync...' : 'Sincronizar'}
          </button>
          <button onClick={abrirCrear}
            style={{ height: 34, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Nuevo Vendedor
          </button>
        </div>
      </div>

      <div style={{ height: 500, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 12 }}>
        <AgGridReact rowData={vendedores} columnDefs={colDefs as any} pagination pageSize={20} />
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Código</label>
              <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Nombre completo</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Email (login en app)</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>{editId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Cédula</label>
              <input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Zona</label>
              <input value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))} style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.can_edit_clients} onChange={e => setForm(f => ({ ...f, can_edit_clients: e.target.checked }))} />
                Puede editar clientes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                Activo
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ height: 34, padding: '0 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} style={{ height: 34, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}><Save size={14} style={{ marginRight: 6 }} />Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
