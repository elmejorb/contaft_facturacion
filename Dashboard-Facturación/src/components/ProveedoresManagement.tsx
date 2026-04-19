import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, Plus, Truck, DollarSign, Eye, Pencil, Trash2, X, Save,
  FileText, Wallet, Receipt, ShoppingCart, Ban, Printer
} from 'lucide-react';

const tipoPagoNombre = (id: number) => ({ 0: 'Efectivo', 1: 'Tarjeta', 2: 'Bancolombia', 3: 'Nequi' } as Record<number,string>)[id] || 'Efectivo';
import { ReciboImpresion } from './ReciboImpresion';
import { getConfigImpresion } from './ConfiguracionSistema';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/proveedores/listar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function ProveedoresManagement({ modoCxP = false }: { modoCxP?: boolean } = {}) {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState(modoCxP ? 'con_saldo' : 'todos');
  const [modal, setModal] = useState<'cerrado' | 'editar' | 'crear'>('cerrado');
  const [form, setForm] = useState<any>({});
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) { setProveedores(d.proveedores); setResumen(d.resumen); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const set = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  const guardar = async () => {
    if (!form.RazonSocial?.trim()) { setError('Razón social requerida'); return; }
    try {
      const r = await fetch(API, {
        method: modal === 'editar' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { setSuccess(d.message); setTimeout(() => setSuccess(''), 3000); setModal('cerrado'); cargar(); }
      else setError(d.message);
    } catch (e) { setError('Error al guardar'); }
  };

  const filtrados = proveedores.filter(p => {
    const b = busqueda.toLowerCase();
    if (busqueda && !p.RazonSocial?.toLowerCase().includes(b) && !p.Nit?.includes(busqueda)) return false;
    switch (filtro) {
      case 'con_saldo': return p.Saldo_Total > 0;
      case 'sin_saldo': return p.Saldo_Total <= 0;
      case 'con_compras': return p.Total_Compras > 0;
      default: return true;
    }
  });

  const inp = (label: string, field: string) => (
    <div>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>{label}</label>
      <input type="text" value={form[field] ?? ''} onChange={e => set(field, e.target.value)}
        style={{ width: '100%', height: 28, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none' }} />
    </div>
  );

  const cols: ColDef[] = [
    { headerName: 'Código', field: 'CodigoPro', width: 80, sortable: true },
    { headerName: 'Proveedor', field: 'RazonSocial', flex: 1, minWidth: 200, sortable: true, filter: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'NIT', field: 'Nit', width: 110, sortable: true },
    { headerName: 'Teléfono', field: 'Telefonos', width: 110,
      cellRenderer: (p: any) => (!p.value || p.value === '0') ? <span style={{ color: '#9ca3af' }}>-</span> : <span>{p.value}</span> },
    { headerName: 'Compras', field: 'Total_Compras', width: 80, sortable: true, cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: '#7c3aed' }}>{p.value || 0}</span> },
    { headerName: 'Monto Compras', field: 'Monto_Compras', width: 130, sortable: true, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => p.value ? <span style={{ fontWeight: 600 }}>{fmtMon(p.value)}</span> : <span style={{ color: '#9ca3af' }}>-</span> },
    { headerName: 'Saldo', field: 'Saldo_Total', width: 120, sortable: true, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v > 0 ? <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmtMon(v)}</span> : <span style={{ color: '#16a34a' }}>$ 0</span>;
      }
    },
    { headerName: '', width: 90, sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
      cellRenderer: (p: any) => {
        const esGenerico = p.data.CodigoPro === 220500;
        return (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <button title="Ver detalle" onClick={() => setDetalleId(p.data.CodigoPro)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              <Eye size={15} color="#7c3aed" />
            </button>
            <button title={esGenerico ? 'Proveedor del sistema — no editable' : 'Editar'} disabled={esGenerico}
              onClick={() => !esGenerico && (setForm({ ...p.data }), setModal('editar'))}
              style={{ background: 'none', border: 'none', cursor: esGenerico ? 'not-allowed' : 'pointer', padding: 3, opacity: esGenerico ? 0.3 : 1 }}>
              <Pencil size={15} color="#f59e0b" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>{modoCxP ? 'Cuentas por Pagar' : 'Proveedores'}</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>{modoCxP ? 'Proveedores con saldo pendiente' : 'Gestión de proveedores y cuentas por pagar'}</p>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>{error}<button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button></div>}
      {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#16a34a', fontSize: 13 }}>{success}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Proveedores', value: resumen.total || 0, icon: Truck, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Con Saldo', value: resumen.con_saldo || 0, icon: DollarSign, bg: '#fee2e2', color: '#dc2626' },
          { label: 'Total Deuda', value: fmtMon(resumen.total_deuda || 0), icon: Wallet, bg: '#fee2e2', color: '#dc2626', isText: true },
          { label: 'Total Compras', value: fmtMon(resumen.monto_compras || 0), icon: ShoppingCart, bg: '#dcfce7', color: '#16a34a', isText: true },
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
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar por nombre, NIT..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 32, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
        </div>
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'con_saldo', label: 'Con saldo' },
          { id: 'sin_saldo', label: 'Sin saldo' },
          { id: 'con_compras', label: 'Con compras' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
            border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
            background: filtro === f.id ? '#f3e8ff' : '#fff',
            color: filtro === f.id ? '#7c3aed' : '#374151', fontWeight: filtro === f.id ? 600 : 400,
          }}>{f.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => { setForm({ RazonSocial: '', Nit: '', Telefonos: '', Direccion: '', Nombres: '', Apellidos: '' }); setModal('crear'); }} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}><Plus size={14} /> Nuevo</button>
        <button onClick={cargar} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}><RefreshCw size={14} /></button>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 370px)', width: '100%' }}>
          <AgGridReact ref={gridRef} rowData={filtrados} columnDefs={cols} loading={loading} animateRows
            getRowId={p => String(p.data.CodigoPro)} rowHeight={36} headerHeight={36}
            defaultColDef={{ resizable: true }}
            getRowStyle={p => (p.data?.Saldo_Total > 0) ? { background: '#fef2f2' } : undefined} />
        </div>
      </div>

      {/* Modal editar/crear */}
      {modal !== 'cerrado' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setModal('cerrado')} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 550, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{modal === 'crear' ? 'Nuevo Proveedor' : 'Editar Proveedor'}</span>
              <button onClick={() => setModal('cerrado')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ gridColumn: 'span 2' }}>{inp('Razón Social *', 'RazonSocial')}</div>
                {inp('NIT', 'Nit')}
                {inp('Teléfono', 'Telefonos')}
                <div style={{ gridColumn: 'span 2' }}>{inp('Dirección', 'Direccion')}</div>
                {inp('Contacto Nombre', 'Nombres')}
                {inp('Contacto Apellido', 'Apellidos')}
              </div>
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModal('cerrado')} style={{ height: 30, padding: '0 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> Cancelar</button>
              <button onClick={guardar} style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalleId !== null && (
        <ProveedorDetalle provId={detalleId} onClose={() => { setDetalleId(null); cargar(); }} />
      )}
    </div>
  );
}

