import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, themeQuartz } from 'ag-grid-community';
import { Package2, Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/informes';

interface ProduccionDetalle {
  id: number; Fecha: string; Items: number;
  Codigo: string; articulo: string;
  cantidad: number; costo_total: string; costo_unit: string;
  motivo: string;
}
interface ProduccionResumen {
  clave: string; descripcion: string;
  cantidad: number; costo_total: number; num_entradas: number;
}

const theme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff', headerTextColor: '#6b21a8',
  oddRowBackgroundColor: '#fafafa', rowHoverColor: '#f5f3ff',
  fontFamily: 'inherit', fontSize: 12,
  headerFontSize: 11, headerFontWeight: 700,
});

const fmtMon = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');
const fmtFecha = (s: string) => s ? new Date(s.replace(' ', 'T')).toLocaleString('es-CO', { year:'2-digit', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-';

export default function InformeProduccionDia() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [agrupar, setAgrupar] = useState<'articulo' | 'fecha'>('articulo');
  const [detalle, setDetalle] = useState<ProduccionDetalle[]>([]);
  const [resumen, setResumen] = useState<ProduccionResumen[]>([]);
  const [totales, setTotales] = useState<{ num_entradas: number; cantidad_total: number; costo_total: number }>({ num_entradas: 0, cantidad_total: 0, costo_total: 0 });
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await fetch(`${API}/produccion-dia.php?desde=${desde}&hasta=${hasta}&agrupar=${agrupar}`);
      const d = await r.json();
      if (d.success) {
        setDetalle(d.detalle || []);
        setResumen(d.resumen || []);
        setTotales(d.totales || { num_entradas: 0, cantidad_total: 0, costo_total: 0 });
      } else toast.error(d.message || 'Error');
    } catch (e) { toast.error('Error de red'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const colsResumen: ColDef[] = [
    { headerName: agrupar === 'articulo' ? 'Código' : 'Fecha', field: 'clave', width: 120 },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 220 },
    { headerName: 'Cantidad', field: 'cantidad', width: 110, cellStyle: { textAlign: 'right', fontWeight: 700 } },
    { headerName: 'Entradas', field: 'num_entradas', width: 90, cellStyle: { textAlign: 'center', color: '#6b7280' } },
    { headerName: 'Costo total', field: 'costo_total', width: 130, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => fmtMon(p.value || 0) },
  ];

  const colsDetalle: ColDef[] = [
    { headerName: 'Fecha', field: 'Fecha', width: 140, valueFormatter: (p: any) => fmtFecha(p.value) },
    { headerName: 'Código', field: 'Codigo', width: 110 },
    { headerName: 'Artículo', field: 'articulo', flex: 1, minWidth: 200, filter: true, sortable: true },
    { headerName: 'Cantidad', field: 'cantidad', width: 100, cellStyle: { textAlign: 'right', fontWeight: 700 } },
    { headerName: 'Costo unit', field: 'costo_unit', width: 120, cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => fmtMon(parseFloat(p.value) || 0) },
    { headerName: 'Costo total', field: 'costo_total', width: 130, cellStyle: { textAlign: 'right', fontWeight: 600 },
      cellRenderer: (p: any) => fmtMon(parseFloat(p.value) || 0) },
    { headerName: 'Motivo', field: 'motivo', flex: 1, minWidth: 200, filter: true },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package2 size={24} color="#7c3aed" /> Producción del Día
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Resumen de entradas al inventario (fabricación propia). Útil para medir productividad.</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, background: '#fff', padding: 12, borderRadius: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ height: 32, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ height: 32, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Agrupar por</label>
          <select value={agrupar} onChange={e => setAgrupar(e.target.value as any)}
            style={{ height: 32, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <option value="articulo">Artículo</option>
            <option value="fecha">Fecha</option>
          </select>
        </div>
        <button onClick={cargar} disabled={cargando}
          style={{ height: 32, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Consultar
        </button>
      </div>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 14, background: '#f3e8ff', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 600 }}>Entradas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#6b21a8' }}>{totales.num_entradas}</div>
        </div>
        <div style={{ padding: 14, background: '#dcfce7', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Unidades producidas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#15803d' }}>{totales.cantidad_total}</div>
        </div>
        <div style={{ padding: 14, background: '#dbeafe', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Costo total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1e40af' }}>{fmtMon(totales.costo_total)}</div>
        </div>
      </div>

      {/* Resumen agrupado */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Resumen por {agrupar}</h3>
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: 260 }}>
          <AgGridReact theme={theme} rowData={resumen} columnDefs={colsResumen}
            rowHeight={34} headerHeight={32}
            overlayNoRowsTemplate='<span style="color:#9ca3af;font-size:13px;">Sin producción en el rango</span>' />
        </div>
      </div>

      {/* Detalle */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Detalle de entradas</h3>
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: 300 }}>
          <AgGridReact theme={theme} rowData={detalle} columnDefs={colsDetalle}
            rowHeight={34} headerHeight={32} />
        </div>
      </div>
    </div>
  );
}
