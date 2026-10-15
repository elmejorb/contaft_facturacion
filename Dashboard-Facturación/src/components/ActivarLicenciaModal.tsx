import { useEffect, useState } from 'react';
import SubirComprobanteForm from './SubirComprobanteForm';

type Plan = {
  id: number;
  nombre: string;
  periodo?: string;
  monto: number;
  features?: string[];
  recomendado?: boolean;
};

type CuentaBancaria = { banco: string; tipo: string; numero: string; titular: string };

type PlanesData = { planes: Plan[]; cuentas_bancarias: CuentaBancaria[]; nequi: string | null };

const fmtMon = (n: number) => '$ ' + n.toLocaleString('es-CO');

function ipc() {
  return (window as any).require?.('electron')?.ipcRenderer;
}

export default function ActivarLicenciaModal({ onClose }: { onClose: () => void }) {
  const [datos, setDatos] = useState<PlanesData | null>(null);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);
  const [planElegido, setPlanElegido] = useState<Plan | null>(null);
  const [metodo, setMetodo] = useState<'elegir' | 'wompi' | 'comprobante'>('elegir');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = ipc();
    if (!api) { setError('IPC no disponible'); setCargandoPlanes(false); return; }
    api.invoke('pago:planes').then((r: any) => {
      if (r.ok) {
        setDatos({ planes: r.planes, cuentas_bancarias: r.cuentas_bancarias || [], nequi: r.nequi });
      } else {
        setError('No se pudieron cargar los planes: ' + (r.message || r.reason || 'sin razón'));
      }
      setCargandoPlanes(false);
    });
  }, []);

  const pagarWompi = async () => {
    if (!planElegido) return;
    setProcesando(true);
    setError(null);
    const api = ipc();
    const r = await api.invoke('pago:crearLinkWompi', { plan_id: planElegido.id });
    setProcesando(false);
    if (r.ok) {
      setMensaje('Se abrió la pasarela de pago en tu navegador. Cuando pagues, tu licencia se activará sola. Puedes cerrar esta ventana.');
    } else {
      setError('No se pudo generar el link: ' + (r.message || r.reason));
    }
  };

  // === Estilos ===
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };
  const box: React.CSSProperties = {
    background: '#fff', borderRadius: 12, maxWidth: 820, width: '100%',
    maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };
  const header: React.CSSProperties = {
    padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };
  const content: React.CSSProperties = { padding: 20 };
  const planCard = (p: Plan, seleccionado: boolean): React.CSSProperties => ({
    border: '2px solid ' + (seleccionado ? '#2563eb' : p.recomendado ? '#86efac' : '#e5e7eb'),
    borderRadius: 10, padding: 16, cursor: 'pointer', background: '#fff',
    position: 'relative', transition: 'all 0.1s',
  });
  const btnPrimario: React.CSSProperties = {
    background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px',
    borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14,
  };
  const btnSecundario: React.CSSProperties = {
    background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb',
    padding: '10px 20px', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: 14,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Activar licencia Conta FT</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              {metodo === 'elegir' ? 'Elige tu plan y método de pago' :
               metodo === 'wompi' ? 'Pago en línea con Wompi (Bancolombia)' :
               'Subir comprobante de transferencia'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <div style={content}>
          {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}
          {mensaje && <div style={{ background: '#dcfce7', color: '#166534', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{mensaje}</div>}

          {cargandoPlanes && <p>Cargando planes…</p>}

          {!cargandoPlanes && datos && metodo === 'elegir' && (
            <>
              <h3 style={{ marginTop: 0, fontSize: 15, fontWeight: 600 }}>1. Elige tu plan</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
                {datos.planes.map((p) => (
                  <div key={p.id} style={planCard(p, planElegido?.id === p.id)} onClick={() => setPlanElegido(p)}>
                    {p.recomendado && (
                      <span style={{ position: 'absolute', top: -10, right: 10, background: '#16a34a', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>RECOMENDADO</span>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{p.nombre}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', margin: '6px 0' }}>{fmtMon(p.monto)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{p.periodo || 'anual'}</div>
                    {p.features && p.features.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#374151' }}>
                        {p.features.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {planElegido && (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>2. Elige cómo pagar</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fff' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>💳 Pago en línea</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Tarjeta · PSE · Nequi · Bancolombia</div>
                      <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 12 }}>✓ Activación inmediata</div>
                      <button style={btnPrimario} onClick={() => { setMetodo('wompi'); pagarWompi(); }}>Pagar ahora {fmtMon(planElegido.monto)}</button>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fff' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>📄 Transferencia + comprobante</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Bancolombia / Nequi</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Verificamos en max 24 h</div>
                      <button style={btnSecundario} onClick={() => setMetodo('comprobante')}>Ya transferí, subir comprobante</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {metodo === 'wompi' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {procesando && <p style={{ color: '#2563eb' }}>Generando link de pago…</p>}
              {!procesando && mensaje && (
                <>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🌐</div>
                  <p style={{ fontSize: 14, color: '#374151' }}>{mensaje}</p>
                  <button style={{ ...btnSecundario, marginTop: 12 }} onClick={onClose}>Cerrar</button>
                </>
              )}
              {!procesando && !mensaje && error && (
                <button style={btnSecundario} onClick={() => setMetodo('elegir')}>← Volver</button>
              )}
            </div>
          )}

          {metodo === 'comprobante' && planElegido && datos && (
            <SubirComprobanteForm
              plan={planElegido}
              cuentas={datos.cuentas_bancarias}
              nequi={datos.nequi}
              onVolver={() => setMetodo('elegir')}
              onEnviado={(msg) => { setMensaje(msg); setTimeout(() => onClose(), 2500); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
