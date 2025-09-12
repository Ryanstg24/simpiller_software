'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Building2, Globe, Users, Calendar, Edit, Trash2 } from 'lucide-react';
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
  created_at?: string;
  updated_at?: string;
}

interface OrganizationDetailsModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (organization: Organization) => void;
  onDelete: (organizationId: string) => void;
}

export function OrganizationDetailsModal({
  organization,
  isOpen,
  onClose,
  onEdit,
  onDelete
}: OrganizationDetailsModalProps) {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalPatients: number;
    totalFacilities: number;
  }>({
    totalUsers: 0,
    totalPatients: 0,
    totalFacilities: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchOrganizationStats = useCallback(async () => {
    if (!organization) return;

    setLoading(true);
    try {
      const [usersResult, patientsResult, facilitiesResult] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id),
        supabase
          .from('patients')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id),
        supabase
          .from('facilities')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id)
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalPatients: patientsResult.count || 0,
        totalFacilities: facilitiesResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching organization stats:', error);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    if (isOpen && organization) {
      fetchOrganizationStats();
    }
  }, [isOpen, organization, fetchOrganizationStats]);

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Organization Details</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <p className="text-lg font-semibold text-gray-900">{organization.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acronym</label>
                <p className="text-gray-900">{organization.acronym}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{organization.subdomain}.simpiller.com</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  organization.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {organization.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {organization.brand_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                  <p className="text-gray-900">{organization.brand_name}</p>
                </div>
              )}
              {organization.tagline && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                  <p className="text-gray-900 italic">&quot;{organization.tagline}&quot;</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Statistics</h3>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Patients</p>
                      <p className="text-2xl font-bold text-green-900">{stats.totalPatients}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Total Facilities</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.totalFacilities}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          {(organization.created_at || organization.updated_at) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organization.created_at && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Created</p>
                      <p className="text-sm text-gray-600">
                        {new Date(organization.created_at).toLocaleDateString()} at{' '}
                        {new Date(organization.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
                {organization.updated_at && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Updated</p>
                      <p className="text-sm text-gray-600">
                        {new Date(organization.updated_at).toLocaleDateString()} at{' '}
                        {new Date(organization.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => onDelete(organization.id)}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Organization
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onEdit(organization)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Organization
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
