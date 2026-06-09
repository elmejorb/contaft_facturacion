import { CategoriaDTO } from '../services/api';
import { getDb } from './index';

export const categoriesRepo = {
  async replaceAll(empresaId: number, cats: CategoriaDTO[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM cached_categories WHERE id_empresa = ?', [empresaId]);
      for (const c of cats) {
        await db.runAsync(
          `INSERT INTO cached_categories (id_categoria, id_empresa, nombre, estado, synced_at)
           VALUES (?, ?, ?, ?, ?)`,
          [c.id_categoria, empresaId, c.nombre, c.estado ? 1 : 0, now],
        );
      }
    });
  },

  async listAll(empresaId: number): Promise<CategoriaDTO[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM cached_categories
       WHERE id_empresa = ? AND estado = 1
       ORDER BY nombre ASC`,
      [empresaId],
    );
    return rows.map((r) => ({
      id_categoria: r.id_categoria,
      nombre: r.nombre,
      estado: !!r.estado,
    }));
  },
};
