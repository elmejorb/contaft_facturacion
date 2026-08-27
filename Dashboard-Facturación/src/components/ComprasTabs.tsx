import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, ShoppingBag, Search } from 'lucide-react';
import { NuevaCompra, type TabStateCompra } from './NuevaCompra';
import { BuscarCompraModal } from './BuscarCompraModal';
import { confirmar } from './ConfirmDialog';

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

interface Tab {
  id: string;
  label: string;
  state: TabStateCompra;
  pedidoN?: number; // Si viene con lápiz de una compra existente
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

  const activeTab = tabs.find(t => t.id === activeTabId);

  const agregarTab = () => {
    tabCounter.current++;
    const newTab: Tab = { id: newTabId(), label: `Compra ${tabCounter.current}`, state: defaultState() };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

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
          onClose={onCompraGuardada}
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
