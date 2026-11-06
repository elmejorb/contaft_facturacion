// Constancia de pruebas del build (dist-electron/verificacion-build.json).
// La escribe scripts/pre-build-tests.mjs cuando todo pasa; la exige
// scripts/publicar-version.ps1 en el servidor antes de publicar.
//
// Uso directo:  node scripts/constancia.mjs --borrar
//   (electron:build:skip-tests lo llama para que un build SIN pruebas nunca
//    reutilice una constancia vieja).

import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
export const RUTA_CONSTANCIA = join(RAIZ, 'dist-electron', 'verificacion-build.json');

export function borrarConstancia() {
  if (existsSync(RUTA_CONSTANCIA)) rmSync(RUTA_CONSTANCIA, { force: true });
}

if (process.argv.includes('--borrar') && /constancia\.mjs$/i.test(process.argv[1] || '')) {
  borrarConstancia();
  console.log('[constancia] eliminada: ' + RUTA_CONSTANCIA + ' (build sin pruebas → sin constancia)');
}
