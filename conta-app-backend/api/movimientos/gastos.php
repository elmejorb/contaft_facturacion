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
                INSERT INTO tblegresos (N_Comprobante, Fecha, Cedula, Orden, Suma, Concepto, Valor, Descuento, Estado, Cuentas, FactN, CodigoPro, NFacturaAnt, ValorFact, Saldoact, TipoPago, categoria_gasto)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Valida', ?, '-1', 0, '', 0, 0, 0, ?)
            ");
            $stmt->execute([$nComp, $fecha, $cedula, $beneficiario, $suma, $concepto, $valor, $cuentas, $categoria]);

            // Register in tblmov_caja if from caja
            if ($origen === 'caja' && $cajaId > 0) {
                // Find active session
                $stmt = $db->prepare("SELECT Id_Sesion FROM tblsesiones_caja WHERE Id_Caja = ? AND Estado = 'abierta' LIMIT 1");
                $stmt->execute([$cajaId]);
                $sesion = $stmt->fetch();

                $db->prepare("INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Valor, Tipo, Descripcion) VALUES (?, ?, 0, ?, 'gasto', ?)")
                   ->execute([$sesion ? $sesion['Id_Sesion'] : null, $cajaId, $valor, "Gasto: $concepto"]);

                $db->prepare("UPDATE tblcajas SET Saldo = Saldo - ? WHERE Id_Caja = ?")->execute([$valor, $cajaId]);
            }

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "Gasto #$nComp registrado por \$" . number_format($valor, 0, ',', '.'),
                'comprobante' => $nComp
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

            $db->prepare("UPDATE tblegresos SET Estado = 'Anulada' WHERE Id_Egresos = ?")->execute([$id]);

            echo json_encode(['success' => true, 'message' => 'Gasto anulado']);
        }
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
