import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, FileText, BookOpen, FolderOpen, Trash2, ShoppingCart, ArrowRight, Search, Printer } from 'lucide-react';
import { NuevaVenta, type TabState } from './NuevaVenta';
import toast from 'react-hot-toast';
import { getConfigImpresion } from './ConfiguracionSistema';
import { imprimirFactura, buildDatosFactura } from './ImpresionFactura';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/ventas';
const LS_KEY = 'ventas_tabs';
const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface Tab {
  id: string;
  label: string;
  state: TabState;
  dbId?: number; // id_fac_ab o id_cotizacion si viene de BD
  tipo?: 'abierta' | 'cotizacion';
}

function newTabId() { return 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

function defaultState(): TabState {
  return {
    tipo: 'Contado', dias: 0, listaPrecio: 1, descuentoGlobal: 0,
    cliente: { id: 130500, nombre: 'VENTAS AL CONTADO', nit: '0', tel: '0', dir: '-', cupo: 0, esCliente: false },
    lineas: []
  };
}

export function VentasTabs() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [{ id: newTabId(), label: 'Factura 1', state: defaultState() }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id || '');
  const [showGuardadas, setShowGuardadas] = useState<'abiertas' | 'cotizaciones' | null>(null);
  const [listaGuardadas, setListaGuardadas] = useState<any[]>([]);
  const [filtroGuardadas, setFiltroGuardadas] = useState('');
  const [showConfirmNueva, setShowConfirmNueva] = useState(false);
  const tabCounter = useRef(tabs.length);

  // Persistir en localStorage
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(tabs)); } catch (e) {}
  }, [tabs]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Agregar nueva tab
  const agregarTab = () => {
    tabCounter.current++;
    const newTab: Tab = { id: newTabId(), label: `Factura ${tabCounter.current}`, state: defaultState() };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Cerrar tab
  const cerrarTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.state.lineas.length > 0) {
      if (!await confirmar({ title: 'Cerrar factura', message: '¿Desea cerrar esta factura? Los datos no guardados se perderán.', type: 'warning', confirmText: 'Cerrar' })) return;
    }
    const newTabs = tabs.filter(t => t.id !== tabId);
    if (newTabs.length === 0) {
      const t: Tab = { id: newTabId(), label: 'Factura 1', state: defaultState() };
      setTabs([t]);
      setActiveTabId(t.id);
      tabCounter.current = 1;
    } else {
      setTabs(newTabs);
      if (activeTabId === tabId) setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // Actualizar state de la tab activa
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const onStateChange = useCallback((newState: any) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabIdRef.current) return t;
      const updated: Tab = { ...t, state: newState };
      // Sincroniza el label de la pestaña con el tipo de documento elegido.
      // Si ya está persistida en BD (dbId), respetamos su label fijo (#id).
      if (newState.tipoDocumento && !t.dbId) {
        const docLabels: Record<string, string> = {
          pos: 'Factura',
          electronica: 'F. Electrónica',
          soporte: 'Doc. Soporte',
          cotizacion: 'Cotización',
        };
        const num = t.label.match(/\d+$/)?.[0] || '';
        updated.label = `${docLabels[newState.tipoDocumento] || 'Factura'} ${num}`.trim();
        // Si arrancó a editar como cotización, marcamos el `tipo` de tab
        // para que el botón "Imprimir" y el flujo de guardar usen la lógica
        // correcta aunque todavía no exista la fila en BD.
        if (newState.tipoDocumento === 'cotizacion') updated.tipo = 'cotizacion';
      }
      return updated;
    }));
  }, []);

  // Cuando se finaliza una venta exitosamente, limpiar la tab
  const onFacturaCreada = useCallback((factN: number) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, state: defaultState(), dbId: undefined, tipo: undefined, label: `Factura ${tabCounter.current}` } : t));
  }, [activeTabId]);

  // Guardar como factura abierta
  const guardarAbierta = async () => {
    if (!activeTab || activeTab.state.lineas.length === 0) return;
    const s = activeTab.state;
    try {
      const r = await fetch(`${API}/facturas-abiertas.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTab.tipo === 'abierta' ? (activeTab.dbId || 0) : 0,
          termino: s.tipo, dias: s.dias, codigo_cli: s.cliente.id,
          identificacion_cli: s.cliente.nit, nombres_cli: s.cliente.nombre,
          lista_precio: s.listaPrecio - 1, total_factura: s.lineas.reduce((a, l) => a + l.Subtotal, 0) - s.descuentoGlobal,
          items: s.lineas.map(l => ({ items: l.Items, cantidad: l.Cantidad, precio: l.PrecioVenta, descuento: l.Descuento }))
        })
      });
      const d = await r.json();
      if (d.success) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, dbId: d.id, tipo: 'abierta', label: `Abierta #${d.id}` } : t));
        toast.success('Factura abierta guardada');
      }
    } catch (e) { toast.error('Error al guardar'); }
  };

  // Cambia el modo de la pestaña activa a "cotización" sin guardar nada.
  // NuevaVenta lee tipoDocumento de initialState y reacciona al cambio:
  // - El selector DOCUMENTO arriba pasa a "Cotización".
  // - El botón Finalizar pasa a "Guardar Cotización" (azul).
  // - Se omiten validaciones de cupo, stock, FE, etc.
  // El guardado real ocurre cuando el usuario pulsa el botón Finalizar
  // (que llama a onCotizar → guardarCotizacion).
  const iniciarCotizacion = () => {
    if (!activeTab) return;
    // Si ya está en modo cotización y tiene líneas, llamamos directamente
    // a guardar — el usuario ya conoce el atajo y espera que guarde.
    if (activeTab.state.tipoDocumento === 'cotizacion' && activeTab.state.lineas.length > 0) {
      guardarCotizacion();
      return;
    }
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      const num = t.label.match(/\d+$/)?.[0] || '';
      return {
        ...t,
        state: { ...t.state, tipoDocumento: 'cotizacion' } as TabState,
        tipo: 'cotizacion',
        label: `Cotización ${num}`.trim(),
      };
    }));
  };

  // Imprime una cotización a partir de su state + dbId (el "número" de la
  // cotización es el id_cotizacion de la BD). Se usa desde 3 lugares: tras
  // guardar si el toggle de auto-imprimir está activo, desde el botón
  // "Imprimir" de la pestaña activa, y desde el listado de Cotizaciones.
  const imprimirCotizacionDeState = (state: TabState, dbId: number) => {
    const datosImp = buildDatosFactura(
      dbId, state.lineas, state.cliente,
      state.tipo, state.dias, state.descuentoGlobal,
      0, 0, 0, 0, 'Efectivo', true
    );
    imprimirFactura(datosImp);
  };

  // Guardar como cotización
  const guardarCotizacion = async () => {
    if (!activeTab || activeTab.state.lineas.length === 0) return;
    const s = activeTab.state;
    try {
      const r = await fetch(`${API}/cotizaciones.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTab.tipo === 'cotizacion' ? (activeTab.dbId || 0) : 0,
          termino: s.tipo === 'Contado' ? 0 : 1, dias: s.dias, codigo_cli: s.cliente.id,
          nombre_cliente: s.cliente.nombre, telefono_cli: s.cliente.tel,
          total_factura: s.lineas.reduce((a, l) => a + l.Subtotal, 0) - s.descuentoGlobal,
          items: s.lineas.map(l => ({ items: l.Items, cantidad: l.Cantidad, precio: l.PrecioVenta, descuento: l.Descuento }))
        })
      });
      const d = await r.json();
      if (d.success) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, dbId: d.id, tipo: 'cotizacion', label: `Cotización #${d.id}` } : t));
        toast.success('Cotización guardada');
        if (getConfigImpresion().imprimirCotizacion) {
          imprimirCotizacionDeState(s, d.id);
        }
      }
    } catch (e) { toast.error('Error al guardar'); }
  };

  // Imprimir directamente desde el listado de Cotizaciones guardadas.
  // El listado solo trae cabeceras → necesitamos fetch del detalle.
  const imprimirCotizacionPorId = async (id: number) => {
    try {
      const r = await fetch(`${API}/cotizaciones.php?id=${id}`);
      const d = await r.json();
      if (!d.success) { toast.error('No se pudo cargar la cotización'); return; }
      const fac = d.cotizacion;
      const detalle = d.detalle || [];
      const lineas = detalle.map((det: any, i: number) => ({
        id: Date.now() + i,
        Items: det.item_pro,
        Codigo: det.Codigo || '',
        Nombre: det.Nombres_Articulo || '',
        Existencia: parseFloat(det.Existencia) || 0,
        Cantidad: parseFloat(det.cant_pro) || 1,
        PrecioCosto: parseFloat(det.Precio_Costo) || 0,
        PrecioVenta: parseFloat(det.precio_v) || 0,
        Iva: parseFloat(det.Iva) || 0,
        Descuento: parseFloat(det.descuento) || 0,
        Subtotal: (parseFloat(det.cant_pro) || 1) * (parseFloat(det.precio_v) || 0) - (parseFloat(det.descuento) || 0)
      }));
      const clienteId = parseInt(fac.codigo_cli) || 130500;
      const state: TabState = {
        tipo: parseInt(fac.termino) === 1 ? 'Crédito' : 'Contado',
        dias: parseInt(fac.dias) || 0,
        listaPrecio: 1,
        descuentoGlobal: 0,
        cliente: {
          id: clienteId,
          nombre: fac.nombre_cliente || 'VENTAS AL CONTADO',
          nit: fac.identificacion_cli || '0',
          tel: fac.telefono_cli || '0',
          dir: '-', cupo: 0, esCliente: clienteId !== 130500
        },
        lineas
      };
      imprimirCotizacionDeState(state, id);
    } catch (e) { toast.error('Error al imprimir'); }
  };

  // Cargar guardada (abierta o cotización)
  const cargarGuardada = async (tipoG: 'abiertas' | 'cotizaciones', id: number) => {
    try {
      const url = tipoG === 'abiertas' ? `${API}/facturas-abiertas.php?id=${id}` : `${API}/cotizaciones.php?id=${id}`;
      const r = await fetch(url);
      const d = await r.json();
      if (!d.success) return;

      const detalle = d.detalle || [];
      const fac = tipoG === 'abiertas' ? d.factura : d.cotizacion;

      const lineas = detalle.map((det: any, i: number) => ({
        id: Date.now() + i,
        Items: det.item_pro,
        Codigo: det.Codigo || '',
        Nombre: det.Nombres_Articulo || '',
        Existencia: parseFloat(det.Existencia) || 0,
        Cantidad: parseFloat(det.cant_pro) || 1,
        PrecioCosto: parseFloat(det.Precio_Costo) || 0,
        PrecioVenta: parseFloat(det.precio_v) || 0,
        Iva: parseFloat(det.Iva) || 0,
        Descuento: parseFloat(det.descuento) || 0,
        Subtotal: (parseFloat(det.cant_pro) || 1) * (parseFloat(det.precio_v) || 0) - (parseFloat(det.descuento) || 0)
      }));

      const clienteId = parseInt(fac.codigo_cli) || 130500;
      const clienteNombre = tipoG === 'abiertas' ? fac.nombres_cli : fac.nombre_cliente;
      const newState: TabState = {
        tipo: tipoG === 'abiertas' ? (fac.termino || 'Contado') : (parseInt(fac.termino) === 1 ? 'Crédito' : 'Contado'),
        dias: parseInt(fac.dias) || 0,
        listaPrecio: tipoG === 'abiertas' ? (parseInt(fac.lista_precio) + 1) : 1,
        descuentoGlobal: 0,
        cliente: { id: clienteId, nombre: clienteNombre || 'VENTAS AL CONTADO', nit: fac.identificacion_cli || '0', tel: fac.telefono_cli || '0', dir: '-', cupo: 0, esCliente: clienteId !== 130500 },
        lineas
      };

      const dbId = tipoG === 'abiertas' ? fac.id_fac_ab : fac.id_cotizacion;
      const label = tipoG === 'abiertas' ? `Abierta #${dbId}` : `Cotiz. #${dbId}`;
      const tipoTab = tipoG === 'abiertas' ? 'abierta' as const : 'cotizacion' as const;

      // Buscar si ya hay una tab con este id
      const existing = tabs.find(t => t.dbId === dbId && t.tipo === tipoTab);
      if (existing) {
        setActiveTabId(existing.id);
      } else {
        const newTab: Tab = { id: newTabId(), label, state: newState, dbId, tipo: tipoTab };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
      setShowGuardadas(null);
    } catch (e) { toast.error('Error al cargar'); }
  };

  // Eliminar guardada
  const eliminarGuardada = async (tipoG: 'abiertas' | 'cotizaciones', id: number) => {
    if (!await confirmar({ title: 'Eliminar', message: '¿Eliminar esta ' + (tipoG === 'abiertas' ? 'factura abierta' : 'cotización') + '?', type: 'danger', confirmText: 'Eliminar' })) return;
    const url = tipoG === 'abiertas' ? `${API}/facturas-abiertas.php` : `${API}/cotizaciones.php`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    abrirListaGuardadas(tipoG);
    // Si hay una tab abierta con ese id, quitarle el dbId
    setTabs(prev => prev.map(t => t.dbId === id && t.tipo === (tipoG === 'abiertas' ? 'abierta' : 'cotizacion') ? { ...t, dbId: undefined, tipo: undefined } : t));
  };

  // Abrir modal de guardadas
  const abrirListaGuardadas = async (tipoG: 'abiertas' | 'cotizaciones') => {
    setShowGuardadas(tipoG);
    setFiltroGuardadas('');
    const url = tipoG === 'abiertas' ? `${API}/facturas-abiertas.php` : `${API}/cotizaciones.php`;
    const r = await fetch(url);
    const d = await r.json();
    setListaGuardadas(tipoG === 'abiertas' ? (d.facturas || []) : (d.cotizaciones || []));
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600, border: '1px solid #e5e7eb',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    background: active ? '#f3e8ff' : '#fff', color: active ? '#7c3aed' : '#374151', whiteSpace: 'nowrap'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Barra de tabs + acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'auto', minWidth: 0 }}>
          {tabs.map(t => (
            <div key={t.id}
              onClick={() => setActiveTabId(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px',
                borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: t.id === activeTabId ? '#fff' : '#f3f4f6',
                color: t.id === activeTabId ? '#7c3aed' : '#6b7280',
                borderBottom: t.id === activeTabId ? '2px solid #7c3aed' : '2px solid transparent',
                boxShadow: t.id === activeTabId ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}>
              {t.tipo === 'cotizacion' ? <BookOpen size={12} /> : t.tipo === 'abierta' ? <FolderOpen size={12} /> : <ShoppingCart size={12} />}
              <span>{t.label}</span>
              {t.state.lineas.length > 0 && (
                <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                  {t.state.lineas.length}
                </span>
              )}
              {tabs.length > 1 && (
                <button onClick={e => { e.stopPropagation(); cerrarTab(t.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, marginLeft: 2 }}>
                  <X size={12} color="#9ca3af" />
                </button>
              )}
            </div>
          ))}
          <button onClick={agregarTab} title="Nueva factura"
            style={{ width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={14} />
          </button>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={guardarAbierta} disabled={!activeTab || activeTab.state.lineas.length === 0}
            title="Guardar como factura temporal" style={btnStyle()}>
            <FolderOpen size={13} /> Guardar Temp.
          </button>
          <button onClick={iniciarCotizacion} disabled={!activeTab}
            title={
              activeTab?.state.tipoDocumento === 'cotizacion'
                ? (activeTab.state.lineas.length > 0 ? 'Guardar esta cotización' : 'Ya estás en modo cotización')
                : 'Cambiar esta pestaña a modo cotización'
            }
            style={btnStyle(activeTab?.state.tipoDocumento === 'cotizacion')}>
            <BookOpen size={13} /> {
              activeTab?.state.tipoDocumento === 'cotizacion' && activeTab.state.lineas.length > 0
                ? 'Guardar Cotización'
                : 'Nueva Cotización'
            }
          </button>
          {activeTab?.tipo === 'cotizacion' && activeTab.dbId && (
            <button onClick={() => imprimirCotizacionDeState(activeTab.state, activeTab.dbId!)}
              disabled={activeTab.state.lineas.length === 0}
              title="Imprimir esta cotización"
              style={{ ...btnStyle(), background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
              <Printer size={13} /> Imprimir
            </button>
          )}
          <button onClick={() => abrirListaGuardadas('abiertas')}
            title="Facturas abiertas guardadas" style={btnStyle()}>
            <FolderOpen size={13} /> Abiertas
          </button>
          <button onClick={() => abrirListaGuardadas('cotizaciones')}
            title="Cotizaciones guardadas" style={btnStyle()}>
            <BookOpen size={13} /> Cotizaciones
          </button>
        </div>
      </div>

      {/* NuevaVenta activa */}
      {activeTab && (
        <NuevaVenta
          key={activeTab.id}
          initialState={activeTab.state}
          onStateChange={onStateChange}
          onFacturaCreada={onFacturaCreada}
          onCotizar={guardarCotizacion}
        />
      )}

      {/* Modal lista de guardadas */}
      {showGuardadas && (() => {
        const filtro = filtroGuardadas.toLowerCase();
        const listaFiltrada = filtro
          ? listaGuardadas.filter(i => {
              const nombre = (i.NombreCliente || i.nombres_cli || i.nombre_cliente || '').toLowerCase();
              const id = String(showGuardadas === 'abiertas' ? i.id_fac_ab : i.id_cotizacion);
              return nombre.includes(filtro) || id.includes(filtro);
            })
          : listaGuardadas;
        const totalMonto = listaFiltrada.reduce((s, i) => s + (parseFloat(i.total_factura) || 0), 0);
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowGuardadas(null)} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 700, maxHeight: '80vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: '16px 24px', borderBottom: '3px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>
                    {showGuardadas === 'abiertas' ? 'Facturas Abiertas' : 'Cotizaciones'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {listaFiltrada.length} de {listaGuardadas.length} registro(s) — Total: <span style={{ fontWeight: 700, color: '#7c3aed' }}>{fmtMon(totalMonto)}</span>
                  </div>
                </div>
                <button onClick={() => setShowGuardadas(null)} style={{ width: 32, height: 32, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Buscador */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input type="text" placeholder="Buscar por cliente o ID..."
                    value={filtroGuardadas} onChange={e => setFiltroGuardadas(e.target.value)} autoFocus
                    style={{ width: '100%', height: 34, paddingLeft: 34, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              {/* Contenido */}
              <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {listaFiltrada.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <FolderOpen size={40} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
                    <div style={{ color: '#9ca3af', fontSize: 14 }}>
                      {listaGuardadas.length === 0 ? `No hay ${showGuardadas === 'abiertas' ? 'facturas abiertas' : 'cotizaciones'}` : 'Sin resultados para esta búsqueda'}
                    </div>
                  </div>
                ) : (
                  listaFiltrada.map((item: any) => {
                    const id = showGuardadas === 'abiertas' ? item.id_fac_ab : item.id_cotizacion;
                    const nombre = item.NombreCliente || item.nombres_cli || item.nombre_cliente || '-';
                    const total = parseFloat(item.total_factura) || 0;
                    const fecha = item.fecha_hora_creado || item.fecha || '-';
                    const fechaCorta = fecha.split(' ')[0];
                    const horaCorta = fecha.split(' ')[1]?.substring(0, 5) || '';
                    return (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px', margin: '0 8px',
                        borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s'
                      }}
                        onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseOut={e => (e.currentTarget.style.background = '')}
                      >
                        {/* Icono */}
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: showGuardadas === 'abiertas' ? '#f3e8ff' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {showGuardadas === 'abiertas' ? <FolderOpen size={18} color="#7c3aed" /> : <BookOpen size={18} color="#2563eb" />}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>#{id}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            {fechaCorta}{horaCorta ? ` a las ${horaCorta}` : ''}
                          </div>
                        </div>

                        {/* Total */}
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', flexShrink: 0, minWidth: 100, textAlign: 'right' }}>
                          {fmtMon(total)}
                        </div>

                        {/* Acciones */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {showGuardadas === 'cotizaciones' && (
                            <button onClick={e => { e.stopPropagation(); imprimirCotizacionPorId(id); }}
                              title="Imprimir cotización"
                              style={{ height: 30, width: 30, background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Printer size={13} color="#1d4ed8" />
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); cargarGuardada(showGuardadas!, id); }}
                            title="Abrir en nueva pestaña"
                            style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ArrowRight size={13} /> Abrir
                          </button>
                          <button onClick={e => { e.stopPropagation(); eliminarGuardada(showGuardadas!, id); }}
                            title="Eliminar"
                            style={{ height: 30, width: 30, background: '#fff', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} color="#dc2626" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
