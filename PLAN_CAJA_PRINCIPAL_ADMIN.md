# Plan de Implementación — Caja Principal Administrativa
**Proyecto:** ContaFT (Electron + React + PHP/MySQL)  
**Fecha:** 2026-05-05  
**Estado actual:** La Caja Principal se comporta igual que una caja operativa (permite abrir/cerrar sesión). Debe convertirse en una caja administrativa: sin sesión, solo traslados y movimientos directos.

---

## Contexto del sistema actual

### Tablas relevantes
```sql
-- tblcajas
Id_Caja INT PK
Nombre  VARCHAR(50)
Tipo    ENUM('punto_venta', 'principal')  -- YA existe esta distinción
Activa  TINYINT(1)
Saldo   DECIMAL(19,4)   -- saldo acumulado (solo se usa para principal)
FechaCreacion DATETIME

-- tblsesiones_caja
Id_Sesion INT PK
Id_Caja   INT FK
Id_Usuario INT FK
FechaApertura DATETIME
FechaCierre   DATETIME NULL
BaseInicial   DECIMAL
VentasContadoEfectivo DECIMAL
...
Estado  ENUM('abierta','cerrada')

-- tblmov_caja
Id_Mov    INT PK
Id_Sesion INT NULL        -- NULL cuando el movimiento es directo (sin sesión)
Id_Caja_Origen  INT NULL
Id_Caja_Destino INT NULL
Id_Usuario INT
Fecha  DATETIME
Valor  DECIMAL
Tipo   ENUM('retiro_parcial','traslado','deposito','gasto')
Descripcion VARCHAR(255)
```

### Archivos a modificar
| Archivo | Rol |
|---|---|
| `conta-app-backend/api/caja/sesion.php` | Abrir/cerrar sesiones |
| `conta-app-backend/api/caja/movimientos.php` | Movimientos directos (ingreso/egreso/traslado) |
| `Dashboard-Facturación/src/components/CajaRegistradora.tsx` | UI principal de caja |
| `Dashboard-Facturación/src/components/ConfigCajas.tsx` | Crear/listar cajas |

### Sin migraciones SQL necesarias
La estructura de base de datos ya soporta el modelo. `tblcajas.Tipo='principal'` existe. `tblmov_caja.Id_Sesion` ya es nullable. El ENUM de Tipo en `tblmov_caja` ya tiene `deposito` y `gasto` que sirven para movimientos administrativos directos.

---

## CAMBIO 1 — Backend: `api/caja/sesion.php`

### Objetivo
Bloquear que la Caja Principal (Tipo='principal') pueda abrir o cerrar una sesión operativa.

### Dónde agregar el bloqueo

Dentro de la sección `if ($_SERVER['REQUEST_METHOD'] === 'POST')`, en los casos `action=abrir` y `action=cerrar`, agregar ANTES de cualquier otra lógica:

```php
// --- CAMBIO: bloquear apertura de sesión en caja principal ---
// En action=abrir, DESPUÉS de leer caja_id pero ANTES de insertar sesión:

$tipo_caja_check = $pdo->prepare("SELECT Tipo FROM tblcajas WHERE Id_Caja = ?");
$tipo_caja_check->execute([$caja_id]);
$tipo_row = $tipo_caja_check->fetch(PDO::FETCH_ASSOC);
if ($tipo_row && $tipo_row['Tipo'] === 'principal') {
    http_response_code(400);
    echo json_encode(['error' => 'La caja principal no admite apertura de sesión. Use movimientos administrativos.']);
    exit;
}
```

Lo mismo en `action=cerrar` pero verificando a partir del `Id_Sesion` → obtener `Id_Caja` → verificar Tipo:

