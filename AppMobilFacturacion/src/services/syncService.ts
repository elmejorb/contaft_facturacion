import { clientesApi, productosApi, categoriasApi, ventasApi, geoApi, ClientDTO } from './api';
import { clientsRepo } from '../db/clientsRepo';
import { productsRepo } from '../db/productsRepo';
import { categoriesRepo } from '../db/categoriesRepo';
import { municipiosRepo } from '../db/municipiosRepo';
import { pendingSalesRepo, PendingSale, CreatePendingSaleInput } from '../db/pendingSalesRepo';
import {
  pendingClientsRepo,
  PendingClient,
  CreatePendingClientInput,
} from '../db/pendingClientsRepo';
import { ApiError } from './http';
import { useNetworkStore } from '../stores/networkStore';
import { useSyncStore } from '../stores/syncStore';

export interface CatalogSyncResult {
  clients: number;
  products: number;
  categories: number;
  municipios?: number;
  error?: string;
}

export interface PendingSyncResult {
  sent: number;
  failed: number;
  total: number;
}

/**
 * Descarga catálogos desde el API y los guarda en SQLite.
 * Llamado típicamente tras login y en pull-to-refresh.
 */
export const syncCatalogsFromApi = async (
  empresaId: number,
): Promise<CatalogSyncResult> => {
  const result: CatalogSyncResult = { clients: 0, products: 0, categories: 0, municipios: 0 };
  try {
    const [clients, products, categories] = await Promise.all([
      clientesApi.list(),
      productosApi.list(),
      categoriasApi.list(),
    ]);
    await Promise.all([
      clientsRepo.replaceAll(empresaId, clients),
      productsRepo.replaceAll(empresaId, products),
      categoriesRepo.replaceAll(empresaId, categories),
    ]);
    result.clients = clients.length;
    result.products = products.length;
    result.categories = categories.length;

    // Municipios: solo sincronizar si la cache local está vacía
    // (cambian rara vez, ~1100 registros, no necesita refresh constante)
    try {
      const existingCount = await municipiosRepo.count();
      if (existingCount === 0) {
        const municipios = await geoApi.municipios();
        await municipiosRepo.replaceAll(municipios);
        result.municipios = municipios.length;
      } else {
        result.municipios = existingCount;
      }
    } catch {
      // No bloqueante
    }
  } catch (e) {
    result.error = e instanceof ApiError ? e.message : 'Error al sincronizar';
  }
  return result;
};

/**
 * Procesa la cola de ventas pendientes: intenta enviar cada una al API.
 * Se llama cuando el móvil recupera conexión o manualmente desde la pantalla de sync.
 */
export const flushPendingSales = async (
  vendedorId: number,
  onProgress?: (done: number, total: number) => void,
): Promise<PendingSyncResult> => {
  const pendientes = await pendingSalesRepo.listByVendor(vendedorId);
  const pendingOrError = pendientes.filter(
    (p) => p.status === 'pending' || p.status === 'error',
  );
  const total = pendingOrError.length;
  let sent = 0;
  let failed = 0;

  if (total === 0) return { sent, failed, total };

  useSyncStore.getState().startSync();
  try {
    for (let i = 0; i < pendingOrError.length; i++) {
      const p = pendingOrError[i];
      onProgress?.(i, total);
      const ok = await trySendOne(p);
      if (ok) sent++;
      else failed++;
    }
    onProgress?.(total, total);
  } finally {
    useSyncStore.getState().finishSync({ sent, failed, total });
  }

  return { sent, failed, total };
};

const trySendOne = async (sale: PendingSale): Promise<boolean> => {
  try {
    await pendingSalesRepo.markSending(sale.id);
    const resp = await ventasApi.create({
      id_cliente: sale.id_cliente,
      forma_pago: sale.forma_pago,
      origen: sale.origen,
      observaciones: sale.observaciones ?? undefined,
      items: sale.items,
    });
    await pendingSalesRepo.markSent(sale.id, resp.id_venta, resp.numero_factura);
    return true;
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Error desconocido';
    await pendingSalesRepo.markError(sale.id, msg);
    return false;
  }
};

/**
 * Guarda una venta en la cola local y, si hay red, intenta enviarla inmediatamente.
 * Retorna el resultado: enviada al servidor o quedó pendiente de sync.
 */
export interface SaveOrQueueResult {
  sent: boolean;
  pendingId: number;
  remoteIdVenta?: number;
  remoteNumeroFactura?: string;
  error?: string;
}

