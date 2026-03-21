# ContaRs4 - Sistema de Gestión de Inventario

Sistema completo de gestión de inventario con aplicación de escritorio (React + Electron) y API backend (PHP + MySQL).

## Descripción del Proyecto

ContaRs4 es una aplicación de escritorio moderna para gestionar el inventario de Distrisalsas. El sistema permite visualizar artículos, categorías y proveedores con una interfaz profesional y amigable.

## Estructura del Proyecto

```
AppReactConta/
├── conta-app-frontend/        # Aplicación de escritorio (React + Electron)
│   ├── electron/              # Configuración de Electron
│   ├── src/                   # Código fuente React
│   │   ├── components/        # Componentes de UI
│   │   ├── contexts/          # Contextos de React
│   │   ├── services/          # Servicios (API client)
│   │   └── utils/             # Utilidades
│   ├── package.json
│   └── README.md
│
├── conta-app-backend/         # API Backend (PHP)
│   ├── api/
│   │   ├── config/           # Configuración de BD
│   │   ├── auth/             # Endpoints de autenticación
│   │   └── inventario/       # Endpoints de inventario
│   └── README.md
│
└── DOCUMENTACION_INVENTARIO_VENTAS.md  # Documentación técnica del sistema
```

## Características Principales

### Frontend (React + Electron)
- ✅ Aplicación de escritorio multiplataforma
- ✅ Sistema de autenticación con sesión persistente
- ✅ Visualización de inventario con filtros avanzados
- ✅ Búsqueda en tiempo real
- ✅ Estadísticas del inventario
- ✅ Diseño moderno con gradientes y animaciones
- ✅ Indicadores visuales para stock bajo
- ✅ Interfaz responsive

### Backend (PHP + MySQL)
- ✅ API REST con endpoints documentados
- ✅ Conexión a MySQL con PDO
- ✅ CORS configurado para desarrollo
- ✅ Endpoints para:
  - Autenticación
  - Artículos del inventario
  - Categorías
  - Proveedores

### Base de Datos
- Base de datos: `conta_distrisalsas3`
- Tabla principal: `tblArticulos`
- Relaciones con: `tblCategoria`, `tblProveedores`

## Instalación Rápida

### 1. Backend (API PHP)

1. Copia la carpeta `conta-app-backend` a tu directorio `htdocs` de XAMPP:
   ```
   C:\xampp\htdocs\conta-app-backend
   ```

2. Inicia Apache y MySQL en XAMPP

3. Verifica que la base de datos `conta_distrisalsas3` exista

### 2. Frontend (React + Electron)

1. Navega a la carpeta del frontend:
   ```bash
   cd conta-app-frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura la URL de la API en el archivo `.env`:
   ```
   VITE_API_URL=http://localhost:80/conta-app-backend/api
   ```

4. Ejecuta la aplicación en modo desarrollo:
   ```bash
   npm run electron:dev
   ```

## Sistema de Autenticación

El sistema usa la misma codificación de contraseñas que VB6 (función `Cx4_CodificarDatos`), lo que permite usar los mismos usuarios existentes en la tabla `tblusuarios`.

Usa cualquier usuario que ya tengas en tu sistema VB6 para iniciar sesión.

Para más información sobre el sistema de autenticación, consulta [AUTENTICACION.md](AUTENTICACION.md).

## Capturas de Pantalla

### Pantalla de Login
![Login](docs/login-screenshot.png)

### Vista de Inventario
![Inventario](docs/inventario-screenshot.png)

## Tecnologías Utilizadas

### Frontend
- React 19
- Electron 40
- Vite 7
- React Router 7
- Axios
- CSS3 (con gradientes modernos)

### Backend
- PHP 7.4+
- MySQL
- PDO para conexiones a BD
- Apache (XAMPP)

## Guía de Desarrollo

### Ejecutar Solo el Frontend (modo web)
```bash
cd conta-app-frontend
npm run dev
```
Abre: `http://localhost:5173`

### Ejecutar la Aplicación de Escritorio
```bash
cd conta-app-frontend
npm run electron:dev
```

### Compilar Aplicación de Escritorio
```bash
cd conta-app-frontend
npm run electron:build
```
El ejecutable se generará en `dist-electron/`

## API Endpoints

### Autenticación
- `POST /api/auth/login.php` - Iniciar sesión

### Inventario
- `GET /api/inventario/articulos.php` - Obtener artículos
- `GET /api/inventario/categorias.php` - Obtener categorías
- `GET /api/inventario/proveedores.php` - Obtener proveedores

Para más detalles, consulta [conta-app-backend/README.md](conta-app-backend/README.md)

## Personalización

### Cambiar Colores del Tema

El gradiente principal del sistema es:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Puedes personalizarlo editando los archivos CSS en:
- `conta-app-frontend/src/components/*/`

### Configuración de Base de Datos

Edita las credenciales en:
- `conta-app-backend/api/config/database.php`

## Próximas Características

- [ ] Gestión completa de categorías (CRUD)
- [ ] Gestión completa de proveedores (CRUD)
- [ ] Reportes y estadísticas avanzadas
- [ ] Exportación a Excel/PDF
- [ ] Notificaciones de stock bajo
- [ ] Historial de movimientos
- [ ] Búsqueda avanzada con múltiples filtros

## Troubleshooting

### La aplicación no se conecta a la API

1. Verifica que Apache y MySQL estén corriendo en XAMPP
2. Prueba acceder directamente a: `http://localhost/conta-app-backend/api/inventario/articulos.php`
3. Revisa los errores CORS en la consola del navegador
4. Verifica que el archivo `.env` tenga la URL correcta

### Error al instalar dependencias del frontend

```bash
cd conta-app-frontend
rm -rf node_modules
npm cache clean --force
npm install
```

### Electron no inicia

1. Asegúrate de que el servidor de Vite esté corriendo
2. Verifica que no haya otro proceso usando el puerto 5173
3. Intenta primero ejecutar solo React: `npm run dev`

## Documentación Adicional

- [Documentación del Frontend](conta-app-frontend/README.md)
- [Documentación del Backend](conta-app-backend/README.md)
- [Documentación Técnica del Sistema](DOCUMENTACION_INVENTARIO_VENTAS.md)

## Seguridad

⚠️ **IMPORTANTE**: Esta es una versión de desarrollo. Para producción:

1. Implementa JWT para autenticación
2. Encripta contraseñas con `password_hash()` en PHP
3. Valida y sanitiza todas las entradas
4. Configura HTTPS
5. Limita CORS a dominios específicos
6. Crea un sistema de usuarios con roles y permisos

## Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.

## Licencia

Propietario - Distrisalsas © 2026

---

**Versión**: 1.0.0
**Fecha**: Enero 2026
**Sistema**: ContaRs4 v1 - POS
**Desarrollado con**: ❤️ y mucho café
# contaft_facturacion
