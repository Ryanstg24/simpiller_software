'use client';

import { useAuth } from '@/contexts/auth-context';
import { PasswordChangeModal } from './password-change-modal';
import { useState } from 'react';

interface PasswordChangeWrapperProps {
  children: React.ReactNode;
}

export function PasswordChangeWrapper({ children }: PasswordChangeWrapperProps) {
  const { passwordChangeRequired, setPasswordChangeRequired, refreshSession } = useAuth();

  // Show modal if password change is required
  if (passwordChangeRequired) {
    return (
      <>
        <PasswordChangeModal
          isOpen={true}
          onClose={() => {
            // Don't allow closing - user must change password
          }}
          onPasswordChanged={async () => {
            setPasswordChangeRequired(false);
            // Refresh user data from database to ensure password_change_required is updated
            await refreshSession();
          }}
        />
        {/* Show a minimal loading screen while password change is required */}
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-800">Setting up your account...</p>
          </div>
        </div>
      </>
    );
  }

  // If no password change required, show children normally
  return <>{children}</>;
}
