import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, FileText, CheckCircle, XCircle, AlertTriangle,
  Clock, Send, Eye, Printer, Globe, Mail, MailCheck, MailOpen, MailX
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DetalleDocElectronico } from './DetalleDocElectronico';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/facturacion-electronica';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function FacturacionElectronica() {
  const [docs, setDocs] = useState<any[]>([]);
  const [ventasDian, setVentasDian] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [anios, setAnios] = useState<any[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [resoluciones, setResoluciones] = useState<any[]>([]);
  const [showResoluciones, setShowResoluciones] = useState(false);
  const [detalle, setDetalle] = useState<any>(null);
  const [facturaDetalle, setFacturaDetalle] = useState<number | null>(null);
  const [showNotaCredito, setShowNotaCredito] = useState<any>(null);
  const [showNotaDebito, setShowNotaDebito] = useState<any>(null);
  const [ncMotivo, setNcMotivo] = useState('Devolución de mercancía');
  const [ndMotivo, setNdMotivo] = useState('Cobro de intereses');
  const [ndValor, setNdValor] = useState('');
  const [ndDescripcion, setNdDescripcion] = useState('');
  const [emailStatusMap, setEmailStatusMap] = useState<Record<string, any>>({});
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}/listar.php?anio=${anio}`;
      if (mes > 0) url += `&mes=${mes}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setDocs(d.documentos || []);
        setVentasDian(d.ventas_dian || []);
        setResumen(d.resumen || {});
        setAnios(d.anios || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarResoluciones = async () => {
    try {
      const r = await fetch(`${API}/enviar.php?resoluciones=1`);
      const d = await r.json();
      if (d.success) setResoluciones(d.data || []);
      else toast.error(d.message || 'Error al cargar resoluciones');
    } catch (e) { toast.error('Error de conexión'); }
  };

  const enviarDian = async (factN: number) => {
    toast.loading('Enviando a DIAN...', { id: 'dian-send' });
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'factura', factura_n: factN })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Factura enviada: ${d.message}`, { id: 'dian-send', duration: 6000 });
        cargar();
      } else {
        toast.error(`Error DIAN: ${d.message}`, { id: 'dian-send', duration: 10000 });
      }
    } catch (e) { toast.error('Error de conexión', { id: 'dian-send' }); }
  };

  const previewJSON = async (factN: number) => {
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', factura_n: factN })
      });
      const d = await r.json();
      if (d.success) setDetalle(d.preview);
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const enviarNotaCredito = async (factN: number, motivo: string) => {
    toast.loading('Enviando Nota Crédito a DIAN...', { id: 'nc-send' });
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nota_credito', factura_n: factN, motivo })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Nota Crédito enviada: ${d.message}`, { id: 'nc-send', duration: 6000 });
        setShowNotaCredito(null);
        cargar();
      } else {
        toast.error(`Error: ${d.message}`, { id: 'nc-send', duration: 10000 });
      }
    } catch (e) { toast.error('Error de conexión', { id: 'nc-send' }); }
  };

  const enviarNotaDebito = async (factN: number, motivo: string, valor: number, descripcion: string) => {
    toast.loading('Enviando Nota Débito a DIAN...', { id: 'nd-send' });
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nota_debito', factura_n: factN, motivo, valor, descripcion })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Nota Débito enviada: ${d.message}`, { id: 'nd-send', duration: 6000 });
        setShowNotaDebito(null);
        cargar();
      } else {
        toast.error(`Error: ${d.message}`, { id: 'nd-send', duration: 10000 });
      }
    } catch (e) { toast.error('Error de conexión', { id: 'nd-send' }); }
  };

  const enviarEmail = async (cufe: string, forceResend: boolean = false) => {
    toast.loading('Enviando correo...', { id: 'email-send' });
    try {
      const r = await fetch(`${API}/email.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cufe, force_resend: forceResend })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message, { id: 'email-send', duration: 5000 });
        cargar();
        cargarEmailStatus(true);
      } else if (d.code === 409) {
        // Ya fue enviado — preguntar si reenviar
        toast.dismiss('email-send');
        if (confirm('El correo ya fue enviado anteriormente. ¿Desea reenviarlo?')) {
          enviarEmail(cufe, true);
        }
        return;
      } else {
        toast.error(d.message, { id: 'email-send', duration: 8000 });
      }
    } catch (e) { toast.error('Error de conexión', { id: 'email-send' }); }
  };

  const cargarEmailStatus = async (force = false) => {
    try {
      const nocache = force ? '&nocache=1' : '';
      const url = `${API}/enviar.php?email_status=1&anio=${anio}${mes > 0 ? `&mes=${mes}` : ''}${nocache}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) setEmailStatusMap(d.data || {});
    } catch (e) { /* silencioso: el sobre cae al estado local */ }
  };

  useEffect(() => { cargar(); cargarEmailStatus(); }, [anio, mes]);

  const emailStatusStyle = (status: string | null, sent: boolean) => {
    switch (status) {
      case 'enviado':            return { color: '#2563eb', bg: '#eff6ff', icon: Send,      label: 'Enviado' };
      case 'entregado':          return { color: '#0891b2', bg: '#ecfeff', icon: MailCheck, label: 'Entregado' };
      case 'abierto':            return { color: '#16a34a', bg: '#f0fdf4', icon: MailOpen,  label: 'Abierto por el cliente' };
      case 'clic':               return { color: '#15803d', bg: '#dcfce7', icon: MailOpen,  label: 'Cliente hizo clic en enlace' };
      case 'diferido':           return { color: '#eab308', bg: '#fefce8', icon: Clock,     label: 'Diferido (reintentando)' };
      case 'rebote_temporal':    return { color: '#f59e0b', bg: '#fffbeb', icon: AlertTriangle, label: 'Rebote temporal' };
      case 'rebote_permanente':  return { color: '#dc2626', bg: '#fef2f2', icon: MailX,     label: 'Rebote permanente' };
      case 'bloqueado':          return { color: '#dc2626', bg: '#fef2f2', icon: MailX,     label: 'Bloqueado' };
      case 'spam':               return { color: '#dc2626', bg: '#fef2f2', icon: MailX,     label: 'Marcado como spam' };
      case 'invalido':           return { color: '#dc2626', bg: '#fef2f2', icon: MailX,     label: 'Email inválido' };
      case 'desuscrito':         return { color: '#f97316', bg: '#fff7ed', icon: MailX,     label: 'Cliente desuscrito' };
      default:
        if (sent) return { color: '#2563eb', bg: '#eff6ff', icon: Send, label: 'Enviado' };
        return      { color: '#d1d5db', bg: 'transparent', icon: Mail, label: 'No enviado' };
    }
  };

  const docsFiltrados = docs.filter(d => {
    if (filtroTipo !== 'todos' && d.status !== filtroTipo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (d.cliente_nombre || '').toLowerCase().includes(q)
        || String(d.number).includes(q)
        || (d.prefix + d.number).toLowerCase().includes(q)
        || (d.cufe || '').toLowerCase().includes(q);
    }
    return true;
  });

  const statusColors: Record<string, { bg: string; fg: string; icon: any }> = {
    'autorizado': { bg: '#dcfce7', fg: '#16a34a', icon: CheckCircle },
    'enviado': { bg: '#dbeafe', fg: '#2563eb', icon: Send },
    'rechazado': { bg: '#fee2e2', fg: '#dc2626', icon: XCircle },
    'anulada': { bg: '#f3f4f6', fg: '#6b7280', icon: XCircle },
    'pendiente': { bg: '#fef3c7', fg: '#d97706', icon: Clock },
  };

  const cols: ColDef[] = [
    {
      headerName: 'Nº', width: 110, sortable: true,
      valueGetter: (p: any) => `${p.data.prefix || ''}${p.data.number || ''}`,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span>
    },
    {
      headerName: 'Tipo', field: 'tipo_documento', width: 130, sortable: true,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = { 'Factura electrónica': '#2563eb', 'Nota crédito': '#d97706', 'Nota débito': '#dc2626' };
        return <span style={{ fontSize: 11, fontWeight: 600, color: colors[p.value] || '#374151' }}>{p.value || 'Factura'}</span>;
      }
    },
    { headerName: 'Fecha', field: 'fecha', width: 100, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-'
    },
    { headerName: 'Cliente', field: 'cliente_nombre', flex: 1, minWidth: 180, sortable: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 500 }}>{p.value || '-'}</span>
    },
    { headerName: 'NIT', field: 'customer_identification', width: 110, sortable: true },
    { headerName: 'Total', field: 'total', width: 120, sortable: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 700 }}>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Estado', field: 'status', width: 120, sortable: true,
      cellRenderer: (p: any) => {
        const s = statusColors[p.value] || statusColors['pendiente'];
        const Icon = s.icon;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg }}>
            <Icon size={13} /> {p.value}
          </span>
        );
      }
    },
    {
      headerName: 'CUFE', field: 'cufe', width: 100,
      cellRenderer: (p: any) => p.value
        ? <span title={p.value} style={{ fontSize: 10, color: '#6b7280', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(p.value); toast.success('CUFE copiado'); }}>{p.value.substring(0, 12)}...</span>
        : <span style={{ color: '#d1d5db' }}>-</span>
    },
    {
      headerName: 'Email', field: 'email_sent', width: 70, sortable: true,
      valueGetter: (p: any) => {
        const remote = p.data.cufe ? emailStatusMap[p.data.cufe] : null;
        return remote?.email_status || (p.data.email_sent ? 'enviado' : '');
      },
      cellRenderer: (p: any) => {
        const remote = p.data.cufe ? emailStatusMap[p.data.cufe] : null;
        const status = remote?.email_status || null;
        const sent = !!(remote?.email_sent ?? p.data.email_sent);
        const s = emailStatusStyle(status, sent);
        const Icon = s.icon;
        const title = s.label + (remote?.email_recipient ? ` — ${remote.email_recipient}` : '');
        return (
          <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 22, borderRadius: 6, background: s.bg, color: s.color }}>
            <Icon size={15} />
          </span>
        );
      }
    },
    {
      headerName: '', width: 110, sortable: false,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <button title="Ver detalle" onClick={() => setFacturaDetalle(p.data.id)}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={13} color="#6b7280" />
          </button>
          <button title="Imprimir PDF" onClick={() => window.open(`${API}/pdf.php?id=${p.data.id}`, 'PDF_Viewer', 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no')}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Printer size={13} color="#7c3aed" />
          </button>
          {p.data.cufe && (
            <button title={p.data.email_sent ? 'Reenviar correo' : 'Enviar correo al cliente'}
              onClick={async () => {
                // Buscar email del cliente
                try {
                  const r = await fetch(`http://localhost:80/conta-app-backend/api/clientes/listar.php?id=${p.data.cod_cliente}`);
                  const d = await r.json();
                  const email = d.success ? (d.cliente?.Email || '') : '';
                  if (!email || !email.includes('@')) {
                    toast.error(`El cliente no tiene un correo válido registrado. ${email ? 'Email actual: ' + email : 'Sin email.'}`);
                    return;
                  }
                  const msg = p.data.email_sent
                    ? `¿Reenviar correo de ${p.data.prefix}${p.data.number} a ${email}?`
                    : `¿Enviar factura ${p.data.prefix}${p.data.number} a ${email}?`;
                  if (confirm(msg)) enviarEmail(p.data.cufe);
                } catch (e) {
                  toast.error('Error al verificar email del cliente');
                }
              }}
              style={{ width: 26, height: 24, border: `1px solid ${p.data.email_sent ? '#16a34a' : '#2563eb'}`, borderRadius: 4, cursor: 'pointer', background: p.data.email_sent ? '#f0fdf4' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={13} color={p.data.email_sent ? '#16a34a' : '#2563eb'} />
            </button>
          )}
        </div>
      )
    }
  ];

  // Ventas no enviadas a DIAN
  const colsVentasPendientes: ColDef[] = [
    { headerName: 'Factura', field: 'Factura_N', width: 80, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Cliente', field: 'A_nombre', flex: 1, minWidth: 150 },
    { headerName: 'Total', field: 'Total', width: 110, cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{fmtMon(parseFloat(p.value) || 0)}</span> },
    { headerName: 'CUFE', field: 'cufe', width: 120, cellRenderer: (p: any) => p.value ? <span style={{ fontSize: 10, color: '#16a34a' }}>{p.value.substring(0, 15)}...</span> : '-' },
    {
      headerName: '', width: 130,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button title="Ver detalle" onClick={() => setFacturaDetalle(p.data.Factura_N)}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={13} color="#6b7280" />
          </button>
          {p.data.cufe ? (
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Enviada</span>
          ) : (
            <button onClick={() => enviarDian(p.data.Factura_N)}
              style={{ height: 24, padding: '0 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Send size={12} /> Enviar
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Facturación Electrónica</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Documentos electrónicos enviados a la DIAN</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { cargarResoluciones(); setShowResoluciones(true); }}
            style={{ height: 30, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Globe size={14} /> Resoluciones
          </button>
          <button onClick={() => { cargar(); cargarEmailStatus(true); }}
            style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Documentos', value: resumen.total || 0, icon: FileText, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Autorizados', value: resumen.autorizados || 0, icon: CheckCircle, bg: '#dcfce7', color: '#16a34a' },
          { label: 'Rechazados', value: resumen.rechazados || 0, icon: XCircle, bg: '#fee2e2', color: '#dc2626' },
          { label: 'Anulados', value: resumen.anulados || 0, icon: AlertTriangle, bg: '#fef3c7', color: '#d97706' },
          { label: 'Total Facturado', value: fmtMon(docsFiltrados.reduce((s, d) => s + (d.status === 'autorizado' ? (d.total || 0) : 0), 0)), icon: FileText, bg: '#dbeafe', color: '#2563eb', isText: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: (s as any).isText ? 16 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          {(anios.length > 0 ? anios : [new Date().getFullYear()]).map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value={0}>Todos los meses</option>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'autorizado', label: 'Autorizados' },
            { id: 'rechazado', label: 'Rechazados' },
            { id: 'anulada', label: 'Anulados' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltroTipo(f.id)}
              style={{ height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: filtroTipo === f.id ? '#7c3aed' : '#f3f4f6', color: filtroTipo === f.id ? '#fff' : '#6b7280' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar por cliente, número, CUFE..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ height: 28, paddingLeft: 28, width: 250, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {/* Grid documentos electrónicos */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Documentos Electrónicos ({docsFiltrados.length})
        </div>
        <div style={{ height: 350 }}>
          <AgGridReact
            ref={gridRef}
            rowData={docsFiltrados}
            columnDefs={cols}
            loading={loading}
            animateRows
            defaultColDef={{ resizable: true }}
            rowHeight={36}
            headerHeight={36}
            getRowId={p => String(p.data.id)}
          />
        </div>
      </div>

      {/* Ventas marcadas como DIAN */}
      {ventasDian.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Ventas enviadas a DIAN ({ventasDian.length})
          </div>
          <div style={{ height: 250 }}>
            <AgGridReact
              rowData={ventasDian}
              columnDefs={colsVentasPendientes}
              animateRows
              defaultColDef={{ resizable: true }}
              rowHeight={34}
              headerHeight={34}
              getRowId={p => String(p.data.Factura_N)}
            />
          </div>
        </div>
      )}

      {/* Modal resoluciones */}
      {showResoluciones && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowResoluciones(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 600, maxHeight: '70vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Resoluciones DIAN</span>
              <button onClick={() => setShowResoluciones(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            {resoluciones.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af' }}>Cargando...</p>
            ) : resoluciones.map((r: any) => (
              <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10, background: r.active ? '#f0fdf4' : '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: '#7c3aed' }}>{r.prefix} — {r.type_document_name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: r.active ? '#dcfce7' : '#fee2e2', color: r.active ? '#16a34a' : '#dc2626' }}>
                    {r.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <span>Resolución: {r.resolution || '-'}</span>
                  <span>Consecutivo actual: <b>{r.next_consecutive}</b></span>
                  <span>Rango: {r.from} — {r.to}</span>
                  <span>Restantes: <b style={{ color: r.remaining < 100 ? '#dc2626' : '#16a34a' }}>{r.remaining}</b></span>
                  <span>Vigente desde: {r.date_from || '-'}</span>
                  <span>Vigente hasta: {r.date_to || '-'}</span>
                </div>
                {r.usage_percentage > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(r.usage_percentage, 100)}%`, background: r.usage_percentage > 80 ? '#dc2626' : '#7c3aed', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>Uso: {r.usage_percentage}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal preview JSON */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setDetalle(null)} />
          <div style={{ position: 'relative', background: '#1e1e1e', borderRadius: 12, width: 650, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>JSON Factura Electrónica</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(detalle, null, 2)); toast.success('JSON copiado'); }}
                  style={{ height: 26, padding: '0 10px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Copiar</button>
                <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
              </div>
            </div>
            <pre style={{ color: '#d4d4d4', fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: "'Courier New', monospace', margin: 0" }}>
              {JSON.stringify(detalle, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Modal detalle documento electrónico */}
      {facturaDetalle && (
        <DetalleDocElectronico docId={facturaDetalle} onClose={() => setFacturaDetalle(null)} onUpdate={cargar} />
      )}

    </div>
  );
}
