import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Package,
  RefreshCw,
  Search,
  AlertTriangle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import api from '../services/api';

interface Producto {
  Items: number;
  Codigo: string;
  Descripcion: string;
  Existencia: number;
  Iva: number;
  Costo: number;
  Precio1: number;
  Precio2: number;
  Precio3: number;
  PrecioMinimo: number;
  Categoria: string;
  Proveedor: string;
  Estado: string;
}

interface Filtros {
  buscarPor: string;
  ordenarPor: string;
  orden: string;
  estado: string;
}

export function ProductsManagement() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Filtros>({
    buscarPor: 'Descripcion',
    ordenarPor: 'Codigo',
    orden: 'ASC',
    estado: 'Activos',
  });

  useEffect(() => {
    cargarProductos();
  }, [filtros]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventario/articulos.php', {
        params: filtros,
      });
      setProductos(response.data.articulos || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los productos. Verifica que el servidor esté activo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter((producto) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      producto.Codigo?.toLowerCase().includes(term) ||
      producto.Descripcion?.toLowerCase().includes(term) ||
      producto.Categoria?.toLowerCase().includes(term) ||
      producto.Proveedor?.toLowerCase().includes(term)
    );
  });

  const formatearMoneda = (valor: number) => {
    return '$ ' + new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  };

  const calcularUtilidad = (precio: number, costo: number) => {
    if (!costo || costo === 0 || !precio || precio === 0) return 0;
    return Number((((precio - costo) / precio) * 100).toFixed(2));
  };

  // Stats
  const totalProductos = productos.length;
  const totalInventario = productos.reduce((sum, p) => sum + (p.Existencia * p.Costo || 0), 0);
  const sinStock = productos.filter((p) => p.Existencia <= 0).length;
  const promedioUtilidad = productos.length > 0
    ? (productos.reduce((sum, p) => sum + calcularUtilidad(p.Precio1, p.Costo), 0) / productos.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Listado de Productos</h1>
        <p className="text-sm text-gray-500 mt-1">Consulta y gestiona todos los productos del sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Productos</p>
                <p className="text-2xl font-semibold text-gray-900">{totalProductos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor Inventario</p>
                <p className="text-xl font-semibold text-gray-900">{formatearMoneda(totalInventario)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Utilidad Promedio</p>
                <p className="text-2xl font-semibold text-gray-900">{promedioUtilidad}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sin Stock</p>
                <p className="text-2xl font-semibold text-gray-900">{sinStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase">Buscar Por</label>
              <select
                value={filtros.buscarPor}
                onChange={(e) => setFiltros({ ...filtros, buscarPor: e.target.value })}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="Codigo">Codigo</option>
                <option value="Descripcion">Nombre del Articulo</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por codigo, nombre, categoria o proveedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase">Ordenar Por</label>
              <select
                value={filtros.ordenarPor}
                onChange={(e) => setFiltros({ ...filtros, ordenarPor: e.target.value })}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="Codigo">Codigo</option>
                <option value="Descripcion">Nombre</option>
                <option value="Existencia">Existencia</option>
                <option value="Precio1">Precio</option>
                <option value="Categoria">Categoria</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase">Orden</label>
              <select
                value={filtros.orden}
                onChange={(e) => setFiltros({ ...filtros, orden: e.target.value })}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="ASC">A-Z</option>
                <option value="DESC">Z-A</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="Activos">Activos</option>
                <option value="Todos">Todos</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={cargarProductos}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-xs h-7"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Refrescar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="text-gray-500">Cargando productos...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={cargarProductos} variant="outline">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-purple-100 text-purple-900">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide">Codigo</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide">Nombre Articulo</th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide">Exist.</th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide">IVA</th>
                  <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Costo</th>
                  <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Precio V1</th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide">% Util</th>
                  <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Precio V2</th>
                  <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Precio V3</th>
                  <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Precio Min</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide">Categoria</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide">Proveedor</th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-12 text-center text-gray-500">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((producto, index) => {
                    const utilidad = calcularUtilidad(producto.Precio1, producto.Costo);
                    return (
                      <tr
                        key={producto.Items || producto.Codigo}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                        } ${producto.Existencia <= 0 ? '!bg-red-50' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-purple-600 font-medium">{producto.Codigo}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{producto.Descripcion}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: producto.Existencia > 0 ? '#dbeafe' : '#fee2e2',
                              color: producto.Existencia > 0 ? '#1d4ed8' : '#dc2626',
                            }}
                          >
                            {parseFloat(String(producto.Existencia || 0)).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-500">{producto.Iva || 0}%</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatearMoneda(producto.Costo)}</td>
                        <td className="px-3 py-2.5 text-right text-green-600 font-medium">{formatearMoneda(producto.Precio1)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: utilidad >= 0 ? '#dbeafe' : '#fee2e2',
                              color: utilidad >= 0 ? '#1d4ed8' : '#dc2626',
                            }}
                          >
                            {utilidad}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{formatearMoneda(producto.Precio2)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{formatearMoneda(producto.Precio3)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{formatearMoneda(producto.PrecioMinimo)}</td>
                        <td className="px-3 py-2.5 text-gray-500">{producto.Categoria || 'VARIOS'}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{producto.Proveedor || '-'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: producto.Estado === 'Activo' ? '#22c55e' : '#ef4444',
                              color: '#ffffff',
                            }}
                          >
                            {producto.Estado || 'Activo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Footer */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center text-sm text-gray-500">
          Mostrando <span className="font-semibold text-purple-600">{productosFiltrados.length}</span> de{' '}
          <span className="font-semibold text-purple-600">{productos.length}</span> productos
        </CardContent>
      </Card>
    </div>
  );
}
