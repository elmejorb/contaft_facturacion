/**
 * Función para codificar contraseñas
 * Convierte cada carácter a su representación binaria de 7 dígitos
 * Equivalente a Cx4_CodificarDatos de VB6
 */
export function codificarPassword(texto: string): string {
  if (!texto) return '';

  let resultado = '';

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto.charAt(i);

    // Obtener código ASCII del carácter (equivalente a Asc en VB6)
    const codigoASCII = caracter.charCodeAt(0);

    // Convertir a binario
    let binario = codigoASCII.toString(2);

    // Rellenar con ceros a la izquierda para que tenga 7 dígitos
    while (binario.length < 7) {
      binario = '0' + binario;
    }

    resultado += binario;
  }

  return resultado;
}
