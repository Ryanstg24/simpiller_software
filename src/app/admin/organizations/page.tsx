'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2, Users, Globe, ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuthV2 } from "@/contexts/auth-context-v2";
import { useOrganizations, Organization } from "@/hooks/use-organizations";
import { OrganizationDetailsModal } from "@/components/admin/organization-details-modal";
import { OrganizationEditModal } from "@/components/admin/organization-edit-modal";
import { OrganizationDeleteModal } from "@/components/admin/organization-delete-modal";
import Link from "next/link";
import { useState, useMemo } from "react";

export default function OrganizationsPage() {
  const userInfo = useUserDisplay();
  const { isSimpillerAdmin } = useAuthV2();
  const { organizations, loading, error } = useOrganizations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const filteredOrganizations = useMemo(() => {
    if (!searchTerm) return organizations;
    
    return organizations.filter(org => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = org.name.toLowerCase().includes(searchLower);
      const acronymMatch = org.acronym.toLowerCase().includes(searchLower);
      const subdomainMatch = org.subdomain.toLowerCase().includes(searchLower);
      return nameMatch || acronymMatch || subdomainMatch;
    });
  }, [organizations, searchTerm]);

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const handleViewDetails = (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowDetailsModal(true);
  };

  const handleEdit = (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowEditModal(true);
  };

  const handleDelete = (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setSelectedOrganization(org);
      setShowDeleteModal(true);
    }
  };

  const handleSave = () => {
    // Refresh the organizations list
    window.location.reload();
  };

  const handleDeleteConfirm = () => {
    // Refresh the organizations list
    window.location.reload();
  };

  const closeModals = () => {
    setShowDetailsModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedOrganization(null);
  };

  if (!isSimpillerAdmin) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/organizations" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Organizations" 
              subtitle="Manage healthcare organizations"
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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/organizations" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Organizations" 
              subtitle="Manage healthcare organizations"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading organizations...</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/admin/organizations" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Organizations" 
              subtitle="Manage healthcare organizations"
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
    <ProtectedRoute requiredRoles={['simpiller_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/admin/organizations" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Organizations" 
            subtitle="Manage healthcare organizations"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                  <p className="text-gray-800">Manage healthcare organizations in the system</p>
                </div>
              </div>
              <Link href="/admin/organizations/add">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Organization
                </Button>
              </Link>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredOrganizations.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Organizations</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredOrganizations.filter(org => org.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Inactive Organizations</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredOrganizations.filter(org => !org.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrganizations.map((organization) => (
                <Card key={organization.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-900">{organization.name}</CardTitle>
                        <p className="text-sm text-gray-600">{organization.acronym}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(organization.is_active)}`}>
                        {getStatusText(organization.is_active)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Globe className="h-4 w-4 mr-2" />
                        <span className="truncate">{organization.subdomain}.simpiller.com</span>
                      </div>
                      {organization.tagline && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="truncate italic">&quot;{organization.tagline}&quot;</span>
                        </div>
                      )}
                      {organization.brand_name && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="truncate">Brand: {organization.brand_name}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewDetails(organization)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEdit(organization)}
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

            {filteredOrganizations.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first organization.'}
                </p>
                {!searchTerm && (
                  <Link href="/admin/organizations/add">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Organization
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Modals */}
        <OrganizationDetailsModal
          organization={selectedOrganization}
          isOpen={showDetailsModal}
          onClose={closeModals}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <OrganizationEditModal
          organization={selectedOrganization}
          isOpen={showEditModal}
          onClose={closeModals}
          onSave={handleSave}
        />

        <OrganizationDeleteModal
          organization={selectedOrganization}
          isOpen={showDeleteModal}
          onClose={closeModals}
          onDelete={handleDeleteConfirm}
        />
      </div>
    </ProtectedRoute>
  );
} 