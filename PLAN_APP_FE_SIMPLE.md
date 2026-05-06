# Plan de Desarrollo — App FE Simple (Multi-empresa)
**Producto:** Aplicación web React para facturación electrónica DIAN — corre en hosting  
**Stack:** React + Vite + TypeScript (SPA) | Backend: Lumen (PHP) | BD: MySQL  
**Deploy:** Hosting Apache/Nginx — frontend en `/public_html`, backend Lumen en subdominio o subcarpeta  
**Autor del plan:** Luis Fernando / Innovación Digital

---

## 1. VISIÓN GENERAL

Aplicación ligera de facturación electrónica que maneje múltiples empresas desde un solo instalador. Cada empresa tiene su propia base de datos. Los módulos son: **Inventario, Clientes, Facturación (todos los tipos DIAN), Reportes**.

---

## 2. CONVENCIONES DE DISEÑO (OBLIGATORIO SEGUIR AL PIE DE LA LETRA)

### 2.1 Filosofía visual
- Estilo **desktop compacto**, no estilo web con mucho espacio
- Paleta: morado `#7c3aed` como color primario, verde `#16a34a` para totales/positivo, rojo `#dc2626` para errores/negativo, azul `#2563eb` para FE/electrónico
- Fondo general: `#f3f4f6` (gris claro), cards con `background: #fff`, `borderRadius: 12`, `boxShadow: '0 1px 3px rgba(0,0,0,0.08)'`

### 2.2 Regla crítica de estilos
- **Usar `style={{}}` inline en todos los componentes**, NO clases de Tailwind arbitrarias (Tailwind v4 precompilado no procesa clases arbitrarias dinámicas)
- Tailwind solo para utilidades simples y estáticas (flex, hidden, etc.)

### 2.3 Tamaños de controles (SM desktop)
| Control | Altura | Font-size |
|---|---|---|
| `input` | `h: 28px` | `12-13px` |
| `select` | `h: 28px` | `12px` |
| `button` acción | `h: 30px` | `12-13px` |
| `label` | — | `9-10px`, uppercase, color `#6b7280` |
| Botón primario grande | `h: 38-40px` | `13-14px`, `fontWeight: 700` |

### 2.4 Inputs numéricos / moneda
- **NUNCA usar `type="number"`** — usar `type="text"` con validación manual
- Formato moneda colombiana: `'$ ' + Math.round(v).toLocaleString('es-CO')`
- Función helper: `const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO')`
- Para campos editables de moneda: usar `defaultValue` + `onFocus` (quita formato) + `onBlur` (aplica formato)
- NO usar `value` controlado en campos de moneda — provoca re-renders que mueven el cursor
- Navegación entre campos con Enter: `data-next="nombreSiguienteCampo"` + handler `onKeyDown`

### 2.5 Tablas
- **AG Grid v35** para todas las listas/tablas de datos
- Import: `import { AgGridReact } from 'ag-grid-react'`
- `cellRenderer` debe retornar JSX, no strings HTML
- `rowHeight: 32`, headers en mayúscula, sin bordes extra
- Acciones en la última columna con botones compactos (width: 80-100px)

### 2.6 Modales
- **NO usar Dialog de Radix ni librerías** — usar `div` con `position: fixed; inset: 0; zIndex: 99999`
- Estructura siempre: overlay semitransparente + card centrada
- Card: `background: #fff; borderRadius: 12; boxShadow: '0 20px 60px rgba(0,0,0,0.2)'`
- Header del modal: `padding: 12px 16px; borderBottom: 1px solid #e5e7eb; fontSize: 14; fontWeight: 700`
- Cerrar con X en esquina superior derecha

### 2.7 Notificaciones
- `react-hot-toast` para toasts: `toast.success()`, `toast.error()`
- `confirm()` nativo del browser para confirmaciones simples de bajo riesgo
- Para acciones sensibles (anulaciones, sobreescrituras): modal de autorización con contraseña admin

### 2.8 Persistencia local
- Auth de sesión: `localStorage` (token JWT — persiste entre pestañas y recargas)
- Estado de formularios en progreso: `localStorage`
- Config de impresión/módulos: `localStorage` con key fija
- La URL del backend es fija (mismo dominio o subdominio configurado en `src/config/api.ts` como constante o variable de entorno Vite)

---

## 3. ARQUITECTURA DEL PROYECTO

