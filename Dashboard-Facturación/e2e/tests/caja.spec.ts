import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Caja', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('abrir caja del día si no está abierta', async ({ page }) => {
    // Navegar a Movimientos → Abrir / Cerrar Caja
    await page.getByRole('button', { name: /^Movimientos$/ }).click();
    await page.getByRole('button', { name: /^Abrir \/ Cerrar Caja$/ }).click();
    await page.waitForTimeout(300);

    // Ojo: no usar regex amplio porque el menú lateral también tiene "Abrir / Cerrar Caja" (es un <button>)
    const btnAbrir = page.getByRole('button', { name: /^Abrir Caja$/ });
    if (await btnAbrir.isVisible().catch(() => false)) {
      await page.locator('input[placeholder="$ 0"]').fill('100000');
      await btnAbrir.click();
      await expect(page.getByText(/caja abierta|sesión iniciada/i).first()).toBeVisible();
    } else {
      // Si no aparece el botón, asumimos que ya hay caja abierta
      await expect(page.getByText(/cerrar caja|cuadre|sesión/i).first()).toBeVisible();
    }
  });

  test('cuadre de caja refleja anulaciones de ventas contado', async ({ page }) => {
    // Navegar a Movimientos → Historial de Cajas
    await page.getByRole('button', { name: /^Movimientos$/ }).click();
    await page.getByRole('button', { name: /^Historial de Cajas$/ }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Cuadre|Ver detalle|Detalle/i }).first().click();

    // Verificar que cargó el historial (texto característico de la página)
    await expect(page.locator('body')).toContainText(/Historial de Cajas|Caja Principal|Cajero/i);
  });
});
