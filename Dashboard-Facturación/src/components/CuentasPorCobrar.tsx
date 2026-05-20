import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, RefreshCw, Users, DollarSign, AlertTriangle, Clock, Wallet, Eye, Printer, Plus, X, Ban, RotateCcw, Award } from 'lucide-react';
import { confirmar } from './ConfirmDialog';
import { ClienteDetalle } from './ClienteDetalle';
import toast from 'react-hot-toast';
import { hoyLocal, inicioMesLocal } from '../utils/fecha';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/clientes/cartera.php';
const API_COMP = 'http://localhost:80/conta-app-backend/api/clientes/comportamiento.php';

type Comportamiento = 'sin_datos' | 'excelente' | 'puntual' | 'regular' | 'moroso' | 'critico';

const COMP_CONFIG: Record<Comportamiento, { label: string; bg: string; color: string }> = {
  excelente: { label: 'Excelente', bg: '#d1fae5', color: '#059669' },
  puntual:   { label: 'Puntual',   bg: '#dbeafe', color: '#2563eb' },
  regular:   { label: 'Regular',   bg: '#fef3c7', color: '#d97706' },
  moroso:    { label: 'Moroso',    bg: '#fed7aa', color: '#ea580c' },
  critico:   { label: 'Crítico',   bg: '#fee2e2', color: '#dc2626' },
  sin_datos: { label: 'Sin datos', bg: '#f3f4f6', color: '#6b7280' },
};

const MOTIVOS_CASTIGO = [
  { id: 'cliente_perdido',   label: 'Cliente perdido' },
  { id: 'empresa_cerrada',   label: 'Empresa cerrada / liquidada' },
  { id: 'no_localizable',    label: 'No localizable' },
  { id: 'acuerdo_fallido',   label: 'Acuerdo de pago fallido' },
  { id: 'otro',              label: 'Otro motivo' },
];

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

interface ClienteCartera {
  CodigoClien: number;
  Razon_Social: string;
  Nit: string;
  Telefonos: string;
  Facturas_Pendientes: number;
  Saldo_Total: number;
  Factura_Mas_Antigua: string;
  Dias_Mayor_Vencimiento: number;
  CupoAutorizado: number;
  comportamiento?: Comportamiento;
  cartera_castigada?: number;
  motivo_castigo?: string;
  fecha_castigo?: string;
  dias_mora_promedio?: number | null;
}

