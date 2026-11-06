# Empresa — Datos, credenciales FE, token de suscripción, logo y consulta de adquiriente DIAN

**Propósito:** Mantener la ficha única de la empresa (`tbldatosempresa`): razón social, NIT, régimen e IVA incluido (que gobiernan el cálculo de IVA en ventas y FE), resolución/prefijo/rango, credenciales de la API de facturación electrónica, token de suscripción y logo. Incluye la consulta de datos de un comprador en el RUT/DIAN.

**Pantallas (frontend):**
- `components/DatosEmpresa.tsx`: carga/guarda (`:25-44`, `:50-62`), logo POST/DELETE (`:70-79`), select Régimen (`:199-204`), token (`:296-310`), credenciales FE (`:333-336`).
- `components/Dashboard.tsx:552` y `components/NuevaVenta.tsx:756`: GET `empresa/datos.php` para caché local (`saveEmpresaCache`, `ConfiguracionSistema.tsx:184`).
- `components/NuevaVenta.tsx:56` y `components/CustomersManagement.tsx:31`: `dian/consultar-adquiriente.php`.
- Token de suscripción: `configurar-token.php` invocado por el SubscriptionGate según comentario `configurar-token.php:11-13` (sin verificar componente).

**Endpoints (backend):** `empresa/datos.php` GET/POST; `empresa/logo.php` GET (sirve imagen) / POST (base64) / DELETE / OPTIONS; `empresa/configurar-token.php` POST; `dian/consultar-adquiriente.php` POST.

## Flujos principales

### 1. Leer / guardar datos de empresa
- **Pantalla → endpoint:** `DatosEmpresa.tsx:28` / `:57` → `datos.php`.
- **Lee:** `tbldatosempresa` `SELECT *` (`datos.php:8`) — devuelve TODO, incluidas `password_factelect` y `api_token` (`:42`); arma `Logo_url` hacia `logo.php` (`:19-40`).
- **Escribe:** `tbldatosempresa` UPDATE 20 columnas `WHERE Id_Empresa = 1` (`:53-75`); NIT normalizado a dígitos base (`:49-51`).
- **Efectos colaterales:** el frontend guarda la empresa en localStorage vía `saveEmpresaCache` (`DatosEmpresa.tsx:31`, `:86`).
- **Transacción:** no. **Validaciones solo en frontend:** ninguna relevante.

### 2. Logo
- `DatosEmpresa.tsx:70-79` → `logo.php`: POST guarda `uploads/logo.<ext>` (png/jpg/gif/svg/webp, ≤5MB) y UPDATE `tbldatosempresa.Logo` (`logo.php:73-125`); DELETE borra archivo y `Logo=NULL` (`:142-154`); GET sirve el archivo (`:26-58`). CORS `*` (`:64`).

### 3. Token de suscripción
- `configurar-token.php`: valida ≥32 alfanuméricos (`:33-36`), `SHOW COLUMNS` (`:39`), UPDATE `api_token` (`:45-46`).

### 4. Consultar adquiriente DIAN
- **Pantalla → endpoint:** `NuevaVenta.tsx:56` / `CustomersManagement.tsx:31` → `consultar-adquiriente.php`.
- **Lee:** `tbldatosempresa.fe_company_id, fe_company_id_at, email_factelect, password_factelect` (`:133`).
- **Escribe:** posible `ALTER TABLE tbldatosempresa ADD COLUMN fe_company_id, fe_company_id_at` en caliente (`:127-131`); UPDATE caché `fe_company_id` (6 h) (`:159`).
- **Efectos colaterales:** API `POST /login` (si caché vencida `:153`) y `POST /api/consulta-adquiriente` sin token (`:168`). Limpia razón social larga (`limpiarRazonSocialDIAN` `:44`).
- **Transacción:** no.

## Dependencias
- **Usa de otros módulos:** `config/helpers_polyfill.php` (`conta_tiene_columna`) en `consultar-adquiriente.php:23,127`.
- **Lo usan otros módulos (tbldatosempresa):**
  - FE: `enviar.php:50,197,359,802` (credenciales, Regimen), `email.php:99`, `evento-emitir.php:67`, `detalle.php:102`, `pdf.php:91`.
  - Ventas: `ventas/nueva.php:186` (Regimen, IvaIncluido → IVA y total de POS y FE), `ventas/detalle-factura.php:244` (IvaIncluido), `ventas/pendientes-entrega.php:19` (`dias_estimados_entrega`).
  - Retenciones: `retenciones/uvt.php:28,49,70`, `retenciones/catalogo-unificado.php:61`, `conceptos-retefuente/index.php:22` (UVT).
  - Otros: `dashboard/resumen.php:107`, `inicio/consulta-ia.php:35-40` (`groq_api_key`), `modulos/estado.php:41-122` (flag `modulo_financiaciones`), `actualizacion/aplicar-sql.php:134` (`version_sql_aplicada`).
  - Frontend: caché de empresa (`getEmpresaCache`) usada por `NuevaVenta.tsx:1079-1081` (régimen) y `FacturacionElectronica.tsx:56`.
- **Triggers / vistas:** ninguno sobre `tbldatosempresa` (grep TRIGGER).
- **Compatibilidad:** `configurar-token.php:39` usa `SHOW COLUMNS` (MySQL-only; falla en SQLite embedded). `consultar-adquiriente.php:127-131` hace `ALTER TABLE … ADD COLUMN a, ADD COLUMN b` (sintaxis múltiple no soportada por SQLite; sin verificar si `conta_tiene_columna` evita llegar ahí en embedded).

## Qué se rompe si lo tocas
- Valores de `Regimen` (`DatosEmpresa.tsx:201-204`): se interpretan por substring en tres sitios con reglas distintas — `ventas/nueva.php:189-191` ('común','comun','responsable'), `enviar.php:199-204` ('simpl','no responsab','no resp','no'), `NuevaVenta.tsx:1080-1081` (igual que nueva.php), `pdf.php:154-155` (igualdad exacta "Común"/"Simple"; "Simplificado" y "No Responsable" caen en "No responsable de IVA"). "No Responsable" es responsable para nueva.php y no responsable para enviar.php.
- `IvaIncluido`: cambia el total de POS (`nueva.php:192,227`); en FE el IVA siempre se extrae (`nueva.php:398-399`) → con IvaIncluido=0 el total del encabezado (`:227`) y el de las líneas FE divergen (sin verificar efecto en DIAN).
- `POST datos.php` sobrescribe `email_factelect/password_factelect/api_token` con `''` si el payload no los trae (`:72-74`).
- Cambiar credenciales FE no invalida `fe_company_id` cacheado (6 h, `consultar-adquiriente.php:136-139`).
- Ruta y nombre fijo `uploads/logo.<ext>` (`logo.php:118-125`): la leen impresiones vía `Logo_url`.

## Evaluación de la implementación
**Confirmado:**
1. `datos.php:8,42` expone `password_factelect` y `api_token` al frontend en claro; `DatosEmpresa.tsx:31` los guarda en caché local (`saveEmpresaCache`).
2. Inconsistencia de régimen entre `nueva.php` y `enviar.php` (ver arriba) → detalle local con IVA y FE emitida sin IVA para "No Responsable".
3. `logo.php` acepta SVG (`:89`) y lo sirve desde el mismo origen con CORS `*` (`:64`) (riesgo XSS bajo, contexto app local).
4. `configurar-token.php` MySQL-only (`SHOW COLUMNS`).

**Contraste con PROCESOS_SISTEMA.md:** no cubierto. Afecta indirectamente las reglas de IVA de §2.2 (POS y FE deben producir el mismo efecto contable).
