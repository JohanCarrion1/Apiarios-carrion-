import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { clearAdminSession } from '../lib/adminSession';
import { useAdminList, isEmailAdmin } from '../lib/adminAccess';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register, loginWithGoogle, loginWithTwitter, error, clearError, firebaseAvailable } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Lista viva de administradores (Firestore config/admins).
  const { status: adminStatus } = useAdminList();

  // En /tienda/admin solo entra el admin: le damos sesión de 7 días y lo
  // llevamos al panel. Cualquier otro correo es redirigido a /seleccionar
  // con el aviso "Acceso denegado" (sin cerrarle la sesión de Firebase).
  const onAdminRoute = location.pathname.startsWith('/tienda/admin');
  useEffect(() => {
    if (!user) return;
    // Esperar el veredicto de Firestore antes de decidir: así un admin recién
    // agregado no pierde el acceso durante la primera carga de la lista.
    if (adminStatus === 'loading') return;
    console.log('🔐 [LOGIN] Login automático tras autenticación');
    console.log('📧 [LOGIN] Email del usuario:', user.email);
    const admin = isEmailAdmin(user.email);
    console.log('✅ [LOGIN] ¿Es admin?', admin, '| estado:', adminStatus);
    console.log('🔐 [LOGIN] Ruta actual:', location.pathname, '| onAdminRoute:', onAdminRoute);
    clearAdminSession();
    if (onAdminRoute && !admin) {
      // No-admin tocando el panel admin → /seleccionar con aviso de denegado.
      navigate('/seleccionar', {
        replace: true,
        state: { accessDenied: 'Solo personal autorizado puede gestionar el panel de la tienda.' },
      });
      return;
    }
    // Flujo unificado: TODOS los usuarios (admin o no) pasan por /seleccionar
    // tras el login. La tarjeta "Cotizaciones" se muestra u oculta según el rol.
    console.log('🔐 [LOGIN] Redirigiendo a /seleccionar (flujo unificado)...');
    navigate('/seleccionar', { replace: true });
  }, [user, adminStatus, navigate, onAdminRoute, location.pathname]);

  // Mostrar mensaje de error si Firebase no está disponible
  if (!firebaseAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-ink">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 max-w-2xl w-full"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="font-display text-3xl font-bold text-cream mb-4">
              Configuración de Firebase Faltante
            </h1>
            <p className="text-husk mb-6">
              La aplicación no puede funcionar correctamente porque faltan las variables de entorno de Firebase.
            </p>
            
            <div className="bg-ink/50 border border-line rounded-lg p-6 text-left mb-6">
              <h2 className="font-semibold text-cream mb-3">📋 Pasos para configurar:</h2>
              <ol className="text-husk space-y-2 text-sm">
                <li>1. Crea un proyecto en <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-honey hover:underline">Firebase Console</a></li>
                <li>2. Habilita Authentication en tu proyecto de Firebase</li>
                <li>3. Copia las credenciales de tu proyecto</li>
                <li>4. Crea un archivo <code className="bg-pane px-2 py-1 rounded text-honey">.env</code> en la raíz del proyecto</li>
                <li>5. Agrega las siguientes variables:</li>
              </ol>
              
              <div className="bg-pane rounded-lg p-4 mt-4 font-mono text-xs text-cream overflow-x-auto">
                <div>VITE_FIREBASE_API_KEY=tu-api-key</div>
                <div>VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com</div>
                <div>VITE_FIREBASE_PROJECT_ID=tu-project-id</div>
                <div>VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com</div>
                <div>VITE_FIREBASE_MESSAGING_SENDER_ID=123456789</div>
                <div>VITE_FIREBASE_APP_ID=1:123456789:web:abcdef</div>
              </div>
              
              <p className="text-husk mt-4 text-sm">
                💡 Consulta el archivo <code className="bg-pane px-2 py-1 rounded text-honey">.env.example</code> para más detalles
              </p>
            </div>

            <div className="bg-coral/10 border border-coral/30 rounded-lg p-4 mb-6">
              <p className="text-coral text-sm">
                <strong>⚠️ Importante:</strong> Después de agregar las variables, reinicia el servidor de desarrollo con <code className="bg-pane px-2 py-1 rounded">npm run dev</code>
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-honey text-ink px-6 py-3 rounded-lg font-semibold hover:bg-honeysoft transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 [LOGIN] handleSubmit iniciado');
    console.log('🔵 [LOGIN] Viewport:', window.innerWidth, 'x', window.innerHeight);
    console.log('🔵 [LOGIN] Email:', email);
    console.log('🔵 [LOGIN] Is registering:', isRegistering);
    
    setLoading(true);
    console.log('🔵 [LOGIN] Loading state activado');
    
    try {
      if (isRegistering) {
        console.log('🔵 [LOGIN] Llamando a register()...');
        await register(email, password);
        console.log('✅ [LOGIN] register() completado exitosamente');
      } else {
        console.log('🔵 [LOGIN] Llamando a login()...');
        await login(email, password);
        console.log('✅ [LOGIN] login() completado exitosamente');
      }
    } catch (error) {
      console.error('❌ [LOGIN] Error en handleSubmit:', error);
      // El error ya está manejado en el contexto
    } finally {
      setLoading(false);
      console.log('🔵 [LOGIN] Loading state desactivado');
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    console.log('🔐 [LOGIN] Intentando login con Google...');
    try {
      await loginWithGoogle();
      console.log('✅ [LOGIN] loginWithGoogle() completado');
    } catch (error) {
      console.error('❌ [LOGIN] Error en login con Google:', error);
    } finally {
      setLoadingProvider(null);
      console.log('🔐 [LOGIN] Handler de Google finalizado');
    }
  };

  const handleTwitterLogin = async () => {
    setLoadingProvider('twitter');
    if (import.meta.env.DEV) console.log('🔐 [LOGIN] Intentando login con X (Twitter)...');
    try {
      await loginWithTwitter();
      // No hay redirección aquí: la navega el efecto de `user` de más arriba,
      // que espera el veredicto de admin antes de enviar a /seleccionar.
    } catch (error) {
      // El mensaje ya está en el estado `error` del contexto, que se pinta en
      // el banner. Nunca se usa alert() a propósito.
      if (import.meta.env.DEV) console.error('❌ [LOGIN] Error en login con X:', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  // Pantalla de "Acceso denegado": se muestra cuando el correo autenticado
  // intenta entrar a la tienda/admin sin estar autorizado.

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ink">
      {/* Fondo con patrón hexagonal */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="hex-pattern" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <path d="M25 7.5L43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#f0a41c" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        </svg>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #f0a41c 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #b97d15 0%, transparent 70%)' }} />
      </div>

      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="card p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-4"
            >
              <Logo variant="icon" className="w-24 h-24 sm:w-32 sm:h-32" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-3xl sm:text-4xl font-black tracking-tight text-cream text-center mb-2"
            >
              Bienvenido a Apiarios Carrión
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-mono text-xs sm:text-sm text-husk text-center tracking-wider"
            >
              Miel & Productos Naturales • Huaraz
            </motion.p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl border border-coral/40 bg-coral/10 text-coral text-sm flex items-start gap-3"
            >
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p>{error}</p>
                <button onClick={clearError} className="text-xs underline mt-1 hover:text-coral/80">
                  Cerrar
                </button>
              </div>
            </motion.div>
          )}

          {/* Botones de redes sociales */}
          <div className="space-y-3 mb-6">
            {/* Google */}
            <motion.button
              onClick={handleGoogleLogin}
              disabled={loading || loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-gray-800 py-3.5 font-semibold transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading || loadingProvider ? 1 : 1.02 }}
              whileTap={{ scale: loading || loadingProvider ? 1 : 0.98 }}
            >
              {loadingProvider === 'google' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"
                />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuar con Google
            </motion.button>

            {/* X (Twitter) — diseño oficial: fondo negro, marca blanca */}
            <motion.button
              onClick={handleTwitterLogin}
              disabled={loading || loadingProvider !== null}
              aria-busy={loadingProvider === 'twitter'}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-black text-white py-3.5 font-semibold ring-1 ring-white/15 shadow-[0_4px_16px_rgba(0,0,0,.45)] transition-all duration-200 hover:bg-neutral-900 hover:ring-white/25 hover:shadow-[0_6px_22px_rgba(0,0,0,.55)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:ring-white/15"
              whileHover={{ scale: loading || loadingProvider ? 1 : 1.02 }}
              whileTap={{ scale: loading || loadingProvider ? 1 : 0.98 }}
            >
              {loadingProvider === 'twitter' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                /* Logotipo oficial de X (no el pájaro antiguo de Twitter). */
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                </svg>
              )}
              {loadingProvider === 'twitter' ? 'Conectando con X...' : 'Continuar con X'}
            </motion.button>
          </div>

          {/* Separador */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-pane px-3 text-husk font-mono tracking-wider">o</span>
            </div>
          </div>

          {/* Formulario email/contraseña */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Email
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-line bg-ink pl-10 pr-4 py-3 text-sm text-cream placeholder:text-husk/60 transition-all duration-200 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Contraseña
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-ink pl-10 pr-4 py-3 text-sm text-cream placeholder:text-husk/60 transition-all duration-200 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || loadingProvider !== null}
              className="w-full rounded-xl bg-honey py-3.5 font-semibold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_30px_rgba(240,164,28,.4)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: loading || loadingProvider ? 1 : 1.02 }}
              whileTap={{ scale: loading || loadingProvider ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full"
                  />
                  {isRegistering ? 'Creando cuenta...' : 'Iniciando sesión...'}
                </>
              ) : (
                isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'
              )}
            </motion.button>
          </motion.form>

          {/* Toggle registro/login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                clearError();
              }}
              className="text-sm text-husk hover:text-honey transition-colors"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear cuenta nueva'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
