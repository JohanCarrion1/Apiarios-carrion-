import { useNavigate, useParams, Navigate } from 'react-router-dom';
import ApiarySelector from './ApiarySelector';
import ApiaryDashboard from './ApiaryDashboard';

export default function ApiaryFlow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Si hay un ID en la URL, navegar al dashboard de ese apiario específico
  if (id) {
    return <Navigate to={`/dashboard/${id}`} replace />;
  }

  // Si no hay ID en la URL, mostrar la lista
  return <ApiarySelector />;
}
