<?php
/**
 * Consulta el estado de eventos DIAN (acuse, aceptación, rechazo, tácita)
 * para facturas electrónicas a crédito.
 *
 *  GET  ?cufe=XXXX            → /eventos-estado  (rápido, lee la BD remota)
 *  GET  ?cufe=XXXX&refresh=1  → /eventos         (consulta DIAN en tiempo real)
 *  POST { "cufes": [...] }    → batch en paralelo usando eventos-estado
 *
 * event_status posibles:
 *   null | "pendiente"  = sin eventos aún
 *   "acuse"             = cliente recibió el correo (030)
 *   "recibido"          = cliente confirmó recibo del bien/servicio (032)
 *   "aceptada"          = cliente aceptó (033) - se convierte en título valor
 *   "tacita"            = 3 días hábiles sin rechazo → aceptación tácita
 *   "rechazada"         = cliente rechazó (031) - ver rechazo_motivo
 *
 * Los eventos SOLO aplican a facturas a CRÉDITO autorizadas. Contado no
 * requiere aceptación ni convierte en título valor.
 */
require_once '../config/database.php';
header('Content-Type: application/json; charset=utf-8');

$API_BASE = 'https://api-electronica.innovacion-digital.com/public';

/**
 * Ejecuta un GET simple contra la API remota. Endpoint público — sin token.
 * timeout corto (6s) porque `eventos-estado` es lectura de BD remota.
 */
function llamarEventosEstado($API_BASE, $cufe, $timeout = 6) {
    $url = "$API_BASE/api/documentos-electronicos/" . urlencode($cufe) . "/eventos-estado";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($raw === false || $code >= 500) {
        return ['success' => false, 'message' => "HTTP $code $err", 'cufe' => $cufe];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) return ['success' => false, 'message' => 'Respuesta no-JSON', 'cufe' => $cufe];
    return $data;
}

/**
 * Consulta a DIAN en tiempo real y actualiza la BD remota. Solo debe
 * llamarse cuando el usuario pulsa un botón "Actualizar" o para facturas
 * recién emitidas. Timeout más generoso porque consulta DIAN.
 */
function llamarEventos($API_BASE, $cufe) {
    $url = "$API_BASE/api/documentos-electronicos/" . urlencode($cufe) . "/eventos";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) return ['success' => false, 'message' => "HTTP $code", 'cufe' => $cufe];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : ['success' => false, 'message' => 'Respuesta no-JSON', 'cufe' => $cufe];
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $cufe = trim($_GET['cufe'] ?? '');
        if ($cufe === '') { echo json_encode(['success' => false, 'message' => 'cufe requerido']); exit; }
        $refresh = !empty($_GET['refresh']);
        $data = $refresh
            ? llamarEventos($API_BASE, $cufe)
            : llamarEventosEstado($API_BASE, $cufe);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'POST') {
        // Batch: recibe { cufes: ["...","..."] } y devuelve { data: { cufe → estado } }.
        // Se usa curl_multi para paralelizar las N consultas y responder rápido
        // aunque haya muchas facturas crédito en el listado.
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $cufes = array_values(array_filter(array_map('trim', $input['cufes'] ?? [])));
        if (!$cufes) { echo json_encode(['success' => true, 'data' => (object)[]]); exit; }
        // Tope defensivo: no lanzar más de 30 conexiones concurrentes.
        $cufes = array_slice($cufes, 0, 100);

        $mh = curl_multi_init();
        $handles = [];
        foreach ($cufes as $c) {
            $url = "$API_BASE/api/documentos-electronicos/" . urlencode($c) . "/eventos-estado";
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => ['Accept: application/json'],
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT        => 8,
                CURLOPT_CONNECTTIMEOUT => 3,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$c] = $ch;
        }
        do {
            curl_multi_exec($mh, $running);
            if ($running) curl_multi_select($mh, 0.5);
        } while ($running > 0);

        $out = [];
        foreach ($handles as $c => $ch) {
            $raw = curl_multi_getcontent($ch);
            $data = $raw ? json_decode($raw, true) : null;
            $out[$c] = is_array($data) ? $data : ['success' => false, 'message' => 'timeout/no-json', 'cufe' => $c];
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);
        echo json_encode(['success' => true, 'data' => $out], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Método no soportado']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
