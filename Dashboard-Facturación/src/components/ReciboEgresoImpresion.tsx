import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { getConfigImpresion, getEmpresaCache } from './ConfiguracionSistema';

interface EgresoRecibo {
  N_Comprobante: number;
  Fecha: string;
  Beneficiario: string;
  Cedula: string;
  Concepto: string;
  Categoria?: string;
  Valor: number;
  MedioPago?: string;
}

interface Props {
  egreso: EgresoRecibo;
  formato: 'media-carta' | 'tirilla';
  onClose: () => void;
}

const getEmpresa = () => {
  const c = getEmpresaCache();
  return {
    nombre: c.nombre,
    nit: c.nit,
    direccion: c.direccion,
    telefono: c.telefono,
    email: c.email || ''
  };
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
  if (n === 100) return 'Cien';

  const convertir = (x: number): string => {
    if (x === 0) return '';
    if (x === 100) return 'Cien';
    if (x < 10) return unidades[x];
    if (especiales[x]) return especiales[x];
    if (x < 100) {
      const d = Math.floor(x / 10);
      const u = x % 10;
      return decenas[d] + (u > 0 ? ' y ' + unidades[u] : '');
    }
    if (x < 1000) {
      const c = Math.floor(x / 100);
      const resto = x % 100;
      return centenas[c] + (resto > 0 ? ' ' + convertir(resto) : '');
    }
    if (x < 1000000) {
      const miles = Math.floor(x / 1000);
      const resto = x % 1000;
      const prefix = miles === 1 ? 'Mil' : convertir(miles) + ' Mil';
      return prefix + (resto > 0 ? ' ' + convertir(resto) : '');
    }
    const millones = Math.floor(x / 1000000);
    const resto = x % 1000000;
    const prefix = millones === 1 ? 'Un Millón' : convertir(millones) + ' Millones';
    return prefix + (resto > 0 ? ' ' + convertir(resto) : '');
  };

  return convertir(n) + ' Pesos';
}

export function ReciboEgresoImpresion({ egreso, formato, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const logo = getConfigImpresion().logo || '';
  const empresa = getEmpresa();

  const imprimir = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const esTirilla = formato === 'tirilla';
    win.document.write(`
      <html><head><title>Comprobante de Egreso #${egreso.N_Comprobante}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ${esTirilla ? "'Courier New', monospace" : "Arial, sans-serif"}; }
        @media print { body { margin: 0; } }
        @page { size: ${esTirilla ? '80mm auto' : 'letter'}; margin: ${esTirilla ? '2mm' : '15mm'}; }
      </style></head><body>
      ${content.innerHTML}
      <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const fecha = new Date(egreso.Fecha);
  const fechaStr = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const beneficiarioLine = [egreso.Cedula, egreso.Beneficiario].filter(Boolean).join('  ');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, maxWidth: formato === 'tirilla' ? 400 : 750, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Vista previa — {formato === 'tirilla' ? 'Tirilla' : 'Media Carta'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={imprimir} style={{
              height: 30, padding: '0 14px', background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Printer size={14} /> Imprimir
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ padding: 20 }}>
          <div ref={printRef}>
            {formato === 'media-carta' ? (
              /* ==================== MEDIA CARTA ==================== */
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#000', maxWidth: 700, margin: '0 auto' }}>
                {/* Header logo + empresa + comprobante */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                  {logo && (
                    <div style={{ width: 110, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: 70, objectFit: 'contain' }} />
                    </div>
                  )}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{empresa.nombre}</div>
                    <div style={{ fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>Nit. {empresa.nit}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{empresa.direccion}</div>
                    <div style={{ fontSize: 11 }}>Tel: {empresa.telefono}</div>
                  </div>
                  <div style={{ border: '1px solid #000', padding: '10px 16px', textAlign: 'left', flexShrink: 0, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                        COMPROBANTE<br />DE EGRESO No.
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, marginLeft: 'auto' }}>{egreso.N_Comprobante}</div>
                    </div>
                  </div>
                </div>

                {/* Datos del egreso */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: 10 }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, width: 150, fontSize: 11 }}>CIUDAD Y FECHA</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{fechaStr}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, width: 80, fontSize: 11 }}>VALOR</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, fontSize: 16, textAlign: 'right', background: '#e5e7eb' }}>{fmtMon(egreso.Valor)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, fontSize: 11 }}>PAGADO A</td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 10px' }}>{beneficiarioLine || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, fontSize: 11 }}>POR CONCEPTO DE</td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 10px' }}>{egreso.Concepto}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '12px 10px', fontWeight: 700, fontSize: 11, verticalAlign: 'top' }}>LA SUMA DE</td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '12px 10px', fontWeight: 700 }}>{numeroALetras(egreso.Valor)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '40px 10px 10px', fontWeight: 700, fontSize: 11, verticalAlign: 'top' }}>FIRMA Y SELLO DEL BENEFICIARIO</td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '40px 10px 10px' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              /* ==================== TIRILLA ==================== */
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: '#000', width: 280, margin: '0 auto', lineHeight: 1.4 }}>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{empresa.nombre}</div>
                  <div>NIT: {empresa.nit}</div>
                  <div>{empresa.direccion}</div>
                  <div>Tel: {empresa.telefono}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '4px 0' }}>
                  COMPROBANTE DE EGRESO #{egreso.N_Comprobante}
                </div>

                <div style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fecha:</span><span>{fechaStr}</span>
                  </div>
                  {egreso.Categoria && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Categoría:</span><span>{egreso.Categoria}</span>
                    </div>
                  )}
                  {egreso.MedioPago && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Medio:</span><span>{egreso.MedioPago}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '4px 0', padding: '4px 0' }}>
                  <div style={{ fontWeight: 700 }}>PAGADO A:</div>
                  {egreso.Cedula && <div>{egreso.Cedula}</div>}
                  <div style={{ fontWeight: 600 }}>{egreso.Beneficiario || '-'}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '4px 0', padding: '4px 0' }}>
                  <div style={{ fontWeight: 700 }}>POR CONCEPTO DE:</div>
                  <div>{egreso.Concepto}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                    <span>VALOR:</span><span>{fmtMon(egreso.Valor)}</span>
                  </div>
                </div>

                <div style={{ padding: '4px 0', fontSize: 10 }}>
                  <div>Son: {numeroALetras(egreso.Valor)}</div>
                </div>

                <div style={{ marginTop: 30, textAlign: 'center', fontSize: 10 }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: 4, width: '80%', margin: '0 auto' }}>FIRMA Y SELLO DEL BENEFICIARIO</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
