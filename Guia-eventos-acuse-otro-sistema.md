# Guía técnica — ZIP → XML → Eventos DIAN

Referencia para reutilizar en otro sistema el flujo de:
1. Recibir el ZIP que llega al correo del cliente (contiene la FE emitida por un proveedor).
2. Extraer el XML firmado y parsear sus datos + líneas de detalle.
3. Persistir la factura recibida en BD.
4. Aplicar eventos RADIAN (030 / 032 / 033 / 031) sobre esa factura sin re-cargar el archivo, respetando las reglas DIAN.

Stack asumido: **Lumen/Laravel 10 + PHP 8.2** en backend, **React + TypeScript** en frontend, **api-electronica.fjdsas.com.co** como proveedor tecnológico DIAN.

---

## 1. Arquitectura del flujo

```
   ┌────────────────┐
   │  Correo del    │  → llega ZIP del proveedor con XML firmado UBL 2.1
   │  cliente       │
   └────────┬───────┘
            │  (usuario descarga y arrastra al facturador)
            ▼
   ┌────────────────┐    POST /api/facturas-recibidas
   │  Frontend      │       (multipart file)
   │  (React)       │───────────────────────────────┐
   └────────────────┘                                ▼
                                          ┌────────────────────┐
                                          │  FacturaRecibida   │
                                          │  Controller.store  │
                                          └─────────┬──────────┘
                                                    │
                     ┌──────────────────────────────┼──────────────────────────────┐
                     ▼                              ▼                              ▼
             abrir ZIP con              parsear XML con              guardar XML original
             ZipArchive → XML           DOMDocument + XPath          en storage/app/…
                                                    │
                                                    ▼
                                          insert en 2 tablas:
                                          facturas_recibidas + detalle_factura_recibida
                                                    │
                                                    ▼
                                          ─── flujo posterior ───
                                          usuario abre modal para aplicar
                                          eventos 030/032/033/031 sin re-cargar
```

---

## 2. Recepción del ZIP y extracción del XML

### 2.1 Endpoint upload

```php
// routes/api.php
$router->post('/facturas-recibidas', 'FacturaRecibidaController@store');
```

### 2.2 Store — descomprimir + parsear + persistir

