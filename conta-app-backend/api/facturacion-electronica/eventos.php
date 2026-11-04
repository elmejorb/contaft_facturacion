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
        CURLOPT_USERAGENT      => 'ContaFT/4.8.18 (+eventos-estado)',
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
        CURLOPT_USERAGENT      => 'ContaFT/4.8.18 (+eventos-refresh)',
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
        $cufes = array_slice($cufes, 0, 100);

        // Tope real de concurrencia: 8 conexiones simultáneas contra la API.
        // El nginx del server rate-limita a 20 r/s burst=40 por IP; con 8 a ~150ms
        // nos quedamos muy por debajo. Si lanzamos 40+ handles de golpe algunas
        // caen en 503 (visto 2026-11-04 con GUTIERREZ SIMANCA y otros clientes
        // con muchas facturas crédito).
        $ua = 'ContaFT/4.8.18 (+eventos-batch)';
        $buildHandle = function ($cufe) use ($API_BASE, $ua) {
            $url = "$API_BASE/api/documentos-electronicos/" . urlencode($cufe) . "/eventos-estado";
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => ['Accept: application/json'],
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT        => 8,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_USERAGENT      => $ua,
            ]);
            return $ch;
        };

        $mh = curl_multi_init();
        curl_multi_setopt($mh, CURLMOPT_MAX_TOTAL_CONNECTIONS, 8);
        curl_multi_setopt($mh, CURLMOPT_MAX_HOST_CONNECTIONS, 8);
        $handles = [];
        foreach ($cufes as $c) {
            $ch = $buildHandle($c);
            curl_multi_add_handle($mh, $ch);
            $handles[$c] = $ch;
        }
        do {
            curl_multi_exec($mh, $running);
            if ($running) curl_multi_select($mh, 0.5);
        } while ($running > 0);

        $out = [];
        $retry = [];    // cufes que respondieron 503/429: los reintentamos 1 vez con 1s de espera
        foreach ($handles as $c => $ch) {
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $raw  = curl_multi_getcontent($ch);
            if (in_array($code, [429, 503, 502, 504], true)) {
                $retry[] = $c;
            } else {
                $data = $raw ? json_decode($raw, true) : null;
                $out[$c] = is_array($data) ? $data : ['success' => false, 'message' => "HTTP $code", 'cufe' => $c];
            }
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);

        if ($retry) {
            usleep(1000000); // 1s — dejar que el bucket del rate limiter se recupere
            $mh2 = curl_multi_init();
            curl_multi_setopt($mh2, CURLMOPT_MAX_TOTAL_CONNECTIONS, 4);
            curl_multi_setopt($mh2, CURLMOPT_MAX_HOST_CONNECTIONS, 4);
            $h2 = [];
            foreach ($retry as $c) {
                $ch = $buildHandle($c);
                curl_multi_add_handle($mh2, $ch);
                $h2[$c] = $ch;
            }
            do { curl_multi_exec($mh2, $r2); if ($r2) curl_multi_select($mh2, 0.5); } while ($r2 > 0);
            foreach ($h2 as $c => $ch) {
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $raw  = curl_multi_getcontent($ch);
                $data = $raw ? json_decode($raw, true) : null;
                $out[$c] = is_array($data) ? $data : ['success' => false, 'message' => "HTTP $code (reintento)", 'cufe' => $c];
                curl_multi_remove_handle($mh2, $ch);
                curl_close($ch);
            }
            curl_multi_close($mh2);
        }

        echo json_encode(['success' => true, 'data' => $out], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Método no soportado']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
