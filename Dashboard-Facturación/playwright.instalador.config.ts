import { defineConfig } from '@playwright/test';

/**
 * e2e contra la app EMPAQUETADA (dist-electron/win-unpacked), no contra Vite.
 * Se corre con: npm run test:e2e:instalador
 * Requiere: build local (`npm run build && npx electron-builder --dir`) y
 * C:\ContaFT-pruebas\e2e.json (token de licencia del CRM —
 * fuera del repo).
 * Cada corrida usa un userData TEMPORAL (--user-data-dir): nunca toca la
 * configuración ni la BD reales del equipo.
 */
export default defineConfig({
  testDir: './e2e/instalador',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [['list'], ['json', { outputFile: 'e2e/report-instalador/resultado.json' }]],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  outputDir: 'e2e/report-instalador/artefactos',
});
