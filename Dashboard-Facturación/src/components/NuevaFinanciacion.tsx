import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Calculator, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API = 'http://localhost:80/conta-app-backend/api/financiaciones/';
const API_CLIENTES = 'http://localhost:80/conta-app-backend/api/clientes/buscar.php';

const fmt = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');
const soloNum = (e: React.KeyboardEvent) => {
  const ok = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight'];
  if (!ok.includes(e.key) && !e.ctrlKey) e.preventDefault();
};

interface Cuota {
  numero: number;
  fecha: string;   // YYYY-MM-DD
  valor: number;
}

interface Props {
  onCreada?: (id: number) => void;
  onCancelar?: () => void;
}

export function NuevaFinanciacion({ onCreada, onCancelar }: Props) {
  const { user } = useAuth();
  const [cliente, setCliente] = useState<{ id: number; nombre: string; nit: string } | null>(null);
  const [busqCliente, setBusqCliente] = useState('');
  const [clientesResults, setClientesResults] = useState<any[]>([]);
  const [showClientesDrop, setShowClientesDrop] = useState(false);

  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [montoFinanciar, setMontoFinanciar] = useState(0);
  const [numCuotas, setNumCuotas] = useState(3);
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState('');
  const [frecuenciaDias, setFrecuenciaDias] = useState(30);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Buscar cliente
  useEffect(() => {
    if (busqCliente.length < 2) { setClientesResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_CLIENTES}?q=${encodeURIComponent(busqCliente)}`);
        const d = await r.json();
        if (d.success) setClientesResults(d.clientes || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [busqCliente]);

  // Generar cronograma automático
  const generarCronograma = () => {
    if (montoFinanciar <= 0) { toast.error('Ingrese el monto a financiar'); return; }
    if (numCuotas < 1) { toast.error('Debe haber al menos 1 cuota'); return; }
    if (!fechaPrimeraCuota) { toast.error('Ingrese la fecha de la primera cuota'); return; }

    // Cuota base redondeada a 100 pesos hacia arriba; el residuo va en la última
    const cuotaBase = Math.ceil((montoFinanciar / numCuotas) / 100) * 100;
    const totalPrimeras = cuotaBase * (numCuotas - 1);
    const ultimaCuota = montoFinanciar - totalPrimeras;

    const inicio = new Date(fechaPrimeraCuota + 'T12:00:00'); // evita issues de zona horaria
    const nuevas: Cuota[] = [];
    for (let i = 0; i < numCuotas; i++) {
      const fechaCuota = new Date(inicio);
      fechaCuota.setDate(inicio.getDate() + i * frecuenciaDias);
      nuevas.push({
        numero: i + 1,
        fecha: fechaCuota.toISOString().slice(0, 10),
        valor: i === numCuotas - 1 ? ultimaCuota : cuotaBase,
      });
    }
    setCuotas(nuevas);
    toast.success('Cronograma generado — puedes ajustar valores o fechas manualmente');
  };

  const actualizarCuota = (i: number, field: 'fecha' | 'valor', val: string | number) => {
    setCuotas(prev => prev.map((c, ix) => ix === i ? { ...c, [field]: val } : c));
  };
  const eliminarCuota = (i: number) => {
    setCuotas(prev => prev.filter((_, ix) => ix !== i).map((c, ix) => ({ ...c, numero: ix + 1 })));
  };
  const agregarCuota = () => {
    const last = cuotas[cuotas.length - 1];
    const nueva: Cuota = {
      numero: cuotas.length + 1,
      fecha: last ? new Date(new Date(last.fecha).getTime() + frecuenciaDias * 86400000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      valor: 0,
    };
    setCuotas(prev => [...prev, nueva]);
  };

  const sumaCuotas = cuotas.reduce((s, c) => s + Number(c.valor || 0), 0);
  const diferencia = sumaCuotas - montoFinanciar;

  const guardar = async () => {
    if (!cliente) { toast.error('Seleccione un cliente'); return; }
    if (cuotas.length === 0) { toast.error('Genere el cronograma primero'); return; }
    if (Math.abs(diferencia) > 1) {
      toast.error(`La suma de cuotas (${fmt(sumaCuotas)}) no cuadra con el monto (${fmt(montoFinanciar)}). Diferencia: ${fmt(diferencia)}`);
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear',
          codigo: cliente.id,
          fecha,
          descripcion,
          monto_total: montoFinanciar,
          monto_financiado: montoFinanciar,
          frecuencia_dias: frecuenciaDias,
          id_usuario: user?.id || null,
          cuotas: cuotas.map(c => ({ numero: c.numero, fecha: c.fecha, valor: Number(c.valor) })),
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Financiación ${d.consecutivo} creada`);
        onCreada?.(d.id_financiacion);
      } else toast.error(d.message || 'Error');
    } catch (e) { toast.error('Error de conexión'); }
    setGuardando(false);
  };

  const s = {
    label: { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.3, marginBottom: 3, display: 'block' },
    input: { width: '100%', height: 30, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' as const, outline: 'none' },
    card: { background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 12 },
    th: { textAlign: 'left' as const, padding: '6px 8px', fontSize: 10, color: '#6b7280', background: '#f9fafb', fontWeight: 700, textTransform: 'uppercase' as const },
    td: { padding: '4px 6px', borderBottom: '1px solid #f3f4f6' },
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#1f2937' }}>Nueva Financiación</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Registrar contrato con cronograma de cuotas</p>
        </div>
        {onCancelar && (
          <button onClick={onCancelar}
            style={{ height: 32, padding: '0 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            <X size={13} style={{ verticalAlign: 'middle' }} /> Cancelar
          </button>
        )}
      </div>

      {/* Cliente + datos generales */}
      <div style={s.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div style={{ position: 'relative' }}>
            <label style={s.label}>Cliente</label>
            {cliente ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', background: '#f3e8ff', borderRadius: 6, border: '1px solid #d8b4fe' }}>
                <User size={14} color="#7c3aed" />
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cliente.nombre}</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>NIT {cliente.nit}</span>
                <button onClick={() => setCliente(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} color="#6b7280" /></button>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Buscar cliente por nombre o NIT..." value={busqCliente}
                  onChange={e => { setBusqCliente(e.target.value); setShowClientesDrop(true); }}
                  onFocus={() => setShowClientesDrop(true)}
                  style={s.input} />
                {showClientesDrop && clientesResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, maxHeight: 200, overflow: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {clientesResults.slice(0, 10).map((c: any) => (
                      <div key={c.CodigoClien}
                        onClick={() => { setCliente({ id: c.CodigoClien, nombre: c.Razon_Social || c.Nombre, nit: c.Nit || '' }); setBusqCliente(''); setShowClientesDrop(false); }}
                        style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseOut={e => (e.currentTarget.style.background = '')}>
                        <div style={{ fontWeight: 600 }}>{c.Razon_Social || c.Nombre}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>NIT {c.Nit}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label style={s.label}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Concepto / Moto</label>
            <input type="text" placeholder="Ej. Moto Hero NKD 125 Placa..."
              value={descripcion} onChange={e => setDescripcion(e.target.value)} style={s.input} />
          </div>
        </div>

        {/* Configuración del cronograma */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={s.label}>Monto a financiar</label>
            <input type="text" value={montoFinanciar || ''}
              placeholder="0"
              onChange={e => setMontoFinanciar(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
              onKeyDown={soloNum}
              style={{ ...s.input, textAlign: 'right', fontWeight: 700, color: '#7c3aed' }} />
          </div>
          <div>
            <label style={s.label}>Nº cuotas</label>
            <input type="number" min={1} value={numCuotas}
              onChange={e => setNumCuotas(parseInt(e.target.value) || 1)}
              style={{ ...s.input, textAlign: 'center' }} />
          </div>
          <div>
            <label style={s.label}>Primera cuota</label>
            <input type="date" value={fechaPrimeraCuota} onChange={e => setFechaPrimeraCuota(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Cada</label>
            <select value={frecuenciaDias} onChange={e => setFrecuenciaDias(parseInt(e.target.value))} style={s.input}>
              <option value={7}>7 días (semanal)</option>
              <option value={15}>15 días (quincenal)</option>
              <option value={30}>30 días (mensual)</option>
              <option value={60}>60 días (bimestral)</option>
            </select>
          </div>
          <button onClick={generarCronograma}
            style={{ height: 30, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calculator size={13} /> Generar
          </button>
        </div>
      </div>

      {/* Tabla de cuotas */}
      {cuotas.length > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Cronograma de cuotas ({cuotas.length})</span>
            <button onClick={agregarCuota}
              style={{ height: 26, padding: '0 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={12} /> Agregar cuota
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 60, textAlign: 'center' }}>#</th>
                <th style={{ ...s.th, width: 160 }}>Fecha vencimiento</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Valor cuota</th>
                <th style={{ ...s.th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {cuotas.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>{c.numero}</td>
                  <td style={s.td}>
                    <input type="date" value={c.fecha}
                      onChange={e => actualizarCuota(i, 'fecha', e.target.value)}
                      style={{ ...s.input, height: 26, fontSize: 11 }} />
                  </td>
                  <td style={s.td}>
                    <input type="text" value={c.valor || ''}
                      onChange={e => actualizarCuota(i, 'valor', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                      onKeyDown={soloNum}
                      style={{ ...s.input, height: 26, fontSize: 11, textAlign: 'right', fontWeight: 600 }} />
                  </td>
                  <td style={s.td}>
                    <button onClick={() => eliminarCuota(i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ padding: '8px 8px', fontSize: 12, fontWeight: 700, color: '#374151', textAlign: 'right' }}>Suma cuotas:</td>
                <td style={{ padding: '8px 8px', fontSize: 13, fontWeight: 800, color: Math.abs(diferencia) > 1 ? '#dc2626' : '#16a34a', textAlign: 'right' }}>
                  {fmt(sumaCuotas)}
                </td>
                <td></td>
              </tr>
              {Math.abs(diferencia) > 1 && (
                <tr>
                  <td colSpan={4} style={{ padding: '4px 8px', fontSize: 11, color: '#dc2626', textAlign: 'right' }}>
                    ⚠ Diferencia con monto a financiar: {fmt(diferencia)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancelar && (
          <button onClick={onCancelar}
            style={{ height: 34, padding: '0 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
        )}
        <button onClick={guardar} disabled={guardando || !cliente || cuotas.length === 0}
          style={{ height: 34, padding: '0 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: (!cliente || cuotas.length === 0) ? 0.5 : 1 }}>
          {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar Financiación
        </button>
      </div>
    </div>
  );
}
