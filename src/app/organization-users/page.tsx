'use client';

import { useState, useMemo } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuth } from "@/contexts/auth-context";
import { useUsers, User } from "@/hooks/use-users";
import { OrganizationUserModal } from "@/components/organization/organization-user-modal";
import { AccessDenied } from "@/components/auth/access-denied";
import { Search } from "lucide-react";

export default function OrganizationUsersPage() {
  const userInfo = useUserDisplay();
  const { isOrganizationAdmin, userOrganizationId } = useAuth();
  const { users, loading, error } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter users by organization
  const organizationUsers = useMemo(() => {
    if (!userOrganizationId) return [];
    return users.filter(user => 
      user.user_roles?.some(role => role.organization_id === userOrganizationId)
    );
  }, [users, userOrganizationId]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return organizationUsers;
    
    return organizationUsers.filter(user => 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizationUsers, searchTerm]);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleUserUpdated = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOrganizationAdmin) {
    return (
      <ProtectedRoute requiredRoles={['organization_admin']}>
        <AccessDenied />
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['organization_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/organization-users" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Organization Users" 
              subtitle="Manage users in your organization"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading users...</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['organization_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/organization-users" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Organization Users" 
              subtitle="Manage users in your organization"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Error: {error}</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['organization_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/organization-users" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Organization Users" 
            subtitle="Manage users in your organization"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organization Users</h1>
                <p className="text-gray-800">Manage providers and billing users in your organization</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  setSelectedUser(null);
                  setIsModalOpen(true);
                }}
              >
                Add User
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
                    <p className="text-sm font-medium text-gray-600 ml-2">Total Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">{filteredUsers.filter(user => user.is_active).length}</p>
                    <p className="text-sm font-medium text-gray-600 ml-2">Active Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">
                        {filteredUsers.filter(user => 
                          user.user_roles?.some(role => role.name === 'provider')
                        ).length}
                      </p>
                    <p className="text-sm font-medium text-gray-600 ml-2">Providers</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">
                        {filteredUsers.filter(user => 
                          user.user_roles?.some(role => role.name === 'billing')
                        ).length}
                      </p>
                    <p className="text-sm font-medium text-gray-600 ml-2">Billing Users</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{user.first_name} {user.last_name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span>Phone: {user.phone}</span>
                        </div>
                      )}
                      {user.npi && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span>NPI: {user.npi}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <span>Joined: {formatDate(user.created_at)}</span>
                      </div>
                      {user.user_roles && user.user_roles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {user.user_roles.map((role, index) => (
                            <div key={index} className="flex items-center">
                              <span className="text-xs text-gray-500">
                                {role.name}
                                {role.organization && ` (${role.organization.acronym})`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewUser(user)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewUser(user)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first user.'}
                </p>
                {!searchTerm && (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setSelectedUser(null);
                      setIsModalOpen(true);
                    }}
                  >
                    Add User
                  </Button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Organization User Modal */}
      <OrganizationUserModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        onUserUpdated={handleUserUpdated}
      />
    </ProtectedRoute>
  );
} 