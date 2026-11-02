#!/usr/bin/env bash
# 5_verificar.sh — Health check + backup inicial de la BD migrada.
#
# Uso: ./5_verificar.sh conta_nuevocliente

set -euo pipefail
DB_NAME="${1:?Falta nombre de BD}"

MYSQL_BIN="${MYSQL_BIN:-C:/WebServer/MariaDB/bin/mysql.exe}"
MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-C:/WebServer/MariaDB/bin/mysqldump.exe}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PWD="${MYSQL_PWD:-root}"
BK_DIR="${BK_DIR:-.}"

echo "=== CONTEOS ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" -e "
SELECT
  (SELECT COUNT(*) FROM tblarticulos) articulos,
  (SELECT COUNT(*) FROM tblclientes) clientes,
  (SELECT COUNT(*) FROM tblproveedores) proveedores,
  (SELECT COUNT(*) FROM tblventas) ventas,
  (SELECT COUNT(*) FROM tbldetalle_venta) detalle_venta,
  (SELECT COUNT(*) FROM tblpagos) pagos,
  (SELECT COUNT(*) FROM tblpedidos) pedidos,
  (SELECT COUNT(*) FROM tblcontrolcaja) controlcaja,
  (SELECT COUNT(*) FROM tblegresos) egresos,
  (SELECT COUNT(*) FROM tblkardex) kardex,
  (SELECT COUNT(*) FROM tblusuarios) usuarios;"

echo ""
echo "=== RANGO FECHAS ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" -e "
SELECT 'ventas' tipo, MIN(Fecha) primera, MAX(Fecha) ultima FROM tblventas
UNION ALL SELECT 'pagos', MIN(Fecha), MAX(Fecha) FROM tblpagos
UNION ALL SELECT 'kardex', MIN(Fecha), MAX(Fecha) FROM tblkardex;"

echo ""
echo "=== CARTERA Y VALOR INVENTARIO ==="
"$MYSQL_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" "$DB_NAME" -e "
SELECT 'cartera' tipo, SUM(Saldo) valor, COUNT(*) n
FROM tblventas WHERE Saldo>0.01 AND LOWER(EstadoFact)!='anulada'
UNION ALL
SELECT 'valor_inventario_costo', SUM(Existencia*Precio_Costo), COUNT(*)
FROM tblarticulos WHERE Existencia>0;"

echo ""
echo "=== BACKUP INICIAL ==="
TS=$(date +%Y%m%d_%H%M%S)
BK="$BK_DIR/${DB_NAME}_inicial_${TS}.sql"
"$MYSQLDUMP_BIN" -u "$MYSQL_USER" -p"$MYSQL_PWD" --single-transaction \
    --default-character-set=utf8mb4 "$DB_NAME" > "$BK"
echo "  guardado: $BK ($(du -k "$BK" | cut -f1) KB)"

echo ""
echo "[OK] Verificación completa."
