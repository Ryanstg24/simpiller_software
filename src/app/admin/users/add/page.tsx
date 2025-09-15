'use client';

import { useState } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Users, Mail, Shield, Globe } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizations } from "@/hooks/use-organizations";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddUserPage() {
  const userInfo = useUserDisplay();
  const { isSimpillerAdmin } = useAuth();
  const { organizations } = useOrganizations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    npi: '',
    license_number: '',
    specialty: '',
    organization_id: '',
    role: '',
    is_active: true
  });

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

    console.log('🚀 Starting user creation with data:', formData);

    try {
      // Transform form data to match API expectations
      const requestData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        npi: formData.npi || null,
        license_number: formData.license_number || null,
        specialty: formData.specialty || null,
        is_active: formData.is_active,
        organization_id: formData.organization_id || null,
        roles: formData.role ? [formData.role] : [] // Convert single role to array
      };

      console.log('📤 Sending request data:', requestData);

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Error creating user:', result);
        setError(result.error || 'Failed to create user. Please try again.');
        return;
      }

      console.log('✅ User created successfully:', result);

      // Redirect to users list
      router.push('/admin/users');
    } catch (err) {
      console.error('💥 Error in handleSubmit:', err);
      setError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSimpillerAdmin) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/users/add" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Add User" 
              subtitle="Create a new system user"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Access Denied: Simpiller Admin access required</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['simpiller_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/admin/users/add" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Add User" 
            subtitle="Create a new system user"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <Link href="/admin/users">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Users
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
                  <p className="text-gray-800">Create a new system user with appropriate roles</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Users className="h-5 w-5 mr-2" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Enter first name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Enter last name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter password"
                        required
                        minLength={6}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Mail className="h-5 w-5 mr-2" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        NPI Number
                      </label>
                      <input
                        type="text"
                        value={formData.npi}
                        onChange={(e) => handleInputChange('npi', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter NPI number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.license_number}
                        onChange={(e) => handleInputChange('license_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter license number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specialty
                      </label>
                      <input
                        type="text"
                        value={formData.specialty}
                        onChange={(e) => handleInputChange('specialty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter specialty"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Role Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Shield className="h-5 w-5 mr-2" />
                      Role Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required
                      >
                        <option value="">Select a role</option>
                        <option value="simpiller_admin">Simpiller Admin</option>
                        <option value="organization_admin">Organization Admin</option>
                        <option value="provider">Provider</option>
                        <option value="billing">Billing</option>
                      </select>
                    </div>

                    {formData.role && formData.role !== 'simpiller_admin' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Organization *
                        </label>
                        <select
                          value={formData.organization_id}
                          onChange={(e) => handleInputChange('organization_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  </CardContent>
                </Card>

                {/* Account Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Globe className="h-5 w-5 mr-2" />
                      Account Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Shield className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">
                            Account will be created as Active
                          </h3>
                          <p className="text-sm text-green-700 mt-1">
                            The user will be able to sign in immediately after creation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <Link href="/admin/users">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 