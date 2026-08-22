import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Smartphone, Plus, RefreshCw, Save, X, Eye, EyeOff, CheckCircle, AlertCircle, UserPlus, Link, Pencil, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

// Mismo tema que InventarioManagement y VendedoresPedidos — coherente.
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
    codigo_emp: 0, // CodigoEmp del empleado si viene vinculado
  });
  const [syncing, setSyncing] = useState(false);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<any[]>([]);
  const [showEmpleadoPicker, setShowEmpleadoPicker] = useState(false);
  const [empleadoBusqueda, setEmpleadoBusqueda] = useState('');

  // Modal asignación de clientes
  const [asignVend, setAsignVend] = useState<Vendedor | null>(null);
  const [asignClientes, setAsignClientes] = useState<any[]>([]);
  const [asignados, setAsignados] = useState<Set<number>>(new Set());
  const [asignBusqueda, setAsignBusqueda] = useState('');
  const [asignLoading, setAsignLoading] = useState(false);
  const [asignGuardando, setAsignGuardando] = useState(false);

  const abrirAsignacion = async (v: Vendedor) => {
    setAsignVend(v);
    setAsignLoading(true);
    setAsignBusqueda('');
    try {
      const r = await fetch(`http://localhost:80/conta-app-backend/api/vendedores/asignar-clientes.php?id_vendedor=${v.id}`);
      const d = await r.json();
      if (d.success) {
        setAsignClientes(d.clientes || []);
        setAsignados(new Set((d.asignados || []).map((c: any) => parseInt(c))));
      } else {
        toast.error(d.message || 'Error consultando asignaciones');
      }
    } catch (e) { toast.error('Error de conexión'); }
    setAsignLoading(false);
  };

  const toggleAsignado = (codigo: number) => {
    setAsignados(prev => {
      const s = new Set(prev);
      if (s.has(codigo)) s.delete(codigo); else s.add(codigo);
      return s;
    });
  };

  const guardarAsignacion = async () => {
    if (!asignVend) return;
    setAsignGuardando(true);
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/vendedores/asignar-clientes.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_vendedor: asignVend.id, codvb6: Array.from(asignados) }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`${d.asignados} clientes asignados a ${asignVend.nombre}`);
        setAsignVend(null);
      } else {
        toast.error(d.message || 'Error guardando');
      }
    } catch (e) { toast.error('Error de conexión'); }
    setAsignGuardando(false);
  };

  const asignClientesFiltrados = asignClientes.filter(c => {
    if (!asignBusqueda) return true;
    const q = asignBusqueda.toLowerCase();
    return (c.Razon_Social || '').toLowerCase().includes(q) ||
           (c.Nit || '').toLowerCase().includes(q) ||
           String(c.CodigoClien).includes(q);
  });

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
    setForm({ codigo: nextCode, nombre: '', email: '', password: '', telefono: '', cedula: '', zona: '', can_edit_clients: true, activo: true, codigo_emp: 0 });
    setShowModal(true);
  };

  const abrirPickerEmpleados = async () => {
    try {
      const r = await fetch(`${API}?action=empleados_disponibles`);
      const d = await r.json();
      if (d.success) {
        setEmpleadosDisponibles(d.empleados || []);
        setEmpleadoBusqueda('');
        setShowEmpleadoPicker(true);
      } else {
        toast.error(d.message || 'Error al cargar empleados');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const seleccionarEmpleado = (emp: any) => {
    setShowEmpleadoPicker(false);
    setEditId(null);
    const nextCode = 'V' + String(vendedores.length + 1).padStart(3, '0');
    setForm({
      codigo: nextCode,
      nombre: emp.nombre_completo || `${emp.Nombres} ${emp.Apellidos}`.trim(),
      email: '',
      password: '',
      telefono: emp.Telefono || '',
      cedula: emp.Cedula || '',
      zona: '',
      can_edit_clients: true,
      activo: true,
      codigo_emp: emp.CodigoEmp,
    });
    setShowModal(true);
  };

  const empleadosFiltrados = empleadosDisponibles.filter(e => {
    if (!empleadoBusqueda) return true;
    const q = empleadoBusqueda.toLowerCase();
    return (e.nombre_completo || '').toLowerCase().includes(q) ||
           (e.Cedula || '').toLowerCase().includes(q) ||
           (e.Cargo || '').toLowerCase().includes(q);
  });

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
    const payload: any = editId ? { action, id: editId, ...form } : { action, ...form };
    if (!editId && form.codigo_emp > 0) payload.codigo_emp = form.codigo_emp;
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
    {
      field: 'codigo', headerName: 'Código', width: 100,
      cellRenderer: (p: any) => (
        <span
          onClick={() => abrirEditar(p.data)}
          title="Click para editar"
          style={{ color: '#7c3aed', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          {p.value}
        </span>
      ),
    },
    {
      field: 'nombre', headerName: 'Nombre', flex: 1.4, minWidth: 180,
      cellStyle: { fontWeight: 500 },
    },
    {
      field: 'id_remoto', headerName: 'Empleado', width: 150,
      cellRenderer: (p: any) => {
        if (!p.value) return <span style={{ color: '#d1d5db', fontSize: 11 }}>Sin vincular</span>;
        return (
          <span title={`CodigoEmp ${p.value} — ${p.data.nombre_empleado_original || ''}`}
            style={{
              background: '#dbeafe', color: '#1d4ed8',
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <Link size={11} /> Emp #{p.value}
          </span>
        );
      },
    },
    { field: 'email', headerName: 'Email', flex: 1.4, minWidth: 200 },
    {
      field: 'zona', headerName: 'Zona', width: 130,
      cellRenderer: (p: any) => p.value
        ? <span style={{ color: '#374151' }}>{p.value}</span>
        : <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>,
    },
    {
      field: 'can_edit_clients', headerName: 'Edita Cli.', width: 100,
      cellRenderer: (p: any) => (
        <span style={{
          background: p.value ? '#dcfce7' : '#f3f4f6',
          color: p.value ? '#16a34a' : '#6b7280',
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
        }}>
          {p.value ? 'Sí' : 'No'}
        </span>
      ),
    },
    {
      field: 'activo', headerName: 'Estado', width: 100,
      cellRenderer: (p: any) => (
        <button
          onClick={() => toggleActivo(p.data.id)}
          title={p.value ? 'Vendedor activo — click para desactivar' : 'Vendedor inactivo — click para activar'}
          style={{
            background: p.value ? '#dcfce7' : '#fee2e2',
            color: p.value ? '#16a34a' : '#dc2626',
            border: 'none', cursor: 'pointer',
            padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          {p.value ? 'Activo' : 'Inactivo'}
        </button>
      ),
    },
    {
      field: 'sincronizado', headerName: 'Sync', width: 90,
      cellRenderer: (p: any) => (
        <span style={{
          background: p.value ? '#dcfce7' : '#fef3c7',
          color: p.value ? '#16a34a' : '#92400e',
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {p.value ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
          {p.value ? 'OK' : 'Pend.'}
        </span>
      ),
    },
    {
      headerName: 'Acciones', width: 130, pinned: 'right' as any,
      sortable: false, filter: false,
      cellRenderer: (p: any) => {
        const btn = (color: string): React.CSSProperties => ({
          background: 'transparent', color, width: 30, height: 30,
          borderRadius: 6, border: `1.5px solid ${color}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        });
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: '100%' }}
            onMouseOver={(e) => {
              e.currentTarget.querySelectorAll('button').forEach(b => {
                b.addEventListener('mouseenter', () => { b.style.background = b.dataset.hc || ''; b.style.color = '#fff'; });
                b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; b.style.color = b.dataset.c || ''; });
              });
            }}
          >
            <button title="Editar vendedor"
              data-c="#7c3aed" data-hc="#7c3aed"
              onClick={() => abrirEditar(p.data)}
              style={btn('#7c3aed')}>
              <Pencil size={14} />
            </button>
            <button title="Asignar clientes al vendedor"
              data-c="#2563eb" data-hc="#2563eb"
              onClick={() => abrirAsignacion(p.data)}
              style={btn('#2563eb')}>
              <Users size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  // Totales para las tarjetas resumen
  const totalActivos = vendedores.filter(v => v.activo).length;
  const totalInactivos = vendedores.filter(v => !v.activo).length;
  const totalVinculados = vendedores.filter(v => (v as any).id_remoto).length;
  const totalPendientesSync = vendedores.filter(v => !v.sincronizado).length;

  return (
    <div>
      {/* Header con gradiente morado */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
        padding: '14px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            <Smartphone size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: 0.2 }}>
              Gestión de Vendedores
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
              Vendedores móviles sincronizados con la app
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={sincronizar} disabled={syncing}
            style={{
              height: 38, padding: '0 14px',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sync...' : 'Sincronizar'}
          </button>
          <button onClick={abrirPickerEmpleados}
            style={{
              height: 38, padding: '0 14px', background: '#fff', color: '#7c3aed',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
            <Link size={14} /> Habilitar empleado existente
          </button>
          <button onClick={abrirCrear}
            style={{
              height: 38, padding: '0 14px',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL VENDEDORES', value: String(vendedores.length), color: '#7c3aed', bg: '#f5f3ff', Icon: Smartphone },
          { label: 'ACTIVOS', value: String(totalActivos), color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle },
          { label: 'VINCULADOS EMP.', value: String(totalVinculados), color: '#2563eb', bg: '#eff6ff', Icon: Link },
          { label: 'POR SINCRONIZAR', value: String(totalPendientesSync), color: '#d97706', bg: '#fffbeb', Icon: AlertCircle },
        ].map((c, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            borderLeft: `4px solid ${c.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 }}>{c.value}</div>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <c.Icon size={18} color={c.color} strokeWidth={2.2} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabla estilo Inventario */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        marginBottom: 16, overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
          background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: '#f5f3ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Smartphone size={16} color="#7c3aed" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {vendedores.length} {vendedores.length === 1 ? 'vendedor' : 'vendedores'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {totalActivos} activos · {totalInactivos} inactivos
            </div>
          </div>
        </div>

        {vendedores.length === 0 && !loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, background: '#f3f4f6',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <UserPlus size={36} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Sin vendedores móviles todavía
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Vincula un empleado existente o crea uno nuevo para empezar.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={abrirPickerEmpleados}
                style={{
                  height: 36, padding: '0 18px', background: '#fff', color: '#7c3aed',
                  border: '1.5px solid #7c3aed', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <Link size={14} /> Habilitar empleado
              </button>
              <button onClick={abrirCrear}
                style={{
                  height: 36, padding: '0 18px', background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <Plus size={14} /> Nuevo vendedor
              </button>
            </div>
          </div>
        ) : (
          <div style={{ height: 460, padding: 8 }}>
            <AgGridReact
              theme={myTheme}
              rowData={vendedores}
              columnDefs={colDefs as any}
              localeText={AG_GRID_LOCALE_ES}
              pagination
              paginationPageSize={20}
              paginationPageSizeSelector={[25, 50, 100]}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              animateRows
              rowSelection={'single' as any}
              enableCellTextSelection
              suppressCellFocus
              overlayNoRowsTemplate='<span style="padding:10px;color:#6b7280">Sin vendedores</span>'
              getRowStyle={(p: any) => {
                if (!p.data?.activo) return { background: '#fef2f2', color: '#9ca3af' };
                return undefined;
              }}
            />
          </div>
        )}
      </div>

      {/* Modal ASIGNACIÓN de clientes al vendedor */}
      {asignVend && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAsignVend(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <Users size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    Asignar clientes a {asignVend.codigo} — {asignVend.nombre}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                    Marca los clientes que este vendedor puede ver en su app móvil
                  </p>
                </div>
              </div>
              <button onClick={() => setAsignVend(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* Barra búsqueda + contador */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                autoFocus
                placeholder="🔍 Buscar por nombre, NIT o código..."
                value={asignBusqueda}
                onChange={e => setAsignBusqueda(e.target.value)}
                style={{ flex: 1, height: 36, border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
              />
              <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                {asignados.size} de {asignClientes.length} asignados
              </div>
              <button
                onClick={() => setAsignados(new Set(asignClientesFiltrados.map(c => c.CodigoClien)))}
                style={{ height: 30, padding: '0 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                Marcar todos
              </button>
              <button
                onClick={() => setAsignados(new Set())}
                style={{ height: 30, padding: '0 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                Limpiar
              </button>
            </div>

            {/* Lista clientes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
              {asignLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <RefreshCw size={24} className="animate-spin" /> Cargando...
                </div>
              ) : asignClientesFiltrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Sin coincidencias
                </div>
              ) : (
                asignClientesFiltrados.map(c => {
                  const checked = asignados.has(c.CodigoClien);
                  return (
                    <label key={c.CodigoClien}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: checked ? '#f5f3ff' : 'transparent',
                        borderLeft: checked ? '3px solid #7c3aed' : '3px solid transparent',
                        marginBottom: 2,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = '#fafafa'; }}
                      onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAsignado(c.CodigoClien)}
                        style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
                      />
                      <div style={{
                        width: 32, height: 32, borderRadius: 16, background: checked ? '#7c3aed' : '#f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: checked ? '#fff' : '#6b7280', fontWeight: 700, fontSize: 12,
                      }}>
                        {(c.Razon_Social || 'X').substring(0, 1).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                          {c.Razon_Social || 'Sin nombre'}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          #{c.CodigoClien}
                          {c.Nit && ` · NIT ${c.Nit}`}
                          {c.Telefonos && c.Telefonos !== '0' && ` · Tel. ${c.Telefonos}`}
                        </div>
                      </div>
                      {c.CupoAutorizado > 0 && (
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                          Cupo ${Number(c.CupoAutorizado).toLocaleString('es-CO')}
                        </div>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setAsignVend(null)} disabled={asignGuardando}
                style={{ height: 38, padding: '0 18px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={guardarAsignacion} disabled={asignGuardando || asignLoading}
                style={{ height: 38, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}>
                <Save size={14} /> {asignGuardando ? 'Guardando...' : `Guardar asignación (${asignados.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal picker de empleados existentes */}
      {showEmpleadoPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowEmpleadoPicker(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Habilitar empleado como vendedor móvil</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Selecciona un empleado del sistema para vincularlo</p>
              </div>
              <button onClick={() => setShowEmpleadoPicker(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <input
              autoFocus
              placeholder="Buscar por nombre, cédula o cargo..."
              value={empleadoBusqueda}
              onChange={e => setEmpleadoBusqueda(e.target.value)}
              style={{ height: 36, border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px', fontSize: 13, marginTop: 12, marginBottom: 12 }}
            />
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
              {empleadosFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#6b7280', fontSize: 13 }}>
                  {empleadosDisponibles.length === 0
                    ? 'No hay empleados disponibles. Todos ya están habilitados como vendedores móviles.'
                    : 'Sin coincidencias.'}
                </div>
              ) : (
                empleadosFiltrados.map(emp => (
                  <div key={emp.CodigoEmp} onClick={() => seleccionarEmpleado(emp)}
                    style={{
                      padding: '10px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#faf5ff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, background: '#f5f3ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#7c3aed', fontWeight: 700, fontSize: 13,
                    }}>
                      {(emp.Nombres || 'X').substring(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        {emp.nombre_completo || `Empleado ${emp.CodigoEmp}`}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        #{emp.CodigoEmp}
                        {emp.Cedula && emp.Cedula !== '0' && ` · CC ${emp.Cedula}`}
                        {emp.Cargo && emp.Cargo !== '-' && ` · ${emp.Cargo}`}
                        {emp.Telefono && emp.Telefono !== '0' && ` · Tel. ${emp.Telefono}`}
                      </div>
                    </div>
                    <span style={{
                      color: '#7c3aed', fontSize: 11, fontWeight: 700,
                      padding: '4px 10px', border: '1px solid #ddd6fe', borderRadius: 6,
                    }}>
                      Habilitar →
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {editId ? 'Editar Vendedor' : (form.codigo_emp > 0 ? 'Habilitar Empleado como Vendedor' : 'Nuevo Vendedor')}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {form.codigo_emp > 0 && !editId && (
              <div style={{
                padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                marginBottom: 12, fontSize: 12, color: '#1d4ed8',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Link size={14} />
                Vinculando con empleado #{form.codigo_emp}. Sus ventas móviles quedarán asociadas a este empleado.
              </div>
            )}
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