```php
// FacturaRecibidaController.php
public function store(Request $request)
{
    $empresaId = $this->empresaId($request);
    if (!$request->hasFile('archivo')) {
        return response()->json(['error' => 'Falta el archivo (ZIP o XML)'], 422);
    }
    $file = $request->file('archivo');
    $originalName = $file->getClientOriginalName();
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // 1) Extraer el XML crudo (soporta ZIP o XML directo)
    [$xmlStr, $nombreXmlDentro] = $this->extraerXmlDelArchivo($file->getRealPath(), $ext);
    if (!$xmlStr) {
        return response()->json(['error' => 'El archivo no contiene XML válido'], 422);
    }

    // 2) Parsear datos maestros (usa el mismo método de EventoController)
    $ev = new EventoController();
    $refl = new \ReflectionMethod(EventoController::class, 'extraerDatosFactura');
    $refl->setAccessible(true);
    $datos = $refl->invoke($ev, $xmlStr);

    if (empty($datos['invoice_cufe']) || strlen($datos['invoice_cufe']) < 90) {
        return response()->json(['error' => 'No se pudo extraer CUFE'], 422);
    }

    // 3) Idempotencia por (empresa_id, cufe): si ya existe, devolver ese registro
    $existente = DB::table('facturas_recibidas')
        ->where('empresa_id', $empresaId)
        ->where('cufe', $datos['invoice_cufe'])
        ->first();
    if ($existente) {
        return response()->json([
            'message' => 'Esta factura ya estaba registrada.',
            'factura_recibida' => $existente,
            'ya_existia' => true,
        ], 200);
    }

    // 4) Guardar el archivo firmado en storage
    $storageDir = base_path('storage/app/facturas_recibidas/' . $empresaId);
    if (!is_dir($storageDir)) @mkdir($storageDir, 0775, true);
    $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $originalName) ?: 'factura';
    $fname = date('Ymd_His') . '_' . substr(md5(uniqid('', true)), 0, 8) . '_' . $safeName;
    @copy($file->getRealPath(), "{$storageDir}/{$fname}");
    $relPath = "facturas_recibidas/{$empresaId}/{$fname}";

    // 5) Parsear las líneas del detalle
    $lineas = $this->extraerLineas($xmlStr);

    // 6) Partir prefijo/número (FEL6 → FEL + 6)
    [$prefijo, $numeroSolo] = $this->partirPrefijo($datos['invoice_number'] ?? '');

    // 7) Calcular subtotal + IVA sumando líneas (si no llegan en el XML)
    $subtotal = 0; $totalIva = 0;
    foreach ($lineas as $l) {
        $subtotal += (float) $l['subtotal'];
        $totalIva += (float) $l['iva_monto'];
    }

    // 8) Insertar cabecera
    $facturaId = DB::table('facturas_recibidas')->insertGetId([
        'empresa_id'              => $empresaId,
        'cufe'                    => $datos['invoice_cufe'],
        'tipo_documento'          => $this->mapTipoDoc($datos['tipo_documento'] ?? ''),
        'numero'                  => $numeroSolo ?: $datos['invoice_number'],
        'prefijo'                 => $prefijo,
        'fecha_emision'           => $datos['invoice_issue_date'] ?? null,
        'emisor_nit'              => $datos['issuer_nit'],
        'emisor_nombre'           => $datos['issuer_name'],
        'receptor_nit'            => $datos['receiver_nit'],
        'receptor_nombre'         => $datos['receiver_name'],
        'subtotal'                => $subtotal,
        'total_iva'               => $totalIva,
        'total'                   => (float) ($datos['invoice_payable_amount'] ?? 0),
        'archivo_original_nombre' => $originalName,
        'xml_filename'            => $fname,
        'xml_path'                => $relPath,
    ]);

    // 9) Insertar líneas
    foreach ($lineas as $i => $l) {
        DB::table('detalle_factura_recibida')->insert([
            'factura_recibida_id' => $facturaId,
            'linea_num'           => $i + 1,
            'codigo'              => $l['codigo'] ?? null,
            'descripcion'         => $l['descripcion'] ?? null,
            'unidad_medida'       => $l['unidad_medida'] ?? null,
            'cantidad'            => $l['cantidad'] ?? 1,
            'precio_unitario'     => $l['precio_unitario'] ?? 0,
            'descuento'           => $l['descuento'] ?? 0,
            'iva_pct'             => $l['iva_pct'] ?? 0,
            'iva_monto'           => $l['iva_monto'] ?? 0,
            'subtotal'            => $l['subtotal'] ?? 0,
            'total_linea'         => $l['total_linea'] ?? 0,
        ]);
    }

    return response()->json([
        'message' => 'Factura recibida registrada',
        'factura_recibida' => DB::table('facturas_recibidas')->where('id', $facturaId)->first(),
        'lineas_count' => count($lineas),
    ], 201);
}
```

### 2.3 Helper para abrir ZIP o leer XML directo

```php
/**
 * Devuelve [xml_str, nombre_dentro_del_zip].
 * Si el XML es AttachedDocument, extrae el XML interno del CDATA.
 */
private function extraerXmlDelArchivo(string $path, string $ext): array
{
    if ($ext === 'zip') {
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) throw new \RuntimeException('ZIP inválido');
        $encontrado = null; $nombreZip = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'xml') {
                $encontrado = $zip->getFromIndex($i);
                $nombreZip = $name;
                break;
            }
        }
        $zip->close();
        return [$encontrado, $nombreZip];
    }
    // XML directo
    return [file_get_contents($path), null];
}
```

### 2.4 Extraer datos maestros del XML UBL

Es lo delicado — UBL 2.1 usa namespaces y a veces el XML real viene **envuelto** dentro de un `AttachedDocument` con CDATA. Uso **DOMDocument + XPath** (SimpleXML no maneja bien los namespaces por defecto):

