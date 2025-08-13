'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Save, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizations } from "@/hooks/use-organizations";
import { supabase } from "@/lib/supabase";

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFacilityModal({ isOpen, onClose, onSuccess }: AddFacilityModalProps) {
  const { isSimpillerAdmin, user } = useAuth();
  const { organizations, loading: orgLoading } = useOrganizations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOrganizationId, setUserOrganizationId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    organization_id: ''
  });

  // Get user's organization if they're not a Simpiller Admin
  useEffect(() => {
    const getUserOrganization = async () => {
      if (!isSimpillerAdmin && user) {
        try {
          const { data: userRoles, error } = await supabase
            .from('user_role_assignments')
            .select(`
              user_roles (
                organization_id
              )
            `)
            .eq('user_id', user.id);

          if (!error && userRoles && userRoles.length > 0) {
            const orgId = (userRoles[0].user_roles as any)?.organization_id;
            if (orgId) {
              setUserOrganizationId(orgId);
              setFormData(prev => ({ ...prev, organization_id: orgId }));
            }
          }
        } catch (err) {
          console.error('Error fetching user organization:', err);
        }
      }
    };

    getUserOrganization();
  }, [isSimpillerAdmin, user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('facilities')
        .insert({
          organization_id: formData.organization_id,
          name: formData.name,
          code: formData.code || null,
          street1: formData.street1 || null,
          street2: formData.street2 || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postal_code || null,
          phone: formData.phone || null,
          email: formData.email || null,
          is_active: true
        });

      if (error) {
        console.error('Error creating facility:', error);
        setError('Failed to create facility. Please try again.');
        return;
      }

      // Reset form
      setFormData({
        name: '',
        code: '',
        street1: '',
        street2: '',
        city: '',
        state: '',
        postal_code: '',
        phone: '',
        email: '',
        organization_id: userOrganizationId || ''
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Failed to create facility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="bg-white border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center text-gray-900">
              <Building2 className="h-5 w-5 mr-2" />
              Add New Facility
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Organization Selection (only for Simpiller Admins) */}
            {isSimpillerAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization *
                </label>
                <select
                  value={formData.organization_id}
                  onChange={(e) => handleInputChange('organization_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  required
                >
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.acronym})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Facility Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                placeholder="Enter facility name"
                required
              />
            </div>

            {/* Facility Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                placeholder="Enter facility code (optional)"
              />
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address 1
                </label>
                <input
                  type="text"
                  value={formData.street1}
                  onChange={(e) => handleInputChange('street1', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address 2
                </label>
                <input
                  type="text"
                  value={formData.street2}
                  onChange={(e) => handleInputChange('street2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Suite, unit, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter postal code"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || (isSimpillerAdmin && !formData.organization_id)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create Facility'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 