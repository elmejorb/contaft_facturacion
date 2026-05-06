import { Page } from '@playwright/test';

/* =========================================================
   USUARIO DE PRUEBA — AJUSTAR ANTES DE EJECUTAR
   ========================================================= */
const TEST_USER = process.env.TEST_USER ?? 'root';
const TEST_PASS = process.env.TEST_PASS ?? '1234';

export async function login(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Ingrese su usuario').fill(TEST_USER);
  await page.getByPlaceholder('••••••••').fill(TEST_PASS);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
  // Esperar que el dashboard cargue (sidebar con "Inicio" visible)
  await page.getByRole('button', { name: /^Inicio$/ }).waitFor({ state: 'visible', timeout: 10000 });
}

export async function logout(page: Page) {
  // Placeholder: ajustar según la UI real del dashboard
  // await page.getByRole('button', { name: /Cerrar sesión|Salir/i }).click();
}
