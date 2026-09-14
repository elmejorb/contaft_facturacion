<?php
/**
 * POST /api/movs-directos/crear
 * Crea un movimiento directo de inventario (entrada o salida) SIN pasar por
 * el flujo de Compras/Ventas. Casos: regalos, muestras, mermas, ajustes por
 * conteo informal, traslados entre bodegas, producción propia, etc.
 *
 * Efectos:
 *  - Suma o resta de tblarticulos.Existencia
 *  - Registra en tblkardex con concepto claro para trazabilidad
 *  - Guarda el movimiento en tbl_movs_directos (auditoría)
 *  - NO toca tblpedidos ni tblegresos (no hay compra ni pago involucrados)
 *
 * Body:
 *  {
 *    tipo: 'entrada' | 'salida',
 *    motivo: 'ajuste_positivo' | 'regalo_proveedor' | 'devolucion_cliente' |
 *            'traslado' | 'produccion' | 'reingreso' | 'otro' | 'vencido' |
 *            'danado' | 'robo' | 'autoconsumo' | 'regalo_cliente' |
 *            'traslado_salida' | 'correccion',
 *    fecha: 'YYYY-MM-DD',
 *    Items: int,
 *    Cantidad: number,   // siempre positiva
 *    Costo_Unitario?: number (opcional; 0/null = usa Precio_Costo actual),
 *    Concepto?: string,
 *    Id_Usuario?: int
 *  }
 */