```php
// En action=cerrar, DESPUÉS de leer sesion_id pero ANTES de actualizar:
$tipo_sesion_check = $pdo->prepare(
    "SELECT c.Tipo FROM tblsesiones_caja s 
     JOIN tblcajas c ON s.Id_Caja = c.Id_Caja 
     WHERE s.Id_Sesion = ?"
);
$tipo_sesion_check->execute([$sesion_id]);
$tipo_sesion_row = $tipo_sesion_check->fetch(PDO::FETCH_ASSOC);
if ($tipo_sesion_row && $tipo_sesion_row['Tipo'] === 'principal') {
    http_response_code(400);
    echo json_encode(['error' => 'La caja principal no tiene sesiones operativas.']);
    exit;
}
```

---

## CAMBIO 2 — Backend: `api/caja/movimientos.php`

### Objetivo
Asegurar que `action=ingreso` y `action=egreso` actualicen correctamente el saldo de la caja destino/origen, especialmente para la Caja Principal que no tiene sesión.

### Verificar/agregar en `action=ingreso`

El movimiento debe:
1. Insertar en `tblmov_caja` con `Id_Sesion = NULL`, `Id_Caja_Destino = $caja_id`, Tipo = `'deposito'`
2. Actualizar `tblcajas.Saldo += $valor` WHERE `Id_Caja = $caja_id`

```php
case 'ingreso':
    $caja_id    = intval($_POST['caja_id'] ?? 0);
    $valor      = floatval($_POST['valor'] ?? 0);
    $descripcion = trim($_POST['descripcion'] ?? '');
    $usuario_id = intval($_POST['usuario_id'] ?? 0);

    if (!$caja_id || $valor <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        // Insertar movimiento
        $stmt = $pdo->prepare(
            "INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Destino, Id_Usuario, Fecha, Valor, Tipo, Descripcion)
             VALUES (NULL, ?, ?, NOW(), ?, 'deposito', ?)"
        );
        $stmt->execute([$caja_id, $usuario_id, $valor, $descripcion]);

        // Actualizar saldo de la caja (para caja principal acumula)
        $pdo->prepare("UPDATE tblcajas SET Saldo = Saldo + ? WHERE Id_Caja = ?")
            ->execute([$valor, $caja_id]);

        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    break;
```

### Verificar/agregar en `action=egreso`

```php
case 'egreso':
    $caja_id    = intval($_POST['caja_id'] ?? 0);
    $valor      = floatval($_POST['valor'] ?? 0);
    $descripcion = trim($_POST['descripcion'] ?? '');
    $usuario_id = intval($_POST['usuario_id'] ?? 0);

    if (!$caja_id || $valor <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos incompletos']);
        exit;
    }

    // Verificar saldo suficiente en caja principal
    $saldo_row = $pdo->prepare("SELECT Saldo FROM tblcajas WHERE Id_Caja = ?");
    $saldo_row->execute([$caja_id]);
    $saldo_actual = floatval($saldo_row->fetchColumn() ?? 0);

    if ($saldo_actual < $valor) {
        http_response_code(400);
        echo json_encode(['error' => 'Saldo insuficiente en la caja. Saldo: ' . number_format($saldo_actual, 0, ',', '.')]);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO tblmov_caja (Id_Sesion, Id_Caja_Origen, Id_Usuario, Fecha, Valor, Tipo, Descripcion)
             VALUES (NULL, ?, ?, NOW(), ?, 'gasto', ?)"
        );
        $stmt->execute([$caja_id, $usuario_id, $valor, $descripcion]);

        $pdo->prepare("UPDATE tblcajas SET Saldo = Saldo - ? WHERE Id_Caja = ?")
            ->execute([$valor, $caja_id]);

        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    break;
```

### Nuevo endpoint GET para movimientos de la caja principal

Agregar en la sección GET de `movimientos.php`:

