import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { codificarPassword } from '../utils/passwordEncoder';

const API = 'http://localhost:80/conta-app-backend/api/auth/verify-admin.php';

export interface AdminAutorizado {
  id: number;
  username: string;
  nombre: string;
}

interface Props {
  /** Texto que describe la acción que se va a autorizar (ej. "Devolver factura FV-1234") */
  motivo: string;
  /** Callback al autorizar exitosamente — recibe los datos del admin */
  onAutorizado: (admin: AdminAutorizado) => void;
  /** Callback al cancelar */
  onCancelar: () => void;
}

export function AutorizacionAdminModal({ motivo, onAutorizado, onCancelar }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => { userRef.current?.focus(); }, []);

  const verificar = async () => {
    if (!username.trim() || !password) {
      setError('Usuario y contraseña son requeridos');
      return;
    }
    setVerificando(true);
    setError('');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: codificarPassword(password),
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        onAutorizado(d.admin);
      } else {
        setError(d.message || 'No autorizado');
      }
    } catch (e) {
      setError('Error de conexión');
    }
    setVerificando(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 420, borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} /> Autorización requerida
          </span>
          <button onClick={onCancelar} disabled={verificando}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: '#7f1d1d' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Acción</div>
            <div style={{ fontWeight: 600 }}>{motivo}</div>
          </div>

          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0, marginBottom: 14 }}>
            Esta acción requiere el usuario y contraseña de un <b>administrador</b> para continuar.
          </p>

          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Usuario administrador</label>
          <input ref={userRef} value={username} onChange={e => setUsername(e.target.value)}
            placeholder="usuario" disabled={verificando}
            onKeyDown={e => { if (e.key === 'Enter') document.getElementById('autoriz-pwd')?.focus(); }}
            style={{ width: '100%', height: 36, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />

          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Contraseña</label>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input id="autoriz-pwd" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" disabled={verificando}
              onKeyDown={e => { if (e.key === 'Enter') verificar(); }}
              style={{ width: '100%', height: 36, padding: '0 36px 0 32px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            <button type="button" onClick={() => setShowPwd(s => !s)} tabIndex={-1}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#991b1b', marginBottom: 10 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        <div style={{ padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancelar} disabled={verificando}
            style={{ height: 32, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={verificar} disabled={verificando || !username.trim() || !password}
            style={{ height: 32, padding: '0 16px', background: (username.trim() && password) ? '#dc2626' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: (username.trim() && password) ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> {verificando ? 'Verificando…' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
