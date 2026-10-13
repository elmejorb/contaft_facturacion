import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';

/**
 * Componente reutilizable para capturar retenciones aplicadas por un cliente
 * cuando paga una factura (al contado o abono crédito).
 *
 * Usado en:
 *   - ClienteDetalle (al registrar pagos de cartera)
 *   - NuevaVenta (modal Finalizar venta contado FE/POS)
 *
 * Interfaz:
 *   value       — array de retenciones actuales (controlled)
 *   onChange    — recibe el nuevo array
 *   subtotal    — base típica para ReteFuente/ReteICA (sin IVA)
 *   iva         — base típica para ReteIVA
 *   total       — bruto (con IVA)
 *
 * Catálogo unificado: tira de /api/retenciones/catalogo-unificado.php,
 * que combina tblretenciones + tbl_conceptos_retefuente. REF_OFFSET
 * separa los IDs de los dos catálogos para el select.
 */

const API_CATALOGO = 'http://localhost:80/conta-app-backend/api/retenciones/catalogo-unificado.php';

export interface Retencion {
  concepto_label: string;
  concepto_ref_id: number | null;
  impuesto_ref_id: number | null;
  tipo_codigo: '05' | '06' | '07';
  base_kind: 'subtotal' | 'iva' | 'total' | 'custom';
  base: number;
  tarifa: number;
  monto: number;
}

interface CatalogoItem {
  _source: 'imp' | 'ref';
  id: number;
  concepto: string;
  tarifa: number;
  tipo_codigo: '05' | '06' | '07';
  base_uvt: number;
  activo: number;
}

const REF_OFFSET = 1_000_000;

const fmtMon = (v: number) => '$ ' + Math.round(v || 0).toLocaleString('es-CO');

interface Props {
  value: Retencion[];
  onChange: (next: Retencion[]) => void;
  subtotal: number;
  iva: number;
  total: number;
  compact?: boolean;  // Para espacios reducidos
}

