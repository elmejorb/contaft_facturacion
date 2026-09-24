import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, ShoppingBag, Search } from 'lucide-react';
import { NuevaCompra, type TabStateCompra } from './NuevaCompra';
import { BuscarCompraModal } from './BuscarCompraModal';
import { confirmar } from './ConfirmDialog';
import toast from 'react-hot-toast';

const API_BORRADORES = 'http://localhost:80/conta-app-backend/api/compras/borradores.php';

// Contenedor de tabs para el módulo Compras — mismo patrón que VentasTabs.
// Cada tab tiene su propio estado (TabStateCompra) mantenido en memoria,
// resolviendo el bug del "borrador único" en localStorage: ahora se pueden
// tener varias compras a medio armar sin colisionar.
//
// Al hacer click en "editar" (lápiz) de una compra existente, se abre en un
// NUEVO tab en vez de reemplazar la compra actual en armado.

const LS_KEY = 'compras_tabs';
// Puente desde PurchasesManagement — cuando el usuario da al lápiz de una
// compra existente, se guarda su Pedido_N aquí y se navega a nueva-compra.
// ComprasTabs lo lee al montar y abre esa compra en un tab NUEVO (sin
// destruir tabs existentes).
const LS_PENDING_EDIT = 'compras_pending_edit_id';
// Puente desde StockBajo — cuando el usuario selecciona productos con stock
// bajo y clickea "Crear Nueva Compra", los items se guardan aquí como array
// JSON. ComprasTabs los detecta al montar, abre un tab nuevo y precarga las
// líneas con cantidad_sugerida (mínimo - existencia, redondeado hacia arriba).
const LS_PRECARGA_COMPRA = 'precarga_compra_stockbajo';

interface Tab {
  id: string;
  label: string;
  state: TabStateCompra;
  pedidoN?: number; // Si viene con lápiz de una compra existente
  // Si el tab viene de "Cargar borrador", guardamos el id para que "Guardar
  // borrador" haga UPDATE (no INSERT). Al guardar la compra real, el
  // borrador se elimina del backend.
  borradorId?: number | null;
}

