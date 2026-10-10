// Desprendible/colilla de pago de nómina — formato media carta
// Patrón de impresión HTML en ventana nueva, mismo esquema que ImpresionFactura.

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export function imprimirDesprendibleNomina(nomina: any) {
  const fecha = new Date(nomina.Fecha_Pago).toLocaleDateString('es-CO');
  const periodoIni = new Date(nomina.Periodo_Inicio).toLocaleDateString('es-CO');
  const periodoFin = new Date(nomina.Periodo_Fin).toLocaleDateString('es-CO');
  const detalle = (nomina.detalle || []) as any[];

  const linea = (label: string, valor: number, color?: string) => `
    <tr>
      <td style="padding:3px 6px;">${label}</td>
      <td style="padding:3px 6px;text-align:right;font-weight:600;${color ? `color:${color};` : ''}">${fmtMon(valor)}</td>
    </tr>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:16px;font-weight:bold;">COMPROBANTE DE NÓMINA</div>
        <div style="font-size:11px;color:#666;">Nº ${nomina.Id_Nomina} — ${fecha}</div>
      </div>

      <table style="width:100%;font-size:12px;margin-bottom:12px;">
        <tr><td><b>Empleado:</b></td><td style="text-align:right;">${nomina.NombreEmpleado}</td></tr>
        ${nomina.Identificacion ? `<tr><td><b>CC:</b></td><td style="text-align:right;">${nomina.Identificacion}</td></tr>` : ''}
        ${nomina.Cargo ? `<tr><td><b>Cargo:</b></td><td style="text-align:right;">${nomina.Cargo}</td></tr>` : ''}
        <tr><td><b>Periodo:</b></td><td style="text-align:right;">${periodoIni} — ${periodoFin}</td></tr>
        <tr><td><b>Tipo:</b></td><td style="text-align:right;text-transform:capitalize;">${nomina.Tipo_Periodo}</td></tr>
      </table>

      <div style="background:#f0fdf4;padding:8px;border-radius:4px;margin-bottom:10px;">
        <div style="font-weight:bold;font-size:12px;margin-bottom:4px;color:#166534;">DEVENGADO</div>
        <table style="width:100%;font-size:12px;">
          ${linea('Salario base', parseFloat(nomina.Salario_Base))}
          ${parseFloat(nomina.Horas_Extras) > 0 ? linea('Horas extras', parseFloat(nomina.Horas_Extras)) : ''}
          ${parseFloat(nomina.Bonificaciones) > 0 ? linea('Bonificaciones', parseFloat(nomina.Bonificaciones)) : ''}
          ${parseFloat(nomina.Otros_Ingresos) > 0 ? linea('Otros ingresos', parseFloat(nomina.Otros_Ingresos)) : ''}
          <tr style="border-top:1px solid #166534;">
            <td style="padding:4px 6px;font-weight:bold;">Total devengado</td>
            <td style="padding:4px 6px;text-align:right;font-weight:bold;color:#166534;">${fmtMon(parseFloat(nomina.Total_Devengado))}</td>
          </tr>
        </table>
      </div>

      ${detalle.length > 0 ? `
      <div style="background:#fef2f2;padding:8px;border-radius:4px;margin-bottom:10px;">
        <div style="font-weight:bold;font-size:12px;margin-bottom:4px;color:#991b1b;">DEDUCCIONES</div>
        <table style="width:100%;font-size:12px;">
          ${detalle.map(d => linea(d.Concepto, parseFloat(d.Valor_Deducido), '#dc2626')).join('')}
          <tr style="border-top:1px solid #991b1b;">
            <td style="padding:4px 6px;font-weight:bold;">Total deducciones</td>
            <td style="padding:4px 6px;text-align:right;font-weight:bold;color:#991b1b;">${fmtMon(parseFloat(nomina.Total_Deducciones))}</td>
          </tr>
        </table>
      </div>` : ''}

      <div style="background:#eff6ff;padding:10px;border-radius:4px;border:2px solid #1e40af;margin-bottom:14px;">
        <table style="width:100%;font-size:14px;">
          <tr>
            <td style="font-weight:bold;">NETO A PAGAR</td>
            <td style="text-align:right;font-weight:bold;font-size:16px;color:#1e40af;">${fmtMon(parseFloat(nomina.Neto))}</td>
          </tr>
        </table>
      </div>

      <div style="font-size:11px;color:#666;margin-bottom:14px;">
        <b>Pagado por:</b> ${nomina.Origen_Pago === 'banco' ? 'Transferencia bancaria' : 'Caja General'}
      </div>

      ${nomina.Observacion ? `<div style="font-size:11px;color:#666;margin-bottom:14px;"><b>Obs:</b> ${nomina.Observacion}</div>` : ''}

      <div style="margin-top:30px;display:flex;justify-content:space-between;">
        <div style="text-align:center;width:45%;">
          <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Empleado</div>
          <div style="font-size:9px;color:#666;margin-top:2px;">(firma y CC)</div>
        </div>
        <div style="text-align:center;width:45%;">
          <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Administrador</div>
        </div>
      </div>
    </div>
  `;

  const pageStyle = `@page { size: 140mm 215mm; margin: 10mm; }`;
  const win = window.open('', 'DesprendibleNomina', 'width=500,height=720,menubar=no,toolbar=no');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Desprendible — ${nomina.NombreEmpleado}</title>
    <style>@media print { ${pageStyle} body { margin: 0; } .no-print { display: none !important; } }</style>
    </head><body>
    <div class="no-print" style="padding:8px 16px;background:#7c3aed;display:flex;gap:8px;align-items:center;">
      <button onclick="window.print()" style="height:30px;padding:0 14px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Imprimir</button>
      <button onclick="window.close()" style="height:30px;padding:0 14px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:6px;font-size:12px;cursor:pointer;">Cerrar</button>
      <span style="color:rgba(255,255,255,0.8);font-size:12px;margin-left:auto;">Desprendible — ${nomina.NombreEmpleado}</span>
    </div>${html}</body></html>`);
  win.document.close();
}
