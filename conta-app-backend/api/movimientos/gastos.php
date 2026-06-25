<?php
/**
 * Gastos operativos
 * GET              → listar gastos
 * POST action=crear → registrar nuevo gasto
 * POST action=anular → anular gasto
 */
require_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $anio = $_GET['anio'] ?? date('Y');
        $mes = $_GET['mes'] ?? null;

        $where = "YEAR(e.Fecha) = :anio AND e.FactN = '-1'";
        $params = [':anio' => $anio];
        if ($mes) { $where .= " AND MONTH(e.Fecha) = :mes"; $params[':mes'] = $mes; }

        $stmt = $db->prepare("
            SELECT e.*, COALESCE(e.categoria_gasto, 'Otros') as Categoria
            FROM tblegresos e
            WHERE $where
            ORDER BY e.Id_Egresos DESC
        ");
        $stmt->execute($params);
        $gastos = $stmt->fetchAll();

        foreach ($gastos as &$g) {
            $g['Valor'] = floatval($g['Valor']);
            $g['Descuento'] = floatval($g['Descuento']);
        }
        unset($g); // CRÍTICO: romper la referencia. Sin esto el siguiente
                   // foreach por valor sobrescribía el último elemento del
                   // array en cada iteración, dejando todas las filas
                   // iguales a la última iterada.

        $totalValidos = array_sum(array_map(fn($g) => $g['Estado'] === 'Valida' ? $g['Valor'] : 0, $gastos));
        $anios = $db->query("SELECT DISTINCT YEAR(Fecha) as a FROM tblegresos WHERE FactN = '-1' ORDER BY a DESC")->fetchAll(PDO::FETCH_COLUMN);
        $categorias = $db->query("SELECT * FROM tblcategorias_gasto WHERE Activa = 1 ORDER BY Nombre")->fetchAll();

        // Resumen por categoría
        $porCategoria = [];
        foreach ($gastos as $g) {
            if ($g['Estado'] !== 'Valida') continue;
            $cat = $g['Categoria'] ?? 'Otros';
            if (!isset($porCategoria[$cat])) $porCategoria[$cat] = 0;
            $porCategoria[$cat] += $g['Valor'];
        }

        echo json_encode([
            'success' => true,
            'gastos' => $gastos,
            'total' => count($gastos),
            'anios' => $anios ?: [date('Y')],
            'categorias' => $categorias,
            'resumen' => [
                'total_gastos' => count(array_filter($gastos, fn($g) => $g['Estado'] === 'Valida')),
                'total_valor' => $totalValidos,
                'por_categoria' => $porCategoria
            ]
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'crear';

        if ($action === 'crear') {
            $concepto = $data['concepto'] ?? '';
            $valor = floatval($data['valor'] ?? 0);
            $beneficiario = $data['beneficiario'] ?? '';
            $cedula = $data['cedula'] ?? '';
            $origen = $data['origen'] ?? 'caja'; // caja o banco
            $cajaId = intval($data['caja_id'] ?? 0);
            $fecha = $data['fecha'] ?? date('Y-m-d');
            $idUsuario = intval($data['id_usuario'] ?? 0) ?: null;

            $categoria = $data['categoria'] ?? 'Otros';

            if (!$concepto || $valor <= 0) { echo json_encode(['success' => false, 'message' => 'Concepto y valor requeridos']); exit; }

            // Next comprobante number
            $stmt = $db->query("SELECT COALESCE(MAX(N_Comprobante), 0) + 1 as next FROM tblegresos");
            $nComp = $stmt->fetch()['next'];

            $cuentas = $origen === 'banco' ? '1110' : '51 1305';

            // Número a letras (simplificado)
            $suma = '-';

            $db->beginTransaction();

            $stmt = $db->prepare("
                INSERT INTO tblegresos (N_Comprobante, Fecha, Cedula, Orden, Suma, Concepto, Valor, Descuento, Estado, Cuentas, FactN, CodigoPro, NFacturaAnt, ValorFact, Saldoact, TipoPago, categoria_gasto, id_usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Valida', ?, '-1', 0, '', 0, 0, 0, ?, ?)
            ");
            $stmt->execute([$nComp, $fecha, $cedula, $beneficiario, $suma, $concepto, $valor, $cuentas, $categoria, $idUsuario]);

            // Register in tblmov_caja if from caja
            if ($origen === 'caja' && $cajaId > 0) {
                // Find active session
                $stmt = $db->prepare("SELECT Id_Sesion FROM tblsesiones_caja WHERE Id_Caja = ? AND Estado = 'abierta' LIMIT 1");
                $stmt->execute([$cajaId]);
                $sesion = $stmt->fetch();

                $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, ?, ?, 'gasto', ?)")
                   ->execute([$sesion ? $sesion['Id_Sesion'] : null, $cajaId, $idUsuario ?: 0, $valor, "Gasto: $concepto"]);

                $db->prepare("UPDATE tblcajas SET Saldo = Saldo - ? WHERE Id_Caja = ?")->execute([$valor, $cajaId]);
            }

            // Register in tblmov_banco if from banco — usa el banco predeterminado
            // (o el primer activo si no hay predeterminado). Sin esto los gastos
            // bancarios no aparecían en el módulo de Bancos.
            if ($origen === 'banco') {
                $stmt = $db->query("SELECT idBancos FROM tblbancos WHERE Activa = 1 ORDER BY Predeterminada DESC, idBancos ASC LIMIT 1");
                $banco = $stmt->fetch();
                if ($banco) {
                    $db->prepare("INSERT INTO tblmov_banco (Id_Cuenta, Tipo, Valor, Descripcion, Referencia, Id_Usuario) VALUES (?, 'egreso', ?, ?, ?, ?)")
                       ->execute([$banco['idBancos'], $valor, "Gasto: $concepto", "EGR-$nComp", $idUsuario ?: 0]);
                    $db->prepare("UPDATE tblbancos SET Saldo = Saldo - ? WHERE idBancos = ?")
                       ->execute([$valor, $banco['idBancos']]);
                }
            }

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "Gasto #$nComp registrado por \$" . number_format($valor, 0, ',', '.'),
                'comprobante' => $nComp
            ], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'editar') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

            // Cargar el gasto actual
            $stmt = $db->prepare("SELECT * FROM tblegresos WHERE Id_Egresos = ?");
            $stmt->execute([$id]);
            $gasto = $stmt->fetch();
            if (!$gasto) { echo json_encode(['success' => false, 'message' => 'Gasto no encontrado']); exit; }
            if ($gasto['Estado'] !== 'Valida') { echo json_encode(['success' => false, 'message' => 'No se puede editar un gasto anulado']); exit; }

            $concepto     = $data['concepto']     ?? $gasto['Concepto'];
            $valorNuevo   = floatval($data['valor'] ?? $gasto['Valor']);
            $beneficiario = $data['beneficiario'] ?? $gasto['Orden'];
            $cedula       = $data['cedula']       ?? $gasto['Cedula'];
            $fecha        = $data['fecha']        ?? $gasto['Fecha'];
            $categoria    = $data['categoria']    ?? $gasto['categoria_gasto'];

            if (!$concepto || $valorNuevo <= 0) {
                echo json_encode(['success' => false, 'message' => 'Concepto y valor requeridos']);
                exit;
            }

            $valorAnterior   = floatval($gasto['Valor']);
            $conceptoAnt     = $gasto['Concepto'];
            $delta           = $valorNuevo - $valorAnterior;
            $esDeCaja        = strpos((string)$gasto['Cuentas'], '51') !== false;
            $esDeBanco       = strpos((string)$gasto['Cuentas'], '1110') !== false;

            $db->beginTransaction();

            // 1. Actualizar tblegresos
            $db->prepare("
                UPDATE tblegresos
                SET Fecha = ?, Cedula = ?, Orden = ?, Concepto = ?, Valor = ?, categoria_gasto = ?
                WHERE Id_Egresos = ?
            ")->execute([$fecha, $cedula, $beneficiario, $concepto, $valorNuevo, $categoria, $id]);

            // 2. Si fue gasto de caja, ajustar tblmov_caja y saldo de caja
            //    Match best-effort: por descripción + valor anterior. Si no encuentra
            //    una fila única, deja el movimiento sin tocar y avisa al usuario.
            $avisoMov = null;
            if ($esDeCaja) {
                $stmt = $db->prepare("
                    SELECT Id_Mov, Id_Caja_Origen FROM tblmov_caja
                    WHERE Tipo = 'gasto' AND Descripcion = ? AND ABS(Valor - ?) < 0.01
                    ORDER BY Id_Mov DESC LIMIT 1
                ");
                $stmt->execute(["Gasto: $conceptoAnt", $valorAnterior]);
                $mov = $stmt->fetch();
                if ($mov) {
                    // Actualizar el movimiento (descripción + valor)
                    $db->prepare("UPDATE tblmov_caja SET Valor = ?, Descripcion = ? WHERE Id_Mov = ?")
                       ->execute([$valorNuevo, "Gasto: $concepto", $mov['Id_Mov']]);
                    // Ajustar el saldo de la caja por el delta (si valor sube, saldo baja)
                    if (abs($delta) > 0.001 && $mov['Id_Caja_Origen']) {
                        $db->prepare("UPDATE tblcajas SET Saldo = Saldo - ? WHERE Id_Caja = ?")
                           ->execute([$delta, $mov['Id_Caja_Origen']]);
                    }
                } else {
                    $avisoMov = 'No se encontró el movimiento de caja vinculado — verifica el saldo manualmente';
                }
            }

            // 3. Si fue gasto de banco, ajustar tblmov_banco y saldo del banco.
            //    Match por Referencia (EGR-NComprobante) si está, sino por descripción+valor.
            if ($esDeBanco) {
                $stmt = $db->prepare("
                    SELECT Id_Mov, Id_Cuenta FROM tblmov_banco
                    WHERE Tipo = 'egreso' AND Referencia = ? LIMIT 1
                ");
                $stmt->execute(["EGR-{$gasto['N_Comprobante']}"]);
                $movB = $stmt->fetch();
                if (!$movB) {
                    $stmt = $db->prepare("
                        SELECT Id_Mov, Id_Cuenta FROM tblmov_banco
                        WHERE Tipo = 'egreso' AND Descripcion = ? AND ABS(Valor - ?) < 0.01
                        ORDER BY Id_Mov DESC LIMIT 1
                    ");
                    $stmt->execute(["Gasto: $conceptoAnt", $valorAnterior]);
                    $movB = $stmt->fetch();
                }
                if ($movB) {
                    $db->prepare("UPDATE tblmov_banco SET Valor = ?, Descripcion = ?, Referencia = ? WHERE Id_Mov = ?")
                       ->execute([$valorNuevo, "Gasto: $concepto", "EGR-{$gasto['N_Comprobante']}", $movB['Id_Mov']]);
                    if (abs($delta) > 0.001) {
                        $db->prepare("UPDATE tblbancos SET Saldo = Saldo - ? WHERE idBancos = ?")
                           ->execute([$delta, $movB['Id_Cuenta']]);
                    }
                } else {
                    $avisoMov = 'No se encontró el movimiento bancario vinculado — verifica el saldo manualmente';
                }
            }

            $db->commit();

            $msg = "Gasto #{$gasto['N_Comprobante']} actualizado";
            if ($avisoMov) $msg .= ". ⚠ $avisoMov";
            echo json_encode([
                'success'     => true,
                'message'     => $msg,
                'comprobante' => $gasto['N_Comprobante'],
            ], JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'anular') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'message' => 'ID requerido']); exit; }

            $stmt = $db->prepare("SELECT * FROM tblegresos WHERE Id_Egresos = ?");
            $stmt->execute([$id]);
            $gasto = $stmt->fetch();
            if (!$gasto || $gasto['Estado'] !== 'Valida') {
                echo json_encode(['success' => false, 'message' => 'Gasto no encontrado o ya anulado']);
                exit;
            }

            $db->beginTransaction();
            $db->prepare("UPDATE tblegresos SET Estado = 'Anulada' WHERE Id_Egresos = ?")->execute([$id]);

            // Si fue gasto de banco, registrar reverso (mov 'ingreso') y devolver el saldo.
            // Asiento opuesto en vez de borrar — preserva historial.
            if (strpos((string)$gasto['Cuentas'], '1110') !== false) {
                $valor = floatval($gasto['Valor']);
                $stmt = $db->prepare("SELECT Id_Cuenta FROM tblmov_banco WHERE Referencia = ? AND Tipo = 'egreso' LIMIT 1");
                $stmt->execute(["EGR-{$gasto['N_Comprobante']}"]);
                $movOrig = $stmt->fetch();
                if ($movOrig) {
                    $db->prepare("INSERT INTO tblmov_banco (Id_Cuenta, Tipo, Valor, Descripcion, Referencia) VALUES (?, 'ingreso', ?, ?, ?)")
                       ->execute([$movOrig['Id_Cuenta'], $valor, "Reverso anulación: " . $gasto['Concepto'], "REV-EGR-{$gasto['N_Comprobante']}"]);
                    $db->prepare("UPDATE tblbancos SET Saldo = Saldo + ? WHERE idBancos = ?")
                       ->execute([$valor, $movOrig['Id_Cuenta']]);
                }
            }

            $db->commit();
            echo json_encode(['success' => true, 'message' => 'Gasto anulado']);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
