import { useState, useEffect, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, KeyRound, CheckCircle2, WifiOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import appIcon from '../assets/icon.png';

const getIpc = (): any => {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).require) {
      // @ts-ignore
      return (window as any).require('electron').ipcRenderer;
    }
  } catch {}
  return null;
};

type Status = {
  allowed: boolean;
  source?: 'online' | 'cache' | 'offline-code' | 'dev' | 'none';
  estado?: string;
  reason?: string;
  message?: string;
  empresa?: string;
  fecha_fin?: string;
  dias_restantes?: number;
  plan_nombre?: string;
};

const REASON_TEXT: Record<string, string> = {
  'sin-plan': 'No hay una suscripción activa para esta empresa.',
  'no-activa': 'La suscripción está vencida o suspendida.',
  'sin-red': 'No se pudo contactar el servidor de suscripciones y no hay caché vigente.',
  'no-api-url': 'El sistema no tiene configurada la URL del backend (config.json).',
  'token-vacio': 'La empresa no tiene un api_token configurado en la base de datos.',
  'token-invalido': 'El api_token de la empresa no es válido en el CRM.',
  'backend-inaccesible': 'El backend local no responde. Verifica que Apache/XAMPP esté corriendo.',
  'sin-validacion': 'No se pudo validar la suscripción.',
};

