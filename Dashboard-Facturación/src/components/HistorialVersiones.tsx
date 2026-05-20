import { useState, useEffect } from 'react';
import { X, History, RefreshCw } from 'lucide-react';
import pkg from '../../package.json';

const API = 'http://localhost:80/conta-app-backend/api/version/changelog.php';
const APP_VERSION = pkg.version;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Renderizado básico de Markdown sin dependencias externas.
 * Soporta: # ## ###, **bold**, listas con -, separadores ---, párrafos.
 * Suficiente para nuestro CHANGELOG.
 */
function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const out: JSX.Element[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`} style={{ margin: '6px 0 14px 22px', padding: 0 }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ marginBottom: 4, fontSize: 13, lineHeight: 1.55, color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:11px;font-family:monospace">$1</code>') }} />
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('- ')) {
      listBuffer.push(line.substring(2));
      continue;
    }
    flushList();

    if (line.startsWith('## ')) {
      const txt = line.substring(3);
      const esVersion = /^\d+\.\d+/.test(txt);
      out.push(
        <div key={key++} style={{
          marginTop: 24, marginBottom: 10,
          paddingBottom: 6,
          borderBottom: esVersion ? '2px solid #7c3aed' : '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: esVersion ? 18 : 16, fontWeight: 800, color: esVersion ? '#7c3aed' : '#111827', margin: 0 }}>
            {esVersion ? `📦 ${txt}` : txt}
          </h2>
        </div>
      );
    } else if (line.startsWith('### ')) {
      out.push(
        <h3 key={key++} style={{ fontSize: 13, fontWeight: 700, color: '#4b5563', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {line.substring(4)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      out.push(
        <h1 key={key++} style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
          {line.substring(2)}
        </h1>
      );
    } else if (line === '---') {
      // Separador silencioso (los headers ya tienen su borde)
      continue;
    } else if (line.length > 0) {
      out.push(
        <p key={key++} style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: '4px 0' }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:11px;font-family:monospace">$1</code>') }} />
      );
    }
  }
  flushList();
  return out;
}

export function HistorialVersiones({ open, onClose }: Props) {
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setMd(d.markdown);
      else setError(d.message || 'No se pudo cargar el changelog');
    } catch (e: any) {
      setError(e?.message || 'Error de red');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) cargar();
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #6d28d9 100%)',
          color: '#fff',
          borderRadius: '12px 12px 0 0',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Historial de versiones</div>
            <div style={{ fontSize: 11, color: '#c4b5fd', marginTop: 2 }}>
              Versión actual instalada: <strong style={{ color: '#fff' }}>v{APP_VERSION}</strong>
            </div>
          </div>
          <button onClick={cargar} disabled={loading} title="Recargar"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 20px' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Cargando historial...
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
              <strong>No se pudo cargar:</strong> {error}
              <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 6 }}>
                Verifica que el backend esté corriendo y que existe el archivo <code>conta-app-backend/CHANGELOG.md</code>.
              </div>
            </div>
          )}
          {!loading && !error && md && (
            <div>{renderMarkdown(md)}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', background: '#f9fafb', borderRadius: '0 0 12px 12px', textAlign: 'center' }}>
          Documento informativo para administradores · No visible para usuarios cajeros
        </div>
      </div>
    </div>
  );
}
