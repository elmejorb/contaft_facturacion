import { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle, CalendarClock, PackageX, Cake, TrendingUp, TrendingDown,
  Trophy, ArrowRight, X, Sparkles,
} from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/inicio/sugerencias.php';
const LS_VISTAS = 'sugerencias_vistas';       // { id: 'YYYY-MM-DD' } — ids que ya se mostraron hoy como notif
const LS_APLAZADAS = 'sugerencias_aplazadas'; // { id: timestamp } — cerradas sin abrir, se pueden volver a mostrar en X horas
const CHECK_INTERVAL_MS = 60_000;              // cada 60s revisa si hay algo nuevo por mostrar
const APLAZO_MS = 4 * 60 * 60_000;             // 4 horas — si el usuario cierra sin ver, vuelve tras ese tiempo
const DEMORA_INICIAL_MS = 8_000;                // 8s desde que abre la app hasta la primera notif

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
  esAdmin?: boolean;
}

// Colores por nivel — matching el hero morado del inicio
const paletaNivel: Record<string, { primario: string; sec: string; bg: string; border: string; shadow: string }> = {
  urgente: {
    primario: '#fca5a5',
    sec: '#dc2626',
    bg: 'linear-gradient(135deg, rgba(220,38,38,0.28), rgba(15,15,30,0.94))',
    border: 'rgba(252,165,165,0.5)',
    shadow: '0 20px 50px rgba(220,38,38,0.35)',
  },
  alerta: {
    primario: '#fdba74',
    sec: '#ea580c',
    bg: 'linear-gradient(135deg, rgba(234,88,12,0.24), rgba(15,15,30,0.94))',
    border: 'rgba(253,186,116,0.5)',
    shadow: '0 20px 50px rgba(234,88,12,0.28)',
  },
  info: {
    primario: '#c4b5fd',
    sec: '#8b5cf6',
    bg: 'linear-gradient(135deg, rgba(139,92,246,0.28), rgba(15,15,30,0.94))',
    border: 'rgba(196,181,253,0.45)',
    shadow: '0 20px 50px rgba(139,92,246,0.28)',
  },
};

// Helpers de localStorage para memoria persistente entre sesiones
function getVistas(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_VISTAS) || '{}'); } catch { return {}; }
}
function marcarVista(id: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  const v = getVistas();
  v[id] = hoy;
  localStorage.setItem(LS_VISTAS, JSON.stringify(v));
}
function limpiarVistasViejas() {
  // Ejecutado al montar: elimina entradas de días previos para no crecer indefinidamente
  const hoy = new Date().toISOString().slice(0, 10);
  const v = getVistas();
  const limpias: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === hoy) limpias[k] = val;
  }
  localStorage.setItem(LS_VISTAS, JSON.stringify(limpias));
}
function getAplazadas(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LS_APLAZADAS) || '{}'); } catch { return {}; }
}
function aplazar(id: string) {
  const a = getAplazadas();
  a[id] = Date.now();
  localStorage.setItem(LS_APLAZADAS, JSON.stringify(a));
}

/**
 * Componente que muestra notificaciones emergentes de sugerencias del día.
 * Se monta una sola vez en Dashboard y funciona en cualquier vista.
 *
 * Comportamiento:
 * - Al abrir la app, después de 8s: si hay ≥1 sugerencia urgente/alerta no vista hoy,
 *   muestra la MÁS URGENTE con animación de entrada tipo slide+bounce.
 * - Cada 60s revisa si hay más sugerencias por mostrar. Si sí, muestra la siguiente
 *   con un retraso aleatorio de 8-25 minutos (parece que la app "descubrió" algo).
 * - Usuario ve la notif → puede hacer click en "Ver ahora" (navega + marca vista)
 *   o "X" (cierra + aplaza 4h). Auto-cierre después de 15s si no hay interacción.
 * - Máximo 4 notif al día para no saturar.
 * - LocalStorage recuerda cuáles se mostraron hoy — al recargar la app no repite.
 */
