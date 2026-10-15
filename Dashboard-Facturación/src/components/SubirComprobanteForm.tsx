import { useState } from 'react';

type Plan = { id: number; nombre: string; monto: number };
type Cuenta = { banco: string; tipo: string; numero: string; titular: string };

const fmtMon = (n: number) => '$ ' + n.toLocaleString('es-CO');

function ipc() {
  return (window as any).require?.('electron')?.ipcRenderer;
}

export default function SubirComprobanteForm({
  plan, cuentas, nequi, onVolver, onEnviado,
}: {
  plan: Plan;
  cuentas: Cuenta[];
  nequi: string | null;
  onVolver: () => void;
  onEnviado: (mensaje: string) => void;
}) {
  const hoy = new Date().toISOString().substring(0, 10);
  const [monto, setMonto] = useState<number>(plan.monto);
  const [fecha, setFecha] = useState(hoy);
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [referencia, setReferencia] = useState('');
  const [archivo, setArchivo] = useState<{ path: string; name: string; size: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copiar = (texto: string) => {
    try { navigator.clipboard.writeText(texto); } catch {}
  };

  const elegirArchivo = async () => {
    const api = ipc();
    const r = await api.invoke('pago:elegirArchivoComprobante');
    if (r.ok) setArchivo({ path: r.path, name: r.name, size: r.size });
    else if (r.message) setError(r.message);
  };

  const enviar = async () => {
    setError(null);
    if (!monto || monto <= 0) { setError('Ingresa el monto pagado.'); return; }
    if (!fecha) { setError('Ingresa la fecha del pago.'); return; }
    if (!bancoOrigen.trim()) { setError('Indica desde qué banco pagaste.'); return; }
    if (!referencia.trim()) { setError('Ingresa el número de referencia o transacción.'); return; }
    if (!archivo) { setError('Adjunta el comprobante (jpg, png o pdf).'); return; }

    setEnviando(true);
    const api = ipc();
    const r = await api.invoke('pago:subirComprobante', {
      plan_id: plan.id,
      monto_declarado: monto,
      fecha_pago: fecha,
      banco_origen: bancoOrigen,
      referencia_transaccion: referencia,
      file_path: archivo.path,
    });
    setEnviando(false);
    if (r.ok) {
      onEnviado(r.mensaje || 'Comprobante recibido. Verificaremos en máximo 24 horas y te notificaremos por email.');
    } else {
      setError('No se pudo enviar: ' + (r.message || r.reason));
    }
  };

  // === Estilos ===
  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: '#374151', marginBottom: 4, fontWeight: 500 };
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
  const chip: React.CSSProperties = { background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' };

  return (
    <div>
      {/* Paso A: datos de cuenta a usar */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>1. Transfiere {fmtMon(plan.monto)} a una de estas cuentas:</div>
        {cuentas.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>Las cuentas bancarias se mostrarán cuando el CRM esté configurado.</p>}
        {cuentas.map((c, i) => (
          <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: i < cuentas.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
            <b>{c.banco}</b> {c.tipo} · {c.numero} <span style={chip} onClick={() => copiar(c.numero)}>Copiar</span>
            <div style={{ fontSize: 11, color: '#6b7280' }}>A nombre de: {c.titular}</div>
          </div>
        ))}
        {nequi && (
          <div style={{ fontSize: 13, padding: '6px 0', borderTop: cuentas.length ? '1px solid #e5e7eb' : 'none' }}>
            <b>Nequi</b> · {nequi} <span style={chip} onClick={() => copiar(nequi)}>Copiar</span>
          </div>
        )}
      </div>

      {/* Paso B: formulario */}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>2. Después, llena los datos del pago:</div>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <div>
          <label style={label}>Monto pagado (COP)</label>
          <input style={input} type="text" value={monto.toLocaleString('es-CO')}
            onChange={(e) => setMonto(Number(e.target.value.replace(/\D/g, '')) || 0)} />
        </div>
        <div>
          <label style={label}>Fecha del pago</label>
          <input style={input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label style={label}>Banco origen</label>
          <input style={input} type="text" placeholder="Bancolombia, Nequi, Davivienda..." value={bancoOrigen} onChange={(e) => setBancoOrigen(e.target.value)} />
        </div>
        <div>
          <label style={label}>Nº de referencia / transacción</label>
          <input style={input} type="text" placeholder="Ej. 1234567890" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Comprobante (foto o PDF, máx 5 MB)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={elegirArchivo} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            📎 Seleccionar archivo
          </button>
          {archivo && (
            <span style={{ fontSize: 12, color: '#374151' }}>
              {archivo.name} <span style={{ color: '#6b7280' }}>({(archivo.size / 1024).toFixed(0)} KB)</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button type="button" onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          ← Volver
        </button>
        <button type="button" onClick={enviar} disabled={enviando}
          style={{ background: enviando ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: enviando ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600 }}>
          {enviando ? 'Enviando…' : 'Enviar comprobante'}
        </button>
      </div>
    </div>
  );
}
