# Migración VB6 Access → MySQL (Conta FT)

Kit para migrar la BD de un cliente del Conta FT viejo (VB6 + Access `.mdb`) a
la estructura actual del Conta FT nuevo (MySQL/MariaDB + React + PHP).

Probado con **Access 97 (JET3)** protegido con contraseña simple.

## Requisitos

- Python 3.10+ con `pip install pymysql`
- MariaDB/MySQL corriendo en `127.0.0.1:3306` con usuario `root` (ajustable)
- `mdbtools-win` (binarios precompilados que leen Access 97). Descarga una vez:
  ```bash
  curl -sSL -o mdbtools-win.zip \
    https://github.com/lsgunth/mdbtools-win/archive/refs/heads/master.zip
  unzip mdbtools-win.zip -d mdbtools-bin/
  ```
  Ruta esperada: `mdbtools-bin/mdbtools-win-master/mdb-*.exe`

## Pipeline (5 pasos)

Todos los scripts aceptan **`--cliente NOMBRE`** y leen/escriben archivos en:
```
scratchpad/
└── <cliente>_jsonl/        # JSONL exportado del Access
```

### 1. Inspección — qué hay en el `.mdb`

```bash
python 1_inspect.py \
  --mdb "C:/Users/.../Empresas/FerroAbdala/Db.mdb" \
  --bin "./mdbtools-bin/mdbtools-win-master"
```

Lista las tablas con conteo de filas y el esquema de las tablas clave.
Decidí qué fecha-de-corte usar para kardex y confirmar que esté todo.

### 2. Export a JSONL

```bash
python 2_export_jsonl.py \
  --mdb "C:/.../Db.mdb" \
  --bin "./mdbtools-bin/mdbtools-win-master" \
  --out "./scratchpad/ferroabdala_jsonl"
```

JSONL es más seguro que CSV porque los campos con saltos de línea o comillas
no rompen el conteo de filas (el CSV sí).

### 3. Crear BD destino desde la plantilla

```bash
./3_crear_bd.sh conta_ferroabdala
```

(En Windows ejecutar con Git Bash). El script:
- Crea `conta_ferroabdala` vacía.
- Importa `../conta_template_limpio.sql` (119 tablas + catálogos base).
- Aplica `../actualizacion_completa.sql` (migraciones acumuladas).
- Añade DEFAULTs a columnas NOT NULL que llegan vacías del VB6.

### 4. Migrar datos del JSONL al MySQL

```bash
python 4_migrar.py \
  --jsonl "./scratchpad/ferroabdala_jsonl" \
  --db conta_ferroabdala \
  --corte-kardex 2024-11-02         # ← kardex solo desde esta fecha
```

El script:
- Clientes se matchean por `CodigoClien` (nunca por documento — VB6 permite NITs duplicados).
- Facturas anuladas se guardan con `EstadoFact='Anulada'` (el runtime las excluye de cartera e informes).
- Kardex se filtra desde `--corte-kardex`. Ventas y pagos SIEMPRE se migran enteros para que la cartera cuadre.
- Las fechas del VB6 vienen en formato US `MM/DD/YY HH:MM:SS` — el parser las convierte a ISO.
- Columnas DIAN / FE / retenciones que el VB6 no conocía quedan `NULL` → el cliente las completa desde Configuración.

### 5. Verificar + backup inicial

```bash
./5_verificar.sh conta_ferroabdala
# imprime: # artículos, clientes, cartera pendiente, valor inventario, rango fechas.
# genera: conta_ferroabdala_inicial_<timestamp>.sql
```

## Qué pasa en el cliente después

1. En su PC: editar `C:\WebServer\Apache24\htdocs\conta-app-backend\api\config\database.php` → apuntar a la BD nueva.
2. Entrar al desktop con `root / 1234` → verificar cartera + inventario.
3. Datos empresa (NIT, régimen DIAN, logo) se cargan desde Configuración.
4. Cambiar contraseñas de los demás usuarios.

## Memoria relacionada

- `project_deploy_cliente.md` → checklist al desplegar a un cliente
- `reference_template_bd.md` → cómo se genera `conta_template_limpio.sql`
- `feedback_vb6_documento_no_unique.md` → match por código, nunca por documento
- `feedback_facturas_anuladas_excluidas.md` → anuladas se filtran en runtime
- `feedback_kardex_inmutable.md` → kardex nunca se borra, se corrige con asientos opuestos
