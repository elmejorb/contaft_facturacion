import { AxiosInstance } from 'axios';
import { createHttpClient } from './http';
import { useAuthStore } from '../stores/authStore';

let _client: AxiosInstance | null = null;

export const api = (): AxiosInstance => {
  if (!_client) {
    _client = createHttpClient({
      getToken: () => useAuthStore.getState().token,
      onUnauthorized: () => {
        useAuthStore.getState().clearSession();
      },
    });
  }
  return _client;
};

// ============== Auth ==============

export interface VendorDTO {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string | null;
  zona: string | null;
  can_edit_clients?: boolean;
}

export interface CompanyDTO {
  id: number;
  nombre: string;
  nit: string | null;
  direccion?: string | null;
  telefono?: string | null;
  factura_electronica_activa: boolean;
  // Modos del vendedor móvil (configurados por el admin desde Conta FT)
  modo_pedidos: boolean;
  modo_factura_pos: boolean;
  modo_factura_electronica: boolean;
}

export interface LoginResponse {
  error: boolean;
  mensaje: string;
  token: string;
  token_type: string;
  expira_en: number;
  vendedor: VendorDTO;
  empresa: CompanyDTO | null;
}

export const authApi = {
  login: async (email: string, password: string, id_empresa?: number): Promise<LoginResponse> => {
    // Si el APK está vinculado a una empresa (pairing previo), enviamos id_empresa
    // para que el hub desambigüe cuando haya vendedores con el mismo email en
    // distintas empresas. Backward-compat: sin id_empresa el login sigue funcionando.
    const body: Record<string, any> = { email, password };
    if (typeof id_empresa === 'number' && id_empresa > 0) body.id_empresa = id_empresa;
    const { data } = await api().post<LoginResponse>('/api/auth/login', body);
    return data;
  },

  me: async (): Promise<{ vendedor: VendorDTO; empresa: CompanyDTO | null }> => {
    const { data } = await api().get('/api/auth/me');
    return data;
  },

  refresh: async (): Promise<{ token: string; expira_en: number }> => {
    const { data } = await api().post('/api/auth/refresh');
    return data;
  },

  logout: async (): Promise<void> => {
    await api().post('/api/auth/logout');
  },
};

// ============== Empresa (pareo APK ↔ empresa por código WhatsApp / QR) ==============

export interface EmpresaVincularResponse {
  error: boolean;
  id_empresa: number;
  nombre_empresa: string;
  nit: string | null;
  token_api: string;
  codigo_pairing: string | null;
  codigo_pairing_expira: string | null;
  modo_pedidos: boolean;
  modo_factura_pos: boolean;
  modo_factura_electronica: boolean;
  factura_electronica_activa: boolean;
}

export const empresaApi = {
  /**
   * Valida un código de pareo (7 chars corto o token largo por QR) contra el hub
   * y devuelve los datos de la empresa. Idempotente — no consume el código.
   */
  vincular: async (codigo: string): Promise<EmpresaVincularResponse> => {
    const { data } = await api().post<EmpresaVincularResponse>('/api/empresa/vincular', { codigo });
    return data;
  },
};

// ============== Dashboard ==============

export interface DashboardResumen {
  hoy: { ventas: number; total: number };
  mes: { ventas: number; total: number };
  clientes_asignados: number;
  ventas_recientes: Array<{
    id_venta: number;
    numero_factura: string;
    total: string;
    estado: string;
    fecha_venta: string;
    created_at: string;
    nombre_razon_social: string;
  }>;
}

export const dashboardApi = {
  resumen: async (): Promise<DashboardResumen> => {
    const { data } = await api().get<DashboardResumen>('/api/dashboard/resumen');
    return data;
  },
};

// ============== Clientes ==============

export interface ClientDTO {
  id_cliente: number;
  codigo_cliente: string;
  creado_por_vendedor_mobile?: number | null;
  nombre_razon_social: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  digito_verificacion?: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  direccion: string | null;
  departamento?: string | null;
  municipio?: string | null;
  id_municipio?: number | null;
  id_departamento?: number | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
  precision_gps_metros?: number | string | null;
  gps_capturado_at?: string | null;
  tipo_responsabilidad?: string | null;
  regimen_tributario?: string | null;
  tipo_organizacion?: string | null;
  cupo_autorizado: string;
  estado: boolean;
  is_own?: boolean;
}

export interface ClientUpdatePayload {
  nombre_razon_social?: string;
  tipo_documento?: string;
  numero_documento?: string;
  digito_verificacion?: string | null;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  direccion?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  id_municipio?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  precision_gps_metros?: number | null;
  tipo_responsabilidad?: string | null;
  regimen_tributario?: string | null;
  tipo_organizacion?: string | null;
  cupo_autorizado?: number;
}

export const clientesApi = {
  list: async (q?: string): Promise<ClientDTO[]> => {
    const { data } = await api().get('/api/clientes', { params: { q, per_page: 200 } });
    return data.clientes;
  },

  show: async (id: number): Promise<ClientDTO> => {
    const { data } = await api().get(`/api/clientes/${id}`);
    return data.cliente;
  },

  create: async (payload: Partial<ClientDTO>): Promise<ClientDTO> => {
    const { data } = await api().post('/api/clientes', payload);
    return data.cliente;
  },

  update: async (id: number, payload: ClientUpdatePayload): Promise<ClientDTO> => {
    const { data } = await api().put(`/api/clientes/${id}`, payload);
    return data.cliente;
  },
};

