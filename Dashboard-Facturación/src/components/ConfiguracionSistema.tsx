import { useState, useEffect } from 'react';
import { Save, Printer, CheckCircle, Settings, FileText, ShoppingCart, Tag, Plus, Trash2, RotateCcw, Smartphone, Link2, RefreshCw, History, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { HistorialVersiones } from './HistorialVersiones';
import pkg from '../../package.json';

export interface ConfigImpresion {
  // Formato de impresión
  formatoFactura: 'media-carta' | 'tirilla' | 'carta';
  formatoPago: 'media-carta' | 'tirilla';
  formatoCotizacion: 'media-carta' | 'tirilla' | 'carta';
  formatoInforme: 'carta' | 'media-carta';
  formatoCuadreCaja: 'tirilla' | 'media-carta';
  // Comportamiento
  vistaPrevia: boolean; // true = preview, false = imprime directo
  imprimirAlGuardar: boolean; // imprimir automáticamente al guardar factura
  imprimirCotizacion: boolean; // imprimir al guardar cotización
  // Impresión directa (silenciosa) a la térmica — estilo VB6
  impresionDirecta: boolean;   // si true, manda la tirilla directo a la impresora sin diálogo
  impresoraTirilla: string;    // nombre (deviceName) de la impresora térmica elegida
  // Copias
  copiasFactura: number;
  copiasPago: number;
  // Datos en factura
  mostrarPropietario: boolean;
  mostrarTelefono: boolean;
  mostrarDireccion: boolean;
  mostrarPrecioCosto: boolean;
  // Factura media carta
  mediaCartaDerecha: boolean; // imprimir en la mitad derecha de la hoja
  maxProductosMediaCarta: number; // 12 por defecto, si se pasa usa carta completa
  // Logo
  logo: string; // base64 del logo
  // Formato
  formatoFecha: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  // Ventas
  campoPredeterminado: 'codigo' | 'nombre'; // campo donde inicia el cursor al vender
  usarDecimales: boolean;
  numDecimales: number;
  precioIvaIncluido: boolean;
  // Módulos opcionales del negocio
  usarFamilias: boolean; // familias de productos + distribución entre unidades
  confirmarDistribucion: boolean; // pedir confirmación antes de distribuir desde unidad mayor
  usarFacturacionElectronica: boolean;
  modoPruebaFE: boolean; // si está activo, las FE no van a DIAN sino a preview-xml para validar el XML
  usarCotizaciones: boolean;
  usarConteoInventario: boolean;
  usarLotes: boolean; // activa el manejo de fechas de vencimiento / lotes para productos perecederos (farmacias, alimentos)
  usarFinanciaciones: boolean; // activa el módulo de financiaciones (crédito con cuotas) — típico venta de motos
  tasaMoraMensual: number; // % mensual sobre valor de cuota vencida. 0 = no cobra mora
  usarAnticipos: boolean; // activa el módulo de anticipos (saldo a favor del cliente para futuras compras)
  tipoNegocio: string; // Tienda, Farmacia, Boutique, etc.
  // Seguridad — autorización admin para acciones sensibles
  autorizarDevoluciones: boolean;     // pide clave admin para devolver
  autorizarAnulaciones: boolean;      // pide clave admin para anular venta
  autorizarOverrideCupo: boolean;     // pide clave admin si la venta supera cupo del cliente
  // Reglas de venta — validaciones que bloquean facturar
  permitirFacturarNegativo: boolean;  // si false, no permite vender más de la existencia
  validarPrecioMinimo: boolean;       // si true, bloquea PrecioVenta < Precio_Minimo y < Precio_Costo
  permitirRepetirProducto: boolean;   // si true, el mismo Item puede aparecer en varias líneas (útil para precios distintos por unidad, promociones)
  permitirFechaVenta: boolean;        // si true, muestra un campo Fecha en Nueva Venta para registrar la venta con fecha distinta a hoy (clientes que no facturan el mismo día)
  // Rendimiento — ajustes para PCs lentos (Celeron, HDD, poca RAM).
  // En equipos rápidos deben quedar así por default (mostrar saldo y 500 filas).
  // En Celeron/lentos, apagar saldo (evita JOIN con vw_facturas_cliente_saldos)
  // y reducir a 200 filas ayuda a que el listado de ventas cargue rápido.
  mostrarSaldoEnListado: boolean;     // false = query más liviana; el saldo se consulta en el módulo Cartera
  limiteListadoVentas: number;        // 100, 200, 500, 1000. Aplica al LIMIT del backend.
  fraseFinalTicket: string;           // frase promocional que aparece al final de la impresión (ej: "Feliz Navidad", "Gracias por su compra"). Vacío = no imprime.
}

const CONFIG_KEY = 'config_sistema';

const defaultConfig: ConfigImpresion = {
  formatoFactura: 'media-carta',
  formatoPago: 'media-carta',
  formatoCotizacion: 'media-carta',
  formatoInforme: 'carta',
  formatoCuadreCaja: 'tirilla',
  vistaPrevia: true,
  imprimirAlGuardar: true,
  imprimirCotizacion: false,
  impresionDirecta: false,
  impresoraTirilla: '',
  copiasFactura: 1,
  copiasPago: 1,
  mostrarPropietario: true,
  mostrarTelefono: true,
  mostrarDireccion: true,
  mostrarPrecioCosto: false,
  mediaCartaDerecha: false,
  maxProductosMediaCarta: 12,
  logo: '',
  formatoFecha: 'dd/mm/yyyy',
  campoPredeterminado: 'codigo',
  usarDecimales: false,
  numDecimales: 2,
  precioIvaIncluido: true,
  usarFamilias: false,
  confirmarDistribucion: true,
  usarFacturacionElectronica: false,
  modoPruebaFE: false,
  usarCotizaciones: true,
  usarConteoInventario: true,
  usarLotes: false,
  usarFinanciaciones: false,
  tasaMoraMensual: 0,
  usarAnticipos: false,
  tipoNegocio: '',
  autorizarDevoluciones: false,
  autorizarAnulaciones: false,
  autorizarOverrideCupo: false,
  permitirFacturarNegativo: false,
  validarPrecioMinimo: true,
  permitirRepetirProducto: false,
  permitirFechaVenta: false,
  mostrarSaldoEnListado: true,
  limiteListadoVentas: 500,
  fraseFinalTicket: 'GRACIAS POR SU COMPRA',
};

export function getConfigImpresion(): ConfigImpresion {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (e) {}
  return defaultConfig;
}

export function saveConfigImpresion(config: ConfigImpresion) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ====== Caché de datos de empresa (se llena al cargar Dashboard) ======
export interface EmpresaCache {
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  email?: string;
  regimen?: string;
  resolucion?: string;
  logo_url?: string;   // URL del logo servido por el backend (tbldatosempresa.Logo)
  detalle?: string;    // slogan/descripción de la empresa (tbldatosempresa.Detalle) — sale bajo el nombre en la impresión
}

const EMPRESA_KEY = 'empresa_cache';

export function getEmpresaCache(): EmpresaCache {
  try {
    const raw = localStorage.getItem(EMPRESA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Fallback genérico si nadie ha cargado la empresa todavía
  return { nombre: 'Empresa', nit: '', direccion: '', telefono: '' };
}

export function saveEmpresaCache(emp: any) {
  if (!emp) return;
  const nuevoNit = emp.Nit || emp.nit || '';
  const anterior = getEmpresaCache();

  // Si el NIT cambió, estamos en OTRA empresa/BD — invalidar el logo local
  // guardado en config_sistema (era del cliente anterior). Sin esto, al
  // cambiar de BD durante desarrollo/soporte, se mostraba el logo de la
  // empresa anterior en las impresiones — caso Icoplastic mostrando el
  // logo de Ammi es el ejemplo.
  if (anterior.nit && anterior.nit !== nuevoNit) {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg && cfg.logo) {
          cfg.logo = '';
          localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
        }
      }
    } catch (e) {}
  }

  const cache: EmpresaCache = {
    nombre: emp.Empresa || emp.nombre || 'Empresa',
    nit: nuevoNit,
    direccion: emp.Direccion || emp.direccion || '',
    telefono: emp.Telefono || emp.telefono || '',
    email: emp.email || '',
    regimen: emp.Regimen || '',
    resolucion: emp.Resolucion || '',
    // Logo_url viene del backend (empresa/datos.php construye la URL pública
    // desde tbldatosempresa.Logo). Es la fuente de verdad — no depende de
    // localStorage viejo de otra empresa.
    logo_url: emp.Logo_url || '',
    // Slogan/detalle de la empresa (tbldatosempresa.Detalle). Se muestra bajo
    // el nombre en la impresión, como el "Te ofrecemos todo lo relacionado con..."
    // del VB6 original.
    detalle: emp.Detalle || emp.detalle || '',
  };
  localStorage.setItem(EMPRESA_KEY, JSON.stringify(cache));
}

