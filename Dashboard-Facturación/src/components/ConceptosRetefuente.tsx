import { useState, useEffect, useMemo } from 'react';
import { Receipt, Plus, Pencil, Save, X, Search, Info, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmar } from './ConfirmDialog';

const API_CONCEPTOS = 'http://localhost:80/conta-app-backend/api/conceptos-retefuente/index.php';
const API_UVT = 'http://localhost:80/conta-app-backend/api/retenciones/uvt.php';

interface Concepto {
  Id_Concepto: number;
  concepto: string;
  base_uvt: number;
  tarifa: number;
  tipo_codigo: '05' | '06' | '07';
  activo: number;
  Fecha_Creacion?: string;
}

interface UvtInfo {
  uvt_valor: number;
  uvt_anio: number;
  uvt_actualizado_at: string | null;
}

const fmtMon = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

export function ConceptosRetefuente() {
  const [items, setItems] = useState<Concepto[]>([]);
  const [uvt, setUvt] = useState<UvtInfo>({ uvt_valor: 52374, uvt_anio: 2026, uvt_actualizado_at: null });
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Concepto | null>(null);
  const [filtro, setFiltro] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [editUvt, setEditUvt] = useState(false);
  const [uvtDraft, setUvtDraft] = useState({ uvt_valor: 0, uvt_anio: 2026 });

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API_CONCEPTOS);
      const d = await r.json();
      if (d.success) {
        setItems(d.conceptos || []);
        setUvt(d.uvt || uvt);
      }
    } catch {
      toast.error('Error al cargar conceptos');
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const sincronizarUvt = async () => {
    setSincronizando(true);
    try {
      const r = await fetch(API_UVT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sincronizar' })
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        cargar();
      } else {
        toast.error(d.message || 'No se pudo sincronizar');
      }
    } catch { toast.error('Error de red'); }
    setSincronizando(false);
  };

  const guardarUvt = async () => {
    try {
      const r = await fetch(API_UVT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar', uvt_valor: uvtDraft.uvt_valor, uvt_anio: uvtDraft.uvt_anio })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setEditUvt(false); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error'); }
  };

  const guardar = async () => {
    if (!editando) return;
    if (!editando.concepto.trim()) { toast.error('Concepto requerido'); return; }
    if (editando.tarifa < 0 || editando.tarifa > 100) { toast.error('Tarifa entre 0 y 100'); return; }

    const esNuevo = !editando.Id_Concepto;
    try {
      const r = await fetch(API_CONCEPTOS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: esNuevo ? 'crear' : 'editar',
          id: editando.Id_Concepto,
          concepto: editando.concepto,
          base_uvt: editando.base_uvt,
          tarifa: editando.tarifa,
          tipo_codigo: editando.tipo_codigo,
          activo: editando.activo,
        })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); setEditando(null); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error de red'); }
  };

  const toggleActivo = async (c: Concepto) => {
    try {
      await fetch(API_CONCEPTOS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: c.Id_Concepto })
      });
      cargar();
    } catch {}
  };

  const eliminar = async (c: Concepto) => {
    if (!await confirmar({
      title: 'Desactivar concepto',
      message: `¿Desactivar "${c.concepto}"? Se preservan los históricos — podés reactivarlo luego.`,
      type: 'warning', confirmText: 'Desactivar'
    })) return;
    try {
      const r = await fetch(API_CONCEPTOS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id: c.Id_Concepto })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); cargar(); }
      else toast.error(d.message);
    } catch { toast.error('Error'); }
  };

  const filtrados = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return items;
    return items.filter(x => x.concepto.toLowerCase().includes(f));
  }, [items, filtro]);

  const baseMinimaPesos = (baseUvt: number) => Math.round(baseUvt * uvt.uvt_valor);

  return (
    <div style={{ padding: '12px 20px' }}>
      {/* Encabezado + UVT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Receipt size={22} color="#7c3aed" />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Conceptos de Retención en la Fuente</h2>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Define los conceptos retenibles con su base mínima (UVT) y tarifa. Al facturar o pagar, el sistema calcula la retención solo si el subtotal supera la base.
          </div>
        </div>
      </div>

      {/* Panel UVT */}
      <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Info size={16} color="#7c3aed" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#581c87' }}>Valor UVT del año</div>
            <div style={{ fontSize: 11, color: '#6b21a8' }}>
              Se usa para evaluar si el subtotal de la factura supera la base mínima.
            </div>
          </div>
        </div>
        {editUvt ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" value={uvtDraft.uvt_anio}
              onChange={e => setUvtDraft(p => ({ ...p, uvt_anio: parseInt(e.target.value) || 2026 }))}
              style={{ width: 70, height: 30, border: '1px solid #c084fc', borderRadius: 6, padding: '0 6px', fontSize: 13 }} />
            <input type="number" value={uvtDraft.uvt_valor}
              onChange={e => setUvtDraft(p => ({ ...p, uvt_valor: parseFloat(e.target.value) || 0 }))}
              style={{ width: 110, height: 30, border: '1px solid #c084fc', borderRadius: 6, padding: '0 6px', fontSize: 13, textAlign: 'right' }} />
            <button onClick={guardarUvt} style={{ height: 30, padding: '0 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            <button onClick={() => setEditUvt(false)} style={{ height: 30, padding: '0 10px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Año</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#581c87' }}>{uvt.uvt_anio}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginLeft: 10 }}>Valor UVT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#581c87' }}>{fmtMon(uvt.uvt_valor)}</div>
            <button onClick={() => { setUvtDraft({ uvt_valor: uvt.uvt_valor, uvt_anio: uvt.uvt_anio }); setEditUvt(true); }}
              style={{ height: 28, padding: '0 10px', background: '#fff', color: '#7c3aed', border: '1px solid #c084fc', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Pencil size={12} /> Editar
            </button>
            <button onClick={sincronizarUvt} disabled={sincronizando}
              title="Trae automáticamente el UVT oficial de la DIAN para el año actual"
              style={{ height: 28, padding: '0 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: sincronizando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={12} className={sincronizando ? 'animate-spin' : ''} /> Sincronizar DIAN
            </button>
          </>
        )}
      </div>

      {/* Filtro + nuevo */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
          <input type="text" placeholder="Buscar concepto..." value={filtro} onChange={e => setFiltro(e.target.value)}
            style={{ width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, padding: '0 10px 0 32px', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => setEditando({ Id_Concepto: 0, concepto: '', base_uvt: 0, tarifa: 0, tipo_codigo: '06', activo: 1 })}
          style={{ height: 34, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> Registrar concepto
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>CONCEPTO</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: 80 }}>BASE UVT</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: 150 }}>BASE MÍNIMA</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: 80 }}>TARIFA</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 80 }}>TIPO</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 80 }}>ESTADO</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.Id_Concepto} style={{ borderTop: '1px solid #f3f4f6', opacity: c.activo ? 1 : 0.5 }}>
                  <td style={{ padding: '8px 12px' }}>{c.concepto}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280' }}>{c.base_uvt > 0 ? c.base_uvt : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280' }}>{c.base_uvt > 0 ? fmtMon(baseMinimaPesos(c.base_uvt)) : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{c.tarifa}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                      background: c.tipo_codigo === '05' ? '#dbeafe' : c.tipo_codigo === '07' ? '#fef3c7' : '#f3e8ff',
                      color: c.tipo_codigo === '05' ? '#1e40af' : c.tipo_codigo === '07' ? '#92400e' : '#6b21a8' }}>
                      {c.tipo_codigo === '05' ? 'ReteIVA' : c.tipo_codigo === '07' ? 'ReteICA' : 'ReteFte'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button onClick={() => toggleActivo(c)} style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.activo ? '#dcfce7' : '#f3f4f6', color: c.activo ? '#16a34a' : '#6b7280' }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </button>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button onClick={() => setEditando(c)} style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: '#2563eb', padding: 4 }}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
        {filtrados.length} de {items.length} conceptos
      </div>

      {/* Modal editar/crear */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setEditando(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 15, fontWeight: 700 }}>
              <Receipt size={18} color="#7c3aed" />
              {editando.Id_Concepto ? 'Editar concepto' : 'Nuevo concepto de retención'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280' }}>Concepto</label>
                <input type="text" value={editando.concepto} onChange={e => setEditando({ ...editando, concepto: e.target.value })}
                  style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6b7280' }}>Base UVT <span style={{ fontSize: 9, color: '#9ca3af' }}>(0 = sin base mínima)</span></label>
                  <input type="number" value={editando.base_uvt} onChange={e => setEditando({ ...editando, base_uvt: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }} />
                  {editando.base_uvt > 0 && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>≈ {fmtMon(baseMinimaPesos(editando.base_uvt))}</div>}
                </div>
                <div style={{ width: 110 }}>
                  <label style={{ fontSize: 11, color: '#6b7280' }}>Tarifa (%)</label>
                  <input type="number" step="0.1" value={editando.tarifa} onChange={e => setEditando({ ...editando, tarifa: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 10px', fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }} />
                </div>
                <div style={{ width: 110 }}>
                  <label style={{ fontSize: 11, color: '#6b7280' }}>Tipo</label>
                  <select value={editando.tipo_codigo} onChange={e => setEditando({ ...editando, tipo_codigo: e.target.value as any })}
                    style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: '0 6px', fontSize: 13 }}>
                    <option value="06">ReteFuente</option>
                    <option value="05">ReteIVA</option>
                    <option value="07">ReteICA</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editando.activo} onChange={e => setEditando({ ...editando, activo: e.target.checked ? 1 : 0 })} />
                Activo
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>
              {editando.Id_Concepto > 0 ? (
                <button onClick={() => { eliminar(editando); setEditando(null); }} style={{ height: 34, padding: '0 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Desactivar</button>
              ) : <div />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditando(null)} style={{ height: 34, padding: '0 14px', background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}><X size={13} /> Cancelar</button>
                <button onClick={guardar} style={{ height: 34, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Save size={13} /> Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
