<?php
/**
 * Sesiones de caja - Nuevo modelo multi-cajero
 * GET                      → estado: sesión activa del usuario o caja
 * GET ?historial=1&caja=N  → historial de sesiones de una caja
 * GET ?cajas=1             → listar cajas disponibles
 * POST action=abrir        → abrir sesión
 * POST action=cerrar       → cerrar sesión con conteo
 * POST action=retiro       → retiro parcial
 * POST action=deposito     → depositar en caja principal
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

// Clientes sin Facturación Electrónica no tienen `electronic_documents`.
// Cualquier query a esa tabla revienta el endpoint completo — miss-mostrando
// la caja como "Cerrada" aunque tenga sesión activa. Detectamos una sola vez.
$_tieneFE_stmt = $db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='electronic_documents'");
$tieneFE = intval($_tieneFE_stmt->fetchColumn()) > 0;

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        // Listar cajas — si se pasa usuario, filtrar por su caja asignada (si la tiene)
        if (isset($_GET['cajas'])) {
            $usuarioId = intval($_GET['usuario'] ?? 0);
            $cajaAsignada = null;
            if ($usuarioId > 0) {
                $stmtU = $db->prepare("SELECT Id_Caja, Id_TiposUsuario FROM tblusuarios WHERE Id_Usuario = ?");
                $stmtU->execute([$usuarioId]);
                $u = $stmtU->fetch();
                // Filtrar por caja asignada para CUALQUIER usuario (admin o cajero) que la tenga.
                // Admins sin caja asignada → ven todas (mantienen flexibilidad de supervisar).
                // Admins CON caja asignada → solo ven la suya (regla de venta exclusiva).
                if ($u && !empty($u['Id_Caja'])) {
                    $cajaAsignada = intval($u['Id_Caja']);
                }
            }

            $where = "c.Activa = 1";
            $params = [];
            if ($cajaAsignada) {
                $where .= " AND c.Id_Caja = ?";
                $params[] = $cajaAsignada;
            }

            $stmt = $db->prepare("
                SELECT c.*,
                    (SELECT COUNT(*) FROM tblsesiones_caja s WHERE s.Id_Caja = c.Id_Caja AND s.Estado = 'abierta') as sesiones_abiertas,
                    (SELECT u.Nombre FROM tblsesiones_caja s LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario WHERE s.Id_Caja = c.Id_Caja AND s.Estado = 'abierta' LIMIT 1) as cajero_actual
                FROM tblcajas c WHERE $where ORDER BY c.Id_Caja
            ");
            $stmt->execute($params);
            $cajas = $stmt->fetchAll();

            // Calcular base sugerida de cada caja (lo que quedó residual de la última sesión cerrada)
            // residual = ConteoFinal - sumaTraslados (de la última sesión cerrada)
            $stmtRes = $db->prepare("
                SELECT s.Id_Sesion, s.ConteoFinal,
                    COALESCE((SELECT SUM(Valor) FROM tblmov_caja WHERE Id_Sesion = s.Id_Sesion AND Tipo = 'traslado'), 0) AS trasladado,
                    s.FechaCierre
                FROM tblsesiones_caja s
                WHERE s.Id_Caja = ? AND s.Estado = 'cerrada'
                ORDER BY s.FechaCierre DESC LIMIT 1
            ");
            foreach ($cajas as &$c) {
                $stmtRes->execute([$c['Id_Caja']]);
                $r = $stmtRes->fetch();
                if ($r) {
                    $residual = floatval($r['ConteoFinal']) - floatval($r['trasladado']);
                    $c['base_sugerida'] = $residual > 0 ? $residual : 0;
                    $c['ultimo_cierre'] = $r['FechaCierre'];
                } else {
                    $c['base_sugerida'] = 0;
                    $c['ultimo_cierre'] = null;
                }
            }
            echo json_encode(['success' => true, 'cajas' => $cajas], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Historial
        if (isset($_GET['historial'])) {
            $cajaId = $_GET['caja'] ?? null;
            $where = "1=1";
            $params = [];
            if ($cajaId) { $where .= " AND s.Id_Caja = ?"; $params[] = $cajaId; }

            $stmt = $db->prepare("
                SELECT s.*, c.Nombre as NombreCaja, u.Nombre as NombreUsuario
                FROM tblsesiones_caja s
                LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
                LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario
                WHERE $where
                ORDER BY s.Id_Sesion DESC LIMIT 50
            ");
            $stmt->execute($params);
            echo json_encode(['success' => true, 'sesiones' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Estado actual: buscar sesión abierta
        $cajaId = $_GET['caja'] ?? null;
        $usuarioId = $_GET['usuario'] ?? null;

        $where = "s.Estado = 'abierta'";
        $params = [];
        if ($cajaId) { $where .= " AND s.Id_Caja = ?"; $params[] = $cajaId; }
        if ($usuarioId) { $where .= " AND s.Id_Usuario = ?"; $params[] = $usuarioId; }

        $stmt = $db->prepare("
            SELECT s.*, c.Nombre as NombreCaja, u.Nombre as NombreUsuario
            FROM tblsesiones_caja s
            LEFT JOIN tblcajas c ON s.Id_Caja = c.Id_Caja
            LEFT JOIN tblusuarios u ON s.Id_Usuario = u.Id_Usuario
            WHERE $where
            ORDER BY s.Id_Sesion DESC LIMIT 1
        ");
        $stmt->execute($params);
        $sesion = $stmt->fetch();

        if (!$sesion) {
            echo json_encode(['success' => true, 'abierta' => false, 'sesion' => null, 'resumen' => null]);
            exit;
        }

        // Calcular resumen desde la apertura
        $fechaApertura = $sesion['FechaApertura'];
        $base = floatval($sesion['BaseInicial']);
        $idUsuarioSesion = intval($sesion['Id_Usuario']);
        // Si la sesión no tiene Id_Usuario (sesiones viejas), no filtrar — devuelve todo (modo retro-compatible)
        $filtroUsuario = $idUsuarioSesion > 0 ? ' AND Id_Usuario = ?' : '';
        $filtroUsuarioPagos = $idUsuarioSesion > 0 ? ' AND id_usuario = ?' : ''; // tblpagos / tblegresos en minúscula
        $paramsUsuario = $idUsuarioSesion > 0 ? [$fechaApertura, $idUsuarioSesion] : [$fechaApertura];

        // Ventas contado (tblventas) — efectivo NETO = efectivo recibido menos cambio devuelto.
        // INCLUYE las anuladas del día por diseño contable: cada venta se cuenta
        // como entrada bruta y la anulación aparece como salida separada en la
        // línea "Anulaciones". Esto evita el doble descuento que había antes
        // (excluir anuladas AQUÍ + restar anulaciones aparte descontaba 2 veces).
        // Es el mismo criterio que usaba el sistema VB6.
        $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo - COALESCE(Cambio,0)),0) as ef, COALESCE(SUM(valorpagado1),0) as tr, COALESCE(SUM(Total),0) as t, COUNT(*) as c FROM tblventas WHERE Fecha >= ? AND EstadoFact IN ('Valida','Anulada') AND Tipo = 'Contado'$filtroUsuario");
        $stmt->execute($paramsUsuario);
        $vc = $stmt->fetch();

        // FE Contado (electronic_documents) — autorizadas + pendientes (contingencia)
        // Solo si el cliente tiene módulo FE. Sin FE: sumar 0.
        $vfe = ['ef' => 0, 'tr' => 0, 't' => 0, 'c' => 0];
        if ($tieneFE) {
            $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo),0) as ef, COALESCE(SUM(valorpagado1),0) as tr, COALESCE(SUM(total),0) as t, COUNT(*) as c FROM electronic_documents WHERE created_at >= ? AND type_document_id = 1 AND payment_form_id = 1 AND status IN ('autorizado','pendiente')$filtroUsuarioPagos");
            $stmt->execute($paramsUsuario);
            $vfe = $stmt->fetch();
        }
        $vc = [
            'ef' => floatval($vc['ef']) + floatval($vfe['ef']),
            'tr' => floatval($vc['tr']) + floatval($vfe['tr']),
            't'  => floatval($vc['t'])  + floatval($vfe['t']),
            'c'  => intval($vc['c'])   + intval($vfe['c']),
        ];

        // Ventas crédito (tblventas)
        $stmt = $db->prepare("SELECT COALESCE(SUM(Total),0) as t, COUNT(*) as c FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Valida' AND Tipo != 'Contado'$filtroUsuario");
        $stmt->execute($paramsUsuario);
        $vcr = $stmt->fetch();

        // FE Crédito (electronic_documents)
        $vfecr = ['t' => 0, 'c' => 0];
        if ($tieneFE) {
            $stmt = $db->prepare("SELECT COALESCE(SUM(total),0) as t, COUNT(*) as c FROM electronic_documents WHERE created_at >= ? AND type_document_id = 1 AND payment_form_id = 2 AND status IN ('autorizado','pendiente')$filtroUsuarioPagos");
            $stmt->execute($paramsUsuario);
            $vfecr = $stmt->fetch();
        }
        $vcr = [
            't' => floatval($vcr['t']) + floatval($vfecr['t']),
            'c' => intval($vcr['c'])  + intval($vfecr['c']),
        ];

        // Ventas por medio de pago — mismo criterio que "Ventas contado":
        // incluir anuladas para que el desglose por medio cuadre con el total.
        $filtroUsuarioV = $idUsuarioSesion > 0 ? ' AND v.Id_Usuario = ?' : '';
        $stmt = $db->prepare("SELECT COALESCE(m.nombre_medio,'Efectivo') as medio, v.id_mediopago, COALESCE(SUM(v.Total),0) as total, COALESCE(SUM(v.efectivo - COALESCE(v.Cambio,0)),0) as efectivo, COALESCE(SUM(v.valorpagado1),0) as transferencia FROM tblventas v LEFT JOIN tblmedios_pago m ON v.id_mediopago = m.id_mediopago WHERE v.Fecha >= ? AND v.EstadoFact IN ('Valida','Anulada') AND v.Tipo = 'Contado'$filtroUsuarioV GROUP BY v.id_mediopago, m.nombre_medio");
        $stmt->execute($paramsUsuario);
        $ventasMedio = $stmt->fetchAll();

        // Pagos clientes
        $stmt = $db->prepare("SELECT COALESCE(SUM(CASE WHEN id_mediopago=0 THEN ValorPago ELSE 0 END),0) as ef, COALESCE(SUM(CASE WHEN id_mediopago>0 THEN ValorPago ELSE 0 END),0) as tr, COALESCE(SUM(ValorPago),0) as t, COUNT(*) as c FROM tblpagos WHERE Fecha >= ? AND Estado = 'Valida'$filtroUsuarioPagos");
        $stmt->execute($paramsUsuario);
        $pg = $stmt->fetch();

        // Egresos
        $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t, COUNT(*) as c FROM tblegresos WHERE Fecha >= ? AND Estado = 'Valida'$filtroUsuarioPagos");
        $stmt->execute($paramsUsuario);
        $eg = $stmt->fetch();

        // Anulaciones (reembolsos en efectivo en esta sesión)
        $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t, COUNT(*) as c FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'gasto' AND Descripcion LIKE 'Reembolso por %'");
        $stmt->execute([$sesion['Id_Sesion']]);
        $an = $stmt->fetch();

        // Retiros parciales de esta sesión
        $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'retiro_parcial'");
        $stmt->execute([$sesion['Id_Sesion']]);
        $retiros = floatval($stmt->fetch()['t']);

        // Movimientos de caja de esta sesión
        $stmt = $db->prepare("SELECT * FROM tblmov_caja WHERE Id_Sesion = ? ORDER BY Fecha DESC");
        $stmt->execute([$sesion['Id_Sesion']]);
        $movimientos = $stmt->fetchAll();

        $totalEfectivo = $base + floatval($vc['ef']) + floatval($pg['ef']) - floatval($eg['t']) - floatval($an['t']) - $retiros;
        $totalVentaDia = floatval($vc['t']) + floatval($vcr['t']);

        echo json_encode([
            'success' => true,
            'abierta' => true,
            'sesion' => $sesion,
            'resumen' => [
                'fecha_apertura' => $fechaApertura,
                'base' => $base,
                'ventas_contado_efectivo' => floatval($vc['ef']),
                'ventas_contado_transferencia' => floatval($vc['tr']),
                'ventas_contado_total' => floatval($vc['t']),
                'ventas_contado_cantidad' => intval($vc['c']),
                'ventas_credito' => floatval($vcr['t']),
                'ventas_credito_cantidad' => intval($vcr['c']),
                'ventas_por_medio' => $ventasMedio,
                'pagos_efectivo' => floatval($pg['ef']),
                'pagos_transferencia' => floatval($pg['tr']),
                'pagos_total' => floatval($pg['t']),
                'pagos_cantidad' => intval($pg['c']),
                'egresos' => floatval($eg['t']),
                'egresos_cantidad' => intval($eg['c']),
                'anulaciones' => floatval($an['t']),
                'anulaciones_cantidad' => intval($an['c']),
                'retiros_parciales' => $retiros,
                'total_efectivo' => $totalEfectivo,
                'total_venta_dia' => $totalVentaDia,
                'movimientos' => $movimientos
            ]
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'abrir') {
            $cajaId = intval($data['caja_id'] ?? 1);
            $usuarioId = intval($data['usuario_id'] ?? 0);
            $base = floatval($data['base'] ?? 0);

            // --- CAMBIO: bloquear apertura de sesión en caja principal ---
            $tipo_caja_check = $db->prepare("SELECT Tipo FROM tblcajas WHERE Id_Caja = ?");
            $tipo_caja_check->execute([$cajaId]);
            $tipo_row = $tipo_caja_check->fetch(PDO::FETCH_ASSOC);
            if ($tipo_row && $tipo_row['Tipo'] === 'principal') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'La caja principal no admite apertura de sesión. Use movimientos administrativos.']);
                exit;
            }

            // Validar caja asignada del usuario (solo no-admin con asignación)
            if ($usuarioId > 0) {
                $stmtU = $db->prepare("SELECT Id_Caja, Id_TiposUsuario FROM tblusuarios WHERE Id_Usuario = ?");
                $stmtU->execute([$usuarioId]);
                $u = $stmtU->fetch();
                if ($u && intval($u['Id_TiposUsuario']) !== 1 && !empty($u['Id_Caja']) && intval($u['Id_Caja']) !== $cajaId) {
                    $stmtCaja = $db->prepare("SELECT Nombre FROM tblcajas WHERE Id_Caja = ?");
                    $stmtCaja->execute([intval($u['Id_Caja'])]);
                    $nombreAsignada = $stmtCaja->fetch()['Nombre'] ?? 'su caja';
                    echo json_encode(['success' => false, 'message' => "Solo puede abrir su caja asignada: $nombreAsignada"]);
                    exit;
                }
            }

            // Verificar que la caja no tenga sesión abierta
            $stmt = $db->prepare("SELECT Id_Sesion, Id_Usuario FROM tblsesiones_caja WHERE Id_Caja = ? AND Estado = 'abierta' LIMIT 1");
            $stmt->execute([$cajaId]);
            $existente = $stmt->fetch();
            if ($existente) {
                $stmt2 = $db->prepare("SELECT Nombre FROM tblusuarios WHERE Id_Usuario = ?");
                $stmt2->execute([$existente['Id_Usuario']]);
                $usr = $stmt2->fetch();
                echo json_encode(['success' => false, 'message' => 'Esta caja ya está abierta por ' . ($usr['Nombre'] ?? 'otro usuario')]);
                exit;
            }

            $stmt = $db->prepare("INSERT INTO tblsesiones_caja (Id_Caja, Id_Usuario, FechaApertura, BaseInicial, Estado) VALUES (?, ?, NOW(), ?, 'abierta')");
            $stmt->execute([$cajaId, $usuarioId, $base]);

            $stmt = $db->prepare("SELECT Nombre FROM tblcajas WHERE Id_Caja = ?");
            $stmt->execute([$cajaId]);
            $nombreCaja = $stmt->fetch()['Nombre'] ?? 'Caja';

            echo json_encode(['success' => true, 'message' => "$nombreCaja abierta con base " . number_format($base, 0, ',', '.'), 'id_sesion' => $db->lastInsertId()]);

        } elseif ($action === 'corregir_base') {
            // Corrige el BaseInicial de una sesión ABIERTA cuando el usuario
            // digitó mal el valor al abrir la caja. Solo permite si:
            //   - La sesión está abierta
            //   - No lleva mucho tiempo (evita corregir bases de sesiones muy viejas
            //     donde ya se hicieron muchos movimientos)
            //   - Viene con autorizado_por (admin) — solo admin puede corregir
            //
            // Deja rastro en Observacion para trazabilidad.
            $sesionId       = intval($data['sesion_id'] ?? 0);
            $baseNueva      = floatval($data['base_nueva'] ?? -1);
            $usuarioId      = intval($data['usuario_id'] ?? 0);
            $autorizadoPor  = intval($data['autorizado_por'] ?? 0);
            $autorizadoNombre = trim($data['autorizado_por_nombre'] ?? '');
            $motivo         = trim($data['motivo'] ?? 'Corrección de base');

            if (!$sesionId || $baseNueva < 0) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM tblsesiones_caja WHERE Id_Sesion = ?");
            $stmt->execute([$sesionId]);
            $sesion = $stmt->fetch();
            if (!$sesion) {
                echo json_encode(['success' => false, 'message' => 'Sesión no encontrada']);
                exit;
            }
            if ($sesion['Estado'] !== 'abierta') {
                echo json_encode(['success' => false, 'message' => 'Solo se puede corregir la base de sesiones abiertas. Esta sesión ya está cerrada.']);
                exit;
            }

            // Solo admin puede corregir. Si viene autorizado_por, se acepta.
            // Si no, verificamos que el usuario_id que llama sea admin.
            if (!$autorizadoPor && $usuarioId > 0) {
                $stmtU = $db->prepare("SELECT Id_TiposUsuario FROM tblusuarios WHERE Id_Usuario = ?");
                $stmtU->execute([$usuarioId]);
                $tipoU = intval($stmtU->fetch()['Id_TiposUsuario'] ?? 0);
                if ($tipoU !== 1) {
                    echo json_encode([
                        'success' => false, 'requiere_autorizacion' => true,
                        'message' => 'Corregir la base requiere autorización del administrador.'
                    ]);
                    exit;
                }
            }

            $baseAnterior = floatval($sesion['BaseInicial']);
            $traza = "[BASE CORREGIDA " . date('Y-m-d H:i') . ": $baseAnterior → $baseNueva";
            if ($autorizadoNombre) $traza .= " · autorizado por $autorizadoNombre";
            if ($motivo && $motivo !== 'Corrección de base') $traza .= " · motivo: $motivo";
            $traza .= "]";
            $observacionActual = $sesion['Observacion'] ?? '';
            $observacionNueva = trim(($observacionActual ? $observacionActual . ' ' : '') . $traza);
            // La columna es VARCHAR(255) — truncar si se pasa
            if (strlen($observacionNueva) > 250) {
                $observacionNueva = substr($observacionNueva, -250);
            }

            $db->prepare("UPDATE tblsesiones_caja SET BaseInicial = ?, Observacion = ? WHERE Id_Sesion = ?")
               ->execute([$baseNueva, $observacionNueva, $sesionId]);

            echo json_encode([
                'success' => true,
                'message' => "Base corregida: $" . number_format($baseAnterior, 0, ',', '.') . " → $" . number_format($baseNueva, 0, ',', '.'),
                'base_anterior' => $baseAnterior,
                'base_nueva' => $baseNueva,
            ]);

        } elseif ($action === 'cerrar') {
            $sesionId = intval($data['sesion_id'] ?? 0);
            $conteo = floatval($data['conteo'] ?? 0);
            $observacion = $data['observacion'] ?? '';

            // --- CAMBIO: bloquear cierre de sesión en caja principal ---
            $tipo_sesion_check = $db->prepare(
                "SELECT c.Tipo FROM tblsesiones_caja s 
                 JOIN tblcajas c ON s.Id_Caja = c.Id_Caja 
                 WHERE s.Id_Sesion = ?"
            );
            $tipo_sesion_check->execute([$sesionId]);
            $tipo_sesion_row = $tipo_sesion_check->fetch(PDO::FETCH_ASSOC);
            if ($tipo_sesion_row && $tipo_sesion_row['Tipo'] === 'principal') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'La caja principal no tiene sesiones operativas.']);
                exit;
            }

            $stmt = $db->prepare("SELECT * FROM tblsesiones_caja WHERE Id_Sesion = ? AND Estado = 'abierta'");
            $stmt->execute([$sesionId]);
            $sesion = $stmt->fetch();
            if (!$sesion) { echo json_encode(['success' => false, 'message' => 'Sesión no encontrada o ya cerrada']); exit; }

            // Recalculate totals (filtrando por Id_Usuario de la sesión)
            $fa = $sesion['FechaApertura'];
            $base = floatval($sesion['BaseInicial']);
            $idUsuarioSesion = intval($sesion['Id_Usuario']);
            $filtroU = $idUsuarioSesion > 0 ? ' AND Id_Usuario = ?' : '';
            $filtroUm = $idUsuarioSesion > 0 ? ' AND id_usuario = ?' : '';
            $params = $idUsuarioSesion > 0 ? [$fa, $idUsuarioSesion] : [$fa];

            $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo - COALESCE(Cambio,0)),0) as ef, COALESCE(SUM(valorpagado1),0) as tr, COALESCE(SUM(Total),0) as t FROM tblventas WHERE Fecha >= ? AND EstadoFact IN ('Valida','Anulada') AND Tipo = 'Contado'$filtroU");
            $stmt->execute($params); $vc = $stmt->fetch();
            // + FE Contado (solo si el cliente tiene FE)
            $vfe = ['ef' => 0, 'tr' => 0, 't' => 0];
            if ($tieneFE) {
                $stmt = $db->prepare("SELECT COALESCE(SUM(efectivo),0) as ef, COALESCE(SUM(valorpagado1),0) as tr, COALESCE(SUM(total),0) as t FROM electronic_documents WHERE created_at >= ? AND type_document_id = 1 AND payment_form_id = 1 AND status IN ('autorizado','pendiente')$filtroUm");
                $stmt->execute($params); $vfe = $stmt->fetch();
            }
            $vc = ['ef' => floatval($vc['ef']) + floatval($vfe['ef']), 'tr' => floatval($vc['tr']) + floatval($vfe['tr']), 't' => floatval($vc['t']) + floatval($vfe['t'])];

            $stmt = $db->prepare("SELECT COALESCE(SUM(Total),0) as t FROM tblventas WHERE Fecha >= ? AND EstadoFact = 'Valida' AND Tipo != 'Contado'$filtroU");
            $stmt->execute($params); $vcr = $stmt->fetch();
            // + FE Crédito (solo si el cliente tiene FE)
            $vfecr = ['t' => 0];
            if ($tieneFE) {
                $stmt = $db->prepare("SELECT COALESCE(SUM(total),0) as t FROM electronic_documents WHERE created_at >= ? AND type_document_id = 1 AND payment_form_id = 2 AND status IN ('autorizado','pendiente')$filtroUm");
                $stmt->execute($params); $vfecr = $stmt->fetch();
            }
            $vcr = ['t' => floatval($vcr['t']) + floatval($vfecr['t'])];

            $stmt = $db->prepare("SELECT COALESCE(SUM(CASE WHEN id_mediopago=0 THEN ValorPago ELSE 0 END),0) as ef, COALESCE(SUM(CASE WHEN id_mediopago>0 THEN ValorPago ELSE 0 END),0) as tr, COALESCE(SUM(ValorPago),0) as t FROM tblpagos WHERE Fecha >= ? AND Estado = 'Valida'$filtroUm");
            $stmt->execute($params); $pg = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblegresos WHERE Fecha >= ? AND Estado = 'Valida'$filtroUm");
            $stmt->execute($params); $eg = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'gasto' AND Descripcion LIKE 'Reembolso por %'");
            $stmt->execute([$sesionId]); $an = $stmt->fetch();

            $stmt = $db->prepare("SELECT COALESCE(SUM(Valor),0) as t FROM tblmov_caja WHERE Id_Sesion = ? AND Tipo = 'retiro_parcial'");
            $stmt->execute([$sesionId]); $ret = floatval($stmt->fetch()['t']);

            $totalEf = $base + floatval($vc['ef']) + floatval($pg['ef']) - floatval($eg['t']) - floatval($an['t']) - $ret;
            $diferencia = $conteo - $totalEf;

            $db->prepare("UPDATE tblsesiones_caja SET FechaCierre = NOW(), VentasContadoEfectivo = ?, VentasContadoTransf = ?, VentasCredito = ?, PagosEfectivo = ?, PagosTransf = ?, Egresos = ?, Anulaciones = ?, RetirosParciales = ?, TotalEfectivoSistema = ?, ConteoFinal = ?, DiferenciaFinal = ?, Estado = 'cerrada', Observacion = ? WHERE Id_Sesion = ?")
               ->execute([floatval($vc['ef']), floatval($vc['tr']), floatval($vcr['t']), floatval($pg['ef']), floatval($pg['tr']), floatval($eg['t']), floatval($an['t']), $ret, $totalEf, $conteo, $diferencia, $observacion, $sesionId]);

            // Trasladar según opción
            $opcionTraslado = $data['opcion_traslado'] ?? 'ganancias';
            $stmt = $db->query("SELECT Id_Caja FROM tblcajas WHERE Tipo = 'principal' AND Activa = 1 LIMIT 1");
            $cajaPrincipal = $stmt->fetch();
            $trasladado = 0;

            if ($cajaPrincipal && $opcionTraslado !== 'nada' && $conteo > 0) {
                if ($opcionTraslado === 'todo') {
                    $trasladado = $conteo;
                } elseif ($opcionTraslado === 'ganancias') {
                    $trasladado = max($conteo - $base, 0);
                }

                if ($trasladado > 0) {
                    $descTraslado = $opcionTraslado === 'todo'
                        ? "Cierre total de caja - Sesión #$sesionId"
                        : "Ganancias del día - Sesión #$sesionId (Base $" . number_format($base, 0, ',', '.') . " queda en caja)";

                    $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, ?, 'traslado', ?)")
                       ->execute([$sesionId, $sesion['Id_Caja'], $cajaPrincipal['Id_Caja'], intval($data['usuario_id'] ?? 0), $trasladado, $descTraslado]);
                    $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$trasladado, $cajaPrincipal['Id_Caja']]);
                }
            }

            $msgBase = $diferencia == 0 ? 'Cuadre perfecto.'
                : ($diferencia > 0 ? 'Sobrante: $' . number_format($diferencia, 0, ',', '.')
                : 'Faltante: $' . number_format(abs($diferencia), 0, ',', '.'));

            $msgTraslado = $trasladado > 0
                ? ' Trasladado a Principal: $' . number_format($trasladado, 0, ',', '.')
                : ($opcionTraslado === 'nada' ? ' Sin traslado.' : '');

            echo json_encode([
                'success' => true,
                'message' => "Caja cerrada. $msgBase.$msgTraslado",
                'diferencia' => $diferencia,
                'trasladado' => $trasladado,
                'opcion' => $opcionTraslado
            ], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'retiro') {
            $sesionId = intval($data['sesion_id'] ?? 0);
            $valor = floatval($data['valor'] ?? 0);
            $descripcion = $data['descripcion'] ?? 'Retiro parcial';
            $usuarioId = intval($data['usuario_id'] ?? 0);

            if ($valor <= 0) { echo json_encode(['success' => false, 'message' => 'Valor debe ser mayor a 0']); exit; }

            $stmt = $db->prepare("SELECT Id_Caja FROM tblsesiones_caja WHERE Id_Sesion = ? AND Estado = 'abierta'");
            $stmt->execute([$sesionId]);
            $sesion = $stmt->fetch();
            if (!$sesion) { echo json_encode(['success' => false, 'message' => 'No hay sesión abierta']); exit; }

            // Find caja principal
            $stmt = $db->query("SELECT Id_Caja FROM tblcajas WHERE Tipo = 'principal' AND Activa = 1 LIMIT 1");
            $cajaPrincipal = $stmt->fetch();
            $destino = $cajaPrincipal ? $cajaPrincipal['Id_Caja'] : null;

            $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Caja_Destino, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, ?, 'retiro_parcial', ?)")
               ->execute([$sesionId, $sesion['Id_Caja'], $destino, $usuarioId, $valor, $descripcion]);

            // Update caja principal saldo
            if ($destino) {
                $db->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")->execute([$valor, $destino]);
            }

            echo json_encode(['success' => true, 'message' => 'Retiro de $' . number_format($valor, 0, ',', '.') . ' registrado'], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'crear_caja') {
            $nombre = $data['nombre'] ?? '';
            $tipo = $data['tipo'] ?? 'punto_venta';
            if (!$nombre) { echo json_encode(['success' => false, 'message' => 'Nombre requerido']); exit; }
            $db->prepare("INSERT INTO tblcajas (Nombre, Tipo) VALUES (?, ?)")->execute([$nombre, $tipo]);
            echo json_encode(['success' => true, 'message' => "Caja '$nombre' creada", 'id' => $db->lastInsertId()]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
