'use client';

import { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // Change password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        setError(`Failed to change password: ${error.message}`);
        return;
      }

      // Update the user record to remove the password change requirement
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_change_required: false })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (updateError) {
        console.error('Error updating user record:', updateError);
        // Don't fail the whole operation if this fails
      }

      // Success - close modal and notify parent
      onPasswordChanged();
      onClose();
    } catch (err) {
      console.error('Error in password change:', err);
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
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
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                {error}
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
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={loading || !newPassword || !confirmPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
