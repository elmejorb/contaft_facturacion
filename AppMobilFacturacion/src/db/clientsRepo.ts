import { ClientDTO } from '../services/api';
import { getDb } from './index';

export const clientsRepo = {
  /**
   * Reemplaza toda la lista de clientes de una empresa con los datos recibidos.
   * Se llama tras un fetch exitoso a GET /api/clientes.
   */
  async replaceAll(empresaId: number, clients: ClientDTO[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM cached_clients WHERE id_empresa = ?', [empresaId]);

      for (const c of clients) {
        await db.runAsync(
          `INSERT INTO cached_clients (
            id_cliente, id_empresa, codigo_cliente, nombre_razon_social,
            tipo_documento, numero_documento, digito_verificacion,
            telefono, celular, email, direccion, departamento, municipio,
            tipo_responsabilidad, regimen_tributario, tipo_organizacion,
            cupo_autorizado, estado, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id_cliente,
            empresaId,
            c.codigo_cliente ?? null,
            c.nombre_razon_social,
            c.tipo_documento ?? null,
            c.numero_documento ?? null,
            (c as any).digito_verificacion ?? null,
            c.telefono ?? null,
            c.celular ?? null,
            c.email ?? null,
            c.direccion ?? null,
            (c as any).departamento ?? null,
            (c as any).municipio ?? null,
            (c as any).tipo_responsabilidad ?? null,
            (c as any).regimen_tributario ?? null,
            (c as any).tipo_organizacion ?? null,
            c.cupo_autorizado ?? '0',
            c.estado ? 1 : 0,
            now,
          ],
        );
      }
    });
  },

  async listAll(empresaId: number): Promise<ClientDTO[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM cached_clients
       WHERE id_empresa = ? AND estado = 1
       ORDER BY nombre_razon_social ASC`,
      [empresaId],
    );
    return rows.map(mapRowToClient);
  },

  async findById(id: number, empresaId: number): Promise<ClientDTO | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM cached_clients WHERE id_cliente = ? AND id_empresa = ?`,
      [id, empresaId],
    );
    return row ? mapRowToClient(row) : null;
  },

  async count(empresaId: number): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as c FROM cached_clients WHERE id_empresa = ?`,
      [empresaId],
    );
    return row?.c ?? 0;
  },

  /**
   * Actualiza (o inserta si no existe) un cliente en el caché local SIN tocar
   * los demás. Se llama tras un PUT exitoso al API para que el listado refleje
   * el cambio de inmediato al volver del modal de edición — sin esperar al
   * próximo fetch.
   */
  async upsert(empresaId: number, c: ClientDTO): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO cached_clients (
        id_cliente, id_empresa, codigo_cliente, nombre_razon_social,
        tipo_documento, numero_documento, digito_verificacion,
        telefono, celular, email, direccion, departamento, municipio,
        tipo_responsabilidad, regimen_tributario, tipo_organizacion,
        cupo_autorizado, estado, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id_cliente) DO UPDATE SET
        codigo_cliente = excluded.codigo_cliente,
        nombre_razon_social = excluded.nombre_razon_social,
        tipo_documento = excluded.tipo_documento,
        numero_documento = excluded.numero_documento,
        digito_verificacion = excluded.digito_verificacion,
        telefono = excluded.telefono,
        celular = excluded.celular,
        email = excluded.email,
        direccion = excluded.direccion,
        departamento = excluded.departamento,
        municipio = excluded.municipio,
        tipo_responsabilidad = excluded.tipo_responsabilidad,
        regimen_tributario = excluded.regimen_tributario,
        tipo_organizacion = excluded.tipo_organizacion,
        cupo_autorizado = excluded.cupo_autorizado,
        estado = excluded.estado,
        synced_at = excluded.synced_at`,
      [
        c.id_cliente,
        empresaId,
        c.codigo_cliente ?? null,
        c.nombre_razon_social,
        c.tipo_documento ?? null,
        c.numero_documento ?? null,
        (c as any).digito_verificacion ?? null,
        c.telefono ?? null,
        c.celular ?? null,
        c.email ?? null,
        c.direccion ?? null,
        (c as any).departamento ?? null,
        (c as any).municipio ?? null,
        (c as any).tipo_responsabilidad ?? null,
        (c as any).regimen_tributario ?? null,
        (c as any).tipo_organizacion ?? null,
        c.cupo_autorizado ?? '0',
        c.estado ? 1 : 0,
        now,
      ],
    );
  },
};

const mapRowToClient = (row: any): ClientDTO => ({
  id_cliente: row.id_cliente,
  codigo_cliente: row.codigo_cliente,
  nombre_razon_social: row.nombre_razon_social,
  tipo_documento: row.tipo_documento,
  numero_documento: row.numero_documento,
  telefono: row.telefono,
  celular: row.celular,
  email: row.email,
  direccion: row.direccion,
  cupo_autorizado: row.cupo_autorizado,
  estado: !!row.estado,
});
