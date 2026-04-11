<?php
/**
 * Genera PDF de factura electrónica usando TCPDF
 * GET ?cufe=xxx  → genera y muestra PDF
 * GET ?id=N      → genera PDF por ID de electronic_documents
 */

// TCPDF path - adjust if needed
$tcpdfPath = 'C:/xampp/htdocs/facturacion-electronica/vendor/autoload.php';
if (!file_exists($tcpdfPath)) {
    // Try alternative paths
    $tcpdfPath = __DIR__ . '/../../vendor/autoload.php';
}
if (file_exists($tcpdfPath)) {
    require_once($tcpdfPath);
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'TCPDF no encontrado. Instale: composer require tecnickcom/tcpdf']);
    exit;
}

require_once '../config/database.php';

function calcularDV($nit) {
    $nit = preg_replace('/[^0-9]/', '', $nit);
    if (!$nit) return '0';
    $factor = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71, 73, 79, 83, 89, 97];
    $suma = 0;
    $nitStr = strrev($nit);
    for ($i = 0; $i < strlen($nitStr) && $i < count($factor); $i++) {
        $suma += intval($nitStr[$i]) * $factor[$i];
    }
    $residuo = $suma % 11;
    return $residuo > 1 ? (11 - $residuo) : $residuo;
}

$database = new Database();
$db = $database->getConnection();

