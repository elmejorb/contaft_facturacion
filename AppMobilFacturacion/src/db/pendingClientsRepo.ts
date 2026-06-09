import { getDb } from './index';

export type PendingClientStatus = 'pending' | 'sending' | 'sent' | 'error';

export interface PendingClient {
  id: number;
  local_uuid: string;
  id_vendedor_mobile: number;
  id_empresa: number;
  nombre_razon_social: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  digito_verificacion: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  direccion: string | null;
  departamento: string | null;
  municipio: string | null;
  id_municipio: number | null;
  latitud: number | null;
  longitud: number | null;
  precision_gps_metros: number | null;
  tipo_responsabilidad: string | null;
  regimen_tributario: string | null;
  tipo_organizacion: string | null;
  cupo_autorizado: string;
  status: PendingClientStatus;
  error_message: string | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  remote_id_cliente: number | null;
  remote_codigo_cliente: string | null;
}

export interface CreatePendingClientInput {
  id_vendedor_mobile: number;
  id_empresa: number;
  nombre_razon_social: string;
  tipo_documento?: string | null;
  numero_documento?: string | null;
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

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const mapRow = (row: any): PendingClient => ({
  id: row.id,
  local_uuid: row.local_uuid,
  id_vendedor_mobile: row.id_vendedor_mobile,
  id_empresa: row.id_empresa,
  nombre_razon_social: row.nombre_razon_social,
  tipo_documento: row.tipo_documento,
  numero_documento: row.numero_documento,
  digito_verificacion: row.digito_verificacion,
  telefono: row.telefono,
  celular: row.celular,
  email: row.email,
  direccion: row.direccion,
  departamento: row.departamento,
  municipio: row.municipio,
  id_municipio: row.id_municipio ?? null,
  latitud: row.latitud,
  longitud: row.longitud,
  precision_gps_metros: row.precision_gps_metros,
  tipo_responsabilidad: row.tipo_responsabilidad,
  regimen_tributario: row.regimen_tributario,
  tipo_organizacion: row.tipo_organizacion,
  cupo_autorizado: row.cupo_autorizado,
  status: row.status as PendingClientStatus,
  error_message: row.error_message,
  attempts: row.attempts,
  created_at: row.created_at,
  last_attempt_at: row.last_attempt_at,
  remote_id_cliente: row.remote_id_cliente,
  remote_codigo_cliente: row.remote_codigo_cliente,
});

export const pendingClientsRepo = {
  async enqueue(input: CreatePendingClientInput): Promise<PendingClient> {
    const db = await getDb();
    const now = new Date().toISOString();
    const local = uuid();

    const result = await db.runAsync(
      `INSERT INTO pending_clients (
        local_uuid, id_vendedor_mobile, id_empresa,
        nombre_razon_social, tipo_documento, numero_documento, digito_verificacion,
        telefono, celular, email,
        direccion, departamento, municipio, id_municipio,
        latitud, longitud, precision_gps_metros,
        tipo_responsabilidad, regimen_tributario, tipo_organizacion,
        cupo_autorizado, status, attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [
        local,
        input.id_vendedor_mobile,
        input.id_empresa,
        input.nombre_razon_social,
        input.tipo_documento ?? null,
        input.numero_documento ?? null,
        input.digito_verificacion ?? null,
        input.telefono ?? null,
        input.celular ?? null,
        input.email ?? null,
        input.direccion ?? null,
        input.departamento ?? null,
        input.municipio ?? null,
        input.id_municipio ?? null,
        input.latitud ?? null,
        input.longitud ?? null,
        input.precision_gps_metros ?? null,
        input.tipo_responsabilidad ?? null,
        input.regimen_tributario ?? null,
        input.tipo_organizacion ?? null,
        (input.cupo_autorizado ?? 0).toFixed(2),
        now,
      ],
    );

    const inserted = await db.getFirstAsync<any>(
      'SELECT * FROM pending_clients WHERE id = ?',
      [result.lastInsertRowId],
    );
    return mapRow(inserted);
  },

  async listByVendor(
    vendedorId: number,
    status?: PendingClientStatus,
  ): Promise<PendingClient[]> {
    const db = await getDb();
    const rows = await (status
      ? db.getAllAsync<any>(
          `SELECT * FROM pending_clients
           WHERE id_vendedor_mobile = ? AND status = ?
           ORDER BY created_at DESC`,
          [vendedorId, status],
        )
      : db.getAllAsync<any>(
          `SELECT * FROM pending_clients
           WHERE id_vendedor_mobile = ?
           ORDER BY created_at DESC`,
          [vendedorId],
        ));
    return rows.map(mapRow);
  },

  async countPending(vendedorId: number): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as c FROM pending_clients
       WHERE id_vendedor_mobile = ? AND status IN ('pending', 'error')`,
      [vendedorId],
    );
    return row?.c ?? 0;
  },

  async markSending(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_clients
       SET status = 'sending', last_attempt_at = ?, attempts = attempts + 1
       WHERE id = ?`,
      [new Date().toISOString(), id],
    );
  },

  async markSent(
    id: number,
    remoteIdCliente: number,
    remoteCodigoCliente: string,
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_clients
       SET status = 'sent',
           remote_id_cliente = ?,
           remote_codigo_cliente = ?,
           error_message = NULL
       WHERE id = ?`,
      [remoteIdCliente, remoteCodigoCliente, id],
    );
  },

  async markError(id: number, message: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_clients
       SET status = 'error', error_message = ?
       WHERE id = ?`,
      [message, id],
    );
  },

  async deleteAllSent(vendedorId: number): Promise<number> {
    const db = await getDb();
    const result = await db.runAsync(
      `DELETE FROM pending_clients WHERE id_vendedor_mobile = ? AND status = 'sent'`,
      [vendedorId],
    );
    return result.changes ?? 0;
  },
};
