'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('simpiller_admin' | 'organization_admin' | 'provider' | 'billing')[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback 
}: ProtectedRouteProps) {
  const { user, isLoading, isSimpillerAdmin, isOrganizationAdmin, isProvider, isBilling, signOut } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/login');
    }
  }, [user, isLoading, router, isRedirecting]);

  // Show loading while checking auth
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

  // Don't render anything while redirecting
  if (isRedirecting) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null;
  }

  // Check role requirements using boolean flags
  if (requiredRoles.length > 0) {
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
      return fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-800 mb-4">
              You don&apos;t have permission to access this page.
            </p>
            <button
              onClick={() => signOut()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
} 