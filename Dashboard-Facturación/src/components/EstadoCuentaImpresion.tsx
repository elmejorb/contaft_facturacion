import { useRef, useEffect } from 'react';
import { getEmpresaCache } from './ConfiguracionSistema';

// Impresión del estado de cuenta de un cliente: listado de facturas
// pendientes de pago con total adeudado. Dos formatos:
//   - media-carta: tabla formal para archivo o entrega en papel
//   - tirilla: 80mm térmica para dar al cliente en el mostrador

interface FacturaPendiente {
  Factura_N: number | string;
  Fecha: string;
  Total: number;
  Saldo: number;
  DiasVencimiento?: number;
  Tipo?: string;
}

interface Props {
  cliente: { CodigoClien: number; Razon_Social: string; Nit: string; Telefonos: string };
  facturas: FacturaPendiente[];
  formato: 'media-carta' | 'tirilla';
  onClose: () => void;
}

const fmtMon = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');
const fmtFecha = (s: string) => {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const getEmpresa = () => {
  const c = getEmpresaCache();
  return {
    nombre: c.nombre,
    nit: c.nit,
    direccion: c.direccion,
    telefono: c.telefono,
    email: c.email || '',
  };
};

export function EstadoCuentaImpresion({ cliente, facturas, formato, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const empresa = getEmpresa();

  const totalAdeudado = facturas.reduce((s, f) => s + (Number(f.Saldo) || 0), 0);
  const totalFacturado = facturas.reduce((s, f) => s + (Number(f.Total) || 0), 0);
  const totalAbonado = totalFacturado - totalAdeudado;
  const hoy = new Date();
  const fechaReporte = hoy.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Vencimiento — si el backend no lo trae, lo calculamos con la fecha de factura
  const diasVenc = (f: FacturaPendiente): number => {
    if (typeof f.DiasVencimiento === 'number') return f.DiasVencimiento;
    const d = new Date(f.Fecha);
    if (isNaN(d.getTime())) return 0;
    return Math.floor((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Al montar el componente, inmediatamente abrir la ventana externa con
  // el HTML listo para imprimir y cerrar el "modal" React. Sin vista previa
  // intermedia — así el usuario ve un solo diálogo (el del picker) y luego
  // directo la ventana de impresión con su propio botón Imprimir.
  useEffect(() => {
    // Timeout 0 para asegurar que printRef ya está montado
    const t = setTimeout(() => { imprimir(); onClose(); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const imprimir = () => {
    const content = printRef.current;
    if (!content) return;
    const esTirilla = formato === 'tirilla';
    const winWidth = esTirilla ? 360 : 780;
    const winHeight = esTirilla ? 620 : 720;
    const win = window.open('', '_blank', `width=${winWidth},height=${winHeight}`);
    if (!win) return;
    const titulo = `Estado de cuenta — ${cliente.Razon_Social}`;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>${titulo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ${esTirilla ? "'Courier New', monospace" : "Arial, sans-serif"}; padding-top: 44px; }
        @media print {
          body { margin: 0; padding: 0 !important; }
          #print-toolbar { display: none !important; }
          @page { size: ${esTirilla ? '80mm auto' : 'letter'}; margin: ${esTirilla ? '2mm' : '15mm'}; }
        }
      </style></head><body>
      <div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;background:#7c3aed;padding:6px 16px;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-family:Arial,sans-serif;">
        <button onclick="document.getElementById('print-toolbar').style.display='none';window.print();setTimeout(function(){document.getElementById('print-toolbar').style.display='flex';},500);" style="height:30px;padding:0 16px;background:#fff;color:#7c3aed;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Imprimir</button>
        <button onclick="window.close();" style="height:30px;padding:0 12px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;">✕ Cerrar</button>
        <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:auto;">${titulo} — Vista previa</span>
      </div>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
  };

  const esTirilla = formato === 'tirilla';

  // Sin modal visible — solo un contenedor oculto con el contenido para
  // que el useEffect lo copie a la ventana externa. Ver comentario en el
  // useEffect de arriba.
  return (
    <div style={{ position: 'fixed', left: -99999, top: -99999, visibility: 'hidden' }}>
      <div>
        <div>
          <div ref={printRef}>
            {!esTirilla ? (
              /* ==================== MEDIA CARTA ==================== */
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#000', maxWidth: 700, margin: '0 auto' }}>
                {/* Header empresa */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{empresa.nombre}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>Nit. {empresa.nit}</div>
                    <div style={{ fontSize: 11 }}>{empresa.direccion}</div>
                    <div style={{ fontSize: 11 }}>Tel: {empresa.telefono}{empresa.email ? ' — ' + empresa.email : ''}</div>
                  </div>
                  <div style={{ border: '2px solid #000', padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>ESTADO DE</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>CUENTA</div>
                    <div style={{ fontSize: 10, marginTop: 4 }}>Fecha: {fechaReporte}</div>
                  </div>
                </div>

                {/* Datos cliente */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: 6 }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 600, fontSize: 11, background: '#f9f9f9', width: 90 }}>CLIENTE</td>
                      <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{cliente.Razon_Social}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 600, fontSize: 11, background: '#f9f9f9', width: 60 }}>CÓDIGO</td>
                      <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{cliente.CodigoClien}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 600, fontSize: 11, background: '#f9f9f9' }}>NIT / CC</td>
                      <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{cliente.Nit || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 600, fontSize: 11, background: '#f9f9f9' }}>TEL</td>
                      <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{cliente.Telefonos || '-'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Facturas */}
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                  FACTURAS PENDIENTES ({facturas.length})
                </div>
                {facturas.length === 0 ? (
                  <div style={{ border: '1px solid #000', padding: 12, textAlign: 'center', color: '#666' }}>Sin facturas pendientes</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ background: '#f3e8ff' }}>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11, textAlign: 'center' }}>Nº</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11 }}>Fecha</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11 }}>Tipo</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11, textAlign: 'right' }}>Total</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11, textAlign: 'right' }}>Abonado</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11, textAlign: 'right' }}>Saldo</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontSize: 11, textAlign: 'center' }}>Días</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((f, i) => {
                        const d = diasVenc(f);
                        const abonado = (Number(f.Total) || 0) - (Number(f.Saldo) || 0);
                        return (
                          <tr key={i}>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: 11 }}>{f.Factura_N}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: 11 }}>{fmtFecha(f.Fecha)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: 11 }}>{f.Tipo || 'Crédito'}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontSize: 11 }}>{fmtMon(Number(f.Total) || 0)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontSize: 11 }}>{fmtMon(abonado)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontSize: 11, fontWeight: 700 }}>{fmtMon(Number(f.Saldo) || 0)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: 11, color: d > 30 ? '#b91c1c' : '#000', fontWeight: d > 30 ? 700 : 400 }}>{d}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f3e8ff' }}>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, fontSize: 12 }}>TOTAL</td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{fmtMon(totalFacturado)}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{fmtMon(totalAbonado)}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#b91c1c' }}>{fmtMon(totalAdeudado)}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px' }}></td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* Total y notas */}
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ fontSize: 10, color: '#666', flex: 1 }}>
                    Este documento es un resumen del estado actual de la cuenta del cliente. Para cualquier aclaración o
                    novedad, comuníquese con nosotros al {empresa.telefono}.
                  </div>
                  <div style={{ border: '2px solid #000', padding: '10px 20px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>TOTAL ADEUDADO</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>{fmtMon(totalAdeudado)}</div>
                  </div>
                </div>

                {/* Firma */}
                <div style={{ marginTop: 30, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 10, width: '60%', margin: '0 auto' }}>FIRMA AUTORIZADA</div>
                </div>
              </div>
            ) : (
              /* ==================== TIRILLA ==================== */
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: '#000', width: 280, margin: '0 auto', lineHeight: 1.4 }}>
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{empresa.nombre}</div>
                  <div>NIT: {empresa.nit}</div>
                  <div>{empresa.direccion}</div>
                  <div>Tel: {empresa.telefono}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '4px 0' }}>
                  ESTADO DE CUENTA
                </div>

                <div style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fecha:</span><span>{fechaReporte}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cliente:</span><span style={{ textAlign: 'right', maxWidth: 180, wordBreak: 'break-word' }}>{cliente.Razon_Social}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>NIT:</span><span>{cliente.Nit || '-'}</span>
                  </div>
                  {cliente.Telefonos && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tel:</span><span>{cliente.Telefonos}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px dashed #000', padding: '4px 0', margin: '4px 0', fontWeight: 700, textAlign: 'center' }}>
                  FACTURAS PENDIENTES ({facturas.length})
                </div>

                {facturas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 8, color: '#666' }}>Sin facturas pendientes</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid #000', padding: '2px 0' }}>
                      <span style={{ width: 55 }}>Nº</span>
                      <span style={{ width: 55 }}>Fecha</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>Saldo</span>
                      <span style={{ width: 30, textAlign: 'right' }}>Días</span>
                    </div>
                    {facturas.map((f, i) => {
                      const d = diasVenc(f);
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dotted #ccc' }}>
                          <span style={{ width: 55 }}>{f.Factura_N}</span>
                          <span style={{ width: 55 }}>{fmtFecha(f.Fecha)}</span>
                          <span style={{ flex: 1, textAlign: 'right' }}>{fmtMon(Number(f.Saldo) || 0)}</span>
                          <span style={{ width: 30, textAlign: 'right', fontWeight: d > 30 ? 700 : 400 }}>{d}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '6px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                    <span>TOTAL:</span><span>{fmtMon(totalAdeudado)}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 9, color: '#666' }}>
                  Por favor póngase al día con sus pagos.<br/>Gracias.
                </div>

                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10 }}>
                  <div style={{ borderTop: '1px dashed #000', paddingTop: 4, width: '70%', margin: '0 auto' }}>Firma</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
