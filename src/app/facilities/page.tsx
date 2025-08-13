'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Building2, Users, Pill, MapPin, Phone, Tag } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useFacilities } from "@/hooks/use-facilities";
import { AddFacilityModal } from "@/components/facilities/add-facility-modal";
import { FilterFacilitiesModal, FacilityFilters } from "@/components/facilities/filter-facilities-modal";
import { useState, useMemo, useRef } from "react";

export default function FacilitiesPage() {
  const userInfo = useUserDisplay();
  const { facilities, loading, error } = useFacilities();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filters, setFilters] = useState<FacilityFilters>({
    organization_id: '',
    status: 'all',
    search: '',
    city: '',
    state: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const formatAddress = (facility: any) => {
    const parts = [
      facility.street1,
      facility.street2,
      facility.city,
      facility.state,
      facility.postal_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'active' : 'inactive';
  };

  const handleAddSuccess = () => {
    // The useFacilities hook will automatically refetch data
    // when the component re-renders
  };

  const handleApplyFilters = (newFilters: FacilityFilters) => {
    setFilters(newFilters);
  };

  // Apply filters to facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter(facility => {
      // Organization filter
      if (filters.organization_id && facility.organization_id !== filters.organization_id) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const isActive = facility.is_active;
        if (filters.status === 'active' && !isActive) return false;
        if (filters.status === 'inactive' && isActive) return false;
      }

      // Search filter (name or code)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = facility.name.toLowerCase().includes(searchLower);
        const codeMatch = facility.code?.toLowerCase().includes(searchLower);
        if (!nameMatch && !codeMatch) return false;
      }

      // City filter
      if (filters.city && facility.city !== filters.city) {
        return false;
      }

      // State filter
      if (filters.state && facility.state !== filters.state) {
        return false;
      }

      return true;
    });
  }, [facilities, filters]);

  // Apply search term (separate from filters for real-time search)
  const searchFilteredFacilities = useMemo(() => {
    if (!searchTerm) return filteredFacilities;
    
    return filteredFacilities.filter(facility => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = facility.name.toLowerCase().includes(searchLower);
      const codeMatch = facility.code?.toLowerCase().includes(searchLower);
      return nameMatch || codeMatch;
    });
  }, [filteredFacilities, searchTerm]);

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/facilities" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Facilities" 
              subtitle="Manage healthcare facilities and locations"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading facilities...</div>
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
          <Sidebar currentPage="/facilities" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Facilities" 
              subtitle="Manage healthcare facilities and locations"
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
        <Sidebar currentPage="/facilities" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Facilities" 
            subtitle="Manage healthcare facilities and locations"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Facilities</h1>
                <p className="text-gray-800">Manage healthcare facilities and locations</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Facility
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Facilities</p>
                      <p className="text-2xl font-bold text-gray-900">{searchFilteredFacilities.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Facilities</p>
                      <p className="text-2xl font-bold text-gray-900">{searchFilteredFacilities.filter(f => f.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Inactive Facilities</p>
                      <p className="text-2xl font-bold text-gray-900">{searchFilteredFacilities.filter(f => !f.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Locations</p>
                      <p className="text-2xl font-bold text-gray-900">{searchFilteredFacilities.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 relative">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search facilities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
                <div className="relative">
                  <Button 
                    ref={filterButtonRef}
                    variant="outline"
                    onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <FilterFacilitiesModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApplyFilters={handleApplyFilters}
                    currentFilters={filters}
                    buttonRef={filterButtonRef}
                  />
                </div>
              </div>
            </div>

            {/* Facilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchFilteredFacilities.map((facility) => (
                <Card key={facility.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-900">{facility.name}</CardTitle>
                        <p className="text-sm text-gray-600">{facility.code || 'No Code'}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(facility.is_active)}`}>
                        {getStatusText(facility.is_active)}
                      </div>
                    </div>
                    {facility.organizations && (
                      <div className="flex items-center mt-2">
                        <Tag className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">
                          {facility.organizations.acronym || facility.organizations.name}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="truncate">{formatAddress(facility)}</span>
                      </div>
                      {facility.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{facility.phone}</span>
                        </div>
                      )}
                      {facility.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="truncate">{facility.email}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
      <AddFacilityModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddSuccess} />
    </ProtectedRoute>
  );
} 