const API_CAT = 'http://localhost:80/conta-app-backend/api/movimientos/categorias-gasto.php';

export function ConfiguracionSistema() {
  const [config, setConfig] = useState<ConfigImpresion>(getConfigImpresion);
  const [showHistorial, setShowHistorial] = useState(false);
  const [categoriasGasto, setCategoriasGasto] = useState<any[]>([]);
  const [nuevaCat, setNuevaCat] = useState('');
  const [editandoCat, setEditandoCat] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [impresoras, setImpresoras] = useState<{ name: string; displayName: string; isDefault: boolean }[]>([]);

  // Cargar impresoras instaladas (solo en Electron) para el selector de tirilla.
  const cargarImpresoras = async () => {
    try {
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (!ipc) return;
      const lista = await ipc.invoke('print:listPrinters');
      setImpresoras(lista || []);
    } catch (e) { /* no-Electron o sin impresoras */ }
  };
  useEffect(() => { cargarImpresoras(); }, []);

  // Imprimir una tirilla de prueba en la impresora elegida.
  const probarImpresion = async () => {
    try {
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (!ipc) { toast.error('Solo disponible en la app de escritorio'); return; }
      if (!config.impresoraTirilla) { toast.error('Elige primero una impresora'); return; }
      const html = `<!DOCTYPE html><html><head><style>@page{size:72mm auto;margin:0}body{margin:0;font-family:Arial,sans-serif;font-size:11px;width:62mm;padding:3mm 4mm;text-align:center}</style></head><body>
        <div style="font-weight:bold;font-size:14px">PRUEBA DE IMPRESIÓN</div>
        <div style="border-top:1px dashed #000;margin:6px 0"></div>
        <div>Si lees esto, la impresión directa<br>funciona correctamente.</div>
        <div style="margin-top:6px">${new Date().toLocaleString('es-CO')}</div>
        <div style="border-top:1px dashed #000;margin:6px 0"></div>
        <div>Conta FT</div></body></html>`;
      const res = await ipc.invoke('print:silent', { html, deviceName: config.impresoraTirilla });
      if (res?.success) toast.success('Tirilla de prueba enviada');
      else toast.error('No se pudo imprimir: ' + (res?.reason || 'error'));
    } catch (e) { toast.error('Error al probar impresión'); }
  };

  const cargarCategorias = async () => {
    try {
      const r = await fetch(API_CAT);
      const d = await r.json();
      if (d.success) setCategoriasGasto(d.categorias || []);
    } catch (e) {}
  };

  useEffect(() => { cargarCategorias(); }, []);

  const crearCategoria = async () => {
    if (!nuevaCat.trim()) return;
    try {
      const r = await fetch(API_CAT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crear', nombre: nuevaCat.trim() }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setNuevaCat(''); cargarCategorias(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const editarCategoria = async (id: number) => {
    if (!editNombre.trim()) return;
    try {
      const r = await fetch(API_CAT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', id, nombre: editNombre.trim() }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setEditandoCat(null); cargarCategorias(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  const toggleCategoria = async (id: number, activa: boolean) => {
    try {
      const r = await fetch(API_CAT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activa ? 'eliminar' : 'activar', id }) });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargarCategorias(); }
    } catch (e) {}
  };

  const set = (field: keyof ConfigImpresion, value: any) => {
    setConfig(c => {
      const next = { ...c, [field]: value } as ConfigImpresion;
      // Impresión directa y vista previa son excluyentes: si imprime directo
      // no hay preview, y si pide preview no puede imprimir directo.
      if (field === 'impresionDirecta' && value) next.vistaPrevia = false;
      if (field === 'vistaPrevia' && value) next.impresionDirecta = false;
      return next;
    });
  };

  const guardar = () => {
    saveConfigImpresion(config);
    toast.success('Configuración guardada');
  };

  // ====== Config Vendedores Móviles ======
  const [vendConfig, setVendConfig] = useState({ habilitado: 0, api_url: '', api_email: '', api_token_empresa: '', sync_intervalo_pull_min: 15 });
  const [vendLoading, setVendLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:80/conta-app-backend/api/vendedores/config.php')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.config) {
          setVendConfig({
            habilitado: d.config.habilitado ?? 0,
            api_url: d.config.api_url ?? '',
            api_email: d.config.api_email ?? '',
            api_token_empresa: d.config.api_token_empresa ?? '',
            sync_intervalo_pull_min: d.config.sync_intervalo_pull_min ?? 15,
          });
        }
      })
      .catch(() => {});
  }, []);

  const guardarVendedores = async () => {
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/vendedores/config.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', ...vendConfig }),
      });
      const d = await r.json();
      if (d.success) toast.success('Configuración de vendedores guardada');
      else toast.error(d.message);
    } catch (e) { toast.error('Error de conexión'); }
  };

  const probarConexionVendedores = async () => {
    setVendLoading(true);
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/vendedores/config.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'probar', api_url: vendConfig.api_url, api_email: vendConfig.api_email, api_token_empresa: vendConfig.api_token_empresa }),
      });
      const d = await r.json();
      if (d.success) toast.success(d.message);
      else toast.error(d.message);
    } catch (e) { toast.error('Error de conexión'); }
    setVendLoading(false);
  };

  // Estado del último sync para mostrar en pantalla
  const [vendUltimoSync, setVendUltimoSync] = useState<{ tipo: 'push' | 'pull'; resumen: string; ts: string } | null>(null);

  // Subir catálogos + clientes + vendedores al hub (Lumen)
  const syncPushVendedores = async () => {
    if (!vendConfig.api_url || !vendConfig.api_email || !vendConfig.api_token_empresa) {
      toast.error('Configura URL, email y token primero');
      return;
    }
    setVendLoading(true);
    const tid = toast.loading('Subiendo catálogos al hub...');
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/vendedores/push-all.php', { method: 'POST' });
      const d = await r.json();
      toast.dismiss(tid);
      if (d.success) {
        const s = d.secciones || {};
        const resumen = `Cat: ${s.categorias?.enviados ?? 0} · Prod: ${s.productos?.enviados ?? 0} · Cli: ${s.clientes?.enviados ?? 0} · Vend: ${s.vendedores?.enviados ?? 0}`;
        toast.success(`Subido correctamente — ${resumen}`, { duration: 6000 });
        setVendUltimoSync({ tipo: 'push', resumen, ts: new Date().toLocaleString('es-CO') });
      } else {
        toast.error(d.message || 'Error subiendo al hub');
      }
    } catch (e) { toast.dismiss(tid); toast.error('Error de conexión al subir'); }
    setVendLoading(false);
  };

  // Bajar las ventas y ediciones de clientes que hicieron los vendedores móviles
  const syncPullVendedores = async () => {
    if (!vendConfig.api_url || !vendConfig.api_email || !vendConfig.api_token_empresa) {
      toast.error('Configura URL, email y token primero');
      return;
    }
    setVendLoading(true);
    const tid = toast.loading('Bajando cambios del hub móvil...');
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/vendedores/pull.php');
      const d = await r.json();
      toast.dismiss(tid);
      if (d.success) {
        const ventas = (d.pedidos_nuevos ?? 0) + (d.fe_nuevas ?? 0);
        const ediciones = d.ediciones_clientes_aplicadas ?? 0;
        const partes: string[] = [];
        if (ventas > 0) partes.push(`${ventas} venta(s)`);
        if (ediciones > 0) partes.push(`${ediciones} cliente(s) actualizado(s)`);
        const msg = partes.length > 0 ? `Traídos del hub: ${partes.join(' + ')}` : 'Sin cambios nuevos';
        toast.success(msg, { duration: 5000 });
        setVendUltimoSync({ tipo: 'pull', resumen: msg, ts: new Date().toLocaleString('es-CO') });
      } else {
        toast.error(d.message || 'Error trayendo cambios');
      }
    } catch (e) { toast.dismiss(tid); toast.error('Error de conexión al bajar'); }
    setVendLoading(false);
  };

  // Push + Pull en cascada — el botón "todo en uno"
  const syncCompletoVendedores = async () => {
    await syncPushVendedores();
    await syncPullVendedores();
  };

  const seccion = (titulo: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f3f4f6' }}>
        {icon}
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{titulo}</span>
      </div>
      {children}
    </div>
  );

  const formatoCard = (label: string, value: string, current: string, onClick: () => void, icon: string, desc: string) => {
    const selected = current === value;
    return (
      <div onClick={onClick} style={{
        flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', minWidth: 140,
        border: selected ? '2px solid #7c3aed' : '2px solid #e5e7eb',
        background: selected ? '#f5f3ff' : '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: selected ? '#7c3aed' : '#374151' }}>{label}</span>
          {selected && <CheckCircle size={14} color="#7c3aed" />}
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af' }}>{desc}</div>
      </div>
    );
  };

  const toggle = (label: string, field: keyof ConfigImpresion, desc?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</div>
        {desc && <div style={{ fontSize: 10, color: '#9ca3af' }}>{desc}</div>}
      </div>
      <div onClick={() => set(field, !config[field])}
        style={{ width: 40, height: 22, borderRadius: 12, cursor: 'pointer', padding: 2, transition: 'background 0.2s',
          background: config[field] ? '#7c3aed' : '#d1d5db' }}>
        <div style={{ width: 18, height: 18, borderRadius: 10, background: '#fff', transition: 'margin-left 0.2s',
          marginLeft: config[field] ? 18 : 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  );

  const selectField = (label: string, field: keyof ConfigImpresion, options: { value: any; label: string }[]) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</div>
      <select value={config[field] as any} onChange={e => {
        const v = e.target.value;
        set(field, isNaN(Number(v)) ? v : Number(v));
      }}
        style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const formatoImpresora = (label: string, field: 'formatoFactura' | 'formatoPago' | 'formatoCotizacion' | 'formatoInforme' | 'formatoCuadreCaja') => {
    const opciones = field === 'formatoInforme'
      ? [{ v: 'carta', l: 'Carta', i: '🖨️', d: 'Hoja completa' }, { v: 'media-carta', l: 'Media carta', i: '📄', d: 'Mitad de hoja' }]
      : field === 'formatoCuadreCaja'
      ? [{ v: 'tirilla', l: 'Tirilla (POS)', i: '🧾', d: 'Térmica 80mm' }, { v: 'media-carta', l: 'Media carta', i: '📄', d: 'Mitad de hoja' }]
      : [{ v: 'tirilla', l: 'Tirilla (POS)', i: '🧾', d: 'Térmica 80mm' }, { v: 'media-carta', l: 'Media carta', i: '📄', d: 'Mitad de hoja' }, { v: 'carta', l: 'Carta', i: '🖨️', d: 'Hoja completa' }];
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {opciones.map(o => formatoCard(o.l, o.v, config[field], () => set(field, o.v), o.i, o.d))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Configuración</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Preferencias del sistema</p>
        </div>
        <button onClick={guardar}
          style={{ height: 34, padding: '0 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={15} /> Guardar
        </button>
      </div>

      {/* Impresión - Formatos */}
      {seccion('Formato de Impresión', <Printer size={18} color="#7c3aed" />, (
        <div>
          {formatoImpresora('Facturas de Venta', 'formatoFactura')}
          {formatoImpresora('Recibos de Pago', 'formatoPago')}
          {formatoImpresora('Cotizaciones', 'formatoCotizacion')}
          {formatoImpresora('Cuadre de Caja', 'formatoCuadreCaja')}
          {formatoImpresora('Informes y Reportes', 'formatoInforme')}
        </div>
      ))}

      {/* Impresión - Comportamiento */}
      {seccion('Comportamiento de Impresión', <FileText size={18} color="#7c3aed" />, (
        <div>
          {toggle('Vista previa antes de imprimir', 'vistaPrevia', 'Si se desactiva, imprime directamente sin mostrar la ventana de vista previa')}
          {toggle('Imprimir factura al guardar', 'imprimirAlGuardar', 'Al finalizar una venta, imprime automáticamente')}
          {toggle('Imprimir cotización al guardar', 'imprimirCotizacion', 'Al guardar una cotización, imprime automáticamente')}
          {toggle('Impresión directa a la térmica (sin diálogo)', 'impresionDirecta', 'La tirilla sale sola a la impresora elegida, sin ventana de impresión. Acelera las ventas. Requiere elegir la impresora abajo.')}
          {config.impresionDirecta && (
            <div style={{ padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, marginTop: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b21a8', display: 'block', marginBottom: 6 }}>Impresora de tirilla</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={config.impresoraTirilla} onChange={e => set('impresoraTirilla', e.target.value)}
                  style={{ flex: 1, height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
                  <option value="">— Selecciona la impresora —</option>
                  {impresoras.map(p => (
                    <option key={p.name} value={p.name}>{p.displayName}{p.isDefault ? ' (predeterminada)' : ''}</option>
                  ))}
                </select>
                <button type="button" onClick={cargarImpresoras} title="Refrescar lista"
                  style={{ height: 32, padding: '0 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>↻</button>
                <button type="button" onClick={probarImpresion}
                  style={{ height: 32, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Probar</button>
              </div>
              {impresoras.length === 0 && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>No se detectaron impresoras (o estás en navegador). Abre la app de escritorio y dale ↻.</div>
              )}
            </div>
          )}
          {selectField('Copias de factura', 'copiasFactura', [{ value: 1, label: '1 copia' }, { value: 2, label: '2 copias' }, { value: 3, label: '3 copias' }])}
          {selectField('Copias de recibo', 'copiasPago', [{ value: 1, label: '1 copia' }, { value: 2, label: '2 copias' }, { value: 3, label: '3 copias' }])}
        </div>
      ))}

      {/* Datos en Factura */}
      {seccion('Datos en la Factura Impresa', <FileText size={18} color="#2563eb" />, (
        <div>
          {toggle('Mostrar propietario', 'mostrarPropietario')}
          {toggle('Mostrar teléfono empresa', 'mostrarTelefono')}
          {toggle('Mostrar dirección empresa', 'mostrarDireccion')}
          {toggle('Mostrar precio costo', 'mostrarPrecioCosto', 'Muestra el costo al lado del precio de venta (solo para uso interno)')}
          {toggle('Media carta lado derecho', 'mediaCartaDerecha', 'Imprime en la mitad derecha de la hoja')}
          {selectField('Máx. productos en media carta', 'maxProductosMediaCarta', [
            { value: 8, label: '8 productos' }, { value: 10, label: '10 productos' },
            { value: 12, label: '12 productos' }, { value: 15, label: '15 productos' },
            { value: 20, label: '20 productos (carta completa)' }
          ])}
          {/* Frase promocional al final del ticket. Al estilo VB6 que mostraba
              "** FELIZ NAVIDAD Y PROSPERO AÑO NUEVO **". Se puede cambiar por
              cualquier frase (agradecimiento, temporada, promoción). Vacío = no imprime. */}
          <div style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', margin: '4px 0' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Frase al final del ticket
            </label>
            <input type="text"
              value={config.fraseFinalTicket || ''}
              onChange={e => set('fraseFinalTicket', e.target.value.toUpperCase())}
              placeholder="Ej: GRACIAS POR SU COMPRA, FELIZ NAVIDAD..."
              maxLength={80}
              style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', textTransform: 'uppercase' }} />
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
              Aparece centrada en negrita al final de la factura, antes del texto legal. Dejar vacío para no imprimir.
            </div>
          </div>
          {selectField('Formato de fecha', 'formatoFecha', [
            { value: 'dd/mm/yyyy', label: 'DD/MM/AAAA' },
            { value: 'yyyy-mm-dd', label: 'AAAA-MM-DD' },
            { value: 'mm/dd/yyyy', label: 'MM/DD/AAAA' }
          ])}
        </div>
      ))}

      {/* Ventas */}
      {seccion('Opciones de Venta', <ShoppingCart size={18} color="#16a34a" />, (
        <div>
          {selectField('Campo predeterminado en ventas', 'campoPredeterminado', [
            { value: 'codigo', label: 'Código de barras' },
            { value: 'nombre', label: 'Nombre del artículo' }
          ])}
          {toggle('Precio con IVA incluido', 'precioIvaIncluido', 'El precio de venta ya incluye el IVA')}
          {toggle('Usar decimales', 'usarDecimales', 'Permitir cantidades con decimales (ej: 1.5 kg)')}
          {config.usarDecimales && selectField('Número de decimales', 'numDecimales', [
            { value: 1, label: '1 decimal' }, { value: 2, label: '2 decimales' }, { value: 3, label: '3 decimales' }
          ])}
        </div>
      ))}

      {/* Seguridad — autorización por administrador */}
      {seccion('Seguridad — Autorización Admin', <Settings size={18} color="#dc2626" />, (
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: -8, marginBottom: 14 }}>
            Si activás alguna de estas opciones, el sistema pedirá el usuario y contraseña de un administrador antes de ejecutar la acción. Útil para supermercados y comercios donde los cajeros tienen permisos limitados.
          </p>
          {toggle('Pedir clave admin para devoluciones', 'autorizarDevoluciones', 'Cuando un vendedor intente devolver una factura, debe pasar el supervisor a autorizar')}
          {toggle('Pedir clave admin para anulaciones', 'autorizarAnulaciones', 'Anular una venta requerirá autorización de un administrador')}
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#713f12', marginTop: 8 }}>
            🔒 <b>Override de cupo</b>: las ventas a crédito que superen el cupo del cliente <b>siempre</b> requieren autorización del administrador. Esta protección no es configurable.
          </div>
        </div>
      ))}

      {/* Reglas de Venta */}
      {seccion('Reglas de Venta', <Settings size={18} color="#16a34a" />, (
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: -8, marginBottom: 14 }}>
            Validaciones automáticas que el sistema aplica al facturar.
          </p>
          {toggle('Permitir facturar en negativo', 'permitirFacturarNegativo', 'Si está apagado, el sistema bloquea la venta cuando la cantidad supera la existencia disponible')}
          {toggle('Validar precio mínimo y costo', 'validarPrecioMinimo', 'Si está activo, no se puede vender por debajo del Precio Mínimo del artículo, ni por debajo o igual al Precio de Costo')}
          {toggle('Permitir el mismo producto en varias líneas', 'permitirRepetirProducto', 'Si está activo, agregar un producto que ya está en la factura crea una línea nueva en lugar de sumar cantidad. Útil para precios distintos por unidad o promociones')}
          {toggle('Permitir cambiar la fecha de la venta', 'permitirFechaVenta', 'Si está activo, en Nueva Venta aparece un campo Fecha editable (default hoy). Útil cuando el negocio no alcanza a facturar el mismo día y debe registrar ventas atrasadas con la fecha real')}
        </div>
      ))}

      {/* Módulos del Negocio */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Settings size={20} color="#7c3aed" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Módulos del Negocio</span>
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Active solo las funciones que su negocio necesita</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo de negocio</label>
          <select value={config.tipoNegocio} onChange={e => set('tipoNegocio', e.target.value)}
            style={{ height: 32, width: 250, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px' }}>
            <option value="">-- Seleccionar --</option>
            {['Tienda / Abarrotes', 'Farmacia / Droguería', 'Boutique / Ropa', 'Agropecuaria', 'Accesorios Celular', 'Dulcería', 'Ferretería', 'Papelería', 'Restaurante', 'Distribuidora', 'Otro'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { key: 'usarFamilias', label: 'Familias de productos', desc: 'Agrupar unidades del mismo producto (Bulto, Kilo, Libra, Caja) como SKUs distintos. Al vender una unidad pequeña sin stock, el sistema abre automáticamente una unidad mayor.' },
            { key: 'confirmarDistribucion', label: 'Confirmar antes de distribuir', desc: 'Cuando el sistema necesite abrir una unidad mayor para completar una venta, pide confirmación. Si está desactivado, lo hace en silencio.' },
            { key: 'usarFacturacionElectronica', label: 'Facturación electrónica (DIAN)', desc: 'Enviar facturas electrónicas a la DIAN. Requiere certificado digital y resolución de numeración.' },
            { key: 'modoPruebaFE', label: 'Modo prueba FE (no enviar a DIAN)', desc: 'Las facturas electrónicas se envían a un endpoint de previsualización en vez de la DIAN. NO gasta consecutivo, NO firma, NO contacta DIAN. Útil para validar el XML sin generar movimiento real. APAGAR EN PRODUCCIÓN.' },
            { key: 'usarCotizaciones', label: 'Cotizaciones', desc: 'Crear y guardar cotizaciones para clientes antes de facturar.' },
            { key: 'usarConteoInventario', label: 'Conteo de inventario', desc: 'Realizar conteos físicos de inventario con compensación automática de ventas durante el conteo.' },
            { key: 'usarLotes', label: 'Fechas de vencimiento / Lotes', desc: 'Activa el manejo de lotes y fechas de vencimiento en compras y productos. Para farmacias, droguerías, alimentos, lácteos. Si está apagado, las compras NO piden fecha de vencimiento ni muestran productos perecederos aunque estén marcados así en el catálogo.' },
            { key: 'usarFinanciaciones', label: 'Financiaciones (créditos con cuotas)', desc: 'Activa el módulo de Financiaciones para negocios que venden a plazos (motos, electrodomésticos, muebles). Permite registrar contratos con cronograma de cuotas de fechas y valores libres, y llevar el cobro por cliente.' },
            { key: 'usarAnticipos', label: 'Anticipos de clientes (saldo a favor)', desc: 'Activa el módulo de Anticipos: el cliente entrega dinero hoy para usar en compras futuras. Aparece un saldo a favor que se aplica automáticamente al facturar. Útil en boutiques, ferreterías, motos, muebles.' },
            { key: 'mostrarSaldoEnListado', label: 'Mostrar columna Saldo en Listado de Ventas', desc: 'DESACTIVAR EN PCs LENTOS (Celeron, HDD): calcular el saldo pendiente en cada venta agrega ~30ms por consulta. Con esta opción apagada el listado carga mucho más rápido; el saldo se consulta en el módulo Cartera o al abrir el detalle de la factura.' },
          ].map(m => (
            <label key={m.key}
              onClick={() => set(m.key as keyof ConfigImpresion, !(config as any)[m.key])}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${(config as any)[m.key] ? '#7c3aed' : '#e5e7eb'}`, background: (config as any)[m.key] ? '#f5f3ff' : '#fff', transition: 'all 0.15s' }}>
              <div style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                border: `2px solid ${(config as any)[m.key] ? '#7c3aed' : '#d1d5db'}`,
                background: (config as any)[m.key] ? '#7c3aed' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {(config as any)[m.key] && <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: (config as any)[m.key] ? '#7c3aed' : '#374151' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{m.desc}</div>
              </div>
            </label>
          ))}

          {/* Rendimiento — cuántas facturas trae el Listado de Ventas.
              PCs rápidos: 500-1000. Celeron/HDD: 100-200. */}
          <div style={{ marginTop: 4, padding: '12px 14px', border: '1px dashed #93c5fd', borderRadius: 8, background: '#eff6ff' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>Rendimiento del listado de ventas</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, color: '#374151' }}>Traer máximo:</label>
              <select
                value={config.limiteListadoVentas || 500}
                onChange={e => set('limiteListadoVentas', parseInt(e.target.value))}
                style={{ height: 30, width: 130, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, padding: '0 8px', fontWeight: 700, color: '#1e40af' }}>
                <option value={100}>100 facturas</option>
                <option value={200}>200 facturas</option>
                <option value={500}>500 facturas</option>
                <option value={1000}>1000 facturas</option>
                <option value={2000}>2000 facturas</option>
              </select>
              <span style={{ fontSize: 11, color: '#6b7280' }}>por consulta</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
              Ideal <b>100-200</b> en PCs lentos (Celeron, HDD). <b>500</b> es el default. <b>1000+</b> solo en PCs modernos con SSD. Menos filas = tabla más rápida de renderizar.
            </div>
          </div>

          {/* Sub-config de Financiaciones — solo aparece si el módulo está activo.
              Deja la tasa en 0 para que el sistema NO cobre mora (opcional). */}
          {config.usarFinanciaciones && (
            <div style={{ marginTop: 4, padding: '12px 14px', border: '1px dashed #c4b5fd', borderRadius: 8, background: '#faf5ff' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b21a8', marginBottom: 6 }}>Interés de mora</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" min={0} max={20} step="0.1"
                  value={config.tasaMoraMensual}
                  onChange={e => set('tasaMoraMensual', parseFloat(e.target.value) || 0)}
                  style={{ width: 90, height: 30, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#7c3aed' }} />
                <span style={{ fontSize: 12, color: '#374151' }}>% mensual sobre valor de cuota vencida</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                Deje en <b>0</b> si su negocio no cobra mora. Ejemplo: 2% mensual sobre una cuota de $400.000 a 45 días vencida = ~$12.000 de interés.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vendedores Móviles */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Smartphone size={20} color="#7c3aed" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Vendedores Móviles</span>
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Conecte vendedores de campo con la app móvil</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${vendConfig.habilitado ? '#7c3aed' : '#e5e7eb'}`, background: vendConfig.habilitado ? '#f5f3ff' : '#fff' }}
            onClick={() => setVendConfig(c => ({ ...c, habilitado: c.habilitado ? 0 : 1 }))}>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${vendConfig.habilitado ? '#7c3aed' : '#d1d5db'}`, background: vendConfig.habilitado ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {vendConfig.habilitado && <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: vendConfig.habilitado ? '#7c3aed' : '#374151' }}>Habilitar módulo de vendedores móviles</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Aparece la sección Vendedores en el menú y se activa la sincronización</div>
            </div>
          </label>

          {vendConfig.habilitado === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, padding: 14, background: '#f9fafb', borderRadius: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>URL de la API remota</label>
                <input value={vendConfig.api_url} onChange={e => setVendConfig(c => ({ ...c, api_url: e.target.value }))}
                  placeholder="https://conta-basic.innovacion-digital.com/api-conta/public"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Email de la empresa en la API</label>
                <input value={vendConfig.api_email} onChange={e => setVendConfig(c => ({ ...c, api_email: e.target.value }))}
                  placeholder="empresa@ejemplo.com"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Token API</label>
                <input type="password" value={vendConfig.api_token_empresa} onChange={e => setVendConfig(c => ({ ...c, api_token_empresa: e.target.value }))}
                  placeholder="Token de la tabla empresas en la API remota"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Intervalo de descarga automática (minutos)</label>
                <select value={vendConfig.sync_intervalo_pull_min} onChange={e => setVendConfig(c => ({ ...c, sync_intervalo_pull_min: Number(e.target.value) }))}
                  style={{ height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 13 }}>
                  {[5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={probarConexionVendedores} disabled={vendLoading}
                  style={{ height: 32, padding: '0 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={13} /> {vendLoading ? 'Probando...' : 'Probar conexión'}
                </button>
                <button onClick={guardarVendedores}
                  style={{ height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={13} /> Guardar
                </button>
              </div>

              {/* Sincronización manual */}
              <div style={{ marginTop: 12, padding: 12, background: '#fff', border: '1px dashed #c4b5fd', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b21a8', marginBottom: 8 }}>Sincronización</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={syncPushVendedores} disabled={vendLoading}
                    title="Sube catálogos, clientes y vendedores del Conta FT al hub"
                    style={{ height: 32, padding: '0 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⬆️ Subir al hub
                  </button>
                  <button onClick={syncPullVendedores} disabled={vendLoading}
                    title="Trae al Conta FT las ventas hechas por los vendedores y las ediciones de clientes (teléfono, GPS, dirección) hechas en los móviles"
                    style={{ height: 32, padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⬇️ Bajar cambios
                  </button>
                  <button onClick={syncCompletoVendedores} disabled={vendLoading}
                    title="Sube y baja en una sola acción"
                    style={{ height: 32, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🔄 Sincronizar todo
                  </button>
                </div>
                {vendUltimoSync && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                    Última sincronización ({vendUltimoSync.tipo === 'push' ? 'subida' : 'bajada'}): <b>{vendUltimoSync.resumen}</b> · {vendUltimoSync.ts}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Acerca de — visible solo para admins (esta vista ya está restringida) */}
      {seccion('Acerca del sistema', <Info size={18} color="#7c3aed" />, (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: 0.5, marginBottom: 2 }}>VERSIÓN INSTALADA</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>v{pkg.version}</div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: 0.5, marginBottom: 2 }}>SISTEMA</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Conta FT — Facturación</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Innovación Digital</div>
            </div>
          </div>
          <button onClick={() => setShowHistorial(true)}
            style={{ width: '100%', height: 40, background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <History size={15} /> Ver historial completo de versiones
          </button>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
            Historial de cambios, mejoras y correcciones por versión. Solo visible para administradores.
          </div>
        </div>
      ))}

      <HistorialVersiones open={showHistorial} onClose={() => setShowHistorial(false)} />
    </div>
  );
}
