import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';
import appIcon from '../assets/icon.png';
import pkg from '../../package.json';
const APP_VERSION = pkg.version;
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Bell,
  Mail,
  Maximize2,
  User,
  Inbox,
  ClipboardList,
  Settings,
  HeadphonesIcon,
  ChevronRight,
  ChevronDown,
  Wallet,
  Receipt,
  Tags,
  FileText,
  List,
  Hash,
  Send,
  DollarSign,
  Lock,
  CreditCard,
  Cake,
  Crown,
  Boxes,
  Home,
  CalendarClock,
  AlertTriangle,
  Gift,
  Smartphone,
  CalendarDays,
  Warehouse
} from 'lucide-react';
// LIGEROS (necesarios en el arranque) — imports estáticos
import { PantallaInicio } from './PantallaInicio';
import { NotificacionEmergente } from './NotificacionEmergente';
import { DashboardVendedor } from './DashboardVendedor';
import { useNotificaciones } from '../hooks/useNotificaciones';
import { useAutoSyncVendedores } from '../hooks/useAutoSyncVendedores';
import { useEntitlements } from '../hooks/useEntitlements';
import { useVendedoresConfig } from '../hooks/useVendedoresConfig';
import { useStockBajoCount } from '../hooks/useStockBajoCount';
import { useCumpleanosHoy } from '../hooks/useCumpleanosHoy';
// Estos exports NO son componentes (funciones/consts) → deben ser estáticos.
// Se usan en efectos y helpers fuera del área de rendering perezoso.
import { saveEmpresaCache, getConfigImpresion, saveConfigImpresion } from './ConfiguracionSistema';

// PESADOS (usan AG Grid, xlsx, recharts, tabs enteros) — lazy con code-splitting.
// Cada uno se descarga cuando el usuario navega a esa sección. Reduce el bundle
// inicial y arranca más rápido, sobre todo en Celeron.
const IncomeOverview = lazy(() => import('./IncomeOverview').then(m => ({ default: m.IncomeOverview })));
const ProductsManagement = lazy(() => import('./ProductsManagement').then(m => ({ default: m.ProductsManagement })));
const CustomersManagement = lazy(() => import('./CustomersManagement').then(m => ({ default: m.CustomersManagement })));
const ProveedoresManagement = lazy(() => import('./ProveedoresManagement').then(m => ({ default: m.ProveedoresManagement })));
const ProductosProveedor = lazy(() => import('./ProductosProveedor').then(m => ({ default: m.ProductosProveedor })));
const VentasTabs = lazy(() => import('./VentasTabs').then(m => ({ default: m.VentasTabs })));
const PurchasesManagement = lazy(() => import('./PurchasesManagement').then(m => ({ default: m.PurchasesManagement })));
const SalesManagement = lazy(() => import('./SalesManagement').then(m => ({ default: m.SalesManagement })));
const VentasPorTipoPago = lazy(() => import('./VentasPorTipoPago').then(m => ({ default: m.VentasPorTipoPago })));
const FacturacionElectronica = lazy(() => import('./FacturacionElectronica').then(m => ({ default: m.FacturacionElectronica })));
const FacturasRecibidas = lazy(() => import('./FacturasRecibidas').then(m => ({ default: m.FacturasRecibidas })));
const CajaRegistradora = lazy(() => import('./CajaRegistradora').then(m => ({ default: m.CajaRegistradora })));
const HistorialCajas = lazy(() => import('./HistorialCajas').then(m => ({ default: m.HistorialCajas })));
const ListadoPagosClientes = lazy(() => import('./ListadoPagos').then(m => ({ default: m.ListadoPagosClientes })));
const ListadoPagosProveedores = lazy(() => import('./ListadoPagos').then(m => ({ default: m.ListadoPagosProveedores })));
const GastosManagement = lazy(() => import('./GastosManagement').then(m => ({ default: m.GastosManagement })));
const BancosManagement = lazy(() => import('./BancosManagement').then(m => ({ default: m.BancosManagement })));
const ConfigCategoriasGasto = lazy(() => import('./ConfigCategoriasGasto').then(m => ({ default: m.ConfigCategoriasGasto })));
const ConfigRetenciones = lazy(() => import('./ConfigRetenciones').then(m => ({ default: m.ConfigRetenciones })));
const ConfigEtiquetas = lazy(() => import('./ConfigEtiquetas').then(m => ({ default: m.ConfigEtiquetas })));
const ConfigCajas = lazy(() => import('./ConfigCajas').then(m => ({ default: m.ConfigCajas })));
const ConfigServidor = lazy(() => import('./ConfigServidor').then(m => ({ default: m.ConfigServidor })));
const ConfigPermisos = lazy(() => import('./ConfigPermisos').then(m => ({ default: m.ConfigPermisos })));
const InventarioManagement = lazy(() => import('./InventarioManagement').then(m => ({ default: m.InventarioManagement })));
const DiagnosticoInventario = lazy(() => import('./DiagnosticoInventario').then(m => ({ default: m.DiagnosticoInventario })));
const AuditoriaInventario = lazy(() => import('./AuditoriaInventario').then(m => ({ default: m.AuditoriaInventario })));
const CategoriasManagement = lazy(() => import('./CategoriasManagement').then(m => ({ default: m.CategoriasManagement })));
const ConteoInventario = lazy(() => import('./ConteoInventario').then(m => ({ default: m.ConteoInventario })));
const FamiliasProducto = lazy(() => import('./FamiliasProducto').then(m => ({ default: m.FamiliasProducto })));
const DistribuirProductos = lazy(() => import('./DistribuirProductos').then(m => ({ default: m.DistribuirProductos })));
const StockBajo = lazy(() => import('./StockBajo').then(m => ({ default: m.StockBajo })));
const NotasArticulo = lazy(() => import('./NotasArticulo').then(m => ({ default: m.NotasArticulo })));
const LotesPorVencer = lazy(() => import('./LotesPorVencer').then(m => ({ default: m.LotesPorVencer })));
const MovsDirectos = lazy(() => import('./MovsDirectos').then(m => ({ default: m.MovsDirectos })));
const InformesHub = lazy(() => import('./informes/InformesHub').then(m => ({ default: m.InformesHub })));
const ConfiguracionSistema = lazy(() => import('./ConfiguracionSistema').then(m => ({ default: m.ConfiguracionSistema })));
const FinanciacionesManagement = lazy(() => import('./FinanciacionesManagement').then(m => ({ default: m.FinanciacionesManagement })));
const BackupBD = lazy(() => import('./BackupBD').then(m => ({ default: m.BackupBD })));
const MantenimientoBD = lazy(() => import('./MantenimientoBD').then(m => ({ default: m.MantenimientoBD })));
const AnticiposClientes = lazy(() => import('./AnticiposClientes').then(m => ({ default: m.AnticiposClientes })));
const DatosEmpresa = lazy(() => import('./DatosEmpresa').then(m => ({ default: m.DatosEmpresa })));
const ComprasTabs = lazy(() => import('./ComprasTabs').then(m => ({ default: m.ComprasTabs })));
const UsuariosManagement = lazy(() => import('./UsuariosManagement').then(m => ({ default: m.UsuariosManagement })));
const VendedoresMovil = lazy(() => import('./VendedoresMovil').then(m => ({ default: m.VendedoresMovil })));
const VendedoresPedidos = lazy(() => import('./VendedoresPedidos').then(m => ({ default: m.VendedoresPedidos })));
const CarguesVendedor = lazy(() => import('./CarguesVendedor').then(m => ({ default: m.CarguesVendedor })));
const CuentasPorCobrar = lazy(() => import('./CuentasPorCobrar').then(m => ({ default: m.CuentasPorCobrar })));
const TopClientes = lazy(() => import('./TopClientes').then(m => ({ default: m.TopClientes })));
const CumpleanosClientes = lazy(() => import('./CumpleanosClientes').then(m => ({ default: m.CumpleanosClientes })));
const InformeVendedores = lazy(() => import('./InformeVendedores').then(m => ({ default: m.InformeVendedores })));
const OrdenesCompraManagement = lazy(() => import('./OrdenesCompraManagement').then(m => ({ default: m.OrdenesCompraManagement })));
const BodegasManagement = lazy(() => import('./BodegasManagement').then(m => ({ default: m.BodegasManagement })));
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