### 3.1 Estructura de carpetas frontend
```
app-fe-simple/
├── public/
│   └── favicon.ico
├── src/
│   ├── App.tsx                  # Router principal + AuthProvider
│   ├── contexts/
│   │   └── AuthContext.tsx      # User auth, empresa activa, token en localStorage
│   ├── config/
│   │   └── api.ts               # Base URL del backend (constante o import.meta.env.VITE_API_URL)
│   ├── components/
│   │   ├── LoginPage.tsx
│   │   ├── Dashboard.tsx        # Sidebar + router de módulos
│   │   ├── SelectorEmpresa.tsx  # Pantalla de selección de empresa
│   │   ├── NuevaFactura.tsx     # Formulario de venta/facturación
│   │   ├── Inventario.tsx       # Gestión de productos
│   │   ├── Clientes.tsx
│   │   ├── Reportes.tsx
│   │   └── ConfiguracionSistema.tsx
│   └── main.tsx
├── .env                         # VITE_API_URL=https://api.tusitio.com
├── package.json
└── vite.config.ts
```

### 3.2 Estructura de carpetas backend (Lumen)
```
api-fe-simple/
├── app/
│   ├── Http/Controllers/
│   │   ├── AuthController.php
│   │   ├── EmpresaController.php
│   │   ├── ProductoController.php
│   │   ├── ClienteController.php
│   │   ├── FacturaController.php
│   │   ├── DiAnController.php       # Integración DIAN
│   │   └── ReporteController.php
│   └── Models/
├── routes/
│   └── api.php
├── config/
│   └── database.php                 # Multi-tenant: selecciona BD según empresa
└── bootstrap/
    └── app.php
```

---

## 4. MULTI-EMPRESA

### 4.1 Concepto
Cada empresa es una base de datos MySQL separada. Una BD maestra `fe_simple_master` guarda el catálogo de empresas y usuarios globales.

### 4.2 BD Maestra (`fe_simple_master`)
```sql
CREATE TABLE empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  regimen VARCHAR(30) DEFAULT 'Simplificado',
  db_name VARCHAR(60) NOT NULL UNIQUE,   -- nombre de la BD de esta empresa
  resolucion_fe VARCHAR(40),
  prefijo_fe VARCHAR(10),
  desde_fe INT DEFAULT 1,
  hasta_fe INT DEFAULT 99999,
  vigencia_fe DATE,
  api_token VARCHAR(100),                -- token de suscripción CRM
  logo_path VARCHAR(200),
  activa TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios_globales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  rol ENUM('super_admin','admin','cajero') DEFAULT 'cajero',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario_empresa (
  usuario_id INT,
  empresa_id INT,
  rol_empresa ENUM('admin','vendedor') DEFAULT 'vendedor',
  activo TINYINT DEFAULT 1,
  PRIMARY KEY (usuario_id, empresa_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios_globales(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);
```

### 4.3 BD por empresa (`fe_simple_{nit}`)
Se crea una BD idéntica por empresa con las tablas de negocio:
- `productos`, `clientes`, `facturas`, `detalle_facturas`, `movimientos_inventario`, `config_empresa`

### 4.4 Flujo de selección de empresa
1. Usuario hace login con su usuario global
2. App consulta a qué empresas tiene acceso
3. Si tiene acceso a 1 → entra directamente
4. Si tiene acceso a varias → muestra pantalla `<SelectorEmpresa>` con cards de empresas
5. Al seleccionar empresa → se guarda `empresa_id` en contexto → todas las peticiones API incluyen header `X-Empresa-ID: {id}`
6. El backend Lumen usa ese header para seleccionar la BD correcta en cada request

### 4.5 Middleware Lumen para multi-tenant
```php
// app/Http/Middleware/TenantMiddleware.php
class TenantMiddleware {
    public function handle($request, Closure $next) {
        $empresaId = $request->header('X-Empresa-ID');
        if (!$empresaId) return response()->json(['error' => 'Empresa no especificada'], 401);
        
        $empresa = DB::connection('master')
            ->table('empresas')
            ->find($empresaId);
        if (!$empresa) return response()->json(['error' => 'Empresa inválida'], 404);
        
        // Configurar conexión dinámica a la BD de la empresa
        config(['database.connections.tenant.database' => $empresa->db_name]);
        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');
        
        $request->merge(['empresa' => $empresa]);
        return $next($request);
    }
}
```

---

## 5. MÓDULO FACTURACIÓN (DETALLE COMPLETO DEL FORMULARIO)

Este es el módulo más complejo. Replicar el diseño y UX de `NuevaVenta.tsx` del proyecto ContaFT.

### 5.1 Tipos de documento DIAN soportados
```
pos          → Factura POS (local, no va a DIAN)
electronica  → Factura Electrónica (FE-01 / CUFE) — código DIAN 01
soporte      → Documento Soporte (DS) — proveedores no obligados a facturar
nota_debito  → Nota Débito (ND) — referencia a FE existente
nota_credito → Nota Crédito (NC) — devolución/ajuste de FE existente
```

El selector de tipo debe cambiar de color según el documento:
- POS: `color: #374151, background: #fff`
- Electrónica: `color: #2563eb, background: #eff6ff`
- Doc. Soporte: `color: #d97706, background: #fffbeb`
- Nota Crédito: `color: #dc2626, background: #fef2f2`
- Nota Débito: `color: #7c3aed, background: #f3e8ff`

