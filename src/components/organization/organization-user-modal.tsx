'use client';

import { useState, useEffect } from 'react';
import { X, Save, User, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { User as UserType } from '@/hooks/use-users';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface OrganizationUserModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

export function OrganizationUserModal({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated 
}: OrganizationUserModalProps) {
  const { isOrganizationAdmin, userOrganizationId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    npi: '',
    license_number: '',
    specialty: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

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

  // Check authorization after all hooks
  if (!isOrganizationAdmin) {
    return null; // Don't render if not authorized
  }

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

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
        const tempPassword = generateTemporaryPassword();
        setGeneratedPassword(tempPassword);
        
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([{
            ...formData,
            encrypted_password: tempPassword, // This should be hashed in production
            password_change_required: true // Force password change on first login
          }])
          .select()
          .single();

        if (userError) {
          console.error('Error creating user:', userError);
          alert('Failed to create user. Please try again.');
          return;
        }

        // Create user roles
        await createUserRoles(newUser.id, selectedRoles);
        
        // Show success with password info
        setShowPassword(true);
        return; // Don't close modal yet, show password info
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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
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
                        placeholder="Professional license number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                      <input
                        type="text"
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Medical specialty"
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

                {/* Role Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">User Roles</h3>
                  <div className="space-y-3">
                    {['provider', 'billing'].map((role) => (
                      <label key={role} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role)}
                          onChange={() => handleRoleToggle(role)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Password Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Password Setup</p>
                      <p className="mt-1">
                        A secure temporary password will be automatically generated when you create this user. 
                        The user will be required to change their password on first login for security.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveUser}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Saving...' : 'Save User'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Password Display for New Users */}
                {showPassword && generatedPassword && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-green-800 mb-3">
                      ✅ User Created Successfully!
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm text-green-700">
                        A temporary password has been generated for the new user. Please share this information securely:
                      </p>
                      <div className="bg-white border border-green-300 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Temporary Password:</span>
                          <span className="font-mono text-lg font-bold text-green-600">{generatedPassword}</span>
                        </div>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p><strong>Important:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Share this password securely with the new user</li>
                          <li>The user will be prompted to change their password on first login</li>
                          <li>This temporary password will only be shown once</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button 
                        onClick={() => {
                          setShowPassword(false);
                          setGeneratedPassword('');
                          onUserUpdated();
                          onClose();
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}

                {/* User Details Display */}
                {!showPassword && (
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <p className="text-gray-900">{formData.first_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <p className="text-gray-900">{formData.last_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <p className="text-gray-900">{formData.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <p className="text-gray-900">{formData.phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                          <p className="text-gray-900">{formData.npi || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                          <p className="text-gray-900">{formData.license_number || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                          <p className="text-gray-900">{formData.specialty || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            formData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {formData.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* User Roles */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">User Roles</h3>
                      <div className="space-y-2">
                        {selectedRoles.length > 0 ? (
                          selectedRoles.map((role) => (
                            <span key={role} className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize mr-2">
                              {role}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500">No roles assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 