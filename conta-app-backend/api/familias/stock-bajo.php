<?php
/**
 * Productos con stock debajo del mínimo configurado.
 * GET → lista de productos que alcanzaron o superaron el umbral de alerta.
 *
 * Devuelve además, cuando la BD las tenga, las columnas de empaque
 * (FactorConversion, NombreEmpaque) y etiqueta (Id_Etiqueta + nombre/color)
 * para que el frontend de Farmacia pueda mostrar la vista en cajas y filtrar
 * por etiqueta con el mismo look de Inventario.
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

try {
    // Detección defensiva de columnas / tabla opcional para tolerar BDs
    // que aún no corrieron actualizacion_completa.sql.
    $colStmt = $db->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblarticulos'");
    $artCols = array_column($colStmt->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME');
    $tblStmt = $db->query("SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()");
    $tblExists = array_column($tblStmt->fetchAll(PDO::FETCH_ASSOC), 'TABLE_NAME');

    $selFactor    = in_array('FactorConversion', $artCols) ? 'COALESCE(a.FactorConversion, 1)' : '1';
    $selNombreEmp = in_array('NombreEmpaque', $artCols)    ? 'a.NombreEmpaque'                 : 'NULL';
    $selIdEtiq    = in_array('Id_Etiqueta', $artCols)      ? 'a.Id_Etiqueta'                   : 'NULL';
    $selPrecCosto = in_array('Precio_Costo', $artCols)     ? 'a.Precio_Costo'                  : '0';
    $selIva       = in_array('Iva', $artCols)              ? 'COALESCE(a.Iva, 0)'              : '0';
    $selVenderEmp = in_array('VenderComoEmpaque', $artCols) ? 'COALESCE(a.VenderComoEmpaque, 0)' : '0';
    $selComprarEmp= in_array('ComprarComoEmpaque', $artCols) ? 'COALESCE(a.ComprarComoEmpaque, 0)' : '0';
    $selPrecioEmp = in_array('Precio_Venta_Empaque', $artCols) ? 'a.Precio_Venta_Empaque'      : 'NULL';
    $selCodProv   = in_array('CodigoPro', $artCols)        ? 'a.CodigoPro'                     : 'NULL';
    $joinProv     = (in_array('CodigoPro', $artCols) && in_array('tblproveedores', $tblExists))
        ? 'LEFT JOIN tblproveedores p ON a.CodigoPro = p.CodigoPro' : '';
    // El nombre del proveedor puede vivir en distintas columnas según la BD.
    // Usar COALESCE con las opciones más comunes (RazonSocial > Nombres > Nombre).
    $provCols = in_array('tblproveedores', $tblExists)
        ? array_column($db->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblproveedores'")->fetchAll(PDO::FETCH_ASSOC), 'COLUMN_NAME')
        : [];
    $selNomProv = "''";
    if (in_array('CodigoPro', $artCols) && in_array('tblproveedores', $tblExists)) {
        $partes = [];
        foreach (['RazonSocial', 'Nombres_Proveedor', 'Nombres', 'Nombre'] as $col) {
            if (in_array($col, $provCols)) $partes[] = "NULLIF(p.$col, '')";
        }
        $selNomProv = $partes ? 'COALESCE(' . implode(', ', $partes) . ", '')" : "''";
    }
    $joinEtiq     = in_array('tbletiquetas', $tblExists)
        ? 'LEFT JOIN tbletiquetas e ON a.Id_Etiqueta = e.Id_Etiqueta'
        : '';
    $selEtiq      = in_array('tbletiquetas', $tblExists) ? "COALESCE(e.Nombre, '')" : "''";
    $selEtiqColor = in_array('tbletiquetas', $tblExists) ? "COALESCE(e.Color, '')"  : "''";

    $sql = "
        SELECT
            a.Items,
            a.Codigo,
            a.Nombres_Articulo,
            a.Existencia,
            a.Existencia_minima  AS Stock_Minimo,
            a.Precio_Venta,
            $selPrecCosto        AS Precio_Costo,
            $selIva              AS Iva,
            $selFactor           AS FactorConversion,
            $selFactor           AS factor_conversion,
            $selNombreEmp        AS NombreEmpaque,
            $selNombreEmp        AS nombre_empaque,
            $selVenderEmp        AS vender_como_empaque,
            $selComprarEmp       AS comprar_como_empaque,
            $selPrecioEmp        AS precio_venta_empaque,
            $selIdEtiq           AS Id_Etiqueta,
            $selEtiq             AS Etiqueta,
            $selEtiqColor        AS Etiqueta_Color,
            COALESCE(fi.Id_Familia, 0) AS Id_Familia,
            COALESCE(f.Nombre, '')     AS Familia_Nombre,
            $selCodProv                AS CodigoPro,
            $selNomProv                AS Proveedor_Nombre
        FROM tblarticulos a
        LEFT JOIN tblfamilia_items fi ON a.Items = fi.Items
        LEFT JOIN tblfamilias_producto f ON fi.Id_Familia = f.Id_Familia
        $joinEtiq
        $joinProv
        WHERE a.Estado = 1
          AND a.Existencia_minima > 0
          AND a.Existencia < a.Existencia_minima
        ORDER BY (a.Existencia_minima - a.Existencia) DESC
    ";

    $rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([
        'success' => true,
        'total' => count($rows),
        'productos' => $rows,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
