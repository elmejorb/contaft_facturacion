<?php
/**
 * Permisos por tipo de usuario
 * GET              → listar tipos con permisos
 * POST action=guardar → guardar permisos de un tipo
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

// Módulos disponibles con sus IDs
$modulosDisponibles = [
    ['id' => 'dashboard_completo', 'label' => 'Dashboard completo', 'grupo' => 'General'],
    ['id' => 'inventario', 'label' => 'Inventario', 'grupo' => 'Inventario'],
    ['id' => 'inventario_editar', 'label' => 'Crear/Editar productos', 'grupo' => 'Inventario'],
    ['id' => 'inventario_diagnostico', 'label' => 'Diagnóstico / Auditoría', 'grupo' => 'Inventario'],
    ['id' => 'inventario_conteo', 'label' => 'Conteo de inventario', 'grupo' => 'Inventario'],
    ['id' => 'categorias', 'label' => 'Categorías', 'grupo' => 'Inventario'],
    ['id' => 'clientes', 'label' => 'Clientes (consultar)', 'grupo' => 'Clientes'],
    ['id' => 'clientes_editar', 'label' => 'Crear/Editar clientes', 'grupo' => 'Clientes'],
    ['id' => 'clientes_pagos', 'label' => 'Pagos de clientes', 'grupo' => 'Clientes'],
    ['id' => 'clientes_cartera', 'label' => 'Cartera de clientes', 'grupo' => 'Clientes'],
    ['id' => 'clientes_top', 'label' => 'Top clientes', 'grupo' => 'Clientes'],
    ['id' => 'proveedores', 'label' => 'Proveedores', 'grupo' => 'Proveedores'],
    ['id' => 'proveedores_pagar', 'label' => 'Cuentas por pagar', 'grupo' => 'Proveedores'],
    ['id' => 'ventas', 'label' => 'Nueva Venta', 'grupo' => 'Ventas'],
    ['id' => 'ventas_listado', 'label' => 'Listado de ventas', 'grupo' => 'Ventas'],
    ['id' => 'ventas_tipo_pago', 'label' => 'Ventas por tipo de pago', 'grupo' => 'Ventas'],
    ['id' => 'facturacion_electronica', 'label' => 'Facturación electrónica', 'grupo' => 'Ventas'],
    ['id' => 'compras', 'label' => 'Compras', 'grupo' => 'Compras'],
    ['id' => 'caja', 'label' => 'Abrir/Cerrar caja', 'grupo' => 'Movimientos'],
    ['id' => 'caja_historial', 'label' => 'Historial de cajas', 'grupo' => 'Movimientos'],
    ['id' => 'pagos_listado', 'label' => 'Listado de pagos', 'grupo' => 'Movimientos'],
    ['id' => 'gastos', 'label' => 'Gastos', 'grupo' => 'Movimientos'],
    ['id' => 'bancos', 'label' => 'Bancos', 'grupo' => 'Movimientos'],
    ['id' => 'configuracion', 'label' => 'Configuración del sistema', 'grupo' => 'Sistema'],
    ['id' => 'usuarios', 'label' => 'Administrar usuarios', 'grupo' => 'Sistema'],
    ['id' => 'datos_empresa', 'label' => 'Datos de la empresa', 'grupo' => 'Sistema'],
];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("SELECT * FROM tbltiposusuario ORDER BY Id_TiposUsuario");
        $tipos = $stmt->fetchAll();

        foreach ($tipos as &$t) {
            $permisos = $t['permisos'] ? json_decode($t['permisos'], true) : null;
            // Si no tiene permisos, admin tiene todo, otros tienen defaults
            if (!$permisos) {
                if ($t['Id_TiposUsuario'] == 1) {
                    $permisos = array_map(fn($m) => $m['id'], $modulosDisponibles);
                } else {
                    $permisos = ['ventas', 'ventas_listado', 'clientes', 'caja'];
                }
            }
            $t['permisos_lista'] = $permisos;
        }

        echo json_encode([
            'success' => true,
            'tipos' => $tipos,
            'modulos' => $modulosDisponibles
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'guardar') {
            $tipoId = intval($data['tipo_id'] ?? 0);
            $permisos = $data['permisos'] ?? [];

            if (!$tipoId) { echo json_encode(['success' => false, 'message' => 'Tipo requerido']); exit; }

            $db->prepare("UPDATE tbltiposusuario SET permisos = ? WHERE Id_TiposUsuario = ?")
               ->execute([json_encode($permisos), $tipoId]);

            echo json_encode(['success' => true, 'message' => 'Permisos actualizados']);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
