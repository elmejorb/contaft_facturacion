import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import appIcon from '../assets/icon.png';
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
  Gift
} from 'lucide-react';
import { IncomeOverview } from './IncomeOverview';
import { ProductsManagement } from './ProductsManagement';
import { CustomersManagement } from './CustomersManagement';
import { ProveedoresManagement } from './ProveedoresManagement';
import { ProductosProveedor } from './ProductosProveedor';
import { VentasTabs } from './VentasTabs';
import { PurchasesManagement } from './PurchasesManagement';
import { SalesManagement } from './SalesManagement';
import { VentasPorTipoPago } from './VentasPorTipoPago';
import { FacturacionElectronica } from './FacturacionElectronica';
import { CajaRegistradora } from './CajaRegistradora';
import { HistorialCajas } from './HistorialCajas';
import { ListadoPagosClientes, ListadoPagosProveedores } from './ListadoPagos';
import { GastosManagement } from './GastosManagement';
import { BancosManagement } from './BancosManagement';
import { ConfigCategoriasGasto } from './ConfigCategoriasGasto';
import { ConfigRetenciones } from './ConfigRetenciones';
import { ConfigEtiquetas } from './ConfigEtiquetas';
import { ConfigCajas } from './ConfigCajas';
import { ConfigServidor } from './ConfigServidor';
import { ConfigPermisos } from './ConfigPermisos';
import { DashboardVendedor } from './DashboardVendedor';
import { InventarioManagement } from './InventarioManagement';
import { DiagnosticoInventario } from './DiagnosticoInventario';
import { AuditoriaInventario } from './AuditoriaInventario';
import { CategoriasManagement } from './CategoriasManagement';
import { ConteoInventario } from './ConteoInventario';
import { FamiliasProducto } from './FamiliasProducto';
import { DistribuirProductos } from './DistribuirProductos';
import { StockBajo, useStockBajoCount } from './StockBajo';
import { NotasArticulo } from './NotasArticulo';
import { LotesPorVencer } from './LotesPorVencer';
import { PantallaInicio } from './PantallaInicio';
import { useNotificaciones } from '../hooks/useNotificaciones';
import { InformesHub } from './informes/InformesHub';
import { ConfiguracionSistema, saveEmpresaCache } from './ConfiguracionSistema';
import { DatosEmpresa } from './DatosEmpresa';
import { NuevaCompra } from './NuevaCompra';
import { UsuariosManagement } from './UsuariosManagement';
import { CuentasPorCobrar } from './CuentasPorCobrar';
import { TopClientes } from './TopClientes';
import { CumpleanosClientes, useCumpleanosHoy } from './CumpleanosClientes';
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

type View = 'overview' | 'products' | 'customers' | 'suppliers' | 'purchases' | 'sales' | 'inventario' | 'diagnostico' | 'auditoria' | 'categorias' | 'conteo' | 'configuracion' | 'cuentas-cobrar' | 'top-clientes' | 'cumpleanos' | 'cuentas-pagar' | 'productos-proveedor' | 'nueva-venta' | 'ventas-tipo-pago' | 'datos-empresa' | 'usuarios' | 'nueva-compra' | 'facturacion-electronica' | 'caja' | 'caja-historial' | 'pagos-clientes' | 'pagos-proveedores' | 'gastos' | 'bancos' | 'config-categorias-gasto' | 'config-cajas' | 'config-servidor' | 'config-permisos' | 'familias' | 'distribuir' | 'stock-bajo' | 'config-retenciones' | 'informes-hub' | 'notas-articulo' | 'lotes-vencer' | 'inicio' | 'config-etiquetas';

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