type FeedbackKind = 'info' | 'success' | 'error' | null;

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineCode, setOfflineCode] = useState('');
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: FeedbackKind; text: string } | null>(null);

  const check = async (showFeedback = false) => {
    setLoading(true);
    if (showFeedback) setFeedback({ kind: 'info', text: '⏳ Validando suscripción con backend y CRM...' });
    const ipc = getIpc();
    if (!ipc) {
      setStatus({ allowed: true, source: 'dev' });
      setLoading(false);
      return;
    }
    try {
      const r: Status = await ipc.invoke('subscription:check');
      setStatus(r);
      if (showFeedback) {
        if (r?.allowed) setFeedback({ kind: 'success', text: `✅ Suscripción activa (${r.empresa || ''})` });
        else setFeedback({ kind: 'error', text: `❌ ${r?.message || REASON_TEXT[r?.reason || ''] || 'Validación falló'} — motivo: ${r?.reason || 'desconocido'}` });
      }
    } catch (e: any) {
      setStatus({ allowed: false, reason: 'error-ipc', message: String(e?.message || e) });
      if (showFeedback) setFeedback({ kind: 'error', text: `❌ Error IPC: ${e?.message || e}` });
    }
    setLoading(false);
  };

  useEffect(() => { check(); }, []);

  const guardarCodigoOffline = async () => {
    const code = offlineCode.trim();
    if (!code) { toast.error('Pega el código primero'); return; }
    const ipc = getIpc();
    if (!ipc) return;
    setValidating(true);
    try {
      const r = await ipc.invoke('subscription:setOfflineCode', code);
      if (r?.ok) {
        toast.success(`Código aceptado · vence ${r.payload?.fecha_fin || '—'}`);
        setShowOfflineForm(false);
        setOfflineCode('');
        await check();
      } else {
        toast.error(`Código inválido (${r?.reason || 'error'})`);
      }
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
    setValidating(false);
  };

  const guardarApiToken = async () => {
    const tok = apiToken.trim();
    setFeedback(null);
    if (!tok) { setFeedback({ kind: 'error', text: 'Pega el token primero' }); return; }
    if (tok.length < 32) { setFeedback({ kind: 'error', text: `El token tiene solo ${tok.length} caracteres. Debe tener al menos 32. Verifica que lo copiaste completo.` }); return; }
    if (!/^[a-zA-Z0-9]+$/.test(tok)) { setFeedback({ kind: 'error', text: 'El token tiene caracteres inválidos (debe ser solo letras y números). ¿Lo copiaste con espacios o saltos de línea?' }); return; }
    const ipc = getIpc();
    if (!ipc) { setFeedback({ kind: 'error', text: 'IPC no disponible (estás corriendo en modo navegador, no Electron).' }); return; }
    setValidating(true);
    setFeedback({ kind: 'info', text: '⏳ Paso 1/2: enviando token al backend local...' });
    try {
      const r = await ipc.invoke('subscription:setApiToken', tok);
      if (!r?.ok) {
        setFeedback({ kind: 'error', text: `❌ ${r?.message || 'No se pudo guardar el token'} (motivo: ${r?.reason || 'desconocido'})` });
        setValidating(false);
        return;
      }
      setFeedback({ kind: 'info', text: '⏳ Paso 2/2: token guardado, validando con CRM Innovación Digital...' });
      const sub: Status = await ipc.invoke('subscription:check');
      if (sub?.allowed) {
        setFeedback({ kind: 'success', text: `✅ Suscripción activa (${sub.empresa || ''}). Entrando al sistema...` });
        setTimeout(() => {
          setShowTokenForm(false);
          setApiToken('');
          setFeedback(null);
          setStatus(sub);
        }, 1200);
      } else {
        setFeedback({ kind: 'error', text: `❌ Token guardado pero el CRM lo rechazó: ${sub?.message || sub?.reason || 'razón desconocida'}` });
      }
    } catch (e: any) {
      setFeedback({ kind: 'error', text: `❌ Error: ${String(e?.message || e)}` });
    }
    setValidating(false);
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #6d28d9 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff', overflow: 'hidden',
      }}>
        {/* Glow decorativo de fondo */}
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        {/* Logo + ring spinner */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 28 }}>
          {/* Anillo girando */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.12)',
            borderTopColor: '#a78bfa', borderRightColor: '#c4b5fd',
            animation: 'sg-spin 1.2s linear infinite',
          }} />
          {/* Logo central con pulse */}
          <div style={{
            position: 'absolute', inset: 14, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            boxShadow: '0 12px 40px rgba(124,58,237,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'sg-pulse 2s ease-in-out infinite',
          }}>
            <img src={appIcon} alt="Conta FT" style={{ width: 56, height: 56 }} />
          </div>
        </div>

        {/* Brand */}
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }}>
          Conta <span style={{ color: '#a78bfa' }}>FT</span>
        </div>
        <div style={{ fontSize: 11, color: '#c4b5fd', letterSpacing: 3, fontWeight: 500, marginBottom: 28 }}>
          FACTURACIÓN
        </div>

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '10px 18px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, color: '#e9d5ff',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#22d3ee',
            boxShadow: '0 0 12px #22d3ee',
            animation: 'sg-blink 1.4s ease-in-out infinite',
          }} />
          Verificando suscripción...
        </div>

        <style>{`
          @keyframes sg-spin { to { transform: rotate(360deg); } }
          @keyframes sg-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes sg-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  if (status?.allowed) return <>{children}</>;

  const reason = status?.reason || 'sin-validacion';
  const explica = REASON_TEXT[reason] || status?.message || 'No se pudo validar la suscripción.';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 520, width: '100%', boxShadow: '0 25px 80px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldAlert size={32} color="#dc2626" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Suscripción no válida</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>El sistema no puede operar sin una suscripción activa.</div>
          </div>
        </div>

        <div style={{ background: '#f9fafb', borderLeft: '4px solid #dc2626', borderRadius: 6, padding: '12px 14px', fontSize: 13, color: '#374151', marginBottom: 14 }}>
          {explica}
          {status?.message && status.message !== explica && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{status.message}</div>
          )}
        </div>

        {/* Feedback inline (visible siempre, encima del modal) */}
        {feedback && (
          <div style={{
            marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, lineHeight: 1.5,
            background: feedback.kind === 'success' ? '#f0fdf4' : feedback.kind === 'error' ? '#fef2f2' : '#eff6ff',
            color: feedback.kind === 'success' ? '#166534' : feedback.kind === 'error' ? '#991b1b' : '#1e40af',
            border: `1px solid ${feedback.kind === 'success' ? '#bbf7d0' : feedback.kind === 'error' ? '#fecaca' : '#bfdbfe'}`,
          }}>
            {feedback.text}
          </div>
        )}

        {!showOfflineForm && !showTokenForm ? (
          <>
            {(reason === 'token-vacio' || reason === 'token-invalido') && (
              <button onClick={() => setShowTokenForm(true)}
                style={{ width: '100%', height: 44, marginBottom: 10, background: 'linear-gradient(135deg, #16a34a, #059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                <Sparkles size={15} /> Configurar token de suscripción (instalación inicial)
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => check(true)} disabled={loading}
                style={{ flex: 1, height: 40, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Reintentar conexión
              </button>
              <button onClick={() => setShowOfflineForm(true)}
                style={{ flex: 1, height: 40, background: '#fff', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <KeyRound size={14} /> Ingresar código offline
              </button>
            </div>
            {reason !== 'token-vacio' && reason !== 'token-invalido' && (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: 12, fontSize: 11, color: '#1e40af', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <WifiOff size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>¿Sin internet permanente?</strong> Solicita a Innovación Digital un <em>código de activación offline</em>. Es una cadena que se pega aquí y permite operar hasta una fecha específica sin necesidad de red.
                </div>
              </div>
            )}
            {(reason === 'token-vacio' || reason === 'token-invalido') && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, fontSize: 11, color: '#166534', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>¿Cliente nuevo?</strong> Si acabas de instalar el sistema, usa el botón verde para pegar el <em>token de suscripción</em> que te entregó Innovación Digital. Una vez guardado, se valida con el CRM y entras al sistema.
                </div>
              </div>
            )}
          </>
        ) : showTokenForm ? (
          <>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>TOKEN DE SUSCRIPCIÓN</label>
            <textarea
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Pega aquí el api_token alfanumérico de 64 caracteres que entregó Innovación Digital..."
              rows={3}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>
              Este token identifica a la empresa en el CRM de Innovación Digital. Se guarda en la columna <code>tbldatosempresa.api_token</code>.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => { setShowTokenForm(false); setApiToken(''); }}
                style={{ flex: 1, height: 38, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarApiToken} disabled={validating}
                style={{ flex: 2, height: 38, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: validating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> {validating ? 'Validando...' : 'Guardar y validar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>CÓDIGO DE ACTIVACIÓN OFFLINE</label>
            <textarea
              value={offlineCode}
              onChange={(e) => setOfflineCode(e.target.value)}
              placeholder="Pega aquí el código que te entregó Innovación Digital..."
              rows={3}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => { setShowOfflineForm(false); setOfflineCode(''); }}
                style={{ flex: 1, height: 38, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarCodigoOffline} disabled={validating}
                style={{ flex: 2, height: 38, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: validating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> {validating ? 'Validando...' : 'Activar'}
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
          ¿Necesitas ayuda? Contacta a <strong>Innovación Digital</strong> · soporte
        </div>
      </div>
    </div>
  );
}
