'use client';

import { useState, useEffect } from 'react';
import { X, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
}

export function PasswordChangeModal({ 
  isOpen, 
  onClose, 
  onPasswordChanged 
}: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLoadingStep('');

    // Set a timeout to force close the modal if it gets stuck (safety net only)
    const forceCloseTimeout = setTimeout(() => {
      console.log('Force closing password change modal due to timeout - this should not happen normally');
      setLoading(false);
      onPasswordChanged();
      onClose();
    }, 30000); // 30 second timeout - should be plenty of time
    setTimeoutId(forceCloseTimeout);

    // Validate passwords
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      return;
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
    if (commonPasswords.includes(newPassword.toLowerCase())) {
      setError('Please choose a stronger password. This password is too common.');
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      return;
    }

    try {
      console.log('Starting password change process...');
      setLoadingStep('Changing password...');
      
      // Change password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        
        // Handle specific error cases
        if (error.message.includes('New password should be different from the old password')) {
          setError('Please choose a different password than your current temporary password.');
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long.');
        } else {
          setError(`Failed to change password: ${error.message}`);
        }
        
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      console.log('Password changed successfully in Supabase Auth');

      // Get the current user ID
      console.log('Getting current user...');
      setLoadingStep('Updating user record...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setError('Failed to update user record. Please try again.');
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      console.log('Got user ID:', user.id);

      // Update the user record to remove the password change requirement
      console.log('Updating user record in database...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_change_required: false })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user record:', updateError);
        // Don't fail the whole operation - password was changed successfully
        console.log('Password changed successfully, but database update failed. Proceeding anyway.');
      } else {
        console.log('Password changed and database updated successfully');
      }

      // Success - show success message briefly then close
      console.log('Password change process completed successfully');
      setLoadingStep('Complete!');
      setSuccess(true);
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
      
      // Show success message for 2 seconds then close
      setTimeout(async () => {
        console.log('Closing password change modal');
        onPasswordChanged();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error in password change:', err);
      setError('Failed to change password. Please try again.');
      setLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <Lock className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Change Your Password
              </h2>
              <p className="text-sm text-gray-500">
                Please set a new password for your account
              </p>
            </div>
          </div>
          {!success && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800">Password Changed Successfully!</h3>
              <p className="text-green-700">Your account is now ready. Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {loading && loadingStep && (
                <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>{loadingStep}</span>
                  </div>
                </div>
              )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Security Notice</p>
                  <p className="mt-1">
                    You&apos;re using a temporary password. Please set a new, secure password for your account.
                  </p>
                  <p className="mt-2 text-xs">
                    <strong>Requirements:</strong> At least 8 characters, different from your current password, and not a common password.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Confirm new password"
                required
              />
            </div>

              {/* Form Actions */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Allow user to skip password change (use with caution)
                      if (confirm('Are you sure you want to skip changing your password? You can change it later in settings.')) {
                        if (timeoutId) clearTimeout(timeoutId);
                        onPasswordChanged();
                        onClose();
                      }
                    }}
                    className="text-gray-600"
                  >
                    Skip for Now
                  </Button>
                  {loading && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (confirm('Force close the password change modal? This will proceed to the dashboard.')) {
                          if (timeoutId) clearTimeout(timeoutId);
                          setLoading(false);
                          onPasswordChanged();
                          onClose();
                        }
                      }}
                      className="text-red-600 border-red-300"
                    >
                      Force Close
                    </Button>
                  )}
                  {/* Debug button - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const response = await fetch('/api/admin/reset-password-requirement', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.id })
                            });
                            if (response.ok) {
                              alert('Password requirement reset. Refreshing...');
                              window.location.reload();
                            }
                          }
                        } catch (error) {
                          console.error('Error resetting password requirement:', error);
                        }
                      }}
                      className="text-red-600 border-red-300"
                    >
                      Debug: Reset
                    </Button>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !newPassword || !confirmPassword}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? (loadingStep || 'Changing Password...') : 'Change Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
