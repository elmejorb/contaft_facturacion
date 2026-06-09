import { VentaItemInput } from '../services/api';
import { getDb } from './index';

export type PendingSaleStatus = 'pending' | 'sending' | 'sent' | 'error';

export interface PendingSale {
  id: number;
  local_uuid: string;
  id_vendedor_mobile: number;
  id_empresa: number;
  id_cliente: number;
  cliente_nombre: string;
  forma_pago: string;
  origen: string;
  observaciones: string | null;
  items: VentaItemInput[];
  subtotal: number;
  impuestos: number;
  total: number;
  status: PendingSaleStatus;
  error_message: string | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  remote_id_venta: number | null;
  remote_numero_factura: string | null;
}

export interface CreatePendingSaleInput {
  id_vendedor_mobile: number;
  id_empresa: number;
  id_cliente: number;
  cliente_nombre: string;
  forma_pago: string;
  origen: string;
  observaciones?: string | null;
  items: VentaItemInput[];
  subtotal: number;
  impuestos: number;
  total: number;
}

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const mapRow = (row: any): PendingSale => ({
  id: row.id,
  local_uuid: row.local_uuid,
  id_vendedor_mobile: row.id_vendedor_mobile,
  id_empresa: row.id_empresa,
  id_cliente: row.id_cliente,
  cliente_nombre: row.cliente_nombre,
  forma_pago: row.forma_pago,
  origen: row.origen,
  observaciones: row.observaciones,
  items: JSON.parse(row.items_json) as VentaItemInput[],
  subtotal: parseFloat(row.subtotal),
  impuestos: parseFloat(row.impuestos),
  total: parseFloat(row.total),
  status: row.status as PendingSaleStatus,
  error_message: row.error_message,
  attempts: row.attempts,
  created_at: row.created_at,
  last_attempt_at: row.last_attempt_at,
  remote_id_venta: row.remote_id_venta,
  remote_numero_factura: row.remote_numero_factura,
});

export const pendingSalesRepo = {
  async enqueue(input: CreatePendingSaleInput): Promise<PendingSale> {
    const db = await getDb();
    const now = new Date().toISOString();
    const local = uuid();

    const result = await db.runAsync(
      `INSERT INTO pending_sales (
        local_uuid, id_vendedor_mobile, id_empresa, id_cliente, cliente_nombre,
        forma_pago, origen, observaciones, items_json,
        subtotal, impuestos, total, status, attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [
        local,
        input.id_vendedor_mobile,
        input.id_empresa,
        input.id_cliente,
        input.cliente_nombre,
        input.forma_pago,
        input.origen,
        input.observaciones ?? null,
        JSON.stringify(input.items),
        input.subtotal.toFixed(2),
        input.impuestos.toFixed(2),
        input.total.toFixed(2),
        now,
      ],
    );

    const inserted = await db.getFirstAsync<any>(
      'SELECT * FROM pending_sales WHERE id = ?',
      [result.lastInsertRowId],
    );
    return mapRow(inserted);
  },

  async listByVendor(
    vendedorId: number,
    status?: PendingSaleStatus,
  ): Promise<PendingSale[]> {
    const db = await getDb();
    const rows = await (status
      ? db.getAllAsync<any>(
          `SELECT * FROM pending_sales
           WHERE id_vendedor_mobile = ? AND status = ?
           ORDER BY created_at DESC`,
          [vendedorId, status],
        )
      : db.getAllAsync<any>(
          `SELECT * FROM pending_sales
           WHERE id_vendedor_mobile = ?
           ORDER BY created_at DESC`,
          [vendedorId],
        ));
    return rows.map(mapRow);
  },

  async countPending(vendedorId: number): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as c FROM pending_sales
       WHERE id_vendedor_mobile = ? AND status IN ('pending', 'error')`,
      [vendedorId],
    );
    return row?.c ?? 0;
  },

  async markSending(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_sales
       SET status = 'sending', last_attempt_at = ?, attempts = attempts + 1
       WHERE id = ?`,
      [new Date().toISOString(), id],
    );
  },

  async markSent(
    id: number,
    remoteIdVenta: number,
    remoteNumeroFactura: string,
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_sales
       SET status = 'sent',
           remote_id_venta = ?,
           remote_numero_factura = ?,
           error_message = NULL
       WHERE id = ?`,
      [remoteIdVenta, remoteNumeroFactura, id],
    );
  },

  async markError(id: number, message: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_sales
       SET status = 'error', error_message = ?
       WHERE id = ?`,
      [message, id],
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM pending_sales WHERE id = ?', [id]);
  },

  async deleteAllSent(vendedorId: number): Promise<number> {
    const db = await getDb();
    const result = await db.runAsync(
      `DELETE FROM pending_sales WHERE id_vendedor_mobile = ? AND status = 'sent'`,
      [vendedorId],
    );
    return result.changes ?? 0;
  },
};
