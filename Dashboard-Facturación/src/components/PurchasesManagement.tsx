import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Eye, Search } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Purchase {
  id: number;
  date: string;
  supplier: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export function PurchasesManagement() {
  const [purchases, setPurchases] = useState<Purchase[]>([
    { id: 1, date: '2024-11-15', supplier: 'TechSupply Co.', product: 'Laptop HP ProBook', quantity: 10, unitPrice: 800, total: 8000, status: 'completed' },
    { id: 2, date: '2024-11-14', supplier: 'GlobalTech', product: 'Mouse Logitech', quantity: 50, unitPrice: 20, total: 1000, status: 'completed' },
    { id: 3, date: '2024-11-13', supplier: 'Office Plus', product: 'Silla Ergonómica', quantity: 5, unitPrice: 150, total: 750, status: 'pending' },
    { id: 4, date: '2024-11-12', supplier: 'TechSupply Co.', product: 'Monitor Samsung 24"', quantity: 15, unitPrice: 180, total: 2700, status: 'completed' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    product: '',
    quantity: '',
    unitPrice: '',
  });

  const filteredPurchases = purchases.filter(purchase =>
    purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = parseInt(formData.quantity);
    const unitPrice = parseFloat(formData.unitPrice);
    const newPurchase: Purchase = {
      id: Math.max(...purchases.map(p => p.id)) + 1,
      date: new Date().toISOString().split('T')[0],
      supplier: formData.supplier,
      product: formData.product,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      status: 'pending',
    };
    setPurchases([newPurchase, ...purchases]);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ supplier: '', product: '', quantity: '', unitPrice: '' });
    setIsDialogOpen(false);
  };

  const getStatusColor = (status: Purchase['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
    }
  };

  const getStatusLabel = (status: Purchase['status']) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Gestión de Compras</h2>
          <p className="text-gray-500">Registra y administra tus compras a proveedores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Compra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Compra</DialogTitle>
              <DialogDescription>
                Registra una nueva compra a proveedor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Select value={formData.supplier} onValueChange={(value) => setFormData({ ...formData, supplier: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TechSupply Co.">TechSupply Co.</SelectItem>
                    <SelectItem value="Office Plus">Office Plus</SelectItem>
                    <SelectItem value="GlobalTech">GlobalTech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Producto</Label>
                <Select value={formData.product} onValueChange={(value) => setFormData({ ...formData, product: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laptop HP ProBook">Laptop HP ProBook</SelectItem>
                    <SelectItem value="Mouse Logitech">Mouse Logitech</SelectItem>
                    <SelectItem value="Teclado Mecánico">Teclado Mecánico</SelectItem>
                    <SelectItem value="Monitor Samsung 24">Monitor Samsung 24"</SelectItem>
                    <SelectItem value="Silla Ergonómica">Silla Ergonómica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Precio Unitario</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                  />
                </div>
              </div>
              {formData.quantity && formData.unitPrice && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl">
                    ${(parseFloat(formData.quantity) * parseFloat(formData.unitPrice)).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Registrar Compra
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar compras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>#{purchase.id}</TableCell>
                  <TableCell>{purchase.date}</TableCell>
                  <TableCell>{purchase.supplier}</TableCell>
                  <TableCell>{purchase.product}</TableCell>
                  <TableCell>{purchase.quantity}</TableCell>
                  <TableCell>${purchase.unitPrice.toFixed(2)}</TableCell>
                  <TableCell>${purchase.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(purchase.status)}>
                      {getStatusLabel(purchase.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
