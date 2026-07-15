import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { codificarPassword } from '../utils/passwordEncoder';

interface User {
  id?: number;
  username: string;
  nombre?: string;
  tipoUsuario?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const passwordCodificada = codificarPassword(password);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:80/conta-app-backend/api';

      const res = await fetch(`${API_URL}/auth/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordCodificada }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, message: data.message || 'Usuario o contraseña incorrectos' };
      }

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      // Auto-aplicar migraciones de BD si la versión de la app cambió
      // respecto a la última vez que se corrió el SQL en este cliente.
      // No bloquea el login — corre en background. El endpoint es
      // idempotente y solo aplica si detecta un cambio de versión
      // guardada en tbldatosempresa.version_sql_aplicada.
      try {
        const pkg = await import('../../package.json');
        const appVersion = (pkg as any).default?.version ?? (pkg as any).version ?? '0.0.0';
        fetch(`${API_URL}/actualizacion/aplicar-sql.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: appVersion }),
        })
          .then(r => r.json())
          .then(res => {
            if (res.aplicado && res.statements_ok > 0) {
              setTimeout(() => {
                import('react-hot-toast').then(({ default: toast }) => {
                  toast.success(`Base de datos actualizada a v${appVersion}`, { duration: 4000 });
                });
              }, 800);
            }
            if (res.errores?.length > 0) {
              console.warn('[actualizacion-bd] migraciones con errores parciales:', res.errores);
            }
          })
          .catch(err => console.warn('[actualizacion-bd] no se pudo aplicar SQL:', err));
      } catch { /* silent — no queremos que un fallo aquí impida el login */ }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: 'Error de conexión con el servidor',
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