interface UserData {
  username: string;
  nombre?: string;
  tipoUsuario?: string;
}

interface DashboardProps {
  onLogout: () => void;
  user?: UserData | null;
}

type View = 'overview' | 'products' | 'customers' | 'suppliers' | 'purchases' | 'sales' | 'inventario' | 'diagnostico' | 'auditoria' | 'categorias' | 'conteo' | 'configuracion' | 'cuentas-cobrar' | 'top-clientes' | 'cumpleanos' | 'cuentas-pagar' | 'productos-proveedor' | 'nueva-venta' | 'ventas-tipo-pago' | 'datos-empresa' | 'usuarios' | 'nueva-compra' | 'facturacion-electronica' | 'facturas-recibidas' | 'caja' | 'caja-historial' | 'pagos-clientes' | 'pagos-proveedores' | 'gastos' | 'bancos' | 'config-categorias-gasto' | 'config-cajas' | 'config-servidor' | 'config-permisos' | 'familias' | 'distribuir' | 'stock-bajo' | 'config-retenciones' | 'informes-hub' | 'notas-articulo' | 'lotes-vencer' | 'inicio' | 'config-etiquetas' | 'vendedores-gestion' | 'vendedores-pedidos' | 'vendedores-cargues' | 'vendedores-informe' | 'ordenes-compra' | 'financiaciones' | 'backup-bd' | 'mantenimiento-bd' | 'anticipos-clientes' | 'movs-directos' | 'bodegas';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  view?: View;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive';
  children?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  view?: View;
}

// === Sistema de tabs múltiples (Fase 0) ===
// Refactor incremental estilo Chrome — solo las views listadas aquí se
// comportan como tabs (viven en memoria con display:block/none). El resto
// sigue con el switch viejo controlado por currentView. Ver PLAN-TABS-MULTIPLES.md.
interface Tab {
  id: string;              // 'inicio' o 'nueva-venta-{n}' o view (singleton)
  view: View;              // qué renderizar
  titulo: string;          // texto de la pestaña
  cerrable: boolean;       // inicio siempre queda
}

// Views que participan del sistema de tabs. Cualquier otra usa el switch viejo.
// Fase 2-3: cobertura completa — todas las views operativas son tab-supported.
const TAB_SUPPORTED_VIEWS: ReadonlySet<View> = new Set<View>([
  'inicio', 'overview',
  // Ventas / Compras — flujos frecuentes que el cajero abre en paralelo
  'nueva-venta', 'sales', 'nueva-compra', 'purchases', 'ventas-tipo-pago',
  'facturacion-electronica', 'facturas-recibidas',
  // Inventario / catálogos
  'inventario', 'products', 'diagnostico', 'auditoria', 'categorias',
  'conteo', 'familias', 'distribuir', 'stock-bajo', 'notas-articulo',
  'lotes-vencer', 'movs-directos', 'config-etiquetas', 'bodegas',
  // Cartera / cuentas / pagos
  'cuentas-cobrar', 'cuentas-pagar', 'pagos-clientes', 'pagos-proveedores',
  'anticipos-clientes', 'financiaciones',
  // Clientes / proveedores
  'customers', 'suppliers', 'productos-proveedor', 'top-clientes', 'cumpleanos',
  // Ordenes de compra
  'ordenes-compra',
  // Caja
  'caja', 'caja-historial',
  // Gastos / Bancos
  'gastos', 'bancos',
  // Informes
  'informes-hub',
  // Vendedores móviles (solo aparecen si el módulo está activo)
  'vendedores-gestion', 'vendedores-pedidos', 'vendedores-cargues', 'vendedores-informe',
  // Configuración / administración
  'configuracion', 'datos-empresa', 'usuarios',
  'config-categorias-gasto', 'config-retenciones', 'config-cajas',
  'config-servidor', 'config-permisos',
  'backup-bd', 'mantenimiento-bd',
]);

// Views que pueden abrirse en múltiples pestañas (creadores). Las demás
// tab-supported son singleton — si ya existe la pestaña, activarla en vez de duplicar.
const MULTI_INSTANCE_VIEWS: ReadonlySet<View> = new Set<View>(['nueva-venta', 'nueva-compra']);

// Nombre por defecto que se muestra en la pestaña según la view.
const TITULO_POR_VIEW: Partial<Record<View, string>> = {
  'inicio': 'Inicio',
  'overview': 'Panel de Ingresos',
  'nueva-venta': 'Nueva Venta',
  'sales': 'Ventas',
  'nueva-compra': 'Nueva Compra',
  'purchases': 'Compras',
  'ventas-tipo-pago': 'Ventas por Tipo de Pago',
  'facturacion-electronica': 'Facturación Electrónica',
  'facturas-recibidas': 'Facturas Recibidas',
  'inventario': 'Inventario',
  'products': 'Productos',
  'diagnostico': 'Diagnóstico',
  'auditoria': 'Auditoría',
  'categorias': 'Categorías',
  'conteo': 'Conteo de Inventario',
  'familias': 'Familias',
  'distribuir': 'Distribuir Productos',
  'stock-bajo': 'Stock Bajo',
  'notas-articulo': 'Notas de Artículo',
  'lotes-vencer': 'Lotes por Vencer',
  'movs-directos': 'Entradas y Salidas',
  'config-etiquetas': 'Etiquetas',
  'bodegas': 'Bodegas',
  'cuentas-cobrar': 'Cartera clientes',
  'cuentas-pagar': 'Cartera proveedores',
  'pagos-clientes': 'Pagos Clientes',
  'pagos-proveedores': 'Pagos Proveedores',
  'anticipos-clientes': 'Anticipos Clientes',
  'financiaciones': 'Financiaciones',
  'customers': 'Clientes',
  'suppliers': 'Proveedores',
  'productos-proveedor': 'Productos × Proveedor',
  'top-clientes': 'Top Clientes',
  'cumpleanos': 'Cumpleaños',
  'ordenes-compra': 'Órdenes de Compra',
  'caja': 'Caja Registradora',
  'caja-historial': 'Historial de Cajas',
  'gastos': 'Gastos',
  'bancos': 'Bancos',
  'informes-hub': 'Informes',
  'vendedores-gestion': 'Gestión Vendedores',
  'vendedores-pedidos': 'Pedidos de Campo',
  'vendedores-cargues': 'Cargues del día',
  'vendedores-informe': 'Ranking Vendedores',
  'configuracion': 'Configuración',
  'datos-empresa': 'Datos de Empresa',
  'usuarios': 'Usuarios',
  'config-categorias-gasto': 'Categorías de Gasto',
  'config-retenciones': 'Retenciones',
  'config-cajas': 'Cajas',
  'config-servidor': 'Servidor',
  'config-permisos': 'Permisos',
  'backup-bd': 'Respaldos',
  'mantenimiento-bd': 'Mantenimiento BD',
};

