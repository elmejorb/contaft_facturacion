import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, RefreshCw, Plus, Ban, X } from 'lucide-react';
import toast from 'react-hot-toast';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/movimientos/gastos.php';
const API_CAJAS = 'http://localhost:80/conta-app-backend/api/caja/sesion.php';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function GastosManagement() {
  const [gastos, setGastos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [anios, setAnios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [busqueda, setBusqueda] = useState('');
  const [showNuevo, setShowNuevo] = useState(false);
  const [cajas, setCajas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [porCategoria, setPorCategoria] = useState<Record<string, number>>({});
  // Form
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('Otros');
  const [valor, setValor] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [cedula, setCedula] = useState('');
  const [origen, setOrigen] = useState('caja');
  const [cajaId, setCajaId] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const gridRef = useRef<AgGridReact>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      let url = `${API}?anio=${anio}`;
      if (mes > 0) url += `&mes=${mes}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) { setGastos(d.gastos); setResumen(d.resumen); setAnios(d.anios || []); setCategorias(d.categorias || []); setPorCategoria(d.resumen?.por_categoria || {}); }
    } catch (e) {}
    setLoading(false);
  };

  const cargarCajas = async () => {
    try {
      const r = await fetch(`${API_CAJAS}?cajas=1`);
      const d = await r.json();
      if (d.success) {
        setCajas(d.cajas || []);
        const primera = d.cajas?.find((c: any) => c.sesiones_abiertas > 0);
        if (primera) setCajaId(primera.Id_Caja);
        else if (d.cajas?.length > 0) setCajaId(d.cajas[0].Id_Caja);
      }
    } catch (e) {}
  };

  useEffect(() => { cargar(); cargarCajas(); }, [anio, mes]);

  const guardarGasto = async () => {
    if (!concepto || !(parseInt(valor) > 0)) { toast.error('Concepto y valor requeridos'); return; }
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crear', concepto, valor: parseInt(valor), beneficiario, cedula, origen, caja_id: cajaId, fecha, categoria })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setShowNuevo(false); setConcepto(''); setValor(''); setBeneficiario(''); setCedula('');
        cargar();
      } else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const anularGasto = async (id: number) => {
    if (!confirm('¿Anular este gasto?')) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anular', id })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const cols: ColDef[] = [
    { headerName: 'Comp.', field: 'N_Comprobante', width: 65, cellRenderer: (p: any) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.value}</span> },
    { headerName: 'Fecha', field: 'Fecha', width: 100, sortable: true, cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleDateString('es-CO') : '-' },
    { headerName: 'Beneficiario', field: 'Orden', width: 150, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 500 }}>{p.value || '-'}</span> },
    { headerName: 'Concepto', field: 'Concepto', flex: 1, minWidth: 150 },
    { headerName: 'Categoría', field: 'Categoria', width: 110, sortable: true, cellRenderer: (p: any) => <span style={{ fontSize: 11, fontWeight: 500 }}>{p.value || 'Otros'}</span> },
    { headerName: 'Origen', field: 'Cuentas', width: 70, cellRenderer: (p: any) => {
      const esCaja = (p.value || '').includes('51');
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: esCaja ? '#fef3c7' : '#dbeafe', color: esCaja ? '#d97706' : '#2563eb' }}>
        {esCaja ? 'Caja' : 'Banco'}
      </span>;
    }},
    { headerName: 'Valor', field: 'Valor', width: 120, sortable: true, cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmtMon(p.value)}</span> },
    { headerName: 'Estado', field: 'Estado', width: 80, cellRenderer: (p: any) => {
      const ok = p.value === 'Valida';
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626' }}>{p.value}</span>;
    }},
    { headerName: '', width: 50, sortable: false, cellRenderer: (p: any) => p.data.Estado === 'Valida' ? (
      <button title="Anular" onClick={() => anularGasto(p.data.Id_Egresos)}
        style={{ width: 26, height: 24, border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ban size={13} color="#dc2626" />
      </button>
    ) : null },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Gastos</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Gastos operativos y administrativos</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowNuevo(true)}
            style={{ height: 30, padding: '0 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Nuevo Gasto
          </button>
          <button onClick={cargar}
            style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total Gastos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{resumen.total_gastos || 0}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total Valor</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{fmtMon(resumen.total_valor || 0)}</div>
        </div>
      </div>

      {/* Resumen por categoría */}
      {Object.keys(porCategoria).length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
            <div key={cat} style={{ background: '#fff', borderRadius: 8, padding: '4px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ color: '#6b7280' }}>{cat}:</span>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmtMon(val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          {anios.map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 6px' }}>
          <option value={0}>Todos</option>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ height: 28, paddingLeft: 28, width: 200, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: 'calc(100vh - 380px)', minHeight: 300 }}>
        <AgGridReact ref={gridRef} rowData={gastos} columnDefs={cols} loading={loading} animateRows
          quickFilterText={busqueda} defaultColDef={{ resizable: true }} rowHeight={34} headerHeight={34}
          getRowId={p => String(p.data.Id_Egresos)} pagination paginationPageSize={50} />
      </div>

      {/* Modal nuevo gasto */}
      {showNuevo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowNuevo(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>Nuevo Gasto</span>
              <button onClick={() => setShowNuevo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>FECHA</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>VALOR</label>
                <input type="text" value={valor} onChange={e => setValor(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="$ 0" autoFocus
                  style={{ width: '100%', height: 32, border: '2px solid #dc2626', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CATEGORÍA</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}>
                  {categorias.map((c: any) => <option key={c.Id_Categoria} value={c.Nombre}>{c.Nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CONCEPTO</label>
                <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Detalle del gasto"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>BENEFICIARIO</label>
                <input type="text" value={beneficiario} onChange={e => setBeneficiario(e.target.value)} placeholder="Nombre"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CÉDULA / NIT</label>
                <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} placeholder="Identificación"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>ORIGEN DEL PAGO</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div onClick={() => setOrigen('caja')} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: origen === 'caja' ? '2px solid #d97706' : '2px solid #e5e7eb',
                  background: origen === 'caja' ? '#fffbeb' : '#fff'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: origen === 'caja' ? '#d97706' : '#374151' }}>Caja</div>
                  {origen === 'caja' && (
                    <select value={cajaId} onChange={e => setCajaId(parseInt(e.target.value))}
                      style={{ marginTop: 6, width: '100%', height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11 }}>
                      {cajas.map((c: any) => <option key={c.Id_Caja} value={c.Id_Caja}>{c.Nombre} {c.sesiones_abiertas > 0 ? '(Abierta)' : ''}</option>)}
                    </select>
                  )}
                </div>
                <div onClick={() => setOrigen('banco')} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: origen === 'banco' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                  background: origen === 'banco' ? '#eff6ff' : '#fff'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: origen === 'banco' ? '#2563eb' : '#374151' }}>Banco</div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>Próximamente</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNuevo(false)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarGasto}
                style={{ height: 34, padding: '0 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Registrar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
