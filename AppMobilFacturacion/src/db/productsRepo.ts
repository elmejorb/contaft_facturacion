import { ProductDTO } from '../services/api';
import { getDb } from './index';

export const productsRepo = {
  async replaceAll(empresaId: number, products: ProductDTO[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM cached_products WHERE id_empresa = ?', [empresaId]);

      for (const p of products) {
        await db.runAsync(
          `INSERT INTO cached_products (
            id_producto, id_empresa, id_categoria, codigo, nombre,
            precio_venta, stock, stock_minimo, unidad_medida,
            porcentaje_iva, estado, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id_producto,
            empresaId,
            p.id_categoria ?? null,
            p.codigo,
            p.nombre,
            p.precio_venta ?? '0',
            p.stock ?? '0',
            p.stock_minimo ?? '0',
            p.unidad_medida ?? 'und',
            p.porcentaje_iva ?? '19',
            p.estado ? 1 : 0,
            now,
          ],
        );
      }
    });
  },

  async listAll(empresaId: number): Promise<ProductDTO[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM cached_products
       WHERE id_empresa = ? AND estado = 1
       ORDER BY nombre ASC`,
      [empresaId],
    );
    return rows.map(mapRowToProduct);
  },

  async findById(id: number, empresaId: number): Promise<ProductDTO | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM cached_products WHERE id_producto = ? AND id_empresa = ?`,
      [id, empresaId],
    );
    return row ? mapRowToProduct(row) : null;
  },

  async count(empresaId: number): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as c FROM cached_products WHERE id_empresa = ?`,
      [empresaId],
    );
    return row?.c ?? 0;
  },
};

const mapRowToProduct = (row: any): ProductDTO => ({
  id_producto: row.id_producto,
  id_categoria: row.id_categoria,
  codigo: row.codigo,
  nombre: row.nombre,
  precio_venta: row.precio_venta,
  stock: row.stock,
  stock_minimo: row.stock_minimo,
  unidad_medida: row.unidad_medida,
  porcentaje_iva: row.porcentaje_iva,
  estado: !!row.estado,
});
