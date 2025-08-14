'use client';

import { useState, useEffect } from 'react';
import { X, Edit, Save, User as UserIcon, Shield, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/hooks/use-users';

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

interface UserRole {
  name: string;
  organization_id?: string;
  organization?: {
    name: string;
    acronym: string;
  };
}

interface Organization {
  id: string;
  name: string;
  acronym: string;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  npi: string;
  is_active: boolean;
  user_roles: UserRole[];
}

export function UserDetailsModal({ user, isOpen, onClose, onUserUpdated }: UserDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form data for editing user
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    npi: '',
    is_active: true,
    user_roles: []
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        npi: user.npi || '',
        is_active: user.is_active ?? true,
        user_roles: user.user_roles || []
      });
    }
  }, [user]);

  const handleSaveUser = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Update user basic information
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          npi: formData.npi,
          is_active: formData.is_active
        })
        .eq('id', user.id);

      if (userError) {
        console.error('Error updating user:', userError);
        alert('Failed to update user. Please try again.');
        return;
      }

      // Update user roles (this would need more complex logic for role management)
      // For now, we'll just show a success message
      
      setIsEditing(false);
      onUserUpdated();
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-sm text-gray-500">User ID: {user.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                      <input
                        type="text"
                        value={formData.npi}
                        onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="National Provider Identifier"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUser}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <p className="text-gray-900 font-medium">{user.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <p className="text-gray-900 font-medium">{user.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900 font-medium">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-gray-900 font-medium">{user.phone || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                      <p className="text-gray-900 font-medium">{user.npi || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.is_active)}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                      <p className="text-gray-900 font-medium font-mono text-sm">{user.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                      <p className="text-gray-900 font-medium">{formatDate(user.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Roles and Permissions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Roles and Permissions</h3>
                  {user.user_roles && user.user_roles.length > 0 ? (
                    <div className="space-y-3">
                      {user.user_roles.map((role: UserRole, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{role.name}</p>
                              {role.organization && (
                                <p className="text-xs text-gray-600">
                                  Organization: {role.organization.name} ({role.organization.acronym})
                                </p>
                              )}
                            </div>
                          </div>
                          <Tag className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No roles assigned</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 