// ============== Productos ==============

export interface ProductDTO {
  id_producto: number;
  id_categoria: number | null;
  codigo: string;
  nombre: string;
  precio_venta: string;
  stock: string;
  stock_minimo: string;
  unidad_medida: string;
  porcentaje_iva: string;
  estado: boolean;
}

export const productosApi = {
  list: async (q?: string): Promise<ProductDTO[]> => {
    const { data } = await api().get('/api/productos', { params: { q, per_page: 500 } });
    return data.productos;
  },
};

// ============== Categorías ==============

export interface CategoriaDTO {
  id_categoria: number;
  nombre: string;
  estado: number | boolean;
}

export const categoriasApi = {
  list: async (): Promise<CategoriaDTO[]> => {
    const { data } = await api().get('/api/categorias');
    return data.categorias;
  },
};

// ============== Geografía ==============

export interface MunicipioDTO {
  id: number;
  code: string;
  name: string;
  department_id: number;
  departamento_nombre: string;
  departamento_code: string;
  label: string;  // "Municipio - Departamento"
}

export interface DepartamentoDTO {
  id: number;
  code: string;
  name: string;
}

export const geoApi = {
  municipios: async (): Promise<MunicipioDTO[]> => {
    const { data } = await api().get('/api/catalogos/municipios');
    return data.municipios;
  },

  departamentos: async (): Promise<DepartamentoDTO[]> => {
    const { data } = await api().get('/api/catalogos/departamentos');
    return data.departamentos;
  },
};

// ============== Ventas ==============

export interface VentaDTO {
  id_venta: number;
  numero_factura: string;
  id_cliente: number;
  fecha_venta: string;
  subtotal: string;
  total_impuestos: string;
  descuento?: string;
  total: string;
  forma_pago: string;
  estado: string;
  origen?: string;
  observaciones?: string | null;
  cufe: string | null;
  qr_dian?: string | null;
  estado_dian?: string | null;
  nombre_razon_social?: string;
  numero_documento?: string;
  tipo_documento?: string;
  cliente_direccion?: string | null;
  cliente_telefono?: string | null;
}

export interface VentaDetalleDTO {
  id_detalle: number;
  id_venta: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
  descuento: string;
  porcentaje_iva: string;
  impuesto: string;
  total: string;
}

export interface VentaItemInput {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
  porcentaje_iva?: number;
}

export const ventasApi = {
  list: async (filters?: { origen?: string; excluir_origen?: string }): Promise<VentaDTO[]> => {
    const { data } = await api().get('/api/ventas', { params: filters });
    return data.ventas;
  },

  show: async (
    id: number | string,
  ): Promise<{ venta: VentaDTO; detalles: VentaDetalleDTO[] }> => {
    const { data } = await api().get(`/api/ventas/${id}`);
    return { venta: data.venta, detalles: data.detalles };
  },

  create: async (input: {
    id_cliente: number;
    forma_pago?: string;
    observaciones?: string;
    origen?: string;
    items: VentaItemInput[];
  }): Promise<VentaDTO> => {
    const { data } = await api().post('/api/ventas', input);
    return data.venta;
  },
};

// ============== Cargues (Cargue-Descargue) ==============

export interface CargueLinea {
  id?: number; // presente cuando el hub devuelve el detalle (cargues_detalle.id)
  item_id?: number; // presente al enviar (create)
  items?: number; // presente al leer (mi-actual)
  nombre_producto: string;
  cantidad?: number; // enviar
  cant_cargue?: number; // leer
  cant_devuelta?: number;
  cant_danada?: number;
  precio_venta?: number;
  precio_venta_unitario?: number;
  precio_costo?: number;
}

export interface CargueDTO {
  id: number;
  fecha: string;
  estado: 'pendiente' | 'aprobado' | 'cerrado' | 'rechazado';
  total_valor_cargue: number;
  notas_vendedor: string | null;
  notas_admin: string | null;
  aprobado_at: string | null;
  items: CargueLinea[];
}

export const carguesApi = {
  crear: async (input: { lineas: CargueLinea[]; notas?: string }): Promise<{ cargue_id: number; estado: string; total: number }> => {
    const { data } = await api().post('/api/cargues/mi-cargue', input);
    if (data.error) throw new Error(data.mensaje || 'Error');
    return { cargue_id: data.cargue_id, estado: data.estado, total: data.total };
  },

  miActual: async (): Promise<CargueDTO | null> => {
    const { data } = await api().get('/api/cargues/mi-actual');
    if (data.error) throw new Error(data.mensaje || 'Error');
    return data.cargue;
  },

  cerrar: async (id: number, input: {
    items: { id: number; cant_devuelta: number; cant_danada: number }[];
    dinero_recibido: number;
    notas?: string;
  }): Promise<{ total_devuelto: number; total_danado: number; dinero_recibido: number }> => {
    const { data } = await api().post(`/api/cargues/cerrar/${id}`, input);
    if (data.error) throw new Error(data.mensaje || 'Error');
    return data;
  },
};
