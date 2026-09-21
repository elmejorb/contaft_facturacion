import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Smartphone, Plus, RefreshCw, Save, X, Eye, EyeOff, CheckCircle, AlertCircle, UserPlus, Link, Pencil, Users, Hash, Mail, Lock, Phone, CreditCard, MapPin, Shield, QrCode, Copy, MessageCircle, RotateCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';
import { useEntitlements } from '../hooks/useEntitlements';
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
  const { modulos: entitlements } = useEntitlements();
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

  // Modal de código para vincular vendedor (pareo con APK vía WhatsApp)
  const [showPairing, setShowPairing] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingData, setPairingData] = useState<{
    codigo_pairing: string;
    codigo_pairing_expira: string;
    token_api: string;
    nombre_empresa: string;
    nit: string;
  } | null>(null);

  const cargarPairing = async () => {
    setPairingLoading(true);
    try {
      // Consultamos el hub usando el token_api local — devuelve el codigo actual
      if (!config?.api_url || !config?.api_token_empresa) {
        toast.error('Configura primero URL y token en Configuración → Vendedores');
        setPairingLoading(false);
        return;
      }
      const r = await fetch(`${config.api_url.replace(/\/$/, '')}/api/empresa/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: config.api_token_empresa }),
      });
      const d = await r.json();
      if (d.error) { toast.error(d.mensaje || 'No se pudo obtener el código'); setPairingLoading(false); return; }
      setPairingData({
        codigo_pairing: d.codigo_pairing || '',
        codigo_pairing_expira: d.codigo_pairing_expira || '',
        token_api: d.token_api,
        nombre_empresa: d.nombre_empresa,
        nit: d.nit,
      });
    } catch (e) { toast.error('Error consultando el hub'); }
    setPairingLoading(false);
  };

  const abrirPairing = async () => {
    setShowPairing(true);
    setPairingData(null);
    await cargarPairing();
  };

  const renovarCodigoPairing = async () => {
    const ipc = (window as any).require?.('electron')?.ipcRenderer;
    if (!ipc) { toast.error('Solo disponible en la app de escritorio'); return; }
    if (!config?.api_url) { toast.error('Falta URL del hub en Configuración'); return; }
    setPairingLoading(true);
    const tid = toast.loading('Generando nuevo código…');
    try {
      const r = await ipc.invoke('empresas:renovarCodigoPairing', { apiUrlLumen: config.api_url });
      toast.dismiss(tid);
      if (r?.ok) {
        toast.success('Nuevo código generado');
        await cargarPairing();
      } else {
        const msg = r?.reason === 'modulo-no-activo-crm' ? 'Módulo no activo en su suscripción'
          : r?.reason === 'jwt-no-en-cache' ? 'Reinicie la app para refrescar el token del CRM'
          : (r?.message || 'No se pudo renovar el código');
        toast.error(msg, { duration: 7000 });
      }
    } catch (e: any) { toast.dismiss(tid); toast.error(e?.message || 'Error'); }
    setPairingLoading(false);
  };

  const textoWhatsApp = pairingData ? [
    `Bienvenido a *${pairingData.nombre_empresa}*.`,
    '',
    `Instala *Conta FT Móvil* y en la primera pantalla ingresa este código de empresa:`,
    ``,
    `  🔑  *${pairingData.codigo_pairing}*`,
    ``,
    `(o escanea el QR desde la misma app)`,
    ``,
    `Después inicia sesión con el email y contraseña que te dio el administrador.`,
  ].join('\n') : '';

  const copiarWhatsApp = () => {
    navigator.clipboard.writeText(textoWhatsApp).then(
      () => toast.success('Texto copiado — pégalo en WhatsApp'),
      () => toast.error('No se pudo copiar'),
    );
  };

  const abrirWhatsAppWeb = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(url, '_blank');
  };

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

  // Control de cupo del CRM: el módulo `vendedor_movil` viene con un `cantidad`
  // en el JWT firmado (ej. cliente contrató 2 vendedores). Bloqueamos crear más
  // de los permitidos. Los inactivos NO cuentan hacia el cupo — se pueden reactivar
  // solo si hay espacio libre.
  const cupoMax = entitlements?.vendedor_movil?.cantidad ?? null; // null = sin cupo definido (permitir)
  const vendedoresActivos = vendedores.filter(v => !!v.activo).length;
  const cupoLleno = cupoMax !== null && vendedoresActivos >= cupoMax;

  const validarCupo = (esNuevoActivo: boolean): boolean => {
    if (!esNuevoActivo) return true;             // se está creando inactivo → no consume cupo
    if (cupoMax === null) return true;            // sin cupo definido → libre
    if (vendedoresActivos < cupoMax) return true; // hay espacio
    toast.error(`Ya usaste tu cupo de ${cupoMax} vendedor(es). Contrata más en Innovación Digital o desactiva otro para liberar espacio.`, { duration: 8000 });
    return false;
  };

  const abrirCrear = () => {
    if (!validarCupo(true)) return;
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
    if (!validarCupo(true)) return;
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
    // Verificar cupo: aplica al crear activo o al reactivar un inactivo
    if (form.activo) {
      const yaEstabaActivoAntes = editId ? vendedores.find(v => v.id === editId)?.activo === 1 : false;
      const consumeCupo = !editId || !yaEstabaActivoAntes;
      if (consumeCupo && !validarCupo(true)) return;
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
    // Si se está pasando de inactivo → activo, verificar cupo primero
    const actual = vendedores.find(v => v.id === id);
    if (actual && !actual.activo && !validarCupo(true)) return;
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
          {/* Chip de cupo del CRM */}
          {cupoMax !== null && (
            <div title={`Tu suscripción permite ${cupoMax} vendedor(es) activo(s)`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: cupoLleno ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.18)',
                border: `1px solid ${cupoLleno ? 'rgba(239, 68, 68, 0.55)' : 'rgba(255, 255, 255, 0.35)'}`,
                borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
              }}>
              <Users size={13} />
              {vendedoresActivos} / {cupoMax}
              {cupoLleno && <span style={{ marginLeft: 3 }}>· lleno</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={abrirPairing}
            title="Genera un código para vincular la app de un vendedor con esta empresa (compartir por WhatsApp)"
            style={{
              height: 38, padding: '0 14px',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <QrCode size={14} /> Código empresa
          </button>
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
            disabled={cupoLleno}
            title={cupoLleno ? `Cupo lleno (${cupoMax} vendedores). Desactiva uno o contrata más en Innovación Digital.` : ''}
            style={{
              height: 38, padding: '0 14px', background: '#fff', color: cupoLleno ? '#9ca3af' : '#7c3aed',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: cupoLleno ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              opacity: cupoLleno ? 0.55 : 1,
            }}>
            <Link size={14} /> Habilitar empleado existente
          </button>
          <button onClick={abrirCrear}
            disabled={cupoLleno}
            title={cupoLleno ? `Cupo lleno (${cupoMax} vendedores). Desactiva uno o contrata más en Innovación Digital.` : ''}
            style={{
              height: 38, padding: '0 14px',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: cupoLleno ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: cupoLleno ? 0.5 : 1,
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

      {showModal && (() => {
        const modoEdit = !!editId;
        const modoEmpleado = form.codigo_emp > 0 && !editId;
        const titulo = modoEdit ? 'Editar Vendedor' : (modoEmpleado ? 'Habilitar Empleado como Vendedor' : 'Nuevo Vendedor');
        const subtitulo = modoEdit
          ? 'Actualiza los datos y permisos del vendedor'
          : (modoEmpleado ? `Vinculando con empleado #${form.codigo_emp}` : 'Crea un usuario para la app móvil');
        const inputStyle: React.CSSProperties = {
          height: 34, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13, width: '100%',
          background: '#fff', color: '#111827', outline: 'none', boxSizing: 'border-box',
        };
        const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 5 };
        const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
        const toggleRow = (checked: boolean, onChange: (v: boolean) => void, titleText: string, descText: string, icon: React.ReactNode) => (
          <label
            onClick={() => onChange(!checked)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              border: `2px solid ${checked ? '#7c3aed' : '#e5e7eb'}`,
              background: checked ? '#faf5ff' : '#fff',
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
            }}>
            <div style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
              background: checked ? '#7c3aed' : '#d1d5db', transition: 'background 0.15s',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: checked ? '#5b21b6' : '#374151' }}>
                {icon}{titleText}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{descText}</div>
            </div>
          </label>
        );

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, width: 540, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              {/* Header con acento morado */}
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                padding: '16px 20px', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {modoEmpleado ? <Link size={20} /> : (modoEdit ? <Pencil size={18} /> : <UserPlus size={20} />)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{titulo}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{subtitulo}</div>
                </div>
                <button onClick={() => setShowModal(false)}
                  style={{ border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Cerrar">
                  <X size={16} />
                </button>
              </div>

              {/* Cuerpo */}
              <div style={{ padding: '18px 20px', maxHeight: 'calc(92vh - 140px)', overflowY: 'auto' }}>
                {modoEmpleado && (
                  <div style={{
                    padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                    marginBottom: 14, fontSize: 11.5, color: '#1d4ed8',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <Link size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>Sus ventas móviles quedarán asociadas al empleado <b>#{form.codigo_emp}</b>.</span>
                  </div>
                )}

                {/* Fila 1: Código + Zona */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}><Hash size={11} />Código</label>
                    <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}><MapPin size={11} />Zona</label>
                    <input value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))} placeholder="p. ej. Cali Norte" style={inputStyle} />
                  </div>
                </div>

                {/* Fila 2: Nombre completo (ancho completo) */}
                <div style={{ ...fieldWrap, marginBottom: 12 }}>
                  <label style={labelStyle}><UserPlus size={11} />Nombre completo</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombres y apellidos" style={inputStyle} autoFocus />
                </div>

                {/* Sección Login */}
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                    Acceso a la app móvil
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={fieldWrap}>
                      <label style={labelStyle}><Mail size={11} />Email</label>
                      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendedor@empresa.com" style={inputStyle} />
                    </div>
                    <div style={fieldWrap}>
                      <label style={labelStyle}><Lock size={11} />{modoEdit ? 'Nueva contraseña' : 'Contraseña'}</label>
                      <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modoEdit ? 'dejar vacío = no cambiar' : 'mínimo 6 caracteres'} style={inputStyle} />
                    </div>
                  </div>
                </div>

                {/* Fila: Teléfono + Cédula */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}><Phone size={11} />Teléfono</label>
                    <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}><CreditCard size={11} />Cédula</label>
                    <input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                {/* Permisos con toggles bonitos */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Shield size={12} />Permisos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {toggleRow(
                    !!form.can_edit_clients,
                    (v) => setForm(f => ({ ...f, can_edit_clients: v })),
                    'Puede editar clientes',
                    'Actualizar teléfono, dirección o GPS desde la app',
                    <Pencil size={12} />,
                  )}
                  {toggleRow(
                    !!form.activo,
                    (v) => setForm(f => ({ ...f, activo: v })),
                    'Vendedor activo',
                    'Si se desactiva, no podrá iniciar sesión en la app',
                    <CheckCircle size={12} />,
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ height: 36, padding: '0 18px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Cancelar
                </button>
                <button onClick={guardar}
                  style={{ height: 36, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)' }}>
                  <Save size={14} />{modoEdit ? 'Guardar cambios' : 'Crear vendedor'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal código para vincular vendedor (pareo APK vía WhatsApp) */}
      {showPairing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 560, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Código de vinculación</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                  Comparte por WhatsApp al vendedor para que enlace su app con tu empresa
                </div>
              </div>
              <button onClick={() => setShowPairing(false)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Cerrar">
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: 20, maxHeight: 'calc(92vh - 140px)', overflowY: 'auto' }}>
              {pairingLoading && !pairingData && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>
                  <RefreshCw size={18} className="animate-spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                  Cargando…
                </div>
              )}
              {pairingData && (
                <>
                  {/* Grid: QR + Código corto */}
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, marginBottom: 16 }}>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QRCodeSVG value={pairingData.token_api} size={156} level="M" bgColor="#f9fafb" fgColor="#1f2937" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        Código empresa
                      </div>
                      <div style={{
                        fontSize: 32, fontWeight: 800, color: '#5b21b6', letterSpacing: 2, fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        padding: '10px 14px', background: '#faf5ff', border: '2px dashed #c4b5fd', borderRadius: 10, textAlign: 'center', userSelect: 'all',
                      }}>
                        {pairingData.codigo_pairing || '—'}
                      </div>
                      {pairingData.codigo_pairing_expira && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                          Expira: <b style={{ color: '#374151' }}>{new Date(pairingData.codigo_pairing_expira).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        Empresa: <b>{pairingData.nombre_empresa}</b> · NIT {pairingData.nit}
                      </div>
                    </div>
                  </div>

                  {/* Instrucciones para el vendedor */}
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Smartphone size={13} />¿Cómo lo usa el vendedor?
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                      <li>Instala <b>Conta FT Móvil</b> en su celular.</li>
                      <li>En la primera pantalla, ingresa el código <b>{pairingData.codigo_pairing || '—'}</b> (o escanea el QR).</li>
                      <li>Luego entra con el <b>email + contraseña</b> que le diste al crear su vendedor.</li>
                    </ol>
                  </div>

                  {/* Preview texto WhatsApp */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                    Mensaje listo para WhatsApp
                  </div>
                  <textarea
                    readOnly
                    value={textoWhatsApp}
                    style={{
                      width: '100%', minHeight: 130, padding: 10, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      border: '1px solid #d1d5db', borderRadius: 8, background: '#f9fafb', color: '#374151', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={renovarCodigoPairing} disabled={pairingLoading}
                title="Genera un código nuevo (invalida el anterior)"
                style={{ height: 36, padding: '0 14px', background: '#fff', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RotateCw size={13} /> Generar nuevo código
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copiarWhatsApp} disabled={!pairingData}
                  style={{ height: 36, padding: '0 14px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={13} /> Copiar mensaje
                </button>
                <button onClick={abrirWhatsAppWeb} disabled={!pairingData}
                  style={{ height: 36, padding: '0 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)' }}>
                  <MessageCircle size={13} /> Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