```php
// GET ?caja_principal=1  → devuelve historial de movimientos de la caja principal
if (isset($_GET['caja_principal'])) {
    $stmt = $pdo->prepare(
        "SELECT m.Id_Mov, m.Fecha, m.Tipo, m.Valor, m.Descripcion,
                u.Nombre AS cajero,
                c_ori.Nombre AS caja_origen,
                c_des.Nombre AS caja_destino
         FROM tblmov_caja m
         LEFT JOIN tblusuarios u ON m.Id_Usuario = u.Id_Usuario
         LEFT JOIN tblcajas c_ori ON m.Id_Caja_Origen = c_ori.Id_Caja
         LEFT JOIN tblcajas c_des ON m.Id_Caja_Destino = c_des.Id_Caja
         JOIN tblcajas cp ON (m.Id_Caja_Origen = cp.Id_Caja OR m.Id_Caja_Destino = cp.Id_Caja)
                         AND cp.Tipo = 'principal'
         ORDER BY m.Fecha DESC
         LIMIT 100"
    );
    $stmt->execute();
    echo json_encode(['movimientos' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}
```

---

## CAMBIO 3 — Frontend: `CajaRegistradora.tsx`

Este es el cambio más grande. El componente debe detectar si la caja seleccionada es `Tipo='principal'` y renderizar una UI completamente diferente.

### Paso 3.1 — Detectar tipo de caja

Agregar este cálculo derivado basado en el estado ya existente de `cajas`:

```tsx
const esCajaPrincipal = useMemo(() => {
  const caja = cajas.find((c: any) => c.Id_Caja === cajaSeleccionada);
  return caja?.Tipo === 'principal';
}, [cajas, cajaSeleccionada]);
```

### Paso 3.2 — Nuevos estados para la UI de Caja Principal

```tsx
// Estado para movimientos directos de caja principal
const [movsPrincipal, setMovsPrincipal] = useState<any[]>([]);
const [showIngresoPrincipal, setShowIngresoPrincipal] = useState(false);
const [showEgresoPrincipal, setShowEgresoPrincipal]   = useState(false);
const [montoMov, setMontoMov]       = useState('');
const [descMov, setDescMov]         = useState('');
const [loadingMov, setLoadingMov]   = useState(false);
```

### Paso 3.3 — Cargar movimientos de la caja principal

Crear una función que se llama cuando `esCajaPrincipal === true`:

```tsx
const cargarMovsPrincipal = async () => {
  try {
    const res = await axios.get(`${apiUrl}/caja/movimientos.php?caja_principal=1`);
    setMovsPrincipal(res.data.movimientos ?? []);
  } catch { /* silencioso */ }
};
```

Llamar desde `useEffect` cuando cambie `cajaSeleccionada`:

```tsx
useEffect(() => {
  if (esCajaPrincipal) {
    cargarMovsPrincipal();
  } else {
    cargar(); // función existente para cajas operativas
  }
}, [cajaSeleccionada, esCajaPrincipal]);
```

### Paso 3.4 — Funciones para ingresos y egresos en principal

```tsx
const registrarIngresoPrincipal = async () => {
  const valor = parseFloat(montoMov.replace(/\./g, '').replace(',', '.'));
  if (!valor || valor <= 0 || !descMov.trim()) return;
  setLoadingMov(true);
  try {
    await axios.post(`${apiUrl}/caja/movimientos.php`, new URLSearchParams({
      action:      'ingreso',
      caja_id:     String(cajaSeleccionada),
      valor:       String(valor),
      descripcion: descMov,
      usuario_id:  String(usuario?.Id_Usuario ?? 0),
    }));
    toast.success('Ingreso registrado');
    setShowIngresoPrincipal(false);
    setMontoMov(''); setDescMov('');
    cargarMovsPrincipal();
    cargarCajas(); // refrescar saldo en el panel
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Error al registrar ingreso');
  } finally { setLoadingMov(false); }
};

const registrarEgresoPrincipal = async () => {
  const valor = parseFloat(montoMov.replace(/\./g, '').replace(',', '.'));
  if (!valor || valor <= 0 || !descMov.trim()) return;
  setLoadingMov(true);
  try {
    await axios.post(`${apiUrl}/caja/movimientos.php`, new URLSearchParams({
      action:      'egreso',
      caja_id:     String(cajaSeleccionada),
      valor:       String(valor),
      descripcion: descMov,
      usuario_id:  String(usuario?.Id_Usuario ?? 0),
    }));
    toast.success('Egreso registrado');
    setShowEgresoPrincipal(false);
    setMontoMov(''); setDescMov('');
    cargarMovsPrincipal();
    cargarCajas();
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Error al registrar egreso');
  } finally { setLoadingMov(false); }
};
```