export const saveOrQueueSale = async (
  input: CreatePendingSaleInput,
): Promise<SaveOrQueueResult> => {
  const pending = await pendingSalesRepo.enqueue(input);
  const online = useNetworkStore.getState().online;
  if (!online) {
    useSyncStore.getState().finishSync();
    return { sent: false, pendingId: pending.id };
  }
  try {
    await pendingSalesRepo.markSending(pending.id);
    const resp = await ventasApi.create({
      id_cliente: pending.id_cliente,
      forma_pago: pending.forma_pago,
      origen: pending.origen,
      observaciones: pending.observaciones ?? undefined,
      items: pending.items,
    });
    await pendingSalesRepo.markSent(pending.id, resp.id_venta, resp.numero_factura);
    useSyncStore.getState().finishSync({ sent: 1, failed: 0, total: 1 });
    return {
      sent: true,
      pendingId: pending.id,
      remoteIdVenta: resp.id_venta,
      remoteNumeroFactura: resp.numero_factura,
    };
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Error al enviar';
    await pendingSalesRepo.markError(pending.id, msg);
    useSyncStore.getState().finishSync({ sent: 0, failed: 1, total: 1 });
    return { sent: false, pendingId: pending.id, error: msg };
  }
};

// ============================================================================
// CLIENTES: cola offline + envío
// ============================================================================

export interface SaveOrQueueClientResult {
  sent: boolean;
  pendingId: number;
  remoteClient?: ClientDTO;
  error?: string;
}

const pendingClientToPayload = (p: PendingClient): Partial<ClientDTO> => ({
  nombre_razon_social: p.nombre_razon_social,
  tipo_documento: p.tipo_documento ?? undefined,
  numero_documento: p.numero_documento ?? undefined,
  telefono: p.telefono ?? undefined,
  celular: p.celular ?? undefined,
  email: p.email ?? undefined,
  direccion: p.direccion ?? undefined,
  cupo_autorizado: p.cupo_autorizado,
  ...(p.digito_verificacion ? { digito_verificacion: p.digito_verificacion } as any : {}),
  ...(p.departamento ? { departamento: p.departamento } as any : {}),
  ...(p.municipio ? { municipio: p.municipio } as any : {}),
  ...(p.id_municipio ? { id_municipio: p.id_municipio } as any : {}),
  ...(p.latitud != null ? { latitud: p.latitud } as any : {}),
  ...(p.longitud != null ? { longitud: p.longitud } as any : {}),
  ...(p.precision_gps_metros != null ? { precision_gps_metros: p.precision_gps_metros } as any : {}),
  ...(p.tipo_responsabilidad ? { tipo_responsabilidad: p.tipo_responsabilidad } as any : {}),
  ...(p.regimen_tributario ? { regimen_tributario: p.regimen_tributario } as any : {}),
  ...(p.tipo_organizacion ? { tipo_organizacion: p.tipo_organizacion } as any : {}),
});

export const saveOrQueueClient = async (
  input: CreatePendingClientInput,
): Promise<SaveOrQueueClientResult> => {
  const pending = await pendingClientsRepo.enqueue(input);
  const online = useNetworkStore.getState().online;
  if (!online) {
    useSyncStore.getState().finishSync();
    return { sent: false, pendingId: pending.id };
  }
  try {
    await pendingClientsRepo.markSending(pending.id);
    const remote = await clientesApi.create(pendingClientToPayload(pending));
    await pendingClientsRepo.markSent(
      pending.id,
      remote.id_cliente,
      remote.codigo_cliente,
    );
    useSyncStore.getState().finishSync({ sent: 1, failed: 0, total: 1 });
    return { sent: true, pendingId: pending.id, remoteClient: remote };
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Error al enviar';
    await pendingClientsRepo.markError(pending.id, msg);
    useSyncStore.getState().finishSync({ sent: 0, failed: 1, total: 1 });
    return { sent: false, pendingId: pending.id, error: msg };
  }
};

export const flushPendingClients = async (
  vendedorId: number,
): Promise<PendingSyncResult> => {
  const pendientes = await pendingClientsRepo.listByVendor(vendedorId);
  const pendingOrError = pendientes.filter(
    (p) => p.status === 'pending' || p.status === 'error',
  );
  const total = pendingOrError.length;
  if (total === 0) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  for (const p of pendingOrError) {
    try {
      await pendingClientsRepo.markSending(p.id);
      const remote = await clientesApi.create(pendingClientToPayload(p));
      await pendingClientsRepo.markSent(p.id, remote.id_cliente, remote.codigo_cliente);
      sent++;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Error al enviar';
      await pendingClientsRepo.markError(p.id, msg);
      failed++;
    }
  }

  return { sent, failed, total };
};
