import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Search, RefreshCw, TrendingUp, DollarSign, CreditCard, Wallet,
  Eye, X, Printer, Copy, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getConfigImpresion, getEmpresaCache } from './ConfiguracionSistema';
import { imprimirFactura, type DatosFactura } from './ImpresionFactura';
import { DetalleFacturaModal } from './DetalleFacturaModal';
import { AutorizacionAdminModal, type AdminAutorizado } from './AutorizacionAdminModal';
import { confirmar } from './ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/ventas/listar.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

// Hora viene de DB como "HH:MM:SS" o "HH:MM" en zona horaria local (Bogotá).
// La formateamos a 12h con sufijo a. m. / p. m. estilo es-CO.
const fmtHora12 = (h?: string | null): string => {
  if (!h) return '-';
  const [hStr, mStr] = h.split(':');
  const hh = parseInt(hStr, 10);
  const mm = (mStr ?? '00').padStart(2, '0');
  if (isNaN(hh)) return h;
  const sufijo = hh >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm} ${sufijo}`;
};

interface Props {
  onNavigate?: (section: string) => void;
}

export function SalesManagement({ onNavigate }: Props = {}) {
  const { user } = useAuth();
  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';

  // Copiar una venta a Nueva Venta. Guarda el ID en localStorage y navega —
  // NuevaVenta detecta el flag al montar y carga los datos vía
  // ventas/copiar.php (mismo flujo que copiar FE o convertir pedido vendedor).
  // No se copia el número de factura: la nueva venta toma su consecutivo.
  const copiarVenta = (factN: number) => {
    localStorage.setItem('venta_para_copiar_id', String(factN));
    toast.success(`Factura ${factN} cargada para copia — ajuste y guarde`);
    if (onNavigate) {
      onNavigate('nueva-venta');
    } else {
      toast.error('No se pudo navegar — abre Nueva Venta manualmente.');
    }
  };
  const [ventas, setVentas] = useState<any[]>([]);
  // Estado del flujo de anulación desde el listado (reusa AutorizacionAdminModal).
  // El backend valida reglas: caja abierta, autorización, etc; si falta algo
  // devuelve { requiere_autorizacion } o { requiere_caja_abierta } — respetamos
  // esa señal para mostrar el modal correspondiente.
  const [autorizacionAnul, setAutorizacionAnul] = useState<{ factN: number; motivo: string } | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [dia, setDia] = useState(0); // 0 = todos los días del mes
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('Valida');
  const [aniosDisp, setAniosDisp] = useState<any[]>([]);
  const [facturaDetalleN, setFacturaDetalleN] = useState<number | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async (buscar?: string) => {
    setLoading(true);
    try {
      // Modo rendimiento: en PCs lentos, apagar el JOIN con la vista de
      // saldos (30 ms extra en cada query) y reducir el LIMIT. El saldo
      // se consulta en el módulo Cartera si el usuario lo necesita.
      const cfg = getConfigImpresion();
      const conSaldo = cfg.mostrarSaldoEnListado !== false ? 1 : 0;
      const limite = cfg.limiteListadoVentas || 500;
      let url = `${API}?anio=${anio}&estado=${filtroEstado}&con_saldo=${conSaldo}&limit=${limite}`;
      if (mes > 0) url += `&mes=${mes}`;
      if (dia > 0) url += `&dia=${dia}`;
      if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setVentas(d.ventas);
        setResumen(d.resumen);
        setAniosDisp(d.anios_disponibles);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes, dia, filtroEstado]);

  // Si cambia el mes a "Todos" (0), reseteamos día porque ya no tiene sentido.
  useEffect(() => { if (mes === 0 && dia !== 0) setDia(0); }, [mes]);

  const verDetalle = (factN: number) => setFacturaDetalleN(factN);

  // Imprimir factura desde listado
  const imprimirDesdeListado = async (factN: number) => {
    // Feedback inmediato para que el usuario sepa que el clic sí registró.
    // Antes: sin vista previa, dar clic parecía no hacer nada — no había
    // ningún indicador visual mientras se cargaba la factura y se lanzaba
    // la impresión silenciosa.
    const tid = toast.loading(`Preparando factura #${factN}…`);
    try {
      const r = await fetch(`${API}?id=${factN}`);
      const d = await r.json();
      if (!d.success) { toast.error(d.message || 'No se pudo cargar la factura', { id: tid }); return; }
      const fac = d.factura;
      const items = d.items || [];
      const datosImp: DatosFactura = {
        numero: fac.Factura_N,
        fecha: fac.Fecha ? new Date(fac.Fecha).toLocaleDateString('es-CO') + ' - ' + fmtHora12(fac.Hora) : '-',
        tipo: fac.Tipo || 'Contado',
        dias: parseInt(fac.Dias) || 0,
        cliente: { nombre: fac.A_nombre || '-', nit: fac.Identificacion || '0', telefono: fac.Telefono || '0', direccion: fac.Direccion || '-' },
        items: items.map((i: any) => ({
          codigo: i.Codigo || String(i.Items),
          nombre: i.DescripcionTemp || i.Nombres_Articulo || '-',
          cantidad: parseFloat(i.Cantidad) || 1,
          precio: parseFloat(i.PrecioV) || 0,
          iva: parseFloat(i.IVA) || 0,
          descuento: parseFloat(i.Descuento) || 0,
          subtotal: parseFloat(i.Subtotal) || 0
        })),
        subtotal: items.reduce((s: number, i: any) => s + (parseFloat(i.Subtotal) || 0), 0),
        descuento: parseFloat(fac.Descuento) || 0,
        iva: parseFloat(fac.Impuesto) || 0,
        total: parseFloat(fac.Total) || 0,
        efectivo: parseFloat(fac.efectivo) || 0,
        transferencia: parseFloat(fac.valorpagado1) || 0,
        cambio: parseFloat(fac.Cambio) || 0,
        abono: parseFloat(fac.Abono) || 0,
        saldo: parseFloat(fac.Saldo) || 0,
        medioPago: fac.MedioPago || 'Efectivo',
        // detalle-factura.php hace JOIN con tblusuarios y devuelve NombreUsuario
        // (el nombre del usuario que originalmente registró la venta, no el
        // que está reimprimiendo ahora — eso es lo correcto).
        vendedor: fac.NombreUsuario || fac.Vendedor || 'Vendedor',
        empresa: (() => {
          // Datos reales de la empresa (cache poblado al cargar Dashboard
          // desde tbldatosempresa). Antes había un hardcode de "DISTRIBUIDORA
          // DE SALSAS" que salía en TODAS las tirillas.
          const emp = getEmpresaCache();
          return {
            nombre: emp.nombre,
            nit: emp.nit,
            telefono: emp.telefono,
            direccion: emp.direccion,
            regimen: emp.regimen || '',
            propietario: emp.propietario || '',
            resolucion: emp.resolucion || '',
            detalle: emp.detalle || '',
          };
        })(),
        caja: 1,
        logo: getConfigImpresion().logo || undefined
      };
      imprimirFactura(datosImp);
      toast.success(`Factura #${factN} enviada a impresión`, { id: tid });
    } catch (e) {
      console.error(e);
      toast.error('Error al imprimir la factura', { id: tid });
    }
  };

  /* ============================================================
   * Anular factura desde el listado (mismo flujo que
   * DetalleFacturaModal.anularFactura). El endpoint valida:
   *   - caja abierta requerida si es contado con efectivo (>0)
   *   - autorización admin si es venta de otro cajero / caja cerrada
   *   - config `autorizarAnulaciones` si es admin
   * Si backend responde requiere_autorizacion → abre modal admin.
   * Si backend responde requiere_caja_abierta → toast + no permite.
   * ========================================================== */
  const anularDesdeListado = async (factN: number, esAnulada: boolean, adminAuth?: AdminAutorizado) => {
    if (esAnulada) { toast.error('La factura ya está anulada'); return; }
    const cfg = getConfigImpresion();
    // Admin con config exige autorización: abrir modal antes de cualquier POST
    const necesitaAuth = cfg.autorizarAnulaciones && esAdmin && !adminAuth;
    if (necesitaAuth) {
      setAutorizacionAnul({ factN, motivo: `Anular Factura FV-${factN}` });
      return;
    }
    if (!adminAuth) {
      const ok = await confirmar({
        title: `¿Anular factura FV-${factN}?`,
        message: 'Se devolverá todo el inventario al stock. Si fue de contado, se registrará egreso por reembolso en la caja abierta. Acción irreversible.',
        type: 'danger',
        confirmText: 'Sí, Anular Factura',
        cancelText: 'Cancelar',
      });
      if (!ok) return;
    }
    setAnulando(true);
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/ventas/detalle-factura.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anular', factura_n: factN,
          usuario_id: user?.id || 0,
          autorizado_por: adminAuth?.id || null,
          autorizado_por_nombre: adminAuth?.nombre || null,
        }),
      });
      const d = await r.json();
      // Vendedor con venta ajena o fuera de sesión → abre modal admin
      if (!d.success && d.requiere_autorizacion) {
        setAutorizacionAnul({ factN, motivo: `Anular Factura FV-${factN} — ${d.message || 'requiere autorización'}` });
        return;
      }
      // Sin caja abierta para el reembolso
      if (!d.success && d.requiere_caja_abierta) {
        toast.error(d.message, { duration: 8000 });
        return;
      }
      if (d.success) {
        const msg = adminAuth ? `${d.message} (autorizado por ${adminAuth.nombre})` : d.message;
        toast.success(msg, { duration: 6000 });
        setAutorizacionAnul(null);
        cargar();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error al anular'); }
    finally { setAnulando(false); }
  };

  const filtrados = ventas.filter(v => {
    if (busqueda) {
      const b = busqueda.toLowerCase();
      const matchFactura = String(v.Factura_N).includes(busqueda);
      const matchNombre = v.A_nombre?.toLowerCase().includes(b);
      const matchIdent = v.Identificacion?.toLowerCase().includes(b);
      if (!matchFactura && !matchNombre && !matchIdent) return false;
    }
    if (filtroTipo === 'contado' && v.Tipo !== 'Contado') return false;
    if (filtroTipo === 'credito' && v.Tipo === 'Contado') return false;
    return true;
  });

  // Totales calculados sobre `filtrados` (no sobre `resumen` del backend), para
  // que las cards reflejen TODOS los filtros aplicados — año/mes/día/estado
  // (que vienen del backend) + Contado/Crédito + búsqueda libre (cliente).
  const statsFiltrados = filtrados.reduce((acc, v) => {
    acc.cantidad += 1;
    acc.monto += v.Total || 0;
    if (v.Tipo === 'Contado') acc.contado += v.Total || 0;
    else acc.credito += v.Total || 0;
    return acc;
  }, { cantidad: 0, monto: 0, contado: 0, credito: 0 });

  const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Anchos calibrados — AG Grid mete iconos de sort/filter en el header (~30-40px)
  // así que sobredimensionamos un poco para evitar truncado.
  const cols: ColDef[] = [
    { headerName: 'Factura', field: 'Factura_N', width: 90, sortable: true,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 110, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Hora', field: 'Hora', width: 90,
      cellRenderer: (p: any) => fmtHora12(p.value) },
    { headerName: 'Cliente', field: 'A_nombre', flex: 1, minWidth: 180, sortable: true, filter: true },
    { headerName: 'Tipo', field: 'Tipo', width: 105,
      cellRenderer: (p: any) => {
        const esCredito = p.value !== 'Contado';
        return <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: esCredito ? '#dbeafe' : '#f3f4f6', color: esCredito ? '#2563eb' : '#6b7280'
        }}>{esCredito ? 'Crédito' : 'Contado'}</span>;
      }
    },
    { headerName: 'Ítems', field: 'Total_Items', width: 80, cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{p.value}</span> },
    { headerName: 'Total', field: 'Total', width: 135, sortable: true, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700 }}>{fmtMon(p.value || 0)}</span> },
    { headerName: 'Saldo', field: 'Saldo', width: 130, sortable: true, cellStyle: { textAlign: 'right' },
      // Se oculta si el usuario apagó la columna en Configuración (modo rendimiento).
      hide: getConfigImpresion().mostrarSaldoEnListado === false,
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v > 0 ? <span style={{ fontWeight: 600, color: '#dc2626' }}>{fmtMon(v)}</span> : <span style={{ color: '#16a34a' }}>$ 0</span>;
      }
    },
    { headerName: 'Medio', field: 'MedioPago', width: 110,
      cellRenderer: (p: any) => <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#f3f4f6' }}>{p.value}</span> },
    { headerName: '', width: 128, sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
      cellRenderer: (p: any) => {
        const anulada = p.data?.EstadoFact === 'Anulada';
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <button title="Ver detalle" onClick={() => verDetalle(p.data.Factura_N)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              <Eye size={15} color="#7c3aed" />
            </button>
            <button title="Imprimir factura" onClick={() => imprimirDesdeListado(p.data.Factura_N)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              <Printer size={15} color="#2563eb" />
            </button>
            <button title="Copiar a Nueva Venta" onClick={() => copiarVenta(p.data.Factura_N)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
              <Copy size={15} color="#16a34a" />
            </button>
            {!anulada && (
              <button
                title="Anular factura"
                onClick={() => anularDesdeListado(p.data.Factura_N, anulada)}
                disabled={anulando}
                style={{ background: 'none', border: 'none', cursor: anulando ? 'wait' : 'pointer', padding: 3, opacity: anulando ? 0.5 : 1 }}
              >
                <Ban size={15} color="#dc2626" />
              </button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Listado de Ventas</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Consulta y gestión de facturas de venta</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Total Facturas', value: statsFiltrados.cantidad, icon: TrendingUp, bg: '#f3e8ff', color: '#7c3aed' },
          { label: 'Monto Total', value: fmtMon(statsFiltrados.monto), icon: DollarSign, bg: '#dcfce7', color: '#16a34a', isText: true },
          { label: 'Contado', value: fmtMon(statsFiltrados.contado), icon: Wallet, bg: '#f3f4f6', color: '#374151', isText: true },
          { label: 'Crédito', value: fmtMon(statsFiltrados.credito), icon: CreditCard, bg: '#dbeafe', color: '#2563eb', isText: true },
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
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          {aniosDisp.map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value={0}>Todos</option>
          {meses.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={dia} onChange={e => setDia(parseInt(e.target.value))}
          disabled={mes === 0}
          title={mes === 0 ? 'Selecciona un mes para filtrar por día' : 'Día del mes'}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px',
                   opacity: mes === 0 ? 0.5 : 1, cursor: mes === 0 ? 'not-allowed' : 'pointer' }}>
          <option value={0}>Día (todos)</option>
          {Array.from({ length: new Date(anio, mes, 0).getDate() }, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value="Valida">Válidas</option>
          <option value="Anulada">Anuladas</option>
          <option value="Todas">Todas</option>
        </select>

        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="# Factura, cliente o identificación... (Enter)" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') cargar(busqueda.trim() || undefined); }}
            style={{ width: '100%', height: 30, paddingLeft: 28, paddingRight: busqueda ? 28 : 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none' }} />
          {busqueda && (
            <button onClick={() => { setBusqueda(''); cargar(); }}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {[
          { id: 'todos', label: 'Todos' },
          { id: 'contado', label: 'Contado' },
          { id: 'credito', label: 'Crédito' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltroTipo(f.id)} style={{
            height: 28, padding: '0 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
            border: filtroTipo === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
            background: filtroTipo === f.id ? '#f3e8ff' : '#fff',
            color: filtroTipo === f.id ? '#7c3aed' : '#374151', fontWeight: filtroTipo === f.id ? 600 : 400,
          }}>{f.label}</button>
        ))}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>{filtrados.length} factura(s)</span>
        <button onClick={cargar} style={{
          height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5
        }}><RefreshCw size={14} /></button>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 370px)', width: '100%', fontSize: 12, ['--ag-font-size' as any]: '12px' }}>
          <AgGridReact ref={gridRef} rowData={filtrados} columnDefs={cols} loading={loading} animateRows
            getRowId={p => String(p.data.Factura_N)} rowHeight={32} headerHeight={30}
            defaultColDef={{ resizable: true }}
            getRowStyle={p => {
              if (p.data?.EstadoFact === 'Anulada') return { background: '#fef2f2', textDecoration: 'line-through', opacity: 0.6 };
              return undefined;
            }} />
        </div>
      </div>

      {/* Modal detalle factura */}
      {facturaDetalleN && (
        <DetalleFacturaModal factN={facturaDetalleN} onClose={() => setFacturaDetalleN(null)} onUpdate={cargar} />
      )}

      {/* Modal de autorización admin — abre si el backend exige autorización
          para anular (venta de otro cajero, caja cerrada, o config global). */}
      {autorizacionAnul && (
        <AutorizacionAdminModal
          motivo={autorizacionAnul.motivo}
          onCancelar={() => setAutorizacionAnul(null)}
          onAutorizado={(admin) => {
            const factN = autorizacionAnul.factN;
            setAutorizacionAnul(null);
            anularDesdeListado(factN, false, admin);
          }}
        />
      )}

      {/* OLD MODAL - DISABLED */}
      {false && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setFacturaDetalle(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 700, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Factura #{facturaDetalle.Factura_N}</span>
                <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: facturaDetalle.EstadoFact === 'Valida' ? '#dcfce7' : '#fee2e2',
                  color: facturaDetalle.EstadoFact === 'Valida' ? '#16a34a' : '#dc2626'
                }}>{facturaDetalle.EstadoFact}</span>
              </div>
              <button onClick={() => setFacturaDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '14px 20px' }}>
              {/* Info factura */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', fontSize: 13, marginBottom: 14 }}>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>CLIENTE</span><div style={{ fontWeight: 600 }}>{facturaDetalle.A_nombre}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>FECHA</span><div>{new Date(facturaDetalle.Fecha).toLocaleDateString('es-CO')} {fmtHora12(facturaDetalle.Hora)}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>TIPO</span><div>{facturaDetalle.Tipo}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>MEDIO DE PAGO</span><div>{facturaDetalle.MedioPago || 'Efectivo'}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>VENDEDOR</span><div>{facturaDetalle.NombreUsuario || '-'}</div></div>
                <div><span style={{ fontSize: 10, color: '#6b7280' }}>IDENTIFICACIÓN</span><div>{facturaDetalle.Identificacion || '-'}</div></div>
              </div>

              {/* Items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#f3e8ff', borderBottom: '2px solid #d8b4fe' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Código</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Artículo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>P. Venta</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleItems.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '5px 8px', color: '#6b7280' }}>{item.Codigo || '-'}</td>
                      <td style={{ padding: '5px 8px', fontWeight: 500 }}>{item.Nombres_Articulo || item.DescripcionTemp || '-'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600 }}>{item.Cantidad}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMon(item.PrecioV)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(item.Subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 250 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span>Subtotal:</span><span>{fmtMon(parseFloat(facturaDetalle.Total) + parseFloat(facturaDetalle.Descuento))}</span>
                  </div>
                  {parseFloat(facturaDetalle.Descuento) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#d97706' }}>
                      <span>Descuento:</span><span>- {fmtMon(parseFloat(facturaDetalle.Descuento))}</span>
                    </div>
                  )}
                  {parseFloat(facturaDetalle.Impuesto) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>IVA:</span><span>{fmtMon(parseFloat(facturaDetalle.Impuesto))}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 16, fontWeight: 700, borderTop: '2px solid #7c3aed', marginTop: 4 }}>
                    <span>Total:</span><span style={{ color: '#7c3aed' }}>{fmtMon(parseFloat(facturaDetalle.Total))}</span>
                  </div>
                  {parseFloat(facturaDetalle.Saldo) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#dc2626' }}>
                      <span>Saldo pendiente:</span><span style={{ fontWeight: 700 }}>{fmtMon(parseFloat(facturaDetalle.Saldo))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