export function RetencionesInput({ value, onChange, subtotal, iva, total, compact }: Props) {
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [uvt, setUvt] = useState({ valor: 52374, anio: 2026 });

  useEffect(() => {
    fetch(API_CATALOGO).then(r => r.json()).then(d => {
      if (d.success) {
        setCatalogo(d.items || []);
        setUvt(d.uvt || uvt);
      }
    }).catch(() => {});
  }, []);

  const totalRetenido = useMemo(() => value.reduce((s, r) => s + (r.monto || 0), 0), [value]);

  const resolverBase = (kind: Retencion['base_kind'], custom = 0): number => {
    if (kind === 'subtotal') return subtotal;
    if (kind === 'iva') return iva;
    if (kind === 'total') return total;
    return custom;
  };

  const agregar = () => {
    onChange([...value, {
      concepto_label: '',
      concepto_ref_id: null,
      impuesto_ref_id: null,
      tipo_codigo: '06',
      base_kind: 'subtotal',
      base: subtotal,
      tarifa: 0,
      monto: 0,
    }]);
  };

  const quitar = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const virtualIdOf = (item: CatalogoItem) => item._source === 'ref' ? item.id + REF_OFFSET : item.id;
  const buscarPorVirtualId = (virt: number) => catalogo.find(it => virtualIdOf(it) === virt);

  const aplicarDeCatalogo = (idx: number, virtualId: number) => {
    const item = buscarPorVirtualId(virtualId);
    if (!item) return;
    const codigo = item.tipo_codigo;
    const baseKind: Retencion['base_kind'] = codigo === '05' ? 'iva' : 'subtotal';
    const base = resolverBase(baseKind);
    const monto = Math.round(base * (item.tarifa / 100));
    onChange(value.map((r, i) => i === idx ? {
      ...r,
      concepto_label: item.concepto,
      concepto_ref_id: item._source === 'ref' ? item.id : null,
      impuesto_ref_id: item._source === 'imp' ? item.id : null,
      tipo_codigo: item.tipo_codigo,
      base_kind: baseKind,
      base,
      tarifa: item.tarifa,
      monto,
    } : r));
  };

  const cambiarBase = (idx: number, kind: Retencion['base_kind']) => {
    const r = value[idx];
    const base = resolverBase(kind, r.base);
    const monto = Math.round(base * (r.tarifa / 100));
    onChange(value.map((x, i) => i === idx ? { ...x, base_kind: kind, base, monto } : x));
  };

  const cambiarTarifa = (idx: number, tarifa: number) => {
    const r = value[idx];
    const monto = Math.round(r.base * (tarifa / 100));
    onChange(value.map((x, i) => i === idx ? { ...x, tarifa, monto } : x));
  };

  const cambiarMonto = (idx: number, monto: number) => {
    onChange(value.map((x, i) => i === idx ? { ...x, monto } : x));
  };

  const cambiarBaseCustom = (idx: number, baseCustom: number) => {
    const r = value[idx];
    const monto = Math.round(baseCustom * (r.tarifa / 100));
    onChange(value.map((x, i) => i === idx ? { ...x, base: baseCustom, monto } : x));
  };

  return (
    <div style={{ border: '1px solid #fecaca', borderRadius: 10, padding: compact ? 8 : 12, background: '#fef2f2' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Receipt size={14} color="#dc2626" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>Retenciones aplicadas</span>
          {totalRetenido > 0 && (
            <span style={{ fontSize: 11, color: '#dc2626' }}>· Total: <b>{fmtMon(totalRetenido)}</b></span>
          )}
        </div>
        <button type="button" onClick={agregar}
          style={{ height: 26, padding: '0 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      {value.length === 0 ? (
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '6px 0' }}>
          Sin retenciones. Clic en "Agregar" si el cliente aplicó alguna.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {value.map((r, idx) => (
            <div key={idx} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Concepto - select del catálogo */}
              <select
                value={r.concepto_ref_id !== null ? r.concepto_ref_id + REF_OFFSET : (r.impuesto_ref_id ?? '')}
                onChange={e => aplicarDeCatalogo(idx, parseInt(e.target.value))}
                style={{ flex: 1, minWidth: 200, height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 6px' }}
              >
                <option value="">— Elegí concepto —</option>
                <optgroup label="Impuestos (configurados)">
                  {catalogo.filter(c => c._source === 'imp').map(c => (
                    <option key={'imp-'+c.id} value={c.id}>{c.concepto} · {c.tarifa}%</option>
                  ))}
                </optgroup>
                <optgroup label="Conceptos ReteFuente DIAN">
                  {catalogo.filter(c => c._source === 'ref').map(c => (
                    <option key={'ref-'+c.id} value={c.id + REF_OFFSET}>
                      {c.concepto} · {c.tarifa}%{c.base_uvt > 0 ? ` · base ${c.base_uvt} UVT` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Base */}
              <select value={r.base_kind} onChange={e => cambiarBase(idx, e.target.value as any)}
                title="Base sobre la que se calcula"
                style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 4px' }}>
                <option value="subtotal">Subtotal</option>
                <option value="iva">IVA</option>
                <option value="total">Total</option>
                <option value="custom">Custom</option>
              </select>

              {r.base_kind === 'custom' ? (
                <input type="number" value={r.base} onChange={e => cambiarBaseCustom(idx, parseFloat(e.target.value) || 0)}
                  style={{ width: 90, height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 6px', textAlign: 'right' }} />
              ) : (
                <div style={{ fontSize: 10, color: '#6b7280', minWidth: 85, textAlign: 'right' }}>{fmtMon(r.base)}</div>
              )}

              {/* Tarifa */}
              <input type="number" step="0.1" value={r.tarifa} onChange={e => cambiarTarifa(idx, parseFloat(e.target.value) || 0)}
                title="Porcentaje"
                style={{ width: 55, height: 28, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, padding: '0 4px', textAlign: 'right' }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>%</span>

              {/* Monto */}
              <input type="number" value={r.monto} onChange={e => cambiarMonto(idx, parseFloat(e.target.value) || 0)}
                title="Monto a retener"
                style={{ width: 95, height: 28, border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: 6, fontSize: 11, padding: '0 6px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }} />

              <button type="button" onClick={() => quitar(idx)}
                title="Quitar retención"
                style={{ height: 28, width: 28, background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!compact && value.length > 0 && (
        <div style={{ fontSize: 10, color: '#991b1b', marginTop: 6, fontStyle: 'italic' }}>
          UVT {uvt.anio}: {fmtMon(uvt.valor)} · El total retenido se descuenta del valor que el cliente debe pagar realmente.
        </div>
      )}
    </div>
  );
}
