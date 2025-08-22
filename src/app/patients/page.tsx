'use client';

import { useState, useMemo } from 'react';
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { usePatients, Patient } from "@/hooks/use-patients";
import { PatientDetailsModal } from "@/components/patients/patient-details-modal";
import { AddPatientModal } from "@/components/patients/add-patient-modal";
import { Search, Plus, Users, Activity, AlertTriangle } from "lucide-react";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/loading-skeleton";

export default function PatientsPage() {
  const userInfo = useUserDisplay();
  const { patients, loading, error } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    
    return patients.filter((patient: Patient) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchLower);
      const idMatch = patient.patient_id_alt?.toLowerCase().includes(searchLower);
      const emailMatch = patient.email?.toLowerCase().includes(searchLower);
      return nameMatch || idMatch || emailMatch;
    });
  }, [patients, searchTerm]);

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handlePatientUpdated = () => {
    // React Query will automatically refetch
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

  const handleAddSuccess = () => {
    // React Query will automatically refetch
  };

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
                <p className="text-gray-800">Manage your patient roster and view compliance data</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </div>

            {/* Summary Stats */}
            {loading ? (
              <StatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Patients</p>
                        <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Patients</p>
                        <p className="text-2xl font-bold text-gray-900">{patients.filter(p => p.is_active).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Activity className="h-8 w-8 text-purple-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {patients.filter(p => {
                            const created = new Date(p.created_at);
                            const now = new Date();
                            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                          }).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Age</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {patients.length > 0 
                            ? Math.round(patients.reduce((sum, p) => {
                                if (p.date_of_birth) {
                                  return sum + calculateAge(p.date_of_birth);
                                }
                                return sum;
                              }, 0) / patients.filter(p => p.date_of_birth).length)
                            : 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Patients List */}
            {loading ? (
              <TableSkeleton rows={8} />
            ) : error ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Patients</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No patients found' : 'No patients yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search terms.' 
                      : 'Get started by adding your first patient.'
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Patient
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    Patients ({filteredPatients.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {filteredPatients.map((patient) => (
                    <div key={patient.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {patient.patient_id_alt && (
                                <span>ID: {patient.patient_id_alt}</span>
                              )}
                              {patient.date_of_birth && (
                                <span>Age: {calculateAge(patient.date_of_birth)}</span>
                              )}
                              {patient.email && (
                                <span>{patient.email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.is_active)}`}>
                            {getStatusText(patient.is_active)}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(patient)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <PatientDetailsModal
        patient={selectedPatient}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPatient(null);
        }}
        onPatientUpdated={handlePatientUpdated}
      />

      <AddPatientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </ProtectedRoute>
  );
} 