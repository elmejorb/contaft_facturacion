<?php
/**
 * Distribución de productos entre unidades de la misma familia.
 *
 * POST {action, ...}
 *   action=verificar  {items: [{items, cantidad}]}
 *       Dry-run: revisa si para vender esos items hay stock suficiente y calcula
 *       qué distribuciones harían falta (romper unidades mayores). NO mueve stock.
 *       Devuelve { success, ok: bool, distribuciones: [...], faltantes: [...] }
 *
 *   action=aplicar    {items: [{items, cantidad}], factura_n?, id_usuario?}
 *       Ejecuta las distribuciones necesarias dentro de una transacción y
 *       registra movimientos con motivo='automatico'.
 *
 *   action=manual     {items_origen, cant_origen, id_usuario?, comentario?}
 *       Distribución manual: abre N unidades del producto origen, reparte la cantidad
 *       equivalente al(los) hermano(s) con Factor menor. Registra motivo='manual'.
 *
 *   GET ?items=N
 *       Devuelve los hermanos de familia del producto N (para UI de distribución manual).
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

/**
 * Devuelve el mejor "donante" (producto con Factor > solicitado y stock > 0),
 * priorizando el de menor Factor (romper lo mínimo necesario).
 */
function buscarDonante($db, $items, $cantidadFaltante) {
    $stmt = $db->prepare("
        SELECT fi_target.Id_Familia, fi_target.Factor AS factor_target
        FROM tblfamilia_items fi_target
        WHERE fi_target.Items = ?
    ");
    $stmt->execute([$items]);
    $target = $stmt->fetch();
    if (!$target) return null;

    // Hermanos con factor > target, ordenados ascendente (el más pequeño primero)
    $stmt = $db->prepare("
        SELECT fi.Items, fi.Factor, a.Existencia, a.Codigo, a.Nombres_Articulo
        FROM tblfamilia_items fi
        INNER JOIN tblarticulos a ON fi.Items = a.Items
        WHERE fi.Id_Familia = ? AND fi.Items != ? AND fi.Factor > ? AND a.Existencia > 0
        ORDER BY fi.Factor ASC
    ");
    $stmt->execute([$target['Id_Familia'], $items, $target['factor_target']]);
    $donantes = $stmt->fetchAll();

    $ratio = $target['factor_target']; // destino factor = 1 como base relativa
    foreach ($donantes as $d) {
        $unidadesPorRomper = ceil($cantidadFaltante / ($d['Factor'] / $target['factor_target']));
        if ($d['Existencia'] >= $unidadesPorRomper) {
            return [
                'items_origen'   => intval($d['Items']),
                'codigo_origen'  => $d['Codigo'],
                'nombre_origen'  => $d['Nombres_Articulo'],
                'factor_origen'  => floatval($d['Factor']),
                'factor_destino' => floatval($target['factor_target']),
                'cant_origen'    => floatval($unidadesPorRomper),
                'cant_destino'   => floatval($unidadesPorRomper * $d['Factor'] / $target['factor_target']),
                'id_familia'     => intval($target['Id_Familia']),
            ];
        }
    }
    // Si ninguno alcanza solo, combinar: abrir todo lo del primero y ver si alcanza + siguiente.
    // Por simplicidad: tomamos el que tenga más factor y ver si rompiendo todo su stock llega.
    if (count($donantes) > 0) {
        $d = end($donantes);
        $cubrirPorUnidad = $d['Factor'] / $target['factor_target'];
        $unidadesPorRomper = ceil($cantidadFaltante / $cubrirPorUnidad);
        if ($d['Existencia'] >= $unidadesPorRomper) {
            return [
                'items_origen'   => intval($d['Items']),
                'codigo_origen'  => $d['Codigo'],
                'nombre_origen'  => $d['Nombres_Articulo'],
                'factor_origen'  => floatval($d['Factor']),
                'factor_destino' => floatval($target['factor_target']),
                'cant_origen'    => floatval($unidadesPorRomper),
                'cant_destino'   => floatval($unidadesPorRomper * $cubrirPorUnidad),
                'id_familia'     => intval($target['Id_Familia']),
            ];
        }
    }
    return null; // ningún donante alcanza
}

/**
 * Calcula distribuciones necesarias para cubrir la venta.
 * Devuelve [distribuciones[], faltantes[]]
 * - distribuciones: lista de fraccionamientos a aplicar
 * - faltantes: productos cuya demanda no puede cubrirse ni abriendo donantes
 */
function planificar($db, $itemsVenta) {
    // Agregar cantidades por items (si aparece 2 veces en la factura)
    $demanda = [];
    foreach ($itemsVenta as $it) {
        $id = intval($it['items'] ?? 0);
        $cant = floatval($it['cantidad'] ?? 0);
        if (!$id) continue;
        $demanda[$id] = ($demanda[$id] ?? 0) + $cant;
    }

    // Stock proyectado (simulando consumos de donantes entre items)
    $stockProyectado = [];
    $getStock = function($id) use ($db, &$stockProyectado) {
        if (!isset($stockProyectado[$id])) {
            $s = $db->prepare("SELECT Existencia, Codigo, Nombres_Articulo FROM tblarticulos WHERE Items = ?");
            $s->execute([$id]);
            $r = $s->fetch();
            $stockProyectado[$id] = [
                'existencia' => floatval($r['Existencia'] ?? 0),
                'codigo'     => $r['Codigo'] ?? '',
                'nombre'     => $r['Nombres_Articulo'] ?? '',
            ];
        }
        return $stockProyectado[$id];
    };

    $distribuciones = [];
    $faltantes = [];

    foreach ($demanda as $itemId => $cant) {
        $st = $getStock($itemId);
        if ($st['existencia'] >= $cant) {
            // Hay stock, reservamos (descontamos proyectado)
            $stockProyectado[$itemId]['existencia'] -= $cant;
            continue;
        }

        $faltante = $cant - $st['existencia'];
        // Consumimos lo que hay
        $stockProyectado[$itemId]['existencia'] = 0;

        // Buscar donante
        $donante = buscarDonante($db, $itemId, $faltante);
        if (!$donante) {
            $faltantes[] = [
                'items' => $itemId,
                'codigo' => $st['codigo'],
                'nombre' => $st['nombre'],
                'solicitado' => $cant,
                'disponible' => floatval($st['existencia'] + ($cant - $faltante)), // = cant - faltante = existencia original
                'faltante'   => $faltante,
            ];
            continue;
        }

        // Verificar que el donante en stock proyectado tenga suficiente
        $stDonante = $getStock($donante['items_origen']);
        if ($stDonante['existencia'] < $donante['cant_origen']) {
            $faltantes[] = [
                'items' => $itemId, 'codigo' => $st['codigo'], 'nombre' => $st['nombre'],
                'solicitado' => $cant, 'disponible' => $cant - $faltante, 'faltante' => $faltante,
            ];
            continue;
        }

        // Registrar distribución
        $donante['items_destino']  = $itemId;
        $donante['codigo_destino'] = $st['codigo'];
        $donante['nombre_destino'] = $st['nombre'];
        $distribuciones[] = $donante;

        // Actualizar proyección
        $stockProyectado[$donante['items_origen']]['existencia'] -= $donante['cant_origen'];
        $stockProyectado[$itemId]['existencia'] += ($donante['cant_destino'] - $faltante);
    }

    return [$distribuciones, $faltantes];
}

function aplicarDistribucion($db, $dist, $facturaN, $idUsuario, $motivo, $comentario = null) {
    static $MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    $mes = $MESES[intval(date('n'))];

    // Datos del origen y destino antes de modificar
    $stmt = $db->prepare("SELECT Items, Codigo, Nombres_Articulo, Existencia, Precio_Costo FROM tblarticulos WHERE Items = ?");
    $stmt->execute([$dist['items_origen']]);
    $origen = $stmt->fetch();
    $stmt->execute([$dist['items_destino']]);
    $destino = $stmt->fetch();

    $costoOrigen  = floatval($origen['Precio_Costo']);
    $costoDestUnit = $dist['factor_origen'] > 0
        ? $costoOrigen * ($dist['factor_destino'] / $dist['factor_origen'])
        : floatval($destino['Precio_Costo']);

    // Descontar origen
    $db->prepare("UPDATE tblarticulos SET Existencia = Existencia - ? WHERE Items = ?")
       ->execute([$dist['cant_origen'], $dist['items_origen']]);
    // Sumar destino + actualizar costo promedio
    $existDestActual = floatval($destino['Existencia']);
    $existDestNueva = $existDestActual + $dist['cant_destino'];
    $costoDestActual = floatval($destino['Precio_Costo']);
    $costoDestPromedio = $existDestNueva > 0
        ? (($existDestActual * $costoDestActual + $dist['cant_destino'] * $costoDestUnit) / $existDestNueva)
        : $costoDestUnit;
    $db->prepare("UPDATE tblarticulos SET Existencia = ?, Precio_Costo = ? WHERE Items = ?")
       ->execute([$existDestNueva, $costoDestPromedio, $dist['items_destino']]);

    // Registrar movimiento en tblmovimientos_distribucion
    $db->prepare("
        INSERT INTO tblmovimientos_distribucion
            (Id_Usuario, Items_Origen, Items_Destino, Cant_Origen, Cant_Destino,
             Factor_Origen, Factor_Destino, Motivo, Factura_N, Comentario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([
        $idUsuario, $dist['items_origen'], $dist['items_destino'],
        $dist['cant_origen'], $dist['cant_destino'],
        $dist['factor_origen'], $dist['factor_destino'],
        $motivo, $facturaN, $comentario,
    ]);

    // KARDEX — 2 movimientos: salida del origen + entrada al destino
    $existOrigenNueva = floatval($origen['Existencia']) - $dist['cant_origen'];
    $detSalida = "Distribución → " . $destino['Codigo'] . ($motivo === 'automatico' && $facturaN ? " (Factura $facturaN)" : "");
    $db->prepare("
        INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([
        $mes, $dist['items_origen'], $detSalida,
        $dist['cant_origen'], $dist['cant_origen'] * $costoOrigen,
        $existOrigenNueva, $existOrigenNueva * $costoOrigen,
        $costoOrigen,
    ]);

    $detEntrada = "Distribución ← " . $origen['Codigo'] . ($motivo === 'automatico' && $facturaN ? " (Factura $facturaN)" : "");
    $db->prepare("
        INSERT INTO tblkardex (Mes, Items, Detalle, Cant_Ent, Cost_Ent, Cant_Saldo, Cost_Saldo, Cost_Unit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([
        $mes, $dist['items_destino'], $detEntrada,
        $dist['cant_destino'], $dist['cant_destino'] * $costoDestUnit,
        $existDestNueva, $existDestNueva * $costoDestPromedio,
        $costoDestUnit,
    ]);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $itemsId = intval($_GET['items'] ?? 0);
        if (!$itemsId) { echo json_encode(['success' => false, 'message' => 'items requerido']); exit; }

        $stmt = $db->prepare("
            SELECT fi.Id_Familia, fi.Factor AS factor_self
            FROM tblfamilia_items fi WHERE fi.Items = ?
        ");
        $stmt->execute([$itemsId]);
        $self = $stmt->fetch();
        if (!$self) { echo json_encode(['success' => true, 'familia' => null, 'hermanos' => []]); exit; }

        $stmt = $db->prepare("
            SELECT fi.Items, fi.Factor, a.Codigo, a.Nombres_Articulo, a.Existencia
            FROM tblfamilia_items fi
            INNER JOIN tblarticulos a ON fi.Items = a.Items
            WHERE fi.Id_Familia = ? AND fi.Items != ?
            ORDER BY fi.Factor DESC
        ");
        $stmt->execute([$self['Id_Familia'], $itemsId]);
        $hermanos = $stmt->fetchAll();
        echo json_encode([
            'success' => true,
            'id_familia' => $self['Id_Familia'],
            'factor_self' => $self['factor_self'],
            'hermanos' => $hermanos
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    if ($action === 'verificar') {
        [$dist, $falt] = planificar($db, $data['items'] ?? []);
        echo json_encode([
            'success' => true,
            'ok' => count($falt) === 0,
            'distribuciones' => $dist,
            'faltantes' => $falt,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'aplicar') {
        [$dist, $falt] = planificar($db, $data['items'] ?? []);
        if (count($falt) > 0) {
            echo json_encode(['success' => false, 'message' => 'Stock insuficiente', 'faltantes' => $falt]);
            exit;
        }
        $facturaN  = intval($data['factura_n'] ?? 0) ?: null;
        $idUsuario = intval($data['id_usuario'] ?? 0);

        $db->beginTransaction();
        foreach ($dist as $d) {
            aplicarDistribucion($db, $d, $facturaN, $idUsuario, 'automatico');
        }
        $db->commit();
        echo json_encode(['success' => true, 'distribuciones' => $dist, 'message' => 'Distribuciones aplicadas']);
        exit;
    }

    if ($action === 'manual') {
        $origen     = intval($data['items_origen'] ?? 0);
        $cantOrigen = floatval($data['cant_origen'] ?? 0);
        $destino    = intval($data['items_destino'] ?? 0);
        $comentario = $data['comentario'] ?? null;
        $idUsuario  = intval($data['id_usuario'] ?? 0);

        if (!$origen || !$destino || $cantOrigen <= 0) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']); exit;
        }

        // Ambos deben estar en la misma familia
        $stmt = $db->prepare("
            SELECT fi1.Id_Familia, fi1.Factor AS f1, fi2.Factor AS f2,
                   a1.Existencia AS exist_origen, a1.Codigo AS cod_origen,
                   a2.Codigo AS cod_destino
            FROM tblfamilia_items fi1
            INNER JOIN tblfamilia_items fi2 ON fi1.Id_Familia = fi2.Id_Familia
            INNER JOIN tblarticulos a1 ON fi1.Items = a1.Items
            INNER JOIN tblarticulos a2 ON fi2.Items = a2.Items
            WHERE fi1.Items = ? AND fi2.Items = ?
        ");
        $stmt->execute([$origen, $destino]);
        $info = $stmt->fetch();
        if (!$info) { echo json_encode(['success' => false, 'message' => 'Los productos no están en la misma familia']); exit; }
        if ($info['f1'] <= $info['f2']) { echo json_encode(['success' => false, 'message' => 'El producto origen debe tener factor mayor que el destino']); exit; }
        if ($info['exist_origen'] < $cantOrigen) { echo json_encode(['success' => false, 'message' => 'Existencia insuficiente en origen']); exit; }

        $cantDestino = $cantOrigen * ($info['f1'] / $info['f2']);

        $db->beginTransaction();
        aplicarDistribucion($db, [
            'items_origen'   => $origen,
            'items_destino'  => $destino,
            'cant_origen'    => $cantOrigen,
            'cant_destino'   => $cantDestino,
            'factor_origen'  => $info['f1'],
            'factor_destino' => $info['f2'],
        ], null, $idUsuario, 'manual', $comentario);
        $db->commit();

        echo json_encode([
            'success' => true,
            'cant_destino' => $cantDestino,
            'message' => "Distribuidos $cantOrigen x {$info['cod_origen']} → $cantDestino x {$info['cod_destino']}"
        ]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