```php
private function extraerDatosFactura(string $xmlStr): array
{
    $datos = [
        'invoice_cufe' => null, 'invoice_number' => null,
        'invoice_issue_date' => null, 'invoice_payable_amount' => null,
        'issuer_nit' => null, 'issuer_name' => null,
        'tipo_documento' => null, 'moneda' => null, 'lineas_count' => 0,
        'receiver_nit' => null, 'receiver_name' => null,
    ];

    // Si es AttachedDocument, el XML real está embebido en <cbc:Description><![CDATA[...]]></cbc:Description>
    if (str_contains($xmlStr, 'AttachedDocument')) {
        if (preg_match('/<cbc:Description>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/cbc:Description>/s', $xmlStr, $m)) {
            $xmlStr = $m[1];
        }
    }

    libxml_use_internal_errors(true);
    $doc = new \DOMDocument();
    if (!$doc->loadXML($xmlStr)) return $datos;

    $xp = new \DOMXPath($doc);
    $xp->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');
    $xp->registerNamespace('cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2');

    $datos['tipo_documento'] = $doc->documentElement->localName ?: null;

    $texto = function (string $xpath) use ($xp): ?string {
        $list = $xp->query($xpath);
        if ($list && $list->length > 0) {
            $t = trim($list->item(0)->nodeValue ?? '');
            return $t !== '' ? $t : null;
        }
        return null;
    };

    // El primer cbc:ID del root es el número del documento (ej. FE123)
    $datos['invoice_number']     = $texto('/*/cbc:ID');
    $datos['invoice_cufe']       = $texto('/*/cbc:UUID');
    $datos['invoice_issue_date'] = $texto('/*/cbc:IssueDate');
    $datos['moneda']             = $texto('/*/cbc:DocumentCurrencyCode');

    $payable = $texto('//cac:LegalMonetaryTotal/cbc:PayableAmount');
    if ($payable !== null) $datos['invoice_payable_amount'] = (float) $payable;

    // Emisor: AccountingSupplierParty (Invoice/DebitNote) o SenderParty
    $datos['issuer_nit']  = $texto('//cac:AccountingSupplierParty//cac:PartyTaxScheme/cbc:CompanyID')
                         ?? $texto('//cac:AccountingSupplierParty//cac:PartyLegalEntity/cbc:CompanyID')
                         ?? $texto('//cac:SenderParty//cbc:CompanyID');
    $datos['issuer_name'] = $texto('//cac:AccountingSupplierParty//cac:PartyTaxScheme/cbc:RegistrationName')
                         ?? $texto('//cac:AccountingSupplierParty//cac:PartyLegalEntity/cbc:RegistrationName')
                         ?? $texto('//cac:AccountingSupplierParty//cac:PartyName/cbc:Name')
                         ?? $texto('//cac:SenderParty//cbc:RegistrationName');

    // Receptor: AccountingCustomerParty o ReceiverParty
    $datos['receiver_nit']  = $texto('//cac:AccountingCustomerParty//cac:PartyTaxScheme/cbc:CompanyID')
                           ?? $texto('//cac:AccountingCustomerParty//cac:PartyLegalEntity/cbc:CompanyID')
                           ?? $texto('//cac:ReceiverParty//cbc:CompanyID');
    $datos['receiver_name'] = $texto('//cac:AccountingCustomerParty//cac:PartyTaxScheme/cbc:RegistrationName')
                           ?? $texto('//cac:AccountingCustomerParty//cac:PartyLegalEntity/cbc:RegistrationName')
                           ?? $texto('//cac:AccountingCustomerParty//cac:PartyName/cbc:Name')
                           ?? $texto('//cac:ReceiverParty//cbc:RegistrationName');

    // Conteo de líneas — soporta los tres tipos de doc
    $lineas = $xp->query('//cac:InvoiceLine | //cac:CreditNoteLine | //cac:DebitNoteLine');
    $datos['lineas_count'] = $lineas ? $lineas->length : 0;

    return $datos;
}
```

### 2.5 Extraer las líneas del detalle

```php
private function extraerLineas(string $xmlStr): array
{
    // Idem — desenvolver AttachedDocument
    if (str_contains($xmlStr, 'AttachedDocument')) {
        if (preg_match('/<cbc:Description>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/cbc:Description>/s', $xmlStr, $m)) {
            $xmlStr = $m[1];
        }
    }
    libxml_use_internal_errors(true);
    $doc = new \DOMDocument();
    if (!$doc->loadXML($xmlStr)) return [];

    $xp = new \DOMXPath($doc);
    $xp->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');
    $xp->registerNamespace('cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2');

    $lineasXml = $xp->query('//cac:InvoiceLine | //cac:CreditNoteLine | //cac:DebitNoteLine');
    $out = [];
    foreach ($lineasXml as $ln) {
        $tomar = function (string $rel) use ($xp, $ln): ?string {
            $list = $xp->query($rel, $ln);   // XPath relativo a la línea
            if ($list && $list->length > 0) {
                $t = trim($list->item(0)->nodeValue ?? '');
                return $t !== '' ? $t : null;
            }
            return null;
        };
        $desc     = $tomar('.//cac:Item/cbc:Description') ?? $tomar('.//cac:Item/cbc:Name') ?? '';
        $codigo   = $tomar('.//cac:Item/cac:SellersItemIdentification/cbc:ID')
                  ?? $tomar('.//cac:Item/cac:StandardItemIdentification/cbc:ID') ?? '';
        $cant     = (float) ($tomar('./cbc:InvoicedQuantity')
                          ?? $tomar('./cbc:CreditedQuantity')
                          ?? $tomar('./cbc:DebitedQuantity') ?? 1);
        $unidad   = $tomar('./cbc:InvoicedQuantity/@unitCode')
                  ?? $tomar('./cbc:CreditedQuantity/@unitCode') ?? '';
        $precio   = (float) ($tomar('.//cac:Price/cbc:PriceAmount') ?? 0);
        $subtotal = (float) ($tomar('./cbc:LineExtensionAmount') ?? 0);
        $desc     = (float) ($tomar('.//cac:AllowanceCharge[cbc:ChargeIndicator="false"]/cbc:Amount') ?? 0);
        $ivaPct   = (float) ($tomar('.//cac:TaxTotal//cac:TaxSubtotal/cac:TaxCategory/cbc:Percent') ?? 0);
        $ivaMonto = (float) ($tomar('.//cac:TaxTotal/cbc:TaxAmount') ?? 0);

        $out[] = [
            'codigo' => $codigo, 'descripcion' => $desc, 'unidad_medida' => $unidad,
            'cantidad' => $cant, 'precio_unitario' => $precio, 'descuento' => $desc,
            'iva_pct' => $ivaPct, 'iva_monto' => $ivaMonto,
            'subtotal' => $subtotal, 'total_linea' => $subtotal + $ivaMonto,
        ];
    }
    return $out;
}
```

