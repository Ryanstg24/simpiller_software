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
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

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
      setIsEditing(false); // View mode for existing users
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
      setIsEditing(true); // Edit mode for new users
    }
    // Reset states when modal opens/closes
    setGeneratedPassword('');
    setShowPassword(false);
    setSuccess(false);
    setLoading(false);
    setValidationErrors([]);
    setCopySuccess(false);
  }, [user, isOpen]);

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
    // Clear previous validation errors
    setValidationErrors([]);
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.first_name?.trim()) {
      errors.push('First name is required');
    }
    
    if (!formData.last_name?.trim()) {
      errors.push('Last name is required');
    }
    
    if (!formData.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (selectedRoles.length === 0) {
      errors.push('Please select at least one role');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
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
        setSuccess(true);
        
        // Auto-close modal after 10 seconds
        setTimeout(() => {
          setShowPassword(false);
          setGeneratedPassword('');
          setSuccess(false);
          onUserUpdated();
          onClose();
        }, 10000);
        
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
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
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
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-green-800 mb-2">
                        User Created Successfully!
                      </h3>
                      <p className="text-green-700">
                        A temporary password has been generated. Please copy and share it securely with the new user.
                      </p>
                    </div>
                    
                    {/* Password Display - Large and Copyable */}
                    <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temporary Password
                        </label>
                        <div className="flex items-center justify-center space-x-3">
                          <input
                            type="text"
                            value={generatedPassword}
                            readOnly
                            className="font-mono text-xl font-bold text-green-600 bg-gray-50 border border-gray-300 rounded px-3 py-2 text-center w-full max-w-md"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPassword);
                              setCopySuccess(true);
                              setTimeout(() => setCopySuccess(false), 2000);
                            }}
                            className={`px-4 py-2 rounded transition-colors ${
                              copySuccess 
                                ? 'bg-green-600 text-white' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {copySuccess ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Important Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-2">Important Instructions:</h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Share this password securely with the new user</li>
                            <li>• The user will be forced to change their password on first login</li>
                            <li>• This temporary password will only be shown once</li>
                            <li>• Save this password somewhere safe until the user logs in</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Auto-close notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                      <p className="text-sm text-blue-700 text-center">
                        <strong>Note:</strong> This modal will automatically close in 10 seconds and refresh the user list.
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => {
                          setShowPassword(false);
                          setGeneratedPassword('');
                          setSuccess(false);
                          onUserUpdated();
                          onClose();
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-8"
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