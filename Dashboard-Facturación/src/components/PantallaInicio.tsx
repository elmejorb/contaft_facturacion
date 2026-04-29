import { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart, Wallet, Package, Receipt, FileText, Truck,
  Users, BarChart3, Plus, ArrowRight, AlertTriangle, CalendarClock, Cake,
} from 'lucide-react';
import appIcon from '../assets/icon.png';
import { useNotificaciones } from '../hooks/useNotificaciones';

interface Props {
  user?: { username?: string; nombre?: string; tipoUsuario?: any } | null;
  onNavigate?: (view: string) => void;
  esAdmin?: boolean;
  esVendedor?: boolean;
}

export function PantallaInicio({ user, onNavigate, esAdmin = true }: Props) {
  const [hora, setHora] = useState(new Date());
  const notif = useNotificaciones();

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const horaStr = hora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const fechaStr = hora.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const saludo = (() => {
    const h = hora.getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const nombre = user?.nombre || user?.username || '';

  // Partículas decorativas (memoizadas para que no se regeneren cada segundo)
  const particulas = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 3,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 8,
    opacity: 0.15 + Math.random() * 0.4,
  })), []);

  // Accesos rápidos
  const accesos = [
    { id: 'nueva-venta', label: 'Nueva Venta', desc: 'Facturar al cliente', icon: ShoppingCart, color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)', show: true },
    { id: 'caja', label: 'Caja', desc: 'Sesión y cuadre del día', icon: Wallet, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', show: true },
    { id: 'inventario', label: 'Inventario', desc: 'Productos y stock', icon: Package, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)', show: true },
    { id: 'sales', label: 'Ventas', desc: 'Historial y devoluciones', icon: Receipt, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.18)', show: true },
    { id: 'facturacion-electronica', label: 'FE DIAN', desc: 'Envíos y reportes electrónicos', icon: FileText, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.18)', show: esAdmin },
    { id: 'cuentas-cobrar', label: 'Cartera', desc: 'Cobros pendientes', icon: Users, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)', show: esAdmin },
    { id: 'informes-hub', label: 'Informes', desc: '22+ reportes', icon: BarChart3, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.18)', show: esAdmin },
    { id: 'purchases', label: 'Compras', desc: 'Pedidos a proveedores', icon: Truck, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.18)', show: esAdmin },
  ].filter(a => a.show);

  return (
    <div style={{
      position: 'relative', width: '100%', minHeight: '100%',
      background: 'linear-gradient(135deg, #1e1b4b 0%, oklch(.424 .199 265.638) 35%, oklch(.42 .26 295) 100%)',
      overflow: 'hidden',
    }}>
      {/* Mesh gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, transparent 60%)',
          filter: 'blur(80px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 60%)',
          filter: 'blur(80px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '50%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 60%)',
          filter: 'blur(80px)', borderRadius: '50%', transform: 'translate(-50%, -50%)',
        }} />

        {/* Curvas de luz (wave) */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}
          viewBox="0 0 1200 800" preserveAspectRatio="none">
          <path d="M0,500 Q300,380 600,500 T1200,500" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M0,600 Q300,510 600,600 T1200,600" stroke="white" strokeWidth="1" fill="none" />
          <path d="M0,400 Q300,300 600,400 T1200,400" stroke="white" strokeWidth="1" fill="none" />
          <path d="M0,300 Q300,210 600,300 T1200,300" stroke="white" strokeWidth="0.8" fill="none" />
        </svg>

        {/* Grid sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Partículas flotantes */}
        {particulas.map(p => (
          <div key={p.id} className="particle" style={{
            position: 'absolute', left: `${p.left}%`, top: `${p.top}%`,
            width: p.size, height: p.size, background: '#fff', borderRadius: '50%',
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px rgba(255,255,255,${p.opacity})`,
            animation: `floatY ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* Contenido */}
      <div style={{
        position: 'relative', zIndex: 10, minHeight: 'calc(100vh - 64px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px 18px 36px',
      }}>
        {/* Hero: logo + título + saludo */}
        <div className="hero-fade" style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="logo-float" style={{ display: 'inline-block', position: 'relative', marginBottom: 4 }}>
            <div style={{
              position: 'absolute', inset: -8,
              background: 'radial-gradient(circle, rgba(196, 181, 253, 0.4) 0%, transparent 70%)',
              filter: 'blur(18px)', borderRadius: '50%',
            }} />
            <img src={appIcon} alt="Conta FT" style={{
              width: 78, height: 78, objectFit: 'contain', position: 'relative',
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
            }} />
          </div>

          <h1 style={{
            fontSize: 'clamp(42px, 6vw, 60px)', fontWeight: 800, margin: '0 0 2px', letterSpacing: -2,
            background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #f0abfc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            textShadow: '0 4px 30px rgba(196, 181, 253, 0.5)',
            lineHeight: 1,
          }}>
            Conta FT
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: 5,
            margin: '4px 0 12px', textTransform: 'uppercase',
          }}>
            <span style={{ height: 1, width: 24, background: 'linear-gradient(90deg, transparent, #c4b5fd)' }} />
            Facturación · Inventario · Contabilidad
            <span style={{ height: 1, width: 24, background: 'linear-gradient(90deg, #c4b5fd, transparent)' }} />
          </div>

          {/* Saludo + reloj inline */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.92)', textAlign: 'left' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{saludo}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {nombre || 'bienvenido'} 👋
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ color: '#fff', textAlign: 'left' }}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>
                {horaStr}
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, textTransform: 'capitalize', marginTop: 2 }}>
                {fechaStr}
              </div>
            </div>
          </div>
        </div>

        {/* Banner de alertas - solo si hay algo urgente */}
        {esAdmin && notif.total > 0 && (
          <div className="cards-fade" style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            maxWidth: 980, width: '100%', marginBottom: 14,
          }}>
            {notif.vencidos > 0 && (
              <AlertChip
                icon={AlertTriangle} color="#fca5a5"
                bg="rgba(220, 38, 38, 0.18)" border="rgba(252, 165, 165, 0.4)"
                text={`${notif.vencidos} vencido${notif.vencidos > 1 ? 's' : ''}`}
                pulse
                onClick={() => onNavigate?.('lotes-vencer')}
              />
            )}
            {notif.porVencer30 > 0 && (
              <AlertChip
                icon={CalendarClock} color="#fdba74"
                bg="rgba(234, 88, 12, 0.18)" border="rgba(253, 186, 116, 0.35)"
                text={`${notif.porVencer30} por vencer`}
                onClick={() => onNavigate?.('lotes-vencer')}
              />
            )}
            {notif.stockBajo > 0 && (
              <AlertChip
                icon={Package} color="#fcd34d"
                bg="rgba(217, 119, 6, 0.18)" border="rgba(252, 211, 77, 0.35)"
                text={`${notif.stockBajo} stock bajo`}
                onClick={() => onNavigate?.('stock-bajo')}
              />
            )}
            {notif.cumpleanosHoy > 0 && (
              <AlertChip
                icon={Cake} color="#f9a8d4"
                bg="rgba(236, 72, 153, 0.18)" border="rgba(249, 168, 212, 0.35)"
                text={`${notif.cumpleanosHoy} cumpleaños hoy`}
                onClick={() => onNavigate?.('cumpleanos')}
              />
            )}
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="cards-fade" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
          maxWidth: 980, width: '100%',
        }}>
          {accesos.map((acc, i) => {
            const Icon = acc.icon;
            return (
              <button
                key={acc.id}
                onClick={() => onNavigate?.(acc.id)}
                className="acc-card"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                  textAlign: 'left' as const, color: '#fff',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  animation: `cardEnter 0.5s ${0.3 + i * 0.05}s both ease-out`,
                  display: 'flex', flexDirection: 'column', gap: 6, minHeight: 84,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: acc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${acc.color}40`,
                  }}>
                    <Icon size={20} color={acc.color} />
                  </div>
                  <ArrowRight size={14} color="rgba(255,255,255,0.4)" className="acc-arrow" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{acc.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>{acc.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        <div style={{
          marginTop: 22, fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Plus size={11} /> O usa el menú lateral para acceder a más opciones
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center',
        fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, zIndex: 10,
      }}>
        Conta FT v4.2 — Facturación Electrónica DIAN
      </div>

      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(8px); }
          50% { transform: translateY(-8px) translateX(-6px); }
          75% { transform: translateY(-20px) translateX(4px); }
        }
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade { animation: heroFade 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .cards-fade { animation: heroFade 0.7s 0.2s both cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .logo-float { animation: logoFloat 4s ease-in-out infinite; }
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .acc-card:hover {
          background: rgba(255,255,255,0.12) !important;
          border-color: rgba(255,255,255,0.25) !important;
          transform: translateY(-3px);
          box-shadow: 0 12px 30px -10px rgba(0,0,0,0.4);
        }
        .acc-card:hover .acc-arrow {
          color: #fff !important;
          transform: translateX(3px);
        }
        .acc-arrow { transition: all 0.2s; }
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 0 0 0 rgba(252, 165, 165, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(252, 165, 165, 0); }
        }
        .pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ----- Chip de alerta dentro de la pantalla de inicio -----
function AlertChip({ icon: Icon, color, bg, border, text, onClick, pulse }: {
  icon: any; color: string; bg: string; border: string; text: string;
  onClick: () => void; pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={pulse ? 'pulse-soft' : ''}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 999,
        background: bg, border: `1px solid ${border}`, backdropFilter: 'blur(8px)',
        color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)'; }}
    >
      <Icon size={13} color={color} />
      <span>{text}</span>
    </button>
  );
}