require_once '../config/database.php';
$db = (new Database())->getConnection();

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['success' => false, 'message' => 'Body inválido']); exit; }

    $tipo    = trim($data['tipo'] ?? '');
    $motivo  = trim($data['motivo'] ?? '');
    $fecha   = $data['fecha'] ?? date('Y-m-d');
    $items   = intval($data['Items'] ?? 0);
    $cant    = floatval($data['Cantidad'] ?? 0);
    $costoU  = floatval($data['Costo_Unitario'] ?? 0);
    $conc    = trim($data['Concepto'] ?? '');
    $idUser  = intval($data['Id_Usuario'] ?? 0) ?: null;
    // Precios de venta opcionales (solo tipo=entrada). null = no cambia.
    $precioVenta    = isset($data['Precio_Venta']) && $data['Precio_Venta'] !== null && floatval($data['Precio_Venta']) > 0
                      ? floatval($data['Precio_Venta']) : null;
    $precioVentaEmp = isset($data['Precio_Venta_Empaque']) && $data['Precio_Venta_Empaque'] !== null && floatval($data['Precio_Venta_Empaque']) > 0
                      ? floatval($data['Precio_Venta_Empaque']) : null;

    if (!in_array($tipo, ['entrada', 'salida'], true)) {
        echo json_encode(['success' => false, 'message' => 'tipo debe ser entrada|salida']); exit;
    }
    if ($motivo === '' || $items <= 0 || $cant <= 0) {
        echo json_encode(['success' => false, 'message' => 'motivo, Items y Cantidad son obligatorios']); exit;
    }

    $db->beginTransaction();

    // Cargar artículo
    $stmt = $db->prepare("SELECT Items, Nombres_Articulo, Existencia, Precio_Costo FROM tblarticulos WHERE Items = ? FOR UPDATE");
    $stmt->execute([$items]);
    $art = $stmt->fetch();
    if (!$art) throw new Exception('Artículo no encontrado');

    $existActual = floatval($art['Existencia']);
    $costoActual = floatval($art['Precio_Costo']);
    // Si no vino costo, usar el actual (patrón para entradas que heredan costo)
    if ($costoU <= 0) $costoU = $costoActual;
    $costoTotal = $cant * $costoU;

    // Calcular nueva existencia
    if ($tipo === 'entrada') {
        $nuevaExist = $existActual + $cant;
    } else {
        if ($existActual < $cant) {
            throw new Exception("Salida rechazada: existencia actual ({$existActual}) menor que la cantidad ({$cant})");
        }
        $nuevaExist = $existActual - $cant;
    }

    // Numeración correlativa MD-000001
    $nextId = intval($db->query("SELECT COALESCE(MAX(id_mov), 0) + 1 FROM tbl_movs_directos")->fetch()['COALESCE(MAX(id_mov), 0) + 1']);
    $numero = 'MD-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);

    // Registrar en tbl_movs_directos
    $db->prepare("
        INSERT INTO tbl_movs_directos
          (numero_mov, tipo, motivo, fecha, Items, Cantidad, Costo_Unitario, Costo_Total, Concepto, Id_Usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([$numero, $tipo, $motivo, $fecha, $items, $cant, $costoU, $costoTotal, $conc, $idUser]);

    // Actualizar existencia + precios opcionales (solo si entrada)
    $sets = ['Existencia = ?'];
    $params = [$nuevaExist];
    if ($tipo === 'entrada' && $precioVenta !== null) {
        $sets[] = 'Precio_Venta = ?';
        $params[] = $precioVenta;
    }
    if ($tipo === 'entrada' && $precioVentaEmp !== null) {
        // Verificar que la columna exista (defensivo, para BDs sin migracion)
        $colStmt = $db->query("SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos'
              AND COLUMN_NAME = 'Precio_Venta_Empaque'");
        if (intval($colStmt->fetchColumn()) > 0) {
            $sets[] = 'Precio_Venta_Empaque = ?';
            $params[] = $precioVentaEmp;
        }
    }
    $params[] = $items;
    $db->prepare('UPDATE tblarticulos SET ' . implode(', ', $sets) . ' WHERE Items = ?')
       ->execute($params);

    // Registrar en kardex
    $meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mesNombre = $meses[intval(date('n', strtotime($fecha)))] ?? '';
    $motivoLegible = [
        'ajuste_positivo'     => 'Ajuste (+) sobrante',
        'regalo_proveedor'    => 'Regalo/muestra proveedor',
        'devolucion_cliente'  => 'Devolución de cliente',
        'traslado'            => 'Traslado entre bodegas (entrada)',
        'produccion'          => 'Producción propia',
        'reingreso'           => 'Reingreso por corrección',
        'vencido'             => 'Baja por vencido',
        'danado'              => 'Baja por dañado',
        'robo'                => 'Baja por robo/hurto',
        'autoconsumo'         => 'Autoconsumo',
        'regalo_cliente'      => 'Regalo a cliente',
        'traslado_salida'     => 'Traslado entre bodegas (salida)',
        'correccion'          => 'Corrección de inventario',
        'otro'                => 'Otro',
    ][$motivo] ?? $motivo;

    $detalleKardex = "$numero · $motivoLegible" . ($conc !== '' ? " · $conc" : '');
    // Truncar a 255 (varchar típico del kardex)
    $detalleKardex = substr($detalleKardex, 0, 255);

    if ($tipo === 'entrada') {
        // C_D=1 entrada; Cost_Ent puede quedar en base sin IVA para consistencia contable,
        // pero como los movimientos directos son casos borde, guardamos el costo total tal cual.
        $db->prepare("
            INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?)
        ")->execute([
            $fecha, $mesNombre, $items, $detalleKardex,
            $cant, $costoTotal,
            $nuevaExist, $nuevaExist * $costoActual, $costoActual
        ]);
    } else {
        $db->prepare("
            INSERT INTO tblkardex (Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
            VALUES (?, ?, ?, ?, 2, 0, 0, ?, ?, ?, ?, ?)
        ")->execute([
            $fecha, $mesNombre, $items, $detalleKardex,
            $cant, $costoTotal,
            $nuevaExist, $nuevaExist * $costoActual, $costoActual
        ]);
    }

    $db->commit();

    echo json_encode([
        'success'     => true,
        'id_mov'      => $nextId,
        'numero_mov'  => $numero,
        'nueva_existencia' => $nuevaExist,
        'articulo'    => $art['Nombres_Articulo'],
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
