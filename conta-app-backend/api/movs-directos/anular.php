<?php
/**
 * POST /api/movs-directos/anular
 * Reversa un movimiento directo: crea un movimiento opuesto en kardex (para
 * respetar la regla de kardex inmutable), restaura la existencia del artículo
 * y marca el original como 'Anulada'.
 *
 * Body: { id_mov, motivo? }
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['success' => false, 'message' => 'Body inválido']); exit; }
    $idMov = intval($data['id_mov'] ?? 0);
    $motivo = trim($data['motivo'] ?? '');
    if ($idMov <= 0) { echo json_encode(['success' => false, 'message' => 'id_mov requerido']); exit; }

    $db->beginTransaction();

    $stmt = $db->prepare("SELECT * FROM tbl_movs_directos WHERE id_mov = ? FOR UPDATE");
    $stmt->execute([$idMov]);
    $mov = $stmt->fetch();
    if (!$mov) throw new Exception('Movimiento no encontrado');
    if ($mov['Estado'] === 'Anulada') throw new Exception('El movimiento ya está anulado');

    // Restaurar existencia con el movimiento opuesto
    $stmtArt = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ? FOR UPDATE");
    $stmtArt->execute([$mov['Items']]);
    $art = $stmtArt->fetch();
    if (!$art) throw new Exception('Artículo no existe');
    $existActual = floatval($art['Existencia']);
    $costoActual = floatval($art['Precio_Costo']);
    $cant = floatval($mov['Cantidad']);

    if ($mov['tipo'] === 'entrada') {
        // Fue entrada → al anular resto de existencia
        if ($existActual < $cant) {
            throw new Exception("No se puede anular: la existencia actual ({$existActual}) es menor que la cantidad del movimiento ({$cant}). Puede que ya se haya vendido.");
        }
        $nuevaExist = $existActual - $cant;
        $cd = 2; // salida de kardex
    } else {
        // Fue salida → al anular sumo
        $nuevaExist = $existActual + $cant;
        $cd = 1; // entrada de kardex
    }

    $db->prepare("UPDATE tblarticulos SET Existencia = ? WHERE Items = ?")
       ->execute([$nuevaExist, $mov['Items']]);

    $fecha = date('Y-m-d');
    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNombre = $meses[intval(date('n'))] ?? '';
    $detalle = "ANULACIÓN {$mov['numero_mov']}" . ($motivo !== '' ? " · $motivo" : '');
    $detalle = substr($detalle, 0, 255);

    if ($cd === 1) {
        $db->prepare("
            INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
        ")->execute([
            $fecha, $mesNombre, $mov['Items'], $detalle,
            $cant, floatval($mov['Costo_Total']),
            $nuevaExist, $nuevaExist * $costoActual, $costoActual
        ]);
    } else {
        $db->prepare("
            INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
        ")->execute([
            $fecha, $mesNombre, $mov['Items'], $detalle,
            $cant, floatval($mov['Costo_Total']),
            $nuevaExist, $nuevaExist * $costoActual, $costoActual
        ]);
    }

    // Marcar movimiento como anulado
    $comentarioAnul = trim(($mov['Concepto'] ?? '') . ($motivo !== '' ? " | Anulado: $motivo" : ' | Anulado'));
    $db->prepare("UPDATE tbl_movs_directos SET Estado = 'Anulada', Concepto = ? WHERE id_mov = ?")
       ->execute([$comentarioAnul, $idMov]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'id_mov' => $idMov,
        'numero_mov' => $mov['numero_mov'],
        'nueva_existencia' => $nuevaExist,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