// ==================== DETALLE PROVEEDOR ====================
function ProveedorDetalle({ provId, onClose }: { provId: number; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'compras' | 'pagar' | 'historial'>('compras');
  const [abonos, setAbonos] = useState<Map<number, number>>(new Map());
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [reciboImprimir, setReciboImprimir] = useState<any>(null);
  const [formVersion, setFormVersion] = useState(0);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?id=${provId}`);
      const d = await r.json();
      if (d.success) { setData(d); setAbonos(new Map()); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [provId]);

  if (!data && loading) return null;

  const prov = data?.proveedor;
  const pendientes = data?.pendientes || [];
  const facturas = data?.facturas || [];
  const egresos = data?.egresos || [];
  const totalPendiente = data?.total_pendiente || 0;
  const totalAbonos = Array.from(abonos.values()).reduce((s, v) => s + v, 0);

  const guardarPagos = async () => {
    const pagosArr = Array.from(abonos.entries()).filter(([_, v]) => v > 0).map(([id, v]) => {
      const pen = pendientes.find((p: any) => p.ID_FactAnterioresP === id);
      return { fact_id: id, origen: pen?.Origen || 'anterior', valor: v, descuento: 0 };
    });
    if (!pagosArr.length) return;
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pagar', proveedor: provId, pagos: pagosArr })
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ type: 'ok', text: d.message });
        setTimeout(() => setMsg({ type: '', text: '' }), 5000);
        setFormVersion(v => v + 1);
        cargar();
        // Preguntar si imprimir recibo
        if (confirm('Pago registrado. ¿Desea imprimir el comprobante de egreso?')) {
          const cfg = getConfigImpresion();
          const pagoData = {
            RecCajaN: d.comprobante,
            Fecha: new Date().toLocaleString('es-CO'),
            NFactAnt: (d.facturas_nums || []).join(', '),
            ValorPago: d.total_pagado,
            SaldoAct: 0,
            Descuento: 0,
            MedioPago: 'Efectivo',
            DetallePago: `Pago de ${d.facturas_afectadas} factura(s) a ${prov?.RazonSocial || ''}`
          };
          setReciboImprimir({ pago: pagoData, formato: cfg.formatoPago });
        }
      } else setMsg({ type: 'err', text: d.message });
    } catch (e) { setMsg({ type: 'err', text: 'Error' }); }
    setGuardando(false);
  };

  const tabs = [
    { id: 'compras' as const, label: 'Compras', icon: FileText, count: facturas.length },
    { id: 'pagar' as const, label: 'Pagar', icon: Wallet, count: pendientes.length },
    { id: 'historial' as const, label: 'Historial Pagos', icon: Receipt, count: egresos.length },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 800, height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{prov?.RazonSocial}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Código: {prov?.CodigoPro} | NIT: {prov?.Nit || '-'} | Tel: {prov?.Telefonos || '-'}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#6b7280' }}>SALDO PENDIENTE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: totalPendiente > 0 ? '#dc2626' : '#16a34a' }}>{fmtMon(totalPendiente)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 20px', flexShrink: 0 }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none',
                borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
                background: 'none', cursor: 'pointer', fontSize: 13,
                color: active ? '#7c3aed' : '#6b7280', fontWeight: active ? 600 : 400
              }}><Icon size={15} /> {t.label} <span style={{ fontSize: 10, opacity: 0.6 }}>({t.count})</span></button>
            );
          })}
        </div>

        {msg.text && <div style={{ margin: '8px 20px 0', padding: '6px 12px', borderRadius: 6, fontSize: 12, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#16a34a' : '#dc2626', border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>{msg.text}</div>}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {tab === 'compras' && (
            <div style={{ height: '100%' }}>
              {facturas.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin compras registradas</div> : (
                <AgGridReact rowData={facturas} animateRows getRowId={p => String(p.data.ID_FactAnterioresP)} rowHeight={34} headerHeight={34}
                  defaultColDef={{ resizable: true }}
                  columnDefs={[
                    { headerName: 'Factura', field: 'FacturaN', width: 120, sortable: true, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.value}</span> },
                    { headerName: 'Fecha', field: 'Fecha', flex: 1, sortable: true, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
                    { headerName: 'Valor', field: 'Valor', flex: 1, sortable: true, cellStyle: { textAlign: 'right' }, cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{fmtMon(p.value || 0)}</span> },
                    { headerName: 'Saldo', field: 'Saldo', flex: 1, sortable: true, cellStyle: { textAlign: 'right' }, cellRenderer: (p: any) => {
                      const v = p.value || 0; return <span style={{ fontWeight: 600, color: v > 0 ? '#dc2626' : '#16a34a' }}>{fmtMon(v)}</span>;
                    }},
                    { headerName: 'Estado', width: 90, cellRenderer: (p: any) => {
                      const pagada = (p.data.Saldo || 0) <= 0;
                      return <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: pagada ? '#dcfce7' : '#fef3c7', color: pagada ? '#16a34a' : '#d97706' }}>{pagada ? 'Pagada' : 'Pendiente'}</span>;
                    }},
                  ]} />
              )}
            </div>
          )}

          {tab === 'pagar' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10, whiteSpace: 'nowrap' }}>
                <button onClick={() => { const m = new Map<number, number>(); pendientes.forEach((f: any) => m.set(f.ID_FactAnterioresP, f.Saldo)); setAbonos(m); }}
                  style={{ height: 28, padding: '0 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Pagar Todo</button>
                <div style={{ flex: 1 }} />
                {totalAbonos > 0 && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: '#6b7280' }}>TOTAL</div><div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{fmtMon(totalAbonos)}</div></div>}
                <button onClick={guardarPagos} disabled={guardando || totalAbonos <= 0}
                  style={{ height: 28, padding: '0 12px', background: totalAbonos > 0 ? '#7c3aed' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: totalAbonos > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Save size={13} /> Guardar</button>
              </div>
              {pendientes.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#16a34a' }}>Sin saldos pendientes</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Factura</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Saldo</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Días</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: 120 }}>Abono</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Nvo. Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.map((f: any) => {
                      const abono = abonos.get(f.ID_FactAnterioresP) || 0;
                      return (
                        <tr key={f.ID_FactAnterioresP} style={{ borderBottom: '1px solid #f3f4f6', background: abono > 0 ? '#f0fdf4' : undefined }}>
                          <td style={{ padding: '5px 8px', fontWeight: 600, color: '#7c3aed' }}>{f.FacturaN}</td>
                          <td style={{ padding: '5px 8px' }}>{new Date(f.Fecha).toLocaleDateString('es-CO')}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMon(f.Valor)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{fmtMon(f.Saldo)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', color: f.Dias_Mora > 30 ? '#dc2626' : '#6b7280' }}>{f.Dias_Mora}d</td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <input type="text" data-prov-input="true"
                              key={`abono-${f.ID_FactAnterioresP}-${formVersion}`}
                              defaultValue={abono > 0 ? abono.toLocaleString('es-CO') : ''}
                              onFocus={e => { e.target.value = abonos.get(f.ID_FactAnterioresP) ? String(abonos.get(f.ID_FactAnterioresP)) : ''; e.target.select(); }}
                              onBlur={e => {
                                const num = parseInt(e.target.value.replace(/[^0-9]/g, '') || '0');
                                const val = Math.min(num, f.Saldo);
                                const m = new Map(abonos);
                                if (val > 0) m.set(f.ID_FactAnterioresP, val); else m.delete(f.ID_FactAnterioresP);
                                setAbonos(m);
                                e.target.value = val > 0 ? val.toLocaleString('es-CO') : '';
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const cur = e.target as HTMLInputElement; cur.blur();
                                  const all = Array.from(document.querySelectorAll('input[data-prov-input]')) as HTMLInputElement[];
                                  const idx = all.indexOf(cur);
                                  if (idx < all.length - 1) requestAnimationFrame(() => all[idx + 1]?.focus());
                                }
                                if (!['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey) e.preventDefault();
                              }}
                              style={{ width: 100, height: 26, textAlign: 'center', fontWeight: 600, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, outline: 'none', background: '#fffbeb' }} />
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: (f.Saldo - abono) <= 0 ? '#16a34a' : '#374151' }}>
                            {abono > 0 ? fmtMon(Math.max(f.Saldo - abono, 0)) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div>
              {egresos.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin pagos registrados</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Comp.</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Factura</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Saldo Qdo.</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Concepto</th>
                      <th style={{ padding: '6px 8px', width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {egresos.map((e: any) => (
                      <tr key={e.Id_Egresos} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '5px 8px', color: '#7c3aed', fontWeight: 600 }}>{e.N_Comprobante}</td>
                        <td style={{ padding: '5px 8px' }}>{new Date(e.Fecha).toLocaleDateString('es-CO')}</td>
                        <td style={{ padding: '5px 8px' }}>{e.NFacturaAnt || '-'}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{fmtMon(e.Valor)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: e.Saldoact > 0 ? '#d97706' : '#16a34a' }}>{fmtMon(e.Saldoact)}</td>
                        <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: 11, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.Concepto}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <button title="Reimprimir comprobante" onClick={() => {
                            const cfg = getConfigImpresion();
                            setReciboImprimir({
                              pago: {
                                RecCajaN: e.N_Comprobante,
                                Fecha: new Date(e.Fecha).toLocaleString('es-CO'),
                                NFactAnt: e.NFacturaAnt || '-',
                                ValorPago: parseFloat(e.Valor),
                                SaldoAct: parseFloat(e.Saldoact),
                                Descuento: parseFloat(e.Descuento || 0),
                                MedioPago: tipoPagoNombre(parseInt(e.TipoPago || 0)),
                                DetallePago: e.Concepto || 'Pago',
                              },
                              formato: cfg.formatoPago,
                            });
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Printer size={14} color="#7c3aed" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      {reciboImprimir && prov && (
        <ReciboImpresion
          pago={reciboImprimir.pago}
          cliente={{ CodigoClien: provId, Razon_Social: prov.RazonSocial || '', Nit: prov.Nit || '', Telefonos: prov.Telefonos || '' }}
          formato={reciboImprimir.formato}
          tipoTercero="proveedor"
          onClose={() => setReciboImprimir(null)}
        />
      )}
    </div>
  );
}