### 5.2 Layout del formulario (3 filas fijas + tabla expansible)

```
┌─────────────────────────────────────────────────────────────────┐
│ FILA 1 — Cabecera documento                                      │
│  [DOCUMENTO▼] [TÉRMINO▼] [DÍAS] [P1][P2][P3] [☑Email] ... TOTAL│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ FILA 2 — Datos cliente                                           │
│  [COD][🔍][X]  [NOMBRE_CLIENTE_____________] [NIT] [TEL] [CUPO] │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ FILA 3 — Buscar producto                                         │
│  [🔍 Código o nombre del producto...________] [+ Nuevo]         │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TABLA DE LÍNEAS (AG Grid, flex-grow: 1, scrolleable)            │
│ # | Código | Nombre | Exist | Cant | Precio | IVA% | Desc | Sub │
│ ─────────────────────────────────────────────────────────────── │
│ totales: Subtotal | IVA | Descuento Global | TOTAL              │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ BARRA INFERIOR                                                   │
│ [Nota: _________] [Desc.Global: ____]  [🗑 Limpiar] [✓ Guardar]│
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Fila 1 — Cabecera documento

```tsx
// Selector tipo documento (colorizado según tipo)
<select value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)}
  style={{
    height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12,
    padding: '0 4px', width: 170, fontWeight: 600,
    color: COLORES_TIPO[tipoDocumento].text,
    background: COLORES_TIPO[tipoDocumento].bg
  }}>
  <option value="pos">Factura POS</option>
  <option value="electronica">Factura Electrónica</option>
  <option value="soporte">Doc. Soporte</option>
  <option value="nota_credito">Nota Crédito</option>
  <option value="nota_debito">Nota Débito</option>
</select>

// Para nota crédito/débito: mostrar campo "Referencia FE"
{['nota_credito','nota_debito'].includes(tipoDocumento) && (
  <div>
    <label style={{fontSize:9,color:'#6b7280',display:'block',marginBottom:2}}>REF. FACTURA</label>
    <input type="text" placeholder="FE-001-000123"
      style={{height:28,width:130,padding:'0 6px',border:'1px solid #d1d5db',borderRadius:6,fontSize:12}} />
  </div>
)}

// Término de pago
<select value={termino} style={{height:28,border:'1px solid #d1d5db',borderRadius:6,fontSize:12,width:90}}>
  <option>Contado</option>
  <option>Crédito</option>
</select>

// Listas de precio P1, P2, P3 (botones toggle)
{[1,2,3].map(n => (
  <button key={n} onClick={() => setListaPrecio(n)}
    style={{
      width:28, height:28,
      border: listaPrecio===n ? '2px solid #7c3aed' : '1px solid #d1d5db',
      borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
      background: listaPrecio===n ? '#f3e8ff' : '#fff',
      color: listaPrecio===n ? '#7c3aed' : '#374151'
    }}>P{n}</button>
))}

// Checkbox email FE (solo visible cuando tipo === 'electronica')
// Deshabilitado si cliente no tiene email con '@'
{tipoDocumento === 'electronica' && (
  <label style={{display:'flex',alignItems:'center',gap:5,cursor: tieneEmail ? 'pointer' : 'not-allowed',opacity: tieneEmail ? 1 : 0.5}}>
    <input type="checkbox" checked={enviarEmail} disabled={!tieneEmail}
      style={{accentColor:'#2563eb',width:16,height:16}} />
    <span style={{fontSize:11,color:'#2563eb',fontWeight:500}}>
      {tieneEmail ? `Email (${cliente.email})` : 'Sin email'}
    </span>
  </label>
)}

// Total en esquina derecha (siempre visible, grande)
<div style={{textAlign:'right'}}>
  <div style={{fontSize:9,color:'#6b7280'}}>TOTAL</div>
  <div style={{fontSize:28,fontWeight:800,color: total>0 ? '#16a34a' : '#9ca3af',lineHeight:1}}>
    {fmtMon(total)}
  </div>
</div>
```

### 5.4 Fila 2 — Datos cliente

```tsx
// Código (read-only, muestra ID)
<input type="text" value={cliente.id} readOnly
  style={{height:28,width:60,textAlign:'center',border:'1px solid #d1d5db',borderRadius:6,
    fontSize:12,fontWeight:700,color:'#7c3aed',background:'#f9fafb'}} />

