'use client';

import { useState, useEffect } from 'react';
import { X, Save, Building2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganizations } from '@/hooks/use-organizations';
import { supabase } from '@/lib/supabase';
import { Pharmacy } from '@/hooks/use-pharmacies';

interface PharmacyModalProps {
  pharmacy: Pharmacy | null;
  isOpen: boolean;
  onClose: () => void;
  onPharmacyUpdated: () => void;
}

export function PharmacyModal({ 
  isOpen, 
  onClose, 
  onPharmacyUpdated, 
  pharmacy 
}: PharmacyModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSimpillerAdmin, userOrganizationId } = useAuth();
  const { organizations } = useOrganizations();
  
  // Form data for editing pharmacy
  const [formData, setFormData] = useState<Partial<Pharmacy>>({});
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');

  useEffect(() => {
    if (pharmacy) {
      setFormData({
        name: pharmacy.name || '',
        npi: pharmacy.npi || '',
        street1: pharmacy.street1 || '',
        street2: pharmacy.street2 || '',
        city: pharmacy.city || '',
        state: pharmacy.state || '',
        postal_code: pharmacy.postal_code || '',
        country: pharmacy.country || 'US',
        phone: pharmacy.phone || '',
        fax: pharmacy.fax || '',
        email: pharmacy.email || '',
        website: pharmacy.website || '',
        pharmacy_type: pharmacy.pharmacy_type || 'retail',
        is_partner: pharmacy.is_partner || false,
        is_default: pharmacy.is_default || false,
        api_endpoint: pharmacy.api_endpoint || '',
        api_key: pharmacy.api_key || '',
        integration_enabled: pharmacy.integration_enabled || false,
        is_active: pharmacy.is_active ?? true
      });
      setSelectedOrganizationId(pharmacy.organization_id || '');
    } else {
      // Reset form for new pharmacy
      setFormData({
        name: '',
        npi: '',
        street1: '',
        street2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US',
        phone: '',
        fax: '',
        email: '',
        website: '',
        pharmacy_type: 'retail',
        is_partner: false,
        is_default: false,
        api_endpoint: '',
        api_key: '',
        integration_enabled: false,
        is_active: true
      });
      setSelectedOrganizationId('');
    }
    
    // Clear any previous errors and success states
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, [pharmacy]);

  const handleInputChange = (field: string, value: string | boolean) => {
    // Clear any previous errors when user starts typing
    if (error) {
      setError(null);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePharmacy = async () => {
    if (!formData.name) {
      alert('Please enter a pharmacy name.');
      return;
    }

    // For non-partner pharmacies, require organization selection
    if (!formData.is_partner && !selectedOrganizationId && isSimpillerAdmin) {
      alert('Please select an organization for this pharmacy.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const pharmacyData = {
        ...formData,
        organization_id: formData.is_partner ? null : (selectedOrganizationId || userOrganizationId)
      };

      if (pharmacy?.id) {
        // Update existing pharmacy
        const { error } = await supabase
          .from('pharmacies')
          .update(pharmacyData)
          .eq('id', pharmacy.id);

        if (error) {
          console.error('Error updating pharmacy:', error);
          setError(`Failed to update pharmacy: ${error.message}`);
          setLoading(false);
          return;
        }
      } else {
        // Create new pharmacy
        const { error } = await supabase
          .from('pharmacies')
          .insert([pharmacyData]);

        if (error) {
          console.error('Error creating pharmacy:', error);
          setError(`Failed to create pharmacy: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      setIsEditing(false);
      setSuccess(true);
      setLoading(false);
      
      // Show success message for 2 seconds, then close and refresh
      setTimeout(() => {
        onPharmacyUpdated();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving pharmacy:', error);
      setError(`Failed to ${pharmacy ? 'update' : 'create'} pharmacy. Please try again.`);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {pharmacy ? `Pharmacy: ${pharmacy.name}` : 'Add New Pharmacy'}
              </h2>
              <p className="text-sm text-gray-500">
                {pharmacy ? `ID: ${pharmacy.id.slice(0, 8)}` : 'Create a new pharmacy'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && pharmacy && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={() => {
                setError(null);
                setSuccess(false);
                setLoading(false);
                onClose();
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6">
            {(isEditing || !pharmacy) ? (
              <div className="space-y-6">
                {success && (
                  <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-md">
                    ✅ Pharmacy {pharmacy ? 'updated' : 'created'} successfully! Closing in 2 seconds...
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}
                
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="e.g., CVS Pharmacy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                      <input
                        type="text"
                        value={formData.npi}
                        onChange={(e) => handleInputChange('npi', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="National Provider Identifier"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Type</label>
                      <select
                        value={formData.pharmacy_type}
                        onChange={(e) => handleInputChange('pharmacy_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="retail">Retail</option>
                        <option value="mail_order">Mail Order</option>
                        <option value="specialty">Specialty</option>
                        <option value="hospital">Hospital</option>
                        <option value="compounding">Compounding</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.is_active ? 'active' : 'inactive'}
                        onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address 1</label>
                      <input
                        type="text"
                        value={formData.street1}
                        onChange={(e) => handleInputChange('street1', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address 2</label>
                      <input
                        type="text"
                        value={formData.street2}
                        onChange={(e) => handleInputChange('street2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                      <input
                        type="tel"
                        value={formData.fax}
                        onChange={(e) => handleInputChange('fax', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_partner}
                          onChange={(e) => handleInputChange('is_partner', e.target.checked)}
                          disabled={!isSimpillerAdmin}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Partner Pharmacy
                          {!isSimpillerAdmin && (
                            <span className="text-xs text-gray-500 ml-1">(Simpiller Admin only)</span>
                          )}
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => handleInputChange('is_default', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Default Pharmacy</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.integration_enabled}
                          onChange={(e) => handleInputChange('integration_enabled', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Integration Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Organization Selection for Simpiller Admins */}
                {isSimpillerAdmin && !formData.is_partner && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Assignment</h3>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Select Organization</label>
                      <select
                        value={selectedOrganizationId}
                        onChange={(e) => setSelectedOrganizationId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select an organization</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name} ({org.acronym})
                          </option>
                        ))}
                      </select>
                      {selectedOrganizationId && (
                        <p className="text-sm text-gray-500 mt-1">
                          Selected: {organizations.find(org => org.id === selectedOrganizationId)?.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Integration Settings */}
                {formData.integration_enabled && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
                        <input
                          type="url"
                          value={formData.api_endpoint}
                          onChange={(e) => handleInputChange('api_endpoint', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="https://api.pharmacy.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => handleInputChange('api_key', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="API Key"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePharmacy}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : `${pharmacy ? 'Update' : 'Create'} Pharmacy`}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.npi || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Type</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.pharmacy_type || 'Retail'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${pharmacy?.is_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                        {pharmacy?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <p className="text-gray-900 font-medium">
                        {pharmacy?.street1}
                        {pharmacy?.street2 && <>, {pharmacy.street2}</>}
                        {pharmacy?.city && pharmacy?.state && (
                          <>, {pharmacy.city}, {pharmacy.state} {pharmacy.postal_code}</>
                        )}
                        {!pharmacy?.street1 && !pharmacy?.city && 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.country || 'US'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.phone || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.fax || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.email || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <p className="text-gray-900 font-medium">{pharmacy?.website || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${pharmacy?.is_partner ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {pharmacy?.is_partner ? 'Partner Pharmacy' : 'Organization Pharmacy'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${pharmacy?.is_default ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {pharmacy?.is_default ? 'Default Pharmacy' : 'Not Default'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${pharmacy?.integration_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {pharmacy?.integration_enabled ? 'Integration Enabled' : 'Integration Disabled'}
                      </span>
                    </div>
                    {pharmacy?.organizations && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <p className="text-gray-900 font-medium">
                          {pharmacy.organizations.name} ({pharmacy.organizations.acronym})
                        </p>
                      </div>
                    )}
                    {pharmacy?.is_partner && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Partner Status</label>
                        <p className="text-gray-900 font-medium">
                          This is a Simpiller partner pharmacy available to all organizations
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 