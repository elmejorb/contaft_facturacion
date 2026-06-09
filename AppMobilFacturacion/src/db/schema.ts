export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS cached_clients (
    id_cliente INTEGER PRIMARY KEY,
    id_empresa INTEGER NOT NULL,
    codigo_cliente TEXT,
    nombre_razon_social TEXT NOT NULL,
    tipo_documento TEXT,
    numero_documento TEXT,
    digito_verificacion TEXT,
    telefono TEXT,
    celular TEXT,
    email TEXT,
    direccion TEXT,
    departamento TEXT,
    municipio TEXT,
    tipo_responsabilidad TEXT,
    regimen_tributario TEXT,
    tipo_organizacion TEXT,
    cupo_autorizado TEXT DEFAULT '0',
    estado INTEGER DEFAULT 1,
    synced_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_clients_empresa ON cached_clients(id_empresa)`,
  `CREATE INDEX IF NOT EXISTS idx_clients_nombre ON cached_clients(nombre_razon_social)`,

  `CREATE TABLE IF NOT EXISTS cached_products (
    id_producto INTEGER PRIMARY KEY,
    id_empresa INTEGER NOT NULL,
    id_categoria INTEGER,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    precio_venta TEXT DEFAULT '0',
    stock TEXT DEFAULT '0',
    stock_minimo TEXT DEFAULT '0',
    unidad_medida TEXT DEFAULT 'und',
    porcentaje_iva TEXT DEFAULT '19',
    estado INTEGER DEFAULT 1,
    synced_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_products_empresa ON cached_products(id_empresa)`,
  `CREATE INDEX IF NOT EXISTS idx_products_nombre ON cached_products(nombre)`,

  `CREATE TABLE IF NOT EXISTS cached_categories (
    id_categoria INTEGER PRIMARY KEY,
    id_empresa INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    estado INTEGER DEFAULT 1,
    synced_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS pending_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    local_uuid TEXT UNIQUE NOT NULL,
    id_vendedor_mobile INTEGER NOT NULL,
    id_empresa INTEGER NOT NULL,
    id_cliente INTEGER NOT NULL,
    cliente_nombre TEXT NOT NULL,
    forma_pago TEXT DEFAULT 'contado',
    origen TEXT DEFAULT 'mobile',
    observaciones TEXT,
    items_json TEXT NOT NULL,
    subtotal TEXT NOT NULL,
    impuestos TEXT NOT NULL,
    total TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_attempt_at TEXT,
    remote_id_venta INTEGER,
    remote_numero_factura TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_sales(status, id_vendedor_mobile)`,

  `CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS pending_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    local_uuid TEXT UNIQUE NOT NULL,
    id_vendedor_mobile INTEGER NOT NULL,
    id_empresa INTEGER NOT NULL,
    nombre_razon_social TEXT NOT NULL,
    tipo_documento TEXT,
    numero_documento TEXT,
    digito_verificacion TEXT,
    telefono TEXT,
    celular TEXT,
    email TEXT,
    direccion TEXT,
    departamento TEXT,
    municipio TEXT,
    latitud REAL,
    longitud REAL,
    precision_gps_metros REAL,
    tipo_responsabilidad TEXT,
    regimen_tributario TEXT,
    tipo_organizacion TEXT,
    cupo_autorizado TEXT DEFAULT '0',
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_attempt_at TEXT,
    remote_id_cliente INTEGER,
    remote_codigo_cliente TEXT
  )`,


  `CREATE INDEX IF NOT EXISTS idx_pending_clients_status
    ON pending_clients(status, id_vendedor_mobile)`,

  `CREATE TABLE IF NOT EXISTS cached_municipios (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    department_id INTEGER,
    departamento_nombre TEXT,
    departamento_code TEXT,
    label TEXT NOT NULL,
    synced_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cached_municipios_name ON cached_municipios(name)`,
  `CREATE INDEX IF NOT EXISTS idx_cached_municipios_depto ON cached_municipios(departamento_nombre)`,
];
