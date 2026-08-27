import { useEffect, useState } from 'react';
import { Database, Download, RefreshCw, Trash2, HardDrive, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';

const API = 'http://localhost:80/conta-app-backend/api/backup/';

interface BackupFile {
  nombre: string;
  ruta: string;
  tamano: number;
  fecha: string;
}
interface EstadoBackup {
  directorio: string;
  archivos: BackupFile[];
  total: number;
  backup_hoy: BackupFile | null;
  tiene_hoy: boolean;
  base_datos: string;
}

const fmtSize = (b: number): string => {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
};
const fmtDate = (s: string): string => new Date(s).toLocaleString('es-CO');

export function BackupBD() {
  const [estado, setEstado] = useState<EstadoBackup | null>(null);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?estado`);
      const d = await r.json();
      if (d.success) setEstado(d);
      else toast.error(d.message || 'Error consultando estado');
    } catch { toast.error('Error de conexión con backend'); }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const generar = async (forzar = false) => {
    if (generando) return;
    setGenerando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generar', forzar }),
      });
      const d = await r.json();
      if (d.success) {
        if (d.ya_existe) toast('Ya hay un respaldo de hoy — descárguelo o fuerce uno nuevo', { icon: 'ℹ️' });
        else toast.success(d.message);
        cargar();
      } else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
    setGenerando(false);
  };

  const eliminar = async (b: BackupFile) => {
    const ok = await confirmar({
      title: 'Eliminar respaldo',
      message: `¿Eliminar el respaldo ${b.nombre}?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', nombre: b.nombre }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error de conexión'); }
  };

  const abrirCarpeta = () => {
    if (!estado?.directorio) return;
    // Electron: usar shell.openPath vía preload si está expuesto
    const anyWin = window as any;
    if (anyWin.electronAPI?.openPath) {
      anyWin.electronAPI.openPath(estado.directorio);
    } else {
      toast('La carpeta está en: ' + estado.directorio, { duration: 6000 });
    }
  };

  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 14 };
  const th: React.CSSProperties = { padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #e5e7eb' };
  const td: React.CSSProperties = { padding: '10px', fontSize: 12, color: '#374151' };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Database size={22} color="#7c3aed" />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Respaldo de la Base de Datos</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            Copia de seguridad diaria de toda la información del negocio
          </p>
        </div>
      </div>

      {/* Estado hoy */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>
            <Loader2 size={22} className="animate-spin" /> Cargando…
          </div>
        ) : !estado ? (
          <div style={{ color: '#dc2626' }}>No se pudo consultar el estado</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              {estado.tiene_hoy ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#dcfce7', borderRadius: 10, border: '1px solid #86efac' }}>
                  <CheckCircle2 size={22} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Respaldo de hoy listo</div>
                    <div style={{ fontSize: 11, color: '#166534' }}>
                      {estado.backup_hoy && `${fmtDate(estado.backup_hoy.fecha)} · ${fmtSize(estado.backup_hoy.tamano)}`}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fcd34d' }}>
                  <AlertTriangle size={22} color="#b45309" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Sin respaldo de hoy</div>
                    <div style={{ fontSize: 11, color: '#92400e' }}>Genere un respaldo antes de cerrar el negocio</div>
                  </div>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={() => generar(true)} disabled={generando}
                style={{ height: 40, padding: '0 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: generando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: generando ? 0.6 : 1 }}>
                {generando ? <><Loader2 size={15} className="animate-spin" /> Respaldando…</> : <><Download size={15} /> Respaldar Ahora</>}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4 }}>
              <Info titulo="Base de datos" valor={estado.base_datos} />
              <Info titulo="Ubicación" valor={estado.directorio} accion={abrirCarpeta} />
              <Info titulo="Respaldos guardados" valor={String(estado.total)} />
            </div>
          </>
        )}
      </div>

      {/* Historial */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <HardDrive size={16} /> Historial de respaldos
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>· últimos 30 días</span>
          </div>
          <button onClick={cargar}
            style={{ height: 28, padding: '0 10px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Actualizar
          </button>
        </div>

        {estado?.archivos.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 30, fontSize: 12 }}>
            Aún no hay respaldos generados
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={th}>Archivo</th>
                <th style={th}>Fecha</th>
                <th style={{ ...th, textAlign: 'right' }}>Tamaño</th>
                <th style={{ ...th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {estado?.archivos.map(a => (
                <tr key={a.nombre} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#7c3aed' }}>{a.nombre}</td>
                  <td style={td}>{fmtDate(a.fecha)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtSize(a.tamano)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button onClick={() => eliminar(a)} title="Eliminar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#6b7280', padding: '0 4px', lineHeight: 1.5 }}>
        <b>¿Cómo restaurar?</b> Los respaldos se guardan como archivos <code>.sql</code>.
        Para restaurar uno, entre a phpMyAdmin (o consola MySQL), cree la base de datos y
        ejecute: <code>mysql -uroot -p nombre_bd &lt; archivo.sql</code>.
      </div>
    </div>
  );
}

function Info({ titulo, valor, accion }: { titulo: string; valor: string; accion?: () => void }) {
  return (
    <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 2, wordBreak: 'break-all', cursor: accion ? 'pointer' : 'default' }}
           onClick={accion}
           title={accion ? 'Clic para abrir' : ''}>
        {valor}
      </div>
    </div>
  );
}
