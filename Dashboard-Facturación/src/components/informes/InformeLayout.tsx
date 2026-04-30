import { ReactNode, useRef } from 'react';
import { Printer, RefreshCw, FileText } from 'lucide-react';
import { getEmpresaCache, getConfigImpresion } from '../ConfiguracionSistema';

interface Props {
  titulo: string;
  subtitulo?: string;
  filtros?: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  children: ReactNode;
  empresa?: { nombre: string; nit: string; direccion: string; telefono: string; logo?: string };
}

export function InformeLayout({ titulo, subtitulo, filtros, onRefresh, loading, children, empresa }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const empCache = getEmpresaCache();
  const logo = getConfigImpresion().logo || '';
  const empData = empresa || {
    nombre: empCache.nombre,
    nit: empCache.nit,
    direccion: empCache.direccion,
    telefono: empCache.telefono,
    logo,
  };
  const fechaImp = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const horaImp = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const imprimir = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open('', 'PRINT', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8" />
<title>${titulo}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1f2937; margin: 16mm; }
  h1, h2, h3 { margin: 0; }
  .hdr-emp { text-align: center; margin-bottom: 8px; }
  .hdr-emp .nombre { font-size: 16px; font-weight: 700; }
  .hdr-emp .det { font-size: 10px; color: #555; }
  .hdr-titulo { text-align: center; padding: 6px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; margin: 8px 0 12px; }
  .hdr-titulo h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; }
  .hdr-titulo .sub { font-size: 11px; color: #444; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #000; background: #f3f4f6; font-weight: 700; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  td.num, th.num { text-align: right; font-family: 'Courier New', monospace; }
  td.cen, th.cen { text-align: center; }
  .totales { margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; }
  .totales .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .totales .row.grand { font-weight: 700; font-size: 14px; border-top: 1px solid #000; margin-top: 4px; padding-top: 6px; }
  .seccion-titulo { font-size: 12px; font-weight: 700; background: #e5e7eb; padding: 4px 8px; margin: 12px 0 4px; border-left: 4px solid #7c3aed; }
  .vacio { padding: 40px; text-align: center; color: #999; font-style: italic; }
  .pie { margin-top: 14px; padding-top: 8px; border-top: 1px dashed #999; font-size: 9px; color: #666; text-align: center; }
  @page { size: letter; margin: 12mm; }
  @media print { body { margin: 0; } button { display: none; } }
</style>
</head><body>${html}<div class="pie">Generado el ${fechaImp} a las ${horaImp} — ${empData.nombre}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 200);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#7c3aed" /> {titulo}
          </h2>
          {subtitulo && <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{subtitulo}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onRefresh && (
            <button onClick={onRefresh} disabled={loading}
              style={{ height: 32, padding: '0 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refrescar
            </button>
          )}
          <button onClick={imprimir}
            style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {filtros && (
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {filtros}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Contenido imprimible */}
        <div ref={printRef}>
          <div className="hdr-emp" style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{empData.nombre}</div>
            <div style={{ fontSize: 10, color: '#555' }}>NIT {empData.nit} · {empData.direccion} · Tel. {empData.telefono}</div>
          </div>
          <div className="hdr-titulo" style={{ textAlign: 'center', padding: '6px 0', borderTop: '2px solid #000', borderBottom: '2px solid #000', margin: '8px 0 12px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>{titulo}</h2>
            {subtitulo && <div className="sub" style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{subtitulo}</div>}
          </div>
          <div className="meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginBottom: 8 }}>
            <span>Fecha de impresión: {fechaImp}</span>
            <span>Hora: {horaImp}</span>
          </div>
          {loading ? <div className="vacio" style={{ padding: 40, textAlign: 'center', color: '#999' }}>Cargando...</div> : children}
        </div>
      </div>
    </div>
  );
}

export const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
export const fmtCant = (v: number) => Number(v || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
