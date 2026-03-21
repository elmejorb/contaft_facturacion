import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import api from '../services/api';

interface Articulo {
  Items: number; Codigo: string; Descripcion: string; Existencia: number;
  Iva: number; Costo: number; Precio1: number; Precio2: number;
  Precio3: number; PrecioMinimo: number; Categoria: string; Proveedor: string; Estado: string;
  Id_Categoria?: number; CodigoPro?: number; Estante?: string; Existencia_minima?: number;
}

interface Props {
  isOpen: boolean; onClose: () => void; articulo: Articulo | null; onGuardado: () => void;
  modo?: 'editar' | 'nuevo';
}

interface CatOpt { Id_Categoria: number; Categoria: string; }
interface ProvOpt { CodigoPro: number; RazonSocial: string; }

export function EditarArticuloModal({ isOpen, onClose, articulo, onGuardado, modo = 'editar' }: Props) {
  const esNuevo = modo === 'nuevo';

  const formVacio = {
    Items: 0, Codigo: '', Nombres_Articulo: '',
    Precio_Costo: 0, Precio_Venta: 0, Precio_Venta2: 0, Precio_Venta3: 0,
    Precio_Minimo: 0, Iva: 0, Existencia_minima: 0,
    Id_Categoria: 0, CodigoPro: 0, Estante: '', Estado: 1,
  };

  const formDesdeArticulo = (a: Articulo) => ({
    Items: a.Items, Codigo: a.Codigo || '', Nombres_Articulo: a.Descripcion || '',
    Precio_Costo: a.Costo || 0, Precio_Venta: a.Precio1 || 0,
    Precio_Venta2: a.Precio2 || 0, Precio_Venta3: a.Precio3 || 0,
    Precio_Minimo: a.PrecioMinimo || 0, Iva: a.Iva || 0,
    Existencia_minima: a.Existencia_minima || 0,
    Id_Categoria: a.Id_Categoria || 0,
    CodigoPro: a.CodigoPro || 0,
    Estante: a.Estante || '',
    Estado: a.Estado === 'Activo' ? 1 : 0,
  });

  // Inicializar form directamente desde props (no useEffect)
  const formInicial = esNuevo ? formVacio : (articulo ? formDesdeArticulo(articulo) : formVacio);

  const [form, setForm] = useState(formInicial);
  const [categorias, setCategorias] = useState<CatOpt[]>([]);
  const [proveedores, setProveedores] = useState<ProvOpt[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Re-sincronizar form cuando cambia el artículo o el modo
  useEffect(() => {
    if (esNuevo) { setForm(formVacio); setMensaje(null); }
    else if (articulo) { setForm(formDesdeArticulo(articulo)); setMensaje(null); }
  }, [articulo, esNuevo]);

  useEffect(() => {
    if (isOpen) {
      api.get('/inventario/opciones.php').then(res => {
        if (res.data.success) { setCategorias(res.data.categorias || []); setProveedores(res.data.proveedores || []); }
      }).catch(() => {});
    }
  }, [isOpen]);

  const set = (f: string, v: string | number) => setForm(p => ({ ...p, [f]: v }));
  const util = (pv: number) => (!form.Precio_Costo || !pv) ? '0.0' : (((pv - form.Precio_Costo) / pv) * 100).toFixed(1);
  const costoIva = () => (form.Precio_Costo * (1 + form.Iva / 100)).toFixed(0);
  const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

  const handleGuardar = async () => {
    if (esNuevo && (!form.Codigo || !form.Nombres_Articulo)) {
      setMensaje({ tipo: 'error', texto: 'Código y nombre son obligatorios' });
      return;
    }
    try {
      setGuardando(true); setMensaje(null);
      const url = esNuevo ? '/inventario/crear-articulo.php' : '/inventario/actualizar-articulo.php';
      const r = esNuevo ? await api.post(url, form) : await api.put(url, form);
      if (r.data.success) {
        setMensaje({ tipo: 'ok', texto: esNuevo ? 'Artículo creado' : 'Artículo actualizado' });
        setTimeout(() => { onGuardado(); onClose(); }, 500);
      } else setMensaje({ tipo: 'error', texto: r.data.message || 'Error' });
    } catch { setMensaje({ tipo: 'error', texto: 'Error de conexión' }); }
    finally { setGuardando(false); }
  };

  // Solo permite números, punto decimal y Enter para saltar al siguiente campo
  const soloNumeros = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Buscar todos los inputs con data-precio dentro del fieldset Detalle
      const container = (e.target as HTMLElement).closest('fieldset');
      if (!container) return;
      const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[data-precio]'));
      const idx = inputs.indexOf(e.target as HTMLInputElement);
      if (idx >= 0 && idx < inputs.length - 1) {
        (e.target as HTMLInputElement).blur(); // dispara onBlur para guardar
        setTimeout(() => inputs[idx + 1].focus(), 10);
      }
      return;
    }
    const permitidos = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
    if (!permitidos.includes(e.key)) e.preventDefault();
    if (e.key === '.' && (e.target as HTMLInputElement).value.includes('.')) e.preventDefault();
  };

  const toNum = (v: string) => parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
  const fmtMoneda = (valor: number) => '$ ' + Math.round(valor || 0).toLocaleString('es-CO');

  // Input que muestra formato moneda sin foco, número crudo con foco
  // Usa el DOM directamente para evitar re-renders que mueven el cursor
  const monedaProps = (campo: string, valor: number, onChange: (v: number) => void) => ({
    type: 'text' as const,
    defaultValue: fmtMoneda(valor),
    onKeyDown: soloNumeros,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.value = String(valor || '');
      e.target.select();
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const num = toNum(e.target.value);
      onChange(num);
      e.target.value = fmtMoneda(num);
    },
  });

  if (!isOpen || (!esNuevo && !articulo)) return null;

  // Styles
  const s = {
    overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' },
    modal: { position: 'relative' as const, background: '#fff', borderRadius: 10, width: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
    header: { background: 'linear-gradient(135deg, #7c3aed, #2563eb)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    body: { padding: 14, overflowY: 'auto' as const, flex: 1 },
    footer: { padding: '8px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 6 },
    fieldset: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', margin: 0, marginBottom: 10 },
    legend: { fontSize: 11, fontWeight: 600, color: '#7c3aed', padding: '0 4px' },
    label: { display: 'block', fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 },
    input: { width: '100%', height: 28, padding: '0 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
    inputDisabled: { background: '#f3f4f6', color: '#9ca3af' },
    select: { width: '100%', height: 28, padding: '0 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
    row: { display: 'grid', gap: 8, marginBottom: 6 },
    btn: { height: 30, padding: '0 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 },
  };

  return (
    <div style={s.overlay}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{esNuevo ? 'Nuevo Producto' : 'Editar Producto'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body - key fuerza re-mount al cambiar de artículo */}
        <div key={esNuevo ? 'nuevo' : `${form.Items}-${form.Precio_Venta}-${form.Precio_Costo}`} style={s.body}>
          {/* Datos del Producto */}
          <fieldset style={s.fieldset}>
            <legend style={s.legend}>Datos del Producto</legend>
            <div style={{ ...s.row, gridTemplateColumns: '80px 1fr 130px' }}>
              <div>
                <label style={s.label}>Items</label>
                <input value={esNuevo ? 'Auto' : form.Items} disabled style={{ ...s.input, ...s.inputDisabled }} />
              </div>
              <div>
                <label style={s.label}>Código</label>
                <input value={form.Codigo} onChange={e => set('Codigo', e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Estado</label>
                <select value={form.Estado} onChange={e => set('Estado', parseInt(e.target.value))} style={s.select}>
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Descripción</label>
              <input value={form.Nombres_Articulo} onChange={e => set('Nombres_Articulo', e.target.value)} style={s.input} />
            </div>
            <div style={{ ...s.row, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label style={s.label}>Proveedor</label>
                <select value={form.CodigoPro} onChange={e => set('CodigoPro', parseInt(e.target.value))} style={s.select}>
                  <option value={0}>-- Seleccionar --</option>
                  {proveedores.map(p => <option key={p.CodigoPro} value={p.CodigoPro}>{p.RazonSocial}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Categoría</label>
                <select value={form.Id_Categoria} onChange={e => set('Id_Categoria', parseInt(e.target.value))} style={s.select}>
                  <option value={0}>-- Seleccionar --</option>
                  {categorias.map(c => <option key={c.Id_Categoria} value={c.Id_Categoria}>{c.Categoria}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Unidad de Medida</label>
                <select style={s.select}><option>Unidad</option><option>Kilogramo</option><option>Litro</option></select>
              </div>
            </div>
          </fieldset>

          {/* Existencias + Ubicación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <fieldset style={{ ...s.fieldset, marginBottom: 0 }}>
              <legend style={s.legend}>Existencias</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={s.label}>Cantidad</label>
                  <input value={esNuevo ? 0 : (articulo?.Existencia || 0)} disabled style={{ ...s.input, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={s.label}>Exist. Mínima</label>
                  <input type="text" defaultValue={form.Existencia_minima}
                    onKeyDown={soloNumeros}
                    onBlur={e => set('Existencia_minima', toNum(e.target.value))}
                    style={{ ...s.input, background: '#fef2f2', borderColor: '#fecaca' }} />
                </div>
              </div>
            </fieldset>
            <fieldset style={{ ...s.fieldset, marginBottom: 0 }}>
              <legend style={s.legend}>Ubicación</legend>
              <div>
                <label style={s.label}>Estante</label>
                <input value={form.Estante} onChange={e => set('Estante', e.target.value)} style={s.input} />
              </div>
            </fieldset>
          </div>

          {/* Detalle */}
          <fieldset style={s.fieldset}>
            <legend style={s.legend}>Detalle</legend>
            <div style={{ ...s.row, gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
              <div>
                <label style={s.label}>Costo sin IVA</label>
                <input data-precio="true" data-costo-sin-iva="true"
                  defaultValue={fmtMoneda(form.Precio_Costo)}
                  onKeyDown={soloNumeros}
                  onFocus={e => { e.target.value = String(form.Precio_Costo || ''); e.target.select(); }}
                  onBlur={e => {
                    const v = toNum(e.target.value);
                    set('Precio_Costo', v);
                    e.target.value = fmtMoneda(v);
                    // Sincronizar costo con IVA
                    const costoConIvaInput = e.target.closest('div')?.parentElement?.querySelector<HTMLInputElement>('[data-costo-con-iva]');
                    if (costoConIvaInput) costoConIvaInput.value = fmtMoneda(v * (1 + form.Iva / 100));
                  }}
                  style={{ ...s.input, background: '#fefce8', borderColor: '#fde047', fontWeight: 600 }} />
              </div>
              <div>
                <label style={s.label}>IVA %</label>
                <select value={form.Iva} onChange={e => {
                  const newIva = parseFloat(e.target.value);
                  set('Iva', newIva);
                  // Sincronizar costo con IVA al cambiar IVA
                  setTimeout(() => {
                    const costoConIvaInput = document.querySelector<HTMLInputElement>('[data-costo-con-iva]');
                    if (costoConIvaInput) costoConIvaInput.value = fmtMoneda(form.Precio_Costo * (1 + newIva / 100));
                    const costoSinIvaInput = document.querySelector<HTMLInputElement>('[data-costo-sin-iva]');
                    if (costoSinIvaInput) costoSinIvaInput.value = fmtMoneda(form.Precio_Costo);
                  }, 20);
                }} style={s.select}>
                  <option value={0}>Exento (0%)</option>
                  <option value={5}>HR (5%)</option>
                  <option value={19}>IVA (19%)</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Costo con IVA</label>
                <input data-precio="true" data-costo-con-iva="true"
                  defaultValue={fmtMoneda(form.Precio_Costo * (1 + form.Iva / 100))}
                  onKeyDown={soloNumeros}
                  onFocus={e => { e.target.value = String(Math.round(form.Precio_Costo * (1 + form.Iva / 100)) || ''); e.target.select(); }}
                  onBlur={e => {
                    const costoConIva = toNum(e.target.value);
                    e.target.value = fmtMoneda(costoConIva);
                    // Calcular costo sin IVA a partir del costo con IVA
                    const costoSinIva = form.Iva > 0 ? Math.round(costoConIva / (1 + form.Iva / 100)) : costoConIva;
                    set('Precio_Costo', costoSinIva);
                    // Sincronizar campo costo sin IVA
                    const costoSinIvaInput = e.target.closest('div')?.parentElement?.querySelector<HTMLInputElement>('[data-costo-sin-iva]');
                    if (costoSinIvaInput) costoSinIvaInput.value = fmtMoneda(costoSinIva);
                  }}
                  style={{ ...s.input, background: '#f0fdf4', borderColor: '#86efac', color: '#16a34a', fontWeight: 600 }} />
              </div>
            </div>

            {/* Tabla precios: % incremento | Precio Venta | Utilidad $ */}
            <div style={{ display: 'grid', gridTemplateColumns: '85px 65px 1fr 80px', gap: '4px 6px', alignItems: 'center', fontSize: 11 }}>
              {/* Header */}
              <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}></span>
              <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>% Increm.</span>
              <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Precio Venta</span>
              <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Utilidad $</span>

              {[
                { label: 'P. al Público 1', field: 'Precio_Venta', val: form.Precio_Venta, main: true },
                { label: 'P. al Público 2', field: 'Precio_Venta2', val: form.Precio_Venta2, main: false },
                { label: 'P. al Público 3', field: 'Precio_Venta3', val: form.Precio_Venta3, main: false },
                { label: 'P. Mínimo', field: 'Precio_Minimo', val: form.Precio_Minimo, main: false },
              ].map(row => {
                const cIva = form.Precio_Costo * (1 + form.Iva / 100);
                const pct = cIva > 0 ? ((row.val - cIva) / cIva) * 100 : 0;
                const ganancia = row.val - cIva;

                // Sincroniza el input hermano y el span de utilidad
                const syncSiblings = (container: HTMLElement, newPrice: number) => {
                  const pctInput = container.querySelector<HTMLInputElement>(`[data-pct="${row.field}"]`);
                  const priceInput = container.querySelector<HTMLInputElement>(`[data-price="${row.field}"]`);
                  const utilSpan = container.querySelector<HTMLSpanElement>(`[data-util="${row.field}"]`);
                  const newPct = cIva > 0 ? ((newPrice - cIva) / cIva) * 100 : 0;
                  const newGanancia = newPrice - cIva;
                  if (pctInput && document.activeElement !== pctInput) pctInput.value = newPct.toFixed(2) + '%';
                  if (priceInput && document.activeElement !== priceInput) priceInput.value = fmtMoneda(newPrice);
                  if (utilSpan) {
                    utilSpan.textContent = fmt(newGanancia);
                    utilSpan.style.color = newGanancia >= 0 ? '#16a34a' : '#dc2626';
                  }
                };

                return [
                  <span key={row.field + '_l'} style={{ fontSize: 11, color: '#6b7280', fontWeight: row.main ? 600 : 400 }}>{row.label}</span>,
                  <input key={row.field + '_pct'} type="text" data-precio="true" data-pct={row.field}
                    defaultValue={pct > 0 ? pct.toFixed(2) + '%' : '0.00%'}
                    onKeyDown={soloNumeros}
                    onFocus={(e) => { e.target.value = pct > 0 ? pct.toFixed(2) : ''; e.target.select(); }}
                    onBlur={(e) => {
                      const newPct = toNum(e.target.value);
                      const newPrice = Math.round(cIva * (1 + newPct / 100));
                      set(row.field, newPrice);
                      e.target.value = newPct.toFixed(2) + '%';
                      const fs = e.target.closest('fieldset');
                      if (fs) syncSiblings(fs, newPrice);
                    }}
                    style={{ ...s.input, height: 26, fontSize: 11, textAlign: 'center', background: '#f9fafb' }} />,
                  <input key={row.field + '_price'} type="text" data-precio="true" data-price={row.field}
                    defaultValue={fmtMoneda(row.val)}
                    onKeyDown={soloNumeros}
                    onFocus={(e) => { e.target.value = String(row.val || ''); e.target.select(); }}
                    onBlur={(e) => {
                      const num = toNum(e.target.value);
                      set(row.field, num);
                      e.target.value = fmtMoneda(num);
                      const fs = e.target.closest('fieldset');
                      if (fs) syncSiblings(fs, num);
                    }}
                    style={{ ...s.input, height: 26, fontSize: 11, fontWeight: row.main ? 600 : 400, background: row.main ? '#fff' : '#f9fafb', borderColor: row.main ? '#7c3aed' : '#d1d5db' }} />,
                  <span key={row.field + '_g'} data-util={row.field} style={{
                    textAlign: 'right', fontSize: 11, fontWeight: 500,
                    color: ganancia >= 0 ? '#16a34a' : '#dc2626'
                  }}>{fmt(ganancia)}</span>,
                ];
              })}
            </div>
          </fieldset>

          {/* Mensaje */}
          {mensaje && (
            <div style={{
              padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, marginTop: 6,
              background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
              color: mensaje.tipo === 'ok' ? '#16a34a' : '#dc2626',
              border: `1px solid ${mensaje.tipo === 'ok' ? '#86efac' : '#fecaca'}`
            }}>
              {mensaje.texto}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onClose} style={{ ...s.btn, background: '#fff', color: '#374151', border: '1px solid #d1d5db' }}>
            <X size={15} /> Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            style={{ ...s.btn, background: '#7c3aed', color: '#fff', opacity: guardando ? 0.6 : 1 }}>
            <Save size={15} /> {guardando ? 'Guardando...' : esNuevo ? 'Crear Producto' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
