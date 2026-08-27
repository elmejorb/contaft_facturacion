import { useEffect, useState } from 'react';
import { Database, Play, ShieldCheck, Wrench, Zap, Loader2, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/mantenimiento/ejecutar-sql.php';

interface Script {
  id: string;
  titulo: string;
  descripcion: string;
  archivo: string;
  existe: boolean;
}

interface Resultado {
  script: string;
  titulo: string;
  duracion_seg: number;
  statements_ok: number;
  statements_fallidos: number;
  errores?: { sqlstate: string; error: string }[];
  reportes?: Array<Array<Record<string, any>>>;
}

// Icono y color por tipo de script
const iconoDe = (id: string) => {
  if (id === 'auditar_bd')            return { Ic: ShieldCheck, color: '#2563eb', bg: '#dbeafe' };
  if (id === 'actualizacion_completa') return { Ic: Zap,        color: '#7c3aed', bg: '#f3e8ff' };
  if (id === 'reparar_autoincrement')  return { Ic: Wrench,     color: '#d97706', bg: '#fef3c7' };
  if (id === 'optimizar_indices')      return { Ic: Database,   color: '#16a34a', bg: '#dcfce7' };
  return { Ic: Play, color: '#6b7280', bg: '#f3f4f6' };
};

export function MantenimientoBD() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?listar=1`);
      const d = await r.json();
      if (d.success) setScripts(d.scripts || []);
      else toast.error(d.message || 'Error listando scripts');
    } catch { toast.error('Error de conexión'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const ejecutar = async (s: Script) => {
    const soloLectura = s.id === 'auditar_bd';
    if (!soloLectura) {
      const ok = await confirmar({
        title: s.titulo,
        message: `${s.descripcion}\n\n¿Ejecutar ahora?`,
        type: 'warning',
        confirmText: 'Sí, ejecutar',
      });
      if (!ok) return;
    }
    setEjecutando(s.id);
    setResultado(null);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: s.id }),
      });
      const d = await r.json();
      if (d.success) {
        setResultado(d);
        toast.success(`${s.titulo} — ${d.statements_ok} statements en ${d.duracion_seg}s`);
      } else {
        toast.error(d.message || 'Error');
      }
    } catch { toast.error('Error de conexión'); }
    setEjecutando(null);
  };

  const ejecutarTodo = async () => {
    const ok = await confirmar({
      title: 'Migración Completa',
      message: 'Va a ejecutar en orden:\n1) Actualización completa (esquema)\n2) Reparar PKs y AUTO_INCREMENT\n3) Crear índices de performance\n4) Auditoría final\n\n¿Continuar? Puede tomar 1-3 minutos.',
      type: 'warning',
      confirmText: 'Sí, migrar todo',
    });
    if (!ok) return;
    const orden = ['actualizacion_completa', 'reparar_autoincrement', 'optimizar_indices', 'auditar_bd'];
    for (const id of orden) {
      const s = scripts.find(x => x.id === id);
      if (!s) continue;
      setEjecutando(s.id);
      setResultado(null);
      try {
        const r = await fetch(API, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: s.id }),
        });
        const d = await r.json();
        if (d.success) setResultado(d);
      } catch { toast.error(`Error en ${s.titulo}`); break; }
    }
    setEjecutando(null);
    toast.success('Migración completa terminada');
  };

  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Database size={22} color="#7c3aed" />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Mantenimiento de Base de Datos</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            Auditar y reparar la BD del cliente — útil al migrar sistemas viejos
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={ejecutarTodo} disabled={ejecutando !== null || loading}
          style={{ height: 36, padding: '0 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: ejecutando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: ejecutando ? 0.5 : 1 }}>
          <Play size={14} /> Migración Completa
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <Loader2 size={22} className="animate-spin" /> Cargando...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          {scripts.map(s => {
            const { Ic, color, bg } = iconoDe(s.id);
            const activo = ejecutando === s.id;
            return (
              <div key={s.id} style={{ ...card, borderTop: `3px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic size={18} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{s.titulo}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.archivo}</div>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 10px', lineHeight: 1.4 }}>
                  {s.descripcion}
                </p>
                <button onClick={() => ejecutar(s)} disabled={ejecutando !== null || !s.existe}
                  style={{ width: '100%', height: 32, background: activo ? '#e5e7eb' : color, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: ejecutando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !s.existe ? 0.4 : 1 }}>
                  {activo ? <><Loader2 size={13} className="animate-spin" /> Ejecutando...</>
                   : !s.existe ? 'Script no encontrado'
                   : <><Play size={13} /> Ejecutar</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Resultado del último script ejecutado */}
      {resultado && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
            <ClipboardList size={18} color="#7c3aed" />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Resultado: {resultado.titulo}</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#6b7280' }}>
              <span>{resultado.duracion_seg}s</span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {resultado.statements_ok}
              </span>
              {resultado.statements_fallidos > 0 && (
                <span style={{ color: '#dc2626', fontWeight: 700 }}>
                  <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {resultado.statements_fallidos}
                </span>
              )}
            </div>
          </div>

          {/* Errores primero (si hay) */}
          {resultado.errores && resultado.errores.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Errores:</div>
              {resultado.errores.map((e, i) => (
                <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#7f1d1d', marginBottom: 4 }}>
                  [{e.sqlstate}] {e.error}
                </div>
              ))}
            </div>
          )}

          {/* Reportes (resultsets de SELECTs) */}
          {resultado.reportes && resultado.reportes.length > 0 && (
            <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11, maxHeight: 400, overflowY: 'auto' }}>
              {resultado.reportes.map((r, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  {r.map((fila, j) => {
                    const vals = Object.values(fila).map(v => v == null ? '' : String(v));
                    return (
                      <div key={j} style={{ whiteSpace: 'pre-wrap' }}>{vals.join('   ')}</div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {resultado.statements_fallidos === 0 && (!resultado.reportes || resultado.reportes.length === 0) && (
            <div style={{ color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
              <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Ejecutado sin errores. No hay reporte que mostrar.
            </div>
          )}
        </div>
      )}

      <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, fontSize: 11, color: '#78350f', lineHeight: 1.5 }}>
        <b>⚠ Recomendación:</b> antes de correr los scripts destructivos (Reparar / Actualización Completa),
        genere un respaldo de la BD desde <b>Configuración → Respaldo de la Base de Datos</b>. Los scripts son
        idempotentes (se pueden correr varias veces sin daño) pero un respaldo evita cualquier sorpresa.
      </div>
    </div>
  );
}
