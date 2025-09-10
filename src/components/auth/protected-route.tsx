'use client';

import { useAuth } from '@/contexts/auth-context';
import { AccessDenied } from './access-denied';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, requiredRoles, fallback }: ProtectedRouteProps) {
  const { user, isLoading, isSimpillerAdmin, isOrganizationAdmin, isProvider, isBilling } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check role requirements if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => {
      switch (role) {
        case 'simpiller_admin':
          return isSimpillerAdmin;
        case 'organization_admin':
          return isSimpillerAdmin || isOrganizationAdmin;
        case 'provider':
          return isSimpillerAdmin || isOrganizationAdmin || isProvider;
        case 'billing':
          return isSimpillerAdmin || isOrganizationAdmin || isProvider || isBilling;
        default:
          return false;
      }
    });
    
    if (!hasRequiredRole) {
      return fallback || <AccessDenied />;
    }
  }

  return <>{children}</>;
} 