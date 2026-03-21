import { useState, useCallback, useRef } from 'react';
import { AlertTriangle, Info, HelpCircle, X, CheckCircle } from 'lucide-react';

type DialogType = 'warning' | 'danger' | 'info' | 'question';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends DialogOptions {
  resolve: (value: boolean) => void;
}

const icons: Record<DialogType, { icon: any; bg: string; color: string }> = {
  warning: { icon: AlertTriangle, bg: '#fef3c7', color: '#d97706' },
  danger: { icon: AlertTriangle, bg: '#fef2f2', color: '#dc2626' },
  info: { icon: Info, bg: '#dbeafe', color: '#2563eb' },
  question: { icon: HelpCircle, bg: '#f3e8ff', color: '#7c3aed' },
};

let globalShowDialog: ((options: DialogOptions) => Promise<boolean>) | null = null;

export function useConfirmDialog() {
  return useCallback((options: DialogOptions): Promise<boolean> => {
    if (globalShowDialog) return globalShowDialog(options);
    return Promise.resolve(false);
  }, []);
}

// Shortcut function — use this anywhere without hooks
export function confirmar(options: DialogOptions): Promise<boolean> {
  if (globalShowDialog) return globalShowDialog(options);
  return Promise.resolve(window.confirm(options.message));
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  globalShowDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const type = dialog?.type || 'question';
  const iconData = icons[type];
  const Icon = iconData.icon;

  return (
    <>
      {children}
      {dialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => close(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: 400, boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            {/* Header con icono */}
            <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: iconData.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={iconData.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{dialog.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{dialog.message}</div>
              </div>
            </div>

            {/* Botones */}
            <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => close(false)}
                style={{ height: 34, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {dialog.cancelText || 'Cancelar'}
              </button>
              <button onClick={() => close(true)} autoFocus
                style={{
                  height: 34, padding: '0 18px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: type === 'danger' ? '#dc2626' : type === 'warning' ? '#d97706' : '#7c3aed',
                  color: '#fff'
                }}>
                {dialog.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
