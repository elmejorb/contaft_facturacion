import { useState } from 'react';
import { Package, Check, Loader2, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModulos, triggerModulosRefresh } from '../hooks/useModulos';
import toast from 'react-hot-toast';

const API = 'http://localhost:80/conta-app-backend/api/modulos/estado.php';

// Metadatos por módulo — label + icono + descripción corta mostrada en la tarjeta.
const META: Record<string, { label: string; icon: any; descLarga: string }> = {
  nomina: {
    label: 'Nómina',
    icon: Users,
    descLarga: 'Gestión de empleados, anticipos, préstamos y liquidación de nómina. Al activarlo se crean las tablas necesarias en la base de datos. Los datos se conservan incluso si se desactiva.',
  },
};

export function ConfigModulos() {
  const { user } = useAuth();
  const { modulos, loading } = useModulos();
  const [procesando, setProcesando] = useState<string | null>(null);

  const esRoot = user?.username === 'root';

  const toggleModulo = async (nombre: string, activar: boolean) => {
    if (!esRoot) { toast.error('Solo el usuario root puede activar/desactivar módulos'); return; }
    const confirmMsg = activar
      ? `¿Activar el módulo "${nombre}"? Se crearán las tablas necesarias en la base de datos.`
      : `¿Desactivar el módulo "${nombre}"? Los datos se conservan — podés reactivarlo luego.`;
    if (!confirm(confirmMsg)) return;

    setProcesando(nombre);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activar ? 'activar' : 'desactivar', modulo: nombre, usuario: user?.username || '' }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message, { duration: 5000 });
        triggerModulosRefresh();
      } else {
        toast.error(d.message || 'Error', { duration: 7000 });
      }
    } catch { toast.error('Error de red'); }
    setProcesando(null);
  };

  if (!esRoot) {
    return (
      <div style={{ padding: 30 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={20} color="#dc2626" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>Acceso restringido</div>
            <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
              Solo el usuario <b>root</b> puede activar o desactivar módulos del sistema.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Package size={22} color="#7c3aed" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Módulos del sistema</h2>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Activa o desactiva funcionalidades opcionales del sistema. Al activar, se corren las migraciones de BD necesarias.
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Cargando módulos...</div>
      ) : modulos.length === 0 ? (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 14, color: '#92400e', fontSize: 13 }}>
          No se encontraron módulos opcionales. Verifica que corriste <b>actualizacion_completa.sql</b> para que exista la tabla <code>tbl_modulos_activos</code>.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {modulos.map(m => {
            const meta = META[m.Nombre] || { label: m.Nombre, icon: Package, descLarga: m.Descripcion || '' };
            const Icon = meta.icon;
            const activo = Number(m.Activo) === 1;
            const procesandoEste = procesando === m.Nombre;
            return (
              <div key={m.Nombre} style={{ background: '#fff', border: `2px solid ${activo ? '#16a34a' : '#e5e7eb'}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: activo ? '#dcfce7' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={activo ? '#16a34a' : '#6b7280'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: activo ? '#16a34a' : '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {activo ? <><Check size={11} /> ACTIVO</> : 'INACTIVO'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>
                  {meta.descLarga}
                </div>
                {m.Fecha_Activacion && (
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>
                    Activado: {new Date(m.Fecha_Activacion).toLocaleString('es-CO')}
                  </div>
                )}
                <button
                  onClick={() => toggleModulo(m.Nombre, !activo)}
                  disabled={procesandoEste}
                  style={{
                    height: 36, border: 'none', borderRadius: 8, cursor: procesandoEste ? 'wait' : 'pointer',
                    background: activo ? '#fef2f2' : '#7c3aed',
                    color: activo ? '#dc2626' : '#fff',
                    fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    border: activo ? '1px solid #fecaca' : 'none',
                  }}
                >
                  {procesandoEste ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : (activo ? 'Desactivar' : 'Activar módulo')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
