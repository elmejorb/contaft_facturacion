import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, Plus, Users, ShoppingCart, DollarSign,
  UserX, Pencil, Trash2, Eye, X, Save, BarChart3
} from 'lucide-react';
import { ClienteDetalle } from './ClienteDetalle';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/clientes/listar.php';
const API_OPC = 'http://localhost:80/conta-app-backend/api/clientes/opciones.php';
const API_RET = 'http://localhost:80/conta-app-backend/api/retenciones/listar.php';

interface Cliente {
  CodigoClien: number;
  Razon_Social: string;
  Nit: string;
  Identificacion: number | null;
  Telefonos: string;
  Direccion: string;
  Email: string | null;
  Whatsapp: string;
  CupoAutorizado: number;
  Fecha_Ingreso: string;
  FechaCumple: string | null;
  Nombres: string;
  Apellidos: string;
  Nombre_C: string;
  Apellidos_C: string;
  Telefonos_C: string;
  Direccion_C: string;
  Cargo_C: string;
  Termino: number;
  FacVenc: number;
  Preciocosto: number;
  id_documento: number;
  id_municipio: number | null;
  id_type_liability: number | null;
  id_type_organization: number | null;
  id_type_regime: number | null;
  Total_Ventas: number;
  Monto_Ventas: number;
  Ultima_Compra: string;
}

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function CustomersManagement() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [modal, setModal] = useState<'cerrado' | 'ver' | 'editar' | 'crear'>('cerrado');
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<any>({});
  const [opciones, setOpciones] = useState<any>({ liabilities: [], organizations: [], regimes: [], municipalities: [] });
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [retenciones, setRetenciones] = useState<any[]>([]);
  const [retencionesCli, setRetencionesCli] = useState<number[]>([]);
  const [retencionModo, setRetencionModo] = useState<'informativo' | 'gross_up'>('gross_up');
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) {
        setClientes(d.clientes);
        setResumen(d.resumen);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarOpciones = async () => {
    try {
      const r = await fetch(API_OPC);
      const d = await r.json();
      if (d.success) setOpciones(d);
    } catch (e) { console.error(e); }
  };

  const cargarRetenciones = async () => {
    try {
      const r = await fetch(`${API_RET}?activas=1`);
      const d = await r.json();
      if (d.success) setRetenciones(d.retenciones || []);
    } catch (e) {}
  };

  const cargarRetencionesCliente = async (codCli: number) => {
    try {
      const r = await fetch(`${API_RET}?cliente=${codCli}`);
      const d = await r.json();
      if (d.success) {
        setRetencionesCli(d.retenciones_aplicadas || []);
        setRetencionModo(d.modo || 'gross_up');
      }
    } catch (e) { setRetencionesCli([]); setRetencionModo('gross_up'); }
  };

  useEffect(() => { cargar(); cargarOpciones(); cargarRetenciones(); }, []);

  const abrirVer = (c: Cliente) => { setClienteActual(c); setModal('ver'); cargarRetencionesCliente(c.CodigoClien); };
  const abrirEditar = (c: Cliente) => { setClienteActual(c); setForm({ ...c }); setModal('editar'); cargarRetencionesCliente(c.CodigoClien); };
  const abrirCrear = () => {
    setClienteActual(null);
    setRetencionesCli([]);
    setRetencionModo('gross_up');
    setForm({
      Razon_Social: '', Nit: '', Identificacion: '', Telefonos: '', Direccion: '',
      Email: '', Whatsapp: '', CupoAutorizado: 0, FechaCumple: '',
      Nombres: '', Apellidos: '', Nombre_C: '', Apellidos_C: '',
      Telefonos_C: '', Direccion_C: '', Cargo_C: '', Termino: 0, FacVenc: 0, Preciocosto: 0,
      id_documento: 2, id_municipio: null, id_type_liability: 4, id_type_organization: 2, id_type_regime: 3
    });
    setModal('crear');
  };

  const guardar = async () => {
    if (!form.Razon_Social?.trim()) { setError('Razón social es requerida'); return; }
    setError('');
    try {
      const isEdit = modal === 'editar';
      const r = await fetch(API, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) {
        const codCli = d.CodigoClien || form.CodigoClien;
        if (codCli) {
          try {
            await fetch(API_RET, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'set_cliente', cliente: codCli, retenciones: retencionesCli, modo: retencionModo })
            });
          } catch (e) {}
        }
        setSuccess(d.message); setTimeout(() => setSuccess(''), 3000);
        setModal('cerrado'); cargar();
      } else { setError(d.message); }
    } catch (e) { setError('Error al guardar'); }
  };

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el cliente "${nombre}"?`)) return;
    try {
      const r = await fetch(`${API}?id=${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) { setSuccess(d.message); setTimeout(() => setSuccess(''), 3000); cargar(); }
      else { setError(d.message); }
    } catch (e) { setError('Error al eliminar'); }
  };

  const filtrados = clientes.filter(c => {
    const b = busqueda.toLowerCase();
    const matchBusqueda = !busqueda ||
      c.Razon_Social?.toLowerCase().includes(b) ||
      c.Nit?.includes(busqueda) ||
      c.Telefonos?.includes(busqueda) ||
      c.Email?.toLowerCase().includes(b);
    if (!matchBusqueda) return false;
    switch (filtro) {
      case 'con_ventas': return c.Total_Ventas > 0;
      case 'sin_ventas': return c.Total_Ventas === 0;
      case 'con_cupo': return c.CupoAutorizado > 0;
      default: return true;
    }
  });

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  // Cálculo DV (DIAN Colombia)
  const calcularDV = (nit: string): string => {
    const nums = nit.replace(/\D/g, '');
    if (!nums || nums.length < 3) return '-';
    const primos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    const digits = nums.split('').reverse().map(Number);
    let suma = 0;
    for (let i = 0; i < digits.length && i < primos.length; i++) {
      suma += digits[i] * primos[i];
    }
    const resto = suma % 11;
    if (resto === 0) return '0';
    if (resto === 1) return '1';
    return String(11 - resto);
  };

  const fmtNit = (v: string) => {
    const nums = (v || '').replace(/\D/g, '');
    if (!nums) return '';
    return parseInt(nums).toLocaleString('es-CO');
  };

  const nitInput = () => {
    const dv = calcularDV(form.Nit || '');
    return (
      <div>
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>NIT / CC</label>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="text"
            defaultValue={fmtNit(form.Nit)}
            onFocus={e => {
              const raw = (form.Nit || '').replace(/\D/g, '');
              e.target.value = raw;
              e.target.select();
            }}
            onBlur={e => {
              const raw = e.target.value.replace(/\D/g, '');
              set('Nit', raw);
              e.target.value = raw ? parseInt(raw).toLocaleString('es-CO') : '';
            }}
            onKeyDown={e => {
              const allowed = ['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
              if (!allowed.includes(e.key) && !e.ctrlKey) e.preventDefault();
            }}
            style={{
              flex: 1, height: 28, padding: '0 8px', border: '1px solid #d1d5db',
              borderRadius: 6, fontSize: 13, outline: 'none',
            }}
          />
          <div style={{
            width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 6,
            fontSize: 13, fontWeight: 700, color: '#7c3aed',
          }} title="Dígito de verificación">
            {dv}
          </div>
        </div>
      </div>
    );
  };

  const inp = (label: string, field: string, opts: any = {}) => (
    <div style={{ ...opts.containerStyle }}>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>{label}</label>
      <input
        type={opts.type || 'text'}
        value={form[field] ?? ''}
        onChange={e => set(field, e.target.value)}
        placeholder={opts.placeholder || ''}
        style={{
          width: '100%', height: 28, padding: '0 8px', border: '1px solid #d1d5db',
          borderRadius: 6, fontSize: 13, outline: 'none',
        }}
      />
    </div>
  );

  const sel = (label: string, field: string, options: any[], valKey: string, labelKey: string, opts: any = {}) => (
    <div style={{ ...opts.containerStyle }}>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>{label}</label>
      <select
        value={form[field] ?? ''}
        onChange={e => set(field, e.target.value ? parseInt(e.target.value) : null)}
        style={{ width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }}
      >
        <option value="">-- Seleccionar --</option>
        {options.map((o: any) => <option key={o[valKey]} value={o[valKey]}>{o[labelKey]}</option>)}
      </select>
    </div>
  );

  const chk = (label: string, field: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#374151' }}>
      <input
        type="checkbox"
        checked={!!form[field]}
        onChange={e => set(field, e.target.checked ? 1 : 0)}
        style={{ width: 14, height: 14, accentColor: '#7c3aed' }}
      />
      {label}
    </label>
  );

  const columnDefs: ColDef[] = [
    { headerName: 'Código', field: 'CodigoClien', width: 85, sortable: true },
    { headerName: 'Razón Social / Nombre', field: 'Razon_Social', flex: 1, minWidth: 200, sortable: true, filter: true },
    { headerName: 'NIT / CC', field: 'Nit', width: 110, sortable: true, filter: true },
    {
      headerName: 'Teléfono', field: 'Telefonos', width: 110,
      cellRenderer: (p: any) => {
        const v = p.value || '';
        if (!v || v === '0' || v === '-') return <span style={{ color: '#9ca3af' }}>-</span>;
        return <span>{v}</span>;
      }
    },
    {
      headerName: 'Ventas', field: 'Total_Ventas', width: 75, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ color: (p.value || 0) > 0 ? '#7c3aed' : '#9ca3af', fontWeight: 600 }}>{p.value || 0}</span>
    },
    {
      headerName: 'Monto Total', field: 'Monto_Ventas', width: 120, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v === 0 ? <span style={{ color: '#9ca3af' }}>-</span> : <span style={{ fontWeight: 600, color: '#16a34a' }}>{fmtMon(v)}</span>;
      }
    },
    {
      headerName: 'Últ. Compra', field: 'Ultima_Compra', width: 100, sortable: true,
      cellRenderer: (p: any) => !p.value ? <span style={{ color: '#9ca3af' }}>-</span> : <span>{new Date(p.value).toLocaleDateString('es-CO')}</span>
    },
    {
      headerName: 'Cupo', field: 'CupoAutorizado', width: 100, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v === 0 ? <span style={{ color: '#9ca3af' }}>-</span> : <span style={{ fontWeight: 600 }}>{fmtMon(v)}</span>;
      }
    },
    {
      headerName: 'Acciones', width: 120, sortable: false, filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
      cellRenderer: (p: any) => {
        const esGenerico = p.data.CodigoClien === 130500;
        return (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <button title="Detalle de movimientos" onClick={() => setDetalleId(p.data.CodigoClien)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              <BarChart3 size={15} color="#7c3aed" />
            </button>
            <button title="Ver datos" onClick={() => abrirVer(p.data)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              <Eye size={15} color="#3b82f6" />
            </button>
            <button title={esGenerico ? 'Cliente del sistema — no editable' : 'Editar'} disabled={esGenerico} onClick={() => !esGenerico && abrirEditar(p.data)}
              style={{ background: 'none', border: 'none', cursor: esGenerico ? 'not-allowed' : 'pointer', padding: 3, opacity: esGenerico ? 0.3 : 1 }}>
              <Pencil size={15} color="#f59e0b" />
            </button>
            <button title={esGenerico ? 'Cliente del sistema — no eliminable' : 'Eliminar'} disabled={esGenerico} onClick={() => !esGenerico && eliminar(p.data.CodigoClien, p.data.Razon_Social)}
              style={{ background: 'none', border: 'none', cursor: esGenerico ? 'not-allowed' : 'pointer', padding: 3, opacity: esGenerico ? 0.3 : 1 }}>
              <Trash2 size={15} color="#ef4444" />
            </button>
          </div>
        );
      }
    }
  ];

  const renderModal = () => {
    if (modal === 'cerrado') return null;
    const isView = modal === 'ver';
    const title = modal === 'crear' ? 'Nuevo Cliente' : modal === 'editar' ? 'Editar Cliente' : 'Detalle del Cliente';
    const c = isView ? clienteActual : form;

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setModal('cerrado')} />
        <div style={{
          position: 'relative', background: '#fff', borderRadius: 12, width: 680,
          maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}>
          {/* Header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
            <button onClick={() => setModal('cerrado')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          {error && <div style={{ margin: '10px 20px 0', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 12 }}>{error}</div>}

          <div style={{ padding: '14px 20px' }}>
            {isView ? (
              <div>
                <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <legend style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', padding: '0 6px' }}>Datos del Cliente</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '6px 10px', fontSize: 13 }}>
                    <div><span style={{ fontSize: 10, color: '#6b7280' }}>CÓDIGO</span><div style={{ fontWeight: 600 }}>{c?.CodigoClien}</div></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 10, color: '#6b7280' }}>RAZÓN SOCIAL</span><div style={{ fontWeight: 600 }}>{c?.Razon_Social}</div></div>
                    <div><span style={{ fontSize: 10, color: '#6b7280' }}>NIT/CC</span><div>{c?.Nit || '-'}</div></div>
                    <div><span style={{ fontSize: 10, color: '#6b7280' }}>TELÉFONO</span><div>{c?.Telefonos || '-'}</div></div>
                    <div><span style={{ fontSize: 10, color: '#6b7280' }}>WHATSAPP</span><div>{c?.Whatsapp || '-'}</div></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 10, color: '#6b7280' }}>DIRECCIÓN</span><div>{c?.Direccion || '-'}</div></div>
                    <div><span style={{ fontSize: 10, color: '#6b7280' }}>EMAIL</span><div>{c?.Email || '-'}</div></div>
                  </div>
                </fieldset>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
                    <legend style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', padding: '0 6px' }}>Ventas</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
                      <div><span style={{ fontSize: 10, color: '#6b7280' }}>FACTURAS</span><div style={{ fontWeight: 700, fontSize: 18, color: '#7c3aed' }}>{c?.Total_Ventas || 0}</div></div>
                      <div><span style={{ fontSize: 10, color: '#6b7280' }}>MONTO</span><div style={{ fontWeight: 700, fontSize: 16, color: '#16a34a' }}>{fmtMon(c?.Monto_Ventas || 0)}</div></div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 10, color: '#6b7280' }}>ÚLTIMA COMPRA</span><div>{c?.Ultima_Compra ? new Date(c.Ultima_Compra).toLocaleDateString('es-CO') : 'Sin compras'}</div></div>
                    </div>
                  </fieldset>
                  <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
                    <legend style={{ fontSize: 11, fontWeight: 700, color: '#d97706', padding: '0 6px' }}>Contacto</legend>
                    <div style={{ fontSize: 13 }}>
                      <div><span style={{ fontSize: 10, color: '#6b7280' }}>NOMBRE</span><div>{c?.Nombre_C} {c?.Apellidos_C}</div></div>
                      <div style={{ marginTop: 4 }}><span style={{ fontSize: 10, color: '#6b7280' }}>CARGO</span><div>{c?.Cargo_C || '-'}</div></div>
                      <div style={{ marginTop: 4 }}><span style={{ fontSize: 10, color: '#6b7280' }}>TELÉFONO</span><div>{c?.Telefonos_C || '-'}</div></div>
                    </div>
                  </fieldset>
                </div>
              </div>
            ) : (
              <div>
                <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <legend style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', padding: '0 6px' }}>Datos del Cliente</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {inp('Razón Social *', 'Razon_Social', { containerStyle: { gridColumn: 'span 3' } })}
                    {nitInput()}
                    {inp('Teléfono', 'Telefonos')}
                    {inp('WhatsApp', 'Whatsapp')}
                    {inp('Dirección', 'Direccion', { containerStyle: { gridColumn: 'span 2' } })}
                    {inp('Email', 'Email')}
                    {inp('Cupo Autorizado', 'CupoAutorizado')}
                    {inp('Término (días)', 'Termino')}
                    {inp('Cumpleaños', 'FechaCumple', { type: 'date' })}
                  </div>
                </fieldset>
                <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <legend style={{ fontSize: 11, fontWeight: 700, color: '#d97706', padding: '0 6px' }}>Persona de Contacto</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {inp('Nombres', 'Nombre_C')}
                    {inp('Apellidos', 'Apellidos_C')}
                    {inp('Cargo', 'Cargo_C')}
                    {inp('Teléfono', 'Telefonos_C')}
                    {inp('Dirección', 'Direccion_C', { containerStyle: { gridColumn: 'span 2' } })}
                  </div>
                </fieldset>
                <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <legend style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', padding: '0 6px' }}>Datos Fiscales</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {sel('Tipo Responsabilidad', 'id_type_liability', opciones.liabilities, 'id', 'name')}
                    {sel('Tipo Adquiriente', 'id_type_organization', opciones.organizations, 'id', 'name')}
                    {sel('Régimen Tributario', 'id_type_regime', opciones.regimes, 'id', 'name')}
                    {sel('Municipio', 'id_municipio', opciones.municipalities, 'id', 'name', { containerStyle: { gridColumn: 'span 3' } })}
                  </div>
                </fieldset>
                <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
                  <legend style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', padding: '0 6px' }}>Opciones de Facturación</legend>
                  <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
                    {chk('Facturar con vencimientos', 'FacVenc')}
                    {chk('Facturar a precio costo', 'Preciocosto')}
                  </div>
                </fieldset>

                <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                  <legend style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', padding: '0 6px' }}>Retenciones que me aplica este cliente</legend>
                  {retenciones.length === 0 ? (
                    <div style={{ padding: 8, fontSize: 11, color: '#9ca3af' }}>No hay retenciones activas. Configúralas en Configuración → Retenciones.</div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '4px 0' }}>
                        {retenciones.map((r: any) => {
                          const checked = retencionesCli.includes(r.Id_Retencion);
                          return (
                            <label key={r.Id_Retencion}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, cursor: isView ? 'default' : 'pointer', border: `1px solid ${checked ? '#dc2626' : '#e5e7eb'}`, background: checked ? '#fef2f2' : '#fff', fontSize: 12 }}>
                              <input type="checkbox" checked={checked} disabled={isView}
                                onChange={e => {
                                  if (e.target.checked) setRetencionesCli(prev => [...prev, r.Id_Retencion]);
                                  else setRetencionesCli(prev => prev.filter(id => id !== r.Id_Retencion));
                                }}
                                style={{ accentColor: '#dc2626', width: 14, height: 14 }} />
                              <span style={{ flex: 1, fontWeight: checked ? 600 : 400 }}>{r.Nombre}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{parseFloat(r.Porcentaje).toFixed(2)}%</span>
                            </label>
                          );
                        })}
                      </div>
                      {retencionesCli.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>MODO DE APLICACIÓN</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[
                              { value: 'gross_up' as const, label: 'Gross-up', desc: 'Subir el subtotal para que, después de la retención, reciba el monto objetivo.' },
                              { value: 'informativo' as const, label: 'Informativo', desc: 'Solo mostrar la retención en la factura sin modificar totales.' },
                            ].map(opt => (
                              <label key={opt.value}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, cursor: isView ? 'default' : 'pointer', border: `2px solid ${retencionModo === opt.value ? '#dc2626' : '#e5e7eb'}`, background: retencionModo === opt.value ? '#fef2f2' : '#fff' }}>
                                <input type="radio" name="ret_modo" checked={retencionModo === opt.value} disabled={isView}
                                  onChange={() => setRetencionModo(opt.value)}
                                  style={{ accentColor: '#dc2626', marginRight: 6 }} />
                                <b style={{ fontSize: 12 }}>{opt.label}</b>
                                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </fieldset>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: '#fff' }}>
            <button onClick={() => setModal('cerrado')} style={{
              height: 30, padding: '0 14px', background: '#f3f4f6', color: '#374151',
              border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <X size={14} /> {isView ? 'Cerrar' : 'Cancelar'}
            </button>
            {!isView && (
              <button onClick={guardar} style={{
                height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Save size={14} /> Guardar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Clientes</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Gestión de clientes del sistema</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#16a34a', fontSize: 13 }}>{success}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Clientes', value: resumen.total || 0, icon: Users, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Con Ventas', value: resumen.con_ventas || 0, icon: ShoppingCart, bg: '#dcfce7', color: '#16a34a' },
          { label: 'Sin Ventas', value: resumen.sin_ventas || 0, icon: UserX, bg: '#fef3c7', color: '#d97706' },
          { label: 'Ventas Total', value: fmtMon(resumen.monto_total || 0), icon: DollarSign, bg: '#dbeafe', color: '#2563eb', isText: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: (s as any).isText ? 16 : 20, fontWeight: 700 }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ position: 'relative', flex: '0 0 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Buscar por nombre, NIT, teléfono..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 32, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>

        {[
          { id: 'todos', label: 'Todos' },
          { id: 'con_ventas', label: 'Con ventas' },
          { id: 'sin_ventas', label: 'Sin ventas' },
          { id: 'con_cupo', label: 'Con cupo' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
            border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
            background: filtro === f.id ? '#f3e8ff' : '#fff',
            color: filtro === f.id ? '#7c3aed' : '#374151',
            fontWeight: filtro === f.id ? 600 : 400,
          }}>
            {f.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button onClick={abrirCrear} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Plus size={14} /> Nuevo Cliente
        </button>
        <button onClick={cargar} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* AG Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 370px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filtrados}
            columnDefs={columnDefs}
            loading={loading}
            animateRows
            getRowId={p => String(p.data.CodigoClien)}
            rowHeight={36}
            headerHeight={36}
            defaultColDef={{ resizable: true }}
          />
        </div>
      </div>

      {renderModal()}
      {detalleId !== null && (
        <ClienteDetalle clienteId={detalleId} onClose={() => setDetalleId(null)} />
      )}
    </div>
  );
}
