# Suite de pruebas de integración — Conta FT backend

## Propósito

Garantizar que los endpoints del backend se comportan como deben y detectar regresiones
antes de que lleguen al cliente. Son pruebas **de integración**, no unitarias: hacen HTTP
real contra Apache + verifican efectos en MySQL, igual que una app real.

## Cómo correr

```bash
# Correr toda la suite
php tests/run.php

# Correr una sola prueba
php tests/run.php test_fe_no_duplica_stock
```

Un test exitoso imprime `[PASS]`. Uno fallido imprime `[FAIL]` + razón específica.

## Infraestructura

- **BD**: `conta_test` (NUNCA toca `conta_innovacion` ni ninguna BD de cliente). Antes de
  cada test se **resetea** desde `tests/fixtures/conta_test_base.sql`.
- **Backend**: Apache sirviendo `C:\WebServer\Apache24\htdocs\conta-app-backend\`. Durante
  las pruebas, `database.php` apunta a `conta_test`.
- **DIAN**: no se llama a la API real. Las pruebas que necesitan FE autorizada usan el flag
  `DIAN_TEST_MODE=1` que simula una respuesta success.

## Cómo escribir un test nuevo

Crear archivo en `tests/cases/test_<nombre>.php` que extienda `TestCase`:

```php
<?php
require_once __DIR__ . '/../lib/TestCase.php';

class Test_Mi_Caso extends TestCase {
    public function run() {
        // 1. Setup — insertar datos iniciales en $this->db
        // 2. Act — hacer una llamada HTTP via $this->postJson(...)
        // 3. Assert — verificar efectos con $this->assertEquals(...)
    }
}
```

El runner descubre todos los `test_*.php` automáticamente.

## Reglas de oro

1. **Independencia**: cada test debe funcionar aislado, sin depender del orden.
2. **Idempotencia**: la BD se resetea antes de cada test — no asumir estado previo.
3. **Un test, un bug**: cada bug corregido debería tener su test de regresión aquí.
4. **Rápido**: < 10 segundos por test. Si tarda más, revisar.

## Cuándo correrlos

- Antes de cada build que vaya a clientes.
- Antes de pushear a `main`.
- Cada vez que se arregle un bug — agregar el test que lo cubre.