export function NotificacionEmergente({ onNavigate, esAdmin = true }: Props) {
  const [actual, setActual] = useState<Sugerencia | null>(null);
  const [cola, setCola] = useState<Sugerencia[]>([]);
  const [visible, setVisible] = useState(false);

  // Cerrar notif actual (aplaza para volver a intentar en 4h)
  const cerrar = useCallback((aplazarNotif = true) => {
    if (actual && aplazarNotif) aplazar(actual.id);
    setVisible(false);
    setTimeout(() => setActual(null), 350);
  }, [actual]);

  // Aceptar y navegar al destino con filtros
  const abrirAccion = useCallback(() => {
    if (!actual?.accion) return;
    const { destino, filtros } = actual.accion;
    if (filtros) {
      // Guardar filtros pendientes bajo la clave del destino, el módulo destino los lee al montar
      localStorage.setItem(`filtros_pendientes:${destino}`, JSON.stringify(filtros));
    }
    marcarVista(actual.id);
    setVisible(false);
    setTimeout(() => {
      setActual(null);
      onNavigate?.(destino);
    }, 250);
  }, [actual, onNavigate]);

  // Cargar sugerencias iniciales del backend
  const cargarSugerencias = useCallback(async () => {
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (!d.success) return;
      const vistas = getVistas();
      const hoy = new Date().toISOString().slice(0, 10);
      const aplazadas = getAplazadas();
      const ahora = Date.now();
      // Filtrar: quitar las que ya se mostraron hoy, y las aplazadas dentro de las últimas 4h
      const filtradas: Sugerencia[] = (d.sugerencias || []).filter((s: Sugerencia) => {
        if (vistas[s.id] === hoy) return false;
        if (aplazadas[s.id] && ahora - aplazadas[s.id] < APLAZO_MS) return false;
        return true;
      });
      // Ordenar por importancia: urgente → alerta → info
      const orden: Record<string, number> = { urgente: 0, alerta: 1, info: 2 };
      filtradas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
      // Máximo 4 por día
      setCola(filtradas.slice(0, 4));
    } catch { /* silencio */ }
  }, []);

  // Al montar: limpiar vistas viejas + cargar sugerencias
  useEffect(() => {
    if (!esAdmin) return;
    limpiarVistasViejas();
    cargarSugerencias();
    // Chequeo periódico cada 60s por si hay cambios (sesiones largas)
    const intervalo = setInterval(cargarSugerencias, CHECK_INTERVAL_MS);
    return () => clearInterval(intervalo);
  }, [esAdmin, cargarSugerencias]);

  // Cuando hay cola y no hay notif activa, agendar la siguiente
  useEffect(() => {
    if (!esAdmin) return;
    if (actual !== null) return;      // ya hay una visible
    if (cola.length === 0) return;    // no hay más

    // Primera notif: 8s tras abrir la app
    // Siguientes: intervalo aleatorio de 8-25 minutos para simular "app viva"
    const yaSeMostroAlguna = Object.keys(getVistas()).some(k => getVistas()[k] === new Date().toISOString().slice(0, 10));
    const demoraMs = yaSeMostroAlguna
      ? (8 + Math.random() * 17) * 60_000  // 8-25 minutos
      : DEMORA_INICIAL_MS;                  // 8s la primera

    const timer = setTimeout(() => {
      const siguiente = cola[0];
      setActual(siguiente);
      setCola(prev => prev.slice(1));
      // Animar entrada tras un frame
      requestAnimationFrame(() => setVisible(true));
      // Auto-cerrar tras 15s si no hay interacción (marca vista para no repetir hoy)
      setTimeout(() => {
        setVisible(v => {
          if (v) { marcarVista(siguiente.id); return false; }
          return v;
        });
        setTimeout(() => setActual(null), 350);
      }, 15_000);
    }, demoraMs);

    return () => clearTimeout(timer);
  }, [cola, actual, esAdmin]);

  if (!esAdmin || !actual) return null;

  const paleta = paletaNivel[actual.nivel] || paletaNivel.info;
  const Icon = iconos[actual.icono] || Sparkles;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: visible ? 20 : -420,
      width: 380,
      maxWidth: 'calc(100vw - 40px)',
      zIndex: 100000,
      background: paleta.bg,
      backdropFilter: 'blur(24px)',
      border: `1.5px solid ${paleta.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      boxShadow: paleta.shadow,
      transition: 'right 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s',
      opacity: visible ? 1 : 0,
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* Barra pulsante lateral por urgencia */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: paleta.sec,
        animation: actual.nivel === 'urgente' ? 'notifPulse 1.4s ease-in-out infinite' : 'none',
      }} />

      {/* Header: ícono + título + cerrar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${paleta.sec}40`,
          border: `1px solid ${paleta.primario}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: 'notifIconBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <Icon size={18} color={paleta.primario} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: paleta.primario, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            <Sparkles size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
            Sugerencia inteligente
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{actual.titulo}</div>
        </div>
        <button onClick={() => cerrar(true)}
          title="Cerrar (te recuerdo más tarde)"
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
          <X size={13} />
        </button>
      </div>

      {/* Mensaje */}
      <div style={{ fontSize: 13, lineHeight: 1.4, color: 'rgba(255,255,255,0.92)', marginBottom: 10 }}>
        {actual.mensaje}
      </div>

      {/* Dato destacado */}
      {actual.dato && (
        <div style={{
          fontSize: 15, fontWeight: 700, color: paleta.primario,
          fontVariantNumeric: 'tabular-nums',
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${paleta.border}`,
          borderRadius: 8,
          marginBottom: 10,
          display: 'inline-block',
        }}>
          {actual.dato}
        </div>
      )}

      {/* Botón de acción */}
      {actual.accion && (
        <button onClick={abrirAccion}
          style={{
            width: '100%',
            height: 34,
            background: paleta.sec,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s',
            boxShadow: `0 4px 14px ${paleta.sec}60`,
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {actual.accion.label} <ArrowRight size={13} />
        </button>
      )}

      <style>{`
        @keyframes notifPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes notifIconBounce {
          0% { transform: scale(0.4) rotate(-20deg); opacity: 0; }
          70% { transform: scale(1.15) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
