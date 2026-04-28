import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, FileText, CheckCircle, XCircle, AlertTriangle,
  Clock, Send, Eye, Printer, Globe, Mail, MailCheck, MailOpen, MailX, FileMinus, X
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
  const [contingencias, setContingencias] = useState<any[]>([]);
  const [showContingencias, setShowContingencias] = useState(false);
  const [reenviandoCont, setReenviandoCont] = useState(false);
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

  const enviarNotaCredito = async (factN: number, motivo: string, conceptId: number = 2) => {
    toast.loading('Enviando Nota Crédito a DIAN...', { id: 'nc-send' });
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nota_credito', factura_n: factN, motivo, concept_id: conceptId })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Nota Crédito enviada: ${d.message}`, { id: 'nc-send', duration: 6000 });
        setShowNotaCredito(null);
        cargar();
        // Abrir PDF de la NC recién creada
        if (d.doc_local_id) {
          window.open(`${API}/pdf.php?id=${d.doc_local_id}`, 'PDF_NC', 'width=900,height=700,menubar=no,toolbar=no');
        }
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

  const cargarContingencias = async () => {
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar_contingencias' })
      });
      const d = await r.json();
      if (d.success) setContingencias(d.contingencias || []);
    } catch (e) { /* silencioso */ }
  };

  const reenviarUnaContingencia = async (factN: number) => {
    try {
      const r = await fetch(`${API}/enviar.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reenviar_contingencia', factura_n: factN })
      });
      const d = await r.json();
      return { ok: !!d.success, msg: d.message || '' };
    } catch (e) {
      return { ok: false, msg: 'Error de conexión' };
    }
  };

  const reenviarTodasContingencias = async () => {
    if (contingencias.length === 0) { toast('No hay facturas en contingencia'); return; }
    setReenviandoCont(true);
    let ok = 0, fail = 0;
    for (const c of contingencias) {
      const r = await reenviarUnaContingencia(c.Factura_N);
      if (r.ok) ok++; else fail++;
    }
    setReenviandoCont(false);
    toast.success(`Reenvío completado: ${ok} exitosas, ${fail} fallidas`, { duration: 6000 });
    cargarContingencias();
    cargar();
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

  useEffect(() => { cargar(); cargarEmailStatus(); cargarContingencias(); }, [anio, mes]);

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
          {p.data.cufe && p.data.status === 'autorizado' && p.data.factura_n_local && (
            <button title="Anular / Nota Crédito"
              onClick={() => setShowNotaCredito({ factN: p.data.number, factura_n_local: p.data.factura_n_local, id: p.data.id, cliente: p.data.cliente_nombre, total: p.data.total, prefix: p.data.prefix })}
              style={{ width: 26, height: 24, border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileMinus size={13} color="#dc2626" />
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
          {contingencias.length > 0 && (
            <button onClick={() => setShowContingencias(true)} title="Facturas pendientes de reenviar a DIAN"
              style={{ height: 30, padding: '0 12px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <AlertTriangle size={14} /> Contingencias ({contingencias.length})
            </button>
          )}
          <button onClick={() => { cargarResoluciones(); setShowResoluciones(true); }}
            style={{ height: 30, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Globe size={14} /> Resoluciones
          </button>
          <button onClick={() => { cargar(); cargarEmailStatus(true); cargarContingencias(); }}
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
      {showNotaCredito && (
        <NotaCreditoModal nc={showNotaCredito} onClose={() => setShowNotaCredito(null)} onEnviar={enviarNotaCredito} />
      )}
      {showContingencias && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowContingencias(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 820, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, background: '#fffbeb' }}>
              <AlertTriangle size={20} color="#d97706" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Facturas en contingencia</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Pendientes de transmitir a la DIAN. Plazo máximo legal: 48 horas desde la emisión.</div>
              </div>
              <button onClick={() => setShowContingencias(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: 14, overflow: 'auto', flex: 1 }}>
              {contingencias.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No hay facturas en contingencia</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', color: '#6b7280', fontSize: 11, fontWeight: 600 }}>
                      <th style={{ padding: 8, textAlign: 'left' }}>Factura</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Fecha emisión</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Cliente</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                      <th style={{ padding: 8, textAlign: 'center' }}>Espera</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Motivo</th>
                      <th style={{ padding: 8 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contingencias.map((c: any) => {
                      const dias = parseInt(c.dias_espera || 0);
                      const vencida = dias > 2;
                      return (
                        <tr key={c.Factura_N} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: 8, color: '#7c3aed', fontWeight: 700 }}>{c.Factura_N}</td>
                          <td style={{ padding: 8 }}>{c.contingencia_fecha ? new Date(c.contingencia_fecha).toLocaleString('es-CO') : '-'}</td>
                          <td style={{ padding: 8 }}>{c.A_nombre || '-'}</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{fmtMon(parseFloat(c.Total))}</td>
                          <td style={{ padding: 8, textAlign: 'center', color: vencida ? '#dc2626' : '#d97706', fontWeight: 600 }}>{dias}d</td>
                          <td style={{ padding: 8, fontSize: 11, color: '#6b7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.contingencia_motivo}>{c.contingencia_motivo || '-'}</td>
                          <td style={{ padding: 8, textAlign: 'right' }}>
                            <button onClick={async () => {
                                const r = await reenviarUnaContingencia(c.Factura_N);
                                if (r.ok) { toast.success(`Factura #${c.Factura_N} enviada a DIAN`); cargarContingencias(); cargar(); }
                                else toast.error(`#${c.Factura_N}: ${r.msg}`);
                              }}
                              style={{ height: 26, padding: '0 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              Reenviar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: '10px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowContingencias(false)} style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cerrar</button>
              {contingencias.length > 0 && (
                <button onClick={reenviarTodasContingencias} disabled={reenviandoCont}
                  style={{ height: 32, padding: '0 14px', background: reenviandoCont ? '#9ca3af' : '#d97706', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: reenviandoCont ? 'wait' : 'pointer', fontWeight: 700 }}>
                  {reenviandoCont ? 'Reenviando...' : `Reenviar todas (${contingencias.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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

// ==================== Modal Nota Crédito (Anulación) ====================
const CONCEPTOS_NC = [
  { id: 2, label: 'Anulación de factura electrónica', desc: 'La factura queda sin efecto. Se envía NC por el total de la factura original.', disabled: false },
  { id: 1, label: 'Devolución parcial de bienes / no aceptación parcial del servicio', desc: 'Próximamente — requiere selección de ítems y cantidades.', disabled: true },
  { id: 3, label: 'Rebaja o descuento parcial o total', desc: 'Próximamente — requiere campo de rebaja.', disabled: true },
  { id: 4, label: 'Ajuste de precio', desc: 'Próximamente — requiere precio nuevo por ítem.', disabled: true },
  { id: 5, label: 'Otros', desc: 'Próximamente.', disabled: true },
];

function NotaCreditoModal({ nc, onClose, onEnviar }: { nc: any; onClose: () => void; onEnviar: (factN: number, motivo: string, conceptId: number) => void }) {
  const [conceptId, setConceptId] = useState(2);
  const [motivo, setMotivo] = useState('Anulación de la factura por error en los datos');
  const [confirmando, setConfirmando] = useState(false);

  const factN = nc.factura_n_local || nc.factN || 0;

  const enviar = () => {
    if (!factN) { toast.error('No se encontró la factura local'); return; }
    if (!motivo.trim()) { toast.error('Ingrese un motivo'); return; }
    if (!confirm(`¿Confirmar la emisión de Nota Crédito ${conceptId === 2 ? '(ANULACIÓN)' : ''} para la factura ${nc.prefix}${nc.factN}?\n\nEsta operación NO se puede revertir.`)) return;
    setConfirmando(true);
    onEnviar(factN, motivo, conceptId);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2' }}>
          <FileMinus size={20} color="#dc2626" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Emitir Nota Crédito</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Factura {nc.prefix}{nc.factN} — {nc.cliente} — ${Math.round(nc.total).toLocaleString('es-CO')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CONCEPTO DIAN *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {CONCEPTOS_NC.map(c => (
                <label key={c.id}
                  style={{ padding: '8px 10px', borderRadius: 6, cursor: c.disabled ? 'not-allowed' : 'pointer', border: `2px solid ${conceptId === c.id ? '#dc2626' : '#e5e7eb'}`, background: conceptId === c.id ? '#fef2f2' : '#fff', opacity: c.disabled ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="concept" checked={conceptId === c.id} disabled={c.disabled}
                      onChange={() => !c.disabled && setConceptId(c.id)} style={{ accentColor: '#dc2626' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.id}. {c.label}</span>
                  </div>
                  {c.desc && <div style={{ fontSize: 10, color: '#6b7280', marginLeft: 22, marginTop: 2 }}>{c.desc}</div>}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>MOTIVO / DESCRIPCIÓN *</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
              placeholder="Describe brevemente por qué se anula o corrige esta factura"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginTop: 2, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ padding: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#78350f' }}>
            <b>⚠ Importante:</b> una vez enviada a la DIAN, la Nota Crédito queda registrada permanentemente. Si es anulación, la factura original quedará marcada como <b>Anulada</b>.
          </div>
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={confirmando}
            style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={enviar} disabled={confirmando}
            style={{ height: 32, padding: '0 16px', background: confirmando ? '#9ca3af' : '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: confirmando ? 'wait' : 'pointer', fontWeight: 700 }}>
            {confirmando ? 'Enviando...' : 'Emitir Nota Crédito'}
          </button>
        </div>
      </div>
    </div>
  );
}
