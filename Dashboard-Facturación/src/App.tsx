import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'react-hot-toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { ConfigurarServidor } from './components/ConfigurarServidor';
import { AutoUpdater } from './components/AutoUpdater';
import { SubscriptionGate } from './components/SubscriptionGate';
import { isApiConfigured, loadConfigFromFile } from './config/api';

function AppContent() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [serverConfigured, setServerConfigured] = useState(isApiConfigured());
  const [configLoaded, setConfigLoaded] = useState(false);

  // Cargar config desde archivo JSON al inicio (Electron)
  useEffect(() => {
    loadConfigFromFile().then(() => {
      setServerConfigured(isApiConfigured());
      setConfigLoaded(true);
    });
  }, []);

  // Aviso al cerrar la ventana de Windows si hay una caja abierta sin cerrar.
  // El main process intercepta el cierre y manda 'app:intento-cierre'; aquí
  // consultamos en vivo el estado de la caja del usuario y, si está abierta,
  // pedimos confirmación. Solo si el usuario acepta (o no hay caja) cerramos.
  useEffect(() => {
    let ipcRenderer: any;
    try { ipcRenderer = window.require('electron').ipcRenderer; } catch { return; }
    if (!ipcRenderer) return;

    const onIntentoCierre = async () => {
      try {
        if (isAuthenticated && user?.id) {
          const r = await fetch(`http://localhost:80/conta-app-backend/api/caja/sesion.php?usuario=${user.id}`);
          const d = await r.json();
          if (d?.abierta) {
            const ok = window.confirm(
              'Tienes una CAJA ABIERTA sin cerrar.\n\n' +
              'Si cierras el sistema ahora, el cuadre de hoy quedará abierto y mañana seguirá acumulando.\n\n' +
              '¿Seguro que deseas cerrar el sistema de todas formas?'
            );
            if (!ok) { ipcRenderer.send('app:cierre-cancelado'); return; } // canceló → no cerrar
          }
        }
      } catch {
        // Si falla la consulta (sin conexión, etc.) no bloqueamos el cierre.
      }
      ipcRenderer.send('app:cerrar-confirmado');
    };

    ipcRenderer.on('app:intento-cierre', onIntentoCierre);
    return () => ipcRenderer.removeListener('app:intento-cierre', onIntentoCierre);
  }, [isAuthenticated, user?.id]);

  // Bloquear render hasta que se cargue config.json — evita que componentes
  // hagan fetch con DEFAULT_URL antes de que loadConfigFromFile termine.
  if (loading || !configLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // En desarrollo, saltar la configuración del servidor
  const isDev = import.meta.env.DEV;
  if (!isDev && !serverConfigured) {
    return <ConfigurarServidor onConfigured={() => { setServerConfigured(true); window.location.reload(); }} />;
  }

  return (
    <SubscriptionGate>
      <div className="min-h-screen bg-gray-50">
        <AutoUpdater />
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
          <Dashboard onLogout={logout} user={user} />
        )}
      </div>
    </SubscriptionGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmDialogProvider>
      <AppContent />
      </ConfirmDialogProvider>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 100000 }}
        toastOptions={{
          duration: 4000,
          style: { fontSize: 14, fontWeight: 600, borderRadius: 10, padding: '12px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
          success: { style: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }, iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { style: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }, iconTheme: { primary: '#dc2626', secondary: '#fff' }, duration: 6000 },
        }}
      />
    </AuthProvider>
  );
}
