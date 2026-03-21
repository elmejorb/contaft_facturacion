<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

require_once '../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit;
    }

    // Validar datos requeridos
    if (empty($input['items']) || !is_array($input['items'])) {
        echo json_encode(['success' => false, 'message' => 'No hay productos en la factura']);
        exit;
    }

    // Iniciar transacción
    $pdo->beginTransaction();

    try {
        // Obtener siguiente número de factura
        $sqlNumero = "SELECT COALESCE(MAX(Numero_Factura), 0) + 1 AS siguiente FROM tblfacturas FOR UPDATE";
        $stmtNumero = $pdo->prepare($sqlNumero);
        $stmtNumero->execute();
        $numeroFactura = $stmtNumero->fetch(PDO::FETCH_ASSOC)['siguiente'];

        // Insertar la factura
        $sqlFactura = "INSERT INTO tblfacturas (
            Numero_Factura,
            Fecha,
            Id_Cliente,
            Identificacion_Cliente,
            Nombre_Cliente,
            Telefono_Cliente,
            Termino,
            Dias_Credito,
            Id_Vendedor,
            Subtotal,
            Descuento,
            Iva,
            Total,
            Estado
        ) VALUES (
            :numero,
            NOW(),
            :idCliente,
            :identificacion,
            :nombre,
            :telefono,
            :termino,
            :dias,
            :vendedor,
            :subtotal,
            :descuento,
            :iva,
            :total,
            'A'
        )";

        $stmtFactura = $pdo->prepare($sqlFactura);
        $stmtFactura->execute([
            'numero' => $numeroFactura,
            'idCliente' => $input['cliente']['id'] ?: null,
            'identificacion' => $input['cliente']['identificacion'],
            'nombre' => $input['cliente']['nombre'],
            'telefono' => $input['cliente']['telefono'] ?: null,
            'termino' => $input['termino'],
            'dias' => $input['diasCredito'] ?: 0,
            'vendedor' => $input['vendedor'] ?: null,
            'subtotal' => $input['subtotal'],
            'descuento' => $input['descuento'],
            'iva' => $input['iva'],
            'total' => $input['total']
        ]);

        $idFactura = $pdo->lastInsertId();

        // Insertar los detalles de la factura
        $sqlDetalle = "INSERT INTO tbldetallefactura (
            Id_Factura,
            Id_Articulo,
            Cantidad,
            Precio_Unitario,
            Descuento,
            Iva,
            Subtotal
        ) VALUES (
            :idFactura,
            :idArticulo,
            :cantidad,
            :precio,
            :descuento,
            :iva,
            :subtotal
        )";

        $stmtDetalle = $pdo->prepare($sqlDetalle);

        // Preparar el UPDATE de existencias
        $sqlExistencia = "UPDATE tblarticulos
                          SET Existencia = Existencia - :cantidad
                          WHERE Id_Articulo = :idArticulo";
        $stmtExistencia = $pdo->prepare($sqlExistencia);

        foreach ($input['items'] as $item) {
            $subtotalItem = $item['cantidad'] * $item['precio'] - $item['descuento'];

            // Insertar detalle
            $stmtDetalle->execute([
                'idFactura' => $idFactura,
                'idArticulo' => $item['idArticulo'],
                'cantidad' => $item['cantidad'],
                'precio' => $item['precio'],
                'descuento' => $item['descuento'],
                'iva' => $item['iva'],
                'subtotal' => $subtotalItem
            ]);

            // Actualizar existencia
            $stmtExistencia->execute([
                'cantidad' => $item['cantidad'],
                'idArticulo' => $item['idArticulo']
            ]);

            // Registrar en kardex
            $sqlKardex = "INSERT INTO tblkardex (
                Items,
                Fecha,
                Mes,
                Detalle,
                C_D,
                Cant_Ent,
                Cost_Ent,
                Cant_Sal,
                Cost_Sal,
                Cant_Saldo,
                Cost_Saldo,
                Cost_Unit
            ) SELECT
                :idArticulo,
                NOW(),
                MONTHNAME(NOW()),
                CONCAT('Venta de Mercancia según Fra. N° ', :numeroFactura),
                1,
                0,
                0,
                :cantidad,
                :costoSalida,
                Existencia,
                0,
                Costo_Promedio
              FROM tblarticulos WHERE Id_Articulo = :idArticulo2";

            $stmtKardex = $pdo->prepare($sqlKardex);
            $stmtKardex->execute([
                'idArticulo' => $item['idArticulo'],
                'numeroFactura' => $numeroFactura,
                'cantidad' => $item['cantidad'],
                'costoSalida' => $subtotalItem,
                'idArticulo2' => $item['idArticulo']
            ]);
        }

        // Confirmar transacción
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Factura creada exitosamente',
            'idFactura' => $idFactura,
            'numeroFactura' => $numeroFactura
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
