import { useState } from 'react';
import { Wifi, WifiOff, Check, Server, Loader2 } from 'lucide-react';
import { setApiUrl, testConnection } from '../config/api';
import appIcon from '../assets/icon.png';

interface Props { onConfigured: () => void; }

export function ConfigurarServidor({ onConfigured }: Props) {
  const [ip, setIp] = useState('');
  const [puerto, setPuerto] = useState('80');
  const [ruta, setRuta] = useState('/conta-app-backend/api');
  const [testing, setTesting] = useState(false);
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);

  const urlCompleta = `http://${ip || 'localhost'}:${puerto}${ruta}`;

  const probar = async () => {
    setTesting(true);
    setResultado(null);
    const r = await testConnection(urlCompleta);
    setResultado(r);
    setTesting(false);
  };

  const guardar = () => {
    setApiUrl(urlCompleta);
    onConfigured();
  };

  const usarLocal = () => {
    setApiUrl('http://localhost:80/conta-app-backend/api');
    onConfigured();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: 20
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 30, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <img src={appIcon} style={{ width: 40, height: 40 }} alt="" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Conta FT</div>
              <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, letterSpacing: 2 }}>FACTURACIÓN</div>
            </div>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '8px 0 4px' }}>Configurar Servidor</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Indique la dirección del servidor donde está la base de datos</p>
        </div>

        {/* Campos */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>IP DEL SERVIDOR</label>
          <input type="text" value={ip} onChange={e => { setIp(e.target.value); setResultado(null); }}
            placeholder="Ej: 192.168.1.100 o localhost"
            style={{ width: '100%', height: 36, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, padding: '0 12px', boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>PUERTO</label>
            <input type="text" value={puerto} onChange={e => { setPuerto(e.target.value); setResultado(null); }}
              style={{ width: '100%', height: 36, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, padding: '0 10px', boxSizing: 'border-box', textAlign: 'center' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>RUTA DE LA API</label>
            <input type="text" value={ruta} onChange={e => { setRuta(e.target.value); setResultado(null); }}
              style={{ width: '100%', height: 36, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, padding: '0 10px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* URL preview */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, fontFamily: 'monospace', color: '#6b7280', wordBreak: 'break-all' }}>
          <Server size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {urlCompleta}
        </div>

        {/* Resultado de prueba */}
        {resultado && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 12,
            background: resultado.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${resultado.success ? '#86efac' : '#fecaca'}`,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
          }}>
            {resultado.success ? <Wifi size={16} color="#16a34a" /> : <WifiOff size={16} color="#dc2626" />}
            <span style={{ color: resultado.success ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{resultado.message}</span>
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={probar} disabled={testing || !ip}
            style={{
              flex: 1, height: 38, background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: ip ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: testing || !ip ? 0.5 : 1
            }}>
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
            {testing ? 'Probando...' : 'Probar Conexión'}
          </button>
          <button onClick={guardar} disabled={!resultado?.success}
            style={{
              flex: 1, height: 38, background: resultado?.success ? '#16a34a' : '#d1d5db', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: resultado?.success ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
            <Check size={16} /> Guardar y Continuar
          </button>
        </div>

        {/* Opción local */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={usarLocal}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
            Usar servidor local (este equipo)
          </button>
        </div>
      </div>
    </div>
  );
}
