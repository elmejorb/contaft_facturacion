import * as SQLite from 'expo-sqlite';
import { SCHEMA } from './schema';

const DB_NAME = 'conta_movil.db';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre (o devuelve) la conexión a la BD local.
 * La primera invocación corre las migraciones.
 */
export const getDb = (): Promise<SQLite.SQLiteDatabase> => {
  if (_db) return Promise.resolve(_db);
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    for (const sql of SCHEMA) {
      await db.execAsync(sql);
    }

    // Migraciones runtime idempotentes (ADD COLUMN solo si no existe)
    await ensureColumn(db, 'pending_clients', 'latitud', 'REAL');
    await ensureColumn(db, 'pending_clients', 'longitud', 'REAL');
    await ensureColumn(db, 'pending_clients', 'precision_gps_metros', 'REAL');
    await ensureColumn(db, 'pending_clients', 'id_municipio', 'INTEGER');

    _db = db;
    return db;
  })();

  return _initPromise;
};

/**
 * Agrega una columna solo si no existe. SQLite no soporta IF NOT EXISTS en ADD COLUMN.
 */
const ensureColumn = async (
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> => {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
};

/**
 * Cierra y borra los caches de catálogos (usado al hacer logout).
 * NO borra pending_sales — esas deben preservarse por vendedor.
 */
export const clearCatalogCache = async (): Promise<void> => {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM cached_clients;
    DELETE FROM cached_products;
    DELETE FROM cached_categories;
  `);
};

export const wipeDatabase = async (): Promise<void> => {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM cached_clients;
    DELETE FROM cached_products;
    DELETE FROM cached_categories;
    DELETE FROM pending_sales;
    DELETE FROM sync_meta;
  `);
};
