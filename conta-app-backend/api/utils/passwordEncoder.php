<?php
/**
 * Función para codificar contraseñas
 * Convierte cada carácter a su representación binaria de 7 dígitos
 * Equivalente a Cx4_CodificarDatos de VB6
 */
function codificarPassword($texto) {
    if (empty($texto)) {
        return '';
    }

    $resultado = '';
    $longitud = strlen($texto);

    for ($i = 0; $i < $longitud; $i++) {
        $caracter = $texto[$i];

        // Obtener código ASCII del carácter (equivalente a Asc en VB6)
        $codigoASCII = ord($caracter);

        // Convertir a binario
        $binario = decbin($codigoASCII);

        // Rellenar con ceros a la izquierda para que tenga 7 dígitos
        $binario = str_pad($binario, 7, '0', STR_PAD_LEFT);

        $resultado .= $binario;
    }

    return $resultado;
}

/**
 * Función de prueba para verificar la codificación
 */
function testCodificarPassword() {
    echo "Prueba de codificación:\n";
    echo "admin -> " . codificarPassword('admin') . "\n";
    echo "1234 -> " . codificarPassword('1234') . "\n";
    echo "test -> " . codificarPassword('test') . "\n";
}

// Descomentar para probar
// testCodificarPassword();
?>
