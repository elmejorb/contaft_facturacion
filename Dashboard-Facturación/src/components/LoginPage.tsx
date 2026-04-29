import { useState } from 'react';
import { Loader2, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import appIcon from '../assets/icon.png';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Error al iniciar sesión');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
    return false;
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: 40,
    padding: '0 12px 0 38px',
    fontSize: 14,
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, oklch(.424 .199 265.638) 0%, oklch(.42 .26 295) 100%)' }}
    >
      {/* Decorative SVG Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute -top-32 -right-32 w-64 h-64" viewBox="0 0 200 200" style={{ opacity: 0.05 }}>
          <circle cx="100" cy="100" r="100" fill="white" />
        </svg>
        <svg className="absolute -bottom-20 -left-20 w-48 h-48" viewBox="0 0 200 200" style={{ opacity: 0.05 }}>
          <circle cx="100" cy="100" r="100" fill="white" />
        </svg>
        <svg className="absolute top-1/4 left-16 w-6 h-6" viewBox="0 0 100 100" style={{ opacity: 0.08 }}>
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>
        <svg className="absolute top-16 right-1/4 w-4 h-4" viewBox="0 0 100 100" style={{ opacity: 0.06 }}>
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>
        <svg className="absolute bottom-1/3 right-24 w-8 h-8" viewBox="0 0 100 100" style={{ opacity: 0.05 }}>
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>
        <svg className="absolute bottom-24 left-1/4 w-3 h-3" viewBox="0 0 100 100" style={{ opacity: 0.1 }}>
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>
        <svg className="absolute top-1/3 right-16 w-16 h-16" viewBox="0 0 100 100" style={{ opacity: 0.04 }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <svg className="absolute bottom-1/4 left-12 w-20 h-20" viewBox="0 0 100 100" style={{ opacity: 0.03 }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        {/* Blob morado glow */}
        <div className="absolute" style={{
          top: '20%', right: '15%', width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, transparent 70%)',
          filter: 'blur(40px)', borderRadius: '50%',
        }} />
        <div className="absolute" style={{
          bottom: '15%', left: '10%', width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.25) 0%, transparent 70%)',
          filter: 'blur(40px)', borderRadius: '50%',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 40%)',
        }} />
      </div>

      {/* Login Card */}
      <div
        className={shake ? 'shake-anim' : 'enter-anim'}
        style={{
          width: '100%', maxWidth: 420, position: 'relative', zIndex: 10,
          background: '#fff', borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
          padding: '24px 28px 22px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
            <img src={appIcon} alt="Conta FT" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', lineHeight: 1.1 }}>Conta FT</div>
              <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, letterSpacing: 2, margin: 0 }}>FACTURACIÓN</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Ingresa tus credenciales para acceder
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="username" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                required
                autoFocus
                style={inputBase}
              />
            </div>
          </div>

          <div style={{ marginBottom: capsLock ? 6 : 14 }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
                onKeyUp={(e) => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
                onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                required
                style={{ ...inputBase, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                  color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {capsLock && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⇪</span> Bloq Mayús está activado
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px -5px rgba(124, 58, 237, 0.5)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px -3px rgba(124, 58, 237, 0.35)'; }}
            style={{
              width: '100%', height: 42, border: 'none', borderRadius: 8,
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px -3px rgba(124, 58, 237, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verificando…
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
            Conta FT v4.2 — Facturación
          </p>
        </form>
      </div>

      <style>{`
        @keyframes enter {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .enter-anim { animation: enter 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-7px); }
          30%, 60%, 90% { transform: translateX(7px); }
        }
        .shake-anim { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
