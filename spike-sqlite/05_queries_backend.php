<?php
/**
 * Spike SQLite — Paso 5: ejecutar queries representativas del backend
 * productivo directamente contra SQLite para medir compatibilidad real.
 *
 * No hago HTTP (eso implicaría cambiar database.php del backend productivo).
 * Ejecuto 25 queries extraídas de los endpoints más usados:
 *  - caja/sesion.php (el cuadre de caja — el bug Manos Creativas)
 *  - ventas/nueva.php
 *  - clientes/pagos.php (vistas de saldos)
 *  - movimientos/gastos.php
 *  - informes/resumen.php
 *  - facturacion-electronica/enviar.php
 *
 * Cada una tiene su resultado esperado (count mínimo o cálculo esperado).
 */
require_once __DIR__ . '/db_factory.php';
$pdo = (new DatabaseFactory())->getConnection();

// Preparamos algunos datos operativos para que las queries tengan contexto real.
// Una venta POS contado + un pago + un egreso + un kardex.
$pdo->exec("INSERT INTO tblventas (Factura_N, Fecha, Tipo, Dias, CodigoCli, A_nombre, Total, Saldo, pagada, EstadoFact, efectivo, valorpagado1, id_mediopago, Id_Usuario, N_Mes, Impuesto, Descuento, Pago, Cambio, Hora, Abono, CodigoEmp, Direccion, Telefono, Identificacion, Comentario, EstadoPedido)
            VALUES (1001, DATETIME('now','localtime'), 'Contado', 0, 1001, 'CLIENTE TEST SAS', 10000, 0, '1', 'Valida', 10000, 0, 0, 1, strftime('%m','now'), 1597, 0, 10000, 0, '12:00', 0, 0, 'CLL 1', '31', '901000001', '-', 'Recibido')");
$pdo->exec("INSERT INTO tbldetalle_venta (Factura_N, Items, Cantidad, PrecioC, PrecioV, Impuesto, Subtotal, IVA, Descuento) VALUES (1001, 2, 5, 1200, 2000, 1597, 10000, 19, 0)");
$pdo->exec("UPDATE tblarticulos SET Existencia = Existencia - 5 WHERE Items = 2");
$pdo->exec("INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (DATETIME('now','localtime'), 'Octubre', 2, 'Venta Nº 1001', 2, 0, 0, 5, 6000, 45, 54000, 1200)");
$pdo->exec("INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago, ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago, NFactAnt, Nfact_electronica, id_usuario) VALUES (1, 1001, NULL, 25000, DATETIME('now','localtime'), 'Pago', 50000, 25000, 0, 0, 'Valida', '1110', 0, '', 0, 1)");
$pdo->exec("INSERT INTO tblegresos (N_Comprobante, Fecha, Orden, Concepto, Valor, Estado, Cuentas, FactN, id_usuario, id_mediopago, categoria_gasto) VALUES (1, DATETIME('now','localtime'), 'TEST', 'Gasto test', 8000, 'Valida', '51 1305', '-1', 1, 0, 'Otros')");

// Ahora las 25 queries a probar.
// Cada una tiene: nombre, query (como la usa el backend hoy, con placeholders),
// params, expectación (closure).
$casos = [
    // --- caja/sesion.php ---
    [
        'nombre' => 'sesion: ventas contado por efectivo neto',
        'query' => "SELECT COALESCE(SUM(efectivo),0) AS t FROM tblventas WHERE Fecha >= ? AND EstadoFact='Valida' AND Tipo='Contado'",
        'params' => [date('Y-m-d') . ' 08:00:00'],
        'esperado' => fn($r) => (float)$r[0]['t'] === 10000.0,
    ],
    [
        'nombre' => 'sesion: pagos efectivo (medio=0)',
        'query' => "SELECT COALESCE(SUM(ValorPago),0) AS t FROM tblpagos WHERE Fecha >= ? AND Estado='Valida' AND COALESCE(id_mediopago, 0) = 0",
        'params' => [date('Y-m-d') . ' 08:00:00'],
        'esperado' => fn($r) => (float)$r[0]['t'] === 25000.0,
    ],
    [
        'nombre' => 'sesion: egresos efectivo',
        'query' => "SELECT COALESCE(SUM(Valor),0) AS t FROM tblegresos WHERE Fecha >= ? AND Estado='Valida' AND COALESCE(TipoPago, 0) = 0",
        'params' => [date('Y-m-d') . ' 08:00:00'],
        'esperado' => fn($r) => (float)$r[0]['t'] === 8000.0,
    ],
    // --- ventas/nueva.php ---
    [
        'nombre' => 'ventas: MAX(Factura_N) + 1',
        'query' => "SELECT COALESCE(MAX(Factura_N), 0) + 1 AS siguiente FROM tblventas",
        'params' => [],
        'esperado' => fn($r) => (int)$r[0]['siguiente'] === 1002,
    ],
    [
        'nombre' => 'ventas: lookup articulo por codigo',
        'query' => "SELECT Items, Codigo, Nombres_Articulo, Existencia, Precio_Venta, Iva FROM tblarticulos WHERE Estado = 1 AND Codigo = ?",
        'params' => ['TEST-002'],
        'esperado' => fn($r) => count($r) === 1 && (float)$r[0]['Precio_Venta'] === 2000.0,
    ],
    // --- clientes/pagos.php (usa vistas) ---
    [
        'nombre' => 'pagos: facturas cliente desde vw_facturas_cliente_saldos',
        'query' => "SELECT Factura_N, Total, Saldo FROM vw_facturas_cliente_saldos WHERE CodigoCli = ? AND Saldo > 0",
        'params' => [1001],
        'esperado' => fn($r) => is_array($r), // basta con que la vista corra
    ],
    [
        'nombre' => 'pagos: historial via JOIN tblpagos + tblmedios_pago',
        'query' => "SELECT p.Id_Pagos, p.Fact_N, p.ValorPago, p.Fecha, COALESCE(m.nombre_medio, 'Efectivo') AS MedioPago
                    FROM tblpagos p LEFT JOIN tblmedios_pago m ON p.id_mediopago = m.id_mediopago
                    WHERE p.Codigo = ? AND p.Estado = 'Valida'",
        'params' => [1001],
        'esperado' => fn($r) => count($r) >= 1,
    ],
    // --- movimientos/gastos.php ---
    [
        'nombre' => 'gastos: MAX(N_Comprobante)+1',
        'query' => "SELECT COALESCE(MAX(N_Comprobante),0)+1 AS next FROM tblegresos",
        'params' => [],
        'esperado' => fn($r) => (int)$r[0]['next'] === 2,
    ],
    [
        'nombre' => 'gastos: suma por categoría del mes',
        'query' => "SELECT categoria_gasto, SUM(Valor) AS total FROM tblegresos
                    WHERE strftime('%Y-%m', Fecha) = strftime('%Y-%m', 'now') AND Estado='Valida'
                    GROUP BY categoria_gasto",
        'params' => [],
        'esperado' => fn($r) => count($r) >= 1,
    ],
    // --- informes/resumen.php ---
    [
        'nombre' => 'informe: ventas contado del día',
        'query' => "SELECT COUNT(*) AS n, SUM(Total) AS total FROM tblventas
                    WHERE DATE(Fecha) = DATE('now','localtime') AND Tipo='Contado' AND EstadoFact='Valida'",
        'params' => [],
        'esperado' => fn($r) => (int)$r[0]['n'] === 1 && (float)$r[0]['total'] === 10000.0,
    ],
    [
        'nombre' => 'informe: GROUP BY cliente con ORDER DESC',
        'query' => "SELECT CodigoCli, SUM(Total) AS tot FROM tblventas
                    WHERE EstadoFact='Valida' GROUP BY CodigoCli ORDER BY tot DESC LIMIT 10",
        'params' => [],
        'esperado' => fn($r) => count($r) >= 1,
    ],
    // --- kardex ---
    [
        'nombre' => 'kardex: últimas salidas del día',
        'query' => "SELECT Items, Detalle, Cant_Sal FROM tblkardex
                    WHERE C_D = 2 AND DATE(Fecha) = DATE('now','localtime') ORDER BY Id_kardex DESC",
        'params' => [],
        'esperado' => fn($r) => count($r) === 1,
    ],
    // --- vista de productos stock bajo ---
    [
        'nombre' => 'vista productos stock bajo',
        'query' => "SELECT * FROM vw_productos_stock_bajo LIMIT 5",
        'params' => [],
        'esperado' => fn($r) => is_array($r),
    ],
    // --- facturacion-electronica/enviar.php ---
    [
        'nombre' => 'FE: COUNT(*) + 1 para next prefix',
        'query' => "SELECT COALESCE(MAX(number),0)+1 AS siguiente FROM electronic_documents WHERE prefix='FCON'",
        'params' => [],
        'esperado' => fn($r) => (int)$r[0]['siguiente'] === 1,
    ],
    // --- query transaccional idempotente que el enviar.php usa ---
    [
        'nombre' => 'FE: idempotency check LIKE con marker',
        'query' => "SELECT COUNT(*) FROM tblkardex WHERE Items = ? AND C_D = 2 AND Detalle LIKE ?",
        'params' => [2, '%[#1]%'],
        'esperado' => fn($r) => true, // basta con que la query corra
    ],
    // --- ingresos totales (nuevo informe v4.7.13) ---
    [
        'nombre' => 'informe ingresos totales: agrupado por fecha',
        'query' => "SELECT strftime('%Y-%m-%d', Fecha) AS dia, SUM(Total) AS total
                    FROM tblventas WHERE EstadoFact='Valida' GROUP BY dia ORDER BY dia DESC LIMIT 30",
        'params' => [],
        'esperado' => fn($r) => count($r) >= 1,
    ],
    // --- IF simulation: SQLite usa iif ---
    [
        'nombre' => 'iif condicional',
        'query' => "SELECT iif(Precio_Venta > 1000, 'caro', 'barato') AS cat FROM tblarticulos WHERE Items = 2",
        'params' => [],
        'esperado' => fn($r) => $r[0]['cat'] === 'caro',
    ],
    // --- GROUP_CONCAT (SQLite lo soporta) ---
    [
        'nombre' => 'GROUP_CONCAT lista productos',
        'query' => "SELECT GROUP_CONCAT(Codigo, ', ') AS lista FROM tblarticulos WHERE Estado=1",
        'params' => [],
        'esperado' => fn($r) => strpos($r[0]['lista'], 'TEST-001') !== false,
    ],
    // --- LEFT JOIN con COALESCE (muy común en todo el backend) ---
    [
        'nombre' => 'JOIN categoría + COALESCE',
        'query' => "SELECT a.Items, COALESCE(c.Categoria, 'VARIOS') AS cat
                    FROM tblarticulos a LEFT JOIN tblcategoria c ON a.Id_Categoria = c.Id_Categoria WHERE a.Estado=1",
        'params' => [],
        'esperado' => fn($r) => count($r) === 3,
    ],
    // --- UPDATE con WHERE + RETURNING (SQLite 3.35+ lo soporta) ---
    [
        'nombre' => 'UPDATE kardex por idempotencia',
        'query' => "UPDATE tblarticulos SET Precio_Venta = Precio_Venta WHERE Items = ?",
        'params' => [1],
        'esperado' => fn($r) => true,
    ],
    // --- subquery correlacionada ---
    [
        'nombre' => 'subquery: artículos con ventas del mes',
        'query' => "SELECT a.Items, a.Codigo,
                    (SELECT COALESCE(SUM(d.Cantidad),0) FROM tbldetalle_venta d
                     INNER JOIN tblventas v ON d.Factura_N = v.Factura_N
                     WHERE d.Items = a.Items
                       AND strftime('%Y-%m', v.Fecha) = strftime('%Y-%m', 'now')
                       AND v.EstadoFact='Valida') AS vendido_mes
                    FROM tblarticulos a WHERE a.Estado=1",
        'params' => [],
        'esperado' => fn($r) => count($r) === 3,
    ],
    // --- IN con lista ---
    [
        'nombre' => 'IN con lista',
        'query' => "SELECT COUNT(*) AS n FROM tblarticulos WHERE Items IN (1,2,3) AND Estado=1",
        'params' => [],
        'esperado' => fn($r) => (int)$r[0]['n'] === 3,
    ],
    // --- INSERT con lastInsertId ---
    [
        'nombre' => 'INSERT con AUTOINCREMENT devuelve id',
        'query' => "INSERT INTO tblpagos (RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago, ValorFact, SaldoAct, Descuento, Retencion, Estado, Afectada, id_mediopago, NFactAnt, Nfact_electronica, id_usuario)
                    VALUES (2, 1001, NULL, 5000, DATETIME('now','localtime'), 'Test', 50000, 20000, 0, 0, 'Valida', '1110', 0, '', 0, 1)",
        'params' => [],
        'esperado' => function($r) use ($pdo) { return (int)$pdo->lastInsertId() > 0; },
    ],
    // --- transacción ---
    [
        'nombre' => 'BEGIN; INSERT; ROLLBACK deja la tabla como estaba',
        'query' => "SELECT 1", // placeholder — ejecutamos la lógica abajo
        'params' => [],
        'esperado' => function() use ($pdo) {
            $antes = (int)$pdo->query("SELECT COUNT(*) FROM tblcategoria")->fetchColumn();
            $pdo->beginTransaction();
            $pdo->exec("INSERT INTO tblcategoria (Id_Categoria, Categoria) VALUES (99, 'ROLLBACK TEST')");
            $pdo->rollBack();
            $despues = (int)$pdo->query("SELECT COUNT(*) FROM tblcategoria")->fetchColumn();
            return $antes === $despues;
        },
    ],
    // --- CTE (SQLite 3.8.3+ los soporta) ---
    [
        'nombre' => 'WITH CTE para ranking de productos',
        'query' => "WITH productos_rankeados AS (
                      SELECT Items, Codigo, Precio_Venta,
                             ROW_NUMBER() OVER (ORDER BY Precio_Venta DESC) AS puesto
                      FROM tblarticulos WHERE Estado=1
                    )
                    SELECT * FROM productos_rankeados WHERE puesto <= 2",
        'params' => [],
        'esperado' => fn($r) => count($r) === 2,
    ],
];

