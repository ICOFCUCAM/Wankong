import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children:      ReactNode;
  /** If set, user must have this role (or one of these roles) in user_roles table */
  requiredRole?: UserRole | UserRole[] | 'admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, userRole, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (requiredRole) {
    // Admin check
    if (requiredRole === 'admin') {
      if (!isAdmin) return <AccessDenied />;
    } else {
      // Role check against user_roles table
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!userRole || !allowed.includes(userRole)) {
        return <AccessDenied />;
      }
    }
  }

  return <>{children}</>;
}

// ── Access denied screen ───────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-4">🚫</p>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-white/50 mb-6">You don't have permission to view this page.</p>
        <a href="/" className="px-6 py-3 bg-[#00D9FF] text-[#0B0814] font-bold rounded-xl">
          Go Home
        </a>
      </div>
    </div>
  );
}
