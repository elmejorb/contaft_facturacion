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
/**
 * Valida que la factura tenga lo mínimo que DIAN exige antes de enviarla,
 * para evitar rechazos costosos (rate limits, ruido en logs, gasto de
 * consecutivos). Devuelve array de errores; vacío = ok.
 *
 * Reglas referenciadas:
 *   FAN04 — Venta a crédito sin fecha en que se comprometió el pago.
 *   AAF14 — Identificación del adquiriente inválida.
 *   Schema XML — fechas/strings vacíos rompen el cvc-datatype-valid.
 */
function validateInvoiceForDIAN(array $factura, array $items): array {
    $errores = [];

    if (empty($factura['Identificacion']) || $factura['Identificacion'] === '0') {
        $errores[] = 'El cliente no tiene NIT/Cédula registrado. La FE exige identificación del adquiriente (regla AAF14).';
    }
    if (empty($factura['A_nombre'])) {
        $errores[] = 'El cliente no tiene Razón Social/Nombre registrado.';
    }
    if (empty($factura['Fecha'])) {
        $errores[] = 'La factura no tiene fecha de emisión.';
    }
    if (count($items) === 0) {
        $errores[] = 'La factura no tiene líneas de detalle.';
    }
    if (($factura['Tipo'] ?? '') !== 'Contado') {
        // Crédito requiere Dias > 0 para calcular payment_due_date (FAN04).
        $dias = intval($factura['Dias'] ?? 0);
        if ($dias <= 0) {
            $errores[] = 'Venta a crédito sin "Días" de plazo. DIAN rechaza con regla FAN04 si no hay fecha en que se comprometió el pago.';
        }
        // El abono inicial no puede ser mayor al total (rompe el balance).
        $abono = floatval($factura['Abono'] ?? 0) + floatval($factura['efectivo'] ?? 0) + floatval($factura['valorpagado1'] ?? 0);
        $total = floatval($factura['Total'] ?? 0);
        if ($abono > $total + 0.01) {
            $errores[] = "El abono inicial (\$$abono) supera el total de la factura (\$$total).";
        }
    }

    return $errores;
}

