<?php
/**
 * Orquestador de sincronización SUBIDA (Desktop → Lumen).
 * Lee la config de tbl_config_vendedores y empuja en orden:
 *   1. Categorías  → POST {api_url}/sync/categorias/batch
 *   2. Productos   → POST {api_url}/sync/productos/batch
 *   3. Clientes    → POST {api_url}/sync/clientes/batch
 *   4. Vendedores  → POST {api_url}/sync/vendedores/batch
 *
 * Chunking de 200 registros por request (límite del Lumen).
 *
 * Devuelve JSON con resumen: cuántos se enviaron por categoría, errores por sección.
 * NO aborta si una sección falla — sigue con las siguientes y reporta el detalle.
 *
 * Uso:
 *   POST /api/vendedores/push-all.php
 *   GET  /api/vendedores/push-all.php  (también funciona, idempotente)
 */
require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

$db = (new Database())->getConnection();

/**
 * POST JSON a un endpoint del Lumen con email+token+registros.
 * @return array{ok:bool, http:int, body:array|null, raw:string}
 */
function postBatch(string $url, string $email, string $token, array $registros, int $timeout = 60): array {
    $payload = json_encode([
        'email'     => $email,
        'token_api' => $token,
        'registros' => $registros,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    $body = $raw ? json_decode($raw, true) : null;
    $ok = $http === 200 && is_array($body) && empty($body['error']);
    return [
        'ok'   => $ok,
        'http' => intval($http),
        'body' => $body,
        'raw'  => $err ?: (is_string($raw) ? substr($raw, 0, 300) : ''),
    ];
}

/**
 * Empuja un array completo de registros al endpoint, en chunks de 200.
 * Acumula totales devueltos por el Lumen (insertados / actualizados / errores).
 */
function pushChunked(string $url, string $email, string $token, array $registros): array {
    $resumen = ['enviados' => 0, 'insertados' => 0, 'actualizados' => 0, 'errores_lumen' => 0, 'fallas_http' => 0, 'detalle_errores' => []];
    if (empty($registros)) return $resumen;

    foreach (array_chunk($registros, 200) as $chunk) {
        $r = postBatch($url, $email, $token, $chunk);
        if (!$r['ok']) {
            $resumen['fallas_http']++;
            $resumen['detalle_errores'][] = "HTTP {$r['http']}: " . ($r['body']['mensaje'] ?? $r['raw']);
            continue;
        }
        $resumen['enviados']     += count($chunk);
        $resumen['insertados']   += intval($r['body']['insertados']   ?? 0);
        $resumen['actualizados'] += intval($r['body']['actualizados'] ?? 0);
        $resumen['errores_lumen']+= intval($r['body']['errores']      ?? 0);
    }
    return $resumen;
}

try {
    $config = $db->query("SELECT * FROM tbl_config_vendedores WHERE id = 1")->fetch();
    if (!$config || !$config['habilitado']) {
        echo json_encode(['success' => false, 'message' => 'Módulo de vendedores móviles no habilitado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $apiUrl = rtrim($config['api_url'] ?? '', '/');
    $email  = trim($config['api_email'] ?? '');
    $token  = trim($config['api_token_empresa'] ?? '');

    if (!$apiUrl || !$email || !$token) {
        echo json_encode(['success' => false, 'message' => 'Faltan credenciales de API (URL, email o token)'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $resultado = ['success' => true, 'inicio' => date('Y-m-d H:i:s'), 'secciones' => []];

    // ────────────────────────────────────────────────────────────────────
    // 1. CATEGORIAS
    // ────────────────────────────────────────────────────────────────────
    $rows = $db->query("
        SELECT Id_Categoria AS codigo, Categoria AS nombre
        FROM tblcategoria
        ORDER BY Id_Categoria
    ")->fetchAll(PDO::FETCH_ASSOC);
    $registros = array_map(fn($r) => [
        'codigo' => (string)$r['codigo'],
        'nombre' => (string)$r['nombre'],
    ], $rows);
    $resultado['secciones']['categorias'] = pushChunked("$apiUrl/sync/categorias/batch", $email, $token, $registros);

    // ────────────────────────────────────────────────────────────────────
    // 2. PRODUCTOS (artículos activos)
    // ────────────────────────────────────────────────────────────────────
    $rows = $db->query("
        SELECT a.Items, a.Codigo, a.Nombres_Articulo, a.Precio_Costo, a.Precio_Venta,
               a.Precio_Venta2, a.Precio_Venta3, a.Existencia, a.Existencia_minima,
               a.Iva, a.Estado, c.Id_Categoria
        FROM tblarticulos a
        LEFT JOIN tblcategoria c ON c.Id_Categoria = a.Id_Categoria
        WHERE a.Estado = 1
        ORDER BY a.Items
    ")->fetchAll(PDO::FETCH_ASSOC);
    $registros = array_map(fn($r) => [
        'codigo'            => (string)$r['Codigo'],
        'nombre_pro'        => (string)$r['Nombres_Articulo'],
        'cod_categoria'     => $r['Id_Categoria'] !== null ? (string)$r['Id_Categoria'] : null,
        'precio_costo'      => floatval($r['Precio_Costo']),
        'precio_venta1'     => floatval($r['Precio_Venta']),
        'precio_venta2'     => floatval($r['Precio_Venta2'] ?? 0),
        'precio_venta3'     => floatval($r['Precio_Venta3'] ?? 0),
        'existencia'        => floatval($r['Existencia']),
        'existencia_minima' => floatval($r['Existencia_minima'] ?? 0),
        'iva'               => floatval($r['Iva'] ?? 0),
        'estado'            => intval($r['Estado']),
    ], $rows);
    $resultado['secciones']['productos'] = pushChunked("$apiUrl/sync/productos/batch", $email, $token, $registros);

    // ────────────────────────────────────────────────────────────────────
    // 3. CLIENTES
    // ────────────────────────────────────────────────────────────────────
    // tblclientes legacy: no hay columna "Celular" ni "Municipio/Departamento"
    // como texto. Whatsapp ~ celular; id_municipio existe pero es FK, no nombre.
    $rows = $db->query("
        SELECT CodigoClien, Razon_Social, Nit, Telefonos, Whatsapp, Email,
               Direccion, id_documento, id_municipio, Termino
        FROM tblclientes
        ORDER BY CodigoClien
    ")->fetchAll(PDO::FETCH_ASSOC);
    $registros = array_map(fn($r) => [
        'codigo'        => (string)$r['CodigoClien'],
        'razon_social'  => (string)($r['Razon_Social'] ?? ''),
        'nit'           => $r['Nit'] ?? null,
        'id_documento'  => $r['id_documento'] !== null ? intval($r['id_documento']) : null,
        'telefonos'     => $r['Telefonos'] ?? null,
        'celular'       => $r['Whatsapp']  ?? null,
        'email_cliente' => $r['Email']     ?? null,
        'direccion'     => $r['Direccion'] ?? null,
        'id_municipio'  => $r['id_municipio'] !== null ? intval($r['id_municipio']) : null,
        'termino'       => $r['Termino']      !== null ? intval($r['Termino'])      : 0,
    ], $rows);
    $resultado['secciones']['clientes'] = pushChunked("$apiUrl/sync/clientes/batch", $email, $token, $registros);

    // ────────────────────────────────────────────────────────────────────
    // 4. VENDEDORES MÓVILES
    // ────────────────────────────────────────────────────────────────────
    if ($db->query("SHOW TABLES LIKE 'tbl_vendedores_movil'")->fetch()) {
        $rows = $db->query("
            SELECT codigo, nombre, email, password_hash, telefono, cedula, zona,
                   can_edit_clients, activo
            FROM tbl_vendedores_movil
            WHERE activo = 1
        ")->fetchAll(PDO::FETCH_ASSOC);
        $registros = array_map(fn($r) => [
            'codigo_vendedor' => (string)$r['codigo'],
            'nombre_vendedor' => (string)$r['nombre'],
            'email_vendedor'  => (string)$r['email'],
            'password_hash'   => (string)$r['password_hash'],
            'telefono'        => $r['telefono'] ?? null,
            'cedula'          => $r['cedula']   ?? null,
            'zona'            => $r['zona']     ?? null,
            'can_edit_clients'=> (bool)$r['can_edit_clients'],
            'activo'          => (bool)$r['activo'],
        ], $rows);
        $resultado['secciones']['vendedores'] = pushChunked("$apiUrl/sync/vendedores/batch", $email, $token, $registros);
    }

    // Stamp último push exitoso en config
    $db->prepare("UPDATE tbl_config_vendedores SET fecha_mod = NOW() WHERE id = 1")->execute();

    $resultado['fin'] = date('Y-m-d H:i:s');

    // ¿Hubo algún fallo crítico?
    $huboError = false;
    foreach ($resultado['secciones'] as $s) {
        if (($s['fallas_http'] ?? 0) > 0) { $huboError = true; break; }
    }
    if ($huboError) $resultado['success'] = false;

    echo json_encode($resultado, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
