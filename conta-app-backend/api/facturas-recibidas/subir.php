<?php
/**
 * POST /api/facturas-recibidas/subir.php
 *
 * Recibe un ZIP (o XML directo) con la factura electrónica emitida por un
 * proveedor. Extrae los datos maestros + líneas, persiste en BD y devuelve
 * el registro creado para que el frontend pueda seguir con la emisión del
 * evento 030 (acuse de recibo).
 *
 * Content-Type: multipart/form-data
 * Campo:  archivo=<file>
 *
 * Response 201 (nueva): { success:true, factura:{...}, lineas_count, ya_existia:false }
 * Response 200 (idempotencia): { success:true, factura:{...}, ya_existia:true }
 * Response 400/422: { success:false, message:"..." }
 */
// Convertir warnings/notices y errores fatales en excepciones para que
// caigan al catch abajo y devuelvan JSON en vez de "server error" HTML.
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function ($sev, $msg, $file, $line) {
    if (!(error_reporting() & $sev)) return false;
    throw new ErrorException($msg, 0, $sev, $file, $line);
});
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'success' => false,
            'message' => 'PHP fatal: ' . $err['message'],
            'file'    => basename($err['file']) . ':' . $err['line'],
        ]);
    }
});

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/xml-parser.php';

use App\FacturasRecibidas\XmlParser;

header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }
    if (empty($_FILES['archivo']) || !is_uploaded_file($_FILES['archivo']['tmp_name'])) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Falta el archivo (campo "archivo")']);
        exit;
    }

    $tmp     = $_FILES['archivo']['tmp_name'];
    $orig    = $_FILES['archivo']['name'] ?: 'factura';
    $size    = intval($_FILES['archivo']['size'] ?? 0);
    if ($size <= 0 || $size > 20 * 1024 * 1024) {  // 20 MB tope defensivo
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Archivo vacío o mayor a 20 MB']);
        exit;
    }
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    if (!in_array($ext, ['zip', 'xml'], true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => "Extensión no soportada ($ext). Usa .zip o .xml"]);
        exit;
    }

    // 1) Extraer el XML crudo del ZIP (o leer el XML directo)
    [$xmlStr, $nombreXmlDentro] = XmlParser::extraerXmlDelArchivo($tmp, $ext);
    if (!$xmlStr) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'El archivo no contiene un XML válido']);
        exit;
    }

    // 2) Parsear cabecera + líneas
    $datos  = XmlParser::extraerDatosFactura($xmlStr);
    $lineas = XmlParser::extraerLineas($xmlStr);

    if (empty($datos['invoice_cufe']) || strlen($datos['invoice_cufe']) < 90) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'No se pudo extraer el CUFE del XML (mínimo 90 caracteres)']);
        exit;
    }

    $db = (new Database())->getConnection();

    // 3) Idempotencia: si el CUFE ya está registrado, devolvemos ese sin duplicar.
    //    El usuario puede haber subido el mismo ZIP dos veces por error o desde
    //    dos correos (proveedor reenvía).
    $stmt = $db->prepare("SELECT * FROM facturas_recibidas WHERE cufe = ? LIMIT 1");
    $stmt->execute([$datos['invoice_cufe']]);
    $existente = $stmt->fetch();
    if ($existente) {
        echo json_encode([
            'success'      => true,
            'ya_existia'   => true,
            'factura'      => $existente,
            'lineas_count' => intval($db->query("SELECT COUNT(*) FROM detalle_factura_recibida WHERE factura_recibida_id = " . intval($existente['id']))->fetchColumn()),
            'message'      => 'Esta factura ya estaba registrada',
        ]);
        exit;
    }

    // 4) Guardar el archivo original en filesystem (para reproceso o adjuntar
    //    al evento 030). Estructurado por año/mes para no acumular todo plano.
    $backendRoot = realpath(__DIR__ . '/../..');
    $yearMonth   = date('Y/m');
    $storageDir  = "$backendRoot/uploads/facturas_recibidas/$yearMonth";
    if (!is_dir($storageDir)) @mkdir($storageDir, 0777, true);
    $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $orig) ?: 'factura';
    $fname    = date('Ymd_His') . '_' . substr(md5(uniqid('', true)), 0, 8) . '_' . $safeName;
    $absPath  = "$storageDir/$fname";
    if (!@move_uploaded_file($tmp, $absPath) && !@copy($tmp, $absPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'No se pudo guardar el archivo en el servidor']);
        exit;
    }
    $relPath = "uploads/facturas_recibidas/$yearMonth/$fname";

    // 5) Calcular subtotal/IVA sumando líneas (fallback si el XML no trae el
    //    LegalMonetaryTotal completo).
    $subtotal = 0; $totalIva = 0;
    foreach ($lineas as $l) {
        $subtotal += floatval($l['subtotal']);
        $totalIva += floatval($l['iva_monto']);
    }
    $total = floatval($datos['invoice_payable_amount'] ?? ($subtotal + $totalIva));

    [$prefijo, $numeroSolo] = XmlParser::partirPrefijo($datos['invoice_number'] ?? '');

    // 6) Insertar cabecera + líneas en una transacción — todo o nada.
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO facturas_recibidas
            (cufe, tipo_documento, document_type_code, numero, prefijo, fecha_emision,
             emisor_nit, emisor_nombre, receptor_nit, receptor_nombre,
             subtotal, total_iva, total, moneda,
             archivo_original_nombre, xml_filename, xml_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $datos['invoice_cufe'],
            $datos['tipo_documento'] ?: 'Invoice',
            $datos['document_type_code'] ?: '01',
            $numeroSolo ?: $datos['invoice_number'],
            $prefijo,
            $datos['invoice_issue_date'],
            $datos['issuer_nit'],
            $datos['issuer_name'],
            $datos['receiver_nit'],
            $datos['receiver_name'],
            $subtotal, $totalIva, $total, $datos['moneda'] ?: 'COP',
            $orig, $fname, $relPath,
        ]);
        $facturaId = (int) $db->lastInsertId();

        $stmtDet = $db->prepare("
            INSERT INTO detalle_factura_recibida
            (factura_recibida_id, linea_num, codigo, descripcion, unidad_medida,
             cantidad, precio_unitario, descuento, iva_pct, iva_monto, subtotal, total_linea)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($lineas as $i => $l) {
            $stmtDet->execute([
                $facturaId, $i + 1,
                $l['codigo'] ?? null, $l['descripcion'] ?? null, $l['unidad_medida'] ?? null,
                $l['cantidad'], $l['precio_unitario'], $l['descuento'],
                $l['iva_pct'], $l['iva_monto'], $l['subtotal'], $l['total_linea'],
            ]);
        }
        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        // Si el INSERT falla y ya guardamos el archivo, borrarlo para no dejar basura.
        @unlink($absPath);
        throw $e;
    }

    // 7) Devolver el registro fresco
    $stmt = $db->prepare("SELECT * FROM facturas_recibidas WHERE id = ?");
    $stmt->execute([$facturaId]);
    $factura = $stmt->fetch();

    http_response_code(201);
    echo json_encode([
        'success'      => true,
        'ya_existia'   => false,
        'factura'      => $factura,
        'lineas_count' => count($lineas),
        'message'      => 'Factura recibida registrada. Envía el evento 030 dentro de 3 días hábiles.',
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        // 'trace' => $e->getTraceAsString(), // descomentar en dev si algo raro pasa
    ]);
}
