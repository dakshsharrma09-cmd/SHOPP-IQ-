import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, tenant, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-purple-600 flex items-center justify-center animate-pulse-glow">
            <span className="text-white text-2xl font-heading font-bold">S</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!tenant && location.pathname !== '/register') {
    return <Navigate to="/register" replace />;
  }

  return <>{children}</>;
}