export function Dashboard({ onLogout, user }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('inicio');
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:80/conta-app-backend/api/empresa/datos.php')
      .then(r => r.json())
      .then(d => { if (d.success) { setEmpresa(d.empresa); saveEmpresaCache(d.empresa); } })
      .catch(() => {});
  }, []);
  const cumpleProximos = useCumpleanosHoy();
  const stockBajoCount = useStockBajoCount();
  const notif = useNotificaciones();
  const [notifOpen, setNotifOpen] = useState(false);
  const irA = (v: View) => { setCurrentView(v); setNotifOpen(false); };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const esAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';
  const esVendedor = user?.tipoUsuario === 2 || user?.tipoUsuario === '2';
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
    'customers-list': 'clientes', 'top-clientes': 'clientes_top', 'cumpleanos': 'clientes',
    'accounts-receivable': 'clientes_cartera', 'accounts-payable': 'proveedores_pagar',
    'suppliers': 'proveedores', 'supplier-list': 'proveedores', 'supplier-products': 'proveedores',
    'new-sale': 'ventas', 'sales-list': 'ventas_listado',
    'sales-by-payment': 'ventas_tipo_pago', 'fe-panel': 'facturacion_electronica',
    'purchases': 'compras', 'new-purchase': 'compras', 'purchase-list': 'compras',
    'caja-actual': 'caja', 'caja-historial': 'caja_historial',
    'pagos-clientes': 'pagos_listado', 'pagos-proveedores': 'pagos_listado',
    'gastos': 'gastos', 'bancos': 'bancos',
    'configuracion': 'configuracion', 'config-sistema': 'configuracion',
    'config-empresa': 'datos_empresa', 'config-usuarios': 'usuarios',
    'config-categorias': 'configuracion', 'config-cajas': 'configuracion', 'config-servidor': 'configuracion', 'config-permisos': 'usuarios',
    'informes': 'informes',
  };

  // Filtrar menú por permisos
  const menuItems = esAdmin ? allMenuItems : allMenuItems
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

  const handleMenuClick = (item: MenuItem | SubMenuItem) => {
    if ('view' in item && item.view) {
      setCurrentView(item.view);
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
            </div>
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <p className="text-xs uppercase text-gray-500 px-3 mb-2">Principal</p>
          </div>
          
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedMenus.includes(item.id);
              const hasChildren = item.children && item.children.length > 0;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleMenu(item.id);
                      } else {
                        handleMenuClick(item);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                      currentView === item.view && !hasChildren
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
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </button>
                  
                  {hasChildren && isExpanded && (
                    <ul className="mt-1 ml-8 space-y-1 submenu-enter overflow-hidden">
                      {item.children!.map((child) => (
                        <li key={child.id}>
                          <button
                            onClick={() => handleMenuClick(child)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                              currentView === child.view
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                            {child.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, oklch(.424 .199 265.638) 60%, oklch(.42 .26 295) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 16px',
          position: 'relative',
          overflow: 'hidden',
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

        <div className={currentView === 'inicio' ? '' : 'p-6'}>
          {currentView === 'inicio' && <PantallaInicio user={user} onNavigate={(v) => setCurrentView(v as View)} esAdmin={esAdmin} esVendedor={esVendedor} />}
          {currentView === 'overview' && (esVendedor ? <DashboardVendedor user={user} /> : <IncomeOverview />)}
          {currentView === 'inventario' && <InventarioManagement />}
          {currentView === 'diagnostico' && <DiagnosticoInventario />}
          {currentView === 'auditoria' && <AuditoriaInventario />}
          {currentView === 'categorias' && <CategoriasManagement />}
          {currentView === 'conteo' && <ConteoInventario />}
          {currentView === 'familias' && <FamiliasProducto />}
          {currentView === 'distribuir' && <DistribuirProductos />}
          {currentView === 'stock-bajo' && <StockBajo />}
          {currentView === 'notas-articulo' && <NotasArticulo />}
          {currentView === 'lotes-vencer' && <LotesPorVencer />}
          {currentView === 'config-etiquetas' && <ConfigEtiquetas />}
          {currentView === 'configuracion' && <ConfiguracionSistema />}
          {currentView === 'datos-empresa' && <DatosEmpresa />}
          {currentView === 'usuarios' && <UsuariosManagement />}
          {currentView === 'cuentas-cobrar' && <CuentasPorCobrar />}
          {currentView === 'top-clientes' && <TopClientes />}
          {currentView === 'cumpleanos' && <CumpleanosClientes />}
          {currentView === 'products' && <ProductsManagement />}
          {currentView === 'customers' && <CustomersManagement />}
          {currentView === 'suppliers' && <ProveedoresManagement />}
          {currentView === 'productos-proveedor' && <ProductosProveedor />}
          {currentView === 'cuentas-pagar' && <ProveedoresManagement modoCxP />}
          {currentView === 'purchases' && <PurchasesManagement />}
          {currentView === 'nueva-compra' && <NuevaCompra />}
          {currentView === 'sales' && <SalesManagement />}
          {currentView === 'ventas-tipo-pago' && <VentasPorTipoPago />}
          {currentView === 'nueva-venta' && <VentasTabs />}
          {currentView === 'facturacion-electronica' && <FacturacionElectronica />}
          {currentView === 'caja' && <CajaRegistradora />}
          {currentView === 'caja-historial' && <HistorialCajas />}
          {currentView === 'informes-hub' && <InformesHub />}
          {currentView === 'pagos-clientes' && <ListadoPagosClientes />}
          {currentView === 'pagos-proveedores' && <ListadoPagosProveedores />}
          {currentView === 'gastos' && <GastosManagement />}
          {currentView === 'bancos' && <BancosManagement />}
          {currentView === 'config-categorias-gasto' && <ConfigCategoriasGasto />}
          {currentView === 'config-retenciones' && <ConfigRetenciones />}
          {currentView === 'config-cajas' && <ConfigCajas />}
          {currentView === 'config-servidor' && <ConfigServidor />}
          {currentView === 'config-permisos' && <ConfigPermisos />}
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
                if (claveNueva !== claveConfirmar) { alert('Las contraseñas no coinciden'); return; }
                if (claveNueva.length < 4) { alert('La contraseña debe tener al menos 4 caracteres'); return; }
                try {
                  const { codificarPassword } = await import('../utils/passwordEncoder');
                  const r = await fetch('http://localhost:80/conta-app-backend/api/usuarios/listar.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'cambiar-pass', Id_Usuario: user?.id, contrasena: claveNueva, contrasena_actual: codificarPassword(claveActual) })
                  });
                  const d = await r.json();
                  if (d.success) { alert('Contraseña actualizada'); setShowCambiarClave(false); setClaveActual(''); setClaveNueva(''); setClaveConfirmar(''); }
                  else alert(d.message);
                } catch (e) { alert('Error al cambiar contraseña'); }
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