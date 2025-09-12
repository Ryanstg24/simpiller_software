'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  acronym: string;
  subdomain: string;
}

interface OrganizationDeleteModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function OrganizationDeleteModal({
  organization,
  isOpen,
  onClose,
  onDelete
}: OrganizationDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const expectedText = organization?.name || '';

  const handleDelete = async () => {
    if (!organization) return;
    if (confirmText !== expectedText) return;

    setLoading(true);
    setError(null);

    try {
      // First, check if organization has any users or patients
      const [usersResult, patientsResult] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id),
        supabase
          .from('patients')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id)
      ]);

      const userCount = usersResult.count || 0;
      const patientCount = patientsResult.count || 0;

      if (userCount > 0 || patientCount > 0) {
        setError(`Cannot delete organization. It has ${userCount} users and ${patientCount} patients. Please remove all users and patients first.`);
        return;
      }

      // Delete the organization
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);

      if (error) {
        console.error('Error deleting organization:', error);
        setError('Failed to delete organization');
        return;
      }

      onDelete();
      onClose();
    } catch (err) {
      console.error('Error in handleDelete:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete Organization</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-gray-700">
              Are you sure you want to delete the organization{' '}
              <span className="font-semibold text-gray-900">&quot;{organization.name}&quot;</span>?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">This action cannot be undone.</p>
                  <p className="mt-1">
                    This will permanently delete the organization and all associated data.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-semibold text-gray-900">&quot;{organization.name}&quot;</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={organization.name}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== expectedText}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
