#!/usr/bin/env bash
# 3_crear_bd.sh — Crea una BD limpia desde la plantilla + aplica actualizaciones.
#
# Uso:
#     ./3_crear_bd.sh conta_nuevocliente
#
# Variables opcionales:
#   MYSQL_BIN  (default: C:/WebServer/MariaDB/bin/mysql.exe)
#   MYSQL_USER (default: root)
#   MYSQL_PWD  (default: root)

set -euo pipefail
DB_NAME="${1:?Falta nombre de BD. Ejemplo: ./3_crear_bd.sh conta_nuevocliente}"

MYSQL_BIN="${MYSQL_BIN:-C:/WebServer/MariaDB/bin/mysql.exe}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PWD="${MYSQL_PWD:-root}"
SQLDIR="$(dirname "$0")/.."

echo "=== 1. Crear BD vacía: $DB_NAME ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" -e "
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "=== 2. Importar plantilla ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" < "$SQLDIR/conta_template_limpio.sql"

echo "=== 3. Aplicar actualizacion_completa.sql ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" < "$SQLDIR/actualizacion_completa.sql" | tail -5

echo "=== 4. Defaults NOT NULL para columnas que el VB6 no trae ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" <<'SQL'
ALTER TABLE tblventas
  MODIFY id_mediopago INT NOT NULL DEFAULT 1,
  MODIFY efectivo DOUBLE NOT NULL DEFAULT 0,
  MODIFY valorpagado1 DOUBLE NOT NULL DEFAULT 0,
  MODIFY pagada VARCHAR(1) NOT NULL DEFAULT 'N';
ALTER TABLE tblpagos
  MODIFY id_mediopago INT NOT NULL DEFAULT 1,
  MODIFY Nfact_electronica VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE tblpedidos
  MODIFY opcion_factura INT NOT NULL DEFAULT 0;
ALTER TABLE tblclientes
  MODIFY Whatsapp VARCHAR(25) NOT NULL DEFAULT '';
ALTER TABLE tblauxiliarbanco
  MODIFY Detalle VARCHAR(255) NOT NULL DEFAULT '',
  MODIFY idBancos INT NOT NULL DEFAULT 1,
  MODIFY Valor DECIMAL(19,4) NOT NULL DEFAULT 0;
SQL

echo "=== 5. Conteo final ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" -e "
SELECT COUNT(*) tablas FROM information_schema.tables WHERE table_schema='$DB_NAME';
SELECT (SELECT COUNT(*) FROM tblcajas) cajas,
       (SELECT COUNT(*) FROM tblretenciones) retenc,
       (SELECT COUNT(*) FROM tblcategorias_gasto) cat_gasto,
       (SELECT COUNT(*) FROM tblmedios_pago) medios_pago;"

echo "[OK] $DB_NAME lista para recibir datos (paso 4)."
