/**
 * Helpers de fecha en zona horaria LOCAL del navegador.
 *
 * NUNCA usar `new Date().toISOString().slice(0, 10)` para "fecha de hoy" —
 * eso devuelve UTC y, dependiendo de la hora, puede saltar al día siguiente
 * (en Colombia, después de las 7 PM ya muestra mañana).
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Fecha de hoy en formato YYYY-MM-DD según la zona horaria del navegador. */
export function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Primer día del mes actual en formato YYYY-MM-DD. */
export function inicioMesLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

/** Convierte cualquier Date a YYYY-MM-DD usando hora local. */
export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
