import { MunicipioDTO } from '../services/api';
import { getDb } from './index';

export const municipiosRepo = {
  async replaceAll(municipios: MunicipioDTO[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM cached_municipios');

      for (const m of municipios) {
        await db.runAsync(
          `INSERT INTO cached_municipios (
            id, code, name, department_id, departamento_nombre, departamento_code, label, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id,
            m.code,
            m.name,
            m.department_id,
            m.departamento_nombre,
            m.departamento_code,
            m.label,
            now,
          ],
        );
      }
    });
  },

  async search(query: string, limit = 50): Promise<MunicipioDTO[]> {
    const db = await getDb();
    const q = query.trim();

    if (!q) {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM cached_municipios ORDER BY name LIMIT ?`,
        [limit],
      );
      return rows.map(mapRow);
    }

    const pattern = `%${q}%`;
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM cached_municipios
       WHERE name LIKE ? OR departamento_nombre LIKE ?
       ORDER BY
         CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
         name
       LIMIT ?`,
      [pattern, pattern, `${q}%`, limit],
    );
    return rows.map(mapRow);
  },

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as c FROM cached_municipios`,
    );
    return row?.c ?? 0;
  },

  async findById(id: number): Promise<MunicipioDTO | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM cached_municipios WHERE id = ?`,
      [id],
    );
    return row ? mapRow(row) : null;
  },
};

const mapRow = (row: any): MunicipioDTO => ({
  id: row.id,
  code: row.code,
  name: row.name,
  department_id: row.department_id,
  departamento_nombre: row.departamento_nombre,
  departamento_code: row.departamento_code,
  label: row.label,
});
