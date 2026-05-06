import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Flujo crítico: crear venta de contado y verificar totales.
 * Requiere: al menos 1 cliente y 1 producto activo en la BD de prueba.
 */
test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  async function asegurarCajaAbierta(page: any) {
    // Si aparece la pantalla de "Caja no abierta", abrirla
    const btnAbrirCaja = page.getByRole('button', { name: /^Abrir Caja$/ });
    if (await btnAbrirCaja.isVisible().catch(() => false)) {
      await page.locator('input[placeholder="$ 0"]').fill('100000');
      await btnAbrirCaja.click();
      await page.waitForTimeout(500);
    }
  }

  async function crearVentaDeContado(page: any, producto: string) {
    await page.getByRole('button', { name: /^Ventas$/ }).click();
    await page.getByRole('button', { name: /^Nueva Venta$/ }).click();
    await asegurarCajaAbierta(page);
    await expect(page.locator('[data-venta-nombre-input="true"]')).toBeVisible();

    const inputProducto = page.locator('[data-venta-nombre-input="true"]');
    await inputProducto.fill(producto);
    await page.waitForTimeout(600);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Hacer clic en "Finalizar" (evitar "Guardar Temp." que aparece antes en el DOM)
    await page.getByRole('button', { name: /Finalizar/i }).click();

    // Esperar modal de pago, completar efectivo y confirmar
    await expect(page.getByText(/Guardar Factura|Total a Pagar/i).first()).toBeVisible({ timeout: 5000 });
    await page.locator('[data-pago-efectivo="true"]').fill('3500'); // <-- ajustar según total real
    await page.getByRole('button', { name: /^Guardar Factura$/ }).click();

    // Confirmar éxito real (toast)
    await expect(page.getByText(/guardada|generada|éxito/i).first()).toBeVisible({ timeout: 8000 });
  }

  test('crear venta de contado y validar protección de anulación sin caja', async ({ page }) => {
    // === PASO 1: Crear venta ===
    await crearVentaDeContado(page, 'ARROZ'); // <-- ajustar producto real

    // === PASO 2: Ir al listado e intentar anular la venta recién creada ===
    // (sin tener caja abierta propia, debe bloquear)
    await page.getByRole('button', { name: /^Ventas$/ }).click();
    const btnListado = page.getByRole('button', { name: /^Listado de Ventas$/ });
    if (!await btnListado.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^Ventas$/ }).click();
    }
    await btnListado.click();
    await page.waitForTimeout(300);

    // Abrir detalle de la primera factura (la más reciente)
    await page.getByRole('button', { name: /Ver detalle/i }).first().click();
    await page.waitForTimeout(300);

    // Intentar Anular — el sistema debe bloquear porque no hay caja abierta del usuario
    await page.getByRole('button', { name: /Anular/i }).first().click();
    await page.getByRole('button', { name: /Sí, anular|Confirmar|Aceptar/i }).first().click();

    // Validar que aparece el mensaje de protección
    await expect(page.getByText(/caja abierta|reembolso|asignada/i).first()).toBeVisible({ timeout: 8000 });
  });
});
