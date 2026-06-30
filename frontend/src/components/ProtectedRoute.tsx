import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  recurso?: string;
  campo?: string;
}

export default function ProtectedRoute({ children, recurso, campo = 'pode_ver' }: Props) {
  const { usuario, carregando, temPermissao } = useAuth();

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (recurso && !temPermissao(recurso, campo)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return <>{children}</>;
}
