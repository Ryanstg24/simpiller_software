'use client';

import { useState, useEffect } from 'react';
import { X, Edit, Save, User, Mail, Phone, Shield, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import type { User as UserType } from '@/hooks/use-users';

interface OrganizationUserModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

export function OrganizationUserModal({ user, isOpen, onClose, onUserUpdated }: OrganizationUserModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId } = useAuth();
  
  // Form data for editing user
  const [formData, setFormData] = useState<Partial<UserType>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        npi: user.npi || '',
        license_number: user.license_number || '',
        specialty: user.specialty || '',
        is_active: user.is_active ?? true
      });
      setSelectedRoles(user.user_roles?.map(role => role.name) || []);
    } else {
      // Reset form for new user
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        npi: '',
        license_number: '',
        specialty: '',
        is_active: true
      });
      setSelectedRoles([]);
    }
  }, [user]);

  const handleSaveUser = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please enter first name, last name, and email.');
      return;
    }

    if (selectedRoles.length === 0) {
      alert('Please select at least one role.');
      return;
    }

    try {
      setLoading(true);

      if (user?.id) {
        // Update existing user
        const { error: userError } = await supabase
          .from('users')
          .update(formData)
          .eq('id', user.id);

        if (userError) {
          console.error('Error updating user:', userError);
          alert('Failed to update user. Please try again.');
          return;
        }

        // Update user roles
        await updateUserRoles(user.id, selectedRoles);
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([formData])
          .select()
          .single();

        if (userError) {
          console.error('Error creating user:', userError);
          alert('Failed to create user. Please try again.');
          return;
        }

        // Create user roles
        await createUserRoles(newUser.id, selectedRoles);
      }

      setIsEditing(false);
      onUserUpdated();
      alert(`User ${user ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving user:', error);
      alert(`Failed to ${user ? 'update' : 'create'} user. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const createUserRoles = async (userId: string, roles: string[]) => {
    // First, get the role IDs for the selected roles
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .in('name', roles)
      .eq('organization_id', userOrganizationId);

    if (roleError) {
      console.error('Error fetching roles:', roleError);
      throw new Error('Failed to fetch roles');
    }

    // Create user role assignments
    const roleAssignments = roleData.map(role => ({
      user_id: userId,
      role_id: role.id
    }));

    const { error: assignmentError } = await supabase
      .from('user_role_assignments')
      .insert(roleAssignments);

    if (assignmentError) {
      console.error('Error creating role assignments:', assignmentError);
      throw new Error('Failed to assign roles');
    }
  };

  const updateUserRoles = async (userId: string, roles: string[]) => {
    // First, remove all existing role assignments for this user
    const { error: deleteError } = await supabase
      .from('user_role_assignments')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing role assignments:', deleteError);
      throw new Error('Failed to update roles');
    }

    // Then create new role assignments
    await createUserRoles(userId, roles);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user ? `User: ${user.first_name} ${user.last_name}` : 'Add New User'}
              </h2>
              <p className="text-sm text-gray-500">
                {user ? `ID: ${user.id.slice(0, 8)}` : 'Create a new user in your organization'}
              </p>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      <input
                        type="text"
                        value={formData.license_number}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="License number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                      <input
                        type="text"
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Medical specialty"
                      />
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Roles *</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes('provider')}
                        onChange={() => handleRoleToggle('provider')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Provider</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes('billing')}
                        onChange={() => handleRoleToggle('billing')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Billing</span>
                    </label>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                    <span>{loading ? 'Saving...' : `${user ? 'Update' : 'Create'} User`}</span>
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
                      <p className="text-gray-900 font-medium">{user?.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <p className="text-gray-900 font-medium">{user?.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900 font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-gray-900 font-medium">{user?.phone || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                      <p className="text-gray-900 font-medium">{user?.npi || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      <p className="text-gray-900 font-medium">{user?.license_number || 'Not specified'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                      <p className="text-gray-900 font-medium">{user?.specialty || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Roles</h3>
                  <div className="flex flex-wrap gap-2">
                    {user?.user_roles?.map((role, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {role.name}
                      </span>
                    )) || 'No roles assigned'}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user?.is_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 