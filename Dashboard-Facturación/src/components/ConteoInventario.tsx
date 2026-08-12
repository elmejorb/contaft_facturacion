import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from 'ag-grid-community';
import {
  Search, RefreshCw, Plus, ClipboardCheck, X, ArrowLeft,
  CheckCircle, XCircle, AlertTriangle, Clock, Lock, Save,
  HelpCircle, ChevronDown, ChevronUp, Printer, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { imprimirHojaConteo } from './ImpresionConteo';
import { confirmar } from './ConfirmDialog';
import { AG_GRID_LOCALE_ES } from '../utils/agGridLocaleEs';

ModuleRegistry.registerModules([AllCommunityModule]);

// Theme unificado con el Listado de Artículos (InventarioManagement).
// Header violeta pastel, tipografía 12px, hover suave violeta.
const myTheme = themeQuartz.withParams({
  headerBackgroundColor: '#f3e8ff',
  headerTextColor: '#6b21a8',
  headerFontSize: 12,
  headerFontWeight: 600,
  fontSize: 12,
  rowBorder: { color: '#f3f4f6', width: 1 },
  borderColor: '#e5e7eb',
  borderRadius: 8,
  rowHoverColor: '#faf5ff',
  selectedRowBackgroundColor: '#f3e8ff',
  spacing: 6,
});

const API = 'http://localhost:80/conta-app-backend/api/inventario/conteo.php';
const API_OPC = 'http://localhost:80/conta-app-backend/api/inventario/opciones.php';

interface Conteo {
  Id_Conteo: number;
  Fecha: string;
  Usuario: string;
  Observacion: string;
  Tipo: string;
  Total_Items: number;
  Items_Contados: number;
  Items_Con_Diferencia: number;
  Estado: 'Abierto' | 'Cerrado' | 'Cancelado';
  Fecha_Cierre: string | null;
}

interface DetalleItem {
  Id_Detalle: number;
  Items: number;
  Codigo: string;
  Nombres_Articulo: string;
  Categoria: string;
  Precio_Costo: number;
  Existencia_Sistema: number;
  Existencia_Actual: number;
  Existencia_Contada: number | null;
  Vendido_Durante: number;
  Existencia_Esperada: number | null;
  Diferencia: number | null;
  Diferencia_Real: number | null;
  Observacion: string;
}

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

// Parseo inteligente del formato colombiano en el input de conteo.
//
// Regla: si el ÚLTIMO separador (punto o coma) va seguido de EXACTAMENTE
// 3 dígitos, se asume separador de MILES (formato colombiano común: "15.566",
// "28,175"). Si va seguido de 1-2 dígitos, se trata como DECIMAL.
//
// Ejemplos:
//   "28,175"  → 28175   (separador de miles con coma — formato CO más común)
//   "28.175"  → 28175   (separador de miles con punto)
//   "28,17"   → 28.17   (decimal)
//   "28.5"    → 28.5    (decimal)
//   "1.234,56"→ 1234.56 (miles + decimal, formato CO estándar)
//   "1,234.56"→ 1234.56 (miles + decimal, formato US — también aceptado)
//   "28175"   → 28175   (entero sin separador)
//
// Bug histórico que arregla: la cliente digitó "28,175" en un producto que
// tenía 15.566 KG de snapshot. El código viejo hacía `.replace(',', '.')` y
// convertía "28,175" en "28.175" (decimal), quedando 28 kilos con 175 gramos
// en vez de las 28.175 KG que quería. El sobrante se veía como un faltante
// masivo y descuadró el inventario en $153M.
export function parseNumeroConteo(input: string): number | null {
  const val = input.trim().replace(/[^0-9.,]/g, '');
  if (val === '') return null;
  const lastComma = val.lastIndexOf(',');
  const lastDot = val.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);
  let num: number;
  if (lastSep === -1) {
    num = parseFloat(val);
  } else {
    const digitosDespues = val.length - lastSep - 1;
    if (digitosDespues === 3) {
      // Separador de miles → remover TODOS los separadores del número
      num = parseFloat(val.replace(/[.,]/g, ''));
    } else {
      // Decimal → conservar el último separador, remover los otros
      const antes = val.substring(0, lastSep).replace(/[.,]/g, '');
      const despues = val.substring(lastSep + 1);
      num = parseFloat(`${antes}.${despues}`);
    }
  }
  return isNaN(num) ? null : num;
}

