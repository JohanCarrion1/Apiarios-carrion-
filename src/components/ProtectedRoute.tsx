import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { IconBee } from '../ui';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, loading } = useAuth();

  console.log('🟢 [PROTECTED] Renderizando ProtectedRoute');
  console.log('🟢 [PROTECTED] Loading:', loading);
  console.log('🟢 [PROTECTED] User:', user ? user.uid : 'null');
  console.log('🟢 [PROTECTED] Location:', location.pathname);

  // Log cuando cambia el estado de autenticación
  useEffect(() => {
    console.log('🟢 [PROTECTED] useEffect ejecutado - User cambió:', user ? user.uid : 'null');
  }, [user]);

  // Mostrar loading mientras verifica la sesión
  if (loading) {
    console.log('🟢 [PROTECTED] Mostrando loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            className="hexclip flex h-16 w-14 items-center justify-center bg-honey text-ink"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <IconBee className="h-8 w-8" />
          </motion.div>
          <p className="text-husk font-mono text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    console.log('🟢 [PROTECTED] Redirigiendo a /login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Si está autenticado, mostrar el contenido protegido
  console.log('✅ [PROTECTED] Usuario autenticado, mostrando contenido protegido');
  return <>{children}</>;
}