// Ícono por view (usa lucide, ya importados arriba).
const ICONO_POR_VIEW: Partial<Record<View, any>> = {
  'inicio': Home,
  'overview': LayoutDashboard,
  'nueva-venta': ShoppingCart,
  'sales': Receipt,
  'nueva-compra': Truck,
  'purchases': Truck,
  'ventas-tipo-pago': Receipt,
  'facturacion-electronica': Send,
  'facturas-recibidas': Inbox,
  'diagnostico': TrendingUp,
  'auditoria': ClipboardList,
  'categorias': Tags,
  'conteo': Hash,
  'familias': List,
  'distribuir': Boxes,
  'stock-bajo': AlertTriangle,
  'notas-articulo': FileText,
  'lotes-vencer': CalendarClock,
  'movs-directos': Package,
  'config-etiquetas': Tags,
  'bodegas': Warehouse,
  'pagos-clientes': Wallet,
  'pagos-proveedores': Wallet,
  'anticipos-clientes': DollarSign,
  'financiaciones': CreditCard,
  'productos-proveedor': Package,
  'top-clientes': Crown,
  'cumpleanos': Cake,
  'ordenes-compra': ClipboardList,
  'caja': Wallet,
  'caja-historial': CalendarDays,
  'gastos': DollarSign,
  'bancos': CreditCard,
  'informes-hub': FileText,
  'vendedores-gestion': Smartphone,
  'vendedores-pedidos': ClipboardList,
  'vendedores-cargues': Truck,
  'vendedores-informe': TrendingUp,
  'configuracion': Settings,
  'datos-empresa': User,
  'usuarios': Users,
  'config-categorias-gasto': Tags,
  'config-retenciones': DollarSign,
  'config-cajas': Wallet,
  'config-servidor': Settings,
  'config-permisos': Lock,
  'backup-bd': Package,
  'mantenimiento-bd': Settings,
  'inventario': Boxes,
  'products': Package,
  'cuentas-cobrar': DollarSign,
  'cuentas-pagar': DollarSign,
  'customers': Users,
  'suppliers': Users,
};

