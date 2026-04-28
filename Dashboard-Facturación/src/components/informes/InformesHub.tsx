import { useState } from 'react';
import {
  Search, ArrowLeft, Wallet, TrendingUp, FileText, Receipt,
  ShoppingCart, Package, AlertTriangle, DollarSign, Users, BarChart3, ListChecks,
  Crown, Layers, HandCoins, PieChart as PieChartIcon,
  Truck, Calendar, CalendarDays, Percent, UserCheck, CalendarClock
} from 'lucide-react';
import { LotesPorVencer } from '../LotesPorVencer';
import { InformeCuadreCaja } from './InformeCuadreCaja';
import { InformeCierreMes } from './InformeCierreMes';
import { InformeEstadoResultados } from './InformeEstadoResultados';
import { InformeVentasListado } from './InformeVentasListado';
import { InformeComprasListado } from './InformeComprasListado';
import { InformeTopProductos } from './InformeTopProductos';
import { InformeInventarioValorizado } from './InformeInventarioValorizado';
import { InformeProductosAgotados } from './InformeProductosAgotados';
import { InformeGastos } from './InformeGastos';
import { InformeCartera } from './InformeCartera';
import { InformeCarteraResumida } from './InformeCarteraResumida';
import { InformeTopClientes } from './InformeTopClientes';
import { InformeVentasPorCategoria } from './InformeVentasPorCategoria';
import { InformePagosProveedores } from './InformePagosProveedores';
import { InformeGraficos } from './InformeGraficos';
import { InformeProveedoresListado } from './InformeProveedoresListado';
import { InformeSaldosProveedores } from './InformeSaldosProveedores';
import { InformeVentasMensual } from './InformeVentasMensual';
import { InformeVentasDiario } from './InformeVentasDiario';
import { InformeIVA } from './InformeIVA';
import { InformeFacturasVendedor } from './InformeFacturasVendedor';

type ReporteId =
  | 'cuadre' | 'cierre-mes' | 'estado-resultados' | 'iva'
  | 'ventas' | 'compras' | 'top-productos' | 'top-clientes' | 'ventas-categoria'
  | 'ventas-mensual' | 'ventas-diario' | 'facturas-vendedor'
  | 'inventario' | 'agotados' | 'productos-vencer'
  | 'gastos' | 'pagos-proveedores'
  | 'cartera' | 'cartera-resumida'
  | 'proveedores-listado' | 'proveedores-saldos'
  | 'graficos';

interface ReporteDef {
  id: ReporteId;
  titulo: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
  categoria: 'financieros' | 'ventas' | 'compras' | 'inventario' | 'gastos' | 'cartera' | 'analisis' | 'proveedores';
}