### 2.6 Esquema de BD

```sql
CREATE TABLE facturas_recibidas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  cufe VARCHAR(200) NOT NULL,
  tipo_documento VARCHAR(20) NOT NULL DEFAULT 'invoice',  -- invoice / credit-note / debit-note
  numero VARCHAR(50), prefijo VARCHAR(10),
  fecha_emision DATE, fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
  emisor_nit VARCHAR(30), emisor_nombre VARCHAR(200),
  receptor_nit VARCHAR(30), receptor_nombre VARCHAR(200),
  subtotal DECIMAL(15,2) DEFAULT 0,
  total_iva DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  archivo_original_nombre VARCHAR(255),
  xml_filename VARCHAR(255),
  xml_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_empresa_cufe (empresa_id, cufe),
  KEY idx_empresa_fecha (empresa_id, fecha_emision)
);

CREATE TABLE detalle_factura_recibida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  factura_recibida_id INT NOT NULL,
  linea_num INT DEFAULT 1,
  codigo VARCHAR(60), descripcion VARCHAR(500), unidad_medida VARCHAR(20),
  cantidad DECIMAL(15,3) DEFAULT 1,
  precio_unitario DECIMAL(15,2) DEFAULT 0,
  descuento DECIMAL(15,2) DEFAULT 0,
  iva_pct DECIMAL(5,2) DEFAULT 0,
  iva_monto DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  total_linea DECIMAL(15,2) DEFAULT 0,
  KEY idx_factura (factura_recibida_id)
);

CREATE TABLE eventos_factura (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  event_code VARCHAR(4) NOT NULL,            -- 030 / 032 / 033 / 031
  event_label VARCHAR(120),
  invoice_cufe VARCHAR(200) NOT NULL,
  invoice_number VARCHAR(50),
  invoice_issue_date DATE,
  invoice_payable_amount DECIMAL(15,2),
  issuer_nit VARCHAR(30), issuer_name VARCHAR(200),
  rejection_code VARCHAR(10),                -- solo para 031
  rejection_description VARCHAR(255),        -- solo para 031
  cude_evento VARCHAR(200),                  -- devuelto por DIAN
  dian_status VARCHAR(10),
  dian_message TEXT,
  api_response LONGTEXT,
  estado ENUM('aprobado','rechazado','pendiente') DEFAULT 'pendiente',
  enviado_at DATETIME,
  usuario_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_empresa_cufe (empresa_id, invoice_cufe),
  KEY idx_estado (estado)
);
```

---

## 3. Modal wizard 2 pasos (React)

El modal tiene 2 pasos:
- **Paso 1**: subir el ZIP (drag & drop o click).
- **Paso 2**: preview de los datos extraídos + selección del evento a aplicar.

```tsx
// FacturasRecibidas.tsx — componente principal
const [showModal, setShowModal] = useState(false);
const [aplicandoEvento, setAplicandoEvento] = useState<FacturaRecibida | null>(null);
const [uploading, setUploading] = useState(false);

const subirArchivo = async (file: File) => {
  setUploading(true);
  try {
    const fd = new FormData();
    fd.append('archivo', file);
    const r = await api.post('/api/facturas-recibidas', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (r.data?.ya_existia) toast(`Factura ya estaba registrada`);
    else toast.success(`Registrada · ${r.data?.lineas_count ?? 0} línea(s)`);
    cargar(); // refresca lista
  } catch (e) { showApiError(e, 'No se pudo procesar el archivo'); }
  finally { setUploading(false); }
};

// Botón "Cargar factura"
<label>
  <input type="file" accept=".zip,.xml,application/zip,application/xml,text/xml"
    style={{ display: 'none' }}
    disabled={uploading}
    onChange={e => {
      const f = e.target.files?.[0];
      if (f) subirArchivo(f);
      e.target.value = '';
    }} />
  <Upload /> {uploading ? 'Procesando…' : 'Cargar factura (ZIP/XML)'}
</label>
```