export function Dashboard({ onLogout, user }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('inicio');
  const [empresa, setEmpresa] = useState<any>(null);

  // === Estado de tabs (Fase 0) ===
  // Al arrancar, Inicio está siempre presente como tab base. activeTabId=null
  // significa que el usuario navegó a un módulo NO tab-supported (usando el
  // switch viejo con currentView). Al hacer click en un tab, activeTabId
  // vuelve a apuntar a ese tab y el switch viejo se oculta.
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: 'inicio', view: 'inicio', titulo: 'Inicio', cerrable: false },
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>('inicio');
  const [nuevaVentaCounter, setNuevaVentaCounter] = useState(1);

  // Abre una view en el sistema de tabs (o cae al comportamiento viejo si no es supported).
  // - Views multi-instancia: cada llamada crea una pestaña nueva
  // - Views singleton: reutiliza la existente si ya está abierta
  // - Views NO tab-supported: setCurrentView(view) + activeTabId=null (muestra switch viejo)
  const abrirEnTab = (view: View) => {
    if (!TAB_SUPPORTED_VIEWS.has(view)) {
      setCurrentView(view);
      setActiveTabId(null);
      return;
    }
    if (MULTI_INSTANCE_VIEWS.has(view)) {
      const n = nuevaVentaCounter;
      const nuevoId = `${view}-${n}`;
      setTabs(prev => [...prev, {
        id: nuevoId, view,
        titulo: `${TITULO_POR_VIEW[view] || view} #${n}`,
        cerrable: true,
      }]);
      setActiveTabId(nuevoId);
      setNuevaVentaCounter(n + 1);
      setCurrentView(view);
      return;
    }
    // Singleton
    const existente = tabs.find(t => t.view === view);
    if (existente) {
      setActiveTabId(existente.id);
    } else {
      setTabs(prev => [...prev, {
        id: view, view,
        titulo: TITULO_POR_VIEW[view] || view,
        cerrable: view !== 'inicio',
      }]);
      setActiveTabId(view);
    }
    setCurrentView(view);
  };

  const cerrarTab = (tabId: string) => {
    const t = tabs.find(x => x.id === tabId);
    if (!t || !t.cerrable) return;
    const idx = tabs.findIndex(x => x.id === tabId);
    const nuevos = tabs.filter(x => x.id !== tabId);
    setTabs(nuevos);
    // Si estabas mirando el que se cierra, activa el anterior (o el primero).
    if (activeTabId === tabId) {
      const siguiente = nuevos[idx - 1] || nuevos[0] || null;
      if (siguiente) {
        setActiveTabId(siguiente.id);
        setCurrentView(siguiente.view);
      }
    }
  };

  // Menú contextual (click derecho en tab): Cerrar / Cerrar otras / Cerrar todas a la derecha
  const [ctxMenu, setCtxMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const cerrarOtras = (tabId: string) => {
    const t = tabs.find(x => x.id === tabId);
    if (!t) return;
    // Deja solo el que se clickeó + los no cerrables (Inicio).
    setTabs(prev => prev.filter(x => x.id === tabId || !x.cerrable));
    setActiveTabId(tabId);
    setCurrentView(t.view);
  };
  const cerrarDerecha = (tabId: string) => {
    const idx = tabs.findIndex(x => x.id === tabId);
    if (idx < 0) return;
    // Corta a la derecha, respeta no cerrables (los mantiene).
    setTabs(prev => prev.filter((x, i) => i <= idx || !x.cerrable));
    // Si el activo quedó fuera, activar el clickeado.
    const activoIdx = tabs.findIndex(x => x.id === activeTabId);
    if (activoIdx > idx) {
      setActiveTabId(tabId);
      const t = tabs[idx];
      if (t) setCurrentView(t.view);
    }
  };

  // Atajos de teclado: Ctrl+Tab (siguiente), Ctrl+Shift+Tab (anterior), Ctrl+W (cerrar activo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      // Ctrl+W → cerrar tab activo
      if (e.key.toLowerCase() === 'w' && activeTabId) {
        e.preventDefault();
        cerrarTab(activeTabId);
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab → navegar entre tabs
      if (e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length === 0) return;
        const idx = tabs.findIndex(t => t.id === activeTabId);
        const dir = e.shiftKey ? -1 : 1;
        const nuevoIdx = ((idx < 0 ? 0 : idx) + dir + tabs.length) % tabs.length;
        const nueva = tabs[nuevoIdx];
        setActiveTabId(nueva.id);
        setCurrentView(nueva.view);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs, activeTabId]);

  // Cerrar menú contextual al hacer click en cualquier lado
  useEffect(() => {
    if (!ctxMenu) return;
    const off = () => setCtxMenu(null);
    window.addEventListener('click', off);
    window.addEventListener('scroll', off, true);
    return () => {
      window.removeEventListener('click', off);
      window.removeEventListener('scroll', off, true);
    };
  }, [ctxMenu]);

  // === Command Palette (Ctrl+K) ===
  // Buscador que aplana todo el menú y permite ir a cualquier módulo escribiendo
  // su nombre. Enter en el primer resultado. Esc cierra. Estilo VS Code/Notion.
  const [palOpen, setPalOpen] = useState(false);
  const [palQuery, setPalQuery] = useState('');
  const [palIdx, setPalIdx] = useState(0);
  const palInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+K abre/cierra
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalOpen(o => !o);
        setPalQuery('');
        setPalIdx(0);
      }
      if (e.key === 'Escape' && palOpen) {
        e.preventDefault();
        setPalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palOpen]);
  useEffect(() => {
    if (palOpen) setTimeout(() => palInputRef.current?.focus(), 30);
  }, [palOpen]);


  useEffect(() => {
    fetch('http://localhost:80/conta-app-backend/api/empresa/datos.php')
      .then(r => r.json())
      .then(d => { if (d.success) { setEmpresa(d.empresa); saveEmpresaCache(d.empresa); } })
      .catch(() => {});
  }, []);

  // Respaldo automático diario en segundo plano — 1 vez por día natural.
  // El backend detecta si ya hay un backup de hoy y no genera duplicados,
  // así que aunque varios cajeros abran la app, solo se crea 1 archivo.
  useEffect(() => {
    const API_BK = 'http://localhost:80/conta-app-backend/api/backup/';
    fetch(`${API_BK}?estado`)
      .then(r => r.json())
      .then(d => {
        if (d.success && !d.tiene_hoy) {
          return fetch(API_BK, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generar' }),
          });
        }
      })
      .catch(() => {}); // silencioso — no molestar al usuario si falla
  }, []);
  const cumpleProximos = useCumpleanosHoy();
  const stockBajoCount = useStockBajoCount();
  const notif = useNotificaciones();
  // Auto-sync silencioso con el hub móvil (solo si el módulo está habilitado).
  // Cada N minutos según sync_intervalo_pull_min de la config.
  useAutoSyncVendedores();
  const [notifOpen, setNotifOpen] = useState(false);
  const irA = (v: View) => { abrirEnTab(v); setNotifOpen(false); };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const esVendedor = user?.tipoUsuario === 2 || user?.tipoUsuario === '2';
  const { habilitado: vendedoresHabilitado, pedidosPendientes } = useVendedoresConfig();
  const { modulos: entitlements, source: entitSource, loading: entitLoading } = useEntitlements();
  // CRM manda 100%: el módulo Vendedores solo aparece si el CRM lo tiene
  // activo. Durante la carga inicial (~1 seg) usamos el valor local para
  // evitar flash de "aparece/desaparece" en cada arranque.
  const vendedorMovilOK = entitLoading
    ? vendedoresHabilitado
    : entitlements?.vendedor_movil?.activo === true;
  const feEntitlementOK = entitlements?.facturacion_electronica?.activo === true;

  // Sync CRM -> localStorage al arrancar: si la suscripcion tiene FE activa y
  // el config local esta en false (por ejemplo, tras cambiar de BD o tras un
  // reinstalado), forzamos ON y persistimos. Sin esto, NuevaVenta no muestra
  // el selector "Factura Electronica" hasta que el usuario entre a
  // Configuracion y guarde manualmente.
  useEffect(() => {
    if (entitLoading) return;
    const cfg = getConfigImpresion();
    if (feEntitlementOK && !cfg.usarFacturacionElectronica) {
      saveConfigImpresion({ ...cfg, usarFacturacionElectronica: true });
    }
  }, [entitLoading, feEntitlementOK]);

  // TODO(auto-migrar): en 4.3.96 intentamos auto-aplicar actualizacion_completa.sql
  // al arrancar, pero fallo en BDs legacy sin AUTO_INCREMENT en tblcajas /
  // tblcategorias_gasto ("Field 'Id_Caja' doesn't have a default value"), y ese
  // fallo bloqueaba a los clientes. Se retiro la 4.3.96 y por ahora la migracion
  // vuelve a ser MANUAL (Configuracion → Mantenimiento BD → Aplicar Actualizacion
  // Completa). El blindaje real esta en el fix defensivo del backend
  // (crear-articulo.php, actualizar-articulo.php, articulos.php): detectan
  // columnas dinamicamente y no crashean si la migracion aun no se corrio.
  // Cuando el auto-migrar este probado contra BDs legacy (tblcajas AI, duplicate
  // email_recipient, etc.) se puede reactivar.
  // Módulos opcionales locales (adaptación, no CRM) — solo se muestran si el admin
  // los activó en Configuración → Módulos opcionales del negocio.
  const financiacionesHabilitado = !!getConfigImpresion().usarFinanciaciones;
  const anticiposHabilitado = !!getConfigImpresion().usarAnticipos;
  const [showCambiarClave, setShowCambiarClave] = useState(false);
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirmar, setClaveConfirmar] = useState('');

  const allMenuItems: MenuItem[] = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      view: 'inicio'
    },
    {
      id: 'overview',
      label: 'Panel de Ingresos',
      icon: LayoutDashboard,
      view: 'overview'
    },
    {
      id: 'inventario',
      label: 'Inventario',
      icon: Boxes,
      badge: stockBajoCount > 0 ? String(stockBajoCount) : undefined,
      badgeVariant: 'destructive',
      children: [
        { id: 'inventario-list', label: 'Listado de Artículos', view: 'inventario' },
        { id: 'inventario-bodegas', label: 'Bodegas', view: 'bodegas' as View },
        { id: 'inventario-etiquetas', label: 'Etiquetas', view: 'config-etiquetas' as View },
        { id: 'inventario-categorias', label: 'Categorías', view: 'categorias' as View },
        { id: 'inventario-familias', label: 'Familias de Productos', view: 'familias' as View },
        { id: 'inventario-distribuir', label: 'Distribuir Productos', view: 'distribuir' as View },
        { id: 'inventario-stock-bajo', label: stockBajoCount > 0 ? `Stock Bajo (${stockBajoCount})` : 'Stock Bajo', view: 'stock-bajo' as View },
        { id: 'inventario-diagnostico', label: 'Diagnóstico (30 días)', view: 'diagnostico' as View },
        { id: 'inventario-auditoria', label: 'Auditoría (90 días)', view: 'auditoria' as View },
        { id: 'inventario-conteo', label: 'Conteo de Inventario', view: 'conteo' as View },
        { id: 'inventario-notas', label: 'Notas de Artículo', view: 'notas-articulo' as View },
        { id: 'inventario-lotes', label: 'Productos por Vencer', view: 'lotes-vencer' as View },
        { id: 'inventario-movs-directos', label: 'Entradas y Salidas Directas', view: 'movs-directos' as View },
      ]
    },
    { 
      id: 'customers', 
      label: 'Clientes', 
      icon: Users,
      children: [
        { id: 'customer-list', label: 'Listado de Clientes', view: 'customers' },
        { id: 'top-customers', label: 'Top Clientes', view: 'top-clientes' as View },
        { id: 'birthdays', label: 'Cumpleaños', view: 'cumpleanos' as View },
        { id: 'anticipos-clientes', label: 'Anticipos (Saldo a favor)', view: 'anticipos-clientes' as View },
      ]
    },
    {
      id: 'suppliers',
      label: 'Proveedores',
      icon: Truck,
      children: [
        { id: 'supplier-list', label: 'Listado de Proveedores', view: 'suppliers' as View },
        { id: 'supplier-products', label: 'Productos Proveedor', view: 'productos-proveedor' as View },
      ]
    },
    { 
      id: 'sales', 
      label: 'Ventas', 
      icon: TrendingUp,
      children: [
        { id: 'new-sale', label: 'Nueva Venta', view: 'nueva-venta' as View },
        { id: 'sales-list', label: 'Listado de Ventas', view: 'sales' },
        { id: 'sales-by-payment', label: 'Listado por Tipo de Pago', view: 'ventas-tipo-pago' as View },
        { id: 'fe-panel', label: 'Facturación Electrónica', view: 'facturacion-electronica' as View },
      ]
    },
    { 
      id: 'purchases', 
      label: 'Compras', 
      icon: ShoppingCart,
      children: [
        { id: 'new-purchase', label: 'Nueva Compra', view: 'nueva-compra' as View },
        { id: 'purchase-list', label: 'Listado de Compras', view: 'purchases' },
        // Órdenes de Compra: siempre visible desde 4.5.1 (antes detrás de toggle
        // 'ordenesCompra' root-only). Ahora es flujo estándar — se usa por default
        // desde Stock Bajo → Crear Orden de Compra.
        { id: 'ordenes-compra', label: 'Órdenes de Compra', view: 'ordenes-compra' as View },
        { id: 'received-invoices', label: 'Facturas Recibidas (FE)', view: 'facturas-recibidas' as View },
      ]
    },
    {
      id: 'portfolio',
      label: 'Cartera',
      icon: Wallet,
      children: [
        { id: 'accounts-receivable', label: 'Cartera de Clientes', view: 'cuentas-cobrar' as View },
        { id: 'accounts-payable', label: 'Cuentas por Pagar', view: 'cuentas-pagar' as View },
      ]
    },
    {
      id: 'financiaciones',
      label: 'Financiaciones',
      icon: CalendarDays,
      view: 'financiaciones' as View,
    },
    {
      id: 'movimientos-menu',
      label: 'Movimientos',
      icon: TrendingUp,
      children: [
        { id: 'caja-actual', label: 'Abrir / Cerrar Caja', view: 'caja' as View },
        { id: 'caja-historial', label: 'Historial de Cajas', view: 'caja-historial' as View },
        { id: 'pagos-clientes', label: 'Listado Pagos Clientes', view: 'pagos-clientes' as View },
        { id: 'pagos-proveedores', label: 'Pagos a Proveedores', view: 'pagos-proveedores' as View },
        { id: 'gastos', label: 'Gastos', view: 'gastos' as View },
        { id: 'bancos', label: 'Bancos', view: 'bancos' as View },
      ]
    },
    {
      id: 'informes',
      label: 'Informes',
      icon: FileText,
      view: 'informes-hub' as View,
    },
    {
      id: 'vendedores',
      label: 'Vendedores',
      icon: Smartphone,
      badge: pedidosPendientes > 0 ? String(pedidosPendientes) : undefined,
      badgeVariant: 'secondary' as any,
      children: [
        { id: 'vendedores-gestion', label: 'Gestión de Vendedores', view: 'vendedores-gestion' as View },
        { id: 'vendedores-pedidos', label: 'Pedidos de Campo', view: 'vendedores-pedidos' as View },
        { id: 'vendedores-cargues', label: 'Cargues del día', view: 'vendedores-cargues' as View },
        { id: 'vendedores-informe', label: 'Ranking de Vendedores', view: 'vendedores-informe' as View },
      ]
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
      children: [
        { id: 'config-sistema', label: 'Configuración General', view: 'configuracion' as View },
        { id: 'config-empresa', label: 'Datos de la Empresa', view: 'datos-empresa' as View },
        { id: 'config-usuarios', label: 'Usuarios', view: 'usuarios' as View },
        { id: 'config-permisos', label: 'Permisos', view: 'config-permisos' as View },
        { id: 'config-categorias', label: 'Categorías de Gastos', view: 'config-categorias-gasto' as View },
        { id: 'config-retenciones', label: 'Retenciones', view: 'config-retenciones' as View },
        { id: 'config-cajas', label: 'Administrar Cajas', view: 'config-cajas' as View },
        { id: 'config-servidor', label: 'Servidor', view: 'config-servidor' as View },
        { id: 'backup-bd', label: 'Respaldo de la Base de Datos', view: 'backup-bd' as View },
        { id: 'mantenimiento-bd', label: 'Mantenimiento BD (Migración)', view: 'mantenimiento-bd' as View },
      ]
    },
  ];

  // Permisos del usuario (viene del login)
  const permisos: string[] = user?.permisos || [];
  const tiene = (p: string) => esAdmin || permisos.includes(p);

  // Mapeo de items del menú a permisos
  const menuPermisos: Record<string, string> = {
    'overview': 'dashboard_completo',
    'inventario': 'inventario', 'inventario-list': 'inventario', 'inventario-categorias': 'categorias',
    'inventario-diagnostico': 'inventario_diagnostico', 'inventario-auditoria': 'inventario_diagnostico',
    'inventario-conteo': 'inventario_conteo',
    'inventario-familias': 'inventario', 'inventario-distribuir': 'inventario', 'inventario-stock-bajo': 'inventario',
    'inventario-notas': 'inventario', 'inventario-lotes': 'inventario', 'inventario-etiquetas': 'inventario',
    'inventario-bodegas': 'inventario',
    'customers-list': 'clientes', 'top-clientes': 'clientes_top', 'cumpleanos': 'clientes', 'anticipos-clientes': 'clientes',
    'accounts-receivable': 'clientes_cartera', 'accounts-payable': 'proveedores_pagar',
    'suppliers': 'proveedores', 'supplier-list': 'proveedores', 'supplier-products': 'proveedores',
    'new-sale': 'ventas', 'sales-list': 'ventas_listado',
    'sales-by-payment': 'ventas_tipo_pago', 'fe-panel': 'facturacion_electronica',
    'purchases': 'compras', 'new-purchase': 'compras_editar', 'purchase-list': 'compras',
    'financiaciones': 'financiaciones',
    'caja-actual': 'caja', 'caja-historial': 'caja_historial',
    'pagos-clientes': 'pagos_listado', 'pagos-proveedores': 'pagos_listado',
    'gastos': 'gastos', 'bancos': 'bancos',
    'configuracion': 'configuracion', 'config-sistema': 'configuracion',
    'config-empresa': 'datos_empresa', 'config-usuarios': 'usuarios',
    'config-categorias': 'configuracion', 'config-cajas': 'configuracion', 'config-servidor': 'configuracion', 'config-permisos': 'usuarios', 'backup-bd': 'configuracion', 'mantenimiento-bd': 'configuracion',
    'informes': 'informes',
  };

  // Filtrar menú por permisos y habilitación de módulos
  // Vendedores: gate por entitlements CRM (CRM manda 100%, sin grandfathering)
  const baseMenuItems = allMenuItems
    .filter(item => item.id !== 'vendedores' || vendedorMovilOK)
    .filter(item => item.id !== 'financiaciones' || financiacionesHabilitado)
    // Filtrar el sub-item "Anticipos" dentro de Clientes si el módulo está apagado
    .map(item => {
      if (item.id === 'customers' && item.children && !anticiposHabilitado) {
        return { ...item, children: item.children.filter(c => c.id !== 'anticipos-clientes') };
      }
      return item;
    });
  const menuItems = esAdmin ? baseMenuItems : baseMenuItems
    .map(item => {
      if (item.children) {
        const hijos = item.children.filter(c => {
          const perm = menuPermisos[c.id];
          return !perm || tiene(perm);
        });
        return hijos.length > 0 ? { ...item, children: hijos } : null;
      }
      const perm = menuPermisos[item.id];
      return (!perm || tiene(perm)) ? item : null;
    })
    .filter(Boolean) as MenuItem[];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? []
        : [menuId]
    );
  };

  // === Fly-out flotante para submenús ===
  // Al hover en un item con children, mostramos un panel flotante a la derecha
  // del sidebar con los hijos. Reduce drásticamente el scroll del sidebar
  // cuando hay muchos submenús. Se cierra al salir del padre y del panel
  // (con delay corto para permitir traversar el mouse sin frustración).
  const [flyout, setFlyout] = useState<{ id: string; top: number; items: SubMenuItem[]; padreLabel: string } | null>(null);
  const flyoutTimerRef = useRef<any>(null);
  const abrirFlyout = (padre: MenuItem, e: React.MouseEvent) => {
    if (flyoutTimerRef.current) { clearTimeout(flyoutTimerRef.current); flyoutTimerRef.current = null; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyout({
      id: padre.id,
      top: rect.top,
      items: padre.children || [],
      padreLabel: padre.label,
    });
  };
  const cerrarFlyoutConDelay = () => {
    flyoutTimerRef.current = setTimeout(() => setFlyout(null), 180);
  };
  const cancelarCierre = () => {
    if (flyoutTimerRef.current) { clearTimeout(flyoutTimerRef.current); flyoutTimerRef.current = null; }
  };

  // Lista aplanada de todos los items abribles del sidebar — alimenta el Ctrl+K.
  // Cada entrada tiene {label, view, ruta} para mostrar "Inventario › Categorías".
  const modulosAplanados = useMemo(() => {
    const out: { label: string; ruta: string; view: View }[] = [];
    for (const item of menuItems) {
      if (item.view) out.push({ label: item.label, ruta: item.label, view: item.view });
      if (item.children) {
        for (const c of item.children) {
          if (c.view) out.push({ label: c.label, ruta: `${item.label} › ${c.label}`, view: c.view });
        }
      }
    }
    return out;
  }, [menuItems]);

  const palResultados = useMemo(() => {
    const q = palQuery.trim().toLowerCase();
    if (!q) return modulosAplanados.slice(0, 12);
    return modulosAplanados
      .filter(m => m.label.toLowerCase().includes(q) || m.ruta.toLowerCase().includes(q))
      .slice(0, 20);
  }, [modulosAplanados, palQuery]);

  const handleMenuClick = (item: MenuItem | SubMenuItem) => {
    if ('view' in item && item.view) {
      abrirEnTab(item.view);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-[rgb(17,28,67)] text-gray-300 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-gray-700/50">
          <h1 className="flex items-center gap-3">
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src={appIcon} style={{ width: 24, height: 24 }} alt="" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Conta FT</div>
              <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 500, letterSpacing: 1 }}>Facturación</div>
              <div
                onClick={async () => {
                  try {
                    // @ts-ignore
                    const ipc = (window as any).require?.('electron')?.ipcRenderer;
                    if (!ipc) { toast('Modo desarrollo — sin actualización', { icon: '🛠️' }); return; }
                    toast.loading('Buscando actualización...', { id: 'upd-check' });
                    const r = await ipc.invoke('updater:check');
                    toast.dismiss('upd-check');
                    if (r?.ok) {
                      if (r.version) toast.success(`Buscando v${r.version}...`);
                      else toast('Estás en la última versión', { icon: '✅' });
                    } else {
                      const motivo = r?.reason || 'desconocido';
                      const msg = r?.message ? ` — ${r.message}` : '';
                      toast.error(`No se pudo verificar (${motivo})${msg}`, { duration: 6000 });
                    }
                  } catch (e: any) {
                    toast.dismiss('upd-check');
                    toast.error(`Error: ${e?.message || e}`);
                  }
                }}
                title="Click para buscar actualizaciones"
                style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, marginTop: 2, cursor: 'pointer' }}
              >
                v{APP_VERSION}
              </div>
            </div>
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Botón buscador — atajo visible al Ctrl+K */}
          <button
            onClick={() => { setPalOpen(true); setPalQuery(''); setPalIdx(0); }}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg mb-3 text-gray-400 hover:bg-gray-800/50 hover:text-white transition-all border border-gray-700/40"
            title="Buscar cualquier módulo (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14 }}>🔍</span>
              <span className="text-xs">Buscar módulo...</span>
            </div>
            <span style={{ fontSize: 9, padding: '1px 5px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, color: '#94a3b8' }}>Ctrl K</span>
          </button>

          <div className="mb-3">
            <p className="text-xs uppercase text-gray-500 px-3 mb-1">Principal</p>
          </div>
          
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedMenus.includes(item.id);
              const hasChildren = item.children && item.children.length > 0;
              
              return (
                <li key={item.id}>
                  <button
                    onMouseEnter={hasChildren ? (e) => abrirFlyout(item, e as any) : undefined}
                    onMouseLeave={hasChildren ? cerrarFlyoutConDelay : undefined}
                    onClick={(e) => {
                      if (hasChildren) {
                        // Toggle fly-out con click (útil en pantallas táctiles)
                        if (flyout?.id === item.id) setFlyout(null);
                        else abrirFlyout(item, e as any);
                      } else {
                        handleMenuClick(item);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all ${
                      (currentView === item.view && !hasChildren) || flyout?.id === item.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge 
                          variant={item.badgeVariant || 'default'}
                          className={`text-xs px-2 py-0 ${
                            item.badgeVariant === 'secondary' 
                              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20' 
                              : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/20'
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {hasChildren && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-700/50">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Panel FLY-OUT — muestra los hijos del item padre al hacer hover en el sidebar.
          Position fixed a la derecha del sidebar, alineado con el item padre. */}
      {flyout && (
        <div
          onMouseEnter={cancelarCierre}
          onMouseLeave={cerrarFlyoutConDelay}
          style={{
            position: 'fixed',
            left: sidebarOpen ? 260 : 8,
            top: Math.max(8, Math.min(flyout.top, window.innerHeight - 80 - flyout.items.length * 32)),
            zIndex: 250,
            minWidth: 240, maxWidth: 320,
            background: 'rgb(17, 28, 67)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            boxShadow: '8px 8px 32px rgba(0,0,0,0.35)',
            padding: 6,
            animation: 'flyout-in 120ms ease-out',
          }}>
          <style>{`
            @keyframes flyout-in {
              from { opacity: 0; transform: translateX(-8px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div style={{ padding: '4px 10px 6px', fontSize: 10, fontWeight: 600, color: '#a5b4fc', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
            {flyout.padreLabel}
          </div>
          {flyout.items.map((child) => {
            const activo = currentView === child.view;
            return (
              <button
                key={child.id}
                onClick={() => {
                  if (child.view) abrirEnTab(child.view);
                  setFlyout(null);
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '7px 12px', borderRadius: 6, border: 'none',
                  background: activo ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                  color: activo ? '#fff' : '#cbd5e1',
                  fontSize: 12, fontWeight: activo ? 600 : 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => { if (!activo) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)'); }}
                onMouseLeave={(e) => { if (!activo) (e.currentTarget.style.background = 'transparent'); }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: activo ? '#a78bfa' : '#64748b', flexShrink: 0 }} />
                {child.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, oklch(.424 .199 265.638) 60%, oklch(.42 .26 295) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 16px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Glow decorativo del top bar */}
          <div style={{
            position: 'absolute', top: -40, right: '20%', width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
            filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none',
          }} />

          <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  width: 32, height: 32, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: 0.2 }}>
                  {empresa?.Empresa || 'Cargando...'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(196, 181, 253, 0.85)', fontWeight: 500 }}>
                  NIT: {empresa?.Nit || '-'} {empresa?.Regimen ? `· ${empresa.Regimen}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    title={notif.total > 0 ? `${notif.total} notificaciones pendientes` : 'Sin notificaciones'}
                    style={{
                      width: 32, height: 32, border: 'none', cursor: 'pointer', position: 'relative',
                      background: 'rgba(255,255,255,0.08)', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  >
                    <Bell className={`w-4 h-4 ${notif.vencidos > 0 ? 'animate-pulse' : ''}`} style={{ color: '#fff' }} />
                    {notif.total > 0 && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2,
                        background: notif.vencidos > 0
                          ? 'linear-gradient(135deg, #dc2626, #f97316)'
                          : 'linear-gradient(135deg, #f97316, #ec4899)',
                        color: '#fff', borderRadius: 10, fontSize: 9, minWidth: 16, height: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                        fontWeight: 700, boxShadow: '0 2px 8px rgba(236, 72, 153, 0.5)',
                        border: '1.5px solid rgba(30, 27, 75, 1)',
                      }}>
                        {notif.total > 99 ? '99+' : notif.total}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ width: 320, padding: 0 }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Notificaciones</div>
                    {notif.total > 0 && (
                      <span style={{ fontSize: 10, padding: '2px 8px', background: '#7c3aed', color: '#fff', borderRadius: 999, fontWeight: 600 }}>
                        {notif.total} pendientes
                      </span>
                    )}
                  </div>
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {notif.total === 0 && !notif.loading && (
                      <div style={{ padding: '24px 14px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                        ✨ Todo al día, sin alertas pendientes
                      </div>
                    )}
                    {notif.vencidos > 0 && (
                      <NotifItem
                        icon={AlertTriangle} color="#dc2626" bg="#fee2e2"
                        title={`${notif.vencidos} producto(s) vencido(s) con stock`}
                        desc="Revisa y da de baja los lotes vencidos"
                        urgent
                        onClick={() => irA('lotes-vencer' as View)}
                      />
                    )}
                    {notif.porVencer30 > 0 && (
                      <NotifItem
                        icon={CalendarClock} color="#ea580c" bg="#ffedd5"
                        title={`${notif.porVencer30} producto(s) por vencer`}
                        desc="Vencen en los próximos 30 días"
                        onClick={() => irA('lotes-vencer' as View)}
                      />
                    )}
                    {notif.stockBajo > 0 && (
                      <NotifItem
                        icon={AlertTriangle} color="#d97706" bg="#fef3c7"
                        title={`${notif.stockBajo} producto(s) con stock bajo`}
                        desc="Por debajo del mínimo configurado"
                        onClick={() => irA('stock-bajo' as View)}
                      />
                    )}
                    {notif.cumpleanosHoy > 0 && (
                      <NotifItem
                        icon={Cake} color="#ec4899" bg="#fce7f3"
                        title={`${notif.cumpleanosHoy} cliente(s) cumplen años hoy`}
                        desc="Aprovecha para felicitar y fidelizar"
                        onClick={() => irA('cumpleanos')}
                      />
                    )}
                    {notif.cumpleanosProx > 0 && (
                      <NotifItem
                        icon={Gift} color="#7c3aed" bg="#f3e8ff"
                        title={`${notif.cumpleanosProx} cumpleaños próximos`}
                        desc="En los siguientes 7 días"
                        onClick={() => irA('cumpleanos')}
                      />
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 999, padding: '3px 12px 3px 3px', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  >
                    <Avatar className="w-7 h-7" style={{
                      background: 'linear-gradient(135deg, #c4b5fd, #f0abfc)',
                      border: '2px solid rgba(255,255,255,0.3)',
                    }}>
                      <AvatarFallback style={{ fontSize: 11, fontWeight: 700, color: '#1e1b4b', background: 'transparent' }}>
                        {user?.nombre?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{user?.nombre || user?.username || 'Usuario'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <div className="px-3 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold">{user?.nombre || user?.username || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 mt-1">{user?.tipoUsuario || 'Usuario del Sistema'}</p>
                  </div>
                  <div className="py-1">
                    {esAdmin && (
                      <DropdownMenuItem className="cursor-pointer py-2 px-3" onClick={() => setCurrentView('configuracion')}>
                        <Settings className="w-4 h-4 mr-2 text-blue-600" />
                        <span>Configuración</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer py-2 px-3" onClick={() => setShowCambiarClave(true)}>
                      <Lock className="w-4 h-4 mr-2 text-gray-600" />
                      <span>Cambiar Contraseña</span>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button onClick={onLogout} className="w-full bg-purple-600 hover:bg-purple-700" style={{ height: 30, fontSize: 12 }}>
                      Cerrar Sesión
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Notificaciones emergentes de sugerencias — flotan sobre cualquier vista.
            Aparecen una a una en el tiempo, dan efecto "app viva" descubriendo cosas. */}
        <NotificacionEmergente onNavigate={(v) => abrirEnTab(v as View)} esAdmin={esAdmin} />

        {/* Barra de tabs estilo Chrome (Fase 0 — solo Inicio, Nueva Venta e Inventario).
            Los módulos NO tab-supported ocupan la barra pero sin resaltado (activeTabId=null). */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 2,
          padding: '6px 8px 0',
          background: 'linear-gradient(180deg, rgba(30,27,75,0.95) 0%, rgba(30,27,75,0.85) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflowX: 'auto', overflowY: 'hidden',
          height: 34, flexShrink: 0,
        }}>
          {tabs.map(t => {
            const activo = activeTabId === t.id;
            const Ico = ICONO_POR_VIEW[t.view] || Home;
            return (
              <div key={t.id}
                onClick={() => { setActiveTabId(t.id); setCurrentView(t.view); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu({ tabId: t.id, x: e.clientX, y: e.clientY });
                }}
                onMouseDown={(e) => {
                  // Botón central del mouse = cerrar tab (patrón Chrome)
                  if (e.button === 1 && t.cerrable) {
                    e.preventDefault();
                    cerrarTab(t.id);
                  }
                }}
                title={t.titulo}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px 5px', maxWidth: 200, minWidth: 100, height: 26,
                  background: activo ? '#f9fafb' : 'rgba(255,255,255,0.08)',
                  borderRadius: '8px 8px 0 0',
                  borderTop: activo ? '2px solid #a78bfa' : '2px solid transparent',
                  borderLeft: activo ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
                  borderRight: activo ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: 12, fontWeight: activo ? 600 : 500,
                  color: activo ? '#1f2937' : '#cbd5e1',
                  marginBottom: activo ? -1 : 0,
                  position: 'relative', zIndex: activo ? 2 : 1,
                  transition: 'background 120ms ease',
                }}>
                <Ico size={13} />
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, minWidth: 0,
                }}>{t.titulo}</span>
                {t.cerrable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); cerrarTab(t.id); }}
                    title="Cerrar pestaña"
                    style={{
                      width: 16, height: 16, borderRadius: 3, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: activo ? '#6b7280' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = activo ? '#e5e7eb' : 'rgba(255,255,255,0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}
          {/* Indicador de "estás en módulo no-tab" cuando activeTabId=null */}
          {activeTabId === null && (
            <div style={{
              display: 'flex', alignItems: 'center', padding: '4px 10px',
              fontSize: 11, color: '#94a3b8', fontStyle: 'italic',
            }}>
              (módulo abierto sin pestaña)
            </div>
          )}
        </div>

        {/* Command Palette (Ctrl+K) — buscador global de módulos */}
        {palOpen && (
          <div
            onClick={() => setPalOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: '10vh',
            }}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(600px, 90vw)', background: '#fff',
                borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                overflow: 'hidden',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 16, color: '#9ca3af' }}>🔍</span>
                <input
                  ref={palInputRef}
                  value={palQuery}
                  onChange={e => { setPalQuery(e.target.value); setPalIdx(0); }}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setPalIdx(i => Math.min(i + 1, palResultados.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setPalIdx(i => Math.max(i - 1, 0)); }
                    else if (e.key === 'Enter') {
                      e.preventDefault();
                      const r = palResultados[palIdx];
                      if (r) { abrirEnTab(r.view); setPalOpen(false); }
                    }
                  }}
                  placeholder="Buscar módulo... (Enter para abrir, Esc para cerrar)"
                  style={{
                    flex: 1, border: 'none', outline: 'none', fontSize: 15,
                    fontWeight: 500, color: '#111827', background: 'transparent',
                  }}
                />
                <span style={{ fontSize: 10, color: '#9ca3af', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px' }}>Ctrl+K</span>
              </div>
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {palResultados.length === 0 ? (
                  <div style={{ padding: '24px 16px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                    Sin resultados para "{palQuery}"
                  </div>
                ) : palResultados.map((r, i) => {
                  const activo = i === palIdx;
                  return (
                    <div
                      key={r.view + '-' + i}
                      onMouseEnter={() => setPalIdx(i)}
                      onClick={() => { abrirEnTab(r.view); setPalOpen(false); }}
                      style={{
                        padding: '10px 16px', cursor: 'pointer',
                        background: activo ? '#f3e8ff' : 'transparent',
                        borderLeft: activo ? '3px solid #7c3aed' : '3px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.label}</div>
                        {r.ruta !== r.label && (
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{r.ruta}</div>
                        )}
                      </div>
                      {activo && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>Enter ↵</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '6px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa', fontSize: 10, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                <span>{modulosAplanados.length} módulos disponibles</span>
                <span>↑↓ navegar · Enter abrir · Esc cerrar</span>
              </div>
            </div>
          </div>
        )}

        {/* Menú contextual click-derecho en tab */}
        {ctxMenu && (() => {
          const t = tabs.find(x => x.id === ctxMenu.tabId);
          if (!t) return null;
          const idx = tabs.findIndex(x => x.id === ctxMenu.tabId);
          const hayOtrasCerrables = tabs.some(x => x.id !== ctxMenu.tabId && x.cerrable);
          const hayDerechaCerrables = tabs.slice(idx + 1).some(x => x.cerrable);
          const item: React.CSSProperties = {
            padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            borderRadius: 4, whiteSpace: 'nowrap',
          };
          const disabled: React.CSSProperties = { ...item, color: '#9ca3af', cursor: 'not-allowed' };
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 200,
                background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)', padding: 4, minWidth: 180,
              }}>
              <div style={t.cerrable ? item : disabled}
                onMouseEnter={(e) => t.cerrable && (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { if (t.cerrable) { cerrarTab(ctxMenu.tabId); setCtxMenu(null); } }}>
                Cerrar pestaña
              </div>
              <div style={hayOtrasCerrables ? item : disabled}
                onMouseEnter={(e) => hayOtrasCerrables && (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { if (hayOtrasCerrables) { cerrarOtras(ctxMenu.tabId); setCtxMenu(null); } }}>
                Cerrar otras
              </div>
              <div style={hayDerechaCerrables ? item : disabled}
                onMouseEnter={(e) => hayDerechaCerrables && (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { if (hayDerechaCerrables) { cerrarDerecha(ctxMenu.tabId); setCtxMenu(null); } }}>
                Cerrar todas a la derecha
              </div>
            </div>
          );
        })()}

        <div className={activeTabId === 'inicio' ? 'flex-1 min-h-0 overflow-auto' : 'p-6 flex-1 min-h-0 overflow-auto'}>
          {/* TABS VIVOS — cada uno mantiene su estado en memoria aunque no esté activo.
              Fase 0: solo Inicio, Nueva Venta e Inventario. Ver PLAN-TABS-MULTIPLES.md. */}
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6b7280', fontSize: 13 }}>
              <div style={{ width: 22, height: 22, border: '3px solid #e5e7eb', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'sp 0.8s linear infinite', marginRight: 10 }} />
              Cargando módulo…
              <style>{`@keyframes sp { to { transform: rotate(360deg) } }`}</style>
            </div>
          }>
          {tabs.map(t => (
            <div key={t.id} style={{
              display: activeTabId === t.id ? 'block' : 'none',
              height: activeTabId === t.id ? '100%' : 0,
            }}>
              {t.view === 'inicio' && <PantallaInicio user={user} onNavigate={(v) => abrirEnTab(v as View)} esAdmin={esAdmin} esVendedor={esVendedor} />}
              {t.view === 'overview' && (esVendedor ? <DashboardVendedor user={user} /> : <IncomeOverview />)}
              {/* Ventas / Compras */}
              {t.view === 'nueva-venta' && <VentasTabs />}
              {t.view === 'sales' && <SalesManagement onNavigate={(v) => abrirEnTab(v as View)} />}
              {t.view === 'nueva-compra' && <ComprasTabs />}
              {t.view === 'purchases' && <PurchasesManagement onNavigate={(v) => abrirEnTab(v as View)} />}
              {t.view === 'ventas-tipo-pago' && <VentasPorTipoPago />}
              {t.view === 'facturacion-electronica' && <FacturacionElectronica onNavigate={(v) => abrirEnTab(v as View)} />}
              {t.view === 'facturas-recibidas' && <FacturasRecibidas />}
              {/* Inventario / catálogos */}
              {t.view === 'inventario' && <InventarioManagement />}
              {t.view === 'products' && <ProductsManagement />}
              {t.view === 'diagnostico' && <DiagnosticoInventario />}
              {t.view === 'auditoria' && <AuditoriaInventario />}
              {t.view === 'categorias' && <CategoriasManagement />}
              {t.view === 'conteo' && <ConteoInventario />}
              {t.view === 'familias' && <FamiliasProducto />}
              {t.view === 'distribuir' && <DistribuirProductos />}
              {t.view === 'stock-bajo' && <StockBajo onNavigate={(v) => abrirEnTab(v as View)} />}
              {t.view === 'notas-articulo' && <NotasArticulo />}
              {t.view === 'lotes-vencer' && <LotesPorVencer />}
              {t.view === 'movs-directos' && <MovsDirectos />}
              {t.view === 'config-etiquetas' && <ConfigEtiquetas />}
              {t.view === 'bodegas' && <BodegasManagement />}
              {/* Cartera / cuentas / pagos */}
              {t.view === 'cuentas-cobrar' && <CuentasPorCobrar />}
              {t.view === 'cuentas-pagar' && <ProveedoresManagement modoCxP />}
              {t.view === 'pagos-clientes' && <ListadoPagosClientes />}
              {t.view === 'pagos-proveedores' && <ListadoPagosProveedores />}
              {t.view === 'anticipos-clientes' && <AnticiposClientes />}
              {t.view === 'financiaciones' && <FinanciacionesManagement />}
              {/* Clientes / proveedores */}
              {t.view === 'customers' && <CustomersManagement />}
              {t.view === 'suppliers' && <ProveedoresManagement />}
              {t.view === 'productos-proveedor' && <ProductosProveedor />}
              {t.view === 'top-clientes' && <TopClientes />}
              {t.view === 'cumpleanos' && <CumpleanosClientes />}
              {/* Órdenes / Caja / Gastos / Bancos / Informes */}
              {t.view === 'ordenes-compra' && <OrdenesCompraManagement />}
              {t.view === 'caja' && <CajaRegistradora />}
              {t.view === 'caja-historial' && <HistorialCajas />}
              {t.view === 'gastos' && <GastosManagement />}
              {t.view === 'bancos' && <BancosManagement />}
              {t.view === 'informes-hub' && <InformesHub />}
              {/* Vendedores móviles */}
              {t.view === 'vendedores-gestion' && <VendedoresMovil />}
              {t.view === 'vendedores-pedidos' && <VendedoresPedidos onNavigate={(v) => abrirEnTab(v as View)} />}
              {t.view === 'vendedores-cargues' && <CarguesVendedor />}
              {t.view === 'vendedores-informe' && <InformeVendedores />}
              {/* Configuración */}
              {t.view === 'configuracion' && <ConfiguracionSistema />}
              {t.view === 'datos-empresa' && <DatosEmpresa />}
              {t.view === 'usuarios' && <UsuariosManagement />}
              {t.view === 'config-categorias-gasto' && <ConfigCategoriasGasto />}
              {t.view === 'config-retenciones' && <ConfigRetenciones />}
              {t.view === 'config-cajas' && <ConfigCajas />}
              {t.view === 'config-servidor' && <ConfigServidor />}
              {t.view === 'config-permisos' && <ConfigPermisos />}
              {t.view === 'backup-bd' && <BackupBD />}
              {t.view === 'mantenimiento-bd' && <MantenimientoBD />}
            </div>
          ))}
          </Suspense>
        </div>
      </main>

      {/* Modal cambiar contraseña */}
      {showCambiarClave && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowCambiarClave(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Cambiar Contraseña</span>
              <button onClick={() => setShowCambiarClave(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>CONTRASEÑA ACTUAL</label>
              <input type="password" value={claveActual} onChange={e => setClaveActual(e.target.value)}
                style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>NUEVA CONTRASEÑA</label>
              <input type="password" value={claveNueva} onChange={e => setClaveNueva(e.target.value)}
                style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>CONFIRMAR CONTRASEÑA</label>
              <input type="password" value={claveConfirmar} onChange={e => setClaveConfirmar(e.target.value)}
                style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCambiarClave(false)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                if (!claveActual || !claveNueva) return;
                if (claveNueva !== claveConfirmar) { toast.error('Las contraseñas no coinciden'); return; }
                if (claveNueva.length < 4) { toast.error('La contraseña debe tener al menos 4 caracteres'); return; }
                try {
                  const { codificarPassword } = await import('../utils/passwordEncoder');
                  const r = await fetch('http://localhost:80/conta-app-backend/api/usuarios/listar.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'cambiar-pass', Id_Usuario: user?.id, contrasena: claveNueva, contrasena_actual: codificarPassword(claveActual) })
                  });
                  const d = await r.json();
                  if (d.success) { toast.success('Contraseña actualizada'); setShowCambiarClave(false); setClaveActual(''); setClaveNueva(''); setClaveConfirmar(''); }
                  else toast.error(d.message);
                } catch (e) { toast.error('Error al cambiar contraseña'); }
              }}
                style={{ height: 34, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cambiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Item del panel de notificaciones -----
function NotifItem({ icon: Icon, color, bg, title, desc, onClick, urgent }: {
  icon: any; color: string; bg: string; title: string; desc: string;
  onClick: () => void; urgent?: boolean;
}) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none',
        borderBottom: '1px solid #f3f4f6', width: '100%', cursor: 'pointer', textAlign: 'left' as const,
        transition: 'background 0.12s',
        position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {urgent && <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 4, height: 28, background: color, borderRadius: 2 }} />}
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.3 }}>{desc}</div>
      </div>
    </button>
  );
}