### Paso 3.5 — UI de Caja Principal (render condicional)

En el JSX principal del componente, donde actualmente se renderiza siempre la misma UI, agregar la bifurcación:

```tsx
return (
  <div style={{ padding: 16 }}>
    {/* Selector de caja (solo admin) — sin cambios */}
    {/* ... dropdown existente ... */}

    {esCajaPrincipal ? (
      /* ===================== UI CAJA PRINCIPAL ===================== */
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Badge administrativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            background: '#1e40af', color: '#fff',
            borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600
          }}>
            ADMINISTRATIVA
          </span>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            No tiene sesiones operativas · Solo recibe traslados y movimientos directos
          </span>
        </div>

        {/* Saldo actual */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, padding: '20px 24px', marginBottom: 20, textAlign: 'center'
        }}>
          <div style={{ fontSize: 13, color: '#3b82f6', marginBottom: 4 }}>Saldo acumulado</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1e40af' }}>
            ${formatCurrency(cajas.find((c: any) => c.Id_Caja === cajaSeleccionada)?.Saldo ?? 0)}
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => { setShowIngresoPrincipal(true); setMontoMov(''); setDescMov(''); }}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            + Ingreso administrativo
          </button>
          <button
            onClick={() => { setShowEgresoPrincipal(true); setMontoMov(''); setDescMov(''); }}
            style={{
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            − Egreso administrativo
          </button>
        </div>

        {/* Historial de movimientos */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
          Movimientos recientes
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', color: '#6b7280' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descripción / Origen</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {movsPrincipal.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#9ca3af' }}>
                  Sin movimientos registrados
                </td>
              </tr>
            )}
            {movsPrincipal.map((m: any) => {
              const esIngreso = ['traslado', 'deposito'].includes(m.Tipo);
              const etiqueta = {
                traslado: 'Traslado recibido',
                deposito: 'Ingreso admin',
                gasto:    'Egreso admin',
                retiro_parcial: 'Retiro',
              }[m.Tipo as string] ?? m.Tipo;

              const origen = m.caja_origen ?? m.cajero ?? '';
              const desc = m.Descripcion ? m.Descripcion : origen;

              return (
                <tr key={m.Id_Mov} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 8px', color: '#6b7280' }}>
                    {new Date(m.Fecha).toLocaleDateString('es-CO')}
                  </td>
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{
                      background: esIngreso ? '#dcfce7' : '#fee2e2',
                      color: esIngreso ? '#16a34a' : '#dc2626',
                      borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 600
                    }}>
                      {etiqueta}
                    </span>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#374151' }}>{desc}</td>
                  <td style={{
                    padding: '5px 8px', textAlign: 'right', fontWeight: 600,
                    color: esIngreso ? '#16a34a' : '#dc2626'
                  }}>
                    {esIngreso ? '+' : '−'} ${formatCurrency(Math.abs(m.Valor))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Modal Ingreso */}
        {showIngresoPrincipal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              background: '#fff', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Ingreso administrativo</h3>
              <label style={{ fontSize: 12, color: '#6b7280' }}>Descripción</label>
              <input
                value={descMov}
                onChange={e => setDescMov(e.target.value)}
                placeholder="Ej: Aporte de capital, préstamo..."
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12, fontSize: 13, boxSizing: 'border-box' }}
              />
              <label style={{ fontSize: 12, color: '#6b7280' }}>Monto</label>
              <input
                value={montoMov}
                onChange={e => setMontoMov(e.target.value)}
                placeholder="0"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16, fontSize: 13, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowIngresoPrincipal(false)}
                  style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarIngresoPrincipal}
                  disabled={loadingMov}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loadingMov ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Egreso — idéntico al de Ingreso pero llama registrarEgresoPrincipal */}
        {showEgresoPrincipal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              background: '#fff', borderRadius: 10, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Egreso administrativo</h3>
              <label style={{ fontSize: 12, color: '#6b7280' }}>Descripción</label>
              <input
                value={descMov}
                onChange={e => setDescMov(e.target.value)}
                placeholder="Ej: Pago servicios, gastos administrativos..."
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12, fontSize: 13, boxSizing: 'border-box' }}
              />
              <label style={{ fontSize: 12, color: '#6b7280' }}>Monto</label>
              <input
                value={montoMov}
                onChange={e => setMontoMov(e.target.value)}
                placeholder="0"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16, fontSize: 13, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowEgresoPrincipal(false)}
                  style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarEgresoPrincipal}
                  disabled={loadingMov}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {loadingMov ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      /* ===================== FIN UI CAJA PRINCIPAL ===================== */

    ) : (
      /* ===================== UI CAJA OPERATIVA (sin cambios) ===================== */
      /* ... todo el JSX actual de apertura, cierre, retiro, resumen queda aquí ... */
      <>{/* render existente */}</>
    )}
  </div>
);
```

