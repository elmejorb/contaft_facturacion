import { useState } from 'react';
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
  CreditCard,
  Cake,
  Crown,
  Boxes
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
import { InventarioManagement } from './InventarioManagement';
import { DiagnosticoInventario } from './DiagnosticoInventario';
import { AuditoriaInventario } from './AuditoriaInventario';
import { CategoriasManagement } from './CategoriasManagement';
import { ConteoInventario } from './ConteoInventario';
import { ConfiguracionSistema } from './ConfiguracionSistema';
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

type View = 'overview' | 'products' | 'customers' | 'suppliers' | 'purchases' | 'sales' | 'inventario' | 'diagnostico' | 'auditoria' | 'categorias' | 'conteo' | 'configuracion' | 'cuentas-cobrar' | 'top-clientes' | 'cumpleanos' | 'cuentas-pagar' | 'productos-proveedor' | 'nueva-venta' | 'ventas-tipo-pago' | 'datos-empresa' | 'usuarios' | 'nueva-compra';

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
  const [currentView, setCurrentView] = useState<View>('overview');
  const cumpleProximos = useCumpleanosHoy();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Panel de Ingresos',
      icon: LayoutDashboard,
      view: 'overview',
      badge: '5'
    },
    {
      id: 'inventario',
      label: 'Inventario',
      icon: Boxes,
      badge: 'New',
      badgeVariant: 'secondary',
      children: [
        { id: 'inventario-list', label: 'Listado de Artículos', view: 'inventario' },
        { id: 'inventario-categorias', label: 'Categorías', view: 'categorias' as View },
        { id: 'inventario-diagnostico', label: 'Diagnóstico (30 días)', view: 'diagnostico' as View },
        { id: 'inventario-auditoria', label: 'Auditoría (90 días)', view: 'auditoria' as View },
        { id: 'inventario-conteo', label: 'Conteo de Inventario', view: 'conteo' as View },
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
        { id: 'supplier-cartera', label: 'Cuentas por Pagar', view: 'cuentas-pagar' as View },
      ]
    },
    { 
      id: 'sales', 
      label: 'Ventas', 
      icon: TrendingUp,
      badge: 'New',
      badgeVariant: 'secondary',
      children: [
        { id: 'new-sale', label: 'Nueva Venta', view: 'nueva-venta' as View },
        { id: 'sales-list', label: 'Listado de Ventas', view: 'sales' },
        { id: 'sales-by-payment', label: 'Listado por Tipo de Pago', view: 'ventas-tipo-pago' as View },
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
      ]
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
      children: [
        { id: 'config-sistema', label: 'Sistema e Impresión', view: 'configuracion' as View },
        { id: 'config-empresa', label: 'Datos de la Empresa', view: 'datos-empresa' as View },
        { id: 'config-usuarios', label: 'Usuarios', view: 'usuarios' as View },
      ]
    },
  ];

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
        <header className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:bg-gray-100"
                style={{ width: 32, height: 32 }}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>DISTRIBUIDORA DE SALSAS DE PLANETA RICA</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>NIT: 901.529.697-3 — Régimen Común</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 relative"
                onClick={() => setCurrentView('cumpleanos')}
                title={cumpleProximos.length > 0 ? `${cumpleProximos.length} cumpleaños próximos` : 'Sin cumpleaños próximos'}
                style={{ width: 32, height: 32 }}
              >
                <Bell className="w-4 h-4 text-gray-600" />
                {cumpleProximos.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full" style={{ fontSize: 9, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', fontWeight: 700 }}>
                    {cumpleProximos.length}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                    <Avatar className="w-7 h-7 border-2 border-purple-200">
                      <AvatarFallback style={{ fontSize: 11 }}>
                        {user?.nombre?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span style={{ fontSize: 12 }}>{user?.nombre || user?.username || 'Usuario'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <div className="px-3 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold">{user?.nombre || user?.username || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 mt-1">{user?.tipoUsuario || 'Usuario del Sistema'}</p>
                  </div>
                  <div className="py-1">
                    <DropdownMenuItem className="cursor-pointer py-2 px-3" onClick={() => setCurrentView('configuracion')}>
                      <Settings className="w-4 h-4 mr-2 text-blue-600" />
                      <span>Configuración</span>
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

        <div className="p-6">
          {currentView === 'overview' && <IncomeOverview />}
          {currentView === 'inventario' && <InventarioManagement />}
          {currentView === 'diagnostico' && <DiagnosticoInventario />}
          {currentView === 'auditoria' && <AuditoriaInventario />}
          {currentView === 'categorias' && <CategoriasManagement />}
          {currentView === 'conteo' && <ConteoInventario />}
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
          {currentView === 'cuentas-pagar' && <ProveedoresManagement />}
          {currentView === 'purchases' && <PurchasesManagement />}
          {currentView === 'nueva-compra' && <NuevaCompra />}
          {currentView === 'sales' && <SalesManagement />}
          {currentView === 'ventas-tipo-pago' && <VentasPorTipoPago />}
          {currentView === 'nueva-venta' && <VentasTabs />}
        </div>
      </main>
    </div>
  );
}