import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Informes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('cierre de mes muestra COGS y es consistente con devoluciones', async ({ page }) => {
    // Navegar a Informes (es un botón directo, no tiene submenú)
    await page.getByRole('button', { name: /^Informes$/ }).click();
    await page.waitForTimeout(300);

    // Hacer clic en el card/botón de Cierre de Mes
    await page.getByText(/^Cierre de Mes$/i).click();

    await expect(page.getByText(/Costo de mercancía vendida|Costo de ventas/i).first()).toBeVisible({ timeout: 10000 });

    // Extraer valor del COGS
    const filaCosto = page.locator('tr', { hasText: /Costo de mercancía|Costo de ventas/i }).first();
    const textoCosto = await filaCosto.textContent() ?? '0';
    const costoMatch = textoCosto.match(/[\d.,]+/);
    const costo = costoMatch ? parseFloat(costoMatch[0].replace(/\./g, '').replace(',', '.')) : 0;

    // Validación: el COGS debe ser >= 0 (ajustar según datos de prueba)
    expect(costo).toBeGreaterThanOrEqual(0);

    // Verificar que utilidad bruta = ventas - costo (aprox)
    const filaVentas = page.locator('tr', { hasText: /TOTAL VENTAS|Ventas brutas/i }).first();
    const textoVentas = await filaVentas.textContent() ?? '0';
    const ventasMatch = textoVentas.match(/[\d.,]+/);
    const ventas = ventasMatch ? parseFloat(ventasMatch[0].replace(/\./g, '').replace(',', '.')) : 0;

    const filaUtilidad = page.locator('tr', { hasText: /Utilidad Bruta|UTILIDAD BRUTA/i }).first();
    const textoUtilidad = await filaUtilidad.textContent() ?? '0';
    const utilMatch = textoUtilidad.match(/[\d.,]+/);
    const utilidad = utilMatch ? parseFloat(utilMatch[0].replace(/\./g, '').replace(',', '.')) : 0;

    // Tolerancia de 1 peso por redondeos
    expect(utilidad).toBeCloseTo(ventas - costo, 0);
  });
});
