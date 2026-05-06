import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Autenticación', () => {
  test('login exitoso con credenciales válidas', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\//);
  });

  test('login fallido con credenciales inválidas', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Ingrese su usuario').fill('usuario_falso');
    await page.getByPlaceholder('••••••••').fill('clave_falsa');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
    await expect(page.getByText(/incorrecto|error/i)).toBeVisible();
  });
});
