'use client';

import { useState, useEffect } from 'react';
import { X, Building2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  acronym: string;
  subdomain: string;
  brand_name?: string;
  tagline?: string;
  is_active: boolean;
}

interface OrganizationEditModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (organization: Organization) => void;
}

export function OrganizationEditModal({
  organization,
  isOpen,
  onClose,
  onSave
}: OrganizationEditModalProps) {
  const [formData, setFormData] = useState<Partial<Organization>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && organization) {
      setFormData({
        name: organization.name,
        acronym: organization.acronym,
        subdomain: organization.subdomain,
        brand_name: organization.brand_name || '',
        tagline: organization.tagline || '',
        is_active: organization.is_active
      });
      setError(null);
      setSubdomainError(null);
    }
  }, [isOpen, organization]);

  const handleInputChange = (field: keyof Organization, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear subdomain error when user starts typing
    if (field === 'subdomain') {
      setSubdomainError(null);
    }
  };

  const validateSubdomain = async (subdomain: string) => {
    if (!subdomain) return true;
    
    // Check if subdomain is already taken by another organization
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .neq('id', organization?.id || '');

    if (error) {
      console.error('Error checking subdomain:', error);
      return false;
    }

    return data.length === 0;
  };

  const handleSubdomainBlur = async () => {
    if (!formData.subdomain) return;

    const isValid = await validateSubdomain(formData.subdomain);
    if (!isValid) {
      setSubdomainError('This subdomain is already taken');
    } else {
      setSubdomainError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) return;

    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        setError('Organization name is required');
        return;
      }
      if (!formData.acronym?.trim()) {
        setError('Acronym is required');
        return;
      }
      if (!formData.subdomain?.trim()) {
        setError('Subdomain is required');
        return;
      }

      // Check subdomain availability
      const isSubdomainValid = await validateSubdomain(formData.subdomain);
      if (!isSubdomainValid) {
        setSubdomainError('This subdomain is already taken');
        return;
      }

      // Update organization
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: formData.name?.trim(),
          acronym: formData.acronym?.trim(),
          subdomain: formData.subdomain?.trim(),
          brand_name: formData.brand_name?.trim() || null,
          tagline: formData.tagline?.trim() || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating organization:', error);
        setError('Failed to update organization');
        return;
      }

      onSave(data);
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Edit Organization</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter organization name"
                required
              />
            </div>

            {/* Acronym */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acronym *
              </label>
              <input
                type="text"
                value={formData.acronym || ''}
                onChange={(e) => handleInputChange('acronym', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., RSGH"
                required
              />
            </div>

            {/* Subdomain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subdomain *
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={formData.subdomain || ''}
                  onChange={(e) => handleInputChange('subdomain', e.target.value)}
                  onBlur={handleSubdomainBlur}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ryanstgeorge"
                  required
                />
                <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                  .simpiller.com
                </span>
              </div>
              {subdomainError && (
                <p className="mt-1 text-sm text-red-600">{subdomainError}</p>
              )}
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={formData.brand_name || ''}
                onChange={(e) => handleInputChange('brand_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional brand name"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Tagline */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagline
              </label>
              <textarea
                value={formData.tagline || ''}
                onChange={(e) => handleInputChange('tagline', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional tagline or description"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
