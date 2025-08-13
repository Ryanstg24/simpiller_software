'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, User, Phone, Mail, MapPin, Calendar, Tag } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { usePatients } from "@/hooks/use-patients";
import { useState, useMemo } from "react";
import { AddPatientModal } from "@/components/patients/add-patient-modal";
import { PatientDetailsModal } from "@/components/patients/patient-details-modal";
import { Patient } from "@/hooks/use-patients";

export default function PatientsPage() {
  const userInfo = useUserDisplay();
  const { patients, loading, error } = usePatients();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    
    return patients.filter(patient => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchLower);
      const emailMatch = patient.email?.toLowerCase().includes(searchLower);
      const phoneMatch = patient.phone1?.toLowerCase().includes(searchLower);
      const patientIdMatch = patient.patient_id_alt?.toLowerCase().includes(searchLower);
      return nameMatch || emailMatch || phoneMatch || patientIdMatch;
    });
  }, [patients, searchTerm]);

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsModalOpen(true);
  };

  const handlePatientUpdated = () => {
    // This will trigger a refresh of the patients list
    // The usePatients hook will automatically refetch
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddSuccess = () => {
    // The usePatients hook will automatically refetch data
    // when the component re-renders
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/patients" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Patients" 
              subtitle="Manage your patient roster"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading patients...</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Only show error state for actual errors, not empty data
  if (error) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/patients" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Patients" 
              subtitle="Manage your patient roster"
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
    <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentPage="/patients" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Patients" 
            subtitle="Manage your patient roster"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
                <p className="text-gray-800">Manage your patient roster and medication schedules</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Patients</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredPatients.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Patients</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredPatients.filter(p => p.is_active).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">New This Month</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {filteredPatients.filter(p => {
                          const createdDate = new Date(p.created_at);
                          const now = new Date();
                          return createdDate.getMonth() === now.getMonth() && 
                                 createdDate.getFullYear() === now.getFullYear();
                        }).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Assigned</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {filteredPatients.filter(p => p.assigned_provider_id).length}
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
                  placeholder="Search patients by name, email, phone, or patient ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Patients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {patient.date_of_birth ? `Age: ${calculateAge(patient.date_of_birth)}` : 'Age: N/A'}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.is_active)}`}>
                        {getStatusText(patient.is_active)}
                      </div>
                    </div>
                    {patient.organizations && (
                      <div className="flex items-center mt-2">
                        <Tag className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">
                          {patient.organizations.acronym || patient.organizations.name}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {patient.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                      )}
                      {patient.phone1 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{patient.phone1}</span>
                        </div>
                      )}
                      {patient.city && patient.state && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="truncate">{patient.city}, {patient.state}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Joined: {formatDate(patient.created_at)}</span>
                      </div>
                      {patient.users && (
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>Provider: {patient.users.first_name} {patient.users.last_name}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleViewDetails(patient)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first patient.'}
                </p>
                {!searchTerm && (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Patient
                  </Button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      <AddPatientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddSuccess} />
      
      {/* Patient Details Modal */}
      <PatientDetailsModal
        patient={selectedPatient}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPatient(null);
        }}
        onPatientUpdated={handlePatientUpdated}
      />
    </ProtectedRoute>
  );
} 