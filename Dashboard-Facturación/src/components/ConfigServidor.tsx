import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Save, Server, Loader2, FileText } from 'lucide-react';
import { getApiUrl, setApiUrl, testConnection, getConfigFilePath } from '../config/api';
import toast from 'react-hot-toast';

export function ConfigServidor() {
  const [url, setUrl] = useState(getApiUrl());
  const [testing, setTesting] = useState(false);
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);
  const [configPath, setConfigPath] = useState('');

  useEffect(() => { getConfigFilePath().then(p => setConfigPath(p)); }, []);

  const probar = async () => {
    setTesting(true);
    setResultado(null);
    const r = await testConnection(url);
    setResultado(r);
    setTesting(false);
  };

  const guardar = async () => {
    await setApiUrl(url);
    toast.success('Servidor guardado. Recargue la aplicación para aplicar los cambios.');
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Configuración del Servidor</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>URL del servidor donde está la API y la base de datos</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>URL DE LA API</label>
          <input type="text" value={url} onChange={e => { setUrl(e.target.value); setResultado(null); }}
            placeholder="http://192.168.1.100:80/conta-app-backend/api"
            style={{ width: '100%', height: 38, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, padding: '0 12px', boxSizing: 'border-box', fontFamily: 'monospace' }} />
        </div>

        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12 }}>
          <Server size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          <strong>Ejemplos:</strong><br />
          <code style={{ color: '#7c3aed' }}>http://localhost:80/conta-app-backend/api</code> — este equipo<br />
          <code style={{ color: '#7c3aed' }}>http://192.168.1.100:80/conta-app-backend/api</code> — otro equipo en la red
        </div>

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

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={probar} disabled={testing}
            style={{ height: 36, padding: '0 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: testing ? 0.6 : 1 }}>
            {testing ? <Loader2 size={15} /> : <Wifi size={15} />}
            {testing ? 'Probando...' : 'Probar Conexión'}
          </button>
          <button onClick={guardar}
            style={{ height: 36, padding: '0 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={15} /> Guardar
          </button>
        </div>

        {configPath && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} /> Archivo: {configPath}
          </div>
        )}
      </div>
    </div>
  );
}
