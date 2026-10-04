import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

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
    return <LoadingScreen size="lg" label="Cargando..." fullScreen />;
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
