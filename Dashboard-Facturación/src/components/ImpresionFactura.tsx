import { getConfigImpresion } from './ConfiguracionSistema';

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
const fmtMonDec = (v: number) => '$ ' + v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface DatosFactura {
  numero: number | string;
  fecha: string;
  tipo: string; // Contado / Crédito
  dias: number;
  cliente: { nombre: string; nit: string; telefono: string; direccion: string };
  items: { codigo: string; nombre: string; cantidad: number; precio: number; iva: number; descuento: number; subtotal: number }[];
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  efectivo: number;
  transferencia: number;
  cambio: number;
  abono: number;
  saldo: number;
  medioPago: string;
  vendedor: string;
  empresa: { nombre: string; nit: string; telefono: string; direccion: string; regimen: string; propietario: string; resolucion: string; };
  caja?: number;
  esCotizacion?: boolean;
  logo?: string; // URL o base64 del logo
}

// ============================================================
// TIRILLA POS 80mm
// ============================================================
function tirilla(d: DatosFactura): string {
  const config = getConfigImpresion();
  const titulo = d.esCotizacion ? 'COTIZACIÓN' : 'DCTO EQUIVALENTE';
  const linea = '<div style="border-bottom:1px dashed #000;margin:4px 0;"></div>';

  let html = `<div style="width:62mm;font-family:'Courier New',monospace;font-size:11px;padding:3mm 4mm;line-height:1.4;word-wrap:break-word;overflow-wrap:break-word;">`;
  // Empresa
  html += `<div style="text-align:center;margin-bottom:6px;">`;
  if (d.logo) html += `<img src="${d.logo}" style="max-width:40mm;max-height:15mm;margin-bottom:4px;" />`;
  html += `<div style="font-size:12px;font-weight:bold;word-wrap:break-word;">${d.empresa.nombre}</div>`;
  html += `<div>Nit. ${d.empresa.nit}</div>`;
  if (config.mostrarDireccion) html += `<div>${d.empresa.direccion}</div>`;
  if (config.mostrarTelefono) html += `<div>Tel. ${d.empresa.telefono}</div>`;
  html += `</div>`;

  // Datos factura
  html += `<div style="margin-bottom:4px;">`;
  html += `<div>${titulo} No. <b>${d.numero}</b></div>`;
  html += `<div>CLIENTE: ${d.cliente.nombre}</div>`;
  html += `<div>NIT: ${d.cliente.nit}</div>`;
  if (d.cliente.direccion && d.cliente.direccion !== '-') html += `<div>DIRECCIÓN: ${d.cliente.direccion}</div>`;
  html += `<div>SISTEMA P.O.S:</div>`;
  html += `<div>FECHA: ${d.fecha}</div>`;
  html += `<div>CAJA No: Caja ${d.caja || 1}</div>`;
  html += `</div>`;

  // Header productos
  html += `<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:10px;margin-bottom:1px;">`;
  html += `<span>Cod</span><span>Descripción</span><span>Cant</span><span>Valor</span><span>Total</span></div>`;
  html += linea;

  // Items
  for (const item of d.items) {
    const ivaLetra = item.iva > 0 ? 'A' : 'E';
    html += `<div style="margin-bottom:5px;">`;
    html += `<div style="word-wrap:break-word;"><b>${item.codigo}</b> ${item.nombre}</div>`;
    html += `<div style="display:flex;justify-content:space-between;">`;
    html += `<span>&nbsp;&nbsp;${item.cantidad} x ${fmtMonDec(item.precio)}</span>`;
    html += `<span>${fmtMonDec(item.subtotal)} ${ivaLetra}</span>`;
    html += `</div></div>`;
  }

  // Totales
  html += linea;
  html += `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>SUBTOTAL</span><span>${fmtMonDec(d.subtotal)}</span></div>`;
  html += linea;
  if (d.descuento > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>DESCUENTO</span><span>${fmtMonDec(d.descuento)}</span></div>`;
  html += `<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;margin:3px 0;"><span>TOTAL</span><span>${fmtMonDec(d.total)}</span></div>`;

  if (!d.esCotizacion) {
    if (d.efectivo > 0) html += `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>EFECTIVO</span><span>${fmtMonDec(d.efectivo)}</span></div>`;
    if (d.transferencia > 0) html += `<div style="display:flex;justify-content:space-between;font-size:10px;"><span>${d.medioPago.toUpperCase()}</span><span>${fmtMonDec(d.transferencia)}</span></div>`;
    html += `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>CAMBIO</span><span>${fmtMonDec(d.cambio)}</span></div>`;
  }

  // Detalle impuestos — siempre mostrar para régimen común
  html += linea;
  html += `<div style="text-align:center;font-weight:bold;font-size:9px;">** DETALLE DE LOS IMPUESTOS **</div>`;
  html += `<div style="display:flex;justify-content:space-between;font-size:9px;font-weight:bold;">`;
  html += `<span>Tipo</span><span>Compra</span><span>Base/Imp</span><span>Imp</span></div>`;
  html += linea;

  // Items gravados (IVA > 0)
  const itemsGravados = d.items.filter(i => i.iva > 0);
  const totalGravado = itemsGravados.reduce((s, i) => s + i.subtotal, 0);
  const baseGravado = itemsGravados.reduce((s, i) => s + (i.subtotal / (1 + i.iva / 100)), 0);
  const ivaGravado = totalGravado - baseGravado;

  // Items exentos (IVA = 0)
  const itemsExentos = d.items.filter(i => !i.iva || i.iva === 0);
  const totalExento = itemsExentos.reduce((s, i) => s + i.subtotal, 0);

  if (totalGravado > 0) {
    html += `<div style="display:flex;justify-content:space-between;font-size:9px;">`;
    html += `<span>A 19%</span><span>${fmtMonDec(totalGravado)}</span><span>${fmtMonDec(baseGravado)}</span><span>${fmtMonDec(ivaGravado)}</span></div>`;
  }
  if (totalExento > 0) {
    html += `<div style="display:flex;justify-content:space-between;font-size:9px;">`;
    html += `<span>SIN IVA</span><span>${fmtMonDec(totalExento)}</span><span></span><span></span></div>`;
  }

  html += linea;
  html += `<div style="display:flex;justify-content:space-between;font-size:9px;font-weight:bold;">`;
  html += `<span>TOTAL</span><span>${fmtMonDec(d.total)}</span><span>${fmtMonDec(baseGravado || d.subtotal)}</span><span>${fmtMonDec(ivaGravado)}</span></div>`;

  html += linea;
  html += `<div>FORMA DE PAGO: ${d.tipo}, Días ${d.dias}</div>`;
  html += `<div>VENDEDOR: ${d.vendedor || 'Vendedor'}</div>`;
  html += `<br>`;
  html += `<div style="text-align:center;">${linea}</div>`;
  html += `<div style="text-align:center;">Aceptación del Cliente</div>`;
  html += `<br><br>`;
  html += `<div style="text-align:center;font-weight:bold;letter-spacing:2px;">"GRACIAS POR SU COMPRA"</div>`;
  html += `</div>`;
  return html;
}

// ============================================================
// MEDIA CARTA (izquierda o derecha)
// Usa flex con min-height para que el footer quede al fondo
// ============================================================
function mediaCarta(d: DatosFactura, lado: 'izquierda' | 'derecha' = 'izquierda'): string {
  const config = getConfigImpresion();
  const titulo = d.esCotizacion ? 'Cotización Nº' : 'Factura de Venta Nº';
  const w = '50%';
  const ml = lado === 'derecha' ? '50%' : '0';

  let html = `<div style="width:${w};margin-left:${ml};font-family:Arial,sans-serif;font-size:12px;padding:8mm 10mm;box-sizing:border-box;min-height:100vh;display:flex;flex-direction:column;">`;

  // ===== HEADER: Empresa + Cliente =====
  // Nombre empresa centrado arriba
  html += `<div style="text-align:center;font-size:14px;font-weight:bold;margin-bottom:6px;word-wrap:break-word;">${d.empresa.nombre}</div>`;

  // Logo + datos + Nº factura
  html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">`;
  html += `<div style="display:flex;align-items:flex-start;gap:6px;">`;
  if (d.logo) html += `<img src="${d.logo}" style="max-width:22mm;max-height:16mm;" />`;
  html += `<div>`;
  if (config.mostrarPropietario && d.empresa.propietario !== '-') html += `<div style="font-size:11px;">${d.empresa.propietario}</div>`;
  html += `<div style="font-size:10px;">Nit. ${d.empresa.nit} &nbsp; ${d.empresa.regimen}</div>`;
  if (config.mostrarTelefono) html += `<div style="font-size:10px;">Tel. ${d.empresa.telefono}</div>`;
  if (config.mostrarDireccion) html += `<div style="font-size:10px;">${d.empresa.direccion}</div>`;
  html += `</div></div>`;
  html += `<div style="border:2px solid #000;padding:4px 10px;text-align:center;flex-shrink:0;">`;
  html += `<div style="font-size:10px;font-weight:bold;">${titulo}</div>`;
  html += `<div style="font-size:20px;font-weight:bold;">${String(d.numero).padStart(7, '0')}</div>`;
  html += `</div></div>`;

  // Fecha y termino
  html += `<div style="border:1px solid #000;padding:3px 8px;margin-bottom:5px;font-size:11px;">`;
  html += `<span>Fecha: ${d.fecha}</span> &nbsp;&nbsp; <span>Termino: ${d.tipo} ${d.dias > 0 ? d.dias + ' días' : ''}</span>`;
  html += `</div>`;

  // Datos cliente
  html += `<fieldset style="border:1px solid #000;padding:3px 8px;margin:0 0 5px;font-size:11px;">`;
  html += `<legend style="font-size:10px;font-weight:bold;">Datos del Cliente</legend>`;
  html += `<div>Nombres: ${d.cliente.nombre} &nbsp;&nbsp; Nit: ${d.cliente.nit}</div>`;
  html += `<div>Dirección: ${d.cliente.direccion} &nbsp;&nbsp; Tel.: ${d.cliente.telefono}</div>`;
  html += `</fieldset>`;

  // ===== BODY: Tabla de productos (flex:1 para que empuje el footer abajo) =====
  html += `<div style="flex:1;">`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:11px;">`;
  html += `<thead><tr style="border:1px solid #000;background:#f5f5f5;">`;
  html += `<th style="text-align:left;padding:3px 5px;border:1px solid #000;">Descripción</th>`;
  html += `<th style="text-align:center;padding:3px 5px;border:1px solid #000;width:45px;">Cant.</th>`;
  html += `<th style="text-align:right;padding:3px 5px;border:1px solid #000;width:75px;">Valor U.</th>`;
  html += `<th style="text-align:right;padding:3px 5px;border:1px solid #000;width:80px;">Subtotal</th>`;
  html += `</tr></thead><tbody>`;
  for (const item of d.items) {
    html += `<tr>`;
    html += `<td style="padding:2px 5px;border-bottom:1px dotted #ccc;">${item.nombre}</td>`;
    html += `<td style="text-align:center;padding:2px 5px;border-bottom:1px dotted #ccc;">${item.cantidad}</td>`;
    html += `<td style="text-align:right;padding:2px 5px;border-bottom:1px dotted #ccc;">${fmtMon(item.precio)}</td>`;
    html += `<td style="text-align:right;padding:2px 5px;border-bottom:1px dotted #ccc;">${fmtMon(item.subtotal)}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  html += `</div>`;

  // ===== FOOTER: Totales + Firma + Legal (siempre al fondo) =====
  html += `<div style="border-top:2px solid #000;padding-top:4px;margin-top:auto;">`;
  html += `<div style="display:flex;gap:10px;font-size:11px;">`;
  // Izquierda: artículos + firma
  html += `<div style="flex:1;">`;
  html += `<div style="margin-bottom:4px;"><b>Nº Artículos:</b> ${d.items.length}</div>`;
  html += `<div style="text-align:center;margin-top:20px;">________________________</div>`;
  html += `<div style="text-align:center;font-size:10px;">Recibí Conforme<br>Sello y NIT o Cédula</div>`;
  html += `</div>`;
  // Derecha: totales
  html += `<div style="border:1px solid #000;padding:4px 8px;min-width:160px;">`;
  html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;"><b>SUBTOTAL:</b><span>${fmtMonDec(d.subtotal)}</span></div>`;
  if (d.descuento > 0) html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;"><b>DESCUENTO:</b><span>${fmtMonDec(d.descuento)}</span></div>`;
  html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;"><b>IVA:</b><span>${fmtMonDec(d.iva)}</span></div>`;
  html += `<div style="display:flex;justify-content:space-between;gap:14px;font-weight:bold;font-size:13px;border-top:2px solid #000;padding-top:3px;"><span>TOTAL:</span><span>${fmtMonDec(d.total)}</span></div>`;
  if (d.abono > 0) html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:3px;"><b>ABONO:</b><span>${fmtMonDec(d.abono)}</span></div>`;
  if (d.saldo > 0) html += `<div style="display:flex;justify-content:space-between;gap:14px;"><b>SALDO:</b><span>${fmtMonDec(d.saldo)}</span></div>`;
  html += `</div></div>`;

  // Legal
  html += `<div style="font-size:7px;margin-top:5px;border-top:1px solid #000;padding-top:3px;">`;
  html += `Esta Factura de Venta se asimila para todos los efectos legales, a una letra de cambio según el Artículo 772 - 774 del Código de Comercio y causará intereses moratorios a las tasas vigentes a la fecha del vencimiento sobre los saldos no pagados oportunamente. No se aceptan devoluciones sin previa autorización escrita.`;
  html += `</div>`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

// ============================================================
// CARTA COMPLETA
// ============================================================
function carta(d: DatosFactura): string {
  const config = getConfigImpresion();
  const titulo = d.esCotizacion ? 'Cotización Nº' : 'Factura de Venta Nº';

  let html = `<div style="width:100%;font-family:Arial,sans-serif;font-size:12px;padding:12mm;box-sizing:border-box;">`;

  // Empresa + Nº factura
  html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">`;
  html += `<div style="display:flex;align-items:flex-start;gap:12px;">`;
  if (d.logo) html += `<img src="${d.logo}" style="max-width:35mm;max-height:22mm;" />`;
  html += `<div>`;
  html += `<div style="font-size:16px;font-weight:bold;">${d.empresa.nombre}</div>`;
  html += `<div style="font-size:11px;">Nit. ${d.empresa.nit} &nbsp;&nbsp; ${d.empresa.regimen}</div>`;
  if (config.mostrarDireccion) html += `<div style="font-size:11px;">${d.empresa.direccion}</div>`;
  if (config.mostrarTelefono) html += `<div style="font-size:11px;">Tel. ${d.empresa.telefono}</div>`;
  html += `</div></div>`;
  html += `<div style="border:2px solid #000;padding:6px 16px;text-align:center;">`;
  html += `<div style="font-size:11px;font-weight:bold;">${titulo}</div>`;
  html += `<div style="font-size:22px;font-weight:bold;">${d.esCotizacion ? '' : 'VEN'}${String(d.numero).padStart(7, '0')}</div>`;
  html += `</div></div>`;

  // Fecha
  html += `<div style="display:flex;gap:20px;margin-bottom:8px;">`;
  html += `<div style="border:1px solid #000;padding:4px 10px;font-size:11px;"><b>Fecha:</b> ${d.fecha}</div>`;
  html += `<div style="border:1px solid #000;padding:4px 10px;font-size:11px;"><b>Termino:</b> ${d.tipo} ${d.dias > 0 ? '- ' + d.dias + ' días' : ''}</div>`;
  html += `</div>`;

  // Cliente
  html += `<fieldset style="border:1px solid #000;padding:4px 10px;margin:0 0 10px;font-size:11px;">`;
  html += `<legend style="font-weight:bold;">Datos del Cliente</legend>`;
  html += `<div style="display:flex;gap:20px;">`;
  html += `<div style="flex:1;">Nombres: ${d.cliente.nombre}</div>`;
  html += `<div>Nit: ${d.cliente.nit}</div></div>`;
  html += `<div style="display:flex;gap:20px;">`;
  html += `<div style="flex:1;">Dirección: ${d.cliente.direccion}</div>`;
  html += `<div>Tel.: ${d.cliente.telefono}</div></div>`;
  html += `</fieldset>`;

  // Tabla
  html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;">`;
  html += `<thead><tr style="border:2px solid #000;background:#f0f0f0;">`;
  html += `<th style="text-align:left;padding:3px 6px;border:1px solid #000;width:70px;">Código</th>`;
  html += `<th style="text-align:left;padding:3px 6px;border:1px solid #000;">Descripción</th>`;
  html += `<th style="text-align:center;padding:3px 6px;border:1px solid #000;width:45px;">Cant.</th>`;
  html += `<th style="text-align:right;padding:3px 6px;border:1px solid #000;width:80px;">Valor U.</th>`;
  html += `<th style="text-align:center;padding:3px 6px;border:1px solid #000;width:45px;">% IVA</th>`;
  html += `<th style="text-align:right;padding:3px 6px;border:1px solid #000;width:85px;">Subtotal</th>`;
  html += `</tr></thead><tbody>`;

  for (const item of d.items) {
    html += `<tr>`;
    html += `<td style="padding:2px 6px;border-bottom:1px dotted #ccc;">${item.codigo}</td>`;
    html += `<td style="padding:2px 6px;border-bottom:1px dotted #ccc;">${item.nombre}</td>`;
    html += `<td style="text-align:center;padding:2px 6px;border-bottom:1px dotted #ccc;">${item.cantidad}</td>`;
    html += `<td style="text-align:right;padding:2px 6px;border-bottom:1px dotted #ccc;">${fmtMon(item.precio)}</td>`;
    html += `<td style="text-align:center;padding:2px 6px;border-bottom:1px dotted #ccc;">${item.iva}%</td>`;
    html += `<td style="text-align:right;padding:2px 6px;border-bottom:1px dotted #ccc;">${fmtMon(item.subtotal)}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;

  // Pie
  html += `<div style="display:flex;gap:16px;">`;
  html += `<div style="flex:1;">`;
  html += `<div style="margin-bottom:30px;">Observaciones:</div>`;
  html += `<div style="text-align:center;">_____________________________</div>`;
  html += `<div style="text-align:center;font-size:10px;">Recibí Conforme<br>Sello y NIT o Cédula</div>`;
  html += `</div>`;
  html += `<div style="border:1px solid #000;padding:6px 12px;min-width:200px;">`;
  html += `<div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:3px;"><b>SUBTOTAL:</b><span>${fmtMon(d.subtotal)}</span></div>`;
  if (d.descuento > 0) html += `<div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:3px;"><b>DESCUENTO:</b><span>${fmtMon(d.descuento)}</span></div>`;
  if (d.iva > 0) html += `<div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:3px;"><b>IVA:</b><span>${fmtMon(d.iva)}</span></div>`;
  html += `<div style="display:flex;justify-content:space-between;gap:20px;font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:4px;"><span>TOTAL:</span><span>${fmtMon(d.total)}</span></div>`;
  html += `</div></div>`;

  // Legal
  html += `<div style="font-size:8px;margin-top:12px;border-top:1px solid #000;padding-top:4px;">`;
  html += `Esta Factura de Venta se asimila para todos los efectos legales, a una letra de cambio según el Artículo 772 - 774 del Comercio y causará intereses moratorios a las tasas vigentes a la fecha del vencimiento sobre los saldos no pagados oportunamente. No se aceptan devoluciones sin previa autorización escrita.`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

// ============================================================
// MEDIA CARTA DOBLE (original + copia lado a lado)
// ============================================================
function mediaCartaDoble(d: DatosFactura): string {
  const izq = mediaCarta(d, 'izquierda');
  const der = mediaCarta(d, 'derecha');
  // Wrap both in a flex container
  return `<div style="display:flex;width:100%;"><div style="width:50%;">${izq.replace(/width:50%;margin-left:0;/, 'width:100%;')}</div><div style="width:50%;border-left:1px dashed #999;">${der.replace(/width:50%;margin-left:50%;/, 'width:100%;')}</div></div>`;
}

// ============================================================
// FUNCIÓN PRINCIPAL: Imprimir factura
// ============================================================
export function imprimirFactura(datos: DatosFactura) {
  const config = getConfigImpresion();
  const formato = datos.esCotizacion ? config.formatoCotizacion : config.formatoFactura;

  let contenido = '';
  let pageSize = '';

  switch (formato) {
    case 'tirilla':
      contenido = tirilla(datos);
      pageSize = '72mm auto';
      break;
    case 'media-carta':
      if (config.mediaCartaDerecha) {
        contenido = mediaCarta(datos, 'derecha');
      } else {
        contenido = mediaCarta(datos, 'izquierda');
      }
      pageSize = 'letter landscape';
      break;
    case 'carta':
      contenido = carta(datos);
      pageSize = 'letter portrait';
      break;
    default:
      contenido = mediaCarta(datos);
      pageSize = 'letter landscape';
  }

  const winWidth = formato === 'tirilla' ? 360 : 800;
  const winHeight = formato === 'tirilla' ? 700 : 600;
  const printWindow = window.open('', '_blank', `width=${winWidth},height=${winHeight}`);
  if (!printWindow) return;

  const toolbar = `<div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;background:#7c3aed;padding:6px 16px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
    <button onclick="document.getElementById('print-toolbar').style.display='none';window.print();setTimeout(function(){document.getElementById('print-toolbar').style.display='flex';},500);" style="height:30px;padding:0 16px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close();" style="height:30px;padding:0 12px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;">✕ Cerrar</button>
    <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:auto;font-family:Arial;">${datos.esCotizacion ? 'Cotización' : 'Factura'} #${datos.numero} — Vista previa</span>
  </div>`;

  const bodyPadding = config.vistaPrevia ? 'padding-top:44px;' : '';

  printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>${datos.esCotizacion ? 'Cotización' : 'Factura'} #${datos.numero}</title>
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
// HELPER: Construir DatosFactura desde los datos de NuevaVenta
// ============================================================
export function buildDatosFactura(
  factN: number | string,
  lineas: any[],
  cliente: any,
  tipo: string,
  dias: number,
  descuentoGlobal: number,
  efectivo: number,
  transferencia: number,
  cambio: number,
  abono: number,
  medioPago: string,
  esCotizacion?: boolean
): DatosFactura {
  const items = lineas.map(l => ({
    codigo: l.Codigo, nombre: l.Nombre, cantidad: l.Cantidad,
    precio: l.PrecioVenta, iva: l.Iva, descuento: l.Descuento,
    subtotal: l.Subtotal
  }));

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const iva = items.reduce((s, i) => s + (i.subtotal * (i.iva / 100)), 0);
  const total = subtotal + iva - descuentoGlobal;
  const saldo = tipo === 'Contado' ? 0 : Math.max(total - abono, 0);

  return {
    numero: factN,
    fecha: new Date().toLocaleDateString('es-CO') + ' - ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    tipo, dias,
    cliente: { nombre: cliente.nombre, nit: cliente.nit, telefono: cliente.tel, direccion: cliente.dir },
    items, subtotal, descuento: descuentoGlobal, iva, total,
    efectivo, transferencia, cambio, abono, saldo,
    medioPago, vendedor: 'Vendedor',
    empresa: {
      nombre: 'DISTRIBUIDORA DE SALSAS DE PLANETA RICA',
      nit: '901.529.697-3',
      telefono: '3128478781',
      direccion: 'CR 7 14 60 BRR LOS ABETOS PLANETA RICA',
      regimen: 'Régimen Común',
      propietario: '-',
      resolucion: '0'
    },
    caja: 1,
    esCotizacion,
    logo: getConfigImpresion().logo || undefined
  };
}
