import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import appIcon from '../assets/icon.png';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
    setLoading(false);
    return false;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'oklch(.424 .199 265.638)' }}
    >
      {/* Decorative SVG Background - Subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Círculo grande esquina superior derecha */}
        <svg
          className="absolute -top-32 -right-32 w-64 h-64"
          viewBox="0 0 200 200"
          style={{ opacity: 0.05 }}
        >
          <circle cx="100" cy="100" r="100" fill="white" />
        </svg>

        {/* Círculo mediano esquina inferior izquierda */}
        <svg
          className="absolute -bottom-20 -left-20 w-48 h-48"
          viewBox="0 0 200 200"
          style={{ opacity: 0.05 }}
        >
          <circle cx="100" cy="100" r="100" fill="white" />
        </svg>

        {/* Pequeños círculos dispersos */}
        <svg
          className="absolute top-1/4 left-16 w-6 h-6"
          viewBox="0 0 100 100"
          style={{ opacity: 0.08 }}
        >
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>

        <svg
          className="absolute top-16 right-1/4 w-4 h-4"
          viewBox="0 0 100 100"
          style={{ opacity: 0.06 }}
        >
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>

        <svg
          className="absolute bottom-1/3 right-24 w-8 h-8"
          viewBox="0 0 100 100"
          style={{ opacity: 0.05 }}
        >
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>

        <svg
          className="absolute bottom-24 left-1/4 w-3 h-3"
          viewBox="0 0 100 100"
          style={{ opacity: 0.1 }}
        >
          <circle cx="50" cy="50" r="50" fill="white" />
        </svg>

        {/* Anillos flotantes */}
        <svg
          className="absolute top-1/3 right-16 w-16 h-16"
          viewBox="0 0 100 100"
          style={{ opacity: 0.04 }}
        >
          <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="2" />
        </svg>

        <svg
          className="absolute bottom-1/4 left-12 w-20 h-20"
          viewBox="0 0 100 100"
          style={{ opacity: 0.03 }}
        >
          <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="2" />
        </svg>

        {/* Gradiente sutil para profundidad */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.03) 0%, transparent 40%)',
          }}
        />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-2xl relative z-10">
        <CardHeader style={{ textAlign: 'center', padding: '16px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <img src={appIcon} alt="Conta FT" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            <div style={{ textAlign: 'left' }}>
              <CardTitle className="text-xl" style={{ marginBottom: 0, lineHeight: 1.1 }}>Conta FT</CardTitle>
              <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, letterSpacing: 2, margin: 0 }}>FACTURACIÓN</p>
            </div>
          </div>
          <CardDescription style={{ fontSize: 13, marginTop: 4 }}>
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
            <p className="text-xs text-gray-400 text-center pt-4">
              Conta FT v4.1 — Facturación
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
