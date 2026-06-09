export type SyncStatus = 'pending' | 'sent' | 'error' | 'draft';

export interface Client {
  id: string;
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  balance?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  taxRate: number;
  category?: string;
}

export interface LineItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  taxRate: number;
}

export interface Order {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  status: SyncStatus;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientTaxId: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  status: SyncStatus;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'credit';
}
