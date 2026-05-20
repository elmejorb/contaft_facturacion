<?php
/**
 * Comportamiento de cartera del cliente — versión SIMPLIFICADA (v5.5+).
 *
 * Antes vivía en `tbl_clientes_comportamiento` (tabla aparte). Ahora vive
 * directo en `tblclientes` con las columnas:
 *   - comportamiento ENUM
 *   - cartera_castigada TINYINT
 *   - fecha_castigo, motivo_castigo, motivo_detalle, id_usuario_castigo
 *   - dias_mora_promedio, nota_cobranza
 *
 * Endpoints:
 *   POST action=castigar         { id, motivo, motivo_detalle?, id_usuario, nota? }
 *   POST action=restaurar        { id, id_usuario }
 *   POST action=guardar_nota     { id, nota }
 *   POST action=recalcular       { id?: N }   (sin id = todos)
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? (json_decode(file_get_contents('php://input'), true) ?: []) : [];
$action = $_GET['action'] ?? $body['action'] ?? '';

try {

    // --- Helper: clasifica comportamiento según días promedio de mora ---
    $clasificar = function ($mora, $tieneSaldoVencidoCritico) {
        if ($tieneSaldoVencidoCritico) return 'critico';
        if ($mora === null) return 'sin_datos';
        if ($mora < 0) return 'excelente';
        if ($mora <= 3) return 'puntual';
        if ($mora <= 15) return 'regular';
        if ($mora <= 60) return 'moroso';
        return 'critico';
    };

    // --- Helper: recalcula y guarda comportamiento de un cliente ---
    // En BDs legacy VB6 el vínculo cliente↔factura está en tblpagos.Codigo (no tblventas.CodigoEmp).
    $recalcular = function ($codigoClien) use ($db, $clasificar) {
        $stmt = $db->prepare("
            SELECT COUNT(*) AS pagos,
                AVG(DATEDIFF(p.Fecha, DATE_ADD(v.Fecha, INTERVAL COALESCE(c.Termino,0) DAY))) AS mora_prom
            FROM tblpagos p
            INNER JOIN tblclientes c ON c.CodigoClien = p.Codigo
            INNER JOIN tblventas v ON v.Factura_N = p.Fact_N
            WHERE c.CodigoClien = ?
              AND COALESCE(p.Estado, 'Valida') = 'Valida'
              AND p.Fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        ");
        $stmt->execute([$codigoClien]);
        $r = $stmt->fetch();

        $pagos = intval($r['pagos'] ?? 0);
        $mora = $r['mora_prom'] !== null ? round(floatval($r['mora_prom'])) : null;

        // ¿Tiene saldo abierto vencido > 60 días? → directo a crítico
        $stmt = $db->prepare("
            SELECT COUNT(DISTINCT v.Factura_N) AS criticas
            FROM tblventas v
            INNER JOIN tblpagos p ON p.Fact_N = v.Factura_N
            INNER JOIN tblclientes c ON c.CodigoClien = p.Codigo
            WHERE c.CodigoClien = ?
              AND v.EstadoFact = 'Valida'
              AND v.Tipo <> 'Contado'
              AND v.Saldo > 0
              AND DATEDIFF(CURDATE(), DATE_ADD(v.Fecha, INTERVAL COALESCE(c.Termino,0) DAY)) > 60
        ");
        $stmt->execute([$codigoClien]);
        $criticas = intval($stmt->fetch()['criticas'] ?? 0);

        $comportamiento = $clasificar($mora, $criticas > 0);

        $stmt = $db->prepare("
            UPDATE tblclientes
            SET comportamiento = ?, dias_mora_promedio = ?
            WHERE CodigoClien = ?
        ");
        $stmt->execute([$comportamiento, $mora, $codigoClien]);

        return ['comportamiento' => $comportamiento, 'dias_mora_promedio' => $mora, 'facturas_evaluadas' => $pagos];
    };

    // --- POST castigar ---
    if ($method === 'POST' && $action === 'castigar') {
        $id = intval($body['id'] ?? 0);
        $motivo = $body['motivo'] ?? '';
        $detalle = trim($body['motivo_detalle'] ?? '');
        $idUsuario = intval($body['id_usuario'] ?? 0);
        $nota = trim($body['nota'] ?? '');

        $motivosValidos = ['cliente_perdido','empresa_cerrada','no_localizable','acuerdo_fallido','otro'];
        if (!$id || !in_array($motivo, $motivosValidos)) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos (id y motivo requeridos)']);
            exit;
        }

        $stmt = $db->prepare("
            UPDATE tblclientes
            SET cartera_castigada = 1,
                fecha_castigo = NOW(),
                motivo_castigo = ?,
                motivo_detalle = ?,
                id_usuario_castigo = ?,
                nota_cobranza = COALESCE(NULLIF(?, ''), nota_cobranza)
            WHERE CodigoClien = ?
        ");
        $stmt->execute([$motivo, $detalle ?: null, $idUsuario ?: null, $nota ?: null, $id]);

        echo json_encode(['success' => true, 'message' => 'Cartera castigada correctamente']);
        exit;
    }

    // --- POST restaurar ---
    if ($method === 'POST' && $action === 'restaurar') {
        $id = intval($body['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Falta id']); exit; }

        $stmt = $db->prepare("
            UPDATE tblclientes
            SET cartera_castigada = 0,
                fecha_castigo = NULL,
                motivo_castigo = NULL,
                motivo_detalle = NULL,
                id_usuario_castigo = NULL
            WHERE CodigoClien = ?
        ");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Cartera restaurada']);
        exit;
    }

    // --- POST guardar_nota ---
    if ($method === 'POST' && $action === 'guardar_nota') {
        $id = intval($body['id'] ?? 0);
        $nota = $body['nota'] ?? '';
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Falta id']); exit; }

        $stmt = $db->prepare("UPDATE tblclientes SET nota_cobranza = ? WHERE CodigoClien = ?");
        $stmt->execute([$nota ?: null, $id]);

        echo json_encode(['success' => true]);
        exit;
    }

    // --- POST recalcular (uno o todos) ---
    if ($method === 'POST' && $action === 'recalcular') {
        $id = intval($body['id'] ?? 0);
        if ($id > 0) {
            $r = $recalcular($id);
            echo json_encode(['success' => true, 'data' => $r]);
            exit;
        }
        // Todos los clientes con al menos un pago
        $stmt = $db->query("
            SELECT DISTINCT p.Codigo AS CodigoClien
            FROM tblpagos p
            INNER JOIN tblclientes c ON c.CodigoClien = p.Codigo
            WHERE p.Codigo IS NOT NULL AND p.Codigo > 0
        ");
        $procesados = 0;
        foreach ($stmt->fetchAll() as $row) {
            $recalcular(intval($row['CodigoClien']));
            $procesados++;
        }
        echo json_encode(['success' => true, 'procesados' => $procesados]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no soportada']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
