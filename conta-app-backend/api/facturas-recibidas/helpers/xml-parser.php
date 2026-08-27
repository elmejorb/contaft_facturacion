<?php
/**
 * Parser de XML UBL 2.1 para facturas electrónicas recibidas de proveedores.
 *
 * El proveedor DIAN suele empaquetar el documento firmado dentro de un ZIP.
 * Además, muchos envuelven el XML real dentro de un `AttachedDocument` con
 * el contenido en CDATA, así que este helper:
 *   1. Abre el ZIP y ubica el XML.
 *   2. Detecta AttachedDocument y desenvuelve el XML real.
 *   3. Parsea con DOMDocument + XPath (SimpleXML no maneja bien namespaces
 *      cbc/cac de UBL).
 *
 * Todo namespaced en `App\FacturasRecibidas` para no chocar con globals.
 */
namespace App\FacturasRecibidas;

class XmlParser
{
    // Namespaces UBL 2.1 estándar DIAN.
    private const NS_CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
    private const NS_CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

    /**
     * Extrae el contenido XML de un ZIP o de un archivo XML plano.
     *
     * @param string $path  Ruta absoluta al archivo (ZIP o XML).
     * @param string $ext   Extensión en minúsculas ('zip' | 'xml').
     * @return array{0: ?string, 1: ?string}  [contenido_xml, nombre_dentro_del_zip]
     */
    public static function extraerXmlDelArchivo(string $path, string $ext): array
    {
        $ext = strtolower($ext);
        if ($ext === 'zip') {
            $zip = new \ZipArchive();
            if ($zip->open($path) !== true) {
                throw new \RuntimeException('ZIP inválido o corrupto');
            }
            $encontrado = null;
            $nombreZip  = null;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if ($name === false) continue;
                if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'xml') {
                    $encontrado = $zip->getFromIndex($i);
                    $nombreZip  = $name;
                    break;
                }
            }
            $zip->close();
            return [$encontrado ?: null, $nombreZip];
        }
        if ($ext === 'xml') {
            return [file_get_contents($path), null];
        }
        throw new \RuntimeException("Extensión no soportada: $ext (usa .zip o .xml)");
    }

    /**
     * Si el XML es un AttachedDocument con el XML real en <cbc:Description>
     * dentro de un CDATA, extrae ese XML real. Si no lo es, devuelve el mismo
     * string sin cambios.
     */
    public static function desenvolverAttachedDocument(string $xmlStr): string
    {
        if (strpos($xmlStr, 'AttachedDocument') === false) return $xmlStr;
        // El XML original puede estar en Description o en el ExternalReference/EmbeddedDocumentBinaryObject
        if (preg_match('/<cbc:Description>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/cbc:Description>/s', $xmlStr, $m)) {
            return $m[1];
        }
        return $xmlStr;
    }

    /**
     * Prepara un DOMXPath con los namespaces UBL registrados.
     * Devuelve [xpath, docRoot] o [null, null] si el XML no parsea.
     */
    private static function xpathFactory(string $xmlStr): array
    {
        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
        if (!$doc->loadXML($xmlStr)) return [null, null];
        $xp = new \DOMXPath($doc);
        $xp->registerNamespace('cbc', self::NS_CBC);
        $xp->registerNamespace('cac', self::NS_CAC);
        return [$xp, $doc];
    }

    /**
     * Extrae un valor de texto por XPath, trim, null si vacío.
     */
    private static function texto(\DOMXPath $xp, string $xpath, ?\DOMNode $ctx = null): ?string
    {
        $list = $xp->query($xpath, $ctx);
        if ($list && $list->length > 0) {
            $t = trim($list->item(0)->nodeValue ?? '');
            return $t !== '' ? $t : null;
        }
        return null;
    }

    /**
     * Extrae los datos maestros de la factura recibida (cabecera).
     * Soporta Invoice, CreditNote, DebitNote y AttachedDocument.
     */
    public static function extraerDatosFactura(string $xmlStr): array
    {
        $datos = [
            'invoice_cufe'           => null,
            'invoice_number'         => null,
            'invoice_issue_date'     => null,
            'invoice_payable_amount' => null,
            'issuer_nit'             => null,
            'issuer_name'            => null,
            'receiver_nit'           => null,
            'receiver_name'          => null,
            'tipo_documento'         => null,      // localName del root: Invoice / CreditNote / DebitNote
            'document_type_code'     => null,      // '01' FE / '91' NC / '92' ND
            'moneda'                 => 'COP',
            'lineas_count'           => 0,
        ];

        $xmlStr = self::desenvolverAttachedDocument($xmlStr);
        [$xp, $doc] = self::xpathFactory($xmlStr);
        if (!$xp) return $datos;

        $rootLocal = $doc->documentElement->localName ?: null;
        $datos['tipo_documento'] = $rootLocal;
        $datos['document_type_code'] = match ($rootLocal) {
            'CreditNote' => '91',
            'DebitNote'  => '92',
            default      => '01',   // Invoice o cualquier otro asumimos FE
        };

        // El primer cbc:ID del root es el número del documento (ej. FE123)
        $datos['invoice_number']     = self::texto($xp, '/*/cbc:ID');
        $datos['invoice_cufe']       = self::texto($xp, '/*/cbc:UUID');
        $datos['invoice_issue_date'] = self::texto($xp, '/*/cbc:IssueDate');
        $datos['moneda']             = self::texto($xp, '/*/cbc:DocumentCurrencyCode') ?: 'COP';

        $payable = self::texto($xp, '//cac:LegalMonetaryTotal/cbc:PayableAmount');
        if ($payable !== null) $datos['invoice_payable_amount'] = (float) $payable;

        // Emisor: AccountingSupplierParty (Invoice/Debit/Credit) o SenderParty (AttachedDocument)
        $datos['issuer_nit']  = self::texto($xp, '//cac:AccountingSupplierParty//cac:PartyTaxScheme/cbc:CompanyID')
                             ?? self::texto($xp, '//cac:AccountingSupplierParty//cac:PartyLegalEntity/cbc:CompanyID')
                             ?? self::texto($xp, '//cac:SenderParty//cbc:CompanyID');
        $datos['issuer_name'] = self::texto($xp, '//cac:AccountingSupplierParty//cac:PartyTaxScheme/cbc:RegistrationName')
                             ?? self::texto($xp, '//cac:AccountingSupplierParty//cac:PartyLegalEntity/cbc:RegistrationName')
                             ?? self::texto($xp, '//cac:AccountingSupplierParty//cac:PartyName/cbc:Name')
                             ?? self::texto($xp, '//cac:SenderParty//cbc:RegistrationName');

        // Receptor: AccountingCustomerParty o ReceiverParty
        $datos['receiver_nit']  = self::texto($xp, '//cac:AccountingCustomerParty//cac:PartyTaxScheme/cbc:CompanyID')
                               ?? self::texto($xp, '//cac:AccountingCustomerParty//cac:PartyLegalEntity/cbc:CompanyID')
                               ?? self::texto($xp, '//cac:ReceiverParty//cbc:CompanyID');
        $datos['receiver_name'] = self::texto($xp, '//cac:AccountingCustomerParty//cac:PartyTaxScheme/cbc:RegistrationName')
                               ?? self::texto($xp, '//cac:AccountingCustomerParty//cac:PartyLegalEntity/cbc:RegistrationName')
                               ?? self::texto($xp, '//cac:AccountingCustomerParty//cac:PartyName/cbc:Name')
                               ?? self::texto($xp, '//cac:ReceiverParty//cbc:RegistrationName');

        $lineas = $xp->query('//cac:InvoiceLine | //cac:CreditNoteLine | //cac:DebitNoteLine');
        $datos['lineas_count'] = $lineas ? $lineas->length : 0;

        return $datos;
    }

    /**
     * Extrae el detalle de líneas del XML.
     * @return array<int, array<string, mixed>>
     */
    public static function extraerLineas(string $xmlStr): array
    {
        $xmlStr = self::desenvolverAttachedDocument($xmlStr);
        [$xp, $doc] = self::xpathFactory($xmlStr);
        if (!$xp) return [];

        $lineasXml = $xp->query('//cac:InvoiceLine | //cac:CreditNoteLine | //cac:DebitNoteLine');
        if (!$lineasXml) return [];

        $out = [];
        foreach ($lineasXml as $ln) {
            $descripcion = self::texto($xp, './/cac:Item/cbc:Description', $ln)
                        ?? self::texto($xp, './/cac:Item/cbc:Name', $ln) ?? '';
            $codigo      = self::texto($xp, './/cac:Item/cac:SellersItemIdentification/cbc:ID', $ln)
                        ?? self::texto($xp, './/cac:Item/cac:StandardItemIdentification/cbc:ID', $ln) ?? '';
            $cantidad    = (float) (self::texto($xp, './cbc:InvoicedQuantity', $ln)
                                 ?? self::texto($xp, './cbc:CreditedQuantity', $ln)
                                 ?? self::texto($xp, './cbc:DebitedQuantity',  $ln) ?? 1);

            // unitCode viene como atributo — hay que consultar el atributo directo.
            $unidad = '';
            $qNode = $xp->query('./cbc:InvoicedQuantity | ./cbc:CreditedQuantity | ./cbc:DebitedQuantity', $ln);
            if ($qNode && $qNode->length > 0) {
                $unidad = $qNode->item(0)->getAttribute('unitCode') ?: '';
            }

            $precio    = (float) (self::texto($xp, './/cac:Price/cbc:PriceAmount', $ln) ?? 0);
            $subtotal  = (float) (self::texto($xp, './cbc:LineExtensionAmount', $ln) ?? 0);
            $descuento = (float) (self::texto($xp, './/cac:AllowanceCharge[cbc:ChargeIndicator="false"]/cbc:Amount', $ln) ?? 0);
            $ivaPct    = (float) (self::texto($xp, './/cac:TaxTotal//cac:TaxSubtotal/cac:TaxCategory/cbc:Percent', $ln) ?? 0);
            $ivaMonto  = (float) (self::texto($xp, './/cac:TaxTotal/cbc:TaxAmount', $ln) ?? 0);

            $out[] = [
                'codigo'          => $codigo,
                'descripcion'     => $descripcion,
                'unidad_medida'   => $unidad,
                'cantidad'        => $cantidad,
                'precio_unitario' => $precio,
                'descuento'       => $descuento,
                'iva_pct'         => $ivaPct,
                'iva_monto'       => $ivaMonto,
                'subtotal'        => $subtotal,
                'total_linea'     => $subtotal + $ivaMonto,
            ];
        }
        return $out;
    }

    /**
     * Parte el número completo (ej. "FEL6") en [prefijo, numero_solo] = ["FEL", "6"].
     * Si no matchea el patrón "letras+dígitos", devuelve ["", $numero].
     */
    public static function partirPrefijo(?string $numero): array
    {
        if (!$numero) return ['', ''];
        if (preg_match('/^([A-Za-z]+)([0-9]+)$/', $numero, $m)) {
            return [$m[1], $m[2]];
        }
        return ['', $numero];
    }
}
