<?php
/**
 * Anular compra a proveedor.
 * POST { pedido_n, usuario_id, autorizado_por, autorizado_por_nombre, motivo }
 *
 * Efectos:
 *   1. Restar del inventario (`tblarticulos.Existencia`) las cantidades de la compra.
 *      Puede quedar negativo si esas unidades ya se vendieron — no bloqueamos,
 *      el usuario debe estar consciente y corregir después con un ajuste.
 *   2. Insertar reversos en `tblkardex` (C_D=2 salida) por cada línea, con
 *      costo=PrecioC del detalle. Kardex nunca borra filas (feedback_kardex_inmutable).
 *   3. Marcar `tblpedidos.EstadoPedido='Anulada'` y `Saldo=0` para que salga
 *      de la cartera de proveedores.
 *   4. Si la compra era Contado: marcar `tblegresos.Estado='Anulada'` del
 *      egreso relacionado. Si el egreso fue en efectivo (id_mediopago=0) y
 *      existe caja abierta HOY del usuario, registrar ingreso automático de
 *      reverso en esa caja (no tocar la caja cerrada vieja).
 *
 * Autorización: requiere admin (usuario_id con Id_TiposUsuario=1) o venir
 * con autorizado_por (id del admin que autorizó vía AutorizacionAdminModal).
 */
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) { echo json_encode(['success' => false, 'message' => 'Sin datos']); exit; }

$pedidoN     = intval($data['pedido_n'] ?? 0);
$usuarioId   = intval($data['usuario_id'] ?? 0);
$autorizadoPor    = intval($data['autorizado_por'] ?? 0);
$autorizadoNombre = trim($data['autorizado_por_nombre'] ?? '');
$motivo      = trim($data['motivo'] ?? '');

if (!$pedidoN) { echo json_encode(['success' => false, 'message' => 'Pedido_N requerido']); exit; }

