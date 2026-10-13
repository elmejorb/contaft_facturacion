// Recibo de pago / Comprobante de egreso — copia 1:1 del patrón de
// ImpresionFactura.tsx: función que construye HTML string + abre window.open
// con toolbar. UNA sola ventana (no modal + ventana). Las medidas tirilla
// (width:62mm, padding 3mm/4mm, Arial 11px) son idénticas a la factura
// tirilla porque esa SÍ imprime bien en impresoras térmicas viejas.
import { getConfigImpresion, getEmpresaCache } from './ConfiguracionSistema';

export interface RetencionAplicada {
  concepto_label: string;
  tipo_codigo?: string; // '05'=ReteIVA, '06'=ReteFte, '07'=ReteICA
  base?: number;
  tarifa?: number;
  monto: number;
}

export interface PagoRecibo {
  RecCajaN: number;
  Fecha: string;
  NFactAnt: string;
  ValorPago: number;
  SaldoAct: number;
  Descuento?: number;
  MedioPago: string;
  DetallePago: string;
  Retenciones?: RetencionAplicada[]; // 4.7.13+: retenciones aplicadas por el cliente
}

export interface ClienteRecibo {
  CodigoClien: number;
  Razon_Social: string;
  Nit: string;
  Telefonos: string;
}

const getEmpresa = () => {
  const c = getEmpresaCache();
  return { nombre: c.nombre, nit: c.nit, direccion: c.direccion, telefono: c.telefono };
};

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