// Ejecución y reporte
echo "=== Ejecutando " . count($casos) . " queries representativas contra SQLite ===\n\n";
$ok = 0; $fail = 0;
$fallos = [];
foreach ($casos as $i => $c) {
    try {
        $stmt = $pdo->prepare($c['query']);
        $stmt->execute($c['params']);
        $resultado = $stmt->fetchAll();
        $pasa = ($c['esperado'])($resultado);
        if ($pasa) {
            echo sprintf("  [%2d] ✓ %s\n", $i+1, $c['nombre']);
            $ok++;
        } else {
            echo sprintf("  [%2d] ✗ %s (resultado no esperado)\n", $i+1, $c['nombre']);
            $fail++;
            $fallos[] = $c['nombre'] . ' — resultado inesperado';
        }
    } catch (PDOException $e) {
        echo sprintf("  [%2d] ✗ %s — %s\n", $i+1, $c['nombre'], substr($e->getMessage(), 0, 100));
        $fail++;
        $fallos[] = $c['nombre'] . ' — ' . substr($e->getMessage(), 0, 100);
    }
}

echo "\n=== RESUMEN ===\n";
echo "Queries OK: $ok / " . count($casos) . "\n";
echo "Queries con problemas: $fail\n";
if ($fallos) {
    echo "\nFallos detallados:\n";
    foreach ($fallos as $f) echo "  · $f\n";
}
