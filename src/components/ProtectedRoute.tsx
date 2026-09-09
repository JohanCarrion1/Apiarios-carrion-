import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import { IconBee } from '../ui';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Si está autenticado, mostrar el contenido protegido
  return <>{children}</>;
}