function numeroALetras(num: number): string {
  const unidades = ['', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
  const decenas = ['', 'Diez', 'Veinte', 'Treinta', 'Cuarenta', 'Cincuenta', 'Sesenta', 'Setenta', 'Ochenta', 'Noventa'];
  const especiales: Record<number, string> = {
    11: 'Once', 12: 'Doce', 13: 'Trece', 14: 'Catorce', 15: 'Quince',
    16: 'Dieciséis', 17: 'Diecisiete', 18: 'Dieciocho', 19: 'Diecinueve',
    21: 'Veintiún', 22: 'Veintidós', 23: 'Veintitrés', 24: 'Veinticuatro',
    25: 'Veinticinco', 26: 'Veintiséis', 27: 'Veintisiete', 28: 'Veintiocho', 29: 'Veintinueve'
  };
  const centenas = ['', 'Ciento', 'Doscientos', 'Trescientos', 'Cuatrocientos', 'Quinientos', 'Seiscientos', 'Setecientos', 'Ochocientos', 'Novecientos'];
  const n = Math.round(num);
  if (n === 0) return 'Cero Pesos';
  const convertir = (x: number): string => {
    if (x === 0) return '';
    if (x === 100) return 'Cien';
    if (x < 10) return unidades[x];
    if (especiales[x]) return especiales[x];
    if (x < 100) {
      const d = Math.floor(x / 10); const u = x % 10;
      return decenas[d] + (u > 0 ? ' y ' + unidades[u] : '');
    }
    if (x < 1000) {
      const c = Math.floor(x / 100); const r = x % 100;
      return centenas[c] + (r > 0 ? ' ' + convertir(r) : '');
    }
    if (x < 1000000) {
      const miles = Math.floor(x / 1000); const r = x % 1000;
      const prefix = miles === 1 ? 'Mil' : convertir(miles) + ' Mil';
      return prefix + (r > 0 ? ' ' + convertir(r) : '');
    }
    const millones = Math.floor(x / 1000000); const r = x % 1000000;
    const prefix = millones === 1 ? 'Un Millón' : convertir(millones) + ' Millones';
    return prefix + (r > 0 ? ' ' + convertir(r) : '');
  };
  return convertir(n) + ' Pesos';
}

// Fecha defensiva: igual que la de la factura. Si la BD trae NULL o
// '0000-00-00 00:00:00' (pagos legacy VB6) → fecha de hoy, no "Invalid Date".
function fmtFecha(raw: any): string {
  if (!raw || raw === '0000-00-00 00:00:00' || raw === '0000-00-00') return new Date().toLocaleString('es-CO');
  const norm = typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
  const d = new Date(norm);
  if (isNaN(d.getTime())) return new Date().toLocaleString('es-CO');
  const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
}

// ============================================================
// TIRILLA — mismo HTML que ImpresionFactura.tirilla() pero con
// contenido de pago. Width/padding/fuente IDÉNTICOS a la factura
// porque esa ya imprime bien en impresoras térmicas viejas.
// ============================================================
function tirilla(pago: PagoRecibo, cliente: ClienteRecibo, tipoTercero: 'cliente' | 'proveedor'): string {
  const empresa = getEmpresa();
  const config = getConfigImpresion();
  const linea = '<div style="border-bottom:1px dashed #000;margin:4px 0;"></div>';
  const titulo = tipoTercero === 'proveedor' ? 'COMPROBANTE DE EGRESO' : 'RECIBO DE PAGO';
  const labelTercero = tipoTercero === 'proveedor' ? 'PROVEEDOR' : 'CLIENTE';
  const labelAccion = tipoTercero === 'proveedor' ? 'PAGADO A' : 'RECIBIDO DE';

  let html = `<div style="width:62mm;font-family:Arial,Helvetica,sans-serif;font-size:11px;padding:3mm 4mm;line-height:1.4;word-wrap:break-word;overflow-wrap:break-word;">`;

  // Empresa
  html += `<div style="text-align:center;margin-bottom:6px;">`;
  html += `<div style="font-size:12px;font-weight:bold;word-wrap:break-word;">${empresa.nombre}</div>`;
  html += `<div>Nit. ${empresa.nit}</div>`;
  if (config.mostrarDireccion) html += `<div>${empresa.direccion}</div>`;
  if (config.mostrarTelefono) html += `<div>Tel. ${empresa.telefono}</div>`;
  html += `</div>`;

  // Título
  html += linea;
  html += `<div style="text-align:center;font-weight:bold;font-size:12px;margin:2px 0;">${titulo} No. ${pago.RecCajaN}</div>`;
  html += linea;

  // Datos del pago
  html += `<div style="margin-bottom:4px;">`;
  html += `<div>FECHA: ${fmtFecha(pago.Fecha)}</div>`;
  html += `<div>${labelAccion}:</div>`;
  html += `<div style="word-wrap:break-word;"><b>${cliente.Razon_Social}</b></div>`;
  html += `<div>${labelTercero === 'PROVEEDOR' ? 'NIT' : 'NIT/CC'}: ${cliente.Nit || '-'}</div>`;
  if (pago.NFactAnt) html += `<div>FACTURA: <b>${pago.NFactAnt}</b></div>`;
  html += `<div>MEDIO PAGO: ${pago.MedioPago}</div>`;
  if ((pago.Descuento || 0) > 0) html += `<div>DESCUENTO: ${fmtMon(pago.Descuento || 0)}</div>`;
  if (pago.DetallePago) html += `<div style="word-wrap:break-word;">CONCEPTO: ${pago.DetallePago}</div>`;
  html += `</div>`;

  // Totales
  html += linea;
  html += `<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:12px;">`;
  html += `<span>VALOR PAGADO:</span><span>${fmtMon(pago.ValorPago)}</span></div>`;
  html += `<div style="display:flex;justify-content:space-between;">`;
  html += `<span>Saldo cliente:</span><span>${fmtMon(pago.SaldoAct)}</span></div>`;
  html += linea;

  // En letras
  html += `<div style="font-size:10px;margin:4px 0;word-wrap:break-word;">Son: ${numeroALetras(pago.ValorPago)}</div>`;

  // Firma
  html += `<div style="margin-top:18px;text-align:center;">`;
  html += `<div style="border-top:1px solid #000;width:50mm;margin:0 auto;padding-top:3px;font-size:10px;">Firma</div>`;
  html += `</div>`;

  // Frase final
  html += `<div style="text-align:center;font-size:10px;margin-top:8px;">Gracias por su pago</div>`;

  html += `</div>`;
  return html;
}

// ============================================================
// MEDIA CARTA — formato oficina (recibo completo con cuadro).
// ============================================================
function mediaCarta(pago: PagoRecibo, cliente: ClienteRecibo, tipoTercero: 'cliente' | 'proveedor'): string {
  const empresa = getEmpresa();
  const titulo = tipoTercero === 'proveedor' ? 'COMPROBANTE DE EGRESO' : 'RECIBO DE PAGO';
  const labelAccion = tipoTercero === 'proveedor' ? 'PAGADO A' : 'RECIBIDO DE';

  let html = `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:12px;padding:10mm;box-sizing:border-box;color:#000;">`;

  // Header
  html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">`;
  html += `<div style="text-align:center;flex:1;">`;
  html += `<div style="font-size:18px;font-weight:700;letter-spacing:1px;">${empresa.nombre}</div>`;
  html += `<div style="font-size:12px;margin-top:2px;">Nit. ${empresa.nit}</div>`;
  html += `<div style="font-size:11px;">${empresa.direccion}</div>`;
  html += `<div style="font-size:11px;">Tel: ${empresa.telefono}</div>`;
  html += `</div>`;
  html += `<div style="border:2px solid #000;padding:8px 14px;text-align:center;flex-shrink:0;">`;
  html += `<div style="font-size:11px;font-weight:700;">COMPROBANTE</div>`;
  html += `<div style="font-size:11px;font-weight:700;">${tipoTercero === 'proveedor' ? 'DE EGRESO No.' : 'DE INGRESO No.'}</div>`;
  html += `<div style="font-size:22px;font-weight:700;margin-top:2px;">${pago.RecCajaN}</div>`;
  html += `</div>`;
  html += `</div>`;

  // Tabla
  html += `<table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-top:10px;">`;
  html += `<tbody>`;
  html += `<tr>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:600;width:150px;font-size:12px;background:#f9f9f9;">CIUDAD Y FECHA</td>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;">${fmtFecha(pago.Fecha)}</td>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:600;width:80px;font-size:12px;background:#f9f9f9;">VALOR</td>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:700;font-size:16px;text-align:right;">${fmtMon(pago.ValorPago)}</td>`;
  html += `</tr>`;
  html += `<tr>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:600;font-size:12px;background:#f9f9f9;">${labelAccion}</td>`;
  html += `<td colspan="3" style="border:1px solid #000;padding:6px 10px;">${cliente.Razon_Social} — NIT: ${cliente.Nit || '-'}</td>`;
  html += `</tr>`;
  html += `<tr>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:600;font-size:12px;background:#f9f9f9;">POR CONCEPTO DE</td>`;
  html += `<td colspan="3" style="border:1px solid #000;padding:6px 10px;">${pago.DetallePago || '-'}</td>`;
  html += `</tr>`;
  html += `<tr>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:600;font-size:12px;background:#f9f9f9;">MEDIO DE PAGO</td>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;">${pago.MedioPago}</td>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;font-weight:600;font-size:12px;background:#f9f9f9;">SALDO TOTAL</td>`;
  html += `<td style="border:1px solid #000;padding:6px 10px;text-align:right;font-weight:600;">${fmtMon(pago.SaldoAct)}</td>`;
  html += `</tr>`;

  // Retenciones aplicadas por el cliente (4.7.13+)
  // Si el cliente aplicó una o más retenciones al pagar, listamos cada una
  // con concepto + monto, y mostramos el total abonado real (pago + retenc).
  const rets = pago.Retenciones || [];
  if (rets.length > 0) {
    const totalRet = rets.reduce((s, r) => s + (r.monto || 0), 0);
    html += `<tr>`;
    html += `<td colspan="4" style="border:1px solid #000;border-top:2px solid #000;padding:6px 10px;background:#fef3c7;font-weight:700;font-size:11px;letter-spacing:0.5px;">RETENCIONES APLICADAS POR EL CLIENTE</td>`;
    html += `</tr>`;
    for (const r of rets) {
      const tipoLabel = r.tipo_codigo === '05' ? 'ReteIVA' : r.tipo_codigo === '07' ? 'ReteICA' : 'ReteFuente';
      const detalle = `${tipoLabel} — ${r.concepto_label}${r.tarifa ? ` (${r.tarifa}%)` : ''}`;
      html += `<tr>`;
      html += `<td colspan="3" style="border:1px solid #000;padding:5px 10px;font-size:11px;">${detalle}</td>`;
      html += `<td style="border:1px solid #000;padding:5px 10px;text-align:right;font-weight:600;color:#92400e;">${fmtMon(r.monto)}</td>`;
      html += `</tr>`;
    }
    html += `<tr>`;
    html += `<td colspan="2" style="border:1px solid #000;padding:5px 10px;font-weight:700;font-size:11px;background:#fef3c7;">TOTAL RETENIDO</td>`;
    html += `<td style="border:1px solid #000;padding:5px 10px;font-weight:700;font-size:11px;background:#fef3c7;">ABONO REAL (EFECTIVO + RETENCIONES)</td>`;
    html += `<td style="border:1px solid #000;padding:5px 10px;text-align:right;font-weight:700;color:#92400e;background:#fef3c7;">${fmtMon(totalRet)}</td>`;
    html += `</tr>`;
    html += `<tr>`;
    html += `<td colspan="3" style="border:1px solid #000;padding:5px 10px;font-weight:700;font-size:12px;background:#dcfce7;">VALOR TOTAL APLICADO AL SALDO</td>`;
    html += `<td style="border:1px solid #000;padding:5px 10px;text-align:right;font-weight:700;font-size:13px;color:#15803d;background:#dcfce7;">${fmtMon(pago.ValorPago + totalRet)}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table>`;

  // En letras — monto efectivo (sin incluir retenciones, que no son dinero)
  html += `<div style="border:1px solid #000;border-top:none;padding:8px 10px;display:flex;gap:10px;">`;
  html += `<span style="font-weight:600;font-size:12px;flex-shrink:0;background:#f9f9f9;padding:0 4px;">LA SUMA DE</span>`;
  html += `<span style="font-weight:700;">${numeroALetras(pago.ValorPago)}</span>`;
  html += `</div>`;

  // Firmas
  html += `<div style="margin-top:40px;display:flex;justify-content:space-between;">`;
  html += `<div style="text-align:center;width:45%;">`;
  html += `<div style="border-top:1px solid #000;padding-top:4px;font-size:11px;">FIRMA Y SELLO DEL BENEFICIARIO</div>`;
  html += `</div>`;
  html += `<div style="text-align:center;width:45%;">`;
  html += `<div style="border-top:1px solid #000;padding-top:4px;font-size:11px;">FIRMA AUTORIZADA</div>`;
  html += `</div>`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

// ============================================================
// FUNCIÓN PRINCIPAL: imprime en UNA sola ventana. Reemplaza
// el antiguo componente modal — ya no hay preview intermedio.
// ============================================================
export function imprimirReciboPago(
  pago: PagoRecibo,
  cliente: ClienteRecibo,
  formatoOverride?: 'tirilla' | 'media-carta',
  tipoTercero: 'cliente' | 'proveedor' = 'cliente'
) {
  const config = getConfigImpresion();
  const formato = formatoOverride || config.formatoPago;
  const esTirilla = formato === 'tirilla';
  const contenido = esTirilla ? tirilla(pago, cliente, tipoTercero) : mediaCarta(pago, cliente, tipoTercero);
  const pageSize = esTirilla ? '72mm auto' : 'half-letter';

  const winWidth = esTirilla ? 360 : 720;
  const winHeight = esTirilla ? 700 : 600;
  const printWindow = window.open('', '_blank', `width=${winWidth},height=${winHeight}`);
  if (!printWindow) return;

  const titulo = tipoTercero === 'proveedor' ? `Comprobante Egreso #${pago.RecCajaN}` : `Recibo Pago #${pago.RecCajaN}`;
  const toolbar = `<div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;background:#7c3aed;padding:6px 16px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-family:Arial;">
    <button onclick="document.getElementById('print-toolbar').style.display='none';window.print();setTimeout(function(){document.getElementById('print-toolbar').style.display='flex';},500);" style="height:30px;padding:0 16px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close();" style="height:30px;padding:0 12px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;">✕ Cerrar</button>
    <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:auto;">${titulo} — Vista previa</span>
  </div>`;

  const bodyPadding = config.vistaPrevia ? 'padding-top:44px;' : '';

  printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>${titulo}</title>
    <style>
      @media print {
        @page { size: ${pageSize}; margin: 0; }
        body { margin: 0; padding: 0 !important; }
        #print-toolbar { display: none !important; }
      }
      body { margin: 0; ${bodyPadding} }
    </style>
  </head><body>${config.vistaPrevia ? toolbar : ''}${contenido}</body></html>`);

  printWindow.document.close();

  if (config.vistaPrevia) {
    printWindow.focus();
  } else {
    printWindow.print();
    printWindow.close();
  }
}

// ============================================================
// Compat: componente wrapper para los callers viejos que usan
// <ReciboImpresion ... /> en JSX. Internamente llama a la función
// `imprimirReciboPago` al montar y cierra el modal padre con onClose().
// Esto evita romper los callers existentes mientras los migramos.
// ============================================================
import { useEffect } from 'react';

interface Props {
  pago: PagoRecibo;
  cliente: ClienteRecibo;
  formato: 'media-carta' | 'tirilla';
  onClose: () => void;
  tipoTercero?: 'cliente' | 'proveedor';
}

export function ReciboImpresion({ pago, cliente, formato, onClose, tipoTercero = 'cliente' }: Props) {
  useEffect(() => {
    imprimirReciboPago(pago, cliente, formato, tipoTercero);
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
