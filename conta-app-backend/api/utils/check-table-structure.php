<?php
/**
 * Script para verificar la estructura de la tabla tblArticulos
 * Muestra los nombres reales de las columnas
 */

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "<h1>Estructura de tblArticulos</h1>";
echo "<pre>";

try {
    // Obtener estructura de la tabla
    $query = "DESCRIBE tblArticulos";
    $stmt = $db->prepare($query);
    $stmt->execute();

    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Columnas encontradas:\n";
    echo str_repeat("=", 80) . "\n";

    foreach ($columns as $column) {
        echo sprintf(
            "%-30s %-20s %s\n",
            $column['Field'],
            $column['Type'],
            $column['Key'] ? "(" . $column['Key'] . ")" : ""
        );
    }

    echo "\n" . str_repeat("=", 80) . "\n\n";

    // Mostrar un registro de ejemplo
    echo "Registro de ejemplo:\n";
    echo str_repeat("=", 80) . "\n";

    $queryExample = "SELECT * FROM tblArticulos LIMIT 1";
    $stmtExample = $db->prepare($queryExample);
    $stmtExample->execute();

    $example = $stmtExample->fetch(PDO::FETCH_ASSOC);

    if ($example) {
        foreach ($example as $key => $value) {
            echo sprintf("%-30s : %s\n", $key, $value);
        }
    }

} catch(Exception $e) {
    echo "Error: " . $e->getMessage();
}

echo "</pre>";
?>