try {
    // ===== Validación de autorización =====
    // Solo admin puede anular directamente; si no es admin, exige autorizado_por.
    if (!$autorizadoPor && $usuarioId > 0) {
        $stmt = $db->prepare("SELECT Id_TiposUsuario FROM tblusuarios WHERE Id_Usuario = ?");
        $stmt->execute([$usuarioId]);
        $tipoU = intval($stmt->fetch()['Id_TiposUsuario'] ?? 0);
        if ($tipoU !== 1) {
            echo json_encode([
                'success' => false, 'requiere_autorizacion' => true,
                'message' => 'Solo un administrador puede anular compras. Solicite autorización.'
            ]);
            exit;
        }
    }

    // Traer compra
    $stmt = $db->prepare("SELECT * FROM tblpedidos WHERE Pedido_N = ?");
    $stmt->execute([$pedidoN]);
    $ped = $stmt->fetch();
    if (!$ped) { echo json_encode(['success' => false, 'message' => 'Compra no encontrada']); exit; }
    if (($ped['EstadoPedido'] ?? '') === 'Anulada') {
        echo json_encode(['success' => false, 'message' => 'Esta compra ya fue anulada']);
        exit;
    }

    $tipoPedido = $ped['TipoPedido'] ?? 'Contado';
    $facturaCompra = $ped['FacturaCompra_N'] ?? '';
    $codigoPro = intval($ped['CodigoPro'] ?? 0);
    $totalCompra = floatval($ped['Total'] ?? 0);

    // ===== Validación caja para compras contado (patrón de ventas) =====
    // Si el pago original fue efectivo, exigimos caja abierta HOY para el
    // ingreso de reverso — no tocamos la caja vieja.
    $egresoOriginal = null;
    $requiereCajaAbierta = false;
    $cajaAbiertaHoy = null;
    if ($tipoPedido === 'Contado' && $totalCompra > 0) {
        // Localizar egreso original por FactN + CodigoPro (así se creó en nueva.php)
        $stmt = $db->prepare("
            SELECT * FROM tblegresos
            WHERE FactN = ? AND CodigoPro = ? AND Estado = 'Valida'
            ORDER BY Id_Egresos DESC LIMIT 1
        ");
        $stmt->execute([strval($facturaCompra), $codigoPro]);
        $egresoOriginal = $stmt->fetch() ?: null;

        $medioPagoOriginal = intval($egresoOriginal['id_mediopago'] ?? 0);
        if ($egresoOriginal && $medioPagoOriginal === 0) {
            // Buscar caja abierta HOY del usuario
            $stmt = $db->prepare("
                SELECT s.Id_Sesion, s.Id_Caja, c.Nombre AS NombreCaja
                FROM tblsesiones_caja s
                INNER JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
                WHERE s.Estado = 'abierta' AND DATE(s.FechaApertura) = CURDATE()
                  AND s.Id_Usuario = ?
                ORDER BY s.FechaApertura DESC LIMIT 1
            ");
            $stmt->execute([$usuarioId]);
            $cajaAbiertaHoy = $stmt->fetch() ?: null;
            if (!$cajaAbiertaHoy) {
                echo json_encode([
                    'success' => false, 'requiere_caja_abierta' => true,
                    'message' => 'Para anular esta compra de contado (efectivo) debe tener una caja abierta asignada a su usuario. El reverso de $' . number_format($totalCompra, 0, ',', '.') . ' entrará a su caja activa. Abra una caja primero.'
                ]);
                exit;
            }
        }
    }

    $db->beginTransaction();

    // ===== 1 + 2: reverso de inventario y kardex =====
    $stmt = $db->prepare("SELECT * FROM tbldetalle_pedido WHERE Pedido_N = ?");
    $stmt->execute([$pedidoN]);
    $detalles = $stmt->fetchAll();

    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNombre = $meses[intval(date('n'))] ?? '';
    $fechaAnul = date('Y-m-d');

    foreach ($detalles as $det) {
        $itemId = intval($det['Items']);
        $cant   = floatval($det['Cantidad']);
        if ($cant <= 0 || !$itemId) continue;

        // Restar del inventario
        $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
           ->execute([$cant, $itemId]);

        // Traer estado post-actualización para kardex
        $stmtArt = $db->prepare("SELECT Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
        $stmtArt->execute([$itemId]);
        $art = $stmtArt->fetch();
        if (!$art) continue; // ítem huérfano, saltar kardex

        // Costo usado en el reverso: preferimos el CostoFinal de la línea (base
        // sin IVA como el kardex original de la compra). Si CostoFinal está en 0
        // (compras viejas), caemos a PrecioC (que estaba con IVA).
        $costoFinal = floatval($det['CostoFinal'] ?? 0);
        $costoSal   = $costoFinal > 0 ? $costoFinal : floatval($det['PrecioC']);
        $costoUnit  = floatval($art['Precio_Costo']);
        $existActual = floatval($art['Existencia']);

        $db->prepare("
            INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
        ")->execute([
            $fechaAnul, $mesNombre, $itemId, "Anulación Ped. N° $pedidoN Fac. $facturaCompra",
            $cant, $cant * $costoSal,
            $existActual, $existActual * $costoUnit, $costoUnit
        ]);
    }

    // ===== 3: marcar compra como anulada =====
    // Agregamos motivo + autorizador al Comentario para trazabilidad, sin borrar el original.
    $comentarioOriginal = $ped['Comentario'] ?? '';
    $trazabilidad = " [ANULADA " . date('Y-m-d H:i') . " por usuario $usuarioId";
    if ($autorizadoPor) $trazabilidad .= " (autorizado por $autorizadoNombre)";
    if ($motivo)        $trazabilidad .= " · motivo: $motivo";
    $trazabilidad .= "]";

    $db->prepare("UPDATE tblpedidos SET EstadoPedido = 'Anulada', Saldo = 0, Comentario = ? WHERE Pedido_N = ?")
       ->execute([$comentarioOriginal . $trazabilidad, $pedidoN]);

    // ===== 4: reverso de egreso + caja si Contado =====
    $msgExtra = '';
    if ($egresoOriginal) {
        $db->prepare("UPDATE tblegresos SET Estado = 'Anulada' WHERE Id_Egresos = ?")
           ->execute([$egresoOriginal['Id_Egresos']]);
        $msgExtra .= ". Egreso #" . $egresoOriginal['N_Comprobante'] . " marcado como Anulada";

        // Ingreso de reverso en caja abierta hoy (solo efectivo)
        if ($cajaAbiertaHoy) {
            $descripcion = "Reverso por anulación compra #$pedidoN (Fac. $facturaCompra)";
            if ($autorizadoPor && $autorizadoNombre) $descripcion .= " · autorizado por $autorizadoNombre";

            $db->prepare("
                INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion)
                VALUES (?, ?, ?, ?, 'ingreso', ?)
            ")->execute([
                $cajaAbiertaHoy['Id_Sesion'], $cajaAbiertaHoy['Id_Caja'],
                $usuarioId, $totalCompra, $descripcion
            ]);
            $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")
               ->execute([$totalCompra, $cajaAbiertaHoy['Id_Caja']]);

            $msgExtra .= ". Reverso de $" . number_format($totalCompra, 0, ',', '.') . " ingresado a " . $cajaAbiertaHoy['NombreCaja'];
        }
    }

    $db->commit();
    echo json_encode([
        'success' => true,
        'message' => "Compra #$pedidoN anulada correctamente" . $msgExtra,
        'ingreso_caja' => $cajaAbiertaHoy ? floatval($totalCompra) : null,
        'caja_ingreso' => $cajaAbiertaHoy ? $cajaAbiertaHoy['NombreCaja'] : null,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
