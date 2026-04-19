import { useState, useEffect } from 'react';
import { Save, Printer, CheckCircle, Settings, FileText, ShoppingCart, Tag, Plus, Trash2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export interface ConfigImpresion {
  // Formato de impresión
  formatoFactura: 'media-carta' | 'tirilla' | 'carta';
  formatoPago: 'media-carta' | 'tirilla';
  formatoCotizacion: 'media-carta' | 'tirilla' | 'carta';
  formatoInforme: 'carta' | 'media-carta';
  // Comportamiento
  vistaPrevia: boolean; // true = preview, false = imprime directo
  imprimirAlGuardar: boolean; // imprimir automáticamente al guardar factura
  imprimirCotizacion: boolean; // imprimir al guardar cotización
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
  agruparProductos: boolean; // agrupar productos iguales
  // Ventas
  campoPredeterminado: 'codigo' | 'nombre'; // campo donde inicia el cursor al vender
  usarDecimales: boolean;
  numDecimales: number;
  precioIvaIncluido: boolean;
  // Módulos opcionales del negocio
  usarFamilias: boolean; // familias de productos + distribución entre unidades
  confirmarDistribucion: boolean; // pedir confirmación antes de distribuir desde unidad mayor
  usarFacturacionElectronica: boolean;
  usarCotizaciones: boolean;
  usarConteoInventario: boolean;
  tipoNegocio: string; // Tienda, Farmacia, Boutique, etc.
}

const CONFIG_KEY = 'config_sistema';

const defaultConfig: ConfigImpresion = {
  formatoFactura: 'media-carta',
  formatoPago: 'media-carta',
  formatoCotizacion: 'media-carta',
  formatoInforme: 'carta',
  vistaPrevia: true,
  imprimirAlGuardar: true,
  imprimirCotizacion: false,
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
  agruparProductos: false,
  campoPredeterminado: 'codigo',
  usarDecimales: false,
  numDecimales: 2,
  precioIvaIncluido: true,
  usarFamilias: false,
  confirmarDistribucion: true,
  usarFacturacionElectronica: false,
  usarCotizaciones: true,
  usarConteoInventario: true,
  tipoNegocio: '',
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

const API_CAT = 'http://localhost:80/conta-app-backend/api/movimientos/categorias-gasto.php';

export function ConfiguracionSistema() {
  const [config, setConfig] = useState<ConfigImpresion>(getConfigImpresion);
  const [categoriasGasto, setCategoriasGasto] = useState<any[]>([]);
  const [nuevaCat, setNuevaCat] = useState('');
  const [editandoCat, setEditandoCat] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');

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
    setConfig(c => ({ ...c, [field]: value }));
  };

  const guardar = () => {
    saveConfigImpresion(config);
    toast.success('Configuración guardada');
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

  const formatoImpresora = (label: string, field: 'formatoFactura' | 'formatoPago' | 'formatoCotizacion' | 'formatoInforme') => {
    const opciones = field === 'formatoInforme'
      ? [{ v: 'carta', l: 'Carta', i: '🖨️', d: 'Hoja completa' }, { v: 'media-carta', l: 'Media carta', i: '📄', d: 'Mitad de hoja' }]
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
          {formatoImpresora('Informes y Reportes', 'formatoInforme')}
        </div>
      ))}

      {/* Impresión - Comportamiento */}
      {seccion('Comportamiento de Impresión', <FileText size={18} color="#7c3aed" />, (
        <div>
          {toggle('Vista previa antes de imprimir', 'vistaPrevia', 'Si se desactiva, imprime directamente sin mostrar preview (requiere Electron)')}
          {toggle('Imprimir factura al guardar', 'imprimirAlGuardar', 'Al finalizar una venta, imprime automáticamente')}
          {toggle('Imprimir cotización al guardar', 'imprimirCotizacion', 'Al guardar una cotización, imprime automáticamente')}
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
          {toggle('Agrupar productos iguales', 'agruparProductos', 'Si un producto aparece 2 veces, lo agrupa sumando cantidades')}
          {selectField('Máx. productos en media carta', 'maxProductosMediaCarta', [
            { value: 8, label: '8 productos' }, { value: 10, label: '10 productos' },
            { value: 12, label: '12 productos' }, { value: 15, label: '15 productos' },
            { value: 20, label: '20 productos (carta completa)' }
          ])}
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
            { key: 'usarCotizaciones', label: 'Cotizaciones', desc: 'Crear y guardar cotizaciones para clientes antes de facturar.' },
            { key: 'usarConteoInventario', label: 'Conteo de inventario', desc: 'Realizar conteos físicos de inventario con compensación automática de ventas durante el conteo.' },
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
        </div>
      </div>
    </div>
  );
}
