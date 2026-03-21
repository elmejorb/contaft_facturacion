import { useState, useEffect } from 'react';
import { Cake, Phone, Mail, Gift, Search } from 'lucide-react';

const API = 'http://localhost:80/conta-app-backend/api/clientes/cumpleanos.php';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function CumpleanosClientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [cumpleHoy, setCumpleHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async (m: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}?mes=${m}`);
      const d = await r.json();
      if (d.success) {
        setClientes(d.clientes);
        setCumpleHoy(d.cumple_hoy);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { cargar(mes); }, [mes]);

  const filtrados = clientes.filter(c =>
    !busqueda || c.Razon_Social?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const hoyDia = new Date().getDate();
  const hoyMes = new Date().getMonth() + 1;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Cumpleaños de Clientes</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Clientes que cumplen años este mes</p>
      </div>

      {/* Cumple hoy */}
      {cumpleHoy.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b',
          borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{ fontSize: 36 }}>🎂</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#92400e' }}>¡Cumpleaños hoy!</div>
            {cumpleHoy.map((c: any) => (
              <div key={c.CodigoClien} style={{ fontSize: 13, color: '#78350f', marginTop: 2 }}>
                <strong>{c.Razon_Social}</strong>
                {c.Telefonos && c.Telefonos !== '0' && c.Telefonos !== '-' && ` — Tel: ${c.Telefonos}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Buscar cliente..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', height: 32, paddingLeft: 32, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {meses.map((m, i) => (
            <button
              key={i}
              onClick={() => setMes(i + 1)}
              style={{
                height: 28, padding: '0 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                border: mes === i + 1 ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                background: mes === i + 1 ? '#f3e8ff' : '#fff',
                color: mes === i + 1 ? '#7c3aed' : '#374151',
                fontWeight: mes === i + 1 ? 600 : 400,
              }}
            >
              {m.substring(0, 3)}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>{filtrados.length} cliente(s)</span>
      </div>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Cake size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>Sin cumpleaños en {meses[mes - 1]}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Registra las fechas de cumpleaños en el formulario de clientes</div>
          </div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
            {filtrados.map((c: any) => {
              const dia = parseInt(c.Dia || new Date(c.FechaCumple).getDate());
              const esHoy = dia === hoyDia && mes === hoyMes;
              const yaPaso = mes === hoyMes && dia < hoyDia;
              const anioNac = new Date(c.FechaCumple).getFullYear();
              const edad = new Date().getFullYear() - anioNac;

              return (
                <div
                  key={c.CodigoClien}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    background: esHoy ? '#fefce8' : 'transparent',
                    opacity: yaPaso ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: esHoy ? '#fde68a' : '#f3e8ff', fontSize: 20, flexShrink: 0
                  }}>
                    {esHoy ? '🎂' : '🎁'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                      {c.Razon_Social}
                      {esHoy && <span style={{ marginLeft: 8, fontSize: 11, color: '#d97706', fontWeight: 700 }}>¡HOY!</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 12, marginTop: 2 }}>
                      <span><Cake size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />{dia} de {meses[mes - 1]}</span>
                      {anioNac > 1900 && <span>{edad} años</span>}
                      {c.Telefonos && c.Telefonos !== '0' && c.Telefonos !== '-' && (
                        <span><Phone size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />{c.Telefonos}</span>
                      )}
                      {c.Whatsapp && c.Whatsapp !== '0' && c.Whatsapp !== '-' && (
                        <span>WhatsApp: {c.Whatsapp}</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f9fafb', fontSize: 16, fontWeight: 700, color: '#7c3aed'
                  }}>
                    {dia}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Exportar hook para usar en notificaciones del dashboard
export function useCumpleanosHoy() {
  const [cumpleHoy, setCumpleHoy] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}?rango=7`)
      .then(r => r.json())
      .then(d => { if (d.success) setCumpleHoy(d.clientes); })
      .catch(() => {});
  }, []);

  return cumpleHoy;
}
