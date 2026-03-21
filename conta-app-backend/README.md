# API Backend - ContaRs4

API REST en PHP para el sistema de gestión de inventario ContaRs4.

## Configuración

### 1. Configurar XAMPP

1. Copia esta carpeta `conta-app-backend` en tu directorio `htdocs` de XAMPP:
   ```
   C:\xampp\htdocs\conta-app-backend
   ```

2. Asegúrate de que Apache y MySQL estén corriendo en XAMPP

### 2. Configurar Base de Datos

La API se conecta a la base de datos `conta_distrisalsas3` con las siguientes credenciales por defecto:

- **Host**: localhost
- **Usuario**: root
- **Contraseña**: (vacía)
- **Base de datos**: conta_distrisalsas3

Si necesitas cambiar estas credenciales, edita el archivo:
```
api/config/database.php
```

### 3. Estructura de Carpetas

```
conta-app-backend/
├── api/
│   ├── config/
│   │   └── database.php          # Configuración de BD
│   ├── auth/
│   │   └── login.php              # Endpoint de autenticación
│   └── inventario/
│       ├── articulos.php          # Endpoint de artículos
│       ├── categorias.php         # Endpoint de categorías
│       └── proveedores.php        # Endpoint de proveedores
└── README.md
```

## Endpoints Disponibles

### Autenticación

#### POST `/api/auth/login.php`
Autenticar usuario usando la tabla `tblusuarios`

**Importante**: La contraseña debe enviarse codificada usando la función `codificarPassword()` (equivalente a `Cx4_CodificarDatos` en VB6).

**Body:**
```json
{
  "username": "admin",
  "password": "11000011100100110110111010011101110"
}
```

**Response (exitosa):**
```json
{
  "success": true,
  "token": "abc123...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador del Sistema",
    "role": "Administrador",
    "tipoUsuario": 1
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "message": "Usuario o contraseña incorrectos"
}
```

**Nota**: La contraseña se codifica automáticamente en el frontend antes de enviarla. Consulta [AUTENTICACION.md](../AUTENTICACION.md) para más detalles.

### Inventario

#### GET `/api/inventario/articulos.php`
Obtener lista de artículos del inventario

**Parámetros:**
- `buscarPor`: Codigo | Descripcion (default: Descripcion)
- `ordenarPor`: Codigo | Descripcion | Existencia | Precio1 (default: Codigo)
- `orden`: ASC | DESC (default: ASC)
- `estado`: Activos | Todos (default: Activos)

**Response:**
```json
{
  "success": true,
  "articulos": [
    {
      "Items": 1,
      "Codigo": "001",
      "Descripcion": "QUESO COSTEÑO X 500GR",
      "Existencia": 84,
      "Costo": 23.00,
      "Precio1": 28.00,
      "Precio2": 0.00,
      "Precio3": 0.00,
      "PrecioMinimo": 0.00,
      "Categoria": "VARIOS",
      "Proveedor": "MATEO OCHOA",
      "Estado": "Activo"
    }
  ],
  "total": 1547
}
```

#### GET `/api/inventario/categorias.php`
Obtener lista de categorías

**Response:**
```json
{
  "success": true,
  "categorias": [
    { "Categoria": "VARIOS" },
    { "Categoria": "EMBUTIDOS" }
  ],
  "total": 2
}
```

#### GET `/api/inventario/proveedores.php`
Obtener lista de proveedores

**Response:**
```json
{
  "success": true,
  "proveedores": [
    { "Proveedor": "MATEO OCHOA" },
    { "Proveedor": "COMPARAS AL CONTADO" }
  ],
  "total": 2
}
```

## Seguridad

⚠️ **IMPORTANTE**: Esta es una implementación básica para desarrollo. Para producción, deberías:

1. Implementar autenticación JWT real
2. Encriptar contraseñas con `password_hash()` y `password_verify()`
3. Validar y sanitizar todas las entradas
4. Usar prepared statements (ya implementado)
5. Configurar HTTPS
6. Limitar CORS a dominios específicos

## Pruebas

Puedes probar los endpoints usando:

1. **Postman** o **Insomnia**
2. **cURL**:
   ```bash
   curl http://localhost/conta-app-backend/api/inventario/articulos.php
   ```
3. **Navegador** (solo para GET):
   ```
   http://localhost/conta-app-backend/api/inventario/articulos.php
   ```

## Troubleshooting

### Error de conexión a la base de datos
- Verifica que MySQL esté corriendo en XAMPP
- Verifica las credenciales en `api/config/database.php`
- Verifica que la base de datos `conta_distrisalsas3` exista

### Error 404 en endpoints
- Verifica que la carpeta esté en `htdocs`
- Verifica que Apache esté corriendo
- Verifica la URL: `http://localhost/conta-app-backend/api/...`

### CORS errors
- Los headers CORS ya están configurados en `database.php`
- Si persiste, verifica la configuración de Apache