// Botón lupa → abre BuscarClienteModal (componente SEPARADO para no causar re-renders)
<button onClick={() => setShowBuscarCliente(true)}
  style={{width:28,height:28,border:'1px solid #d1d5db',borderRadius:6,
    cursor:'pointer',background:'#f3e8ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
  <Search size={14} color="#7c3aed" />
</button>

// Botón X → limpiar cliente (volver a cliente genérico)
{cliente.esCliente && (
  <button onClick={limpiarCliente}
    style={{width:28,height:28,border:'1px solid #fecaca',borderRadius:6,
      cursor:'pointer',background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <X size={14} color="#dc2626" />
  </button>
)}

// Nombre (editable si es cliente genérico, readonly si se buscó)
<input type="text" value={cliente.nombre}
  readOnly={cliente.esCliente}
  style={{width:'100%',height:28,padding:'0 8px',border:'1px solid #d1d5db',borderRadius:6,
    fontSize:13,fontWeight:600,background: cliente.esCliente ? '#f9fafb' : '#fff'}} />

// NIT/CC, Teléfono, Dirección (mismos estilos)
```

**Componente BuscarClienteModal (separado, NO inline):**
- Se monta/desmonta — no re-renderiza NuevaFactura
- Búsqueda con debounce 250ms, mínimo 2 caracteres
- Doble clic para seleccionar
- Muestra: código (morado) | nombre | NIT | teléfono

### 5.5 Fila 3 — Buscar producto

```tsx
// Input búsqueda con dropdown autocomplete
<div style={{position:'relative',flex:1}}>
  <Search size={16} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9ca3af'}} />
  <input ref={productoInputRef} type="text" value={buscarProducto}
    onChange={e => buscarProductoFn(e.target.value)}
    placeholder="Código, referencia o nombre del producto..."
    style={{width:'100%',height:32,paddingLeft:34,border:'1px solid #d1d5db',borderRadius:8,fontSize:13}} />
  {showDropdown && productoResults.length > 0 && (
    <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:9999,
      background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',maxHeight:300,overflow:'auto'}}>
      {productoResults.map(p => (
        <div key={p.id} onClick={() => agregarProducto(p)}
          style={{padding:'8px 12px',cursor:'pointer',fontSize:12,borderBottom:'1px solid #f3f4f6',
            display:'flex',gap:10,alignItems:'center'}}
          onMouseOver={e => e.currentTarget.style.background='#f3e8ff'}
          onMouseOut={e => e.currentTarget.style.background=''}>
          <span style={{color:'#7c3aed',fontWeight:700,width:80,flexShrink:0}}>{p.codigo}</span>
          <span style={{flex:1,fontWeight:600}}>{p.nombre}</span>
          <span style={{color:'#6b7280',width:60,textAlign:'right'}}>{p.existencia} uds</span>
          <span style={{color:'#16a34a',fontWeight:700,width:80,textAlign:'right'}}>{fmtMon(p.precio_venta)}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

### 5.6 Tabla de líneas (AG Grid)

```tsx
const columnDefs = [
  { field: '#', width: 40, valueGetter: p => p.node.rowIndex + 1 },
  { field: 'codigo', headerName: 'CÓDIGO', width: 90 },
  { field: 'nombre', headerName: 'PRODUCTO', flex: 1, minWidth: 200 },
  { field: 'existencia', headerName: 'EXIST', width: 70, type: 'numericColumn' },
  {
    field: 'cantidad', headerName: 'CANT', width: 80,
    editable: true, type: 'numericColumn',
    cellStyle: { background: '#fffbeb' },  // amarillo claro = editable
  },
  {
    field: 'precio_venta', headerName: 'PRECIO', width: 110, type: 'numericColumn',
    editable: true,
    cellStyle: { background: '#fffbeb' },
    valueFormatter: p => fmtMon(p.value),
  },
  { field: 'iva', headerName: 'IVA%', width: 60, type: 'numericColumn' },
  {
    field: 'descuento', headerName: 'DESC', width: 90, editable: true,
    cellStyle: { background: '#fffbeb' },
    valueFormatter: p => fmtMon(p.value),
  },
  { field: 'subtotal', headerName: 'SUBTOTAL', width: 120, type: 'numericColumn',
    valueFormatter: p => fmtMon(p.value), cellStyle: { fontWeight: 700 } },
  {
    headerName: '', width: 50,
    cellRenderer: (p: any) => (
      <button onClick={() => eliminarLinea(p.data.id)}
        style={{width:26,height:22,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Trash2 size={13} color="#dc2626" />
      </button>
    )
  }
];
```

### 5.7 Totales y barra inferior

```tsx
// Totales (debajo de la tabla, alineados a la derecha)
<div style={{display:'flex',justifyContent:'flex-end',gap:24,padding:'8px 16px',background:'#fff',borderTop:'1px solid #f3f4f6'}}>
  <div style={{textAlign:'right'}}>
    <div style={{fontSize:9,color:'#6b7280'}}>SUBTOTAL</div>
    <div style={{fontSize:14,fontWeight:700}}>{fmtMon(subtotal)}</div>
  </div>
  <div style={{textAlign:'right'}}>
    <div style={{fontSize:9,color:'#6b7280'}}>IVA</div>
    <div style={{fontSize:14,fontWeight:700,color:'#2563eb'}}>{fmtMon(totalIva)}</div>
  </div>
  {descuentoGlobal > 0 && (
    <div style={{textAlign:'right'}}>
      <div style={{fontSize:9,color:'#6b7280'}}>DESCUENTO</div>
      <div style={{fontSize:14,fontWeight:700,color:'#dc2626'}}>-{fmtMon(descuentoGlobal)}</div>
    </div>
  )}
  <div style={{textAlign:'right',borderLeft:'2px solid #e5e7eb',paddingLeft:24}}>
    <div style={{fontSize:9,color:'#6b7280'}}>TOTAL</div>
    <div style={{fontSize:22,fontWeight:800,color:'#16a34a'}}>{fmtMon(total)}</div>
  </div>
</div>

// Barra inferior con nota + botones
<div style={{display:'flex',gap:8,padding:'8px 16px',background:'#fff',borderTop:'1px solid #e5e7eb',alignItems:'center'}}>
  <input type="text" placeholder="Nota u observación..." value={nota}
    style={{flex:1,height:28,padding:'0 8px',border:'1px solid #d1d5db',borderRadius:6,fontSize:12}} />
  <input type="text" placeholder="Desc. global $"
    onFocus={e => { if(descGlobal>0) e.target.value=String(descGlobal); }}
    onBlur={e => { setDescGlobal(parseInt(e.target.value)||0); e.target.value=descGlobal>0?fmtMon(descGlobal):''; }}
    style={{width:110,height:28,padding:'0 8px',border:'1px solid #d1d5db',borderRadius:6,fontSize:12,textAlign:'right'}} />
  <button onClick={limpiarFormulario}
    style={{height:30,padding:'0 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:8,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
    <Trash2 size={13}/> Limpiar
  </button>
  <button onClick={finalizar} disabled={lineas.length===0}
    style={{height:38,padding:'0 20px',background: tipoDocumento==='electronica'?'#2563eb':'#7c3aed',
      color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',
      display:'flex',alignItems:'center',gap:6,opacity: lineas.length===0?0.5:1}}>
    <Save size={15}/>
    {tipoDocumento==='electronica' ? 'Enviar a DIAN' : tipoDocumento==='soporte' ? 'Guardar Doc. Soporte' : 'Guardar Factura'}
  </button>
</div>
```

### 5.8 Modal de pago (Contado)

Aparece al hacer clic en "Guardar". Permite:
- Efectivo: input con cálculo de cambio automático
- Transferencia: input + selector (Bancolombia, Nequi, Tarjeta, Daviplata)
- El total pagado = efectivo + transferencia debe ser ≥ total
- Muestra cambio en verde si hay vuelto

### 5.9 Flujo envío DIAN (Factura Electrónica)

El sistema envía JSON al proveedor tecnológico DIAN (no genera ni firma XML — eso lo hace el proveedor).

```
1. Guardar factura en BD local → obtener Id_Factura
2. POST /api/dian/enviar/{facturaId}
   → Backend Lumen construye payload JSON con datos de la factura
   → Llama a la API del proveedor tecnológico (ej. API2, Ediwin, Siigo, etc.)
   → Proveedor devuelve JSON con CUFE, QR y estado
3. Guardar CUFE + QR + estado_dian en la misma tabla facturas
4. Si enviarEmail=true → proveedor o backend envía PDF al cliente
5. En contingencia (proveedor caído): guardar estado='contingencia', reintentar luego
```

---

## 6. BASE DE DATOS POR EMPRESA

```sql
-- Tabla de productos
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio_venta DECIMAL(15,2) DEFAULT 0,
  precio_venta2 DECIMAL(15,2) DEFAULT 0,
  precio_venta3 DECIMAL(15,2) DEFAULT 0,
  precio_costo DECIMAL(15,2) DEFAULT 0,
  existencia DECIMAL(12,3) DEFAULT 0,
  iva DECIMAL(5,2) DEFAULT 19,
  unidad VARCHAR(20) DEFAULT 'UND',
  categoria_id INT,
  activo TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_codigo (codigo)
);

-- Tabla de clientes
CREATE TABLE clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  nit VARCHAR(20),
  tipo_persona ENUM('natural','juridica') DEFAULT 'natural',
  tipo_regimen ENUM('responsable_iva','no_responsable','gran_contribuyente') DEFAULT 'no_responsable',
  email VARCHAR(150),
  telefono VARCHAR(30),
  direccion VARCHAR(200),
  ciudad VARCHAR(100),
  cupo_credito DECIMAL(15,2) DEFAULT 0,
  dias_credito INT DEFAULT 0,
  activo TINYINT DEFAULT 1
);

-- Tabla de facturas (cabecera + campos DIAN integrados, sin tabla separada)
CREATE TABLE facturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_factura INT NOT NULL,
  prefijo VARCHAR(10),
  tipo_documento ENUM('pos','electronica','soporte','nota_credito','nota_debito') DEFAULT 'pos',
  cliente_id INT,
  nombre_cliente VARCHAR(200),
  nit_cliente VARCHAR(20),
  fecha DATE NOT NULL,
  fecha_vencimiento DATE,
  termino ENUM('contado','credito') DEFAULT 'contado',
  lista_precio TINYINT DEFAULT 1,
  subtotal DECIMAL(15,2) DEFAULT 0,
  total_iva DECIMAL(15,2) DEFAULT 0,
  descuento DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  medio_pago VARCHAR(50),
  nota TEXT,
  estado ENUM('activa','anulada') DEFAULT 'activa',
  -- NC/ND: referencia a la factura electrónica original
  factura_referencia_id INT,
  -- Campos DIAN (solo aplican cuando tipo_documento IN ('electronica','soporte','nota_credito','nota_debito'))
  cufe VARCHAR(200),
  qr_code TEXT,
  estado_dian ENUM('no_aplica','pendiente','aprobada','rechazada','contingencia') DEFAULT 'no_aplica',
  fecha_envio_dian DATETIME,
  intentos_dian TINYINT DEFAULT 0,
  respuesta_dian JSON,           -- guarda el JSON completo que devuelve el proveedor
  error_dian TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_num (numero_factura, tipo_documento)
);

-- Detalle de factura
CREATE TABLE detalle_facturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  factura_id INT NOT NULL,
  producto_id INT,
  codigo VARCHAR(30),
  nombre VARCHAR(200),
  cantidad DECIMAL(12,3),
  precio_venta DECIMAL(15,2),
  precio_costo DECIMAL(15,2),
  iva_pct DECIMAL(5,2) DEFAULT 0,
  descuento DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2),
  FOREIGN KEY (factura_id) REFERENCES facturas(id)
);

-- Configuración de la empresa (resoluciones FE, credenciales proveedor, etc.)
CREATE TABLE config_empresa (
  clave VARCHAR(60) PRIMARY KEY,
  valor TEXT
);
-- claves útiles:
--   resolucion_fe, prefijo_fe, desde_fe, hasta_fe, vigencia_fe
--   proveedor_dian_url, proveedor_dian_token  (credenciales API del proveedor tecnológico)
--   ambiente_dian (pruebas | produccion)
```

---

## 7. API LUMEN — ENDPOINTS

### Autenticación
```
POST   /api/auth/login          → {email, password} → {token, usuario, empresas[]}
POST   /api/auth/logout
GET    /api/auth/empresas        → empresas del usuario autenticado
POST   /api/auth/seleccionar-empresa → {empresa_id} → cambia tenant activo
```

### Productos (tenant header requerido)
```
GET    /api/productos?q=&page=&limit=    → búsqueda paginada
GET    /api/productos/{id}
POST   /api/productos                    → crear
PUT    /api/productos/{id}               → actualizar
PATCH  /api/productos/{id}/stock         → ajuste de inventario
GET    /api/productos/buscar?q=          → autocomplete para facturación (≤20 resultados)
```

### Clientes
```
GET    /api/clientes?q=&page=
GET    /api/clientes/{id}
POST   /api/clientes
PUT    /api/clientes/{id}
GET    /api/clientes/buscar?q=           → autocomplete
```

### Facturas
```
POST   /api/facturas                     → crear factura (POS, soporte, NC, ND)
GET    /api/facturas?page=&tipo=&desde=&hasta=&cliente=
GET    /api/facturas/{id}
GET    /api/facturas/{id}/pdf            → genera PDF (TCPDF) para impresión
POST   /api/facturas/{id}/anular         → anulación (requiere motivo)
POST   /api/facturas/{id}/enviar-dian    → envía JSON al proveedor DIAN + guarda CUFE en facturas
POST   /api/facturas/{id}/reenviar-dian  → reintento para contingencias
GET    /api/facturas/dian/pendientes     → facturas con estado_dian='contingencia'
```
Nota: no hay endpoint separado de DIAN — todo opera sobre la tabla `facturas` directamente.

### Reportes
```
GET    /api/reportes/ventas?desde=&hasta=&cliente=&tipo=
GET    /api/reportes/inventario
GET    /api/reportes/cuentas-por-cobrar
GET    /api/reportes/ventas/pdf?...      → genera PDF
```

---

## 8. MÓDULO INVENTARIO

### 8.1 Vista lista (AG Grid)
Columnas: Código | Nombre | Categoría | Precio Venta | Costo | Existencia | IVA% | Activo | Acciones

### 8.2 Formulario crear/editar producto
- Modal centralizado (no página separada)
- Campos: Código*, Nombre*, Precio Venta 1/2/3, Precio Costo, IVA (select: 0, 5, 19%), Unidad, Categoría, Existencia inicial (solo en creación)
- Ajuste de inventario: botón separado "Ajustar Stock" → modal con tipo (Entrada/Salida/Ajuste), cantidad, motivo

### 8.3 Ajuste de inventario (kardex)
- Kardex **nunca borra registros** — solo inserta movimientos
- Tabla `movimientos_inventario`: fecha, producto_id, tipo, cantidad, saldo_anterior, saldo_nuevo, motivo, usuario_id

---

## 9. MÓDULO CLIENTES

### 9.1 Vista lista (AG Grid)
Columnas: Código | Nombre/Razón Social | NIT/CC | Teléfono | Ciudad | Cupo | Acciones

### 9.2 Formulario cliente
- Nombre/Razón Social*, NIT/CC*, Tipo persona (Natural/Jurídica), Régimen (Responsable IVA, No Responsable, Gran Contribuyente)
- Email, Teléfono, Dirección, Ciudad, Departamento
- Cupo crédito (moneda), Días de crédito
- Activar/desactivar

---

## 10. MÓDULO REPORTES

### 10.1 Reporte de ventas
- Filtros: rango de fechas, tipo documento, cliente, estado
- Totales: conteo facturas, subtotal, IVA, total
- Agrupaciones: por día, por cliente, por producto
- Exportar PDF (TCPDF) y Excel (fputcsv PHP)

### 10.2 Reporte de inventario
- Stock actual por producto
- Valor total del inventario (costo × existencia)
- Kardex por producto (historial de movimientos)

### 10.3 Cuentas por cobrar
- Facturas a crédito pendientes de pago
- Días de mora, semáforo (verde < 30 días, amarillo 30-60, rojo > 60)

---

## 11. CONFIGURACIÓN DEL SISTEMA

### 11.1 Configuración empresa (admin)
- Datos empresa: nombre, NIT, dirección, régimen, logo
- Resolución FE: número, prefijo, rango desde/hasta, vigencia
- Credenciales proveedor tecnológico DIAN: URL de la API + Token (se guardan en `config_empresa`)
- Ambiente DIAN: Pruebas / Producción (switch con banner amarillo en modo pruebas — el proveedor usa ambientes separados)
- Correo saliente SMTP para envío de FE

### 11.2 Configuración app (local)
- Servidor backend: URL (guardado en config.json via Electron IPC)
- Impresión: formato (POS 62mm, Carta, Media Carta), impresora predeterminada
- Módulos activos: checkbox "Usar Facturación Electrónica", "Listas de precio 2 y 3"

---

## 12. SIDEBAR / NAVEGACIÓN

```tsx
// Sidebar izquierdo compacto (56px collapsed / 200px expanded)
const MENU_ITEMS = [
  { id: 'inicio',      icon: Home,        label: 'Inicio',      rol: 'any' },
  { id: 'facturar',    icon: FileText,    label: 'Facturar',    rol: 'any' },
  { id: 'inventario',  icon: Package,     label: 'Inventario',  rol: 'admin' },
  { id: 'clientes',    icon: Users,       label: 'Clientes',    rol: 'admin' },
  { id: 'reportes',    icon: BarChart2,   label: 'Reportes',    rol: 'admin' },
  { id: 'config',      icon: Settings,    label: 'Configuración',rol: 'admin' },
];
```

- Icono de empresa activa en la parte superior del sidebar
- Clic en empresa → modal de cambio de empresa
- Perfil de usuario + logout en la parte inferior

---

## 13. AUTENTICACIÓN Y CONTEXTO

```tsx
// AuthContext.tsx
interface User {
  id: number;
  nombre: string;
  email: string;
  rol_global: 'super_admin' | 'admin' | 'cajero';
  rol_empresa: 'admin' | 'vendedor';
  token: string;
}

interface EmpresaActiva {
  id: number;
  nombre: string;
  nit: string;
  db_name: string;
  prefijo_fe: string;
  ambiente_dian: number;
}

// Todo request API incluye:
headers: {
  'Authorization': `Bearer ${user.token}`,
  'X-Empresa-ID': `${empresaActiva.id}`,
  'Content-Type': 'application/json'
}
```

---

## 14. FLUJO DE INICIO

```
Usuario abre la URL en el browser
  ↓
¿localStorage tiene token JWT válido?
  No → LoginPage (email + password)
  Sí → Verificar token con GET /api/auth/me → si expira, redirige a login
  ↓
¿usuario tiene acceso a más de 1 empresa?
  No → Dashboard (empresa única, carga automático)
  Sí → SelectorEmpresa (cards con nombre + NIT)
  ↓
Dashboard principal
```

**Manejo de token:**
- Al hacer login exitoso → guardar `token` y `empresa_id_activo` en `localStorage`
- Todas las peticiones axios incluyen `Authorization: Bearer {token}` y `X-Empresa-ID: {id}`
- Si cualquier petición devuelve 401 → limpiar localStorage y redirigir a `/login`
- Usar interceptor de axios para esto (no repetir en cada componente)

---

## 15. PRINT / PDF

### Factura POS (tirilla 62mm)
- `window.open` con HTML inline
- Barra morada `no-print` con botones Imprimir / Cerrar
- Datos empresa arriba, líneas en tabla compacta, totales, QR si es FE

### Factura Electrónica PDF
- Generado por backend PHP con TCPDF
- Endpoint: `GET /api/facturas/{id}/imprimir`
- `window.open` a la URL del endpoint → el servidor devuelve PDF inline

### Modo Prueba FE (banner visual)
```tsx
{ambienteDian === 'pruebas' && (
  <div style={{
    background: 'repeating-linear-gradient(45deg,#fef3c7,#fef3c7 10px,#fde68a 10px,#fde68a 20px)',
    border: '2px solid #d97706', borderRadius: 8, padding: '8px 14px',
    color: '#78350f', fontSize: 12, fontWeight: 700
  }}>
    🧪 AMBIENTE DE PRUEBAS DIAN — Las facturas NO tienen validez fiscal
  </div>
)}
```

---

## 16. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1 — Base
- [ ] Proyecto React + Vite + TypeScript (`npm create vite@latest`)
- [ ] Proyecto Lumen con estructura multi-tenant
- [ ] BD maestra con tablas `empresas`, `usuarios_globales`, `usuario_empresa`
- [ ] Script SQL idempotente para crear BD por empresa
- [ ] Auth JWT en Lumen (`firebase/php-jwt`)
- [ ] Middleware TenantMiddleware
- [ ] Interceptor Axios (token + empresa header + manejo 401)
- [ ] LoginPage + AuthContext (token en localStorage)
- [ ] SelectorEmpresa
- [ ] Deploy: build Vite → subir `dist/` al hosting, `.htaccess` para SPA routing

### Fase 2 — Módulos base
- [ ] Inventario (CRUD + ajuste de stock + kardex)
- [ ] Clientes (CRUD)
- [ ] Sidebar con control de roles

### Fase 3 — Facturación
- [ ] Formulario NuevaFactura (Factura POS)
- [ ] Modal de pago (efectivo + transferencia)
- [ ] Impresión tirilla POS (window.open HTML)
- [ ] Doc. Soporte
- [ ] Nota Crédito + Nota Débito (con referencia a FE)

### Fase 4 — FE DIAN
- [ ] Configuración resolución FE + credenciales proveedor (URL + token en config_empresa)
- [ ] Endpoint `/api/facturas/{id}/enviar-dian` — construye JSON y llama al proveedor tecnológico
- [ ] Recepción y guardado de CUFE + QR + respuesta_dian (JSON) en tabla facturas
- [ ] Estado de envíos + contingencia
- [ ] PDF FE con TCPDF (incluye QR y código CUFE)
- [ ] Envío por email

### Fase 5 — Reportes y polish
- [ ] Reporte ventas con filtros + PDF
- [ ] Reporte inventario
- [ ] Cuentas por cobrar
- [ ] Validación suscripción CRM (desde backend Lumen al arrancar sesión, no desde frontend)

---

## 17. DEPENDENCIAS FRONTEND

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.x",
    "ag-grid-community": "^35.x",
    "ag-grid-react": "^35.x",
    "axios": "^1.x",
    "lucide-react": "^0.487.0",
    "react-hot-toast": "^2.x"
  },
  "devDependencies": {
    "vite": "^6.x",
    "@vitejs/plugin-react-swc": "^3.x",
    "typescript": "^5.x"
  }
}
```

## 18. DEPENDENCIAS BACKEND (Lumen)

```json
{
  "require": {
    "laravel/lumen-framework": "^10.x",
    "firebase/php-jwt": "^6.x",
    "tecnickcom/tcpdf": "^6.x",
    "ext-openssl": "*"
  }
}
```

---

## 19. DEPLOY EN HOSTING

### Frontend (React SPA)
```bash
# Build
npm run build   # genera dist/

# Subir dist/ al hosting (public_html o subdirectorio)
# Requiere .htaccess para que React Router funcione:
```

```apache
# public_html/.htaccess
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

### Backend (Lumen)
- Subir al hosting en carpeta separada (ej. `api.tusitio.com` o `tusitio.com/api`)
- `public/` de Lumen apunta como document root del subdominio
- `.env` con credenciales de BD + configuración
- CORS habilitado para el dominio del frontend

```php
// bootstrap/app.php — CORS headers
$app->middleware([
    App\Http\Middleware\CorsMiddleware::class,
]);
```

```php
// CorsMiddleware.php
public function handle($request, Closure $next) {
    return $next($request)
        ->header('Access-Control-Allow-Origin', 'https://tusitio.com')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Empresa-ID');
}
```

### Variables de entorno del frontend
```env
# .env.production
VITE_API_URL=https://api.tusitio.com
```

```ts
// src/config/api.ts
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

*Documento generado para ser entregado a IA de desarrollo — Innovación Digital 2026*
