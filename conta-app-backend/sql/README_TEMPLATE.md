# Plantilla de BD para cliente nuevo

Archivo: **`conta_template_limpio.sql`** (~480 KB, 119 tablas)

## Qué contiene

- Toda la **estructura** de tablas + vistas + triggers + procedures.
- **Catálogos maestros** listos:
  - 10 categorías de gasto
  - 5 retenciones (ReteFuente, ReteIVA, ReteICA, etc.)
  - 2 cajas configuradas
  - Tipos de movimiento
  - Tipos de usuario (Administrador, Vendedor, Supervisor)
  - Medios de pago (Efectivo, Tarjeta, Bancolombia, Nequi…)
  - Catálogos DIAN (tipos documento, responsabilidad, organización, régimen)
- **Registros mínimos** preservados:
  - Usuario `root` con contraseña `1234`
  - Cliente 130500 `VENTAS AL CONTADO`
  - Cliente 130502 `CONSUMIDOR FINAL`
  - Proveedor 220500 `COMPRAS AL CONTADO`

## Qué NO trae (vacío desde cero)

- Artículos, kardex, lotes, notas de artículo
- Clientes y proveedores adicionales
- Ventas, detalle de ventas, devoluciones
- Pedidos, órdenes de compra, planes separables
- Movimientos de caja, sesiones, cierres, aperturas
- Pagos (cliente y proveedor), gastos
- Cuentas por cobrar / pagar
- Movimientos bancarios (bancos conservados con saldo 0)
- Facturación electrónica emitida
- Vendedores móviles, pedidos de campo
- Asientos contables (comprobante diario)

## Instalación en un cliente nuevo

```powershell
# 1. Crear BD vacía
mysql -u root -p -e "CREATE DATABASE conta_NUEVOCLIENTE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Importar plantilla
mysql -u root -p conta_NUEVOCLIENTE -e "SOURCE C:/ruta/conta_template_limpio.sql;"

# 3. Editar api/config/database.php → apuntar a conta_NUEVOCLIENTE

# 4. Login en Conta FT desktop:
#    Usuario: root
#    Contraseña: 1234

# 5. Configurar empresa:
#    Configuración → Datos Empresa → llenar NIT, razón social, dirección, resolución DIAN, etc.
```

## Regenerar la plantilla (si cambia el modelo)

Cuando agregues columnas/tablas nuevas al consolidado, regenera:

```powershell
$MYSQL = "C:\xampp\mysql\bin\mysql.exe"
$MYSQLDUMP = "C:\xampp\mysql\bin\mysqldump.exe"
$SRC = "conta_innovacion"    # o cualquier BD funcional actualizada
$DST = "conta_template"
$TMP = "C:/xampp/tmp/dump_src.sql"
$OUT = "conta-app-backend\sql\conta_template_limpio.sql"

& $MYSQL -u root -proot -e "DROP DATABASE IF EXISTS $DST; CREATE DATABASE $DST CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& $MYSQLDUMP -u root -proot --routines --triggers --default-character-set=utf8mb4 --single-transaction --result-file=$TMP $SRC
& $MYSQL -u root -proot --default-character-set=utf8mb4 $DST -e "SOURCE $TMP;"
& $MYSQL -u root -proot --default-character-set=utf8mb4 $DST -e "SOURCE conta-app-backend/sql/limpiar_para_cliente_nuevo.sql;"
& $MYSQL -u root -proot --default-character-set=utf8mb4 $DST -e "SOURCE conta-app-backend/sql/actualizacion_completa.sql;"
& $MYSQLDUMP -u root -proot --routines --triggers --default-character-set=utf8mb4 --single-transaction --result-file=$OUT $DST
```
