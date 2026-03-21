<?php
/**
 * Script de prueba para verificar la codificación de contraseñas
 * Compara los resultados con el sistema VB6
 */

require_once 'passwordEncoder.php';

echo "=== PRUEBA DE CODIFICACIÓN DE CONTRASEÑAS ===\n\n";

// Ejemplos de prueba
$pruebas = [
    'admin',
    '1234',
    'test',
    'password',
    'root',
    '',
    '123',
    'Admin2024'
];

foreach ($pruebas as $texto) {
    $codificado = codificarPassword($texto);
    echo "Texto: '$texto'\n";
    echo "Codificado: $codificado\n";
    echo "Longitud: " . strlen($codificado) . " bits\n";
    echo "---\n";
}

echo "\n=== VERIFICACIÓN DE EJEMPLO ===\n";
echo "Si en VB6 codificas 'admin', debería darte el mismo resultado.\n";
echo "Para verificar, ejecuta en VB6:\n";
echo "Debug.Print Cx4_CodificarDatos(\"admin\")\n\n";

// Prueba específica con caracteres individuales
echo "=== DESGLOSE CARÁCTER POR CARÁCTER (ejemplo: 'admin') ===\n";
$ejemplo = 'admin';
for ($i = 0; $i < strlen($ejemplo); $i++) {
    $char = $ejemplo[$i];
    $ascii = ord($char);
    $binario = str_pad(decbin($ascii), 7, '0', STR_PAD_LEFT);
    echo "Char: '$char' -> ASCII: $ascii -> Binario: $binario\n";
}
?>
