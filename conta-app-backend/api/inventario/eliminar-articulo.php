<?php
/**
 * Eliminar artículo del inventario.
 *
 * DELETE  → ?items=N        elimina si no tiene movimientos
 * DELETE  → ?items=N&forzar=1   no aplica — eliminar nunca debe forzarse
 * POST con action=desactivar  → marca Estado=0 (alternativa cuando hay movimientos)
 *
 * Reglas:
 *   - NO elimina si tiene ventas, compras o movimientos en kardex.
 *   - Devuelve mensaje claro indicando dónde tiene historial y sugiere desactivar.
 *   - El "desactivar" solo cambia Estado=0, preservando historial completo.
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $items = intval($_GET['items'] ?? $_POST['items'] ?? 0);
    if (!$items) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $items = intval($body['items'] ?? 0);
    }

    if (!$items) {
        echo json_encode(['success' => false, 'message' => 'Falta el parámetro items']);
        exit;
    }

    // Buscar acción del body si es POST
    $action = '';
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $body['action'] ?? '';
    }

    // Validar que el artículo exista
    $stmt = $db->prepare("SELECT Items, Codigo, Nombres_Articulo, Estado FROM tblarticulos WHERE Items = ?");
    $stmt->execute([$items]);
    $articulo = $stmt->fetch();
    if (!$articulo) {
        echo json_encode(['success' => false, 'message' => 'El artículo no existe']);
        exit;
    }

    // -----------------------------------------------------------
    // Acción: desactivar (alternativa cuando tiene movimientos)
    // -----------------------------------------------------------
    if ($method === 'POST' && $action === 'desactivar') {
        $stmt = $db->prepare("UPDATE tblarticulos SET Estado = 0, FechaMod = NOW() WHERE Items = ?");
        $stmt->execute([$items]);
        echo json_encode([
            'success' => true,
            'accion' => 'desactivado',
            'message' => 'Artículo desactivado. No aparecerá en ventas pero se conserva el historial.',
        ]);
        exit;
    }

    // -----------------------------------------------------------
    // Acción: eliminar (DELETE) — verificar dependencias
    // -----------------------------------------------------------
    if ($method === 'DELETE') {
        $dependencias = [];

        // Ventas
        $r = $db->prepare("SELECT COUNT(*) FROM tbldetalle_venta WHERE Items = ?");
        $r->execute([$items]);
        $cntVentas = intval($r->fetchColumn());
        if ($cntVentas > 0) $dependencias[] = "$cntVentas registro(s) de ventas";

        // Compras
        $r = $db->prepare("SELECT COUNT(*) FROM tbldetalle_pedido WHERE Items = ?");
        $r->execute([$items]);
        $cntCompras = intval($r->fetchColumn());
        if ($cntCompras > 0) $dependencias[] = "$cntCompras registro(s) de compras";

        // Kardex
        $tieneKardex = $db->query("SHOW TABLES LIKE 'tblkardex'")->fetch();
        if ($tieneKardex) {
            $r = $db->prepare("SELECT COUNT(*) FROM tblkardex WHERE Items = ?");
            $r->execute([$items]);
            $cntKardex = intval($r->fetchColumn());
            if ($cntKardex > 0) $dependencias[] = "$cntKardex movimiento(s) de kárdex";
        }

        // Lotes
        $tieneLotes = $db->query("SHOW TABLES LIKE 'tblproductos_lotes'")->fetch();
        if ($tieneLotes) {
            $r = $db->prepare("SELECT COUNT(*) FROM tblproductos_lotes WHERE Items = ?");
            $r->execute([$items]);
            $cntLotes = intval($r->fetchColumn());
            if ($cntLotes > 0) $dependencias[] = "$cntLotes lote(s) registrados";
        }

        if (!empty($dependencias)) {
            echo json_encode([
                'success' => false,
                'puede_eliminar' => false,
                'dependencias' => $dependencias,
                'message' => 'No se puede eliminar el artículo porque tiene movimientos: ' . implode(', ', $dependencias) . '. Si ya no se usa, puedes desactivarlo (preserva el historial).',
                'sugerencia' => 'desactivar',
            ]);
            exit;
        }

        // Sin dependencias → eliminar
        $stmt = $db->prepare("DELETE FROM tblarticulos WHERE Items = ?");
        $stmt->execute([$items]);

        echo json_encode([
            'success' => true,
            'accion' => 'eliminado',
            'message' => "Artículo \"{$articulo['Nombres_Articulo']}\" eliminado correctamente.",
        ]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Método no soportado']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
