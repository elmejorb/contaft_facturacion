import { useState, useEffect } from 'react';
import { Save, Building2, FileText, Globe, Receipt, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getConfigImpresion, saveConfigImpresion } from './ConfiguracionSistema';

const API = 'http://localhost:80/conta-app-backend/api/empresa/datos.php';

export function DatosEmpresa() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [logo, setLogo] = useState(() => getConfigImpresion().logo || '');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setForm(d.empresa);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const set = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) {
        // Guardar logo en config de impresión
        const cfg = getConfigImpresion();
        cfg.logo = logo;
        saveConfigImpresion(cfg);
        toast.success(d.message);
      }
      else toast.error(d.message);
    } catch (e) { toast.error('Error al guardar'); }
    setGuardando(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>;

  const inp: React.CSSProperties = { height: 30, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, padding: '0 8px', outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase' };

  const seccion = (titulo: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #f3f4f6' }}>
        {icon}
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{titulo}</span>
      </div>
      {children}
    </div>
  );

  const campo = (label: string, field: string, opts?: { width?: string; readOnly?: boolean; type?: string }) => (
    <div style={{ flex: opts?.width || '1', minWidth: opts?.width || 'auto' }}>
      <label style={lbl}>{label}</label>
      <input type={opts?.type || 'text'} value={form[field] ?? ''} readOnly={opts?.readOnly}
        onChange={e => set(field, e.target.value)}
        style={{ ...inp, background: opts?.readOnly ? '#f9fafb' : '#fff' }} />
    </div>
  );

  const radio = (label: string, field: string, options: { value: any; label: string }[]) => (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 30 }}>
        {options.map(o => (
          <label key={String(o.value)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" name={field} checked={String(form[field]) === String(o.value)}
              onChange={() => set(field, o.value)} style={{ accentColor: '#7c3aed' }} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>Datos de la Empresa</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Información general y configuración de facturación</p>
        </div>
        <button onClick={guardar} disabled={guardando}
          style={{ height: 34, padding: '0 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: guardando ? 0.6 : 1 }}>
          <Save size={15} /> Guardar
        </button>
      </div>

      {/* Datos Generales */}
      {seccion('Datos Generales', <Building2 size={18} color="#7c3aed" />, (
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Campos izquierda */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {campo('Empresa', 'Empresa')}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {campo('Propietario(a)', 'Propietario')}
              {campo('NIT con DV', 'Nit', { width: '180px' })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {campo('Dirección', 'Direccion')}
              {campo('Teléfonos', 'Telefono', { width: '150px' })}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Detalles / Actividad Económica</label>
              <textarea value={form.Detalle ?? ''} onChange={e => set('Detalle', e.target.value)}
                style={{ ...inp, height: 50, padding: '6px 8px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <label style={lbl}>Régimen</label>
                <select value={form.Regimen ?? 'Común'} onChange={e => set('Regimen', e.target.value)}
                  style={{ ...inp, width: 160 }}>
                  <option value="Común">Común</option>
                  <option value="Simplificado">Simplificado</option>
                  <option value="Simple">Simple</option>
                  <option value="No Responsable">No Responsable de IVA</option>
                </select>
              </div>
              {radio('Agentes Retenedores', 'AgentesRet', [{ value: 'Si', label: 'Sí' }, { value: 'No', label: 'No' }])}
              {radio('IVA Incluido', 'IvaIncluido', [{ value: 1, label: 'Sí' }, { value: 0, label: 'No' }])}
            </div>
          </div>

          {/* Logo derecha */}
          <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <label style={{ ...lbl, textAlign: 'center' }}>Logo de la Empresa</label>
            <div style={{
              width: 150, height: 150, border: '2px dashed #d1d5db', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              background: logo ? '#fff' : '#f9fafb', position: 'relative'
            }}>
              {logo ? (
                <>
                  <img src={logo} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Logo" />
                  <button onClick={() => setLogo('')}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} color="#dc2626" />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                  <Camera size={28} style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 10 }}>Sin logo</div>
                </div>
              )}
            </div>
            <label style={{
              height: 28, padding: '0 12px', background: '#f3e8ff', color: '#7c3aed',
              border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Camera size={13} /> {logo ? 'Cambiar' : 'Subir logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => { if (ev.target?.result) setLogo(ev.target.result as string); };
                reader.readAsDataURL(file);
              }} />
            </label>
            <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>Aparece en facturas,<br/>cotizaciones y recibos</div>
          </div>
        </div>
      ))}

      {/* Facturación */}
      {seccion('Facturación', <Receipt size={18} color="#2563eb" />, (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {campo('Resolución Nº', 'Resolucion', { width: '200px' })}
            <div style={{ width: 160 }}>
              <label style={lbl}>Fecha de Aprobación</label>
              <input type="date" value={form.FechaR?.split(' ')[0] ?? ''} onChange={e => set('FechaR', e.target.value)}
                style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {campo('Rango Desde', 'Rango', { width: '120px' })}
            {campo('Hasta la', 'Rango2', { width: '120px' })}
            {campo('Iniciar en', 'IniciarFacturaEn', { width: '120px' })}
            {campo('Prefijo', 'Prefijo', { width: '100px' })}
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {radio('Usar porcentajes para precios de venta', 'Porcentajes', [{ value: 'Si', label: 'Sí' }, { value: 'No', label: 'No' }])}
          </div>
        </div>
      ))}

      {/* API / Integración */}
      {seccion('Integración Web', <Globe size={18} color="#16a34a" />, (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {campo('Email', 'email')}
            {campo('API Token', 'api_token', { width: '200px' })}
          </div>
        </div>
      ))}

      {/* Factura Electrónica */}
      {seccion('Factura Electrónica', <FileText size={18} color="#d97706" />, (
        <div>
          <div style={{ display: 'flex', gap: 10 }}>
            {campo('Email Facturación Electrónica', 'email_factelect')}
            <div style={{ flex: 1 }}>
              <label style={lbl}>Contraseña</label>
              <input type="password" value={form.password_factelect ?? ''} onChange={e => set('password_factelect', e.target.value)}
                style={inp} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