// Componente memoizado del input de conteo. Definido FUERA de ConteoInventario
// para que React.memo funcione: solo re-renderiza cuando cambian SUS props,
// no cuando el padre se re-renderiza por otros motivos (cambios en Map, sets,
// timers de savedItems, etc). Es el punto caliente de rendimiento con 1000+
// filas — el input es lo que se dibuja/toca constantemente.
interface InputConteoCellProps {
  itemId: number;
  valorInicial: number | null | undefined;
  observacionInicial: string;
  isSaving: boolean;
  isSaved: boolean;
  onSave: (itemId: number, valor: number | null, obs: string) => void;
}
const InputConteoCell = memo(function InputConteoCell({
  itemId, valorInicial, observacionInicial, isSaving, isSaved, onSave
}: InputConteoCellProps) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        defaultValue={valorInicial !== null && valorInicial !== undefined ? String(valorInicial) : ''}
        onFocus={e => e.target.select()}
        onBlur={e => {
          // Parseo con formato colombiano — evita el bug histórico donde
          // digitar "28,175" (28 mil 175) se interpretaba como 28.175 decimal.
          const num = parseNumeroConteo(e.target.value);
          // Solo dispara guardado si el valor cambió respecto al persistido.
          if (num !== valorInicial) {
            onSave(itemId, num, observacionInicial);
          }
          if (num !== null) e.target.value = num.toLocaleString('es-CO', { maximumFractionDigits: 3 });
        }}
        data-conteo-input="true"
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const current = e.target as HTMLInputElement;
            const allInputs = Array.from(document.querySelectorAll('input[data-conteo-input]')) as HTMLInputElement[];
            const myPos = allInputs.indexOf(current);
            current.blur();
            if (myPos >= 0 && myPos < allInputs.length - 1) {
              // Damos ~120ms para que AG Grid termine cualquier refresh disparado
              // por el auto-guardado async (setCambios + setSavingItems + POST → setSavedItems).
              // Con rAF (16ms) el foco se aplicaba antes del último re-render → se perdía.
              // También reintentamos hasta 3 veces si la fila objetivo se remontó.
              const restaurarFoco = (intento = 0) => {
                const freshInputs = Array.from(document.querySelectorAll('input[data-conteo-input]')) as HTMLInputElement[];
                const target = freshInputs[myPos + 1];
                if (target) {
                  target.focus();
                  target.select();
                  // Verifica que el foco realmente quedó (si React remonta después, reintenta)
                  if (intento < 3 && document.activeElement !== target) {
                    setTimeout(() => restaurarFoco(intento + 1), 60);
                  }
                }
              };
              setTimeout(() => restaurarFoco(0), 120);
            }
            return;
          }
          const allowed = ['0','1','2','3','4','5','6','7','8','9','.',',','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
          if (!allowed.includes(e.key) && !e.ctrlKey) e.preventDefault();
        }}
        style={{
          width: '100%', height: 26, textAlign: 'center', fontWeight: 600,
          border: `1px solid ${isSaved ? '#16a34a' : '#d1d5db'}`,
          borderRadius: 4, padding: '0 18px 0 6px',
          fontSize: 13, outline: 'none',
          background: isSaved ? '#f0fdf4' : '#fffbeb',
          transition: 'border-color 200ms, background 200ms'
        }}
      />
      {(isSaving || isSaved) && (
        <span style={{
          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          fontSize: 11, lineHeight: 1, pointerEvents: 'none',
          color: isSaved ? '#16a34a' : '#7c3aed', fontWeight: 700
        }}>
          {isSaving ? '⟳' : '✓'}
        </span>
      )}
    </div>
  );
});

