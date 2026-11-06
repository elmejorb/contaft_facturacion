# Autenticación, usuarios, permisos y módulos opcionales

**Propósito:** inicio de sesión contra `tblusuarios` con la codificación de claves heredada de VB6, autorización puntual de un administrador para acciones sensibles, gestión de usuarios y tipos de usuario con su lista de permisos, y activación de módulos opcionales locales (nómina, financiaciones). Los módulos comerciales (FE, vendedores, sincronización) los decide el CRM (entitlements, ver electron-main.md y frontend-shell.md).
**Pantallas (frontend):**
- `components/LoginPage.tsx` → `contexts/AuthContext.tsx:46-95` (login), `:104-108` (logout). Se muestra desde `App.tsx:96-98` si no hay sesión.
- `components/AutorizacionAdminModal.tsx` (modal reusable) usado en CajaRegistradora, DetalleCompraModal, DetalleDocElectronico, DetalleFacturaModal, ListadoPagos, NuevaVenta, SalesManagement.
- `components/UsuariosManagement.tsx` (menú Configuración → Usuarios, id `config-usuarios`, permiso `usuarios`, Dashboard.tsx:843).
- `components/ConfigPermisos.tsx` (Configuración → Permisos, id `config-permisos`, permiso `usuarios`, Dashboard.tsx:843).
- `components/ConfigModulos.tsx` (Configuración → Módulos, id `config-modulos`, permiso `configuracion`); `hooks/useModulos.ts` (Dashboard.tsx:594).
- Modal "Cambiar contraseña" del menú de usuario en `components/Dashboard.tsx:1690-1710`.
**Endpoints (backend):**
- `api/auth/login.php` POST `{username, password(codificada)}`
- `api/auth/verify-admin.php` POST `{username, password(codificada)}`
- `api/usuarios/listar.php` GET (`action=list` por defecto | `action=tipos`); POST `action=create|update|cambiar-pass|delete`
- `api/usuarios/permisos.php` GET; POST `action=guardar`
- `api/modulos/estado.php` GET; POST `action=activar|desactivar`

## Flujos principales

- **Operación:** Iniciar sesión
- **Pantalla → endpoint:** LoginPage.tsx:23 → AuthContext.tsx:46-55 → `auth/login.php` POST. La URL es `VITE_API_URL || 'http://localhost:80/conta-app-backend/api'` (AuthContext.tsx:49) reescrita por el interceptor de `config/api.ts` (ver frontend-shell.md).
- **Lee:** tblusuarios (Id_Usuario, Usuario, contrasena, Id_TiposUsuario, Nombre) por `Usuario = :usuario` (login.php:40-55); tbltiposusuario.permisos (login.php:78-81).
- **Escribe:** ninguna tabla. Frontend: `sessionStorage.token`, `sessionStorage.user` (AuthContext.tsx:63-64).
- **Efectos colaterales:** dispara sin esperar POST `actualizacion/aplicar-sql.php {version}` (AuthContext.tsx:72-91) → puede ejecutar `actualizacion_completa.sql` completo sobre la BD (ver mantenimiento-migraciones-backup.md). Monta el Dashboard (setUser, AuthContext.tsx:65).
- **Transacción:** no.
- **Consecutivos:** n/a. Token `bin2hex(random_bytes(32))` (login.php:61) que **no se persiste en ningún lado** del backend.
- **Rol:** `Id_TiposUsuario` 1=Administrador, 2=Vendedor, 3=Supervisor, otro="Usuario" (login.php:64-75). Permisos: JSON de `tbltiposusuario.permisos`; si es NULL → admin recibe lista fija de 26 ids (login.php:84-85), otros `['ventas','ventas_listado','clientes','caja']` (login.php:86-87).
- **Validaciones solo en frontend:** ninguna relevante; la contraseña llega ya codificada y se compara texto exacto (login.php:59).

