import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from 'ag-grid-community';
import { Users, Plus, X, DollarSign, Edit2, UserMinus, UserPlus, FileText, CreditCard, BookOpen, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';
import { imprimirDesprendibleNomina } from './DesprendibleNomina';

ModuleRegistry.registerModules([AllCommunityModule]);

const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff', headerTextColor: '#6b21a8', headerFontSize: 12, headerFontWeight: 600,
  fontSize: 12, rowBorder: { color: '#f3f4f6', width: 1 }, borderColor: '#e5e7eb', borderRadius: 8,
  rowHoverColor: '#faf5ff', selectedRowBackgroundColor: '#f3e8ff', spacing: 6,
});

const API = 'http://localhost:80/conta-app-backend/api/nomina';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Empleado {
  Id_Empleado: number; Nombre: string; Identificacion: string; Cargo: string;
  Salario: number; Tipo_Pago: string; Fecha_Ingreso: string | null;
  Telefono: string; Direccion: string; Email: string; Observacion: string;
  Estado: string; Fecha_Retiro: string | null; saldo_actual: number;
}

export function NominaManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'empleados' | 'nomina'>('empleados');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [loading, setLoading] = useState(false);

  // Modales
  const [editEmp, setEditEmp] = useState<Partial<Empleado> | null>(null);
  const [anticipoEmp, setAnticipoEmp] = useState<Empleado | null>(null);
  const [prestamoEmp, setPrestamoEmp] = useState<Empleado | null>(null);
  const [kardexEmp, setKardexEmp] = useState<Empleado | null>(null);
  const [liquidarEmp, setLiquidarEmp] = useState<Empleado | null>(null);

  // Nómina listado
  const [nominas, setNominas] = useState<any[]>([]);
  const [desde, setDesde] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  const cargarEmpleados = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/empleados.php?estado=${filtroEstado}&q=${encodeURIComponent(filtroTexto)}`);
      const d = await r.json();
      if (d.success) setEmpleados(d.empleados);
    } catch (e) { toast.error('Error cargando empleados'); }
    setLoading(false);
  };

  const cargarNominas = async () => {
    try {
      const r = await fetch(`${API}/liquidar.php?listar=1&desde=${desde}&hasta=${hasta}`);
      const d = await r.json();
      if (d.success) setNominas(d.nominas);
    } catch (e) { toast.error('Error cargando nóminas'); }
  };

  useEffect(() => { if (tab === 'empleados') cargarEmpleados(); }, [tab, filtroEstado, filtroTexto]);
  useEffect(() => { if (tab === 'nomina') cargarNominas(); }, [tab, desde, hasta]);

  const retirar = async (emp: Empleado) => {
    if (!confirm(`¿Retirar a ${emp.Nombre}?`)) return;
    const r = await fetch(`${API}/empleados.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retirar', id: emp.Id_Empleado })
    });
    const d = await r.json();
    if (d.success) { toast.success(d.message); cargarEmpleados(); }
    else toast.error(d.message);
  };

  const reactivar = async (emp: Empleado) => {
    const r = await fetch(`${API}/empleados.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reactivar', id: emp.Id_Empleado })
    });
    const d = await r.json();
    if (d.success) { toast.success(d.message); cargarEmpleados(); }
    else toast.error(d.message);
  };

  const colsEmpleados: ColDef[] = [
    { headerName: 'Nombre', field: 'Nombre', flex: 1, minWidth: 180 },
    { headerName: 'Identificación', field: 'Identificacion', width: 130 },
    { headerName: 'Cargo', field: 'Cargo', width: 150 },
    { headerName: 'Salario', field: 'Salario', width: 110, cellRenderer: (p: any) => fmtMon(parseFloat(p.value) || 0), cellStyle: { textAlign: 'right' } },
    { headerName: 'Pago', field: 'Tipo_Pago', width: 90 },
    { headerName: 'Saldo', field: 'saldo_actual', width: 110,
      cellRenderer: (p: any) => {
        const v = parseFloat(p.value) || 0;
        if (v === 0) return <span style={{ color: '#16a34a' }}>Al día</span>;
        return <span style={{ color: '#dc2626', fontWeight: 700 }}>{fmtMon(v)}</span>;
      },
      cellStyle: { textAlign: 'right' } },
    { headerName: 'Estado', field: 'Estado', width: 90, cellRenderer: (p: any) =>
      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
        background: p.value === 'activo' ? '#dcfce7' : '#f3f4f6',
        color: p.value === 'activo' ? '#16a34a' : '#6b7280' }}>{p.value}</span> },
    { headerName: 'Acciones', width: 240, sortable: false, cellRenderer: (p: any) => (
      <div style={{ display: 'flex', gap: 3 }}>
        {p.data.Estado === 'activo' && <>
          <button title="Dar anticipo" onClick={() => setAnticipoEmp(p.data)}
            style={btnMini('#f59e0b')}><DollarSign size={11} /></button>
          <button title="Dar préstamo" onClick={() => setPrestamoEmp(p.data)}
            style={btnMini('#2563eb')}><CreditCard size={11} /></button>
          <button title="Liquidar nómina" onClick={() => setLiquidarEmp(p.data)}
            style={btnMini('#16a34a')}><FileText size={11} /></button>
        </>}
        <button title="Ver kardex" onClick={() => setKardexEmp(p.data)}
          style={btnMini('#7c3aed')}><BookOpen size={11} /></button>
        <button title="Editar" onClick={() => setEditEmp(p.data)}
          style={btnMini('#6b7280')}><Edit2 size={11} /></button>
        {p.data.Estado === 'activo'
          ? <button title="Retirar" onClick={() => retirar(p.data)} style={btnMini('#dc2626')}><UserMinus size={11} /></button>
          : <button title="Reactivar" onClick={() => reactivar(p.data)} style={btnMini('#16a34a')}><UserPlus size={11} /></button>}
      </div>
    )},
  ];

  const colsNominas: ColDef[] = [
    { headerName: '#', field: 'Id_Nomina', width: 60 },
    { headerName: 'Fecha', field: 'Fecha_Pago', width: 110,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Empleado', field: 'NombreEmpleado', flex: 1, minWidth: 160 },
    { headerName: 'Periodo', width: 180, cellRenderer: (p: any) =>
      `${new Date(p.data.Periodo_Inicio).toLocaleDateString('es-CO')} — ${new Date(p.data.Periodo_Fin).toLocaleDateString('es-CO')}` },
    { headerName: 'Devengado', field: 'Total_Devengado', width: 110,
      cellRenderer: (p: any) => fmtMon(parseFloat(p.value) || 0), cellStyle: { textAlign: 'right' } },
    { headerName: 'Deducción', field: 'Total_Deducciones', width: 110,
      cellRenderer: (p: any) => fmtMon(parseFloat(p.value) || 0), cellStyle: { textAlign: 'right', color: '#dc2626' } },
    { headerName: 'Neto', field: 'Neto', width: 120,
      cellRenderer: (p: any) => <b>{fmtMon(parseFloat(p.value) || 0)}</b>, cellStyle: { textAlign: 'right' } },
    { headerName: 'Origen', field: 'Origen_Pago', width: 110 },
    { headerName: 'Estado', field: 'Estado', width: 90, cellRenderer: (p: any) =>
      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
        background: p.value === 'pagada' ? '#dcfce7' : '#fee2e2',
        color: p.value === 'pagada' ? '#16a34a' : '#dc2626' }}>{p.value}</span> },
    { headerName: '', width: 60, sortable: false, cellRenderer: (p: any) =>
      <button title="Imprimir desprendible" onClick={() => imprimirDesprendible(p.data.Id_Nomina)}
        style={btnMini('#7c3aed')}><Printer size={11} /></button> },
  ];

  const imprimirDesprendible = async (idNomina: number) => {
    const r = await fetch(`${API}/liquidar.php?id=${idNomina}`);
    const d = await r.json();
    if (d.success) imprimirDesprendibleNomina(d.nomina);
    else toast.error(d.message);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Users size={20} color="#7c3aed" />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Nómina</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => setTab('empleados')}
          style={{ padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, borderBottom: tab === 'empleados' ? '2px solid #7c3aed' : '2px solid transparent',
            color: tab === 'empleados' ? '#7c3aed' : '#6b7280' }}>
          Empleados
        </button>
        <button onClick={() => setTab('nomina')}
          style={{ padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, borderBottom: tab === 'nomina' ? '2px solid #7c3aed' : '2px solid transparent',
            color: tab === 'nomina' ? '#7c3aed' : '#6b7280' }}>
          Liquidaciones
        </button>
      </div>

      {tab === 'empleados' && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="text" placeholder="Buscar nombre, identificación, cargo..." value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              style={{ height: 30, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, flex: 1, maxWidth: 300 }} />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ height: 30, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
              <option value="activo">Activos</option>
              <option value="retirado">Retirados</option>
              <option value="todos">Todos</option>
            </select>
            <button onClick={() => setEditEmp({ Tipo_Pago: 'quincenal', Estado: 'activo', Salario: 0 } as any)}
              style={btnPrimario}>
              <Plus size={14} /> Nuevo empleado
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 300 }}>
            <AgGridReact rowData={empleados} columnDefs={colsEmpleados} theme={myTheme}
              localeText={AG_GRID_LOCALE_ES} rowHeight={32} headerHeight={32}
              defaultColDef={{ resizable: true, sortable: true }} />
          </div>
        </>
      )}

      {tab === 'nomina' && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Desde:</span>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              style={{ height: 30, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>Hasta:</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              style={{ height: 30, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div style={{ flex: 1, minHeight: 300 }}>
            <AgGridReact rowData={nominas} columnDefs={colsNominas} theme={myTheme}
              localeText={AG_GRID_LOCALE_ES} rowHeight={32} headerHeight={32}
              defaultColDef={{ resizable: true, sortable: true }} />
          </div>
        </>
      )}

      {/* Modales */}
      {editEmp && <EmpleadoFormModal emp={editEmp} onClose={() => setEditEmp(null)} onSaved={() => { setEditEmp(null); cargarEmpleados(); }} />}
      {anticipoEmp && <AnticipoModal emp={anticipoEmp} userId={user?.id || 0} onClose={() => setAnticipoEmp(null)} onSaved={() => { setAnticipoEmp(null); cargarEmpleados(); }} />}
      {prestamoEmp && <PrestamoModal emp={prestamoEmp} userId={user?.id || 0} onClose={() => setPrestamoEmp(null)} onSaved={() => { setPrestamoEmp(null); cargarEmpleados(); }} />}
      {kardexEmp && <KardexModal emp={kardexEmp} onClose={() => setKardexEmp(null)} />}
      {liquidarEmp && <LiquidarModal emp={liquidarEmp} userId={user?.id || 0} onClose={() => setLiquidarEmp(null)} onSaved={() => { setLiquidarEmp(null); cargarEmpleados(); if (tab === 'nomina') cargarNominas(); }} />}
    </div>
  );
}

// =========== Estilos reutilizables ===========
const btnMini = (color: string) => ({ width: 24, height: 22, border: `1px solid ${color}`, borderRadius: 4, cursor: 'pointer', background: '#fff', color, display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties);
const btnPrimario = { height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties;
const modalBackdrop = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', borderRadius: 10, padding: 18, width: 440, maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const inpStyle = { width: '100%', height: 32, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 } as React.CSSProperties;
const lblStyle = { fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 3 } as React.CSSProperties;

// =========== Modal Empleado (crear/editar) ===========
function EmpleadoFormModal({ emp, onClose, onSaved }: any) {
  const [f, setF] = useState({ ...emp });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!f.Nombre?.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const body = {
      action: f.Id_Empleado ? 'actualizar' : 'crear',
      id: f.Id_Empleado,
      nombre: f.Nombre, identificacion: f.Identificacion, cargo: f.Cargo,
      salario: f.Salario, tipo_pago: f.Tipo_Pago, fecha_ingreso: f.Fecha_Ingreso,
      telefono: f.Telefono, direccion: f.Direccion, email: f.Email, observacion: f.Observacion,
    };
    const r = await fetch(`${API}/empleados.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { toast.success(d.message); onSaved(); }
    else toast.error(d.message);
  };

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{f.Id_Empleado ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lblStyle}>Nombre *</label>
            <input type="text" value={f.Nombre || ''} onChange={e => setF({ ...f, Nombre: e.target.value })} style={inpStyle} autoFocus />
          </div>
          <div>
            <label style={lblStyle}>Identificación</label>
            <input type="text" value={f.Identificacion || ''} onChange={e => setF({ ...f, Identificacion: e.target.value })} style={inpStyle} />
          </div>
          <div>
            <label style={lblStyle}>Cargo</label>
            <input type="text" value={f.Cargo || ''} onChange={e => setF({ ...f, Cargo: e.target.value })} style={inpStyle} />
          </div>
          <div>
            <label style={lblStyle}>Salario mensual</label>
            <input type="text" value={f.Salario || ''} onChange={e => setF({ ...f, Salario: e.target.value.replace(/[^0-9.]/g, '') })} style={inpStyle} />
          </div>
          <div>
            <label style={lblStyle}>Tipo de pago</label>
            <select value={f.Tipo_Pago || 'quincenal'} onChange={e => setF({ ...f, Tipo_Pago: e.target.value })} style={inpStyle}>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          <div>
            <label style={lblStyle}>Fecha de ingreso</label>
            <input type="date" value={f.Fecha_Ingreso || ''} onChange={e => setF({ ...f, Fecha_Ingreso: e.target.value })} style={inpStyle} />
          </div>
          <div>
            <label style={lblStyle}>Teléfono</label>
            <input type="text" value={f.Telefono || ''} onChange={e => setF({ ...f, Telefono: e.target.value })} style={inpStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lblStyle}>Dirección</label>
            <input type="text" value={f.Direccion || ''} onChange={e => setF({ ...f, Direccion: e.target.value })} style={inpStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lblStyle}>Email</label>
            <input type="email" value={f.Email || ''} onChange={e => setF({ ...f, Email: e.target.value })} style={inpStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lblStyle}>Observación</label>
            <textarea value={f.Observacion || ''} onChange={e => setF({ ...f, Observacion: e.target.value })}
              style={{ ...inpStyle, height: 60, padding: 8, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ ...btnPrimario, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ ...btnPrimario, background: '#16a34a' }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========== Modal Anticipo ===========
function AnticipoModal({ emp, userId, onClose, onSaved }: any) {
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [origen, setOrigen] = useState<'caja_operativa' | 'caja_general' | 'banco'>('caja_operativa');
  const [cajaInfo, setCajaInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Buscar caja operativa del usuario
    fetch(`http://localhost:80/conta-app-backend/api/caja/sesion.php?usuario=${userId}`)
      .then(r => r.json()).then(d => { if (d.success && d.abierta) setCajaInfo(d.sesion); });
  }, [userId]);

  const guardar = async () => {
    const v = parseFloat(valor);
    if (!v || v <= 0) { toast.error('Ingresa un valor válido'); return; }
    setSaving(true);
    const r = await fetch(`${API}/movimientos.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'anticipo', empleado_id: emp.Id_Empleado, valor: v,
        observacion: obs, origen_pago: origen,
        id_caja: cajaInfo?.Id_Caja || null, usuario_id: userId,
      })
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) { toast.success(d.message); onSaved(); }
    else toast.error(d.message);
  };

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>💰 Dar anticipo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ background: '#f3e8ff', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
          <b>{emp.Nombre}</b> — Saldo actual: <b style={{ color: emp.saldo_actual > 0 ? '#dc2626' : '#16a34a' }}>
            {emp.saldo_actual > 0 ? fmtMon(emp.saldo_actual) : 'Al día'}
          </b>
        </div>
        <label style={lblStyle}>Valor</label>
        <input type="text" value={valor} onChange={e => setValor(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0" autoFocus style={{ ...inpStyle, textAlign: 'right', fontSize: 18, height: 42, fontWeight: 700, marginBottom: 10 }} />
        <label style={lblStyle}>Concepto</label>
        <input type="text" value={obs} onChange={e => setObs(e.target.value)}
          placeholder="Almuerzo, pasajes, urgencia..." style={{ ...inpStyle, marginBottom: 10 }} />

        <label style={lblStyle}>Pagar desde</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {cajaInfo && <label style={{ display: 'flex', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'caja_operativa'} onChange={() => setOrigen('caja_operativa')} />
            Caja de {cajaInfo.NombreUsuario} (abierta — {cajaInfo.NombreCaja})
          </label>}
          <label style={{ display: 'flex', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'caja_general'} onChange={() => setOrigen('caja_general')} />
            Caja General
          </label>
          <label style={{ display: 'flex', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'banco'} onChange={() => setOrigen('banco')} />
            Transferencia / Banco
          </label>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 6, fontSize: 11, color: '#1e40af', marginBottom: 12 }}>
          ℹ Se descontará automáticamente de la próxima liquidación de nómina.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ ...btnPrimario, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ ...btnPrimario, background: '#f59e0b' }}>
            {saving ? 'Guardando...' : 'Entregar anticipo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========== Modal Préstamo ===========
function PrestamoModal({ emp, userId, onClose, onSaved }: any) {
  const [valor, setValor] = useState('');
  const [cuota, setCuota] = useState('');
  const [obs, setObs] = useState('');
  const [origen, setOrigen] = useState<'caja_operativa' | 'caja_general' | 'banco'>('caja_general');
  const [cajaInfo, setCajaInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:80/conta-app-backend/api/caja/sesion.php?usuario=${userId}`)
      .then(r => r.json()).then(d => { if (d.success && d.abierta) setCajaInfo(d.sesion); });
  }, [userId]);

  const guardar = async () => {
    const v = parseFloat(valor); const c = parseFloat(cuota);
    if (!v || v <= 0) { toast.error('Ingresa el valor del préstamo'); return; }
    if (!c || c <= 0) { toast.error('Ingresa la cuota mensual'); return; }
    setSaving(true);
    const r = await fetch(`${API}/movimientos.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prestamo', empleado_id: emp.Id_Empleado, valor: v,
        cuota_mensual: c, observacion: obs, origen_pago: origen,
        id_caja: cajaInfo?.Id_Caja || null, usuario_id: userId,
      })
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) { toast.success(d.message); onSaved(); }
    else toast.error(d.message);
  };

  const numCuotas = valor && cuota ? Math.ceil(parseFloat(valor) / parseFloat(cuota)) : 0;

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>💳 Dar préstamo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ background: '#dbeafe', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
          <b>{emp.Nombre}</b> — Salario: {fmtMon(emp.Salario)} ({emp.Tipo_Pago})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lblStyle}>Valor del préstamo</label>
            <input type="text" value={valor} onChange={e => setValor(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0" autoFocus style={{ ...inpStyle, textAlign: 'right' }} />
          </div>
          <div>
            <label style={lblStyle}>Cuota por pago</label>
            <input type="text" value={cuota} onChange={e => setCuota(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0" style={{ ...inpStyle, textAlign: 'right' }} />
          </div>
        </div>
        {numCuotas > 0 && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
          Se descontará en <b>{numCuotas}</b> {emp.Tipo_Pago === 'mensual' ? 'meses' : emp.Tipo_Pago === 'quincenal' ? 'quincenas' : 'semanas'}
        </div>}
        <label style={lblStyle}>Observación</label>
        <input type="text" value={obs} onChange={e => setObs(e.target.value)}
          placeholder="Compra moto, calamidad doméstica..." style={{ ...inpStyle, marginBottom: 12 }} />

        <label style={lblStyle}>Pagar desde</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <label style={{ display: 'flex', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'caja_general'} onChange={() => setOrigen('caja_general')} />
            Caja General (recomendado)
          </label>
          <label style={{ display: 'flex', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'banco'} onChange={() => setOrigen('banco')} />
            Transferencia / Banco
          </label>
          {cajaInfo && <label style={{ display: 'flex', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'caja_operativa'} onChange={() => setOrigen('caja_operativa')} />
            Caja de {cajaInfo.NombreUsuario}
          </label>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ ...btnPrimario, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ ...btnPrimario, background: '#2563eb' }}>
            {saving ? 'Guardando...' : 'Entregar préstamo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========== Modal Kardex ===========
function KardexModal({ emp, onClose }: any) {
  const [movs, setMovs] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/movimientos.php?empleado=${emp.Id_Empleado}`).then(r => r.json())
      .then(d => { if (d.success) setMovs(d.movimientos); });
  }, [emp.Id_Empleado]);

  const colorTipo: Record<string, string> = {
    anticipo: '#f59e0b', prestamo: '#2563eb', cargo: '#dc2626',
    abono: '#16a34a', desc_nomina: '#7c3aed',
  };

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, width: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>📒 Kardex — {emp.Nombre}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ background: '#f3e8ff', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>Saldo actual (lo que debe a la empresa):</span>
          <b style={{ color: emp.saldo_actual > 0 ? '#dc2626' : '#16a34a', fontSize: 15 }}>
            {emp.saldo_actual > 0 ? fmtMon(emp.saldo_actual) : 'Al día ✓'}
          </b>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 6 }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Tipo</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Observación</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Valor</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Sin movimientos</td></tr>}
            {movs.map(m => (
              <tr key={m.Id_Mov} style={{ borderBottom: '1px solid #f3f4f6', opacity: m.Estado === 'anulado' ? 0.5 : 1, textDecoration: m.Estado === 'anulado' ? 'line-through' : 'none' }}>
                <td style={{ padding: 6 }}>{new Date(m.Fecha).toLocaleDateString('es-CO')}</td>
                <td style={{ padding: 6 }}>
                  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: colorTipo[m.Tipo] || '#6b7280' }}>
                    {m.Tipo}
                  </span>
                </td>
                <td style={{ padding: 6 }}>{m.Observacion || '-'}</td>
                <td style={{ padding: 6, textAlign: 'right', fontWeight: 600, color: parseFloat(m.Valor) >= 0 ? '#dc2626' : '#16a34a' }}>
                  {parseFloat(m.Valor) >= 0 ? '+' : ''}{fmtMon(parseFloat(m.Valor))}
                </td>
                <td style={{ padding: 6, textAlign: 'right' }}>{fmtMon(parseFloat(m.Saldo_Acum))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========== Modal Liquidar Nómina ===========
function LiquidarModal({ emp, userId, onClose, onSaved }: any) {
  const [propuesta, setPropuesta] = useState<any>(null);
  const [salarioBase, setSalarioBase] = useState(0);
  const [horasExtras, setHorasExtras] = useState(0);
  const [bonificaciones, setBonificaciones] = useState(0);
  const [otros, setOtros] = useState(0);
  const [deducciones, setDeducciones] = useState<any[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [origen, setOrigen] = useState<'caja_general' | 'banco'>('caja_general');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/liquidar.php?empleado=${emp.Id_Empleado}`).then(r => r.json()).then(d => {
      if (!d.success) { toast.error(d.message); onClose(); return; }
      setPropuesta(d);
      setSalarioBase(d.propuesta.salario_base);
      setDeducciones(d.propuesta.deducciones);
      // Periodo según tipo de pago
      const hoy = new Date();
      let inicio = new Date();
      if (emp.Tipo_Pago === 'semanal') inicio.setDate(hoy.getDate() - 7);
      else if (emp.Tipo_Pago === 'quincenal') inicio.setDate(hoy.getDate() - 15);
      else inicio.setDate(1);
      setPeriodoInicio(inicio.toISOString().slice(0, 10));
      setPeriodoFin(hoy.toISOString().slice(0, 10));
    });
  }, [emp.Id_Empleado]);

  const totalDevengado = salarioBase + horasExtras + bonificaciones + otros;
  const totalDeducciones = deducciones.reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const neto = totalDevengado - totalDeducciones;

  const liquidar = async () => {
    if (neto < 0) { toast.error('El neto no puede ser negativo. Ajusta las deducciones.'); return; }
    setSaving(true);
    const r = await fetch(`${API}/liquidar.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'liquidar', empleado_id: emp.Id_Empleado,
        periodo_inicio: periodoInicio, periodo_fin: periodoFin, tipo_periodo: emp.Tipo_Pago,
        salario_base: salarioBase, horas_extras: horasExtras,
        bonificaciones: bonificaciones, otros_ingresos: otros,
        deducciones: deducciones.filter(d => parseFloat(d.valor || 0) > 0),
        origen_pago: origen, observacion: obs, usuario_id: userId,
      })
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) {
      toast.success(d.message);
      // Imprimir desprendible
      const rN = await fetch(`${API}/liquidar.php?id=${d.id_nomina}`);
      const dN = await rN.json();
      if (dN.success) imprimirDesprendibleNomina(dN.nomina);
      onSaved();
    } else toast.error(d.message);
  };

  if (!propuesta) return <div onClick={onClose} style={modalBackdrop}><div style={{ color: '#fff' }}>Cargando...</div></div>;

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, width: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>📋 Liquidar nómina — {emp.Nombre}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lblStyle}>Periodo desde</label>
            <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} style={inpStyle} />
          </div>
          <div>
            <label style={lblStyle}>Periodo hasta</label>
            <input type="date" value={periodoFin} onChange={e => setPeriodoFin(e.target.value)} style={inpStyle} />
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 6, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Devengado</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span>Salario base ({emp.Tipo_Pago})</span>
            <input type="text" value={salarioBase} onChange={e => setSalarioBase(parseFloat(e.target.value) || 0)} style={{ ...inpStyle, textAlign: 'right' }} />
            <span>Horas extras</span>
            <input type="text" value={horasExtras} onChange={e => setHorasExtras(parseFloat(e.target.value) || 0)} style={{ ...inpStyle, textAlign: 'right' }} />
            <span>Bonificaciones</span>
            <input type="text" value={bonificaciones} onChange={e => setBonificaciones(parseFloat(e.target.value) || 0)} style={{ ...inpStyle, textAlign: 'right' }} />
            <span>Otros ingresos</span>
            <input type="text" value={otros} onChange={e => setOtros(parseFloat(e.target.value) || 0)} style={{ ...inpStyle, textAlign: 'right' }} />
            <b>Total devengado</b>
            <b style={{ textAlign: 'right', color: '#16a34a' }}>{fmtMon(totalDevengado)}</b>
          </div>
        </div>

        {deducciones.length > 0 && <div style={{ background: '#fef2f2', padding: 10, borderRadius: 6, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Deducciones</div>
          {deducciones.map((d, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 6, alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
              <span>{d.concepto} <span style={{ color: '#9ca3af' }}>(saldo: {fmtMon(d.saldo_pendiente)})</span></span>
              <input type="text" value={d.valor} onChange={e => {
                const copy = [...deducciones];
                copy[i] = { ...copy[i], valor: parseFloat(e.target.value) || 0 };
                setDeducciones(copy);
              }} style={{ ...inpStyle, textAlign: 'right' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 6, borderTop: '1px solid #fecaca', paddingTop: 6, marginTop: 4 }}>
            <b style={{ fontSize: 12 }}>Total deducciones</b>
            <b style={{ textAlign: 'right', color: '#dc2626', fontSize: 12 }}>{fmtMon(totalDeducciones)}</b>
          </div>
        </div>}

        <div style={{ background: '#eff6ff', padding: 10, borderRadius: 6, marginBottom: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <b style={{ fontSize: 15 }}>NETO A PAGAR</b>
          <b style={{ fontSize: 18, textAlign: 'right', color: neto < 0 ? '#dc2626' : '#1e40af' }}>{fmtMon(neto)}</b>
        </div>

        <label style={lblStyle}>Pagar desde</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <label style={{ display: 'flex', gap: 4, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'caja_general'} onChange={() => setOrigen('caja_general')} /> Caja General
          </label>
          <label style={{ display: 'flex', gap: 4, fontSize: 13, cursor: 'pointer' }}>
            <input type="radio" checked={origen === 'banco'} onChange={() => setOrigen('banco')} /> Banco / Transferencia
          </label>
        </div>

        <label style={lblStyle}>Observación</label>
        <input type="text" value={obs} onChange={e => setObs(e.target.value)} style={{ ...inpStyle, marginBottom: 12 }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ ...btnPrimario, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
          <button onClick={liquidar} disabled={saving || neto < 0} style={{ ...btnPrimario, background: '#16a34a' }}>
            {saving ? 'Liquidando...' : 'Liquidar e imprimir'}
          </button>
        </div>
      </div>
    </div>
  );
}