### Modal para aplicar evento (Paso 2, después de tener la factura registrada)

```tsx
const AplicarEventoModal: React.FC<{
  factura: FacturaRecibida;
  nitEmpresa: string;
  onCerrar: () => void;
  onExito: () => void;
}> = ({ factura, nitEmpresa, onCerrar, onExito }) => {
  const [enviando, setEnviando] = useState(false);
  const [rejectionCode, setRejectionCode] = useState('');
  const [rejectionDescription, setRejectionDescription] = useState('');

  // Estado derivado — qué eventos ya se aplicaron
  const yaAplicados = new Set<string>([
    ...(factura.tiene_030 ? ['030'] : []),
    ...(factura.tiene_032 ? ['032'] : []),
    ...(factura.tiene_033 ? ['033'] : []),
    ...(factura.tiene_031 ? ['031'] : []),
  ]);
  const tiene032 = yaAplicados.has('032');
  const tiene031 = yaAplicados.has('031');
  const tiene033 = yaAplicados.has('033');

  // FJD es emisor solo si el issuer_nit de la factura coincide con el NIT propio
  const esEmisor = nitEmpresa !== '' && String(factura.emisor_nit).trim() === nitEmpresa;

  const [eventCode, setEventCode] = useState('030');

  const enviar = async () => {
    if (eventCode === '031' && (!rejectionCode.trim() || !rejectionDescription.trim())) {
      toast.error('Para reclamo (031) faltan código y descripción');
      return;
    }
    setEnviando(true);
    try {
      const payload: any = {
        event_code: eventCode,
        invoice_cufe: factura.cufe,
        invoice_number: factura.numero,
        invoice_issue_date: factura.fecha_emision,
        invoice_payable_amount: Number(factura.total),
        issuer_nit: factura.emisor_nit,
        issuer_name: factura.emisor_nombre,
      };
      if (eventCode === '031') {
        payload.rejection_code = rejectionCode.trim();
        payload.rejection_description = rejectionDescription.trim();
      }
      const r = await api.post('/api/eventos', payload);
      toast.success(r.data?.message || 'Evento registrado');
      onExito();
    } catch (e) { showApiError(e, 'No se pudo registrar el evento'); }
    finally { setEnviando(false); }
  };

  return (
    <ModalBackdrop onClose={onCerrar}>
      <ModalHeader>Aplicar evento DIAN · {factura.prefijo}{factura.numero}</ModalHeader>

      {/* Opciones — cada una con su estado y bloqueos por regla DIAN */}
      {EVENTOS.map(op => {
        const registrado = yaAplicados.has(op.code);
        // Regla LGC12: 033 y 031 requieren 032 previo
        const bloqueoRequiere032 = (op.code === '033' || op.code === '031') && !tiene032;
        // Exclusión mutua: no se puede tener 033 y 031 sobre la misma factura
        const bloqueoExcluyente = (op.code === '033' && tiene031)
                                || (op.code === '031' && tiene033);
        // 034 solo la emite el emisor de la factura, no el adquirente
        const bloqueoRol = op.code === '034' && !esEmisor;
        const disabled = registrado || bloqueoRequiere032 || bloqueoExcluyente || bloqueoRol;

        return (
          <button
            key={op.code}
            disabled={disabled || enviando}
            onClick={() => !disabled && setEventCode(op.code)}
            style={{
              border: eventCode === op.code && !disabled ? `2px solid ${op.color}` : '2px solid #e5e7eb',
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {op.code} — {op.label}
            {registrado && <Badge>✓ Ya registrado</Badge>}
            {bloqueoRequiere032 && !bloqueoExcluyente && <Badge>Requiere 032 previo</Badge>}
            {bloqueoExcluyente && <Badge>Excluye {tiene031 ? '031' : '033'}</Badge>}
            {bloqueoRol && <Badge>Solo para emisor</Badge>}
          </button>
        );
      })}

      {/* Bloque de motivo solo cuando es 031 */}
      {eventCode === '031' && (
        <>
          <label>Código de rechazo *</label>
          <input value={rejectionCode} onChange={e => setRejectionCode(e.target.value)} />
          <label>Descripción del rechazo *</label>
          <input value={rejectionDescription} onChange={e => setRejectionDescription(e.target.value)} />
        </>
      )}

      <button onClick={enviar} disabled={enviando}>
        {enviando ? 'Enviando…' : 'Registrar evento'}
      </button>
    </ModalBackdrop>
  );
};
```

