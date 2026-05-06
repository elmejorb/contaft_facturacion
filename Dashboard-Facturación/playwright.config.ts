import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para probar Conta FT 4.2
 * Ejecuta contra el servidor de desarrollo Vite (npm run dev)
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Flujos dependen de estado (caja, sesión)
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e/report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