- **Operación:** Autorizar acción sensible con admin (sin cambiar sesión)
- **Pantalla → endpoint:** AutorizacionAdminModal.tsx:6 (URL hardcodeada, reescrita por interceptor) → `auth/verify-admin.php` POST.
- **Lee:** tblusuarios (verify-admin.php:29-35).
- **Escribe:** nada (no deja auditoría de quién autorizó; el llamador decide si la guarda).
- **Efectos colaterales:** ninguno. Exige `Id_TiposUsuario === 1` (verify-admin.php:47-51). Método distinto de POST → 405 (verify-admin.php:13-17).
- **Transacción:** no.
- **Validaciones solo en frontend:** **toda la autorización**: el endpoint protegido (anulación, devolución, override de cupo) no recibe ni verifica prueba de la autorización; el modal solo devuelve `admin` al componente (sin verificar caso por caso en cada endpoint consumidor; grep de `verify-admin` en api/ solo encuentra el propio archivo).

- **Operación:** Listar usuarios / tipos
- **Pantalla → endpoint:** UsuariosManagement.tsx:29 → `usuarios/listar.php` GET.
- **Lee:** tblusuarios LEFT JOIN tbltiposusuario, tblcajas (listar.php:16-24); tbltiposusuario; tblcajas `Activa=1` (listar.php:26-27). `action=tipos` solo tbltiposusuario (listar.php:10-14).
- **Escribe:** nada.

- **Operación:** Crear / editar / eliminar usuario
- **Pantalla → endpoint:** UsuariosManagement.tsx:57-65 (create/update), :93 (delete) → `usuarios/listar.php` POST.
- **Escribe:** tblusuarios INSERT (Usuario, Nombre, Indentificacion, contrasena codificada inline, Id_TiposUsuario default 2, Id_Caja) (listar.php:35-50); tblusuarios UPDATE (sin tocar contraseña) (listar.php:52-62); tblusuarios DELETE salvo Id_Usuario=1 (listar.php:74-79).
- **Efectos colaterales:** `Id_Caja` define la caja del cajero (modelo 1 caja = 1 usuario; lo consume caja/sesion.php, ver caja.md). Borrar un usuario deja huérfanos `id_usuario` en tblpagos, tblegresos, sesiones de caja, etc. (no hay FK ni verificación).
- **Transacción:** no.
- **Consecutivos:** AUTO_INCREMENT (`lastInsertId`, listar.php:50).
- **Validaciones solo en frontend:** unicidad de `Usuario` y campos requeridos (el backend no valida duplicados; sin verificar índice UNIQUE en esquema).

- **Operación:** Cambiar contraseña
- **Pantalla → endpoint:** UsuariosManagement.tsx:78-79 (admin) y Dashboard.tsx:1699-1702 (propio usuario, envía `contrasena_actual`) → `usuarios/listar.php` POST `cambiar-pass`.
- **Escribe:** tblusuarios UPDATE contrasena WHERE Id_Usuario (listar.php:64-72).
- **Validaciones solo en frontend:** coincidencia nueva/confirmación y longitud ≥4 (Dashboard.tsx:1695-1697). **`contrasena_actual` se ignora en el backend** (listar.php:64-72 no la lee).

- **Operación:** Configurar permisos por tipo
- **Pantalla → endpoint:** ConfigPermisos.tsx:16 GET / :47-48 POST `guardar` → `usuarios/permisos.php`.
- **Lee:** tbltiposusuario (permisos.php:47-68). Catálogo fijo de 31 ids en PHP `$modulosDisponibles` (permisos.php:12-44).
- **Escribe:** tbltiposusuario UPDATE permisos (JSON) (permisos.php:74-83).
- **Efectos colaterales:** surte efecto en el siguiente login (login.php:78-81 lo lee solo al autenticar; la sesión guarda la lista en sessionStorage).

