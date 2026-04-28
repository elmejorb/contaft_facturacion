<?php
/**
 * Lotes (fechas de vencimiento) por producto.
 *
 * GET                       → todos los lotes activos con datos del producto
 * GET ?items=N              → lotes de un producto
 * GET ?por_vencer=1         → próximos a vencer + ya vencidos con stock
 * GET ?dias=30              → solo lotes que vencen en los próximos N días (default 30)
 *
 * POST {action:'crear', items, fecha_vencimiento, cantidad, numero_lote?, pedido_n?, comentario?}
 *   → crea un lote nuevo (no toca existencia — la existencia se actualiza por la compra normal)
 *
 * POST {action:'dar_de_baja', id_lote, cantidad, motivo}
 *   → da de baja una cantidad del lote y registra una Nota de Salida tipo Vencimiento
 *     (afecta existencia y kardex; NO afecta gastos ni utilidad)
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

$MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $items = intval($_GET['items'] ?? 0);
        $porVencer = isset($_GET['por_vencer']);
        $dias = intval($_GET['dias'] ?? 0);

        // ?stock_disponible=ITEMS → cuánto stock está libre para etiquetar en un lote nuevo
        if (isset($_GET['stock_disponible'])) {
            $it = intval($_GET['stock_disponible']);
            $stmt = $db->prepare("SELECT Existencia FROM tblarticulos WHERE Items = ?");
            $stmt->execute([$it]);
            $existencia = floatval($stmt->fetch()['Existencia'] ?? 0);
            $stmt = $db->prepare("SELECT COALESCE(SUM(Cantidad_Actual), 0) AS total FROM tblproductos_lotes WHERE Items = ? AND Estado = 'activo'");
            $stmt->execute([$it]);
            $sumLotes = floatval($stmt->fetch()['total']);
            echo json_encode([
                'success' => true,
                'existencia' => $existencia,
                'lotes_activos' => $sumLotes,
                'disponible' => $existencia - $sumLotes,
            ]);
            exit;
        }

        if ($items > 0) {
            $stmt = $db->prepare("
                SELECT l.*, a.Codigo, a.Nombres_Articulo,
                       DATEDIFF(l.Fecha_Vencimiento, CURDATE()) AS dias_restantes
                FROM tblproductos_lotes l
                INNER JOIN tblarticulos a ON l.Items = a.Items
                WHERE l.Items = ?
                ORDER BY l.Fecha_Vencimiento
            ");
            $stmt->execute([$items]);
            echo json_encode(['success' => true, 'lotes' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($porVencer) {
            // La vista vw_lotes_por_vencer YA filtra Estado='activo' y Cantidad_Actual>0 internamente
            $where = $dias > 0 ? "WHERE dias_restantes <= $dias" : "";
            $stmt = $db->query("SELECT * FROM vw_lotes_por_vencer $where ORDER BY Fecha_Vencimiento");
            $lotes = $stmt->fetchAll();

            $resumen = [
                'total'      => count($lotes),
                'vencidos'   => count(array_filter($lotes, fn($l) => intval($l['dias_restantes']) < 0)),
                'd_30'       => count(array_filter($lotes, fn($l) => intval($l['dias_restantes']) >= 0 && intval($l['dias_restantes']) <= 30)),
                'd_60'       => count(array_filter($lotes, fn($l) => intval($l['dias_restantes']) > 30 && intval($l['dias_restantes']) <= 60)),
                'd_90'       => count(array_filter($lotes, fn($l) => intval($l['dias_restantes']) > 60 && intval($l['dias_restantes']) <= 90)),
                'mas_90'     => count(array_filter($lotes, fn($l) => intval($l['dias_restantes']) > 90)),
                'valor_total'=> array_sum(array_map(fn($l) => floatval($l['valor_costo']), $lotes)),
            ];

            echo json_encode(['success' => true, 'lotes' => $lotes, 'resumen' => $resumen], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Default: todos los lotes activos con stock (la vista ya filtra)
        $stmt = $db->query("SELECT * FROM vw_lotes_por_vencer ORDER BY Fecha_Vencimiento");
        echo json_encode(['success' => true, 'lotes' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'crear') {
        $items = intval($data['items'] ?? 0);
        $fecha = $data['fecha_vencimiento'] ?? null;
        $cant  = floatval($data['cantidad'] ?? 0);
        $numLote = trim($data['numero_lote'] ?? '') ?: null;
        $pedidoN = !empty($data['pedido_n']) ? intval($data['pedido_n']) : null;
        $coment = trim($data['comentario'] ?? '') ?: null;
        // Cuando viene de una compra (con pedido_n), saltamos la validación de existencia
        // porque la compra todavía no se reflejó al consultar acá (se llama después del save).
        $omitirValidacion = !empty($pedidoN);

        if (!$items || !$fecha || $cant <= 0) {
            echo json_encode(['success' => false, 'message' => 'Items, fecha de vencimiento y cantidad son requeridos']);
            exit;
        }

        if (!$omitirValidacion) {
            // Validar que la suma de lotes activos + la cantidad nueva no supere la existencia del producto
            $stmt = $db->prepare("SELECT Existencia, Codigo, Nombres_Articulo FROM tblarticulos WHERE Items = ?");
            $stmt->execute([$items]);
            $art = $stmt->fetch();
            if (!$art) { echo json_encode(['success' => false, 'message' => 'Producto no encontrado']); exit; }

            $stmt = $db->prepare("SELECT COALESCE(SUM(Cantidad_Actual), 0) AS total FROM tblproductos_lotes WHERE Items = ? AND Estado = 'activo'");
            $stmt->execute([$items]);
            $sumLotes = floatval($stmt->fetch()['total']);

            $existencia = floatval($art['Existencia']);
            $disponible = $existencia - $sumLotes;

            if ($cant > $disponible + 0.0001) {
                echo json_encode([
                    'success' => false,
                    'message' => "No hay existencia suficiente. Stock total: $existencia, ya etiquetado en lotes: $sumLotes, disponible para nuevo lote: " . number_format($disponible, 2)
                ]);
                exit;
            }
        }

        $db->prepare("
            INSERT INTO tblproductos_lotes (Items, Numero_Lote, Fecha_Vencimiento, Cantidad_Inicial, Cantidad_Actual, Pedido_N, Comentario)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ")->execute([$items, $numLote, $fecha, $cant, $cant, $pedidoN, $coment]);
        $idLote = $db->lastInsertId();
        echo json_encode(['success' => true, 'id_lote' => $idLote, 'message' => 'Lote creado']);
        exit;
    }

    if ($action === 'dar_de_baja') {
        $idLote = intval($data['id_lote'] ?? 0);
        $cant   = floatval($data['cantidad'] ?? 0);
        $motivo = trim($data['motivo'] ?? 'Producto vencido');
        $idUsuario = intval($data['id_usuario'] ?? 0);

        if (!$idLote || $cant <= 0) {
            echo json_encode(['success' => false, 'message' => 'Lote y cantidad requeridos']);
            exit;
        }

        $stmt = $db->prepare("
            SELECT l.*, a.Precio_Costo, a.Codigo, a.Nombres_Articulo
            FROM tblproductos_lotes l
            INNER JOIN tblarticulos a ON l.Items = a.Items
            WHERE l.Id_Lote = ?
        ");
        $stmt->execute([$idLote]);
        $lote = $stmt->fetch();
        if (!$lote) { echo json_encode(['success' => false, 'message' => 'Lote no encontrado']); exit; }
        if ($lote['Estado'] !== 'activo') { echo json_encode(['success' => false, 'message' => 'El lote ya no está activo']); exit; }
        if (floatval($lote['Cantidad_Actual']) < $cant) {
            echo json_encode(['success' => false, 'message' => "El lote solo tiene {$lote['Cantidad_Actual']} unidades"]);
            exit;
        }

        $db->beginTransaction();

        $costoUnit = floatval($lote['Precio_Costo']);
        // 1) Crear nota de salida tipo Vencimiento
        $db->prepare("
            INSERT INTO tblnotas_articulo (Items, Tipo, Concepto, Descripcion, Cantidad, Valor_Unitario, Id_Usuario, Id_Lote)
            VALUES (?, 'Salida', 'Vencimiento', ?, ?, ?, ?, ?)
        ")->execute([$lote['Items'], $motivo, $cant, $costoUnit, $idUsuario, $idLote]);

        // 2) Descontar del lote
        $db->prepare("UPDATE tblproductos_lotes SET Cantidad_Actual = Cantidad_Actual - ? WHERE Id_Lote = ?")
           ->execute([$cant, $idLote]);
        // 3) Si quedó en 0, marcar como dado_de_baja
        $stmt = $db->prepare("SELECT Cantidad_Actual FROM tblproductos_lotes WHERE Id_Lote = ?");
        $stmt->execute([$idLote]);
        if (floatval($stmt->fetch()['Cantidad_Actual']) <= 0) {
            $db->prepare("UPDATE tblproductos_lotes SET Estado = 'dado_de_baja' WHERE Id_Lote = ?")->execute([$idLote]);
        }

        // 4) Descontar de existencia general
        $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
           ->execute([$cant, $lote['Items']]);

        // 5) Registrar en kardex
        $stmt = $db->prepare("SELECT Existencia FROM tblarticulos WHERE Items = ?");
        $stmt->execute([$lote['Items']]);
        $nuevaExist = floatval($stmt->fetch()['Existencia']);
        $mes = $MESES[intval(date('n'))];
        $detalle = "Baja por Vencimiento" . ($lote['Numero_Lote'] ? " — Lote {$lote['Numero_Lote']}" : "");
        $db->prepare("
            INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([$mes, $lote['Items'], $detalle, $cant, $cant * $costoUnit, $nuevaExist, $nuevaExist * $costoUnit, $costoUnit]);

        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => "Dadas de baja $cant unidades de {$lote['Nombres_Articulo']} por vencimiento. Registrado en kardex."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