try {
    $id = $_GET['id'] ?? null;
    $cufe = $_GET['cufe'] ?? null;

    // Get document
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM electronic_documents WHERE id = ?");
        $stmt->execute([$id]);
    } elseif ($cufe) {
        $stmt = $db->prepare("SELECT * FROM electronic_documents WHERE cufe = ?");
        $stmt->execute([$cufe]);
    } else {
        echo json_encode(['success' => false, 'message' => 'ID o CUFE requerido']);
        exit;
    }

    $doc = $stmt->fetch();
    if (!$doc) { echo json_encode(['success' => false, 'message' => 'Documento no encontrado']); exit; }

    // Get client
    $stmt = $db->prepare("
        SELECT c.*, td.code AS type_doc_code, td.name AS type_doc_name,
               tor.code AS org_code, tl.code AS liability_code,
               tr.code AS regime_code, tr.name AS regime_name,
               m.name AS mun_name, dept.name AS dept_name,
               pm.name AS payment_method_name
        FROM tblclientes c
        LEFT JOIN tipos_documentos td ON c.id_documento = td.id
        LEFT JOIN type_organizations tor ON c.id_type_organization = tor.id
        LEFT JOIN type_liabilities tl ON c.id_type_liability = tl.id
        LEFT JOIN type_regimes tr ON c.id_type_regime = tr.id
        LEFT JOIN municipalities m ON c.id_municipio = m.id
        LEFT JOIN departments dept ON m.department_id = dept.id
        LEFT JOIN payment_methods pm ON " . intval($doc['payment_method_id']) . " = pm.id
        WHERE c.CodigoClien = ?
    ");
    $stmt->execute([$doc['cod_cliente']]);
    $cliente = $stmt->fetch();

    // Get empresa
    $stmt = $db->query("SELECT * FROM tbldatosempresa LIMIT 1");
    $empresa = $stmt->fetch();

    // Get items
    $stmt = $db->prepare("
        SELECT d.*, a.Codigo, a.Nombres_Articulo, COALESCE(um.name, 'Unidad') as unidad_nombre
        FROM detalle_document_electronic d
        LEFT JOIN tblarticulos a ON d.items = a.Items
        LEFT JOIN unit_measures um ON d.unit_measure_id = um.id
        WHERE d.factura_n = ?
    ");
    $stmt->execute([$doc['id']]);
    $items = $stmt->fetchAll();

    // Resolution data from empresa config
    $resolucion = [
        'resolution' => $empresa['Resolucion'] ?? '0',
        'date_from' => $empresa['FechaR'] ? date('Y-m-d', strtotime($empresa['FechaR'])) : '',
        'date_to' => $empresa['FechaR'] ? date('Y-m-d', strtotime($empresa['FechaR'] . ' +2 years')) : '',
        'from' => $empresa['Rango'] ?? '1',
        'to' => $empresa['Rango2'] ?? '20000',
        'prefix' => $empresa['Prefijo'] ?? $doc['prefix'] ?? 'FCON',
    ];

    // Calculate totals
    $subtotal = 0;
    $totalIva = 0;
    foreach ($items as $item) {
        $subtotal += floatval($item['line_extension_amount']);
        $totalIva += floatval($item['tax_amount']);
    }
    $total = floatval($doc['total']);
    $descuento = floatval($doc['descuento']);

    $dv = calcularDV(preg_replace('/[^0-9]/', '', $empresa['Nit']));
    $dvCliente = calcularDV(preg_replace('/[^0-9]/', '', $cliente['Nit'] ?? $doc['customer_identification']));

    $prefijo = $doc['prefix'] ?? $resolucion['prefix'] ?? 'FCON';
    $numFact = $doc['number'];
    $cufeDoc = $doc['cufe'] ?? '';
    $qrUrl = "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=$cufeDoc";

    // Document type name
    $tipoDoc = 'FACTURA ELECTRÓNICA DE VENTA';
    if ($doc['type_document_id'] == 2) $tipoDoc = 'NOTA CRÉDITO ELECTRÓNICA';
    if ($doc['type_document_id'] == 3) $tipoDoc = 'NOTA DÉBITO ELECTRÓNICA';

    // Régimen
    $regimenTexto = "No responsable de IVA";
    if ($empresa['Regimen'] == "Común") $regimenTexto = "Responsable de IVA - Régimen Común";
    elseif ($empresa['Regimen'] == "Simple") $regimenTexto = "Régimen Simple de Tributación";

    // Payment
    $paymentForm = $doc['payment_form_id'] == 2 ? 'Crédito' : 'Contado';
    $metodoPago = $cliente['payment_method_name'] ?? 'Efectivo';

    // Dates
    $fechaDoc = new DateTime($doc['fecha']);
    $fecha = $fechaDoc->format('d/m/Y');
    $hora = $doc['created_at'] ? date('H:i:s', strtotime($doc['created_at'])) : '';
    $diasVenc = intval($doc['payment_due_days'] ?? 0);
    $fechaVenc = clone $fechaDoc;
    if ($diasVenc > 0) $fechaVenc->modify("+$diasVenc days");
    $fechaVencStr = $fechaVenc->format('d/m/Y');

    // Logo
    $logoPath = 'C:/xampp/htdocs/facturacion-electronica/img/logo_2_innovacion.png';
    if (!file_exists($logoPath)) $logoPath = null;

    // ======= GENERATE PDF =======
    class MYPDF extends TCPDF {
        public $resData;
        public $prefData;
        public $tipoDocData;

        public function Footer() {
            $res = $this->resData;
            $prefix = $this->prefData;
            if ($res) {
                $this->SetY(-25);
                $this->SetFont('helvetica', '', 7);
                $this->MultiCell(0, 4, "Autorización de numeración N°{$res['resolution']} de {$res['date_from']} Modalidad {$this->tipoDocData} Desde N° {$prefix}{$res['from']} hasta {$prefix}{$res['to']} vigencia hasta {$res['date_to']}", 0, 'C');
            }
            $this->SetFont('helvetica', 'B', 8);
            $this->Cell(0, 4, 'Representación gráfica de ' . strtolower($this->tipoDocData), 0, 1, 'C');
            $this->SetFont('helvetica', '', 7);
            $this->Cell(0, 4, 'Página '.$this->getAliasNumPage().' de '.$this->getAliasNbPages(), 0, 0, 'L');
        }
    }

    $pdf = new MYPDF('P', 'mm', 'LETTER', true, 'UTF-8', false);
    $pdf->resData = $resolucion;
    $pdf->prefData = $prefijo;
    $pdf->tipoDocData = $tipoDoc;
    $pdf->setPrintHeader(false);
    $pdf->SetMargins(10, 10, 10);
    $pdf->SetAutoPageBreak(true, 30);
    $pdf->AddPage();

    // Logo
    if ($logoPath) $pdf->Image($logoPath, 10, 5, 40);

    // Empresa
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->SetXY(55, 8);
    $pdf->MultiCell(95, 5, $empresa['Empresa'], 0, 'C');
    $pdf->SetFont('helvetica', '', 9);
    $pdf->SetX(55);
    $pdf->MultiCell(95, 4, $empresa['Propietario'] !== '-' ? strtoupper($empresa['Propietario']) . "\n" : '' . "NIT " . $empresa['Nit'] . "-$dv", 0, 'C');
    $pdf->SetX(55);
    $pdf->MultiCell(95, 4, $empresa['Direccion'] . "\nTel: " . $empresa['Telefono'], 0, 'C');

    // Tipo documento + número
    $pdf->SetXY(155, 8);
    $pdf->SetFont('helvetica', '', 8);
    $pdf->MultiCell(50, 4, $tipoDoc, 0, 'C');
    $pdf->SetFont('helvetica', 'B', 13);
    $pdf->SetX(155);
    $pdf->MultiCell(50, 5, "No. $prefijo$numFact", 0, 'C');
    $pdf->SetFont('helvetica', '', 8);
    $pdf->SetX(155);
    $pdf->MultiCell(50, 4, $regimenTexto, 0, 'C');

    $pdf->Ln(6);

    // Cliente
    $clienteNombre = $cliente['Razon_Social'] ?? '-';
    $clienteNit = $cliente['Nit'] ?? $doc['customer_identification'] ?? '-';
    $clienteDir = $cliente['Direccion'] ?? '-';
    $clienteTel = $cliente['Telefonos'] ?? '-';
    $tipoIdent = $cliente['type_doc_name'] ?? 'CC';

    $html = <<<EOD
<style>td { border: 0.5px solid #ccc; font-size: 8px; } .gris { background-color: #f0f0f0; font-weight: bold; }</style>
<table cellpadding="3" border="0.5">
<tr><td class="gris" width="12%"><b>SEÑOR(ES)</b></td><td colspan="3" width="65%">$clienteNombre</td><td class="gris" width="21%"><b>FECHA</b></td></tr>
<tr><td class="gris" width="12%"><b>DIRECCIÓN</b></td><td colspan="3">$clienteDir</td><td style="text-align:center;">$fecha</td></tr>
<tr><td class="gris"><b>TELÉFONO</b></td><td>$clienteTel</td><td class="gris" style="text-align:right;">$tipoIdent</td><td>$clienteNit - $dvCliente</td><td style="text-align:center;">Vence: $fechaVencStr</td></tr>
</table>
EOD;
    $pdf->writeHTML($html, true, false, false, false, '');

    // Items table
    $rows = '';
    $idx = 1;
    foreach ($items as $item) {
        $desc = htmlspecialchars($item['Nombres_Articulo'] ?? $item['description'] ?? '-');
        $unidad = htmlspecialchars($item['unidad_nombre'] ?? 'Und');
        $precio = number_format(floatval($item['price_amount']), 2, ',', '.');
        $cant = $item['invoiced_quantity'];
        $desc_item = number_format(floatval($item['discount_amount']), 2, ',', '.');
        $totalItem = number_format(floatval($item['line_extension_amount']), 2, ',', '.');
        $ivaItem = floatval($item['tax_percent']);
        $rows .= "<tr><td style='text-align:center;'>$idx</td><td>$desc</td><td style='text-align:center;'>$unidad</td><td style='text-align:right;'>\$$precio</td><td style='text-align:center;'>$cant</td><td style='text-align:center;'>{$ivaItem}%</td><td style='text-align:right;'>\$$totalItem</td></tr>";
        $idx++;
    }

    $htmlItems = <<<EOD
<style>td, th { border: 0.5px solid #ccc; font-size: 8px; }</style>
<table cellpadding="3" border="0.5">
<tr style="background-color:#f0f0f0;"><th style="text-align:center;" width="4%"><b>#</b></th><th width="34%"><b>Ítem</b></th><th style="text-align:center;" width="10%"><b>Unidad</b></th><th style="text-align:center;" width="12%"><b>Precio</b></th><th style="text-align:center;" width="8%"><b>Cant</b></th><th style="text-align:center;" width="8%"><b>IVA</b></th><th style="text-align:center;" width="14%"><b>Total</b></th></tr>
$rows
</table>
EOD;
    $pdf->writeHTML($htmlItems, true, false, false, false, '');

    // ===== BLOQUE FINAL: QR + Totales + Firmas (posicionado al fondo) =====
    $alturaActual = $pdf->GetY();
    $alturaPagina = $pdf->getPageHeight();
    $margenFooter = 30; // espacio del footer TCPDF
    $alturaMaxima = $alturaPagina - $margenFooter;
    $alturaBloqueF = 80; // alto aprox del bloque QR+totales+firmas

    // Si no cabe, nueva página
    if (($alturaActual + $alturaBloqueF) > $alturaMaxima) {
        $pdf->AddPage();
        $yPos = $pdf->GetY();
    } else {
        // Posicionar al fondo
        $posIdeal = $alturaMaxima - $alturaBloqueF - 5;
        if ($alturaActual < $posIdeal) {
            $pdf->SetY($posIdeal);
        }
        $yPos = $pdf->GetY();
    }

    // QR
    $style = ['border' => 0, 'vpadding' => 'auto', 'hpadding' => 'auto', 'fgcolor' => [0,0,0], 'bgcolor' => false];
    $pdf->write2DBarcode($qrUrl, 'QRCODE,H', 10, $yPos, 32, 32, $style, 'N');

    // Info al lado del QR
    $pdf->SetXY(44, $yPos + 2);
    $pdf->SetFont('helvetica', '', 8);
    $pdf->MultiCell(95, 4,
        "Moneda: COP\n" .
        "Tipo de operación: Estándar    Forma de pago: $paymentForm\n" .
        "Medio de pago: $metodoPago", 0, 'L');
    $pdf->SetXY(44, $pdf->GetY());
    $pdf->SetFont('helvetica', 'B', 6);
    $pdf->MultiCell(120, 4, "CUFE: $cufeDoc", 0, 'L');

    // Texto legal a la izquierda
    $pdf->Ln(3);
    $yLegal = $pdf->GetY();
    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetXY(10, $yLegal);
    $pdf->MultiCell(85, 4, "Esta factura se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.", 0, 'J');

    // Nota
    if ($doc['nota']) {
        $pdf->Ln(1);
        $pdf->SetFont('helvetica', '', 8);
        $pdf->Cell(85, 4, 'Nota: ' . $doc['nota'], 0, 1, 'L');
    }

    // Totales a la derecha (alineados con el texto legal)
    $yTot = $yLegal;
    $pdf->SetXY(130, $yTot);
    $pdf->SetFont('helvetica', '', 9);
    $pdf->Cell(35, 6, 'Subtotal', 0, 0, 'R');
    $pdf->Cell(35, 6, '$' . number_format($subtotal, 2, ',', '.'), 0, 1, 'R');

    if ($totalIva > 0) {
        $pdf->SetX(130);
        $pdf->Cell(35, 6, 'IVA', 0, 0, 'R');
        $pdf->Cell(35, 6, '$' . number_format($totalIva, 2, ',', '.'), 0, 1, 'R');
    }
    if ($descuento > 0) {
        $pdf->SetX(130);
        $pdf->Cell(35, 6, 'Descuento', 0, 0, 'R');
        $pdf->Cell(35, 6, '-$' . number_format($descuento, 2, ',', '.'), 0, 1, 'R');
    }

    $pdf->SetFillColor(200, 200, 200);
    $pdf->SetX(130);
    $pdf->Cell(35, 7, 'Total', 0, 0, 'R', true);
    $pdf->Cell(35, 7, '$' . number_format($total, 2, ',', '.'), 0, 1, 'R', true);

    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->SetX(130);
    $pdf->SetFillColor(240, 240, 240);
    $pdf->Cell(35, 7, 'Total a pagar', 0, 0, 'R', true);
    $pdf->Cell(35, 7, '$' . number_format($total, 2, ',', '.'), 0, 1, 'R', true);

    $pdf->SetFont('helvetica', '', 8);
    $pdf->SetX(130);
    $pdf->Cell(70, 5, 'Total de líneas: ' . count($items), 0, 1, 'R');

    // Firmas
    $pdf->Ln(6);
    $pdf->SetFont('helvetica', '', 7);
    $yF = $pdf->GetY();
    $pdf->SetXY(30, $yF);
    $pdf->Cell(55, 0, '', 'T');
    $pdf->Cell(10);
    $pdf->Cell(55, 0, '', 'T');
    $pdf->SetXY(30, $yF + 2);
    $pdf->Cell(55, 4, 'ELABORADO POR', 0, 0, 'C');
    $pdf->Cell(10);
    $pdf->Cell(55, 4, 'ACEPTADA, FIRMA Y/O SELLO Y FECHA', 0, 0, 'C');

    // Output
    $pdf->SetTitle("$tipoDoc $prefijo$numFact - Conta FT");
    $filename = $tipoDoc === 'FACTURA ELECTRÓNICA DE VENTA' ? "FE_$prefijo$numFact" : "{$prefijo}{$numFact}";
    $pdf->Output("$filename.pdf", 'I');

} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