- **Operación:** Aplicar permisos en la UI (sin endpoint)
- Dashboard.tsx:818-819: `tiene(p) = esAdmin || permisos.includes(p)`; `esAdmin` = tipoUsuario 1 (Dashboard.tsx:591). Mapa `menuPermisos` vista→permiso (Dashboard.tsx:822-846); filtro: admin ve todo, resto ve ítems cuyo permiso tiene **o que no están en el mapa** (Dashboard.tsx:857-870). Otros chequeos sueltos: DetalleFinanciacion.tsx:36-37, FinanciacionesManagement.tsx:26-27, ListadoPagos.tsx:452 (`pagos_editar_medio`, sin bypass de admin), NotasArticulo.tsx:22-23.

- **Operación:** Activar / desactivar módulo opcional local
- **Pantalla → endpoint:** ConfigModulos.tsx:189-191 (manual) y :229-245 (auto-activación silenciosa cuando root abre la pantalla y `localStorage` tiene el flag legacy) → `modulos/estado.php` POST.
- **Lee:** tbl_modulos_activos; tbldatosempresa.modulo_financiaciones (estado.php:39-51).
- **Escribe:** tbl_modulos_activos INSERT/UPDATE Activo, Fecha_Activacion (estado.php:97-105, 119-120); tbldatosempresa UPDATE modulo_financiaciones (estado.php:108-110, 121-123); para `nomina` ejecuta **todo** `sql/modulo_nomina.sql` con `PDO::exec` (estado.php:77-92).
- **Efectos colaterales:** `triggerModulosRefresh()` → evento `modulos:refresh` (useModulos.ts:43-44) → Dashboard muestra/oculta "Nómina" (Dashboard.tsx:763). Financiaciones en el menú NO usa esta tabla sino `localStorage.config_sistema.usarFinanciaciones` (Dashboard.tsx:644, 852).
- **Transacción:** no (DDL del módulo + flag sin atomicidad).
- **Validaciones solo en frontend:** el "solo root" del backend compara `usuario` enviado en el body (estado.php:60-67) — es el frontend quien manda `user.username` (ConfigModulos.tsx:191); cualquier cliente HTTP puede enviar `usuario:'root'`.

## Dependencias
- **Usa de otros módulos:** `config/database.php`, `config/helpers_polyfill.php` (`conta_tiene_tabla`, estado.php:15,29), `utils/passwordEncoder.php` (login.php:8). Tablas: tblcajas (caja), tbldatosempresa (empresa). Archivo `sql/modulo_nomina.sql` (nómina).
- **Lo usan otros módulos:** `tblusuarios` lo leen anticipos/index.php, bodegas/index.php, caja/estado.php, caja/movimientos.php, caja/sesion.php, compras/anular.php, compras/nueva.php, financiaciones/index.php, informes/resumen.php, movimientos/bancos.php, movs-directos/listar.php, notas-articulo/index.php, ordenes-compra/detalle.php, ventas/detalle-factura.php, ventas/listar.php (grep). `tbltiposusuario` también compras/nueva.php. `user.id` de sessionStorage lo envían muchos componentes como `id_usuario`/`usuario` (p.ej. App.tsx:38-39 → caja/sesion.php). `tbl_modulos_activos` solo modulos/estado.php.
- **Triggers / vistas de BD involucrados:** ninguno. Esquema: `tbltiposusuario.permisos` (actualizacion_completa.sql:307-312), `tblusuarios.Id_Caja` (actualizacion_completa.sql:635-640), `tbl_modulos_activos` + seed `nomina`/`financiaciones` (actualizacion_completa.sql:2187-2205).
- **Compatibilidad:** login/permisos/listar son SQL portable. `modulos/estado.php` en SQLite: `tbl_modulos_activos` no está en `schema_sqlite_cliente.sql` ni `migraciones_sqlite.sql` (grep vacío) → GET devuelve `modulos:[]` con warning (estado.php:29-36) → Nómina nunca aparece en embebido; activar `nomina` ejecutaría SQL MySQL sobre SQLite (sin verificar). `tbltiposusuario.permisos` sí existe en SQLite (schema_sqlite_cliente.sql:2036).

