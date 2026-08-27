import { useEffect, useState } from 'react';
import { cachedFetch, invalidarCache } from '../utils/cachedFetch';
import {
  AlertCircle, CalendarClock, PackageX, Cake, TrendingUp, TrendingDown,
  Trophy, ArrowRight, RefreshCw, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/inicio/sugerencias.php';
const LS_KEY = 'panel_sugerencias_colapsado';

// Mapea el nombre del ícono que envía el backend al componente lucide-react.
// Si el backend agrega un ícono nuevo que no está aquí, cae a Sparkles como default.
const iconos: Record<string, any> = {
  AlertCircle, CalendarClock, PackageX, Cake,
  TrendingUp, TrendingDown, Trophy, Sparkles,
};

interface Sugerencia {
  id: string;
  categoria: string;
  nivel: 'urgente' | 'alerta' | 'info';
  icono: string;
  titulo: string;
  mensaje: string;
  dato: string | null;
  accion: { label: string; destino: string; filtros?: any } | null;
}

interface Props {
  onNavigate?: (view: string) => void;
}

// Estilos por nivel — colores glassmorphism consistentes con el hero morado
const estilosNivel: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  urgente: {
    color: '#fca5a5',
    bg: 'rgba(220, 38, 38, 0.14)',
    border: 'rgba(252, 165, 165, 0.35)',
    badge: '#dc2626',
  },
  alerta: {
    color: '#fdba74',
    bg: 'rgba(234, 88, 12, 0.14)',
    border: 'rgba(253, 186, 116, 0.35)',
    badge: '#ea580c',
  },
  info: {
    color: '#c4b5fd',
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(196, 181, 253, 0.30)',
    badge: '#8b5cf6',
  },
};

export function PanelSugerencias({ onNavigate }: Props) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [colapsado, setColapsado] = useState(() => localStorage.getItem(LS_KEY) === '1');

  const cargar = async (esRefresh = false) => {
    if (esRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Cache 60s: al re-montar PantallaInicio no golpea el backend.
      // El botón de refrescar fuerza fresh (invalidar + fetch).
      if (esRefresh) invalidarCache(API);
      const d = await cachedFetch<{ success: boolean; sugerencias?: Sugerencia[] }>(API, { ttlMs: 60_000 });
      if (d.success) setSugerencias(d.sugerencias || []);
      else setSugerencias([]);
    } catch { setSugerencias([]); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { cargar(false); }, []);

  const toggleColapso = () => {
    const nuevo = !colapsado;
    setColapsado(nuevo);
    localStorage.setItem(LS_KEY, nuevo ? '1' : '0');
  };

  // Navegación: si el destino empieza con "whatsapp:" abrir link externo;
  // si con "cliente:" ir al detalle del cliente; si no, navegación normal.
  // Guardar filtros pendientes en localStorage para que el módulo destino los aplique.
  const irA = (destino: string, filtros?: any) => {
    if (destino.startsWith('whatsapp:')) {
      const numero = destino.slice(9);
      const limpio = numero.replace(/[^0-9]/g, '');
      const conCodigo = limpio.length === 10 ? '57' + limpio : limpio;
      window.open(`https://wa.me/${conCodigo}`, '_blank');
      return;
    }
    if (destino.startsWith('cliente:')) {
      onNavigate?.('clients');
      return;
    }
    if (filtros) {
      localStorage.setItem(`filtros_pendientes:${destino}`, JSON.stringify(filtros));
    }
    onNavigate?.(destino);
  };

  // No mostrar el panel si no hay ninguna sugerencia (no forzar ruido visual)
  if (!loading && sugerencias.length === 0) return null;

  const urgentes = sugerencias.filter(s => s.nivel === 'urgente').length;
  const alertas = sugerencias.filter(s => s.nivel === 'alerta').length;

  return (
    <div className="cards-fade" style={{ maxWidth: 980, width: '100%', marginBottom: 14 }}>
      {/* Header del panel — glassmorphism, mismo estilo que las cards */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#fff',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(196, 181, 253, 0.3), rgba(236, 72, 153, 0.3))',
          border: '1px solid rgba(196, 181, 253, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={16} color="#f0abfc" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>Sugerencias del día</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {loading ? 'Analizando datos…' : (
              urgentes > 0 || alertas > 0
                ? `${urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? 's' : ''}` : ''}${urgentes > 0 && alertas > 0 ? ' · ' : ''}${alertas > 0 ? `${alertas} alerta${alertas > 1 ? 's' : ''}` : ''} · ${sugerencias.length} en total`
                : `${sugerencias.length} sugerencia${sugerencias.length !== 1 ? 's' : ''} activa${sugerencias.length !== 1 ? 's' : ''}`
            )}
          </div>
        </div>
        <button onClick={() => cargar(true)} disabled={refreshing}
          title="Refrescar"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', cursor: refreshing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <RefreshCw size={13} className={refreshing ? 'sug-spin' : ''} />
        </button>
        <button onClick={toggleColapso}
          title={colapsado ? 'Mostrar sugerencias' : 'Ocultar'}
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {colapsado ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Grid de cards — se oculta cuando colapsado o loading */}
      {!colapsado && (
        loading ? (
          // Skeleton mientras carga
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10,
          }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="sug-skel" style={{
                height: 92, borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(14px)',
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10,
          }}>
            {sugerencias.map((s, i) => {
              const Icon = iconos[s.icono] || Sparkles;
              const est = estilosNivel[s.nivel] || estilosNivel.info;
              return (
                <div key={s.id}
                  onClick={() => s.accion && irA(s.accion.destino, s.accion.filtros)}
                  className="sug-card"
                  style={{
                    background: est.bg,
                    backdropFilter: 'blur(14px)',
                    border: `1px solid ${est.border}`,
                    borderRadius: 12,
                    padding: '10px 12px',
                    cursor: s.accion ? 'pointer' : 'default',
                    color: '#fff',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    minHeight: 92,
                    animation: `cardEnter 0.5s ${0.05 * i}s both ease-out`,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                  {/* Header del card: ícono + badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `${est.badge}30`,
                      border: `1px solid ${est.color}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={15} color={est.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: est.color, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.1 }}>
                        {s.titulo}
                      </div>
                    </div>
                    {s.accion && (
                      <ArrowRight size={12} color="rgba(255,255,255,0.4)" className="sug-arrow" />
                    )}
                  </div>

                  {/* Mensaje principal */}
                  <div style={{ fontSize: 12, lineHeight: 1.3, color: 'rgba(255,255,255,0.90)' }}>
                    {s.mensaje}
                  </div>

                  {/* Dato destacado + acción */}
                  {(s.dato || s.accion) && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 'auto', paddingTop: 4,
                      borderTop: `1px solid ${est.border}`,
                      gap: 6,
                    }}>
                      {s.dato && (
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: est.color,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {s.dato}
                        </span>
                      )}
                      {s.accion && !s.dato && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                          {s.accion.label} →
                        </span>
                      )}
                      {s.accion && s.dato && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                          {s.accion.label} →
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      <style>{`
        .sug-card:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.10) !important;
        }
        .sug-card:hover .sug-arrow {
          transform: translateX(3px);
          color: rgba(255,255,255,0.7) !important;
        }
        .sug-arrow { transition: all 0.2s; }
        .sug-spin { animation: sug-spin 0.8s linear infinite; }
        @keyframes sug-spin {
          from { transform: rotate(0); }
          to { transform: rotate(360deg); }
        }
        .sug-skel {
          animation: sug-pulse 1.4s ease-in-out infinite;
        }
        @keyframes sug-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
