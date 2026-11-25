import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingSkeleton } from './LoadingSkeleton';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B18] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-violet-300 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Restoring your session...</span>
          </div>
          <LoadingSkeleton className="h-10 w-48 mx-auto" />
          <LoadingSkeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
