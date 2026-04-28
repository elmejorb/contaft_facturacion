<?php
/**
 * Notas de Artículo — entradas/salidas de inventario por concepto.
 *
 * GET                                  → últimas 200 notas
 * GET ?items=N                         → notas de un producto
 * GET ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD → notas en un rango
 *
 * POST {action:'crear', items, tipo, concepto, descripcion, cantidad, valor_unitario, id_lote?}
 *   → registra la nota, actualiza tblarticulos.Existencia y tblkardex.
 *
 * POST {action:'eliminar', id_nota}
 *   → revierte una nota (resta o suma según era), borra del kardex y elimina la nota.
 *     Solo permitido si fue creada hoy y el lote (si tiene) sigue activo.
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

$MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $items = intval($_GET['items'] ?? 0);
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;
        $where = "WHERE 1=1";
        $params = [];
        if ($items) { $where .= " AND n.Items = ?"; $params[] = $items; }
        if ($desde) { $where .= " AND DATE(n.Fecha) >= ?"; $params[] = $desde; }
        if ($hasta) { $where .= " AND DATE(n.Fecha) <= ?"; $params[] = $hasta; }

        $stmt = $db->prepare("
            SELECT n.*, a.Codigo, a.Nombres_Articulo,
                   COALESCE(u.Nombre, CONCAT('Usr#', n.Id_Usuario)) AS usuario,
                   l.Numero_Lote, l.Fecha_Vencimiento
            FROM tblnotas_articulo n
            INNER JOIN tblarticulos a ON n.Items = a.Items
            LEFT JOIN tblusuarios u ON u.Id_Usuario = n.Id_Usuario
            LEFT JOIN tblproductos_lotes l ON l.Id_Lote = n.Id_Lote
            $where
            ORDER BY n.Fecha DESC, n.Id_Nota DESC
            LIMIT 500
        ");
        $stmt->execute($params);
        $notas = $stmt->fetchAll();
        echo json_encode(['success' => true, 'notas' => $notas, 'total' => count($notas)], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'crear') {
        $items     = intval($data['items'] ?? 0);
        $tipo      = $data['tipo'] ?? '';   // Entrada, Salida
        $concepto  = $data['concepto'] ?? ''; // Daño, Cambio, Vencimiento, Otro
        $desc      = trim($data['descripcion'] ?? '');
        $cantidad  = floatval($data['cantidad'] ?? 0);
        $valorUnit = floatval($data['valor_unitario'] ?? 0);
        $idUsuario = intval($data['id_usuario'] ?? 0);
        $idLote    = !empty($data['id_lote']) ? intval($data['id_lote']) : null;

        if (!$items || !in_array($tipo, ['Entrada','Salida'], true) || !$concepto || $cantidad <= 0) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos. Verifica producto, tipo, concepto y cantidad.']);
            exit;
        }

        $stmt = $db->prepare("SELECT Existencia, Precio_Costo, Codigo, Nombres_Articulo FROM tblarticulos WHERE Items = ?");
        $stmt->execute([$items]);
        $art = $stmt->fetch();
        if (!$art) { echo json_encode(['success' => false, 'message' => 'Producto no encontrado']); exit; }

        $costoUnit = $valorUnit > 0 ? $valorUnit : floatval($art['Precio_Costo']);

        // Si es salida, validar que hay stock suficiente
        if ($tipo === 'Salida' && floatval($art['Existencia']) < $cantidad) {
            echo json_encode(['success' => false, 'message' => "Stock insuficiente. Existencia actual: {$art['Existencia']}, intenta sacar: $cantidad"]);
            exit;
        }
        // Si tiene lote, validar y descontar
        if ($idLote && $tipo === 'Salida') {
            $stmt = $db->prepare("SELECT Cantidad_Actual, Estado FROM tblproductos_lotes WHERE Id_Lote = ? FOR UPDATE");
            $stmt->execute([$idLote]);
            $lote = $stmt->fetch();
            if (!$lote || $lote['Estado'] !== 'activo') { echo json_encode(['success' => false, 'message' => 'Lote no válido o inactivo']); exit; }
            if (floatval($lote['Cantidad_Actual']) < $cantidad) { echo json_encode(['success' => false, 'message' => "Lote sin stock suficiente. Disponible: {$lote['Cantidad_Actual']}"]); exit; }
        }

        $db->beginTransaction();

        // 1) Insertar la nota
        $db->prepare("
            INSERT INTO tblnotas_articulo (Items, Tipo, Concepto, Descripcion, Cantidad, Valor_Unitario, Id_Usuario, Id_Lote)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([$items, $tipo, $concepto, $desc ?: null, $cantidad, $costoUnit, $idUsuario, $idLote]);
        $idNota = $db->lastInsertId();

        // 2) Actualizar existencia
        $signo = $tipo === 'Entrada' ? '+' : '-';
        $db->prepare("UPDATE tblarticulos SET Existencia = Existencia $signo ? WHERE Items = ?")
           ->execute([$cantidad, $items]);

        // 3) Si tiene lote, actualizarlo
        if ($idLote) {
            $signoLote = $tipo === 'Entrada' ? '+' : '-';
            $db->prepare("UPDATE tblproductos_lotes SET Cantidad_Actual = Cantidad_Actual $signoLote ? WHERE Id_Lote = ?")
               ->execute([$cantidad, $idLote]);
            // Si quedó en 0 o menos, marcar como agotado o dado_de_baja según concepto
            $stmt = $db->prepare("SELECT Cantidad_Actual FROM tblproductos_lotes WHERE Id_Lote = ?");
            $stmt->execute([$idLote]);
            $cantActual = floatval($stmt->fetch()['Cantidad_Actual']);
            if ($cantActual <= 0) {
                $nuevoEstado = $concepto === 'Vencimiento' ? 'dado_de_baja' : 'agotado';
                $db->prepare("UPDATE tblproductos_lotes SET Estado = ? WHERE Id_Lote = ?")
                   ->execute([$nuevoEstado, $idLote]);
            }
        }

        // 4) Registrar en kardex
        $stmt = $db->prepare("SELECT Existencia FROM tblarticulos WHERE Items = ?");
        $stmt->execute([$items]);
        $nuevaExist = floatval($stmt->fetch()['Existencia']);
        $mes = $MESES[intval(date('n'))];
        $detalle = "Nota $tipo — $concepto" . ($desc ? ": " . substr($desc, 0, 30) : "");

        if ($tipo === 'Entrada') {
            $db->prepare("
                INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Ent, Cost_Ent, Cant_Saldo, Cost_Saldo, Cost_Unit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([$mes, $items, $detalle, $cantidad, $cantidad * $costoUnit, $nuevaExist, $nuevaExist * $costoUnit, $costoUnit]);
        } else {
            $db->prepare("
                INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([$mes, $items, $detalle, $cantidad, $cantidad * $costoUnit, $nuevaExist, $nuevaExist * $costoUnit, $costoUnit]);
        }

        $db->commit();
        echo json_encode([
            'success' => true,
            'id_nota' => $idNota,
            'message' => "Nota de $tipo registrada: $cantidad x {$art['Nombres_Articulo']} ($concepto)"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'eliminar') {
        $idNota = intval($data['id_nota'] ?? 0);
        if (!$idNota) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

        $stmt = $db->prepare("SELECT * FROM tblnotas_articulo WHERE Id_Nota = ?");
        $stmt->execute([$idNota]);
        $nota = $stmt->fetch();
        if (!$nota) { echo json_encode(['success' => false, 'message' => 'Nota no encontrada']); exit; }
        if (DATE('Y-m-d', strtotime($nota['Fecha'])) !== date('Y-m-d')) {
            echo json_encode(['success' => false, 'message' => 'Solo se pueden eliminar notas creadas hoy']);
            exit;
        }

        $db->beginTransaction();
        // Revertir inventario
        $signo = $nota['Tipo'] === 'Entrada' ? '-' : '+';
        $db->prepare("UPDATE tblarticulos SET Existencia = Existencia $signo ? WHERE Items = ?")
           ->execute([$nota['Cantidad'], $nota['Items']]);
        // Revertir lote si aplica
        if ($nota['Id_Lote']) {
            $signoLote = $nota['Tipo'] === 'Entrada' ? '-' : '+';
            $db->prepare("UPDATE tblproductos_lotes SET Cantidad_Actual = Cantidad_Actual $signoLote ?, Estado = 'activo' WHERE Id_Lote = ?")
               ->execute([$nota['Cantidad'], $nota['Id_Lote']]);
        }
        // Registrar revocación en kardex
        $mes = $MESES[intval(date('n'))];
        $stmt = $db->prepare("SELECT Existencia FROM tblarticulos WHERE Items = ?");
        $stmt->execute([$nota['Items']]);
        $nuevaExist = floatval($stmt->fetch()['Existencia']);
        $costoUnit = floatval($nota['Valor_Unitario']);
        $cantidad = floatval($nota['Cantidad']);
        $detalle = "REVERSO Nota #" . $idNota;
        if ($nota['Tipo'] === 'Entrada') {
            $db->prepare("INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
               ->execute([$mes, $nota['Items'], $detalle, $cantidad, $cantidad * $costoUnit, $nuevaExist, $nuevaExist * $costoUnit, $costoUnit]);
        } else {
            $db->prepare("INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Ent, Cost_Ent, Cant_Saldo, Cost_Saldo, Cost_Unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
               ->execute([$mes, $nota['Items'], $detalle, $cantidad, $cantidad * $costoUnit, $nuevaExist, $nuevaExist * $costoUnit, $costoUnit]);
        }
        // Eliminar nota
        $db->prepare("DELETE FROM tblnotas_articulo WHERE Id_Nota = ?")->execute([$idNota]);

        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Nota eliminada y kardex compensado']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