const REPORTES: ReporteDef[] = [
  // Financieros
  { id: 'cuadre', titulo: 'Cuadre de Caja', desc: 'Cierre diario por medio de pago, ingresos y egresos del día.', icon: Wallet, color: '#7c3aed', bg: '#f3e8ff', categoria: 'financieros' },
  { id: 'cierre-mes', titulo: 'Cierre de Mes', desc: 'Resumen contable del mes: ventas, costos, gastos y utilidad.', icon: TrendingUp, color: '#2563eb', bg: '#dbeafe', categoria: 'financieros' },
  { id: 'estado-resultados', titulo: 'Estado de Resultados', desc: 'P&L por rango de fechas con desglose de gastos por categoría.', icon: FileText, color: '#0891b2', bg: '#cffafe', categoria: 'financieros' },
  { id: 'iva', titulo: 'Informe de IVA', desc: 'IVA generado en ventas vs descontable en compras, saldo a pagar a la DIAN.', icon: Percent, color: '#2563eb', bg: '#dbeafe', categoria: 'financieros' },
  // Ventas
  { id: 'ventas', titulo: 'Listado de Ventas', desc: 'Todas las facturas del período con cliente, total y estado.', icon: Receipt, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  { id: 'ventas-mensual', titulo: 'Ventas Mensuales (con costo y utilidad)', desc: 'Resumen mes por mes del año con contado, crédito, costo, utilidad y margen.', icon: Calendar, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  { id: 'ventas-diario', titulo: 'Ventas Diarias (con costo y utilidad)', desc: 'Resumen día por día del rango con utilidad y margen.', icon: CalendarDays, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  { id: 'top-productos', titulo: 'Artículos Más Vendidos', desc: 'Top N productos con cantidad, monto, costo y utilidad.', icon: BarChart3, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  { id: 'top-clientes', titulo: 'Top Clientes', desc: 'Mejores clientes del período con monto, ticket promedio y % de participación.', icon: Crown, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  { id: 'ventas-categoria', titulo: 'Ventas por Categoría', desc: 'Distribución de ventas y utilidad por categoría de producto, con gráfica de barras.', icon: Layers, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  { id: 'facturas-vendedor', titulo: 'Ventas por Vendedor', desc: 'Ranking por vendedor con número de facturas, ticket promedio y participación.', icon: UserCheck, color: '#16a34a', bg: '#dcfce7', categoria: 'ventas' },
  // Compras
  { id: 'compras', titulo: 'Listado de Compras', desc: 'Pedidos a proveedores con flete, descuentos y saldo pendiente.', icon: ShoppingCart, color: '#d97706', bg: '#fef3c7', categoria: 'compras' },
  // Proveedores
  { id: 'proveedores-listado', titulo: 'Listado de Proveedores', desc: 'Todos los proveedores con datos de contacto, total comprado y saldo actual.', icon: Truck, color: '#d97706', bg: '#fef3c7', categoria: 'proveedores' },
  { id: 'proveedores-saldos', titulo: 'Saldos a Proveedores (Cuentas por Pagar)', desc: 'Proveedor por proveedor con cada factura y aging por edades.', icon: HandCoins, color: '#dc2626', bg: '#fee2e2', categoria: 'proveedores' },
  // Inventario
  { id: 'inventario', titulo: 'Inventario Valorizado', desc: 'Stock actual × costo + utilidad potencial al vender todo.', icon: Package, color: '#7c3aed', bg: '#f3e8ff', categoria: 'inventario' },
  { id: 'agotados', titulo: 'Productos Agotados / Stock Bajo', desc: 'Productos en cero o por debajo del mínimo, con faltante calculado.', icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2', categoria: 'inventario' },
  { id: 'productos-vencer', titulo: 'Productos por Vencer', desc: 'Lotes activos con fecha de vencimiento — agrupados por urgencia. Permite dar de baja vencidos.', icon: CalendarClock, color: '#dc2626', bg: '#fee2e2', categoria: 'inventario' },
  // Gastos
  { id: 'gastos', titulo: 'Gastos del Período', desc: 'Gastos detallados con agrupación por categoría y porcentajes.', icon: DollarSign, color: '#dc2626', bg: '#fee2e2', categoria: 'gastos' },
  { id: 'pagos-proveedores', titulo: 'Pagos a Proveedores', desc: 'Pagos por proveedor en el período + detalle de comprobantes.', icon: HandCoins, color: '#d97706', bg: '#fef3c7', categoria: 'gastos' },
  // Cartera
  { id: 'cartera', titulo: 'Cartera Detallada', desc: 'Cobranza: cliente + cada factura con aging (sin vencer / 1-30 / 31-60 / +60).', icon: ListChecks, color: '#dc2626', bg: '#fee2e2', categoria: 'cartera' },
  { id: 'cartera-resumida', titulo: 'Cartera Resumida', desc: 'Listado simple de clientes con su saldo total pendiente.', icon: Users, color: '#0891b2', bg: '#cffafe', categoria: 'cartera' },
  // Análisis
  { id: 'graficos', titulo: 'Análisis Gráfico', desc: 'Panel visual: ventas por mes, top productos, distribución de gastos y tendencia diaria.', icon: PieChartIcon, color: '#9333ea', bg: '#f3e8ff', categoria: 'analisis' },
];

const CATEGORIAS = [
  { id: 'financieros' as const, nombre: 'Resúmenes Financieros', color: '#2563eb' },
  { id: 'analisis' as const,    nombre: 'Análisis y Gráficos',   color: '#9333ea' },
  { id: 'ventas' as const,      nombre: 'Ventas',                color: '#16a34a' },
  { id: 'compras' as const,     nombre: 'Compras',               color: '#d97706' },
  { id: 'proveedores' as const, nombre: 'Proveedores',           color: '#d97706' },
  { id: 'inventario' as const,  nombre: 'Inventario',            color: '#7c3aed' },
  { id: 'gastos' as const,      nombre: 'Gastos y Pagos',        color: '#dc2626' },
  { id: 'cartera' as const,     nombre: 'Cartera (Cobranza)',    color: '#0891b2' },
];

export function InformesHub() {
  const [activo, setActivo] = useState<ReporteId | null>(null);
  const [busqueda, setBusqueda] = useState('');

  if (activo) {
    return (
      <div>
        <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 5 }}>
          <button onClick={() => setActivo(null)}
            style={{ height: 32, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Volver al panel de informes
          </button>
        </div>
        {activo === 'cuadre' && <InformeCuadreCaja />}
        {activo === 'cierre-mes' && <InformeCierreMes />}
        {activo === 'estado-resultados' && <InformeEstadoResultados />}
        {activo === 'ventas' && <InformeVentasListado />}
        {activo === 'compras' && <InformeComprasListado />}
        {activo === 'top-productos' && <InformeTopProductos />}
        {activo === 'inventario' && <InformeInventarioValorizado />}
        {activo === 'agotados' && <InformeProductosAgotados />}
        {activo === 'productos-vencer' && <LotesPorVencer />}
        {activo === 'gastos' && <InformeGastos />}
        {activo === 'cartera' && <InformeCartera />}
        {activo === 'cartera-resumida' && <InformeCarteraResumida />}
        {activo === 'top-clientes' && <InformeTopClientes />}
        {activo === 'ventas-categoria' && <InformeVentasPorCategoria />}
        {activo === 'pagos-proveedores' && <InformePagosProveedores />}
        {activo === 'graficos' && <InformeGraficos />}
        {activo === 'proveedores-listado' && <InformeProveedoresListado />}
        {activo === 'proveedores-saldos' && <InformeSaldosProveedores />}
        {activo === 'ventas-mensual' && <InformeVentasMensual />}
        {activo === 'ventas-diario' && <InformeVentasDiario />}
        {activo === 'iva' && <InformeIVA />}
        {activo === 'facturas-vendedor' && <InformeFacturasVendedor />}
      </div>
    );
  }

  const reportesFiltrados = busqueda
    ? REPORTES.filter(r =>
        r.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.desc.toLowerCase().includes(busqueda.toLowerCase()))
    : REPORTES;

  return (
    <div style={{ padding: 20, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1f2937', letterSpacing: -0.5 }}>Informes</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Selecciona el reporte que necesitas. Todos se pueden imprimir o guardar como PDF.
          </p>
        </div>
        <div style={{ position: 'relative', minWidth: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar reporte..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 38, paddingLeft: 34, paddingRight: 12, border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} />
        </div>
      </div>

      {/* Cards agrupadas por categoría */}
      {CATEGORIAS.map(cat => {
        const reps = reportesFiltrados.filter(r => r.categoria === cat.id);
        if (reps.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 4, height: 22, background: cat.color, borderRadius: 2 }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat.nombre}</h2>
              <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>· {reps.length} reporte{reps.length === 1 ? '' : 's'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {reps.map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.id} onClick={() => setActivo(r.id)}
                    style={{
                      textAlign: 'left', padding: 16, background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 12, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120,
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = r.color;
                      e.currentTarget.style.boxShadow = `0 4px 12px ${r.color}25`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={20} color={r.color} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>{r.titulo}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{r.desc}</div>
                    <div style={{ marginTop: 'auto', fontSize: 11, fontWeight: 600, color: r.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Abrir reporte →
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {reportesFiltrados.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          Sin reportes que coincidan con "<b>{busqueda}</b>"
        </div>
      )}
    </div>
  );
}