function newTabId() { return 'ctab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

function defaultState(): TabStateCompra {
  return {
    tipo: 'Crédito',
    dias: 30,
    fecha: new Date().toISOString().slice(0, 10),
    facturaCompra: '',
    proveedor: { id: 0, nombre: '', nit: '' },
    opcionIva: 0,
    lineas: [],
    flete: 0,
    descuento: 0,
    retencion: 0,
  };
}

export function ComprasTabs() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [{ id: newTabId(), label: 'Compra 1', state: defaultState() }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id || '');
  const [showBuscar, setShowBuscar] = useState(false);
  const [showBorradores, setShowBorradores] = useState(false);
  const tabCounter = useRef(tabs.length);

  // Abrir una compra existente en tab nuevo (o activar el tab si ya existe).
  // Reutilizada por el modal "Buscar Compra" y por el flujo del lápiz de
  // PurchasesManagement (a través de LS_PENDING_EDIT).
  const abrirCompraEnTab = useCallback((pedidoN: number) => {
    setTabs(prev => {
      const existing = prev.find(t => t.pedidoN === pedidoN);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const newTab: Tab = {
        id: newTabId(),
        label: `Editar #${pedidoN}`,
        state: defaultState(),
        pedidoN,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
    setShowBuscar(false);
  }, []);

  // Persistir en localStorage — así al cerrar la app las compras a medio armar
  // no se pierden. Cada tab tiene su TabStateCompra guardado.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(tabs)); } catch (e) {}
  }, [tabs]);

  // Al montar, revisar si viene una compra a editar (desde el lápiz de
  // PurchasesManagement). Si sí, abrir un tab NUEVO con esa compra y limpiar
  // la clave del puente para no repetir en próximos montajes.
  useEffect(() => {
    let pendingId: number | null = null;
    try {
      const raw = localStorage.getItem(LS_PENDING_EDIT);
      if (raw) pendingId = parseInt(raw);
    } catch (e) {}
    if (!pendingId || isNaN(pendingId)) return;
    localStorage.removeItem(LS_PENDING_EDIT);
    abrirCompraEnTab(pendingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al montar, revisar si viene una precarga desde StockBajo. Si sí, crear
  // tab nuevo con esos productos ya cargados como líneas. Nueva Compra recibe
  // la precarga a través de la prop `initialProducts` en su tabState.
  const [precargaPendiente, setPrecargaPendiente] = useState<any[] | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PRECARGA_COMPRA);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return;
      localStorage.removeItem(LS_PRECARGA_COMPRA);
      // Crear tab nuevo etiquetado y guardar la precarga para el hijo
      tabCounter.current++;
      const newTab: Tab = {
        id: newTabId(),
        label: `Reposición (${arr.length})`,
        state: defaultState(),
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setPrecargaPendiente(arr);
      toast.success(`${arr.length} productos precargados en Nueva Compra`);
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const agregarTab = () => {
    tabCounter.current++;
    const newTab: Tab = { id: newTabId(), label: `Compra ${tabCounter.current}`, state: defaultState() };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Abrir un borrador cargado desde la BD en un tab nuevo. Si ya hay un tab
  // con ese mismo borradorId (evita duplicar), lo activa.
  const abrirBorradorEnTab = useCallback((borrador: any) => {
    setTabs(prev => {
      const existing = prev.find(t => t.borradorId === borrador.id);
      if (existing) { setActiveTabId(existing.id); return prev; }
      const state: TabStateCompra = {
        tipo: borrador.tipo || 'Crédito',
        dias: Number(borrador.dias) || 30,
        fecha: borrador.fecha || new Date().toISOString().slice(0, 10),
        facturaCompra: borrador.factura_compra || '',
        proveedor: {
          id: Number(borrador.cod_proveedor) || 0,
          nombre: borrador.proveedor_nombre || '',
          nit: borrador.proveedor_nit || '',
        },
        opcionIva: Number(borrador.opcion_iva) || 0,
        lineas: Array.isArray(borrador.lineas) ? borrador.lineas : [],
        flete: Number(borrador.flete) || 0,
        descuento: Number(borrador.descuento) || 0,
        retencion: Number(borrador.retencion) || 0,
      };
      const newTab: Tab = {
        id: newTabId(),
        label: `Borrador #${borrador.id}`,
        state,
        borradorId: borrador.id,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
    setShowBorradores(false);
  }, []);

  const cerrarTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.state.lineas.length > 0 && !tab.pedidoN) {
      if (!await confirmar({
        title: 'Cerrar compra',
        message: '¿Cerrar esta compra en armado? Los datos no guardados se perderán.',
        type: 'warning',
        confirmText: 'Cerrar'
      })) return;
    }
    const newTabs = tabs.filter(t => t.id !== tabId);
    if (newTabs.length === 0) {
      const t: Tab = { id: newTabId(), label: 'Compra 1', state: defaultState() };
      setTabs([t]);
      setActiveTabId(t.id);
      tabCounter.current = 1;
    } else {
      setTabs(newTabs);
      if (activeTabId === tabId) setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // Callback estable para el onStateChange del NuevaCompra activo.
  // El id del tab activo se lee de un ref para no invalidar la callback
  // en cada render (evita re-mount de NuevaCompra).
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const onStateChange = useCallback((newState: TabStateCompra) => {
    setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, state: newState } : t));
  }, []);

  // Cuando NuevaCompra termina de guardar una compra (nueva o edición),
  // reseteamos el tab a una compra vacía. El label vuelve al genérico.
  const onCompraGuardada = useCallback(() => {
    setTabs(prev => prev.map(t => t.id === activeTabIdRef.current
      ? { ...t, state: defaultState(), pedidoN: undefined, label: `Compra ${tabCounter.current}` }
      : t
    ));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Barra de tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexShrink: 0, flexWrap: 'wrap' }}>
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
                boxShadow: t.id === activeTabId ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              <ShoppingBag size={12} />
              <span>{t.label}</span>
              {t.state.lineas.length > 0 && (
                <span style={{
                  background: '#dcfce7', color: '#16a34a', borderRadius: 10,
                  padding: '0 5px', fontSize: 10, fontWeight: 700
                }}>
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
          <button onClick={agregarTab} title="Nueva compra en pestaña separada"
            style={{
              width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 6,
              cursor: 'pointer', background: '#fff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
            <Plus size={14} />
          </button>
        </div>

        {/* Barra contextual — acciones que abren modales sin salir del formulario. */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setShowBorradores(true)}
            title="Cargar una compra que dejaste guardada como borrador en la BD"
            style={{
              height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600,
              border: '1px solid #d8b4fe', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#f3e8ff', color: '#7c3aed', whiteSpace: 'nowrap',
            }}>
            📂 Borradores
          </button>
          <button onClick={() => setShowBuscar(true)}
            title="Buscar y abrir una compra existente en un tab nuevo"
            style={{
              height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600,
              border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#fff', color: '#374151', whiteSpace: 'nowrap',
            }}>
            <Search size={13} /> Buscar Compra
          </button>
        </div>
      </div>

      {/* NuevaCompra del tab activo. El key={activeTab.id} garantiza que
          cambiar de tab crea instancia nueva (el estado va por initialState). */}
      {activeTab && (
        <NuevaCompra
          key={activeTab.id}
          initialState={activeTab.state}
          onStateChange={onStateChange}
          pedidoEditar={activeTab.pedidoN}
          borradorInicialId={activeTab.borradorId ?? null}
          precargaProductos={precargaPendiente || undefined}
          onPrecargaConsumida={() => setPrecargaPendiente(null)}
          onClose={onCompraGuardada}
        />
      )}

      {/* Modal de borradores — lista los borradores guardados en la BD y
          permite cargarlos en un tab nuevo o eliminarlos. */}
      {showBorradores && (
        <ModalBorradores
          onClose={() => setShowBorradores(false)}
          onCargar={abrirBorradorEnTab}
        />
      )}

      {/* Modal buscar compra. Al seleccionar una, se abre en un tab nuevo. */}
      {showBuscar && (
        <BuscarCompraModal
          onClose={() => setShowBuscar(false)}
          onAbrir={abrirCompraEnTab}
        />
      )}
    </div>
  );
}

// ============================================================
// Modal listado de borradores
// ============================================================
interface ModalBorradoresProps {
  onClose: () => void;
  onCargar: (borrador: any) => void;
}

function ModalBorradores({ onClose, onCargar }: ModalBorradoresProps) {
  const [borradores, setBorradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargandoId, setCargandoId] = useState<number | null>(null);

  const cargarLista = async () => {
    setLoading(true);
    try {
      const r = await fetch(API_BORRADORES + '?listar=1');
      const d = await r.json();
      if (d.success) setBorradores(d.borradores || []);
      else toast.error(d.message || 'No se pudieron listar los borradores');
    } catch {
      toast.error('Error de conexión al listar borradores');
    }
    setLoading(false);
  };

  useEffect(() => { cargarLista(); }, []);

  const cargar = async (id: number) => {
    setCargandoId(id);
    try {
      const r = await fetch(API_BORRADORES, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cargar', id }),
      });
      const d = await r.json();
      if (d.success) onCargar(d.borrador);
      else toast.error(d.message || 'No se pudo cargar el borrador');
    } catch {
      toast.error('Error de conexión');
    }
    setCargandoId(null);
  };

  const eliminar = async (id: number) => {
    if (!await confirmar({
      title: 'Eliminar borrador',
      message: '¿Eliminar este borrador de compras? No se puede recuperar.',
      type: 'warning', confirmText: 'Eliminar',
    })) return;
    try {
      const r = await fetch(API_BORRADORES, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Borrador eliminado'); cargarLista(); }
      else toast.error(d.message || 'Error');
    } catch { toast.error('Error de conexión'); }
  };

  const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 720, maxHeight: '80vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>📂 Borradores de compra</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
              Compras en armado guardadas en el servidor. Se conservan aunque cierres la app o cambies de equipo.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
          ) : borradores.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No hay borradores guardados. Cuando armes una compra grande, pulsa el botón <b style={{ color: '#7c3aed' }}>💾 Guardar Borrador</b> para no perderla.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: 50 }}>#</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: 100 }}>Total</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 60 }}>Líneas</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 120 }}>Modificado</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {borradores.map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#7c3aed' }}>#{b.id}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ fontWeight: 600, color: '#374151' }}>{b.proveedor_nombre || 'Sin proveedor'}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>
                        {b.tipo} · {b.factura_compra ? `Fra ${b.factura_compra}` : 'sin factura'}
                        {b.nombre && b.nombre !== b.proveedor_nombre ? ` · ${b.nombre}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(Number(b.total) || 0)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                        {b.lineas_count || 0}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
                      {b.fecha_modificacion ? new Date(b.fecha_modificacion).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button onClick={() => cargar(b.id)} disabled={cargandoId === b.id}
                        style={{ height: 26, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: cargandoId === b.id ? 'wait' : 'pointer', marginRight: 4 }}>
                        {cargandoId === b.id ? '...' : 'Cargar'}
                      </button>
                      <button onClick={() => eliminar(b.id)}
                        style={{ height: 26, padding: '0 8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