export function CuentasPorCobrar() {
  const [clientes, setClientes] = useState<ClienteCartera[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [showFactAnt, setShowFactAnt] = useState(false);
  const [faCliente, setFaCliente] = useState('');
  const [faClienteResults, setFaClienteResults] = useState<any[]>([]);
  const [faClienteId, setFaClienteId] = useState(0);
  const [faClienteNombre, setFaClienteNombre] = useState('');
  const [faFacturaN, setFaFacturaN] = useState('');
  const [faFecha, setFaFecha] = useState(hoyLocal());
  const [faValor, setFaValor] = useState('');
  const [faSaldo, setFaSaldo] = useState('');
  const [faDias, setFaDias] = useState('30');
  const faTimer = useRef<any>(null);
  const gridRef = useRef<AgGridReact>(null);

  // Modal de castigo de cartera
  const [castigoModal, setCastigoModal] = useState<{ cliente: ClienteCartera | null; motivo: string; detalle: string }>({ cliente: null, motivo: 'cliente_perdido', detalle: '' });
  const [castigando, setCastigando] = useState(false);

  const generarReportePDF = () => {
    const fmtM = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
    const hoy = new Date().toLocaleDateString('es-CO');
    const datos = filtrados;

    // Calcular totales por rango
    const sinVencer = datos.filter(c => c.Dias_Mayor_Vencimiento <= 0).reduce((s, c) => s + c.Saldo_Total, 0);
    const de1a30 = datos.filter(c => c.Dias_Mayor_Vencimiento >= 1 && c.Dias_Mayor_Vencimiento <= 30).reduce((s, c) => s + c.Saldo_Total, 0);
    const de31a60 = datos.filter(c => c.Dias_Mayor_Vencimiento >= 31 && c.Dias_Mayor_Vencimiento <= 60).reduce((s, c) => s + c.Saldo_Total, 0);
    const mas60 = datos.filter(c => c.Dias_Mayor_Vencimiento > 60).reduce((s, c) => s + c.Saldo_Total, 0);
    const total = datos.reduce((s, c) => s + c.Saldo_Total, 0);

    const filas = datos.map(c => {
      const d = c.Dias_Mayor_Vencimiento;
      return `<tr>
        <td style="padding:3px 6px">${c.CodigoClien}</td>
        <td style="padding:3px 6px">${c.Razon_Social}</td>
        <td style="padding:3px 6px;text-align:center">${c.Facturas_Pendientes}</td>
        <td style="padding:3px 6px;text-align:center">${d}d</td>
        <td style="padding:3px 6px;text-align:right">${fmtM(c.Saldo_Total)}</td>
        <td style="padding:3px 6px;text-align:right">${d <= 0 ? fmtM(c.Saldo_Total) : '-'}</td>
        <td style="padding:3px 6px;text-align:right">${d >= 1 && d <= 30 ? fmtM(c.Saldo_Total) : '-'}</td>
        <td style="padding:3px 6px;text-align:right">${d >= 31 && d <= 60 ? fmtM(c.Saldo_Total) : '-'}</td>
        <td style="padding:3px 6px;text-align:right;${d > 60 ? 'font-weight:700;color:#c00' : ''}">${d > 60 ? fmtM(c.Saldo_Total) : '-'}</td>
      </tr>`;
    }).join('');

    const html = `<html><head><title>Cartera de Clientes</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 15mm; }
      @page { size: letter landscape; margin: 10mm; }
      table { width:100%; border-collapse:collapse; }
      th { background:#f0f0f0; border:1px solid #999; padding:4px 6px; font-size:10px; }
      td { border:1px solid #ccc; font-size:10px; }
      .header { text-align:center; margin-bottom:15px; }
      .header h1 { font-size:18px; margin-bottom:2px; }
      .header h2 { font-size:14px; font-weight:400; margin-bottom:8px; }
      .fecha { font-size:11px; margin-bottom:12px; }
      .resumen { margin-top:20px; width:400px; margin-left:auto; }
      .resumen td { padding:4px 10px; }
      .resumen .label { font-weight:600; }
      .resumen .total { font-weight:700; font-size:12px; border-top:2px solid #000; }
    </style></head><body>
      <div class="header">
        <h1>DISTRIBUIDORA DE SALSAS DE PLANETA RICA</h1>
        <h2>Cartera de Clientes</h2>
      </div>
      <div class="fecha"><strong>Fecha Impresión:</strong> ${hoy} &nbsp;&nbsp; <strong>Clientes:</strong> ${datos.length} &nbsp;&nbsp; <strong>Filtro:</strong> ${filtro === 'todos' ? 'Todos' : filtro}</div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Código</th>
            <th style="text-align:left">Cliente</th>
            <th>Fact.</th>
            <th>Días</th>
            <th style="text-align:right">Total Saldo</th>
            <th style="text-align:right">Sin Vencer</th>
            <th style="text-align:right">De 1 a 30</th>
            <th style="text-align:right">De 31 a 60</th>
            <th style="text-align:right">Más de 60</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
          <tr style="font-weight:700;background:#f9f9f9">
            <td colspan="4" style="padding:5px 6px;text-align:right;border:1px solid #999">TOTALES</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(total)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(sinVencer)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(de1a30)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999">${fmtM(de31a60)}</td>
            <td style="padding:5px 6px;text-align:right;border:1px solid #999;color:#c00">${fmtM(mas60)}</td>
          </tr>
        </tbody>
      </table>

      <table class="resumen">
        <tr><td colspan="2" style="text-align:center;font-weight:700;font-size:13px;padding:10px 0 6px">RESUMEN GENERAL</td></tr>
        <tr><td class="label">Monto Total</td><td style="text-align:right">${fmtM(total)}</td></tr>
        <tr><td class="label">Sin Vencer</td><td style="text-align:right">${fmtM(sinVencer)}</td></tr>
        <tr><td class="label">De 1 a 30 días</td><td style="text-align:right">${fmtM(de1a30)}</td></tr>
        <tr><td class="label">De 31 a 60 días</td><td style="text-align:right">${fmtM(de31a60)}</td></tr>
        <tr><td class="label">Más de 60 días</td><td style="text-align:right;color:#c00">${fmtM(mas60)}</td></tr>
        <tr class="total"><td class="label">TOTAL CARTERA</td><td style="text-align:right">${fmtM(total)}</td></tr>
      </table>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const generarReporteDetallado = async () => {
    const fmtM = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
    const hoy = new Date().toLocaleDateString('es-CO');

    // Fetch detallado
    try {
      const r = await fetch(API + '?detallado=1');
      const d = await r.json();
      if (!d.success) return;

      const clientesDetalle = d.clientes.filter((c: any) => {
        // Apply same filter
        const dias = c.Dias_Mayor_Vencimiento;
        switch (filtro) {
          case 'sin_vencer': return dias <= 0;
          case '1a30': return dias >= 1 && dias <= 30;
          case '31a60': return dias >= 31 && dias <= 60;
          case 'mas60': return dias > 60;
          case 'alto': return c.Saldo_Total >= 500000;
          default: return true;
        }
      });

      let totalGeneral = 0, totalSinVencer = 0, total1a30 = 0, total31a60 = 0, totalMas60 = 0;

      const bloques = clientesDetalle.map((c: any) => {
        const facturas = c.Facturas || [];
        let cSinVencer = 0, c1a30 = 0, c31a60 = 0, cMas60 = 0, cTotal = 0;

        const filasFacturas = facturas.map((f: any) => {
          const dm = f.Dias_Mora;
          const saldo = f.Saldo;
          cTotal += saldo;
          let sinV = 0, d1 = 0, d31 = 0, d60 = 0;
          if (dm <= 0) { sinV = saldo; cSinVencer += saldo; }
          else if (dm <= 30) { d1 = saldo; c1a30 += saldo; }
          else if (dm <= 60) { d31 = saldo; c31a60 += saldo; }
          else { d60 = saldo; cMas60 += saldo; }

          return `<tr>
            <td style="padding:2px 6px">${f.Factura_N}</td>
            <td style="padding:2px 6px">${new Date(f.Fecha).toLocaleDateString('es-CO')}</td>
            <td style="padding:2px 6px;text-align:center">${f.Dias_Plazo}</td>
            <td style="padding:2px 6px;text-align:center">${dm}</td>
            <td style="padding:2px 6px;text-align:right">${fmtM(saldo)}</td>
            <td style="padding:2px 6px;text-align:right">${sinV > 0 ? fmtM(sinV) : ''}</td>
            <td style="padding:2px 6px;text-align:right">${d1 > 0 ? fmtM(d1) : ''}</td>
            <td style="padding:2px 6px;text-align:right">${d31 > 0 ? fmtM(d31) : ''}</td>
            <td style="padding:2px 6px;text-align:right;${d60 > 0 ? 'font-weight:700;color:#c00' : ''}">${d60 > 0 ? fmtM(d60) : ''}</td>
          </tr>`;
        }).join('');

        totalGeneral += cTotal;
        totalSinVencer += cSinVencer;
        total1a30 += c1a30;
        total31a60 += c31a60;
        totalMas60 += cMas60;

        return `
          <tr style="background:#e8e0f3">
            <td colspan="9" style="padding:4px 6px;font-weight:700;font-size:11px;border:1px solid #999">
              CLIENTE: &nbsp; ${c.CodigoClien} &nbsp;&nbsp;&nbsp; ${c.Razon_Social}
            </td>
          </tr>
          ${filasFacturas}
          <tr style="background:#f5f5f5;font-weight:600">
            <td colspan="4" style="padding:3px 6px;text-align:right;border:1px solid #ccc">TOTAL SALDO</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${fmtM(cTotal)}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${cSinVencer > 0 ? fmtM(cSinVencer) : ''}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${c1a30 > 0 ? fmtM(c1a30) : ''}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc">${c31a60 > 0 ? fmtM(c31a60) : ''}</td>
            <td style="padding:3px 6px;text-align:right;border:1px solid #ccc;color:#c00">${cMas60 > 0 ? fmtM(cMas60) : ''}</td>
          </tr>
          <tr><td colspan="9" style="padding:2px;border:none"></td></tr>
        `;
      }).join('');

      const html = `<html><head><title>Cartera Detallada</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding: 10mm; }
        @page { size: letter landscape; margin: 8mm; }
        table { width:100%; border-collapse:collapse; }
        th { background:#d0d0d0; border:1px solid #999; padding:3px 6px; font-size:9px; }
        td { border:1px solid #ddd; font-size:9px; }
        .header { text-align:center; margin-bottom:10px; }
        .header h1 { font-size:16px; margin-bottom:2px; }
        .header h2 { font-size:12px; font-weight:400; }
        .resumen { margin-top:15px; width:380px; margin-left:auto; }
        .resumen td { padding:3px 8px; border:1px solid #ccc; font-size:10px; }
        .resumen .total { font-weight:700; font-size:11px; border-top:2px solid #000; }
      </style></head><body>
        <div class="header">
          <h1>DISTRIBUIDORA DE SALSAS DE PLANETA RICA</h1>
          <h2>Saldos de Clientes - Detallado</h2>
        </div>
        <div style="font-size:10px;margin-bottom:8px"><strong>Fecha:</strong> ${hoy} &nbsp; <strong>Clientes:</strong> ${clientesDetalle.length}</div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">Nº Factura</th>
              <th style="text-align:left">Fecha</th>
              <th>Días</th>
              <th>Días V.</th>
              <th style="text-align:right">Saldo</th>
              <th style="text-align:right">Sin Vencer</th>
              <th style="text-align:right">De 1 a 30</th>
              <th style="text-align:right">De 31 a 60</th>
              <th style="text-align:right">Más de 60</th>
            </tr>
          </thead>
          <tbody>
            ${bloques}
            <tr style="font-weight:700;background:#e0e0e0;font-size:10px">
              <td colspan="4" style="padding:5px 6px;text-align:center;border:2px solid #999">TOTAL CARTERA</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(totalGeneral)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(totalSinVencer)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(total1a30)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999">${fmtM(total31a60)}</td>
              <td style="padding:5px 6px;text-align:right;border:2px solid #999;color:#c00">${fmtM(totalMas60)}</td>
            </tr>
          </tbody>
        </table>

        <table class="resumen">
          <tr><td colspan="2" style="text-align:center;font-weight:700;font-size:12px;padding:8px 0 4px">RESUMEN GENERAL</td></tr>
          <tr><td style="font-weight:600">Monto Total</td><td style="text-align:right">${fmtM(totalGeneral)}</td></tr>
          <tr><td style="font-weight:600">Sin Vencer</td><td style="text-align:right">${fmtM(totalSinVencer)}</td></tr>
          <tr><td style="font-weight:600">De 1 a 30 días</td><td style="text-align:right">${fmtM(total1a30)}</td></tr>
          <tr><td style="font-weight:600">De 31 a 60 días</td><td style="text-align:right">${fmtM(total31a60)}</td></tr>
          <tr><td style="font-weight:600">Más de 60 días</td><td style="text-align:right;color:#c00">${fmtM(totalMas60)}</td></tr>
          <tr class="total"><td style="font-weight:700">TOTAL CARTERA</td><td style="text-align:right;font-weight:700">${fmtM(totalGeneral)}</td></tr>
        </table>
      </body></html>`;

      const win = window.open('', '_blank', 'width=1100,height=700');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };
    } catch (e) { console.error(e); }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      // Desde v5.5: cartera.php ya devuelve comportamiento y castigo en el mismo objeto
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) {
        const clientes = (d.clientes || []).map((c: any) => ({
          ...c,
          comportamiento: (c.comportamiento as Comportamiento) ?? 'sin_datos',
          cartera_castigada: Number(c.cartera_castigada ?? 0),
        }));
        setClientes(clientes);
        setResumen(d.resumen);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const castigarCartera = (cliente: ClienteCartera) => {
    // Abre el modal en vez de prompts feos
    setCastigoModal({ cliente, motivo: 'cliente_perdido', detalle: '' });
  };

  const confirmarCastigo = async () => {
    const cliente = castigoModal.cliente;
    if (!cliente) return;
    if (castigoModal.motivo === 'otro' && !castigoModal.detalle.trim()) {
      toast.error('Describe el motivo "otro"');
      return;
    }
    setCastigando(true);
    try {
      const r = await fetch(API_COMP, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'castigar',
          id: cliente.CodigoClien,
          motivo: castigoModal.motivo,
          motivo_detalle: castigoModal.detalle.trim() || null,
          id_usuario: 0,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Cartera de "${cliente.Razon_Social}" castigada`);
        setCastigoModal({ cliente: null, motivo: 'cliente_perdido', detalle: '' });
        cargar();
      } else {
        toast.error(d.message || 'Error al castigar');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error de red');
    }
    setCastigando(false);
  };

  const restaurarCartera = async (cliente: ClienteCartera) => {
    const ok = await confirmar({
      title: 'Restaurar cartera',
      message: `¿Restaurar la cartera de "${cliente.Razon_Social}"? Volverá a aparecer en el listado principal.`,
      type: 'question',
      confirmText: 'Sí, restaurar',
    });
    if (!ok) return;
    try {
      const r = await fetch(API_COMP, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restaurar', id: cliente.CodigoClien }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Cartera restaurada'); cargar(); }
      else toast.error(d.message || 'Error');
    } catch (e: any) { toast.error(e?.message || 'Error de red'); }
  };

  const recalcularComportamiento = async () => {
    const ok = await confirmar({
      title: 'Recalcular comportamiento',
      message: 'Esto analiza el historial de pagos de los últimos 12 meses de TODOS los clientes y actualiza su categoría. Puede tomar unos segundos.',
      type: 'info',
      confirmText: 'Recalcular',
    });
    if (!ok) return;
    toast.loading('Recalculando...', { id: 'recalc' });
    try {
      const r = await fetch(API_COMP, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalcular' }),
      });
      const d = await r.json();
      toast.dismiss('recalc');
      if (d.success) { toast.success(`Procesados: ${d.procesados} clientes`); cargar(); }
      else toast.error(d.message || 'Error');
    } catch (e: any) { toast.dismiss('recalc'); toast.error(e?.message || 'Error de red'); }
  };

  const buscarClienteFA = (q: string) => {
    setFaCliente(q);
    if (q.length < 2) { setFaClienteResults([]); return; }
    clearTimeout(faTimer.current);
    faTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`http://localhost:80/conta-app-backend/api/clientes/buscar.php?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (d.success) setFaClienteResults(d.clientes || d.data || []);
      } catch (e) {}
    }, 250);
  };

  const guardarFactAnt = async () => {
    if (!faClienteId || !faFacturaN || !(parseInt(faValor) > 0)) { toast.error('Complete cliente, número y valor'); return; }
    try {
      const r = await fetch('http://localhost:80/conta-app-backend/api/clientes/factura-anterior.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crear', cliente_id: faClienteId, factura_n: faFacturaN, fecha: faFecha, valor: parseInt(faValor), saldo: parseInt(faSaldo || faValor), dias: parseInt(faDias) || 30 })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setShowFactAnt(false); setFaFacturaN(''); setFaValor(''); setFaSaldo(''); setFaClienteId(0); setFaClienteNombre(''); cargar(); }
      else toast.error(d.message);
    } catch (e) { toast.error('Error'); }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = clientes.filter(c => {
    const b = busqueda.toLowerCase();
    const matchBusqueda = !busqueda ||
      c.Razon_Social?.toLowerCase().includes(b) ||
      c.Nit?.includes(busqueda) ||
      c.Telefonos?.includes(busqueda);
    if (!matchBusqueda) return false;

    // Filtros por estado de cartera (castigada vs activa)
    const castigada = (c.cartera_castigada ?? 0) === 1;
    if (filtro === 'castigadas') return castigada;
    if (filtro === 'todos_incluyendo_castigadas') return true;
    if (castigada) return false;  // demás filtros excluyen castigadas por default

    const d = c.Dias_Mayor_Vencimiento;
    switch (filtro) {
      case 'sin_vencer': return d <= 0;
      case '1a30': return d >= 1 && d <= 30;
      case '31a60': return d >= 31 && d <= 60;
      case 'mas60': return d > 60;
      case 'alto': return c.Saldo_Total >= 500000;
      case 'mejores': return c.comportamiento === 'excelente' || c.comportamiento === 'puntual';
      case 'morosos': return c.comportamiento === 'moroso' || c.comportamiento === 'critico';
      default: return true;
    }
  });

  const columnDefs: ColDef[] = [
    {
      headerName: 'Código', field: 'CodigoClien', width: 80, sortable: true,
    },
    {
      headerName: 'Cliente', field: 'Razon_Social', flex: 1, minWidth: 200, sortable: true, filter: true,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, cursor: 'pointer', color: '#1f2937' }}>{p.value}</span>
    },
    {
      headerName: 'NIT / CC', field: 'Nit', width: 110, sortable: true,
    },
    {
      headerName: 'Teléfono', field: 'Telefonos', width: 110,
      cellRenderer: (p: any) => {
        const v = p.value || '';
        return (!v || v === '0' || v === '-') ? <span style={{ color: '#9ca3af' }}>-</span> : <span>{v}</span>;
      }
    },
    {
      headerName: 'Facturas', field: 'Facturas_Pendientes', width: 80, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 600, color: '#7c3aed' }}>{p.value}</span>
    },
    {
      headerName: 'Saldo Total', field: 'Saldo_Total', width: 130, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{fmtMon(p.value || 0)}</span>
    },
    {
      headerName: 'Días', field: 'Dias_Mayor_Vencimiento', width: 70, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const d = p.value || 0;
        const color = d > 60 ? '#dc2626' : d > 30 ? '#d97706' : '#16a34a';
        return <span style={{ fontWeight: 600, color }}>{d}d</span>;
      }
    },
    {
      headerName: 'Cupo', field: 'CupoAutorizado', width: 100, sortable: true,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        return v === 0 ? <span style={{ color: '#9ca3af' }}>-</span> : <span>{fmtMon(v)}</span>;
      }
    },
    {
      headerName: 'Comportamiento', field: 'comportamiento', width: 130, sortable: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        const c = (p.value || 'sin_datos') as Comportamiento;
        const cfg = COMP_CONFIG[c];
        const castigada = p.data.cartera_castigada === 1;
        if (castigada) {
          return <span style={{ background: '#1f2937', color: '#fca5a5', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>⛔ CASTIGADA</span>;
        }
        return (
          <span title={p.data.dias_mora_promedio !== null && p.data.dias_mora_promedio !== undefined ? `Mora promedio: ${p.data.dias_mora_promedio} días` : 'Sin pagos suficientes'}
            style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      headerName: '', width: 90, sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
      cellRenderer: (p: any) => {
        const castigada = p.data.cartera_castigada === 1;
        return (
          <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setDetalleId(p.data.CodigoClien); }}
              title="Ver facturas y pagar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}
            >
              <Eye size={16} color="#7c3aed" />
            </button>
            {castigada ? (
              <button
                onClick={(e) => { e.stopPropagation(); restaurarCartera(p.data); }}
                title="Restaurar cartera (volver a activa)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}
              >
                <RotateCcw size={16} color="#16a34a" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); castigarCartera(p.data); }}
                title="Castigar cartera (marcar incobrable)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}
              >
                <Ban size={16} color="#dc2626" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // Cards: separamos cartera activa de castigada.
  // Cartera activa = todos los clientes NO castigados.
  // Cartera castigada = solo los castigados (saldo "incobrable").
  const clientesActivos = clientes.filter(c => (c.cartera_castigada ?? 0) === 0);
  const clientesCastigados = clientes.filter(c => (c.cartera_castigada ?? 0) === 1);
  const totalSaldo = clientesActivos.reduce((s, c) => s + (c.Saldo_Total || 0), 0);
  const totalClientes = clientesActivos.length;
  const totalVencidos = clientesActivos.filter(c => c.Dias_Mayor_Vencimiento > 30).length;
  const saldoVencido = clientesActivos.filter(c => c.Dias_Mayor_Vencimiento > 30).reduce((s, c) => s + (c.Saldo_Total || 0), 0);
  const totalSaldoCastigado = clientesCastigados.reduce((s, c) => s + (c.Saldo_Total || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Cartera de Clientes</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Clientes con saldos pendientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generarReportePDF} title="Imprime un resumen con una línea por cliente y su saldo total" style={{
            height: 30, padding: '0 12px', background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <Printer size={14} /> Resumen
          </button>
          <button onClick={generarReporteDetallado} title="Imprime cada cliente con todas sus facturas pendientes desglosadas por días de mora" style={{
            height: 30, padding: '0 12px', background: '#9333ea', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <Printer size={14} /> Detallado
          </button>
          <button onClick={() => setShowFactAnt(true)} title="Agregar factura de sistema anterior para cargar saldos iniciales" style={{
            height: 30, padding: '0 12px', background: '#d97706', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <Plus size={14} /> Factura Anterior
          </button>
        </div>
      </div>

      {/* Stats — separamos cartera activa de castigada */}
      <div style={{ display: 'grid', gridTemplateColumns: clientesCastigados.length > 0 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Clientes con Saldo', value: totalClientes, icon: Users, bg: '#f3e8ff', color: '#7c3aed', sub: 'cartera activa' },
          { label: 'Total Cartera', value: fmtMon(totalSaldo), icon: DollarSign, bg: '#fee2e2', color: '#dc2626', isText: true, sub: 'sin castigados' },
          { label: 'Clientes Vencidos (>30d)', value: totalVencidos, icon: AlertTriangle, bg: '#fef3c7', color: '#d97706' },
          { label: 'Saldo Vencido', value: fmtMon(saldoVencido), icon: Clock, bg: '#fef3c7', color: '#d97706', isText: true },
          ...(clientesCastigados.length > 0 ? [{
            label: 'Cartera Castigada',
            value: fmtMon(totalSaldoCastigado),
            icon: Ban,
            bg: '#1f2937',
            color: '#fca5a5',
            isText: true,
            sub: `${clientesCastigados.length} cliente${clientesCastigados.length === 1 ? '' : 's'} (no recuperable)`,
            isDark: true,
          }] : []),
        ].map((s: any, i) => {
          const Icon = s.icon;
          const dark = (s as any).isDark;
          return (
            <div key={i} style={{
              background: dark ? '#1f2937' : '#fff',
              borderRadius: 12,
              padding: '14px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: dark ? 'rgba(252,165,165,0.15)' : s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={s.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280' }}>{s.label}</div>
                <div style={{ fontSize: s.isText ? 16 : 20, fontWeight: 700, color: dark ? s.color : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#9ca3af', marginTop: 1 }}>{s.sub}</div>}
              </div>
            </div>
          );
        })}
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
            type="text" placeholder="Buscar por nombre, NIT..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 32, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>

        {[
          { id: 'todos', label: 'Activos' },
          { id: 'sin_vencer', label: 'Sin Vencer' },
          { id: '1a30', label: 'De 1 a 30' },
          { id: '31a60', label: 'De 31 a 60' },
          { id: 'mas60', label: 'Más de 60' },
          { id: 'alto', label: 'Saldo >$500k' },
          { id: 'mejores', label: '⭐ Mejores' },
          { id: 'morosos', label: '⚠ Morosos' },
          { id: 'castigadas', label: '⛔ Castigadas' },
          { id: 'todos_incluyendo_castigadas', label: 'Todas' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            height: 28, padding: '0 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
            border: filtro === f.id ? '1px solid #7c3aed' : '1px solid #e5e7eb',
            background: filtro === f.id ? '#f3e8ff' : '#fff',
            color: filtro === f.id ? '#7c3aed' : '#374151',
            fontWeight: filtro === f.id ? 600 : 400,
          }}>
            {f.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={recalcularComportamiento} title="Recalcula categorías de puntualidad de todos los clientes" style={{
          height: 32, padding: '0 12px', background: '#fff', color: '#16a34a',
          border: '1px solid #16a34a', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
        }}>
          <Award size={13} /> Recalcular
        </button>
        <button onClick={cargar} style={{
          height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 370px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filtrados}
            columnDefs={columnDefs}
            loading={loading}
            animateRows
            getRowId={p => String(p.data.CodigoClien)}
            rowHeight={36}
            headerHeight={36}
            defaultColDef={{ resizable: true }}
            onRowClicked={e => setDetalleId(e.data.CodigoClien)}
            getRowStyle={p => {
              const dias = p.data?.Dias_Mayor_Vencimiento || 0;
              if (dias > 60) return { background: '#fef2f2' };
              if (dias > 30) return { background: '#fffbeb' };
              return undefined;
            }}
          />
        </div>
      </div>

      {detalleId !== null && (
        <ClienteDetalle clienteId={detalleId} tabInicial="pagar" onClose={() => { setDetalleId(null); cargar(); }} />
      )}

      {/* Modal Factura Anterior */}
      {showFactAnt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowFactAnt(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: 450, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#d97706' }}>Agregar Factura Anterior</span>
              <button onClick={() => setShowFactAnt(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Use esta opción para cargar saldos de un sistema anterior</p>

            {/* Buscar cliente */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CLIENTE</label>
              {faClienteId ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 10px', background: '#f9fafb', borderRadius: 8, border: '1px solid #d1d5db' }}>
                  <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>{faClienteId}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{faClienteNombre}</span>
                  <button onClick={() => { setFaClienteId(0); setFaClienteNombre(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color="#9ca3af" /></button>
                </div>
              ) : (
                <div>
                  <input type="text" value={faCliente} onChange={e => buscarClienteFA(e.target.value)} placeholder="Buscar cliente..."
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
                  {faClienteResults.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 150, overflow: 'auto', zIndex: 10 }}>
                      {faClienteResults.map((c: any) => (
                        <div key={c.CodigoClien} onClick={() => { setFaClienteId(c.CodigoClien); setFaClienteNombre(c.Nombre_Cliente || c.Razon_Social); setFaClienteResults([]); setFaCliente(''); }}
                          style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}
                          onMouseOver={e => (e.currentTarget.style.background = '#f3e8ff')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                          <span style={{ color: '#7c3aed', fontWeight: 700, marginRight: 8 }}>{c.CodigoClien}</span>{c.Nombre_Cliente || c.Razon_Social}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nº FACTURA</label>
                <input type="text" value={faFacturaN} onChange={e => setFaFacturaN(e.target.value)} placeholder="AT-12345"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>FECHA</label>
                <input type="date" value={faFecha} onChange={e => setFaFecha(e.target.value)}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>VALOR</label>
                <input type="text" value={faValor} onChange={e => { setFaValor(e.target.value.replace(/[^0-9]/g, '')); if (!faSaldo) setFaSaldo(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="$ 0"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 700, padding: '0 10px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>SALDO</label>
                <input type="text" value={faSaldo} onChange={e => setFaSaldo(e.target.value.replace(/[^0-9]/g, ''))} placeholder="= Valor"
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 700, padding: '0 10px', color: '#dc2626', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>DÍAS</label>
                <input type="text" value={faDias} onChange={e => setFaDias(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 8px', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowFactAnt(false)} style={{ height: 34, padding: '0 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarFactAnt}
                style={{ height: 34, padding: '0 20px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Agregar Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Castigar Cartera */}
      {castigoModal.cliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ban size={22} color="#dc2626" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Castigar cartera</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {castigoModal.cliente.Razon_Social} · Saldo {fmtMon(castigoModal.cliente.Saldo_Total)}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#78350f', marginBottom: 14, lineHeight: 1.5 }}>
                ⚠ El cliente desaparecerá del listado principal de cartera. <strong>El saldo y las facturas NO se borran</strong> — quedan disponibles en el filtro "Castigadas" y se pueden restaurar después.
              </div>

              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>MOTIVO DEL CASTIGO</label>
              <select
                value={castigoModal.motivo}
                onChange={(e) => setCastigoModal({ ...castigoModal, motivo: e.target.value })}
                style={{ width: '100%', height: 36, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', background: '#fff', outline: 'none', marginBottom: 12 }}
              >
                {MOTIVOS_CASTIGO.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              {castigoModal.motivo === 'otro' && (
                <>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>DESCRIBE EL MOTIVO</label>
                  <textarea
                    value={castigoModal.detalle}
                    onChange={(e) => setCastigoModal({ ...castigoModal, detalle: e.target.value })}
                    placeholder="Aclaración libre..."
                    rows={3}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, padding: 10, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button
                onClick={() => setCastigoModal({ cliente: null, motivo: 'cliente_perdido', detalle: '' })}
                disabled={castigando}
                style={{ height: 36, padding: '0 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCastigo}
                disabled={castigando}
                style={{ height: 36, padding: '0 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: castigando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Ban size={14} /> {castigando ? 'Castigando...' : 'Sí, castigar cartera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