---

## CAMBIO 4 — Frontend: `ConfigCajas.tsx`

### Objetivo
Evitar crear una segunda caja de tipo `principal`. Solo puede existir una.

### Cambio en la función de crear caja

Antes de hacer el POST, verificar si ya existe una principal:

```tsx
const crearCaja = async () => {
  if (!nombre.trim()) return;

  // Bloquear segunda caja principal
  if (tipo === 'principal') {
    const yaExiste = cajas.some((c: any) => c.Tipo === 'principal');
    if (yaExiste) {
      toast.error('Ya existe una Caja Principal. Solo puede haber una.');
      return;
    }
  }

  // ... resto del código de crear caja (sin cambios) ...
};
```

### Cambio visual en la lista de cajas

Agregar badge visual para cada tipo en la lista:

```tsx
// Junto al nombre de cada caja:
<span style={{
  background: caja.Tipo === 'principal' ? '#dbeafe' : '#d1fae5',
  color:      caja.Tipo === 'principal' ? '#1d4ed8' : '#065f46',
  borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600, marginLeft: 6
}}>
  {caja.Tipo === 'principal' ? 'Principal' : 'Punto venta'}
</span>
```

---

## CAMBIO 5 — Lógica de selección de caja en CajaRegistradora.tsx

Cuando el admin cambia de caja y elige la Principal, el dropdown debe mostrarla correctamente y NO intentar cargar una sesión activa (porque no la tendrá nunca).

En la función `cargar()` que actualmente hace `GET /api/caja/sesion.php?caja=N`, agregar protección:

```tsx
const cargar = async () => {
  if (esCajaPrincipal) {
    // No cargar sesión, cargar movimientos en su lugar
    await cargarMovsPrincipal();
    return;
  }
  // ... código existente de carga de sesión ...
};
```

---

## Resumen de cambios por archivo

| Archivo | Tipo de cambio | Líneas aproximadas |
|---|---|---|
| `api/caja/sesion.php` | Agregar validación en action=abrir y action=cerrar | ~15 líneas |
| `api/caja/movimientos.php` | Revisar/completar action=ingreso y action=egreso con UPDATE de Saldo; agregar GET ?caja_principal=1 | ~60 líneas |
| `CajaRegistradora.tsx` | Agregar 5 estados, 3 funciones, UI condicional completa | ~180 líneas |
| `ConfigCajas.tsx` | Validación al crear + badges visuales | ~15 líneas |

---

## Comportamiento final esperado

