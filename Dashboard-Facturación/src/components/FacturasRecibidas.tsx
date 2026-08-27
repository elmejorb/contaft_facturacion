import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import {
  Upload, Search, RefreshCw, Trash2, Eye, Download,
  CheckCircle, XCircle, Clock, PackageCheck, ThumbsUp, ThumbsDown, Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';
import { AplicarEventoModal } from './AplicarEventoModal';
import { DetalleFacturaRecibida } from './DetalleFacturaRecibida';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/facturas-recibidas';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export interface FacturaRecibida {
  id: number;
  cufe: string;
  tipo_documento: string;
  document_type_code: string;
  numero: string;
  prefijo: string;
  fecha_emision: string;
  fecha_recepcion: string;
  emisor_nit: string;
  emisor_dv?: string;
  emisor_nombre: string;
  emisor_organization_type?: string;
  receptor_nit: string;
  receptor_nombre: string;
  subtotal: number;
  total_iva: number;
  total: number;
  archivo_original_nombre: string;
  compra_id: number | null;
  eventos_aprobados_arr: string[];
  tiene_030: boolean;
  tiene_031: boolean;
  tiene_032: boolean;
  tiene_033: boolean;
  tiene_034: boolean;
  ultimo_evento_at: string | null;
}

export function FacturasRecibidas() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(0); // 0 = todo el año
  const [anios, setAnios] = useState<number[]>([]);
  const [facturas, setFacturas] = useState<FacturaRecibida[]>([]);
  const [resumen, setResumen] = useState<{ total_facturas: number; total_monto: number; sin_acuse: number } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aplicandoEvento, setAplicandoEvento] = useState<FacturaRecibida | null>(null);
  const [verDetalle, setVerDetalle] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const url = `${API}/listar.php?anio=${anio}${mes > 0 ? `&mes=${mes}` : ''}${busqueda ? `&q=${encodeURIComponent(busqueda)}` : ''}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        setFacturas(d.facturas || []);
        setResumen(d.resumen || null);
        setAnios(d.anios || []);
      } else {
        toast.error(d.message || 'Error al listar facturas recibidas');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [anio, mes]);

  const subirArchivo = async (file: File) => {
    if (!file) return;
    setUploading(true);
    toast.loading('Procesando archivo...', { id: 'sub' });
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      const r = await fetch(`${API}/subir.php`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success) {
        if (d.ya_existia) {
          toast(d.message || 'Ya estaba registrada', { id: 'sub', icon: 'ℹ️' });
        } else {
          toast.success(`Registrada · ${d.lineas_count} línea(s)`, { id: 'sub', duration: 5000 });
          // Sugerir enviar el 030 inmediatamente — obligación DIAN 3 días hábiles
          setTimeout(() => {
            const factura = d.factura as FacturaRecibida;
            factura.eventos_aprobados_arr = [];
            factura.tiene_030 = factura.tiene_031 = factura.tiene_032 = factura.tiene_033 = factura.tiene_034 = false;
            setAplicandoEvento(factura);
          }, 400);
        }
        cargar();
      } else {
        toast.error(d.message || 'No se pudo procesar', { id: 'sub', duration: 8000 });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: 'sub' });
    }
    setUploading(false);
  };

  const eliminar = async (fac: FacturaRecibida) => {
    const ok = await confirmar({
      title: 'Eliminar factura recibida',
      message: `¿Eliminar la factura ${fac.prefijo}${fac.numero} de ${fac.emisor_nombre}? Solo permitido si no tiene eventos DIAN aprobados.`,
      type: 'danger', confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      const r = await fetch(`${API}/eliminar.php?id=${fac.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) { toast.success('Eliminada'); cargar(); }
      else toast.error(d.message, { duration: 6000 });
    } catch (e) { toast.error('Error de conexión'); }
  };

  const filtradas = useMemo(() => {
    if (!busqueda) return facturas;
    const q = busqueda.toLowerCase();
    return facturas.filter(f =>
      (f.emisor_nombre || '').toLowerCase().includes(q)
      || (f.numero || '').includes(q)
      || (f.cufe || '').toLowerCase().includes(q)
    );
  }, [facturas, busqueda]);

  const cols: ColDef[] = [
    { headerName: '#', field: 'id', width: 55, sortable: true },
    { headerName: 'Nº', width: 90, sortable: true,
      valueGetter: (p: any) => `${p.data.prefijo || ''}${p.data.numero || ''}`,
      cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span>
    },
    {
      headerName: 'Tipo', field: 'document_type_code', width: 55, sortable: true,
      cellRenderer: (p: any) => {
        const tipos: Record<string, { sigla: string; color: string; label: string }> = {
          '01': { sigla: 'FE', color: '#2563eb', label: 'Factura Electrónica' },
          '91': { sigla: 'NC', color: '#d97706', label: 'Nota Crédito' },
          '92': { sigla: 'ND', color: '#dc2626', label: 'Nota Débito' },
        };
        const t = tipos[p.value] || tipos['01'];
        return <span title={t.label} style={{ fontSize: 11, fontWeight: 700, color: t.color, background: t.color + '15', padding: '2px 6px', borderRadius: 4 }}>{t.sigla}</span>;
      }
    },
    { headerName: 'Fecha', field: 'fecha_emision', width: 100, sortable: true,
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-'
    },
    { headerName: 'Proveedor', field: 'emisor_nombre', flex: 1, minWidth: 200, sortable: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 500 }}>{p.value || '-'}</span>
    },
    { headerName: 'NIT', field: 'emisor_nit', width: 110, sortable: true },
    { headerName: 'Total', field: 'total', width: 120, sortable: true, type: 'numericColumn',
      cellRenderer: (p: any) => <span style={{ fontWeight: 700 }}>{fmtMon(p.value || 0)}</span>
    },
    {
      // Timeline compacto: 5 iconitos, cada uno se pinta si el evento está aprobado.
      // Grey = pendiente, color = aplicado.
      headerName: 'Eventos DIAN', width: 160, sortable: false,
      cellRenderer: (p: any) => {
        const items: { code: string; icon: any; color: string; label: string; done: boolean }[] = [
          { code: '030', icon: Inbox,         color: '#a16207', label: 'Acuse',       done: !!p.data.tiene_030 },
          { code: '032', icon: PackageCheck,  color: '#1d4ed8', label: 'Recibido',    done: !!p.data.tiene_032 },
          { code: '033', icon: ThumbsUp,      color: '#15803d', label: 'Aceptada',    done: !!p.data.tiene_033 },
          { code: '034', icon: Clock,         color: '#0891b2', label: 'Tácita',      done: !!p.data.tiene_034 },
          { code: '031', icon: ThumbsDown,    color: '#b91c1c', label: 'Rechazada',   done: !!p.data.tiene_031 },
        ];
        return (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: '100%' }}>
            {items.map(it => {
              const IconEl = it.icon;
              return (
                <span key={it.code} title={`${it.code} — ${it.label}${it.done ? ' ✓' : ' (pendiente)'}`}
                  style={{
                    width: 22, height: 22, borderRadius: 4,
                    background: it.done ? it.color + '22' : '#f3f4f6',
                    color: it.done ? it.color : '#d1d5db',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <IconEl size={12} />
                </span>
              );
            })}
          </div>
        );
      }
    },
    {
      headerName: '', width: 130, sortable: false,
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <button title="Ver detalle" onClick={() => setVerDetalle(p.data.id)}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={13} color="#6b7280" />
          </button>
          <button title="Aplicar evento DIAN" onClick={() => setAplicandoEvento(p.data)}
            style={{ width: 26, height: 24, border: '1px solid #dbeafe', borderRadius: 4, cursor: 'pointer', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={13} color="#2563eb" />
          </button>
          <button title="Descargar XML/ZIP original" onClick={() => window.open(`${API}/xml.php?id=${p.data.id}`, '_blank')}
            style={{ width: 26, height: 24, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={13} color="#7c3aed" />
          </button>
          <button title="Eliminar" onClick={() => eliminar(p.data)}
            style={{ width: 26, height: 24, border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={13} color="#dc2626" />
          </button>
        </div>
      )
    },
  ];

  const meses = ['Todo el año','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div style={{ padding: 12, height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado + acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 }}>Facturas Recibidas</h2>
        <span style={{ fontSize: 11, color: '#6b7280' }}>FE emitidas por proveedores · Eventos DIAN de acuse</span>
        <div style={{ flex: 1 }} />

        <label style={{
          height: 32, padding: '0 12px', background: uploading ? '#e5e7eb' : '#2563eb', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: uploading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.6 : 1,
        }}>
          {uploading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
          {uploading ? 'Procesando…' : 'Cargar factura (ZIP/XML)'}
          <input type="file" accept=".zip,.xml,application/zip,application/xml,text/xml"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) subirArchivo(f);
              e.target.value = '';
            }} />
        </label>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          {(anios.length > 0 ? anios : [now.getFullYear()]).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
          style={{ height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
          {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar por proveedor, número o CUFE…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 30, paddingLeft: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} />
        </div>
        <button onClick={cargar} title="Refrescar"
          style={{ height: 30, padding: '0 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <RefreshCw size={13} /> Refrescar
        </button>
      </div>

      {/* Resumen — indicador clave: cuántas facturas sin acuse (violación DIAN si pasa 72h) */}
      {resumen && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
          <div style={{ background: '#f3f4f6', padding: '6px 12px', borderRadius: 6 }}>
            <b>{resumen.total_facturas}</b> facturas · <b>{fmtMon(resumen.total_monto)}</b>
          </div>
          {resumen.sin_acuse > 0 && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', fontWeight: 600 }}>
              ⚠ {resumen.sin_acuse} sin acuse (030) — DIAN exige enviarlo en 3 días hábiles
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 300 }}>
        <AgGridReact
          rowData={filtradas}
          columnDefs={cols}
          headerHeight={32}
          rowHeight={34}
          loading={loading}
          suppressCellFocus={true}
          defaultColDef={{ resizable: true, sortable: true }}
        />
      </div>

      {/* Modal aplicar evento */}
      {aplicandoEvento && (
        <AplicarEventoModal
          factura={aplicandoEvento}
          onCerrar={() => setAplicandoEvento(null)}
          onExito={() => { setAplicandoEvento(null); cargar(); }}
        />
      )}

      {/* Modal detalle */}
      {verDetalle && (
        <DetalleFacturaRecibida
          id={verDetalle}
          onCerrar={() => setVerDetalle(null)}
          onAplicarEvento={(f) => { setVerDetalle(null); setAplicandoEvento(f); }}
        />
      )}
    </div>
  );
}
