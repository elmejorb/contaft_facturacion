import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { DollarSign, ShoppingCart, Package, CreditCard, AlertTriangle, Users, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Button } from './ui/button';
import api from '../services/api';

interface Resumen {
  ventasHoy: { cantidad: number; total: number };
  ventasMes: { cantidad: number; total: number };
  ventasMesAnterior: { cantidad: number; total: number };
  cuentasPorCobrar: { cantidad: number; total: number };
  pagosHoy: { cantidad: number; total: number };
  pagosMes: { cantidad: number; total: number };
  productos: { activos: number; sinStock: number; valorInventario: number };
  clientesMes: number;
  topProductos: { Codigo: string; Descripcion: string; CantidadVendida: number; TotalVendido: number }[];
  ventasSemana: { fecha: string; cantidad: number; total: number }[];
  empresa: { Empresa: string; Propietario: string; Nit: string } | null;
}

export function IncomeOverview() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarResumen();
  }, []);

  const cargarResumen = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/resumen.php');
      if (response.data.success) {
        setResumen(response.data.resumen);
        setError(null);
      }
    } catch (err) {
      setError('Error al cargar el resumen');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatearMoneda = (valor: number) => {
    return '$ ' + new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor || 0);
  };

  const formatearFecha = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[d.getDay()] + ' ' + d.getDate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-500">Cargando resumen...</span>
      </div>
    );
  }

  if (error || !resumen) {
    return (
      <div className="text-center p-12">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={cargarResumen} variant="outline">Reintentar</Button>
      </div>
    );
  }

  const cambioMes = resumen.ventasMesAnterior.total > 0
    ? (((resumen.ventasMes.total - resumen.ventasMesAnterior.total) / resumen.ventasMesAnterior.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {resumen.empresa?.Empresa || 'Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">NIT: {resumen.empresa?.Nit || '-'} — Resumen en tiempo real</p>
        </div>
        <Button
          onClick={cargarResumen}
          variant="outline"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Top Stats - 5 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Ventas del Día */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {resumen.ventasHoy.cantidad} fact.
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Ventas Hoy</p>
            <p className="text-xl font-semibold text-gray-900">{formatearMoneda(resumen.ventasHoy.total)}</p>
          </CardContent>
        </Card>

        {/* Ventas del Mes */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                Number(cambioMes) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {Number(cambioMes) >= 0 ? '+' : ''}{cambioMes}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Ventas del Mes</p>
            <p className="text-xl font-semibold text-gray-900">{formatearMoneda(resumen.ventasMes.total)}</p>
            <p className="text-[10px] text-gray-400 mt-1">{resumen.ventasMes.cantidad} facturas</p>
          </CardContent>
        </Card>

        {/* Pagos Recibidos */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-cyan-600" />
              </div>
              <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
                {resumen.pagosMes.cantidad} pagos
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Pagos del Mes</p>
            <p className="text-xl font-semibold text-gray-900">{formatearMoneda(resumen.pagosMes.total)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Hoy: {formatearMoneda(resumen.pagosHoy.total)}</p>
          </CardContent>
        </Card>

        {/* Cuentas por Cobrar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {resumen.cuentasPorCobrar.cantidad} pend.
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Cuentas por Cobrar</p>
            <p className="text-xl font-semibold text-gray-900">{formatearMoneda(resumen.cuentasPorCobrar.total)}</p>
          </CardContent>
        </Card>

        {/* Inventario */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              {resumen.productos.sinStock > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {resumen.productos.sinStock} sin stock
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-1">Productos Activos</p>
            <p className="text-xl font-semibold text-gray-900">{resumen.productos.activos.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-1">Inv: {formatearMoneda(resumen.productos.valorInventario)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas últimos 7 días */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Ventas Últimos 7 Días</CardTitle>
              <CardDescription className="text-xs">Total facturado por día</CardDescription>
            </CardHeader>
            <CardContent>
              {resumen.ventasSemana.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={resumen.ventasSemana.map(d => ({
                    dia: formatearFecha(d.fecha),
                    total: Number(d.total),
                    facturas: Number(d.cantidad),
                  }))}>
                    <defs>
                      <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="dia" stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#9ca3af"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatearMoneda(value), 'Total']}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#8b5cf6" fill="url(#ventasGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-3" />
                  <p className="text-sm">No hay ventas en los últimos 7 días</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Productos del Mes */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Top Productos del Mes</CardTitle>
            <CardDescription className="text-xs">Más vendidos por cantidad</CardDescription>
          </CardHeader>
          <CardContent>
            {resumen.topProductos.length > 0 ? (
              <div className="space-y-4">
                {resumen.topProductos.map((prod, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                      index === 0 ? 'bg-purple-600' : index === 1 ? 'bg-cyan-500' : index === 2 ? 'bg-orange-500' : 'bg-gray-400'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{prod.Descripcion || 'Producto ' + prod.Codigo}</p>
                      <p className="text-xs text-gray-500">{Number(prod.CantidadVendida)} unidades</p>
                    </div>
                    <p className="text-sm font-medium text-green-600">{formatearMoneda(Number(prod.TotalVendido))}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Package className="w-10 h-10 mb-2" />
                <p className="text-sm">Sin ventas este mes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Clientes este Mes</p>
                <p className="text-2xl font-semibold text-gray-900">{resumen.clientesMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Valor del Inventario</p>
                <p className="text-xl font-semibold text-gray-900">{formatearMoneda(resumen.productos.valorInventario)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Productos sin Stock</p>
                <p className="text-2xl font-semibold text-gray-900">{resumen.productos.sinStock}</p>
                <p className="text-[10px] text-gray-400">de {resumen.productos.activos} activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