### Catálogo de eventos (frontend)

```tsx
const EVENTOS = [
  { code: '030', label: 'Acuse de recibo del XML',           color: '#2563eb' },
  { code: '032', label: 'Recibo del bien o servicio',        color: '#15803d' },
  { code: '033', label: 'Aceptación expresa',                color: '#7c3aed' },  // requiere 032 previo
  { code: '031', label: 'Reclamo (rechazo)',                 color: '#dc2626' },  // requiere 032 previo, mutex con 033
  { code: '034', label: 'Aceptación tácita (solo emisor)',   color: '#0891b2' },  // no aparece si eres adquirente
];
```

---

## 4. Envío del evento a la DIAN (backend)

### 4.1 Endpoint que recibe la solicitud del frontend

```php
// EventoController.php — POST /api/eventos
public function store(Request $request)
{
    $empresaId = $this->empresaId($request);

    $eventCode  = trim((string) $request->input('event_code', ''));
    $cufe       = trim((string) $request->input('invoice_cufe', ''));
    $invoiceNum = trim((string) $request->input('invoice_number', ''));
    $issueDate  = trim((string) $request->input('invoice_issue_date', ''));
    $payable    = (float) $request->input('invoice_payable_amount', 0);
    $issuerNit  = trim((string) $request->input('issuer_nit', ''));
    $issuerName = trim((string) $request->input('issuer_name', ''));
    $rejCode    = trim((string) $request->input('rejection_code', ''));
    $rejDesc    = trim((string) $request->input('rejection_description', ''));

    // ─── Validaciones básicas ─────────────────────────────────────────
    if (!in_array($eventCode, ['030','031','032','033','034'], true)) {
        return response()->json(['error' => 'event_code inválido'], 422);
    }
    if (strlen($cufe) !== 96) {
        return response()->json(['error' => 'CUFE debe tener 96 caracteres'], 422);
    }
    if ($eventCode === '031' && (!$rejCode || !$rejDesc)) {
        return response()->json(['error' => 'Reclamo requiere código y descripción'], 422);
    }

    // ─── Reglas DIAN de flujo ─────────────────────────────────────────
    // Idempotencia: no duplicar el mismo event_code aprobado sobre la misma CUFE
    $dup = DB::table('eventos_factura')
        ->where('empresa_id', $empresaId)->where('invoice_cufe', $cufe)
        ->where('event_code', $eventCode)->where('estado', 'aprobado')
        ->first();
    if ($dup) return response()->json([
        'error' => "Evento {$eventCode} ya registrado (CUDE: {$dup->cude_evento})",
    ], 409);

    // Regla LGC12: 033 y 031 requieren 032 previo aprobado
    if (in_array($eventCode, ['033', '031'], true)) {
        $eventosAprobados = DB::table('eventos_factura')
            ->where('empresa_id', $empresaId)->where('invoice_cufe', $cufe)
            ->where('estado', 'aprobado')->pluck('event_code')->toArray();
        if (!in_array('032', $eventosAprobados, true)) {
            return response()->json([
                'error' => "Regla LGC12: {$eventCode} requiere 032 previo",
                'regla' => 'LGC12',
            ], 422);
        }
        // Exclusión mutua
        if ($eventCode === '033' && in_array('031', $eventosAprobados, true)) {
            return response()->json(['error' => 'Ya reclamada, no puedes aceptar'], 422);
        }
        if ($eventCode === '031' && in_array('033', $eventosAprobados, true)) {
            return response()->json(['error' => 'Ya aceptada, no puedes reclamar'], 422);
        }
    }

    // 034 solo la emite el EMISOR de la factura (no el adquirente)
    if ($eventCode === '034') {
        $nitEmpresa = DB::table('config_empresa')
            ->where('empresa_id', $empresaId)->where('clave', 'nit_empresa')
            ->value('valor');
        if (trim((string) $nitEmpresa) !== trim($issuerNit)) {
            return response()->json([
                'error' => 'La 034 solo la emite el emisor. Esta factura no es tuya.',
                'regla' => 'ROL_034',
            ], 422);
        }
    }

    // ─── Cargar credenciales api-electronica + representante legal ────
    $config  = DB::table('config_empresa')->where('empresa_id', $empresaId)
                 ->pluck('valor', 'clave')->toArray();
    $apiBase = $config['proveedor_dian_url'] ?? null;
    $userFE  = $config['email_factelect']    ?? null;
    $passFE  = $config['password_factelect'] ?? null;
    $empresa = DB::table('empresas')->where('id', $empresaId)->first();

    if (!$empresa
        || empty($empresa->representante_numero)
        || empty($empresa->representante_primer_nombre)
        || empty($empresa->representante_primer_apellido)) {
        return response()->json([
            'error' => 'Falta representante legal (reglas AAH13/15/16)',
        ], 422);
    }

    // Login para obtener JWT del proveedor
    $ch = curl_init("{$apiBase}/login");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['email' => $userFE, 'password' => $passFE]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $loginResp = json_decode(curl_exec($ch), true);
    curl_close($ch);
    $token = $loginResp['token'] ?? null;
    if (!$token) return response()->json(['error' => 'No se pudo autenticar'], 502);

    // ─── Payload que espera api-electronica ───────────────────────────
    $payload = [
        'company_id'             => (int) ($loginResp['id_empresa'] ?? 1),
        'event_code'             => $eventCode,
        'invoice_cufe'           => $cufe,
        'invoice_number'         => $invoiceNum,
        'invoice_issue_date'     => $issueDate,
        'invoice_payable_amount' => number_format($payable, 2, '.', ''),
        'issuer_nit'             => $issuerNit,
        'issuer_name'            => $issuerName,
        'representante' => [
            'tipo_doc_id'      => (string) ($empresa->representante_tipo_doc_id ?: '13'),
            'numero'           => (string) $empresa->representante_numero,
            'primer_nombre'    => (string) $empresa->representante_primer_nombre,
            'segundo_nombre'   => (string) ($empresa->representante_segundo_nombre ?? ''),
            'primer_apellido'  => (string) $empresa->representante_primer_apellido,
            'segundo_apellido' => (string) ($empresa->representante_segundo_apellido ?? ''),
            'cargo'            => (string) ($empresa->representante_cargo ?: 'Representante Legal'),
            'area'             => (string) ($empresa->representante_area  ?: 'Administración'),
        ],
    ];
    if ($eventCode === '031') {
        $payload['rejection_code']        = $rejCode;
        $payload['rejection_description'] = $rejDesc;
    }

    // ─── Registrar previo en BD (trazabilidad aunque falle) ───────────
    $usuarioId = $request->attributes->get('user')['sub'] ?? null;
    $eventoId = DB::table('eventos_factura')->insertGetId([
        'empresa_id'             => $empresaId,
        'event_code'             => $eventCode,
        'invoice_cufe'           => $cufe,
        'invoice_number'         => $invoiceNum,
        'invoice_issue_date'     => $issueDate,
        'invoice_payable_amount' => $payable,
        'issuer_nit'             => $issuerNit,
        'issuer_name'            => $issuerName,
        'rejection_code'         => $rejCode ?: null,
        'rejection_description'  => $rejDesc ?: null,
        'estado'                 => 'pendiente',
        'usuario_id'             => $usuarioId ? (int) $usuarioId : null,
        'created_at'             => date('Y-m-d H:i:s'),
    ]);

    // ─── POST a api-electronica ──────────────────────────────────────
    $ch = curl_init("{$apiBase}/api/eventos/acuse");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 120, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer {$token}",
        ],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $rawResp  = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $resp = json_decode($rawResp, true);

    $ok           = ($httpCode >= 200 && $httpCode < 300) && !empty($resp['success']);
    $cudeEvento   = $resp['cude_evento']  ?? null;
    $dianStatus   = $resp['dian_status']  ?? null;
    $dianMessage  = $resp['dian_message'] ?? $resp['message'] ?? null;

    // Actualizar registro con resultado
    DB::table('eventos_factura')->where('id', $eventoId)->update([
        'cude_evento'  => $cudeEvento,
        'dian_status'  => $dianStatus,
        'dian_message' => $dianMessage,
        'api_response' => $rawResp,
        'estado'       => $ok ? 'aprobado' : 'rechazado',
        'enviado_at'   => date('Y-m-d H:i:s'),
    ]);

    if (!$ok) return response()->json([
        'error'     => $resp['error'] ?? "Fallo HTTP {$httpCode}",
        'evento_id' => $eventoId,
        'respuesta' => $resp,
    ], $httpCode >= 400 && $httpCode < 600 ? $httpCode : 502);

    return response()->json([
        'message'     => $resp['message'] ?? "Evento {$eventCode} registrado",
        'evento_id'   => $eventoId,
        'cude_evento' => $cudeEvento,
        'event_code'  => $eventCode,
    ]);
}
```

