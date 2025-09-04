'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2, Phone, Mail, MapPin, Shield } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useAuth } from "@/contexts/auth-context";
import { usePharmacies } from "@/hooks/use-pharmacies";
import { useState, useMemo } from "react";
import { PharmacyModal } from "@/components/pharmacies/pharmacy-modal";
import { Pharmacy } from "@/hooks/use-pharmacies";

export default function PharmaciesPage() {
  const userInfo = useUserDisplay();
  const { isSimpillerAdmin, isOrganizationAdmin } = useAuth();
  const { pharmacies, loading, error, deletePharmacy, refresh } = usePharmacies();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredPharmacies = useMemo(() => {
    if (!searchTerm) return pharmacies;
    
    return pharmacies.filter(pharmacy => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = pharmacy.name.toLowerCase().includes(searchLower);
      const npiMatch = pharmacy.npi?.toLowerCase().includes(searchLower);
      const cityMatch = pharmacy.city?.toLowerCase().includes(searchLower);
      return nameMatch || npiMatch || cityMatch;
    });
  }, [pharmacies, searchTerm]);

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const handleViewPharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setIsModalOpen(true);
  };

  const handlePharmacyUpdated = () => {
    // Refresh pharmacies data to show the newly created/updated pharmacy
    refresh();
  };

  const handleEditClick = (pharmacy: Pharmacy) => {
    // setEditingPharmacy(pharmacy); // This line was removed
    // setFormData({ // This line was removed
    //   name: pharmacy.name, // This line was removed
    //   street1: pharmacy.street1 || '', // This line was removed
    //   phone: pharmacy.phone || '', // This line was removed
    //   email: pharmacy.email || '', // This line was removed
    //   is_partner: pharmacy.is_partner || false, // This line was removed
    // }); // This line was removed
    // setShowModal(true); // This line was removed
  };

  const handleDeleteClick = async (pharmacy: Pharmacy) => {
    if (window.confirm(`Are you sure you want to delete ${pharmacy.name}?`)) {
      try {
        await deletePharmacy(pharmacy.id);
      } catch (error) {
        console.error('Error deleting pharmacy:', error);
        alert('Failed to delete pharmacy');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isSimpillerAdmin && !isOrganizationAdmin) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/pharmacies" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Pharmacies" 
              subtitle="Manage pharmacies"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Access Denied: Admin access required</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/pharmacies" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Pharmacies" 
              subtitle="Manage pharmacies"
              user={{ name: userInfo.name, initials: userInfo.name, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <div className="text-gray-500">Loading pharmacies...</div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/pharmacies" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Pharmacies" 
              subtitle="Manage pharmacies"
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
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/pharmacies" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Pharmacies" 
            subtitle="Manage pharmacies"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
                <p className="text-gray-800">
                  {isSimpillerAdmin 
                    ? 'Manage all pharmacies and partner pharmacies' 
                    : 'Manage pharmacies for medication dispensing'
                  }
                </p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  setSelectedPharmacy(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isSimpillerAdmin ? 'Add Pharmacy' : 'Add Organization Pharmacy'}
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pharmacies</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredPharmacies.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Pharmacies</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredPharmacies.filter(pharmacy => pharmacy.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Partner Pharmacies</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {filteredPharmacies.filter(pharmacy => pharmacy.is_partner).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Integrated</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {filteredPharmacies.filter(pharmacy => pharmacy.integration_enabled).length}
                      </p>
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
                  placeholder="Search pharmacies by name, NPI, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Pharmacies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPharmacies.map((pharmacy) => (
                <Card key={pharmacy.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-900">
                          {pharmacy.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {pharmacy.pharmacy_type || 'Retail'} Pharmacy
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pharmacy.is_active)}`}>
                          {getStatusText(pharmacy.is_active)}
                        </div>
                        {pharmacy.is_partner && (
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Partner
                          </div>
                        )}
                        {pharmacy.is_default && (
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Default
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pharmacy.npi && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Shield className="h-4 w-4 mr-2" />
                          <span>NPI: {pharmacy.npi}</span>
                        </div>
                      )}
                      {pharmacy.city && pharmacy.state && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{pharmacy.city}, {pharmacy.state}</span>
                        </div>
                      )}
                      {pharmacy.organizations && !pharmacy.is_partner && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>{pharmacy.organizations.name} ({pharmacy.organizations.acronym})</span>
                        </div>
                      )}
                      {pharmacy.is_partner && (
                        <div className="flex items-center text-sm text-purple-600">
                          <Shield className="h-4 w-4 mr-2" />
                          <span>Simpiller Partner Pharmacy</span>
                        </div>
                      )}
                      {pharmacy.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{pharmacy.phone}</span>
                        </div>
                      )}
                      {pharmacy.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>{pharmacy.email}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span>Created: {formatDate(pharmacy.created_at)}</span>
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewPharmacy(pharmacy)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditClick(pharmacy)}
                            disabled={pharmacy.is_partner && !isSimpillerAdmin}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleDeleteClick(pharmacy)}
                            disabled={pharmacy.is_partner && !isSimpillerAdmin}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPharmacies.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pharmacies found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first pharmacy.'}
                </p>
                {!searchTerm && (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setSelectedPharmacy(null);
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pharmacy
                  </Button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Pharmacy Modal */}
      <PharmacyModal
        pharmacy={selectedPharmacy}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPharmacy(null);
        }}
        onPharmacyUpdated={handlePharmacyUpdated}
      />
    </ProtectedRoute>
  );
} 