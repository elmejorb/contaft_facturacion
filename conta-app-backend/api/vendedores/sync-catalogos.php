<?php
/**
 * Sincroniza catálogos (productos + clientes) de Conta FT local hacia API de vendedores.
 * Mantiene IDs idénticos para que los pedidos funcionen correctamente.
 */

// Conexión directa a ambas bases de datos
$dbLocal  = 'conta_test_negocio';
$dbRemoto = 'conta_movil';
$user     = 'root';
$pass     = 'root';

try {
    $pdoLocal = new PDO("mysql:host=localhost;dbname=$dbLocal;charset=utf8mb4", $user, $pass);
    $pdoLocal->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdoRemoto = new PDO("mysql:host=localhost;dbname=$dbRemoto;charset=utf8mb4", $user, $pass);
    $pdoRemoto->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ========================================================================
    // 1. SINCRONIZAR PRODUCTOS
    // ========================================================================
    echo "=== SINCRONIZANDO PRODUCTOS ===\n";

    // Leer productos locales
    $stmt = $pdoLocal->query("
        SELECT Items, Codigo, Nombres_Articulo, Precio_Costo, Precio_Venta,
               Precio_Venta2, Precio_Venta3, Existencia, Existencia_minima, Iva, Estado
        FROM tblarticulos
        WHERE Estado = 1
        ORDER BY Items
    ");
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Productos locales encontrados: " . count($productos) . "\n";

    // Limpiar productos remotos (manteniendo los de la empresa 1)
    $pdoRemoto->exec("DELETE FROM productos WHERE id_empresa = 1");
    $pdoRemoto->exec("ALTER TABLE productos AUTO_INCREMENT = 1");

    // Insertar productos con IDs forzados
    $sqlInsert = "
        INSERT INTO productos
        (id_producto, id_empresa, codigo, codvb6, nombre, precio_costo, precio_venta,
         precio_venta_2, precio_venta_3, stock, stock_minimo, porcentaje_iva, estado,
         created_at, updated_at)
        VALUES
        (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    ";
    $stmtInsert = $pdoRemoto->prepare($sqlInsert);

    foreach ($productos as $p) {
        $stmtInsert->execute([
            (int) $p['Items'],
            $p['Codigo'],
            $p['Codigo'],
            $p['Nombres_Articulo'],
            (float) $p['Precio_Costo'],
            (float) $p['Precio_Venta'],
            (float) $p['Precio_Venta2'],
            (float) $p['Precio_Venta3'],
            (float) $p['Existencia'],
            (float) ($p['Existencia_minima'] ?? 0),
            (float) $p['Iva'],
        ]);
    }
    echo "Productos sincronizados exitosamente.\n\n";

    // ========================================================================
    // 2. SINCRONIZAR CLIENTES
    // ========================================================================
    echo "=== SINCRONIZANDO CLIENTES ===\n";

    // Leer clientes locales
    $stmt = $pdoLocal->query("
        SELECT CodigoClien, Razon_Social, Nit, Identificacion, Telefonos, Direccion,
               Email, CupoAutorizado, Nombre_C, Apellidos_C
        FROM tblclientes
        ORDER BY CodigoClien
    ");
    $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Clientes locales encontrados: " . count($clientes) . "\n";

    // Limpiar clientes remotos
    $pdoRemoto->exec("DELETE FROM clientes WHERE id_empresa = 1");
    $pdoRemoto->exec("ALTER TABLE clientes AUTO_INCREMENT = 1");

    // Insertar clientes con IDs forzados
    $sqlInsert = "
        INSERT INTO clientes
        (id_cliente, id_empresa, codigo_cliente, codvb6, nombre_razon_social,
         tipo_documento, numero_documento, telefono, email, direccion,
         cupo_autorizado, estado, created_at, updated_at)
        VALUES
        (?, 1, ?, ?, ?, 'NIT', ?, ?, ?, ?, ?, 1, NOW(), NOW())
    ";
    $stmtInsert = $pdoRemoto->prepare($sqlInsert);

    foreach ($clientes as $c) {
        $nombre = !empty($c['Razon_Social']) ? $c['Razon_Social'] : trim(($c['Nombre_C'] ?? '') . ' ' . ($c['Apellidos_C'] ?? ''));
        if (empty($nombre)) $nombre = 'Cliente ' . $c['CodigoClien'];

        $stmtInsert->execute([
            (int) $c['CodigoClien'],
            (string) $c['CodigoClien'],
            (string) $c['CodigoClien'],
            $nombre,
            $c['Nit'] ?: ($c['Identificacion'] ?: '0'),
            $c['Telefonos'] ?: '',
            $c['Email'] ?: '',
            $c['Direccion'] ?: '',
            (float) ($c['CupoAutorizado'] ?? 0),
        ]);
    }
    echo "Clientes sincronizados exitosamente.\n\n";

    // ========================================================================
    // 3. LIMPIAR VENTAS/PEDIDOS DE PRUEBA ANTIGUOS (opcional)
    // ========================================================================
    echo "=== LIMPIANDO PEDIDOS DE PRUEBA ===\n";
    $pdoRemoto->exec("DELETE FROM venta_detalles WHERE id_venta IN (SELECT id_venta FROM ventas WHERE id_empresa = 1)");
    $pdoRemoto->exec("DELETE FROM ventas WHERE id_empresa = 1");
    echo "Pedidos de prueba eliminados.\n\n";

    echo "✅ SINCRONIZACIÓN COMPLETADA\n";
    echo "Ahora el vendedor debe hacer 'pull-to-refresh' en su app para bajar los nuevos catálogos.\n";

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