---

## 5. Resumen de reglas DIAN aplicadas

| Regla | Descripción | Dónde se aplica |
|---|---|---|
| **Idempotencia** | No permitir dos veces el mismo `event_code` aprobado sobre la misma CUFE | Backend `store` + UI (bloquea botón) |
| **LGC12** | 033 (Aceptación expresa) y 031 (Reclamo) requieren 032 (Recibo del bien) previo aprobado | Backend + UI |
| **Exclusión mutua** | Sobre la misma factura no pueden coexistir 033 y 031 | Backend + UI |
| **ROL_034** | La Aceptación tácita 034 solo la emite el EMISOR de la factura, no el adquirente | Backend valida `issuer_nit == nit_empresa`; UI oculta la opción |
| **AAH13/15/16** | Datos del representante legal obligatorios (número documento, primer nombre, primer apellido) | Backend valida antes de enviar |

**Códigos DIAN de eventos**:
- **030** — Acuse de recibo del XML (recibí el documento electrónico)
- **032** — Recibo del bien / prestación del servicio (llegó la mercancía)
- **033** — Aceptación expresa (factura → título valor en RADIAN)
- **031** — Reclamo / rechazo (con motivo obligatorio)
- **034** — Aceptación tácita (por silencio del adquirente en 3 días — la emite el emisor)