function buildInvoiceJSON($db, $factura, $items, $companyId, $customerEmailOverride = '') {
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

    // Email del comprador — prioridad: (1) override que viene en el body del
    // POST (comprador ocasional traído de DIAN, no está en tblclientes),
    // (2) email del cliente en tblclientes, (3) vacío.
    // El email es info específica de la FE y NO se guarda en tblventas — el
    // frontend lo pasa cada vez que llama al endpoint (o queda en
    // electronic_documents.customer_email para reintentos).
    $customerEmail = trim($customerEmailOverride) ?: ($cliente['Email'] ?? '');

    // Build customer
    $customer = [
        'identification_number' => $nit,
        'dv' => $dv,
        'name' => $factura['A_nombre'],
        'phone' => $factura['Telefono'] ?: '0',
        'address' => $cliente['Direccion'] ?? $factura['Direccion'] ?? '-',
        'email' => $customerEmail,
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

    // Régimen de la empresa: si NO es responsable de IVA (Simplificado / No
    // Responsable), forzamos IVA=0 en todas las líneas sin importar el campo
    // Iva del catálogo de productos. DIAN rechaza facturas con IVA cobrado
    // por una empresa no responsable.
    $empInfo = $db->query("SELECT Regimen FROM tbldatosempresa LIMIT 1")->fetch();
    $regimenLower = strtolower(trim($empInfo['Regimen'] ?? 'común'));
    $noResponsableIva = (
        strpos($regimenLower, 'simpl')        !== false ||
        strpos($regimenLower, 'no responsab') !== false ||
        strpos($regimenLower, 'no resp')      !== false ||
        $regimenLower === 'no'
    );

    foreach ($items as $item) {
        $cant = floatval($item['Cantidad']);
        $precio = floatval($item['PrecioV']);
        $iva = $noResponsableIva ? 0 : floatval($item['IVA'] ?? 0);
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
                // $ivaAmount ya incluye la cantidad (se calculó sobre lineAmount = cant*precio),
                // así que es el tax_amount total de la línea. NO multiplicar por $cant otra vez.
                // El bug anterior dividía el IVA por 2 cuando cant<1 (max($cant,1)/$cant).
                'tax_amount' => number_format($ivaAmount, 2, '.', ''),
                'taxable_amount' => number_format($baseAmount, 2, '.', ''),
                'percent' => number_format($iva, 2, '.', '')
            ]],
            // Priorizar DescripcionTemp (concepto editado en venta para servicios)
            // sobre Nombres_Articulo (nombre fijo del catálogo).
            'description' => (!empty($item['DescripcionTemp']) ? $item['DescripcionTemp']
                              : ($item['Nombres_Articulo'] ?? 'Producto')),
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

    // Para ventas a CRÉDITO, DIAN exige payment_due_date (regla FAN04) y
    // duration_measure. Sin estos el envío se rechaza con
    // "Venta a crédito sin información de fecha en la cual se comprometió el pago".
    $paymentDueDate = null;
    $durationDays = 0;
    if ($paymentFormId === 2) {
        $diasFact = intval($factura['Dias'] ?? 0);
        if ($diasFact <= 0) $diasFact = 1; // mínimo 1 día para que sea válido como crédito
        $durationDays = $diasFact;
        $paymentDueDate = date('Y-m-d', strtotime($factura['Fecha'] . " +{$diasFact} days"));
    }

    // Abono inicial al momento de emitir la factura — va en pre_paid_amount.
    // Sólo aplica a Crédito con abono > 0 (en Contado el pago está implícito).
    // Suma Abono + lo recibido en efectivo/transferencia al emitir.
    $prePaidAmount = 0.0;
    if ($paymentFormId === 2) {
        $prePaidAmount = floatval($factura['Abono'] ?? 0)
                       + floatval($factura['efectivo'] ?? 0)
                       + floatval($factura['valorpagado1'] ?? 0);
    }

    // === Retenciones aplicadas a esta factura (DIAN WithholdingTaxTotal) ===
    $withholdingTaxes = [];
    $factN = intval($factura['Factura_N'] ?? 0);
    if ($factN > 0) {
        $stmtRet = $db->prepare("
            SELECT vr.Porcentaje, vr.Base, vr.Valor, vr.Codigo AS codigo_interno,
                   COALESCE(r.Codigo_Dian, '06') AS codigo_dian,
                   COALESCE(r.Nombre, vr.Nombre) AS nombre
            FROM tblventa_retenciones vr
            LEFT JOIN tblretenciones r ON vr.Id_Retencion = r.Id_Retencion
            WHERE vr.Factura_N = ?
        ");
        $stmtRet->execute([$factN]);
        // Map código DIAN → tax_id real en la tabla `taxes` de la API Lumen remota.
        // Los IDs provienen del seeder (TaxesTableSeeder): 19=ReteIVA(05), 20=ReteFuente(06), 21=ReteICA(07).
        $dianToTaxId = ['05' => 19, '06' => 20, '07' => 21];
        while ($row = $stmtRet->fetch()) {
            $codDian = (string)$row['codigo_dian'];
            $taxId = $dianToTaxId[$codDian] ?? 20; // default ReteFuente
            $withholdingTaxes[] = [
                'tax_id'         => $taxId,
                'tax_amount'     => number_format((float)$row['Valor'], 2, '.', ''),
                'taxable_amount' => number_format((float)$row['Base'],  2, '.', ''),
                'percent'        => number_format((float)$row['Porcentaje'], 2, '.', ''),
                'tax_name'       => $row['nombre'],
            ];
        }
    }

    $result = [
        'company_id' => $companyId,
        'note' => $factura['Comentario'] ?? '',
        'customer' => $customer,
        'legal_monetary_totals' => array_filter([
            'line_extension_amount' => number_format($totalBase, 2, '.', ''),
            'tax_exclusive_amount' => number_format($totalBase, 2, '.', ''),
            'tax_inclusive_amount' => number_format($totalInclusive, 2, '.', ''),
            'allowance_total_amount' => number_format($descGlobal, 2, '.', ''),
            'charge_total_amount' => '0.00',
            'pre_paid_amount' => $prePaidAmount > 0 ? number_format($prePaidAmount, 2, '.', '') : null,
            'payable_amount' => number_format($totalInclusive - $descGlobal, 2, '.', ''),
        ], fn($v) => $v !== null),
        'invoice_lines' => $invoiceLines,
        'payment_form' => array_filter([
            'payment_form_id' => $paymentFormId,
            'payment_method_id' => $paymentMethodId,
            'payment_due_date' => $paymentDueDate,
            'duration_measure' => $durationDays > 0 ? $durationDays : null,
        ], fn($v) => $v !== null),
        'date' => date('Y-m-d', strtotime($factura['Fecha'])),
        'time' => date('H:i:s', strtotime($factura['Fecha']))
    ];

    if (!empty($withholdingTaxes)) {
        $result['withholding_taxes'] = $withholdingTaxes;
    }

    return $result;
}

// Total correcto a partir de las líneas, respetando el régimen y descuento
// global. Se usa para guardar `electronic_documents.total` en lugar de leer
// `tblventas.Total` directamente: en versiones <4.3.61 ese campo quedaba
// inflado cuando IvaIncluido=1 (se sumaba IVA encima del precio que ya lo
// tenía dentro) y eso hacía que el PDF mostrara, p.ej., $979.530 cuando el
// total real DIAN era $887.000.
function calcularTotalDocFE($db, $factura, $items) {
    $empInfo = $db->query("SELECT Regimen FROM tbldatosempresa LIMIT 1")->fetch();
    $regimenLower = strtolower(trim($empInfo['Regimen'] ?? 'común'));
    $noResponsableIva = (
        strpos($regimenLower, 'simpl')        !== false ||
        strpos($regimenLower, 'no responsab') !== false ||
        strpos($regimenLower, 'no resp')      !== false ||
        $regimenLower === 'no'
    );

    $totalBase = 0;
    $totalIva = 0;
    foreach ($items as $item) {
        $cant = floatval($item['Cantidad']);
        $precio = floatval($item['PrecioV']);
        $iva = $noResponsableIva ? 0 : floatval($item['IVA'] ?? 0);
        $desc = floatval($item['Descuento'] ?? 0);
        $lineAmount = ($cant * $precio) - $desc;
        $ivaAmount = $iva > 0 ? round($lineAmount * ($iva / (100 + $iva)), 2) : 0;
        $baseAmount = $lineAmount - $ivaAmount;
        $totalBase += $baseAmount;
        $totalIva += $ivaAmount;
    }
    $descGlobal = floatval($factura['Descuento'] ?? 0);
    return round($totalBase + $totalIva - $descGlobal, 2);
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

        // Email status (Brevo tracking) — batched por mes/año con caché 5 min
        if (isset($_GET['email_status'])) {
            $anio = intval($_GET['anio'] ?? date('Y'));
            $mes  = intval($_GET['mes'] ?? 0);

            $cacheDir = __DIR__ . '/cache';
            if (!is_dir($cacheDir)) @mkdir($cacheDir, 0777, true);
            $cacheFile = "$cacheDir/emailstatus_{$anio}_{$mes}.json";
            $nocache = isset($_GET['nocache']);
            if (!$nocache && file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
                header('Content-Type: application/json; charset=utf-8');
                readfile($cacheFile);
                exit;
            }

            $login = loginFE($db, $API_BASE);
            if (!$login['success']) { echo json_encode($login); exit; }

            $map = [];
            $page = 1;
            $maxPages = 50;
            do {
                $qs = "page=$page";
                if ($mes > 0) $qs .= "&mes=$mes&anio=$anio";
                else $qs .= "&anio=$anio";
                $r = apiRequest("$API_BASE/api/empresas/{$login['company_id']}/documentos-electronicos?$qs", 'GET', null, $login['token']);
                $docs = $r['data'] ?? [];
                foreach ($docs as $doc) {
                    $cufe = $doc['cufe'] ?? '';
                    if (!$cufe) continue;
                    $map[$cufe] = [
                        'email_sent'      => $doc['email_sent'] ?? null,
                        'email_status'    => $doc['email_status'] ?? null,
                        'email_recipient' => $doc['email_recipient'] ?? null,
                    ];
                }
                $lastPage = intval($r['last_page'] ?? 1);
                $page++;
            } while ($page <= $lastPage && $page <= $maxPages);

            $out = json_encode(['success' => true, 'data' => $map, 'cached_at' => date('c')], JSON_UNESCAPED_UNICODE);
            @file_put_contents($cacheFile, $out);
            header('Content-Type: application/json; charset=utf-8');
            echo $out;
            exit;
        }
    }

    // POST actions
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    // --- Acciones OFFLINE (no requieren login DIAN) ---
    if ($action === 'marcar_contingencia') {
        $factN = intval($data['factura_n'] ?? 0);
        $motivo = trim($data['motivo'] ?? 'Sin conexión con la DIAN');
        if (!$factN) { echo json_encode(['success' => false, 'message' => 'Factura requerida']); exit; }
        $db->prepare("UPDATE tblventas SET en_contingencia = 1, contingencia_fecha = NOW(), contingencia_motivo = ?, contingencia_reenviada = 0 WHERE Factura_N = ?")
           ->execute([$motivo, $factN]);
        echo json_encode(['success' => true, 'message' => "Factura #$factN marcada como contingencia. Se reenviará a la DIAN cuando haya conexión."], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'listar_contingencias') {
        $stmt = $db->query("
            SELECT v.Factura_N, v.Fecha, v.contingencia_fecha, v.contingencia_motivo,
                   v.CodigoCli, v.A_nombre, v.Total, v.Identificacion,
                   DATEDIFF(NOW(), v.contingencia_fecha) AS dias_espera
            FROM tblventas v
            WHERE v.en_contingencia = 1 AND v.contingencia_reenviada = 0 AND v.EstadoFact = 'Valida'
            ORDER BY v.contingencia_fecha ASC
        ");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'contingencias' => $rows, 'total' => count($rows)], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // MODO PRUEBA: enviar al endpoint preview-xml (no autenticado, no consume consecutivo, no firma, no DIAN)
    if ($action === 'factura_preview') {
        $factN = intval($data['factura_n'] ?? 0);
        if (!$factN) { echo json_encode(['success' => false, 'message' => 'Factura requerida']); exit; }

        $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ?");
        $stmt->execute([$factN]);
        $factura = $stmt->fetch();
        if (!$factura) { echo json_encode(['success' => false, 'message' => 'Factura no encontrada']); exit; }

        $stmt = $db->prepare("
            SELECT d.*, a.Codigo, a.Nombres_Articulo, a.unit_measure_id, d.DescripcionTemp
            FROM tbldetalle_venta d
            LEFT JOIN tblarticulos a ON d.Items = a.Items
            WHERE d.Factura_N = ?
        ");
        $stmt->execute([$factN]);
        $items = $stmt->fetchAll();

        // Para preview no necesitamos company_id real — usar 1 si no hay token
        $invoiceJSON = buildInvoiceJSON($db, $factura, $items, 1);

        // Log request
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) @mkdir($logDir, 0777, true);
        $ts = date('Ymd_His');
        $logBase = "$logDir/preview_{$factN}_{$ts}";
        @file_put_contents("{$logBase}_request.json", json_encode($invoiceJSON, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        // Llamar al preview-xml SIN token (es público)
        $ch = curl_init("$API_BASE/api/factura/preview-xml");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($invoiceJSON),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/xml'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 60,
        ]);
        $rawXml = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $err = curl_error($ch);
        curl_close($ch);

        @file_put_contents("{$logBase}_response.xml", $rawXml);

        if ($httpCode !== 200) {
            echo json_encode([
                'success' => false,
                'message' => "preview-xml HTTP $httpCode: " . substr($rawXml, 0, 500),
                'http_code' => $httpCode,
                'content_type' => $contentType,
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => 'XML generado en modo prueba (sin enviar a DIAN)',
            'xml' => $rawXml,
            'json_enviado' => $invoiceJSON,
            'log_file' => basename($logBase),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Step 1: Login (todas las demás acciones requieren DIAN)
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

            // Validar campos críticos ANTES de gastar el envío a DIAN. Si falta
            // algo, abortamos con un mensaje útil para el usuario en vez de
            // dejar que DIAN responda con códigos de regla crípticos.
            $erroresValidacion = validateInvoiceForDIAN($factura, $items);
            if (!empty($erroresValidacion)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'La factura no cumple requisitos DIAN: ' . implode(' · ', $erroresValidacion),
                    'errores' => $erroresValidacion,
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Email del comprador — 3 fuentes en orden de prioridad:
            //   1) Body del POST (comprador ocasional recién traído de DIAN)
            //   2) electronic_documents.customer_email de un intento anterior
            //      (útil al reintentar desde módulo FE — el email quedó en el
            //      primer intento y no se debe perder aunque el frontend no lo
            //      mande otra vez)
            //   3) tblclientes.Email (cliente recurrente registrado)
            $customerEmailOverride = trim((string)($data['customer_email'] ?? ''));
            if ($customerEmailOverride === '') {
                $stmtPrev = $db->prepare("
                    SELECT customer_email FROM electronic_documents
                    WHERE customer_identification = ? AND customer_email IS NOT NULL AND customer_email <> ''
                    ORDER BY id DESC LIMIT 1
                ");
                $stmtPrev->execute([$factura['Identificacion']]);
                $customerEmailOverride = trim((string)($stmtPrev->fetchColumn() ?: ''));
            }

            // Build JSON (recibe el email override para inyectarlo en el customer)
            $invoiceJSON = buildInvoiceJSON($db, $factura, $items, $companyId, $customerEmailOverride);

            // Add email sending if requested
            $sendEmail = $data['send_email'] ?? false;
            if ($sendEmail) {
                // Prioridad: override del body (comprador ocasional), luego tblclientes
                $customerEmail = $customerEmailOverride;
                if (!$customerEmail) {
                    $stmtEmail = $db->prepare("SELECT Email FROM tblclientes WHERE CodigoClien = ?");
                    $stmtEmail->execute([$factura['CodigoCli']]);
                    $clienteData = $stmtEmail->fetch();
                    $customerEmail = $clienteData['Email'] ?? '';
                }
                // Sanitizar: quitar espacios/tabs/nbsp y quedarse con el primer email si hay varios separados
                $customerEmail = preg_replace('/[\s\x{00A0}]+/u', '', $customerEmail);
                $partesEmail = preg_split('/[;,]/', $customerEmail);
                $customerEmail = trim($partesEmail[0] ?? '');

                if ($customerEmail && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
                    $invoiceJSON['send_email'] = 'S';
                    $invoiceJSON['customer_email'] = $customerEmail;
                    $invoiceJSON['customer']['email'] = $customerEmail;
                }
            }

            // PASO 1: Guardar en local con status "pendiente" ANTES de enviar a DIAN.
            // OJO: la tabla tiene UNIQUE (prefix, number) — uq_prefix_number. Si un
            // envío anterior falló, su fila quedó en (FCON, 0, 'rechazado'); para que
            // siga visible en el listado FE (y el usuario pueda reintentarla o
            // editarla) la movemos a un number alto fuera del rango de consecutivos
            // DIAN (9000000000 + id local). NO la borramos: el usuario quiere ver
            // sus intentos fallidos en el módulo de FE y poder accionar sobre ellos.
            // 9_000_000_000 es seguro: DIAN no asigna consecutivos cerca de ese rango.
            $db->prepare("
                UPDATE electronic_documents
                SET number = 9000000000 + id
                WHERE prefix = 'FCON' AND number = 0 AND status IN ('pendiente', 'rechazado')
            ")->execute();

            $notaFactura = $factura['Comentario'] ?? '-';
            // Recalculamos el total desde las líneas (respeta IvaIncluido y
            // régimen) en lugar de leer tblventas.Total, que puede venir
            // inflado en BDs migradas desde versiones <4.3.61.
            $totalDocFE = calcularTotalDocFE($db, $factura, $items);
            // Metadata de pago que persiste en electronic_documents.
            // Bug histórico: estos 3 campos quedaban NULL, lo que impedía
            // saber si una factura era Contado/Crédito, con qué medio de
            // pago, ni cuántos días de plazo. Sin esto, no funciona la
            // consulta de eventos DIAN ni el listado tiene sentido.
            $paymentFormLocal   = ($factura['Tipo'] === 'Contado') ? 1 : 2;
            $paymentDueDaysLocal = ($paymentFormLocal === 2) ? intval($factura['Dias'] ?? 0) : 0;
            // payment_method_id mapea id_mediopago local → catálogo DIAN:
            // 0=Efectivo(10), 1=Tarjeta(14), 2+=Transferencia(30). Misma
            // regla que usa buildInvoiceJSON al armar el JSON para DIAN.
            $medioPagoLocal = intval($factura['id_mediopago'] ?? 0);
            $paymentMethodLocal = ($medioPagoLocal === 1) ? 14
                                  : (($medioPagoLocal >= 2) ? 30 : 10);
            $stmtDoc = $db->prepare("
                INSERT INTO electronic_documents
                (fecha, cod_cliente, customer_identification, customer_name, customer_email, type_document_id, prefix, number, status, total, cufe, dian_response, id_usuario, id_mediopago, efectivo, valorpagado1, pagada, EstadoFact, email_sent, nota, payment_form_id, payment_method_id, payment_due_days)
                VALUES (?, ?, ?, ?, ?, 1, 'FCON', 0, 'pendiente', ?, '', '{}', ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)
            ");
            $stmtDoc->execute([
                $factura['Fecha'], $factura['CodigoCli'], $factura['Identificacion'],
                // customer_name/email — guardan los datos del comprador AUNQUE sea
                // ocasional (CodigoCli=130500). Así la FE tiene registro completo
                // sin depender de tblclientes.
                $factura['A_nombre'], $customerEmailOverride ?: null,
                $totalDocFE, $factura['Id_Usuario'],
                $factura['id_mediopago'], $factura['efectivo'], $factura['valorpagado1'],
                $factura['pagada'] ?: 'N', $notaFactura,
                $paymentFormLocal, $paymentMethodLocal, $paymentDueDaysLocal
            ]);
            $docElecId = $db->lastInsertId();

            // Guardar detalle en local — incluye PrecioCosto histórico para que el cierre
            // de mes pueda calcular costo de mercancía vendida sin tener que aproximar.
            $stmtDet = $db->prepare("
                INSERT INTO detalle_document_electronic
                (factura_n, items, unit_measure_id, invoiced_quantity, line_extension_amount,
                 free_of_charge_indicator, description, type_item_identification_id,
                 price_amount, PrecioCosto, discount_amount, base_quantity,
                 tax_id, tax_amount, taxable_amount, tax_percent)
                VALUES (?, ?, ?, ?, ?, 0, ?, 3, ?, ?, ?, ?, 1, ?, ?, ?)
            ");
            // Pre-cargar costos de los items en una sola consulta
            $itemIds = array_column($items, 'Items');
            $costos = [];
            if (!empty($itemIds)) {
                $ph = implode(',', array_fill(0, count($itemIds), '?'));
                $stmtCost = $db->prepare("SELECT Items, Precio_Costo FROM tblarticulos WHERE Items IN ($ph)");
                $stmtCost->execute($itemIds);
                foreach ($stmtCost->fetchAll() as $r) $costos[$r['Items']] = floatval($r['Precio_Costo']);
            }
            // Guardar también respetando régimen (idéntico criterio que buildInvoiceJSON)
            $empInfoDet = $db->query("SELECT Regimen FROM tbldatosempresa LIMIT 1")->fetch();
            $regimenLowDet = strtolower(trim($empInfoDet['Regimen'] ?? 'común'));
            $noRespIvaDet = (
                strpos($regimenLowDet, 'simpl')        !== false ||
                strpos($regimenLowDet, 'no responsab') !== false ||
                strpos($regimenLowDet, 'no resp')      !== false ||
                $regimenLowDet === 'no'
            );
            foreach ($items as $item) {
                $cant = floatval($item['Cantidad']);
                $precioV = floatval($item['PrecioV']);
                $iva = $noRespIvaDet ? 0 : floatval($item['IVA'] ?? 0);
                $desc = floatval($item['Descuento'] ?? 0);
                $lineAmount = ($cant * $precioV) - $desc;
                $ivaAmount = $iva > 0 ? round($lineAmount * ($iva / (100 + $iva)), 2) : 0;
                $baseAmount = $lineAmount - $ivaAmount;
                $unitMeasure = intval($item['unit_measure_id'] ?? 70);
                // Costo: prioridad al PrecioC histórico (si la venta también está en tbldetalle_venta),
                // si no usa el actual de tblarticulos. NOTA: Precio_Costo en inventario YA viene con
                // IVA incluido si el producto lo tiene, no hace falta multiplicar.
                $precioCosto = isset($item['PrecioC']) && floatval($item['PrecioC']) > 0
                    ? floatval($item['PrecioC'])
                    : ($costos[$item['Items']] ?? 0);
                $stmtDet->execute([
                    $docElecId, $item['Items'], $unitMeasure,
                    number_format($cant, 2, '.', ''), number_format($baseAmount, 2, '.', ''),
                    // DescripcionTemp tiene prioridad: si el item fue facturado
                    // como servicio con concepto editado, se persiste ese texto
                    // en el detalle local de FE.
                    (!empty($item['DescripcionTemp']) ? $item['DescripcionTemp']
                        : ($item['Nombres_Articulo'] ?? 'Producto')),
                    number_format($precioV, 2, '.', ''),
                    number_format($precioCosto, 4, '.', ''),
                    number_format($desc, 2, '.', ''),
                    number_format($cant, 2, '.', ''), number_format($ivaAmount, 2, '.', ''),
                    number_format($baseAmount, 2, '.', ''), number_format($iva, 2, '.', '')
                ]);
            }

            // CAPTURA: guardar JSON enviado para análisis
            $logDir = __DIR__ . '/logs';
            if (!is_dir($logDir)) @mkdir($logDir, 0777, true);
            $ts = date('Ymd_His');
            $logBase = "$logDir/factura_{$factN}_{$ts}";
            @file_put_contents("{$logBase}_request.json", json_encode($invoiceJSON, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            // PASO 2: Enviar a DIAN
            $result = apiRequest("$API_BASE/api/factura/send-v2", 'POST', $invoiceJSON, $token);

            // CAPTURA: guardar respuesta DIAN
            @file_put_contents("{$logBase}_response.json", json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            // PASO 3: Actualizar según respuesta
            if (isset($result['success']) && $result['success']) {
                $cufe = $result['cufe'] ?? '';
                $consecutive = $result['consecutive'] ?? 0;

                // Actualizar tblventas
                $db->prepare("UPDATE tblventas SET enviada_dian = 1, fecha_envio_dian = NOW(), cufe = ? WHERE Factura_N = ?")
                   ->execute([$cufe, $factN]);

                // Si se solicitó envío de email, llamar al endpoint dedicado de la API remota
                // (send-v2 NO envía el correo aunque reciba send_email='S'; lo ignora).
                $emailResult = $result['email_result'] ?? null;
                if ($sendEmail && $cufe && !empty($invoiceJSON['customer_email'])) {
                    $emailPayload = [
                        'company_id' => $companyId,
                        'cufe' => $cufe,
                        'email' => $invoiceJSON['customer_email'],
                        'force_resend' => false,
                    ];
                    $emailResp = apiRequest("$API_BASE/api/email/send-complete", 'POST', $emailPayload, $token);
                    @file_put_contents("{$logBase}_email.json", json_encode($emailResp, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    if (isset($emailResp['success']) && $emailResp['success']) {
                        $emailResult = [
                            'success' => true,
                            'recipient' => $invoiceJSON['customer_email'],
                            'message' => $emailResp['message'] ?? 'Correo enviado',
                        ];
                    } else {
                        $emailResult = [
                            'success' => false,
                            'recipient' => $invoiceJSON['customer_email'],
                            'message' => $emailResp['message'] ?? 'No se pudo enviar el correo',
                        ];
                    }
                }

                $emailSent = ($emailResult && isset($emailResult['success']) && $emailResult['success']) ? 1 : 0;

                // Prefix asignado por DIAN (de la resolución registrada en la API).
                // Antes quedaba siempre 'FCON' (hardcoded en el INSERT inicial) y eso
                // hacía que el PDF mostrara "FCON1" aunque DIAN haya emitido "IE1".
                $prefixDian = $result['prefix'] ?? $result['respuesta_dian']['prefix'] ?? null;
                if ($prefixDian) {
                    $db->prepare("UPDATE electronic_documents SET status = 'autorizado', prefix = ?, number = ?, cufe = ?, dian_response = ?, email_sent = ?, email_sent_at = ? WHERE id = ?")
                       ->execute([$prefixDian, $consecutive, $cufe, json_encode($result), $emailSent, $emailSent ? date('Y-m-d H:i:s') : null, $docElecId]);
                } else {
                    $db->prepare("UPDATE electronic_documents SET status = 'autorizado', number = ?, cufe = ?, dian_response = ?, email_sent = ?, email_sent_at = ? WHERE id = ?")
                       ->execute([$consecutive, $cufe, json_encode($result), $emailSent, $emailSent ? date('Y-m-d H:i:s') : null, $docElecId]);
                }
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
                'email_result' => $emailResult ?? ($result['email_result'] ?? null),
                'doc_local_id' => $docElecId,
                'respuesta_dian' => $result
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'nota_credito':
            $factN = intval($data['factura_n'] ?? 0);
            $motivo = $data['motivo'] ?? 'Devolución parcial de mercancía';
            $conceptId = intval($data['concept_id'] ?? 2); // 1=dev parcial, 2=anulación, 3=rebaja, 4=ajuste precio, 5=otros
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

            // Para ANULACIÓN (concept 2): cargar automáticamente todos los ítems originales completos
            if ($conceptId === 2 || empty($items)) {
                $stmtDet = $db->prepare("
                    SELECT d.*, a.Codigo, a.Nombres_Articulo, a.unit_measure_id
                    FROM tbldetalle_venta d
                    LEFT JOIN tblarticulos a ON d.Items = a.Items
                    WHERE d.Factura_N = ?
                ");
                $stmtDet->execute([$factN]);
                $items = $stmtDet->fetchAll();
            }

            // Buscar electronic_documents original para obtener los datos exactos que espera la API
            $stmtEd = $db->prepare("SELECT * FROM electronic_documents WHERE cufe = ? ORDER BY id DESC LIMIT 1");
            $stmtEd->execute([$factura['cufe']]);
            $edRow = $stmtEd->fetch();
            if (!$edRow) {
                echo json_encode(['success' => false, 'message' => 'No se encontró el electronic_document original']);
                exit;
            }
            $origNumber  = $edRow['number'];                           // consecutivo DIAN (ej. 59)
            $origPrefix  = $edRow['prefix'] ?? 'FCON';
            $origId      = $edRow['id'];                                // id local de electronic_documents

            // Build NC JSON — estructura idéntica a la que envía VB6 (probada y funcional)
            $ncJSON = buildInvoiceJSON($db, $factura, $items, $companyId);
            // Limpieza: la NC no usa estos campos
            unset($ncJSON['note'], $ncJSON['withholding_taxes']);

            // Campos al nivel raíz (faltaban):
            $ncJSON = array_merge(
                ['number' => intval($origNumber), 'resolution_id' => 1],
                $ncJSON
            );

            // billing_reference con scheme_name
            $ncJSON['billing_reference'] = [
                'number'      => $origPrefix . $origNumber,
                'uuid'        => $factura['cufe'],
                'scheme_name' => 'CUFE-SHA384',
                'issue_date'  => date('Y-m-d', strtotime($factura['Fecha']))
            ];

            // Bloque credit_note (lo que la API realmente usa, no discrepancy_response)
            $reasons = [
                1 => 'Devolución parcial de los bienes y/o no aceptación parcial del servicio',
                2 => 'Anulación total de la factura por devolución completa',
                3 => 'Rebaja o descuento parcial o total',
                4 => 'Ajuste de precio',
                5 => 'Otros',
            ];
            $ncJSON['credit_note'] = [
                'number'                => intval($origId),
                'reason'                => $reasons[$conceptId] ?? $motivo,
                'correction_concept_id' => (string)$conceptId,
                'description'           => $motivo,
            ];

            // CAPTURA para diagnóstico
            $logDir = __DIR__ . '/logs';
            if (!is_dir($logDir)) @mkdir($logDir, 0777, true);
            $ts = date('Ymd_His');
            $logBase = "$logDir/nc_{$factN}_{$ts}";
            @file_put_contents("{$logBase}_request.json", json_encode($ncJSON, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $result = apiRequest("$API_BASE/api/notas/credito/enviar", 'POST', $ncJSON, $token);

            @file_put_contents("{$logBase}_response.json", json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            // La API Lumen a veces devuelve success=false aunque la DIAN aprobó.
            // Detectamos el éxito real por status_code='00' o por la presencia de CUFE.
            $ncCufe = $result['cufe'] ?? ($result['respuesta_dian']['cufe'] ?? '');
            $ncConsecutive = $result['consecutive'] ?? ($result['respuesta_dian']['consecutive'] ?? 0);
            $ncPrefix = $result['prefix'] ?? ($result['respuesta_dian']['prefix'] ?? 'NCRE');
            $statusCode = $result['status_code'] ?? ($result['respuesta_dian']['status_code'] ?? '');
            $aprobada = (!empty($ncCufe)) || $statusCode === '00';

            $ncDocId = null;
            if ($aprobada) {
                // 1) Guardar la NC en electronic_documents localmente
                // type_document_id=2 = "Nota crédito" en la tabla type_documents
                $stmtIns = $db->prepare("
                    INSERT INTO electronic_documents
                    (fecha, cod_cliente, customer_identification, type_document_id, prefix, number,
                     status, total, cufe, invoice_cufe, dian_response, id_usuario, id_mediopago,
                     efectivo, valorpagado1, pagada, EstadoFact, email_sent, nota)
                    VALUES (?, ?, ?, 2, ?, ?, 'autorizado', ?, ?, ?, ?, ?, ?, ?, ?, 'N', 1, 0, ?)
                ");
                $stmtIns->execute([
                    date('Y-m-d'),
                    $factura['CodigoCli'],
                    $factura['Identificacion'],
                    $ncPrefix,
                    intval($ncConsecutive),
                    $factura['Total'],
                    $ncCufe,
                    $factura['cufe'],          // invoice_cufe = referencia a la factura original
                    json_encode($result),
                    $factura['Id_Usuario'] ?? 0,
                    $factura['id_mediopago'] ?? 0,
                    $factura['efectivo'] ?? 0,
                    $factura['valorpagado1'] ?? 0,
                    "NC anulacion factura #" . $factN . ". Motivo: " . substr($motivo, 0, 200),
                ]);
                $ncDocId = $db->lastInsertId();

                // Copiar detalle de la FE original a la NC para que el PDF tenga líneas
                $db->prepare("
                    INSERT INTO detalle_document_electronic
                    (factura_n, items, unit_measure_id, invoiced_quantity, line_extension_amount,
                     free_of_charge_indicator, description, type_item_identification_id,
                     price_amount, PrecioCosto, discount_amount, base_quantity,
                     tax_id, tax_amount, taxable_amount, tax_percent)
                    SELECT ?, items, unit_measure_id, invoiced_quantity, line_extension_amount,
                           free_of_charge_indicator, description, type_item_identification_id,
                           price_amount, PrecioCosto, discount_amount, base_quantity,
                           tax_id, tax_amount, taxable_amount, tax_percent
                    FROM detalle_document_electronic
                    WHERE factura_n = (SELECT id FROM electronic_documents WHERE cufe = ? LIMIT 1)
                ")->execute([$ncDocId, $factura['cufe']]);

                // 2) Si es anulación, marcar la factura original
                if ($conceptId === 2) {
                    $db->prepare("UPDATE tblventas SET EstadoFact = 'Anulada' WHERE Factura_N = ?")
                       ->execute([$factN]);
                    $db->prepare("UPDATE electronic_documents SET status = 'anulado' WHERE cufe = ?")
                       ->execute([$factura['cufe']]);
                }
            }

            echo json_encode([
                'success'        => $aprobada,
                'message'        => $aprobada
                    ? "Nota Crédito {$ncPrefix}{$ncConsecutive} aprobada por la DIAN"
                    : ($result['message'] ?? 'Error al enviar NC'),
                'cufe'           => $ncCufe,
                'consecutive'    => $ncConsecutive,
                'prefix'         => $ncPrefix,
                'doc_local_id'   => $ncDocId,
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

        case 'reenviar_contingencia':
            // Reenvía UNA factura que está marcada como contingencia.
            // Reutiliza el mismo flujo que 'factura'. Al éxito: marca contingencia_reenviada=1.
            $factN = intval($data['factura_n'] ?? 0);
            if (!$factN) { echo json_encode(['success' => false, 'message' => 'Factura requerida']); exit; }

            $stmt = $db->prepare("SELECT * FROM tblventas WHERE Factura_N = ? AND en_contingencia = 1");
            $stmt->execute([$factN]);
            $factura = $stmt->fetch();
            if (!$factura) { echo json_encode(['success' => false, 'message' => 'Factura no está en contingencia']); exit; }

            $stmt = $db->prepare("
                SELECT d.*, a.Codigo, a.Nombres_Articulo, a.unit_measure_id
                FROM tbldetalle_venta d
                LEFT JOIN tblarticulos a ON d.Items = a.Items
                WHERE d.Factura_N = ?
            ");
            $stmt->execute([$factN]);
            $items = $stmt->fetchAll();

            $invoiceJSON = buildInvoiceJSON($db, $factura, $items, $companyId);
            // Email opcional
            $sendEmail = $data['send_email'] ?? false;
            if ($sendEmail) {
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

            // Crear/buscar registro en electronic_documents (si ya existe uno pendiente para esta factura, reusarlo)
            $totalDocFE = calcularTotalDocFE($db, $factura, $items);
            $stmt = $db->prepare("SELECT id FROM electronic_documents WHERE number = 0 AND total = ? AND customer_identification = ? AND status IN ('pendiente','rechazado') ORDER BY id DESC LIMIT 1");
            $stmt->execute([$totalDocFE, $factura['Identificacion']]);
            $existing = $stmt->fetch();
            if ($existing) {
                $docElecId = $existing['id'];
            } else {
                // Mueve huérfanos (FCON, 0) de otras facturas a number=9000000000+id
                // para liberar el slot del UNIQUE (prefix, number) sin perder la fila
                // — el usuario quiere ver sus intentos fallidos en el listado FE.
                $db->prepare("
                    UPDATE electronic_documents
                    SET number = 9000000000 + id
                    WHERE prefix = 'FCON' AND number = 0 AND status IN ('pendiente', 'rechazado')
                ")->execute();

                $notaFactura = $factura['Comentario'] ?? '-';
                // Mismos 3 campos de pago que el flujo normal — sin esto el
                // listado no puede distinguir Contado/Crédito de facturas
                // reenviadas desde contingencia.
                $paymentFormLocalC   = ($factura['Tipo'] === 'Contado') ? 1 : 2;
                $paymentDueDaysLocalC = ($paymentFormLocalC === 2) ? intval($factura['Dias'] ?? 0) : 0;
                $medioPagoLocalC = intval($factura['id_mediopago'] ?? 0);
                $paymentMethodLocalC = ($medioPagoLocalC === 1) ? 14
                                       : (($medioPagoLocalC >= 2) ? 30 : 10);
                // customer_name/email desde $factura['A_nombre'] + email
                // detectado (body/fallback tblclientes). Solo aplica cuando no
                // se reusa un registro existente (raro pero posible).
                $emailReenv = trim((string)($data['customer_email'] ?? ''));
                if ($emailReenv === '') {
                    $stmtCli = $db->prepare("SELECT Email FROM tblclientes WHERE CodigoClien = ?");
                    $stmtCli->execute([$factura['CodigoCli']]);
                    $emailReenv = trim((string)($stmtCli->fetchColumn() ?: ''));
                }
                $db->prepare("
                    INSERT INTO electronic_documents
                    (fecha, cod_cliente, customer_identification, customer_name, customer_email, type_document_id, prefix, number, status, total, cufe, dian_response, id_usuario, id_mediopago, efectivo, valorpagado1, pagada, EstadoFact, email_sent, nota, payment_form_id, payment_method_id, payment_due_days)
                    VALUES (?, ?, ?, ?, ?, 1, 'FCON', 0, 'pendiente', ?, '', '{}', ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)
                ")->execute([
                    $factura['Fecha'], $factura['CodigoCli'], $factura['Identificacion'],
                    $factura['A_nombre'], $emailReenv ?: null,
                    $totalDocFE, $factura['Id_Usuario'],
                    $factura['id_mediopago'], $factura['efectivo'], $factura['valorpagado1'],
                    $factura['pagada'] ?: 'N', $notaFactura,
                    $paymentFormLocalC, $paymentMethodLocalC, $paymentDueDaysLocalC
                ]);
                $docElecId = $db->lastInsertId();
            }

            // Log request
            $logDir = __DIR__ . '/logs';
            if (!is_dir($logDir)) @mkdir($logDir, 0777, true);
            $ts = date('Ymd_His');
            $logBase = "$logDir/contingencia_{$factN}_{$ts}";
            @file_put_contents("{$logBase}_request.json", json_encode($invoiceJSON, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            $result = apiRequest("$API_BASE/api/factura/send-v2", 'POST', $invoiceJSON, $token);

            @file_put_contents("{$logBase}_response.json", json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            if (isset($result['success']) && $result['success']) {
                $cufe = $result['cufe'] ?? '';
                $consecutive = $result['consecutive'] ?? 0;
                $db->prepare("UPDATE tblventas SET enviada_dian = 1, fecha_envio_dian = NOW(), cufe = ?, contingencia_reenviada = 1 WHERE Factura_N = ?")
                   ->execute([$cufe, $factN]);
                $db->prepare("UPDATE electronic_documents SET status = 'autorizado', number = ?, cufe = ?, dian_response = ? WHERE id = ?")
                   ->execute([$consecutive, $cufe, json_encode($result), $docElecId]);
            } else {
                $db->prepare("UPDATE electronic_documents SET status = 'rechazado', dian_response = ? WHERE id = ?")
                   ->execute([json_encode($result), $docElecId]);
            }

            echo json_encode([
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'Error desconocido',
                'cufe' => $result['cufe'] ?? null,
                'consecutive' => $result['consecutive'] ?? null,
                'doc_local_id' => $docElecId,
                'respuesta_dian' => $result,
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
