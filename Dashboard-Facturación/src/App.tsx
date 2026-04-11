import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'react-hot-toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { ConfigurarServidor } from './components/ConfigurarServidor';
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

  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      {!isAuthenticated ? (
        <LoginPage />
      ) : (
        <Dashboard onLogout={logout} user={user} />
      )}
    </div>
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
