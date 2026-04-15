<?php
/**
 * Facturación Electrónica - Puente con API DIAN
 *
 * POST action=login          → obtener token
 * POST action=factura        → enviar factura electrónica
 * POST action=nota_credito   → enviar nota crédito
 * POST action=nota_debito    → enviar nota débito
 * POST action=consultar      → consultar estado por CUFE/ZipKey
 * GET  ?resoluciones=1       → ver resoluciones activas
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$API_BASE = 'https://api-electronica.innovacion-digital.com/public';

// Helper: hacer request a la API
function apiRequest($url, $method, $data = null, $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $headers = ['Content-Type: application/json'];
    if ($token) $headers[] = "Authorization: Bearer $token";
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) return ['success' => false, 'message' => "Error de conexión: $error"];

    $decoded = json_decode($response, true);
    return $decoded ?: ['success' => false, 'message' => "Respuesta inválida (HTTP $httpCode)", 'raw' => substr($response, 0, 500)];
}

// Get FE credentials from empresa
function getCredentials($db) {
    $stmt = $db->query("SELECT email_factelect, password_factelect FROM tbldatosempresa LIMIT 1");
    $emp = $stmt->fetch();
    return [$emp['email_factelect'], $emp['password_factelect']];
}

// Login and get token
function loginFE($db, $apiBase) {
    [$email, $pass] = getCredentials($db);
    if (!$email || !$pass) return ['success' => false, 'message' => 'Configure email y contraseña de FE en Datos de Empresa'];

    $result = apiRequest("$apiBase/login", 'POST', ['email' => $email, 'password' => $pass]);
    if (isset($result['token'])) {
        return [
            'success' => true,
            'token' => $result['token'],
            'company_id' => $result['id_empresa'] ?? 1,
            'resolucion' => $result['resolucion'] ?? null,
            'usuario' => $result['usuario'] ?? null
        ];
    }
    return ['success' => false, 'message' => $result['message'] ?? 'Error al autenticar con API FE'];
}

// Build invoice JSON from factura data
function buildInvoiceJSON($db, $factura, $items, $companyId) {
    // Get client fiscal data
    $stmt = $db->prepare("
        SELECT c.*,
            COALESCE(tl.code, 'R-99-PN') as liability_code, COALESCE(tl.id, 4) as liability_id,
            COALESCE(to2.code, '2') as org_code, COALESCE(to2.id, 2) as org_id,
            COALESCE(tr.code, '49') as regime_code, COALESCE(tr.id, 2) as regime_id,
            COALESCE(m.code, '23555') as mun_code, COALESCE(m.name, 'Planeta Rica') as mun_name,
            COALESCE(m.id, 444) as mun_id,
            COALESCE(dept.code, '23') as dept_code, COALESCE(dept.name, 'Córdoba') as dept_name,
            COALESCE(td.code, '13') as doc_code, COALESCE(td.id, 2) as doc_id
        FROM tblclientes c
        LEFT JOIN type_liabilities tl ON c.id_type_liability = tl.id
        LEFT JOIN type_organizations to2 ON c.id_type_organization = to2.id
        LEFT JOIN type_regimes tr ON c.id_type_regime = tr.id
        LEFT JOIN municipalities m ON c.id_municipio = m.id
        LEFT JOIN departments dept ON m.department_id = dept.id
        LEFT JOIN tipos_documentos td ON c.id_documento = td.id
        WHERE c.CodigoClien = ?
    ");
    $stmt->execute([$factura['CodigoCli']]);
    $cliente = $stmt->fetch();

    // Calculate DV
    $nit = $cliente['Nit'] ?? $factura['Identificacion'] ?? '0';
    $dv = calculateDV($nit);

    // Build customer
    $customer = [
        'identification_number' => $nit,
        'dv' => $dv,
        'name' => $factura['A_nombre'],
        'phone' => $factura['Telefono'] ?: '0',
        'address' => $cliente['Direccion'] ?? $factura['Direccion'] ?? '-',
        'email' => $cliente['Email'] ?? '',
        'merchant_registration' => '0000000-00',
        'type_document_identification' => [
            'id' => strval($cliente['doc_id'] ?? 2),
            'code' => $cliente['doc_code'] ?? '13'
        ],
        'type_organization' => [
            'id' => strval($cliente['org_id'] ?? 2),
            'code' => $cliente['org_code'] ?? '2'
        ],
        'type_liability' => [
            'id' => strval($cliente['liability_id'] ?? 4),
            'code' => $cliente['liability_code'] ?? 'R-99-PN'
        ],
        'tax' => ['id' => '01', 'code' => '01', 'name' => 'IVA'],
        'municipality' => [
            'id' => strval($cliente['mun_id'] ?? 444),
            'code' => $cliente['mun_code'] ?? '23555',
            'name' => $cliente['mun_name'] ?? 'Planeta Rica',
            'department' => [
                'code' => $cliente['dept_code'] ?? '23',
                'name' => $cliente['dept_name'] ?? 'Córdoba'
            ]
        ],
        'country' => ['code' => 'CO', 'name' => 'Colombia'],
        'language' => ['code' => 'es']
    ];

    // Build invoice lines
    $invoiceLines = [];
    $totalBase = 0;
    $totalIva = 0;

    foreach ($items as $item) {
        $cant = floatval($item['Cantidad']);
        $precio = floatval($item['PrecioV']);
        $iva = floatval($item['IVA'] ?? 0);
        $desc = floatval($item['Descuento'] ?? 0);
        $lineAmount = ($cant * $precio) - $desc;

        // If IVA included, separate base from tax
        $ivaAmount = $iva > 0 ? round($lineAmount * ($iva / (100 + $iva)), 2) : 0;
        $baseAmount = $lineAmount - $ivaAmount;

        $totalBase += $baseAmount;
        $totalIva += $ivaAmount;

        $unitMeasure = intval($item['unit_measure_id'] ?? 70); // 70 = Unidad

        $invoiceLines[] = [
            'unit_measure_id' => $unitMeasure,
            'invoiced_quantity' => number_format($cant, 2, '.', ''),
            'line_extension_amount' => number_format($baseAmount, 2, '.', ''),
            'free_of_charge_indicator' => false,
            'allowance_charges' => $desc > 0 ? [['charge_indicator' => false, 'allowance_charge_reason' => 'Descuento', 'amount' => number_format($desc, 2, '.', ''), 'base_amount' => number_format($cant * $precio, 2, '.', '')]] : [],
            'tax_totals' => [[
                'tax_id' => 1,
                'tax_amount' => number_format($ivaAmount / max($cant, 1) * $cant, 2, '.', ''),
                'taxable_amount' => number_format($baseAmount, 2, '.', ''),
                'percent' => number_format($iva, 2, '.', '')
            ]],
            'description' => $item['Nombres_Articulo'] ?? $item['DescripcionTemp'] ?? 'Producto',
            'code' => $item['Codigo'] ?? strval($item['Items']),
            'type_item_identification_id' => 3,
            'price_amount' => number_format($precio, 2, '.', ''),
            'base_quantity' => number_format($cant, 2, '.', '')
        ];
    }

    $totalInclusive = $totalBase + $totalIva;
    $descGlobal = floatval($factura['Descuento'] ?? 0);

    // Payment form: 1=Contado, 2=Crédito
    $paymentFormId = $factura['Tipo'] === 'Contado' ? 1 : 2;
    $paymentMethodId = 10; // Efectivo por defecto
    $medioPago = intval($factura['id_mediopago'] ?? 0);
    if ($medioPago === 1) $paymentMethodId = 14; // Tarjeta
    elseif ($medioPago >= 2) $paymentMethodId = 30; // Transferencia

    return [
        'company_id' => $companyId,
        'note' => $factura['Comentario'] ?? '',
        'customer' => $customer,
        'legal_monetary_totals' => [
            'line_extension_amount' => number_format($totalBase, 2, '.', ''),
            'tax_exclusive_amount' => number_format($totalBase, 2, '.', ''),
            'tax_inclusive_amount' => number_format($totalInclusive, 2, '.', ''),
            'allowance_total_amount' => number_format($descGlobal, 2, '.', ''),
            'charge_total_amount' => '0.00',
            'payable_amount' => number_format($totalInclusive - $descGlobal, 2, '.', '')
        ],
        'invoice_lines' => $invoiceLines,
        'payment_form' => [
            'payment_form_id' => $paymentFormId,
            'payment_method_id' => $paymentMethodId
        ],
        'date' => date('Y-m-d', strtotime($factura['Fecha'])),
        'time' => date('H:i:s', strtotime($factura['Fecha']))
    ];
}

// Calculate DV (dígito de verificación)
function calculateDV($nit) {
    $nit = preg_replace('/[^0-9]/', '', $nit);
    if (!$nit || $nit === '0') return '0';
    $primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    $sum = 0;
    $nitArr = str_split(strrev($nit));
    for ($i = 0; $i < count($nitArr) && $i < count($primes); $i++) {
        $sum += intval($nitArr[$i]) * $primes[$i];
    }
    $mod = $sum % 11;
    return $mod >= 2 ? strval(11 - $mod) : strval($mod);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get resoluciones
        if (isset($_GET['resoluciones'])) {
            $login = loginFE($db, $API_BASE);
            if (!$login['success']) { echo json_encode($login); exit; }

            $result = apiRequest("$API_BASE/api/resoluciones/company/{$login['company_id']}", 'GET', null, $login['token']);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // POST actions
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    // Step 1: Login
    $login = loginFE($db, $API_BASE);
    if (!$login['success']) { echo json_encode($login); exit; }
    $token = $login['token'];
    $companyId = $login['company_id'];

    switch ($action) {
        case 'login':
            echo json_encode($login, JSON_UNESCAPED_UNICODE);
            break;

        case 'factura':
            $factN = intval($data['factura_n'] ?? 0);
            if (!$factN) { echo json_encode(['success' => false, 'message' => 'Factura requerida']); exit; }

            // Get factura data
            $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $factura = $stmt->fetch();
            if (!$factura) { echo json_encode(['success' => false, 'message' => 'Factura no encontrada']); exit; }

            // Get items
            $stmt = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.unit_measure_id
                FROM tbldetalle_venta d
                LEFT JOIN tblarticulos a ON d.Items = a.Items
                WHERE d.Factura_N = ?
            ");
            $stmt->execute([$factN]);
            $items = $stmt->fetchAll();

            // Build JSON
            $invoiceJSON = buildInvoiceJSON($db, $factura, $items, $companyId);

            // Add email sending if requested
            $sendEmail = $data['send_email'] ?? false;
            if ($sendEmail) {
                // Get customer email
                $stmtEmail = $db->prepare("SELECT Email FROM tblclientes WHERE CodigoClien = ?");
                $stmtEmail->execute([$factura['CodigoCli']]);
                $clienteData = $stmtEmail->fetch();
                $customerEmail = $clienteData['Email'] ?? '';

                if ($customerEmail && strpos($customerEmail, '@') !== false) {
                    $invoiceJSON['send_email'] = 'S';
                    $invoiceJSON['customer_email'] = $customerEmail;
                    $invoiceJSON['customer']['email'] = $customerEmail;
                }
            }

            // PASO 1: Guardar en local con status "pendiente" ANTES de enviar a DIAN
            $notaFactura = $factura['Comentario'] ?? '-';
            $stmtDoc = $db->prepare("
                INSERT INTO electronic_documents
                (fecha, cod_cliente, customer_identification, type_document_id, prefix, number, status, total, cufe, dian_response, id_usuario, id_mediopago, efectivo, valorpagado1, pagada, EstadoFact, email_sent, nota)
                VALUES (?, ?, ?, 1, 'FCON', 0, 'pendiente', ?, '', '{}', ?, ?, ?, ?, ?, 1, 0, ?)
            ");
            $stmtDoc->execute([
                $factura['Fecha'], $factura['CodigoCli'], $factura['Identificacion'],
                $factura['Total'], $factura['Id_Usuario'],
                $factura['id_mediopago'], $factura['efectivo'], $factura['valorpagado1'],
                $factura['pagada'] ?: 'N', $notaFactura
            ]);
            $docElecId = $db->lastInsertId();

            // Guardar detalle en local
            $stmtDet = $db->prepare("
                INSERT INTO detalle_document_electronic
                (factura_n, items, unit_measure_id, invoiced_quantity, line_extension_amount,
                 free_of_charge_indicator, description, type_item_identification_id,
                 price_amount, discount_amount, base_quantity,
                 tax_id, tax_amount, taxable_amount, tax_percent)
                VALUES (?, ?, ?, ?, ?, 0, ?, 3, ?, ?, ?, 1, ?, ?, ?)
            ");
            foreach ($items as $item) {
                $cant = floatval($item['Cantidad']);
                $precioV = floatval($item['PrecioV']);
                $iva = floatval($item['IVA'] ?? 0);
                $desc = floatval($item['Descuento'] ?? 0);
                $lineAmount = ($cant * $precioV) - $desc;
                $ivaAmount = $iva > 0 ? round($lineAmount * ($iva / (100 + $iva)), 2) : 0;
                $baseAmount = $lineAmount - $ivaAmount;
                $unitMeasure = intval($item['unit_measure_id'] ?? 70);
                $stmtDet->execute([
                    $docElecId, $item['Items'], $unitMeasure,
                    number_format($cant, 2, '.', ''), number_format($baseAmount, 2, '.', ''),
                    $item['Nombres_Articulo'] ?? 'Producto',
                    number_format($precioV, 2, '.', ''), number_format($desc, 2, '.', ''),
                    number_format($cant, 2, '.', ''), number_format($ivaAmount, 2, '.', ''),
                    number_format($baseAmount, 2, '.', ''), number_format($iva, 2, '.', '')
                ]);
            }

            // PASO 2: Enviar a DIAN
            $result = apiRequest("$API_BASE/api/factura/send-v2", 'POST', $invoiceJSON, $token);

            // PASO 3: Actualizar según respuesta
            if (isset($result['success']) && $result['success']) {
                $cufe = $result['cufe'] ?? '';
                $consecutive = $result['consecutive'] ?? 0;

                // Actualizar tblventas
                $db->prepare("UPDATE tblventas SET enviada_dian = 1, fecha_envio_dian = NOW(), cufe = ? WHERE Factura_N = ?")
                   ->execute([$cufe, $factN]);

                // Actualizar electronic_documents con CUFE y status autorizado
                $emailResult = $result['email_result'] ?? null;
                $emailSent = ($emailResult && isset($emailResult['success']) && $emailResult['success']) ? 1 : 0;

                $db->prepare("UPDATE electronic_documents SET status = 'autorizado', number = ?, cufe = ?, dian_response = ?, email_sent = ?, email_sent_at = ? WHERE id = ?")
                   ->execute([$consecutive, $cufe, json_encode($result), $emailSent, $emailSent ? date('Y-m-d H:i:s') : null, $docElecId]);
            } else {
                // Falló: actualizar status a rechazado con el mensaje de error
                $db->prepare("UPDATE electronic_documents SET status = 'rechazado', dian_response = ? WHERE id = ?")
                   ->execute([json_encode($result), $docElecId]);
            }

            echo json_encode([
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'Error desconocido',
                'cufe' => $result['cufe'] ?? null,
                'consecutive' => $result['consecutive'] ?? null,
                'qr_code' => $result['qr_code'] ?? null,
                'email_result' => $result['email_result'] ?? null,
                'doc_local_id' => $docElecId,
                'respuesta_dian' => $result
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'nota_credito':
            $factN = intval($data['factura_n'] ?? 0);
            $motivo = $data['motivo'] ?? 'Devolución parcial de mercancía';
            $items = $data['items'] ?? []; // [{items, cantidad, precio}]

            if (!$factN) { echo json_encode(['success' => false, 'message' => 'Factura original requerida']); exit; }

            // Get original invoice CUFE
            $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $factura = $stmt->fetch();
            if (!$factura || !$factura['cufe']) {
                echo json_encode(['success' => false, 'message' => 'La factura no tiene CUFE. Debe enviarse primero a la DIAN.']);
                exit;
            }

            // Build nota credito JSON (similar to invoice but with billing_reference)
            $ncJSON = buildInvoiceJSON($db, $factura, $items, $companyId);
            $ncJSON['billing_reference'] = [
                'number' => $factura['Factura_N'],
                'uuid' => $factura['cufe'],
                'issue_date' => date('Y-m-d', strtotime($factura['Fecha']))
            ];
            $ncJSON['discrepancy_response'] = [
                'correction_concept_id' => 2, // Devolución parcial
                'description' => $motivo
            ];

            $result = apiRequest("$API_BASE/api/notas/credito/enviar", 'POST', $ncJSON, $token);

            echo json_encode([
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'Error',
                'cufe' => $result['cufe'] ?? null,
                'consecutive' => $result['consecutive'] ?? null,
                'respuesta_dian' => $result
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'nota_debito':
            $factN = intval($data['factura_n'] ?? 0);
            $motivo = $data['motivo'] ?? 'Cobro de intereses';
            $valor = floatval($data['valor'] ?? 0);
            $descripcion = $data['descripcion'] ?? 'Ajuste';

            if (!$factN || !$valor) { echo json_encode(['success' => false, 'message' => 'Factura y valor requeridos']); exit; }

            $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $factura = $stmt->fetch();
            if (!$factura || !$factura['cufe']) {
                echo json_encode(['success' => false, 'message' => 'La factura no tiene CUFE']);
                exit;
            }

            $ndJSON = [
                'company_id' => $companyId,
                'billing_reference' => [
                    'number' => $factura['Factura_N'],
                    'uuid' => $factura['cufe'],
                    'issue_date' => date('Y-m-d', strtotime($factura['Fecha']))
                ],
                'discrepancy_response' => [
                    'correction_concept_id' => 1,
                    'description' => $motivo
                ],
                'invoice_lines' => [[
                    'unit_measure_id' => 70,
                    'invoiced_quantity' => '1.00',
                    'line_extension_amount' => number_format($valor, 2, '.', ''),
                    'free_of_charge_indicator' => false,
                    'tax_totals' => [['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => number_format($valor, 2, '.', ''), 'percent' => '0.00']],
                    'description' => $descripcion,
                    'code' => '1',
                    'type_item_identification_id' => 3,
                    'price_amount' => number_format($valor, 2, '.', ''),
                    'base_quantity' => '1.00'
                ]],
                'legal_monetary_totals' => [
                    'line_extension_amount' => number_format($valor, 2, '.', ''),
                    'tax_exclusive_amount' => number_format($valor, 2, '.', ''),
                    'tax_inclusive_amount' => number_format($valor, 2, '.', ''),
                    'payable_amount' => number_format($valor, 2, '.', '')
                ],
                'date' => date('Y-m-d'),
                'time' => date('H:i:s')
            ];

            // Build customer from original invoice
            $ncCustomer = buildInvoiceJSON($db, $factura, [], $companyId);
            $ndJSON['customer'] = $ncCustomer['customer'];

            $result = apiRequest("$API_BASE/api/notas/debito/enviar", 'POST', $ndJSON, $token);

            echo json_encode([
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'Error',
                'cufe' => $result['cufe'] ?? null,
                'respuesta_dian' => $result
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'consultar':
            $zipKey = $data['zip_key'] ?? '';
            if (!$zipKey) { echo json_encode(['success' => false, 'message' => 'ZipKey requerido']); exit; }

            $result = apiRequest("$API_BASE/api/status/zip/$zipKey", 'POST', ['company_id' => $companyId], $token);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            break;

        case 'preview':
            // Solo genera el JSON sin enviar (para verificar antes)
            $factN = intval($data['factura_n'] ?? 0);
            if (!$factN) { echo json_encode(['success' => false, 'message' => 'Factura requerida']); exit; }

            $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
            $stmt->execute([$factN]);
            $factura = $stmt->fetch();

            $stmt = $db->prepare("SELECT d.*, a.Codigo, a.Nombres_Articulo, a.unit_measure_id FROM tbldetalle_venta d LEFT JOIN tblarticulos a ON d.Items = a.Items WHERE d.Factura_N = ?");
            $stmt->execute([$factN]);
            $items = $stmt->fetchAll();

            $json = buildInvoiceJSON($db, $factura, $items, $companyId);
            echo json_encode(['success' => true, 'preview' => $json], JSON_UNESCAPED_UNICODE);
            break;

        default:
            echo json_encode(['success' => false, 'message' => "Acción no válida: $action"]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