### Caja Principal (Tipo='principal')
- Admin la selecciona en el dropdown → ve UI azul con saldo grande
- Badge "ADMINISTRATIVA" prominente
- Dos botones: "Ingreso administrativo" / "Egreso administrativo"
- Tabla con historial: traslados recibidos de vendedores + ingresos/egresos directos
- NO aparece botón "Abrir Caja", NO aparece "Cerrar", NO aparece "Retiro"
- El backend rechaza con 400 cualquier intento de abrir/cerrar sesión en ella

### Cajas de vendedores (Tipo='punto_venta')
- Comportamiento 100% igual al actual (sin ningún cambio)
- Abrir, vender, hacer retiros, cerrar con cuadre

### Flujo de dinero correcto
```
[Apertura caja vendedor]
       ↓
[Ventas del día]
       ↓
[Cierre con cuadre] → traslado automático → [Caja Principal + Saldo]
                                                    ↑
                              [Ingreso admin: aporte gerente, préstamo, etc.]
                                                    ↓
                              [Egreso admin: gastos directos del gerente]
```

---

## Notas para el implementador

1. **`formatCurrency`**: ya existe en el proyecto como función helper para mostrar montos con separador de miles. Reutilizarla.
2. **`apiUrl`**: constante ya definida en el proyecto apuntando al backend PHP.
3. **`usuario`**: objeto del contexto de autenticación, ya disponible en el componente.
4. **`axios`**: ya está importado en `CajaRegistradora.tsx`.
5. **`toast`**: ya está configurado con `react-hot-toast` o `sonner` en el proyecto.
6. **Estilos**: el proyecto usa `inline styles` directamente (no Tailwind clases en componentes de negocio). Mantener ese patrón.
7. **No hace falta migración SQL**: el esquema ya soporta todo el modelo.
8. **Agregar a `actualizacion_completa.sql`**: aunque no hay DDL nuevo, documentar el cambio de comportamiento con un comentario de versión en ese archivo.

---

## Aclaración importante — Admins que quieren vender

**Un administrador que necesite cobrar en caja (vender) debe tener asignada una caja `punto_venta`, exactamente igual que un vendedor.**

### Regla de negocio
- La Caja Principal (`Tipo='principal'`) **nunca se usa para vender**. Es solo administrativa.
- Para vender, todo usuario —incluidos los admins— debe operar sobre una caja `punto_venta`.
- Un admin sin caja asignada puede **seleccionar cualquier caja punto_venta** del dropdown y abrirla (esto ya funciona así en el sistema actual).
- Si el admin quiere tener su propia caja fija (igual que un vendedor), se le asigna en `tblusuarios.Id_Caja` apuntando a una caja `punto_venta`. Esto ya existe en Configuración → Usuarios.

### Lo que NO debe hacerse
- ❌ Asignar la Caja Principal a un usuario como su caja operativa
- ❌ Abrir una sesión en la Caja Principal para registrar ventas

### En `ConfigPermisos` / `UsuariosManagement`
Al asignar caja a un usuario (admin o no), el selector de caja debe filtrar y mostrar **solo las cajas `Tipo='punto_venta'`**. La Caja Principal no debe aparecer como opción asignable a un usuario.

```php
// En api/usuarios o donde se lista cajas para asignar a usuario:
SELECT Id_Caja, Nombre FROM tblcajas WHERE Tipo = 'punto_venta' AND Activa = 1 ORDER BY Nombre
```

```tsx
// En el selector de caja dentro de UsuariosManagement o ConfigCajas:
// Solo mostrar cajas punto_venta en el dropdown de asignación
cajas.filter((c: any) => c.Tipo === 'punto_venta')
```

Esto aplica también al dropdown de selección de caja en `CajaRegistradora.tsx` cuando se crea una sesión: si el admin selecciona la Caja Principal e intenta abrirla, el backend ya la bloqueará (Cambio 1), y además la UI no debería mostrar el botón "Abrir Caja" para ese tipo (Cambio 3, render condicional).