export function ConteoInventario() {
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [detalle, setDetalle] = useState<DetalleItem[]>([]);
  const [conteoActual, setConteoActual] = useState<Conteo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos, pendientes, contados, diferencias
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creando, setCreando] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [categorias, setCategorias] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroProv, setFiltroProv] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cambios, setCambios] = useState<Map<number, { contada: number | null; obs: string }>>(new Map());
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  // Tracking del auto-guardado por celda:
  //   savingItems: items que ahora mismo están enviándose al backend
  //   savedItems: items recién confirmados como guardados (para mostrar ✓ 2 seg)
  const [savingItems, setSavingItems] = useState<Set<number>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());
  const gridRef = useRef<AgGridReact>(null);

  const cargarConteos = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setConteos(d.conteos);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarDetalle = async (id: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?id=${id}`);
      const d = await r.json();
      if (d.success) {
        setConteoActual(d.conteo);
        setDetalle(d.detalle);
        setCambios(new Map());
        setVista('detalle');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const cargarOpciones = async () => {
    try {
      const r = await fetch(API_OPC);
      const d = await r.json();
      if (d.success) {
        setCategorias(d.categorias);
        setProveedores(d.proveedores);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarConteos(); cargarOpciones(); }, []);

  const crearConteo = async () => {
    setError('');
    try {
      const body: any = { action: 'crear', usuario: 'admin', observacion };
      if (filtroCat) body.filtro_categoria = parseInt(filtroCat);
      if (filtroProv) body.filtro_proveedor = parseInt(filtroProv);
      body.tipo = (!filtroCat && !filtroProv) ? 'Total' : 'Parcial';

      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        setCreando(false);
        setObservacion('');
        setFiltroCat('');
        setFiltroProv('');
        setSuccess(d.message);
        setTimeout(() => setSuccess(''), 3000);
        cargarConteos();
        cargarDetalle(d.Id_Conteo);
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al crear conteo');
    }
  };

  // Auto-guardado por ítem: al hacer blur en una casilla se dispara este POST
  // con solo ese ítem. NO bloquea la UI — el usuario sigue digitando mientras
  // se guarda. Muestra spinner en la celda + ✓ 2 seg al confirmar.
  // useCallback estable — solo cambia cuando cambia el ID del conteo actual.
  // Esto evita que AG Grid detecte "nueva función" y refresque celdas en cada render.
  const guardarItem = useCallback(async (itemId: number, contada: number | null, obs: string) => {
    if (!conteoActual) return;
    setSavingItems(prev => { const s = new Set(prev); s.add(itemId); return s; });
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardar',
          id_conteo: conteoActual.Id_Conteo,
          items: [{ items: itemId, contada, observacion: obs }]
        })
      });
      const d = await r.json();
      if (d.success) {
        // Marcar como guardado (✓ verde permanente hasta recargar la vista).
        // NO usamos setTimeout para borrarlo: hacerlo dispara re-render del
        // useMemo colsDetalle → AG Grid remonta las celdas → el input donde
        // el usuario está escribiendo pierde el foco. Mantener el ✓ evita ese
        // re-render tardío. Visualmente se acumulan ✓ en las casillas
        // guardadas — es útil como indicador de progreso del conteo.
        // Tampoco limpiamos `cambios` por el mismo motivo (el cellRenderer
        // lee de ahí; borrarlo dispararía otro remount).
        setSavedItems(prev => { const s = new Set(prev); s.add(itemId); return s; });
      } else {
        setError(d.message || 'Error al guardar item');
      }
    } catch {
      setError('Error de red al guardar');
    } finally {
      setSavingItems(prev => { const s = new Set(prev); s.delete(itemId); return s; });
    }
  }, [conteoActual?.Id_Conteo]);

  // Handler estable pasado al InputConteoCell memoizado. Agrupa la actualización
  // del Map `cambios` + el POST auto-guardado en una sola función que no cambia
  // entre renders (mientras guardarItem sea estable). Sin esto, cada re-render
  // pasaría un onSave nuevo al memo → el memo se invalidaría constantemente.
  const handleSaveInput = useCallback((itemId: number, valor: number | null, obs: string) => {
    setCambios(prev => {
      const m = new Map(prev);
      m.set(itemId, { contada: valor, obs });
      return m;
    });
    guardarItem(itemId, valor, obs);
  }, [guardarItem]);

  const guardarCambios = async () => {
    if (cambios.size === 0 || !conteoActual) return;
    setGuardando(true);
    setError('');
    try {
      const items = Array.from(cambios.entries()).map(([itemId, val]) => ({
        items: itemId,
        contada: val.contada,
        observacion: val.obs
      }));

      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', id_conteo: conteoActual.Id_Conteo, items })
      });
      const d = await r.json();
      if (d.success) {
        setSuccess('Guardado correctamente');
        setTimeout(() => setSuccess(''), 3000);
        setCambios(new Map());
        cargarDetalle(conteoActual.Id_Conteo);
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al guardar');
    }
    setGuardando(false);
  };

  const cerrarConteo = async () => {
    if (!conteoActual) return;
    // Save pending changes first
    if (cambios.size > 0) await guardarCambios();

    const sinContar = detalle.filter(d => d.Existencia_Contada === null).length;
    const msg = sinContar > 0
      ? `Hay ${sinContar} artículos sin contar. ¿Cerrar conteo de todas formas? Esto ajustará el inventario.`
      : '¿Cerrar conteo y ajustar inventario? Esta acción no se puede deshacer.';

    if (!await confirmar({ title: 'Cerrar conteo', message: msg, type: 'warning', confirmText: 'Cerrar conteo' })) return;
    setError('');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cerrar', id_conteo: conteoActual.Id_Conteo })
      });
      const d = await r.json();
      if (d.success) {
        setSuccess(d.message);
        setTimeout(() => setSuccess(''), 5000);
        cargarDetalle(conteoActual.Id_Conteo);
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al cerrar');
    }
  };

  const cancelarConteo = async () => {
    if (!conteoActual) return;
    if (!await confirmar({ title: 'Cancelar conteo', message: '¿Cancelar este conteo? No se realizarán ajustes al inventario.', type: 'danger', confirmText: 'Cancelar conteo' })) return;
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelar', id_conteo: conteoActual.Id_Conteo })
      });
      const d = await r.json();
      if (d.success) {
        setSuccess(d.message);
        setTimeout(() => setSuccess(''), 3000);
        setVista('lista');
        cargarConteos();
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al cancelar');
    }
  };

  // Filter detalle
  const detalleFiltrado = detalle.filter(d => {
    const matchBusqueda = !busqueda ||
      d.Nombres_Articulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.Codigo.toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    const cambio = cambios.get(d.Items);
    const contada = cambio ? cambio.contada : d.Existencia_Contada;

    switch (filtro) {
      case 'pendientes': return contada === null;
      case 'contados': return contada !== null;
      case 'diferencias': {
        const diff = getDiffReal(d);
        return diff !== null && diff !== 0;
      }
      default: return true;
    }
  });

  const esAbierto = conteoActual?.Estado === 'Abierto';

  // Stats del detalle
  const totalItems = detalle.length;
  const contados = detalle.filter(d => d.Existencia_Contada !== null || cambios.has(d.Items)).length;
  const getDiffReal = (d: DetalleItem) => {
    const c = cambios.get(d.Items);
    const contada = c ? c.contada : d.Existencia_Contada;
    if (contada === null || contada === undefined) return null;
    const vendido = d.Vendido_Durante || 0;
    const esperado = d.Existencia_Sistema - vendido;
    return contada - esperado;
  };
  const conDiff = detalle.filter(d => {
    const diff = getDiffReal(d);
    return diff !== null && diff !== 0;
  }).length;
  const valorDiff = detalle.reduce((s, d) => {
    const diff = getDiffReal(d);
    if (diff === null) return s;
    return s + (diff * d.Precio_Costo);
  }, 0);

  // Estable con useCallback — solo cambia cuando cambia el Map `cambios`.
  // Si esto se recrea en cada render, AG Grid refresca todas las filas visibles
  // → parpadeo/lag notorio. Estable evita ese refresco redundante.
  const getRowStyleStable = useCallback((p: any) => {
    if (!p.data) return undefined;
    const cambio = cambios.get(p.data.Items);
    const contada = cambio ? cambio.contada : p.data.Existencia_Contada;
    if (contada === null || contada === undefined) return undefined;
    const vendido = p.data.Vendido_Durante || 0;
    const esperado = (p.data.Existencia_Sistema || 0) - vendido;
    const diff = contada - esperado;
    if (diff < 0) return { background: '#fef2f2' };
    if (diff > 0) return { background: '#eff6ff' };
    return { background: '#f0fdf4' };
  }, [cambios]);

  // Exporta el detalle filtrado del conteo a un .xlsx con formato de moneda
  // en las columnas de dinero. Números como números (no strings) para que
  // el usuario pueda SUMAR, filtrar y ordenar en Excel.
  const exportarExcel = () => {
    if (!conteoActual || detalleFiltrado.length === 0) return;

    const data = detalleFiltrado.map(d => {
      const cambio = cambios.get(d.Items);
      const contada = cambio ? cambio.contada : d.Existencia_Contada;
      const sistema = Number(d.Existencia_Sistema) || 0;
      const diff = contada === null || contada === undefined ? null : Number(contada) - sistema;
      const valDiff = diff === null ? null : diff * (Number(d.Precio_Costo) || 0);
      return {
        'Código': d.Codigo || '',
        'Descripción': d.Nombres_Articulo || '',
        'Categoría': d.Categoria || '',
        'Costo Unit': Number(d.Precio_Costo) || 0,
        'Existencia': sistema,
        'Conteo': contada === null || contada === undefined ? '' : Number(contada),
        'Diferencia': diff === null ? '' : Number(diff),
        'Valor Diferencia': valDiff === null ? '' : Number(valDiff),
        'Observación': d.Observacion || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 14 }, { wch: 40 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 30 },
    ];

    // Formato moneda: Costo Unit(3), Valor Diferencia(7)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const moneyCols = [3, 7];
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      for (const C of moneyCols) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[ref]) ws[ref].z = '"$"#,##0';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Conteo ${conteoActual.Id_Conteo}`);
    const fecha = new Date(conteoActual.Fecha).toISOString().slice(0, 10);
    XLSX.writeFile(wb, `conteo_${conteoActual.Id_Conteo}_${fecha}.xlsx`);
  };

  // Definición de columnas del detalle. DEBE estar aquí (antes del return
  // condicional de la vista 'lista') para respetar las reglas de hooks de
  // React — todos los hooks siempre en el mismo orden en cada render, sin
  // returns intermedios. La lógica se sigue usando SOLO en la vista 'detalle'.
  const colsDetalle: ColDef[] = useMemo(() => [
    { headerName: 'Código', field: 'Codigo', width: 100, sortable: true, filter: true },
    { headerName: 'Artículo', field: 'Nombres_Articulo', flex: 1, minWidth: 160, sortable: true, filter: true },
    { headerName: 'Categoría', field: 'Categoria', width: 90, sortable: true, filter: true },
    {
      headerName: 'Snapshot',
      field: 'Existencia_Sistema',
      width: 85,
      sortable: true,
      headerTooltip: 'Existencia al momento de crear el conteo',
      cellStyle: { textAlign: 'right', fontWeight: 600 },
      cellRenderer: (p: any) => <span>{(p.value || 0).toLocaleString('es-CO')}</span>
    },
    {
      headerName: 'Vendido',
      field: 'Vendido_Durante',
      width: 80,
      sortable: true,
      headerTooltip: 'Unidades vendidas durante el conteo',
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        if (v === 0) return <span style={{ color: '#9ca3af' }}>-</span>;
        return <span style={{ color: '#d97706', fontWeight: 600 }}>-{v}</span>;
      }
    },
    {
      headerName: 'Esperado',
      width: 80,
      sortable: true,
      headerTooltip: 'Snapshot - Vendido = lo que debería haber',
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const vendido = p.data.Vendido_Durante || 0;
        if (vendido === 0) return <span style={{ color: '#9ca3af' }}>-</span>;
        const esperado = (p.data.Existencia_Sistema || 0) - vendido;
        return <span style={{ fontWeight: 600, color: '#6366f1' }}>{esperado.toLocaleString('es-CO')}</span>;
      }
    },
    {
      headerName: 'Exist. Contada',
      width: 115,
      sortable: false,
      cellRenderer: (p: any) => {
        const cambio = cambios.get(p.data.Items);
        const val = cambio ? cambio.contada : p.data.Existencia_Contada;

        if (!esAbierto) {
          return <span style={{ fontWeight: 600, textAlign: 'right', display: 'block' }}>
            {val !== null ? val!.toLocaleString('es-CO') : '-'}
          </span>;
        }

        return (
          <InputConteoCell
            itemId={p.data.Items}
            valorInicial={val}
            observacionInicial={p.data.Observacion || ''}
            isSaving={savingItems.has(p.data.Items)}
            isSaved={savedItems.has(p.data.Items)}
            onSave={handleSaveInput}
          />
        );
      }
    },
    {
      headerName: 'Dif. Real',
      width: 80,
      sortable: true,
      headerTooltip: 'Diferencia compensada: Contada - Esperado',
      cellRenderer: (p: any) => {
        const cambio = cambios.get(p.data.Items);
        const contada = cambio ? cambio.contada : p.data.Existencia_Contada;
        if (contada === null || contada === undefined) return <span style={{ color: '#9ca3af' }}>-</span>;
        const vendido = p.data.Vendido_Durante || 0;
        const esperado = p.data.Existencia_Sistema - vendido;
        const diff = contada - esperado;
        const color = diff === 0 ? '#16a34a' : diff > 0 ? '#2563eb' : '#dc2626';
        const prefix = diff > 0 ? '+' : '';
        return <span style={{ color, fontWeight: 700, textAlign: 'right', display: 'block' }}>{prefix}{diff.toLocaleString('es-CO')}</span>;
      }
    },
    {
      headerName: 'Valor Dif.',
      width: 95,
      sortable: true,
      cellRenderer: (p: any) => {
        const cambio = cambios.get(p.data.Items);
        const contada = cambio ? cambio.contada : p.data.Existencia_Contada;
        if (contada === null || contada === undefined) return <span style={{ color: '#9ca3af' }}>-</span>;
        const vendido = p.data.Vendido_Durante || 0;
        const esperado = p.data.Existencia_Sistema - vendido;
        const diff = contada - esperado;
        const valor = diff * p.data.Precio_Costo;
        const color = valor === 0 ? '#16a34a' : valor > 0 ? '#2563eb' : '#dc2626';
        return <span style={{ color, fontWeight: 600, textAlign: 'right', display: 'block' }}>{fmtMon(valor)}</span>;
      }
    },
  ], [esAbierto, cambios, savingItems, savedItems, handleSaveInput]);

  // --- VISTA LISTA ---
  if (vista === 'lista') {
    const colsConteos: ColDef[] = [
      { headerName: 'ID', field: 'Id_Conteo', width: 70, sortable: true },
      {
        headerName: 'Fecha',
        field: 'Fecha',
        width: 150,
        sortable: true,
        cellRenderer: (p: any) => {
          if (!p.value) return '';
          const d = new Date(p.value);
          return d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        }
      },
      { headerName: 'Usuario', field: 'Usuario', width: 100 },
      { headerName: 'Tipo', field: 'Tipo', width: 80 },
      { headerName: 'Observación', field: 'Observacion', flex: 1, minWidth: 150 },
      {
        headerName: 'Artículos',
        field: 'Total_Items',
        width: 100,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{(p.value || 0).toLocaleString()}</span>
      },
      {
        headerName: 'Contados',
        field: 'Items_Contados',
        width: 100,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: any) => {
          const total = p.data.Total_Items || 1;
          const contados = p.value || 0;
          const pct = Math.round((contados / total) * 100);
          return <span style={{ color: pct === 100 ? '#16a34a' : '#d97706', fontWeight: 600 }}>{contados} ({pct}%)</span>;
        }
      },
      {
        headerName: 'Diferencias',
        field: 'Items_Con_Diferencia',
        width: 100,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: any) => {
          const v = p.value || 0;
          return <span style={{ color: v > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{v}</span>;
        }
      },
      {
        headerName: 'Estado',
        field: 'Estado',
        width: 110,
        cellRenderer: (p: any) => {
          const colors: Record<string, { bg: string; fg: string; icon: any }> = {
            'Abierto': { bg: '#dbeafe', fg: '#2563eb', icon: Clock },
            'Cerrado': { bg: '#dcfce7', fg: '#16a34a', icon: CheckCircle },
            'Cancelado': { bg: '#fee2e2', fg: '#dc2626', icon: XCircle }
          };
          const c = colors[p.value] || colors['Abierto'];
          const Icon = c.icon;
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: c.bg, color: c.fg
            }}>
              <Icon size={13} /> {p.value}
            </span>
          );
        }
      },
      {
        headerName: '',
        width: 80,
        sortable: false,
        cellRenderer: (p: any) => (
          <button
            onClick={() => cargarDetalle(p.data.Id_Conteo)}
            style={{
              height: 26, padding: '0 10px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer'
            }}
          >
            Ver
          </button>
        )
      }
    ];

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h1 className="text-2xl font-semibold text-gray-900">Conteo de Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de inventario físico por períodos</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#16a34a', fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Total Conteos', value: conteos.length, icon: ClipboardCheck, bg: '#f3e8ff', color: '#7c3aed' },
            { label: 'Abiertos', value: conteos.filter(c => c.Estado === 'Abierto').length, icon: Clock, bg: '#dbeafe', color: '#2563eb' },
            { label: 'Cerrados', value: conteos.filter(c => c.Estado === 'Cerrado').length, icon: CheckCircle, bg: '#dcfce7', color: '#16a34a' },
            { label: 'Cancelados', value: conteos.filter(c => c.Estado === 'Cancelado').length, icon: XCircle, bg: '#fee2e2', color: '#dc2626' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ flex: 1 }} />
          {!creando ? (
            <button
              onClick={() => setCreando(true)}
              style={{
                height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Plus size={14} /> Nuevo Conteo
            </button>
          ) : null}
          <button
            onClick={cargarConteos}
            style={{
              height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>

        {/* Form crear conteo */}
        {creando && (
          <div style={{
            background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: 16,
            marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#5b21b6' }}>Nuevo Conteo de Inventario</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>OBSERVACIÓN</label>
                <input
                  type="text" placeholder="Ej: Conteo mensual marzo"
                  value={observacion} onChange={e => setObservacion(e.target.value)}
                  style={{ width: '100%', height: 30, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>FILTRO CATEGORÍA (opcional)</label>
                <select
                  value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                  style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">-- Todas --</option>
                  {categorias.map(c => <option key={c.Id_Categoria} value={c.Id_Categoria}>{c.Categoria}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>FILTRO PROVEEDOR (opcional)</label>
                <select
                  value={filtroProv} onChange={e => setFiltroProv(e.target.value)}
                  style={{ width: '100%', height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">-- Todos --</option>
                  {proveedores.map(p => <option key={p.CodigoPro} value={p.CodigoPro}>{p.RazonSocial}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setCreando(false); setObservacion(''); setFiltroCat(''); setFiltroProv(''); }}
                style={{ height: 30, padding: '0 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={crearConteo}
                style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Crear Conteo
              </button>
            </div>
          </div>
        )}

        {/* Grid de conteos */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ height: 'calc(100vh - 480px)', width: '100%' }}>
            <AgGridReact
              theme={myTheme}
              localeText={AG_GRID_LOCALE_ES}
              rowData={conteos}
              columnDefs={colsConteos}
              loading={loading}
              animateRows
              getRowId={p => String(p.data.Id_Conteo)}
              rowHeight={38}
              headerHeight={38}
              defaultColDef={{ resizable: true }}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA DETALLE ---

  return (
    <div>
      {/* Header + Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => { setVista('lista'); cargarConteos(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', fontSize: 13, flexShrink: 0 }}
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Conteo #{conteoActual?.Id_Conteo}
            <span style={{
              fontSize: 12, padding: '2px 10px', borderRadius: 6, fontWeight: 600,
              background: conteoActual?.Estado === 'Abierto' ? '#dbeafe' : conteoActual?.Estado === 'Cerrado' ? '#dcfce7' : '#fee2e2',
              color: conteoActual?.Estado === 'Abierto' ? '#2563eb' : conteoActual?.Estado === 'Cerrado' ? '#16a34a' : '#dc2626',
            }}>
              {conteoActual?.Estado}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {conteoActual?.Fecha && new Date(conteoActual.Fecha).toLocaleDateString('es-CO')} — {conteoActual?.Usuario}
            {conteoActual?.Observacion && ` — ${conteoActual.Observacion}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {esAbierto ? (
            <>
              <button
                onClick={() => imprimirHojaConteo(conteoActual!, detalleFiltrado, { modo: 'ciego' })}
                title="Hoja de trabajo — casillas en blanco (para llenar a mano)"
                style={{
                  height: 32, padding: '0 12px', background: '#fff', color: '#4b5563',
                  border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Printer size={14} /> Ciego
              </button>
              <button
                onClick={() => imprimirHojaConteo(conteoActual!, detalleFiltrado, { modo: 'sistema' })}
                title="Hoja de trabajo — con existencias del sistema para comparar"
                style={{
                  height: 32, padding: '0 12px', background: '#fff', color: '#4b5563',
                  border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Printer size={14} /> Sistema
              </button>
            </>
          ) : (
            <button
              onClick={() => imprimirHojaConteo(conteoActual!, detalleFiltrado, { modo: 'reporte' })}
              title="Reporte final del conteo: existencia, contado, diferencia y valor"
              style={{
                height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
              }}
            >
              <Printer size={14} /> Reporte Final
            </button>
          )}
          <button
            onClick={exportarExcel}
            title="Exportar el detalle filtrado a Excel (.xlsx)"
            style={{
              height: 32, padding: '0 12px', background: '#16a34a', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
        {esAbierto && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {cambios.size > 0 && (
              <button
                onClick={guardarCambios}
                disabled={guardando}
                style={{
                  height: 32, padding: '0 14px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.6 : 1
                }}
              >
                <Save size={14} /> Guardar ({cambios.size})
              </button>
            )}
            <button
              onClick={cerrarConteo}
              style={{
                height: 32, padding: '0 14px', background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Lock size={14} /> Cerrar Conteo
            </button>
            <button
              onClick={cancelarConteo}
              style={{
                height: 32, padding: '0 14px', background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <XCircle size={14} /> Cancelar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#16a34a', fontSize: 13 }}>{success}</div>
      )}

      {/* Panel de ayuda */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        marginBottom: 12, overflow: 'hidden'
      }}>
        <button
          onClick={() => setMostrarAyuda(!mostrarAyuda)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#475569', fontWeight: 600
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HelpCircle size={15} color="#7c3aed" /> ¿Cómo funciona el conteo con compensación?
          </span>
          {mostrarAyuda ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {mostrarAyuda && (
          <div style={{ padding: '0 14px 14px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Las ventas NO se bloquean</div>
                <p style={{ margin: 0 }}>
                  Mientras el conteo está abierto, el negocio sigue operando normalmente.
                  El sistema registra automáticamente qué se vendió durante el período del conteo.
                </p>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 10, marginBottom: 6 }}>Columnas de la tabla</div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li><b>Snapshot:</b> Existencia al momento de crear el conteo</li>
                  <li><b>Vendido:</b> Unidades vendidas desde que se creó el conteo</li>
                  <li><b>Esperado:</b> Snapshot - Vendido = lo que debería haber en estante</li>
                  <li><b>Contada:</b> Lo que realmente contaste físicamente</li>
                  <li><b>Dif. Real:</b> Contada - Esperado (la diferencia verdadera)</li>
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Ejemplo práctico</div>
                <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #e2e8f0', fontSize: 11 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px' }}>
                    <span style={{ color: '#6b7280' }}>Snapshot:</span> <span><b>30</b> unidades al crear conteo</span>
                    <span style={{ color: '#d97706' }}>Vendido:</span> <span><b>5</b> unidades durante el conteo</span>
                    <span style={{ color: '#6366f1' }}>Esperado:</span> <span><b>25</b> unidades (30 - 5)</span>
                    <span style={{ color: '#1e293b' }}>Contada:</span> <span><b>25</b> unidades (lo que contaste)</span>
                    <span style={{ color: '#16a34a' }}>Dif. Real:</span> <span><b>0</b> — todo cuadra</span>
                  </div>
                  <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                    Si hubieras contado <b>23</b> → Dif. Real = <span style={{ color: '#dc2626' }}>-2</span> (faltan 2 unidades reales)
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 10, marginBottom: 6 }}>Colores de fila</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f0fdf4', border: '1px solid #bbf7d0' }}></span> Cuadra</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#fef2f2', border: '1px solid #fecaca' }}></span> Faltante</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#eff6ff', border: '1px solid #bfdbfe' }}></span> Sobrante</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats compactos — una sola barra horizontal para ocupar poco vertical.
          Antes cada métrica era una card de ~80px; ahora todo el bloque ~36px
          para que quepa más tabla en monitores pequeños. */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: '8px 14px',
        marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardCheck size={14} color="#7c3aed" />
          <span style={{ fontSize: 11, color: '#6b7280' }}>Total:</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{totalItems.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={14} color="#2563eb" />
          <span style={{ fontSize: 11, color: '#6b7280' }}>Contados:</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>
            {contados.toLocaleString()}
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginLeft: 4 }}>
              ({totalItems > 0 ? Math.round((contados / totalItems) * 100) : 0}%)
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} color="#d97706" />
          <span style={{ fontSize: 11, color: '#6b7280' }}>Con Diferencia:</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: conDiff > 0 ? '#dc2626' : '#16a34a' }}>{conDiff}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {valorDiff < 0 ? <AlertTriangle size={14} color="#dc2626" /> : <CheckCircle size={14} color="#16a34a" />}
          <span style={{ fontSize: 11, color: '#6b7280' }}>Valor Dif.:</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: valorDiff < 0 ? '#dc2626' : valorDiff > 0 ? '#2563eb' : '#16a34a' }}>{fmtMon(valorDiff)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Buscar artículo..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 30, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Filter chips */}
        {[
          { id: 'todos', label: 'Todos', count: totalItems },
          { id: 'pendientes', label: 'Pendientes', count: totalItems - contados },
          { id: 'contados', label: 'Contados', count: contados },
          { id: 'diferencias', label: 'Diferencias', count: conDiff },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
              border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
              background: filtro === f.id ? '#f3e8ff' : '#fff',
              color: filtro === f.id ? '#7c3aed' : '#374151',
              fontWeight: filtro === f.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            {f.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}

      </div>

      {/* Grid detalle */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 260px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            theme={myTheme}
            localeText={AG_GRID_LOCALE_ES}
            rowData={detalleFiltrado}
            columnDefs={colsDetalle}
            loading={loading}
            animateRows
            getRowId={p => String(p.data.Items)}
            rowHeight={36}
            headerHeight={36}
            defaultColDef={{ resizable: true }}
            getRowStyle={getRowStyleStable}
          />
        </div>
      </div>
    </div>
  );
}
