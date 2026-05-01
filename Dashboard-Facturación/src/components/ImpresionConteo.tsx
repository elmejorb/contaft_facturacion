export interface DatosConteo {
  Id_Conteo: number;
  Fecha: string;
  Usuario: string;
  Observacion: string;
  Tipo: string;
}

export interface DetalleConteo {
  Codigo: string;
  Nombres_Articulo: string;
  Categoria: string;
  Existencia_Sistema: number;
}

export function imprimirHojaConteo(
  conteo: DatosConteo,
  detalle: DetalleConteo[],
  opciones: { ciego: boolean }
) {
  const fecha = conteo.Fecha ? new Date(conteo.Fecha).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO');

  let html = `<div style="font-family:Arial,sans-serif;font-size:12px;padding:5mm;box-sizing:border-box;">`;

  // Header
  html += `<div style="text-align:center;margin-bottom:15px;">`;
  html += `<h2 style="margin:0;font-size:18px;">HOJA DE CONTEO FÍSICO DE INVENTARIO</h2>`;
  html += `<h3 style="margin:5px 0 0;font-size:13px;color:#4b5563;">${opciones.ciego ? 'CONTEO CIEGO' : 'CONTEO CON EXISTENCIAS DEL SISTEMA'}</h3>`;
  html += `</div>`;

  // Info card
  html += `<table style="width:100%;margin-bottom:15px;border-collapse:collapse;border:2px solid #000;background:#fcfcfc;">
    <tr>
      <td style="padding:6px 10px;border:1px solid #000;width:50%;"><b>Conteo Nº:</b> ${conteo.Id_Conteo}</td>
      <td style="padding:6px 10px;border:1px solid #000;width:50%;"><b>Fecha de Creación:</b> ${fecha}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;border:1px solid #000;"><b>Usuario/Responsable:</b> ${conteo.Usuario}</td>
      <td style="padding:6px 10px;border:1px solid #000;"><b>Tipo de Conteo:</b> ${conteo.Tipo}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:6px 10px;border:1px solid #000;"><b>Observaciones:</b> ${conteo.Observacion || '-'}</td>
    </tr>
  </table>`;

  // Items table
  html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:30px;">`;
  html += `<thead><tr style="background:#f0f0f0;">`;
  html += `<th style="border:1px solid #000;padding:6px;text-align:center;width:40px;">#</th>`;
  html += `<th style="border:1px solid #000;padding:6px;text-align:left;width:90px;">Código</th>`;
  html += `<th style="border:1px solid #000;padding:6px;text-align:left;">Descripción del Producto</th>`;
  html += `<th style="border:1px solid #000;padding:6px;text-align:left;width:110px;">Categoría</th>`;
  
  if (!opciones.ciego) {
    html += `<th style="border:1px solid #000;padding:6px;text-align:center;width:70px;">Sistema</th>`;
  }
  
  html += `<th style="border:1px solid #000;padding:6px;text-align:center;width:120px;">Conteo Físico</th>`;
  html += `</tr></thead><tbody>`;

  detalle.forEach((item, index) => {
    html += `<tr>`;
    html += `<td style="border:1px solid #000;padding:6px;text-align:center;">${index + 1}</td>`;
    html += `<td style="border:1px solid #000;padding:6px;">${item.Codigo}</td>`;
    html += `<td style="border:1px solid #000;padding:6px;">${item.Nombres_Articulo}</td>`;
    html += `<td style="border:1px solid #000;padding:6px;">${item.Categoria}</td>`;
    
    if (!opciones.ciego) {
      html += `<td style="border:1px solid #000;padding:6px;text-align:center;background:#f9fafb;">${item.Existencia_Sistema}</td>`;
    }
    
    html += `<td style="border:1px solid #000;padding:6px;text-align:center;"></td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  // Footer / Signatures
  html += `<div style="display:flex;justify-content:space-between;margin-top:40px;page-break-inside:avoid;">`;
  html += `<div style="width:40%;text-align:center;">
    <div style="border-top:1px solid #000;padding-top:5px;">Elaborado / Contado por</div>
    <div style="margin-top:15px;font-size:11px;">Nombre y Cédula: _______________________</div>
  </div>`;
  html += `<div style="width:40%;text-align:center;">
    <div style="border-top:1px solid #000;padding-top:5px;">Revisado / Aprobado por</div>
    <div style="margin-top:15px;font-size:11px;">Nombre y Cédula: _______________________</div>
  </div>`;
  html += `</div>`;

  html += `</div>`;

  const printWindow = window.open('', '_blank', `width=800,height=600`);
  if (!printWindow) return;

  const toolbar = `<div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;background:#7c3aed;padding:6px 16px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
    <button onclick="document.getElementById('print-toolbar').style.display='none';window.print();setTimeout(function(){document.getElementById('print-toolbar').style.display='flex';},500);" style="height:30px;padding:0 16px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close();" style="height:30px;padding:0 12px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;">✕ Cerrar</button>
    <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:auto;font-family:Arial;">Hoja de Conteo #${conteo.Id_Conteo}</span>
  </div>`;

  printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>Hoja de Conteo #${conteo.Id_Conteo}</title>
    <style>
      @media print {
        @page { size: letter portrait; margin: 10mm; }
        body { margin: 0; padding: 0 !important; }
        #print-toolbar { display: none !important; }
      }
      body { margin: 0; padding-top:44px; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    </style>
  </head><body>${toolbar}${html}</body></html>`);

  printWindow.document.close();
  printWindow.focus();
}
