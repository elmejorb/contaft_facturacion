import { useRef } from 'react';
import { Printer, X } from 'lucide-react';

interface PagoRecibo {
  RecCajaN: number;
  Fecha: string;
  NFactAnt: string;
  ValorPago: number;
  SaldoAct: number;
  Descuento?: number;
  MedioPago: string;
  DetallePago: string;
}

interface Props {
  pago: PagoRecibo;
  cliente: { CodigoClien: number; Razon_Social: string; Nit: string; Telefonos: string };
  formato: 'media-carta' | 'tirilla';
  onClose: () => void;
  tipoTercero?: 'cliente' | 'proveedor';
}

const empresa = {
  nombre: 'DISTRIBUIDORA DE SALSAS DE PLANETA RICA',
  nit: '901.529.697-3',
  direccion: 'CR 7 14 60 BRR LOS ABETOS PLANETA RICA',
  telefono: '3128478781',
  email: 'distrisalsa@gmail.com'
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

export function ReciboImpresion({ pago, cliente, formato, onClose, tipoTercero = 'cliente' }: Props) {
  const labelTercero = tipoTercero === 'proveedor' ? 'Proveedor' : 'Cliente';
  const tituloRecibo = tipoTercero === 'proveedor' ? 'COMPROBANTE DE EGRESO' : 'RECIBO DE PAGO';
  const printRef = useRef<HTMLDivElement>(null);

  const imprimir = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const esTirilla = formato === 'tirilla';
    win.document.write(`
      <html><head><title>Recibo #${pago.RecCajaN}</title>
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

  const fecha = new Date(pago.Fecha);
  const fechaStr = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, maxWidth: formato === 'tirilla' ? 400 : 700, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Vista previa — {formato === 'tirilla' ? 'Tirilla' : 'Media Carta'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={imprimir} style={{
              height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff',
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
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#000', maxWidth: 650, margin: '0 auto' }}>
                {/* Header empresa */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{empresa.nombre}</div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>Nit. {empresa.nit}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{empresa.direccion}</div>
                    <div style={{ fontSize: 11 }}>Tel: {empresa.telefono}</div>
                  </div>
                  <div style={{ border: '2px solid #000', padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>COMPROBANTE</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{tipoTercero === 'proveedor' ? 'DE EGRESO No.' : 'DE INGRESO No.'}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{pago.RecCajaN}</div>
                  </div>
                </div>

                {/* Datos del pago */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: 10 }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 600, width: 150, fontSize: 12, background: '#f9f9f9' }}>CIUDAD Y FECHA</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{fechaStr} {horaStr}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 600, width: 80, fontSize: 12, background: '#f9f9f9' }}>VALOR</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 700, fontSize: 16, textAlign: 'right' }}>{fmtMon(pago.ValorPago)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 600, fontSize: 12, background: '#f9f9f9' }}>{tipoTercero === 'proveedor' ? 'PAGADO A' : 'RECIBIDO DE'}</td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 10px' }}>{cliente.Razon_Social} — NIT: {cliente.Nit || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 600, fontSize: 12, background: '#f9f9f9' }}>POR CONCEPTO DE</td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 10px' }}>{pago.DetallePago}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 600, fontSize: 12, background: '#f9f9f9' }}>MEDIO DE PAGO</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{pago.MedioPago}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 600, fontSize: 12, background: '#f9f9f9' }}>SALDO</td>
                      <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{fmtMon(pago.SaldoAct)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Suma en letras */}
                <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 10px', display: 'flex', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, flexShrink: 0, background: '#f9f9f9', padding: '0 4px' }}>LA SUMA DE</span>
                  <span style={{ fontWeight: 700 }}>{numeroALetras(pago.ValorPago)}</span>
                </div>

                {/* Firmas */}
                <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center', width: '45%' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 11 }}>FIRMA Y SELLO DEL BENEFICIARIO</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '45%' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 11 }}>FIRMA AUTORIZADA</div>
                  </div>
                </div>
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
                  {tituloRecibo} #{pago.RecCajaN}
                </div>

                <div style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fecha:</span><span>{fechaStr} {horaStr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{labelTercero}:</span><span style={{ textAlign: 'right', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cliente.Razon_Social}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>NIT:</span><span>{cliente.Nit || '-'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '4px 0', padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Factura:</span><span style={{ fontWeight: 700 }}>{pago.NFactAnt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Medio pago:</span><span>{pago.MedioPago}</span>
                  </div>
                  {(pago.Descuento || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Descuento:</span><span>{fmtMon(pago.Descuento || 0)}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                    <span>VALOR PAGADO:</span><span>{fmtMon(pago.ValorPago)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Saldo restante:</span><span>{fmtMon(pago.SaldoAct)}</span>
                  </div>
                </div>

                <div style={{ padding: '4px 0', fontSize: 10 }}>
                  <div>Son: {numeroALetras(pago.ValorPago)}</div>
                </div>

                <div style={{ marginTop: 20, textAlign: 'center', fontSize: 10 }}>
                  <div style={{ borderTop: '1px dashed #000', paddingTop: 4, width: '70%', margin: '0 auto' }}>Firma</div>
                </div>

                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 9, color: '#666' }}>
                  Gracias por su pago
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