---

## 6. Endpoints usados

**Endpoints propios (nuestro backend)**:

```
POST   /api/facturas-recibidas              Subir ZIP y registrar factura
GET    /api/facturas-recibidas              Listar (con eventos_aplicados)
GET    /api/facturas-recibidas/{id}         Detalle + líneas + eventos
GET    /api/facturas-recibidas/{id}/xml     Descargar XML original firmado
DELETE /api/facturas-recibidas/{id}         Eliminar (bloqueado si tiene eventos aprobados)
GET    /api/facturas-recibidas/{id}/certificado  PDF con QR por cada evento

POST   /api/eventos                         Emitir evento DIAN (030/031/032/033/034)
GET    /api/eventos                         Listar eventos históricos
DELETE /api/eventos/{id}                    Borrar evento local no aprobado
DELETE /api/eventos/rechazados              Limpieza en bloque
POST   /api/eventos/parse-xml               (legacy) parsear XML sin registrar
```

**Endpoints de api-electronica (proveedor DIAN)**:

```
POST   /public/login                              Auth → JWT
POST   /public/api/eventos/acuse                  Emitir evento (payload arriba)
GET    /public/api/eventos?company_id=X&cufe=Y   Consultar eventos aplicados sobre una CUFE
```

---

## 7. Notas prácticas

**Sobre la extracción del XML**
- **UBL 2.1** usa namespaces `cbc:` y `cac:` — **DOMDocument + XPath** los maneja bien; SimpleXML no.
- Muchos proveedores DIAN envuelven el XML real en un **`AttachedDocument`** con CDATA. Siempre chequear primero si el XML es AttachedDocument y desenvolver.
- El **CUFE tiene 96 chars hex**; el CUDE (para eventos) es más largo. No confundir.

**Sobre la persistencia**
- **Idempotencia obligatoria por CUFE** — el usuario puede subir el mismo ZIP dos veces por accidente. La UNIQUE KEY `(empresa_id, cufe)` en `facturas_recibidas` lo evita a nivel BD; el controller devuelve el registro existente en lugar de duplicar.
- **Guardar siempre el XML original firmado** en storage — sirve para descargar y para reproceso si algún dato quedó mal parseado.

**Sobre el modal**
- Precargar las **reglas de bloqueo** en el UI (033/031 requieren 032, exclusión mutua, 034 solo emisor) — no confiar solo en el backend. Es mejor UX ver la opción bloqueada con explicación que enviar y recibir un 422.
- **Auto-seleccionar el primer evento disponible** al abrir el modal para reducir clicks.

**Sobre el envío**
- **Registrar SIEMPRE en BD antes de enviar a DIAN** — así queda trazabilidad aunque el proveedor responda 500. Después actualizar el mismo registro con la respuesta.
- **Guardar `api_response` completa en BD** — invaluable para debug cuando algo falla.
- **JWT del proveedor DIAN es de corta duración** (~1h en api-electronica). No cachearlo mucho; renovar con login antes de cada operación si dudas.

**Sobre `usuario_id`**
- Registrar qué usuario del sistema emitió el evento (`eventos_factura.usuario_id` → FK a `usuarios`). Sirve para el "responsable" en el certificado PDF (con nombre + email del user que hizo click) — la DIAN no exige esto pero es buena práctica interna.