## Qué se rompe si lo tocas
- Cambiar la forma de `user` en login.php:94-100 (`id`, `tipoUsuario`, `permisos`, `username`) rompe: `esAdmin/esVendedor` (Dashboard.tsx:591-592), filtrado de menú (Dashboard.tsx:818-870), cierre con caja abierta (App.tsx:38-39), "solo root" en ConfigModulos.tsx:178 y ConfiguracionSistema.tsx:240.
- Renombrar un id de permiso en `permisos.php:12-44` sin cambiar `menuPermisos` (Dashboard.tsx:822-846) y viceversa: el ítem queda oculto para todos los no-admin o visible para todos (regla "sin mapeo = permitido", Dashboard.tsx:864-869).
- Cambiar la lista por defecto del admin en login.php:85 solo afecta a admins con `permisos` NULL, pero como `tiene()` hace bypass de admin no tiene efecto en el menú; sí en ListadoPagos.tsx:452 que NO hace bypass.
- Cambiar `Id_TiposUsuario=1` como "admin" rompe verify-admin.php:47 y todo el gating.
- Agregar un módulo a `$MODULO_SQL` (estado.php:21-24) sin su `.sql` en `conta-app-backend/sql/` → activar falla con mensaje (estado.php:79-81).

## Evaluación de la implementación
**Confirmado (leído en código):**
- No existe sesión en backend: el token del login no se guarda ni se valida (login.php:61; ningún endpoint lee Authorization). Toda la autorización (rol, permisos, root, admin) es visual en el frontend. Cualquier endpoint es invocable sin login.
- `cambiar-pass` cambia la contraseña de cualquier `Id_Usuario` sin verificar la actual (listar.php:64-72), aunque el frontend la envía (Dashboard.tsx:1702).
- "Solo root" de módulos se basa en el campo `usuario` del body (estado.php:60-67).
- El permiso `informes` está en `menuPermisos` (Dashboard.tsx:845) pero no en el catálogo de permisos.php:12-44 ni en la lista por defecto del admin → un no-admin nunca puede ver Informes.
- Permisos en el catálogo sin mapeo de menú o sin uso: `compras_editar` sí se usa (Dashboard.tsx:836); `pagos_editar_medio` solo en ListadoPagos.tsx:452 y sin bypass de admin: un admin con permisos por defecto (login.php:85 no lo incluye) no puede editar medio de pago.
- Permisos se congelan al login (sessionStorage): cambios en ConfigPermisos no aplican hasta re-login.
- Claves almacenadas con codificación reversible VB6 (passwordEncoder.php); create/cambiar-pass codifican por bytes UTF-8 y el login por code units UTF-16 → claves con `ñ`/tildes creadas desde la UI no permiten login (ver backend-core.md).
- `verify-admin.php` responde "Usuario no encontrado" vs "Contraseña incorrecta" (verify-admin.php:37-44) → enumeración de usuarios.
- DELETE de usuario físico sin chequear referencias (listar.php:74-79); solo protege Id 1.
- ConfigModulos auto-activa módulos al abrir la pantalla como root si `localStorage` dice activo (ConfigModulos.tsx:226-245): un flag local de un PC cambia la BD compartida de todos.
- Dos fuentes de verdad para financiaciones: `tbl_modulos_activos` + `tbldatosempresa.modulo_financiaciones` + `localStorage.config_sistema.usarFinanciaciones`; el menú usa solo el localStorage (Dashboard.tsx:644).

**Sospecha:**
- Activar `nomina` en SQLite ejecuta `modulo_nomina.sql` (MySQL) con `PDO::exec`; probablemente falla o deja el esquema a medias (sin verificar).
- `Usuario` sin índice UNIQUE permitiría duplicados y el login tomaría el primero (sin verificar esquema).

**Contraste con PROCESOS_SISTEMA.md:** el contrato no regula autenticación. Sí depende de esta capa la regla de override de cupo "requiere override admin" (PROCESOS_SISTEMA.md §2.2 POS): hoy el override se valida solo en el frontend vía AutorizacionAdminModal; el backend de ventas no recibe prueba de autorización (ver ventas-pos.md).
