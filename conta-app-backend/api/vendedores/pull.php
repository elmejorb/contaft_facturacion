<?php
/**
 * Pull de ventas desde la API remota
 * GET (sin parámetros) → ejecuta pull incremental
 * POST action=pull     → ejecuta pull incremental
 *
 * Lógica:
 *  1. Leer config: api_url, api_token_empresa, ultimo_pull_id
 *  2. GET {api_url}/sync/ventas/pendientes?after_id={ultimo_pull_id}&per_page=100
 *  3. Por cada venta:
 *     - Si tiene cufe → INSERT/UPDATE electronic_documents (origen='movil')
 *     - Si NO tiene cufe → INSERT/UPDATE tbl_pedidos_vendedor
 *  4. UPDATE tbl_config_vendedores con nuevo ultimo_pull_id
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    // Leer configuración
    $config = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1")->fetch();
    if (!$config || !$config['habilitado']) {
        echo json_encode(['success' => false, 'message' => 'Módulo no habilitado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $apiUrl = rtrim($config['api_url'] ?? '', '/');
    $email = $config['api_email'] ?? '';
    $token = $config['api_token_empresa'] ?? '';
    $ultimoPullId = intval($config['ultimo_pull_id'] ?? 0);

    if (!$apiUrl || !$email || !$token) {
        echo json_encode(['success' => false, 'message' => 'Faltan credenciales de API'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $url = $apiUrl . '/sync/ventas/pendientes?after_id=' . $ultimoPullId . '&per_page=100&email=' . urlencode($email) . '&token_api=' . urlencode($token);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$resp) {
        echo json_encode(['success' => false, 'message' => 'Error conectando con API remota (HTTP ' . $httpCode . ')'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode($resp, true);
    if (empty($data) || !empty($data['error'])) {
        echo json_encode(['success' => false, 'message' => $data['mensaje'] ?? 'Respuesta inválida de la API'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ventas = $data['ventas'] ?? [];
    $pedidosNuevos = 0;
    $feNuevas = 0;
    $maxId = $ultimoPullId;

    // Si no hay ventas, igual seguimos al bloque de ediciones de clientes.
    // No hacemos early-exit aquí.
    if (!empty($ventas)) {
    $db->beginTransaction();
    try {
        foreach ($ventas as $v) {
            $idRemoto = intval($v['id_venta'] ?? 0);
            if ($idRemoto > $maxId) {
                $maxId = $idRemoto;
            }

            $tieneCufe = !empty($v['cufe']);

            if ($tieneCufe) {
                // Factura Electrónica autorizada por DIAN
                $stmt = $db->prepare("
                    SELECT id FROM electronic_documents
                    WHERE cufe = ?
                ");
                $stmt->execute([$v['cufe']]);
                $existe = $stmt->fetch();

                $fecha = !empty($v['fecha_venta']) ? $v['fecha_venta'] . ' 00:00:00' : date('Y-m-d H:i:s');

                if ($existe) {
                    $db->prepare("
                        UPDATE electronic_documents SET
                            fecha = ?, customer_identification = ?, total = ?, status = ?,
                            origen = 'movil', id_vendedor_remoto = ?, nombre_vendedor = ?
                        WHERE cufe = ?
                    ")->execute([
                        $fecha,
                        $v['nit_cliente'] ?? '',
                        $v['total'] ?? 0,
                        $v['estado_dian'] ?? 'autorizado',
                        $v['id_vendedor_conta'] ?? $v['id_vendedor_mobile'] ?? null, // preferir id del desktop (id_vendedor_conta); fallback al id Lumen si el hub no lo manda

                        $v['nombre_vendedor'] ?? '',
                        $v['cufe'],
                    ]);
                } else {
                    $db->prepare("
                        INSERT INTO electronic_documents
                        (fecha, cod_cliente, customer_identification, total, cufe, status,
                         origen, id_vendedor_remoto, nombre_vendedor, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'movil', ?, ?, NOW())
                    ")->execute([
                        $fecha,
                        $v['id_cliente'] ?? 0,
                        $v['nit_cliente'] ?? '',
                        $v['total'] ?? 0,
                        $v['cufe'],
                        $v['estado_dian'] ?? 'autorizado',
                        $v['id_vendedor_conta'] ?? $v['id_vendedor_mobile'] ?? null, // preferir id del desktop (id_vendedor_conta); fallback al id Lumen si el hub no lo manda

                        $v['nombre_vendedor'] ?? '',
                    ]);
                }
                $feNuevas++;
            } else {
                // Pedido sin FE
                $stmt = $db->prepare("SELECT id FROM tbl_pedidos_vendedor WHERE id_remoto = ?");
                $stmt->execute([$idRemoto]);
                $existe = $stmt->fetch();

                $itemsJson = !empty($v['detalles']) ? json_encode($v['detalles'], JSON_UNESCAPED_UNICODE) : '[]';

                if ($existe) {
                    $db->prepare("
                        UPDATE tbl_pedidos_vendedor SET
                            numero_pedido = ?, id_cliente_remoto = ?, nombre_cliente = ?,
                            nit_cliente = ?, id_vendedor_remoto = ?, nombre_vendedor = ?,
                            fecha = ?, subtotal = ?, impuestos = ?, total = ?,
                            forma_pago = ?, observaciones = ?, estado = ?, items_json = ?,
                            fecha_mod = NOW()
                        WHERE id_remoto = ?
                    ")->execute([
                        $v['numero_factura'] ?? '',
                        $v['id_cliente'] ?? null,
                        $v['nombre_cliente'] ?? '',
                        $v['nit_cliente'] ?? '',
                        $v['id_vendedor_conta'] ?? $v['id_vendedor_mobile'] ?? null, // preferir id del desktop (id_vendedor_conta); fallback al id Lumen si el hub no lo manda

                        $v['nombre_vendedor'] ?? '',
                        $v['fecha_venta'] ?? null,
                        $v['subtotal'] ?? 0,
                        $v['total_impuestos'] ?? 0,
                        $v['total'] ?? 0,
                        $v['forma_pago'] ?? 'contado',
                        $v['observaciones'] ?? '',
                        ($v['estado'] ?? 'pendiente') === 'registrada' ? 'pendiente' : ($v['estado'] ?? 'pendiente'),
                        $itemsJson,
                        $idRemoto,
                    ]);
                } else {
                    $db->prepare("
                        INSERT INTO tbl_pedidos_vendedor
                        (id_remoto, numero_pedido, id_cliente_remoto, nombre_cliente, nit_cliente,
                         id_vendedor_remoto, nombre_vendedor, fecha, subtotal, impuestos, total,
                         forma_pago, observaciones, estado, items_json, fecha_descarga, fecha_mod)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ")->execute([
                        $idRemoto,
                        $v['numero_factura'] ?? '',
                        $v['id_cliente'] ?? null,
                        $v['nombre_cliente'] ?? '',
                        $v['nit_cliente'] ?? '',
                        $v['id_vendedor_conta'] ?? $v['id_vendedor_mobile'] ?? null, // preferir id del desktop (id_vendedor_conta); fallback al id Lumen si el hub no lo manda

                        $v['nombre_vendedor'] ?? '',
                        $v['fecha_venta'] ?? null,
                        $v['subtotal'] ?? 0,
                        $v['total_impuestos'] ?? 0,
                        $v['total'] ?? 0,
                        $v['forma_pago'] ?? 'contado',
                        $v['observaciones'] ?? '',
                        ($v['estado'] ?? 'pendiente') === 'registrada' ? 'pendiente' : ($v['estado'] ?? 'pendiente'),
                        $itemsJson,
                    ]);
                    $pedidosNuevos++;
                }
            }
        }

        // Actualizar último pull
        $db->prepare("
            UPDATE tbl_config_vendedores
            SET ultimo_pull_id = ?, ultimo_pull_ventas = NOW(), fecha_mod = NOW()
            WHERE id = 1
        ")->execute([$maxId]);

        $db->commit();

    } catch (Exception $e) {
        $db->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error en pull ventas: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    } // fin if (!empty($ventas))

    // ====================================================================
    // PULL CLIENTES NUEVOS CREADOS EN MÓVIL
    // Inserta en tblclientes los clientes que un vendedor creó desde la app
    // (codvb6 NULL en Lumen). Luego avisa a Lumen del nuevo CodigoClien
    // asignado para que las ediciones futuras de ese cliente sí encuentren
    // el mapeo. CodigoEmp = empleado mapeado al vendedor que lo creó.
    // ====================================================================
    $clientesNuevosCreados = 0;
    $clientesNuevosError = 0;
    $mapeoConfirmar = []; // [{id_cliente, codvb6}, ...]

    try {
        $urlNue = $apiUrl . '/sync/clientes/nuevos?per_page=100&email=' . urlencode($email) . '&token_api=' . urlencode($token);
        $chN = curl_init($urlNue);
        curl_setopt($chN, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chN, CURLOPT_TIMEOUT, 30);
        $respN = curl_exec($chN);
        $codeN = curl_getinfo($chN, CURLINFO_HTTP_CODE);
        curl_close($chN);

        if ($codeN === 200 && $respN) {
            $dataN = json_decode($respN, true);
            $nuevos = $dataN['clientes'] ?? [];

            foreach ($nuevos as $cn) {
                try {
                    // Resolver CodigoEmp del vendedor que creó el cliente.
                    // Estrategia: tbl_vendedores_movil.codigo === codigo del payload,
                    // y de ahí tomar id_remoto que mapea a tblempleados.CodigoEmp.
                    $codigoEmp = null;
                    if (!empty($cn['codigo_vendedor'])) {
                        $stmtV = $db->prepare("SELECT id_remoto FROM tbl_vendedores_movil WHERE codigo = ? LIMIT 1");
                        $stmtV->execute([$cn['codigo_vendedor']]);
                        $vRow = $stmtV->fetch();
                        if ($vRow && !empty($vRow['id_remoto'])) {
                            $codigoEmp = intval($vRow['id_remoto']);
                        }
                    }

                    // Asignar CodigoClien siguiente
                    $stmtMax = $db->query("SELECT COALESCE(MAX(CodigoClien), 0) + 1 AS siguiente FROM tblclientes");
                    $nuevoCodigo = intval($stmtMax->fetch()['siguiente']);

                    // Identificacion es int en tblclientes (legacy VB6).
                    // Si el documento contiene caracteres no numéricos, lo
                    // guardamos como null (queda en Nit que sí es varchar).
                    $docRaw = (string)($cn['numero_documento'] ?? '');
                    $identNum = ctype_digit($docRaw) ? intval($docRaw) : null;

                    // gps_capturado_at puede venir en ISO con sufijo Z; lo
                    // normalizamos a 'Y-m-d H:i:s' que MySQL acepta nativo.
                    $gpsAt = $cn['gps_capturado_at'] ?? null;
                    if ($gpsAt) {
                        $ts = strtotime($gpsAt);
                        $gpsAt = $ts ? date('Y-m-d H:i:s', $ts) : null;
                    }

                    // Trazabilidad del vendedor: si no podemos mapear a un
                    // CodigoEmp del desktop, guardamos en Cargo_C la pista
                    // "Mobil: V005 - Carlos Test" para que el operador en
                    // Conta FT al menos vea quién lo creó.
                    $cargoC = null;
                    if (!empty($cn['codigo_vendedor'])) {
                        $cargoC = 'Móvil: ' . $cn['codigo_vendedor'];
                        if (!empty($cn['nombre_vendedor'])) {
                            $cargoC .= ' - ' . $cn['nombre_vendedor'];
                        }
                        $cargoC = mb_substr($cargoC, 0, 50); // columna varchar(50)
                    }

                    // Insert mínimo en tblclientes (legacy VB6). Whatsapp es
                    // NOT NULL sin default → siempre pasar string vacío.
                    $stmtIns = $db->prepare("
                        INSERT INTO tblclientes
                            (CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Whatsapp, Email, Direccion,
                             CodigoEmp, Cargo_C, Fecha_Ingreso, latitud, longitud, precision_gps_metros, gps_capturado_at, FechaMod)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, NOW())
                    ");
                    $stmtIns->execute([
                        $nuevoCodigo,
                        $cn['nombre_razon_social'] ?? '',
                        $docRaw !== '' ? $docRaw : null,
                        $identNum,
                        $cn['telefono'] ?? $cn['celular'] ?? null,
                        '', // Whatsapp NOT NULL
                        $cn['email'] ?? null,
                        $cn['direccion'] ?? null,
                        $codigoEmp,
                        $cargoC,
                        $cn['latitud'] ?? null,
                        $cn['longitud'] ?? null,
                        $cn['precision_gps_metros'] ?? null,
                        $gpsAt,
                    ]);

                    $clientesNuevosCreados++;
                    $mapeoConfirmar[] = [
                        'id_cliente' => intval($cn['id_cliente']),
                        'codvb6'     => (string)$nuevoCodigo,
                    ];
                } catch (Exception $eN) {
                    $clientesNuevosError++;
                }
            }

            // Confirmar mapeo a Lumen
            if (!empty($mapeoConfirmar)) {
                $payloadM = json_encode(['email' => $email, 'token_api' => $token, 'mapeos' => $mapeoConfirmar]);
                $chC = curl_init($apiUrl . '/sync/clientes/confirmar-mapeo');
                curl_setopt($chC, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($chC, CURLOPT_TIMEOUT, 30);
                curl_setopt($chC, CURLOPT_POST, true);
                curl_setopt($chC, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($chC, CURLOPT_POSTFIELDS, $payloadM);
                curl_exec($chC);
                curl_close($chC);
            }
        }
    } catch (Exception $eNuev) {
        $clientesNuevosError++;
    }

    // ====================================================================
    // PULL EDICIONES DE CLIENTES (telefono, GPS, dirección, etc.)
    // Trae ediciones desde Lumen → aplica UPDATE en tblclientes → confirma.
    // Las ediciones de clientes sin codvb6 (aún no mapeados) NO se confirman
    // y quedan pendientes para el próximo pull (tras confirmar el mapeo).
    // ====================================================================
    $edicionesAplicadas = 0;
    $edicionesNoEncontradas = 0;
    $edicionesPendientesMapeo = 0;
    $edicionesError = 0;

    // Mapeo: campo del payload Lumen → columna en tblclientes (legacy VB6).
    // Campos no listados aquí se ignoran silenciosamente (ej. cupo_autorizado
    // se maneja por otro flujo de autorización admin).
    $mapeoCampos = [
        'telefono'             => 'Telefonos',
        'celular'              => 'Telefonos',          // legacy: una sola columna
        'email'                => 'Email',
        'direccion'            => 'Direccion',
        'whatsapp'             => 'Whatsapp',
        'nombre_razon_social'  => 'Razon_Social',
        'latitud'              => 'latitud',
        'longitud'             => 'longitud',
        'precision_gps_metros' => 'precision_gps_metros',
        'gps_capturado_at'     => 'gps_capturado_at',
    ];

    try {
        $urlEd = $apiUrl . '/sync/clientes/ediciones-pendientes?per_page=200&email=' . urlencode($email) . '&token_api=' . urlencode($token);
        $ch = curl_init($urlEd);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $respEd = curl_exec($ch);
        $codeEd = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($codeEd === 200 && $respEd) {
            $dataEd = json_decode($respEd, true);
            $ediciones = $dataEd['ediciones'] ?? [];
            $idsConfirmar = [];

            foreach ($ediciones as $ed) {
                $codvb6 = (string)($ed['codvb6'] ?? '');
                $cambios = $ed['cambios'] ?? [];
                if ($codvb6 === '') {
                    // El cliente todavía no está mapeado al desktop (es nuevo
                    // y no se ha confirmado el codvb6 aún). NO confirmar — el
                    // próximo pull lo procesará una vez quede mapeado.
                    $edicionesPendientesMapeo++;
                    continue;
                }
                if (empty($cambios)) {
                    $idsConfirmar[] = $ed['id_edicion']; // sin cambios reales, confirmar
                    continue;
                }

                // Verificar que el cliente exista en desktop
                $stmtChk = $db->prepare("SELECT CodigoClien FROM tblclientes WHERE CodigoClien = ? LIMIT 1");
                $stmtChk->execute([intval($codvb6)]);
                if (!$stmtChk->fetch()) {
                    $edicionesNoEncontradas++;
                    $idsConfirmar[] = $ed['id_edicion']; // confirmar (no reintentaremos)
                    continue;
                }

                // Construir SET dinámico solo con campos mapeados
                $sets = [];
                $vals = [];
                foreach ($cambios as $campo => $detalle) {
                    if (!isset($mapeoCampos[$campo])) continue;
                    $colDesktop = $mapeoCampos[$campo];
                    $valor = $detalle['despues'] ?? null;
                    // Normalizar fechas ISO de Lumen (ej. 2026-06-09T13:41:34.923760Z)
                    // a formato MySQL DATETIME nativo.
                    if ($campo === 'gps_capturado_at' && $valor) {
                        $ts = strtotime($valor);
                        $valor = $ts ? date('Y-m-d H:i:s', $ts) : null;
                    }
                    // Evitar duplicar Telefonos si vienen telefono Y celular
                    $setExpr = '`' . $colDesktop . '` = ?';
                    if (!in_array($setExpr, $sets, true)) {
                        $sets[] = $setExpr;
                        $vals[] = $valor;
                    }
                }
                if (empty($sets)) {
                    $idsConfirmar[] = $ed['id_edicion'];
                    continue;
                }
                $sets[] = '`FechaMod` = NOW()';
                $vals[] = intval($codvb6);
                $sql = "UPDATE tblclientes SET " . implode(', ', $sets) . " WHERE CodigoClien = ?";

                try {
                    $stmtUp = $db->prepare($sql);
                    $stmtUp->execute($vals);
                    $edicionesAplicadas++;
                    $idsConfirmar[] = $ed['id_edicion'];
                } catch (Exception $eU) {
                    $edicionesError++;
                    // NO confirmar — quedará pendiente para próxima vez
                }
            }

            // Confirmar a Lumen lo que aplicamos / decidimos no reintentar
            if (!empty($idsConfirmar)) {
                $payload = json_encode(['email' => $email, 'token_api' => $token, 'ids' => $idsConfirmar]);
                $ch2 = curl_init($apiUrl . '/sync/clientes/ediciones-confirmadas');
                curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch2, CURLOPT_TIMEOUT, 30);
                curl_setopt($ch2, CURLOPT_POST, true);
                curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($ch2, CURLOPT_POSTFIELDS, $payload);
                curl_exec($ch2);
                curl_close($ch2);
            }
        }
    } catch (Exception $eEd) {
        // No interrumpir el reporte de pull de ventas si las ediciones fallan
        $edicionesError++;
    }

    $partes = [];
    if ($pedidosNuevos > 0) $partes[] = $pedidosNuevos . ' pedidos';
    if ($feNuevas > 0) $partes[] = $feNuevas . ' FE';
    if ($clientesNuevosCreados > 0) $partes[] = $clientesNuevosCreados . ' clientes nuevos';
    if ($edicionesAplicadas > 0) $partes[] = $edicionesAplicadas . ' ediciones aplicadas';
    $msg = empty($partes) ? 'Sin cambios nuevos' : ('Pull: ' . implode(', ', $partes));
    if ($edicionesPendientesMapeo > 0) $msg .= ' (' . $edicionesPendientesMapeo . ' ediciones esperan mapeo en próximo pull)';

    echo json_encode([
        'success' => true,
        'message' => $msg,
        'pedidos_nuevos' => $pedidosNuevos,
        'fe_nuevas' => $feNuevas,
        'clientes_nuevos_creados' => $clientesNuevosCreados,
        'clientes_nuevos_error' => $clientesNuevosError,
        'ediciones_clientes_aplicadas' => $edicionesAplicadas,
        'ediciones_clientes_no_encontradas' => $edicionesNoEncontradas,
        'ediciones_clientes_pendientes_mapeo' => $edicionesPendientesMapeo,
        'ediciones_clientes_error' => $edicionesError,
        'ultimo_pull_id' => $maxId,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
