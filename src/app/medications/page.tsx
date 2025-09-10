'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pill, User, ChevronDown, ChevronRight, Clock, AlertTriangle, Users, Bell, Activity } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { usePatients, Patient } from "@/hooks/use-patients";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import React from "react";
import { MedicationModal } from "@/components/medications/medication-modal";
import { StatsSkeleton } from "@/components/ui/loading-skeleton";
import { TableSkeleton } from "@/components/ui/loading-skeleton";

interface Medication {
  id: string;
  patient_id: string;
  name: string;
  strength: string;
  format: string;
  dose_count: number;
  quantity: number;
  frequency: number;
  time_of_day?: string;
  with_food: boolean;
  avoid_alcohol: boolean;
  impairment_warning: boolean;
  special_instructions?: string;
  rx_number?: string;
  rx_filled_date?: string;
  rx_refills: number;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  last_dose_at?: string;
  patients?: {
    first_name: string;
    last_name: string;
    morning_time?: string;
    afternoon_time?: string;
    evening_time?: string;
    bedtime?: string;
    timezone?: string;
  };
}

export default function MedicationsPage() {
  const userInfo = useUserDisplay();
  const { patients, loading: patientsLoading, error: patientsError } = usePatients();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch medications for the filtered patients
  useEffect(() => {
    const fetchMedications = async () => {
      if (patientsLoading) {
        setMedications([]);
        setMedicationsLoading(false);
        return;
      }

      // Handle case where provider has no assigned patients
      if (patients.length === 0) {
        setMedications([]);
        setMedicationsLoading(false);
        return;
      }

      try {
        setMedicationsLoading(true);
        const patientIds = patients.map((p: Patient) => p.id);
        
        const { data, error } = await supabase
          .from('medications')
          .select(`
            *,
            patients (
              first_name,
              last_name,
              morning_time,
              afternoon_time,
              evening_time,
              bedtime,
              timezone
            )
          `)
          .in('patient_id', patientIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching medications:', error);
          setMedications([]);
        } else {
          setMedications(data || []);
        }
      } catch (error) {
        console.error('Error fetching medications:', error);
        setMedications([]);
      } finally {
        setMedicationsLoading(false);
      }
    };

    fetchMedications();
  }, [patients, patientsLoading]);

  const filteredMedications = useMemo(() => {
    let filtered = medications;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(med => {
        const nameMatch = med.name.toLowerCase().includes(searchLower);
        const patientMatch = `${med.patients?.first_name} ${med.patients?.last_name}`.toLowerCase().includes(searchLower);
        const strengthMatch = med.strength.toLowerCase().includes(searchLower);
        return nameMatch || patientMatch || strengthMatch;
      });
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(med => med.status === filterStatus);
    }

    return filtered;
  }, [medications, searchTerm, filterStatus]);

  const toggleRowExpansion = (medicationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(medicationId)) {
      newExpanded.delete(medicationId);
    } else {
      newExpanded.add(medicationId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'discontinued': return 'text-red-600 bg-red-100';
      case 'on_hold': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeDisplay = (timeOfDay: string, patient?: Medication['patients']) => {
    if (!timeOfDay) return 'Not specified';
    
    if (timeOfDay.includes('(') && timeOfDay.includes(')')) {
      return timeOfDay; // Already formatted
    }
    
    // Custom time removed
    
    // Handle comma-separated times (new checkbox format)
    if (timeOfDay.includes(',')) {
      const times = timeOfDay.split(',').map(t => t.trim()).filter(t => t);
      if (patient) {
        const formattedTimes = times.map(time => {
          switch (time.toLowerCase()) {
            case 'morning':
              return `morning (${patient.morning_time || '06:00:00'})`;
            case 'afternoon':
              return `afternoon (${patient.afternoon_time || '12:00:00'})`;
            case 'evening':
              return `evening (${patient.evening_time || '18:00:00'})`;
            case 'bedtime':
              return `bedtime (${patient.bedtime || '22:00:00'})`;
            default:
              return time;
          }
        });
        return formattedTimes.join(', ');
      }
      return times.join(', ');
    }
    
    // Format based on patient's time preferences (single time)
    if (patient) {
      switch (timeOfDay.toLowerCase()) {
        case 'morning':
          return `morning (${patient.morning_time || '06:00:00'})`;
        case 'afternoon':
          return `afternoon (${patient.afternoon_time || '12:00:00'})`;
        case 'evening':
          return `evening (${patient.evening_time || '18:00:00'})`;
        case 'bedtime':
          return `bedtime (${patient.bedtime || '22:00:00'})`;
        default:
          return timeOfDay;
      }
    }
    
    return timeOfDay;
  };

  const getWarningIcons = (medication: Medication) => {
    const warnings = [];
    if (medication.with_food) warnings.push('🍽️');
    if (medication.avoid_alcohol) warnings.push('🚫🍷');
    if (medication.impairment_warning) warnings.push('⚠️');
    return warnings.join(' ');
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setIsEditModalOpen(true);
  };

  const handleDeleteMedication = async (medicationId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    const medicationName = medication?.name || 'this medication';
    const patientName = medication?.patients ? `${medication.patients.first_name} ${medication.patients.last_name}` : 'this patient';
    
    if (!confirm(`Are you sure you want to delete ${medicationName} for ${patientName}? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('medications')
        .update({ status: 'discontinued' })
        .eq('id', medicationId);

      if (error) {
        console.error('Error deleting medication:', error);
        alert('Failed to delete medication. Please try again.');
      } else {
        handleMedicationUpdated();
        alert('Medication deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to delete medication. Please try again.');
    }
  };

  const handleMedicationUpdated = () => {
    // Refresh medications data
    const fetchMedications = async () => {
      if (patients.length === 0) return;

      try {
        const patientIds = patients.map((p: Patient) => p.id);
        
        const { data, error } = await supabase
          .from('medications')
          .select(`
            *,
            patients (
              first_name,
              last_name,
              morning_time,
              afternoon_time,
              evening_time,
              timezone
            )
          `)
          .in('patient_id', patientIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (!error) {
          setMedications(data || []);
        }
      } catch (error) {
        console.error('Error refreshing medications:', error);
      }
    };

    fetchMedications();
  };

  if (patientsLoading || medicationsLoading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/medications" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Medications" 
              subtitle="Manage patient medications and schedules"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading medications...</div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (patientsError) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/medications" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Medications" 
              subtitle="Manage patient medications and schedules"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Error: {patientsError}</div>
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
        <Sidebar currentPage="/medications" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Medications" 
            subtitle="Manage patient medications and schedules"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
                <p className="text-gray-600">Manage medications across all patients</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Medication
              </Button>
            </div>

            {/* Summary Stats */}
            {patientsLoading ? (
              <StatsSkeleton />
            ) : patients.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800">No Patients Assigned</h3>
                    <p className="text-yellow-700 mt-1">
                      You don&apos;t have any patients assigned to you yet. Contact your organization administrator to get assigned patients.
                    </p>
                  </div>
                </div>
              </div>
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
                      <Pill className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Medications</p>
                        <p className="text-2xl font-bold text-gray-900">{medications.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Bell className="h-8 w-8 text-purple-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Medications</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {medications.filter(m => m.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Activity className="h-8 w-8 text-orange-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {medications.filter(m => {
                            const created = new Date(m.created_at);
                            const now = new Date();
                            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                          }).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Error State */}
            {patientsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">Error loading patients: {patientsError}</p>
              </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medications by name, patient, or strength..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="discontinued">Discontinued</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medications Table */}
            {medicationsLoading ? (
              <TableSkeleton />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Pill className="h-5 w-5 mr-2" />
                    Medications ({filteredMedications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Medication
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dosage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Schedule
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Warnings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMedications.map((medication) => (
                          <React.Fragment key={medication.id}>
                            <tr 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleRowExpansion(medication.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <button className="mr-2">
                                    {expandedRows.has(medication.id) ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                  </button>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {medication.patients?.first_name} {medication.patients?.last_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{medication.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {medication.strength} {medication.format}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {medication.dose_count} dose{medication.dose_count > 1 ? 's' : ''} × {medication.frequency}/day
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-900">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <div>
                                    {(() => {
                                      const timeDisplay = formatTimeDisplay(medication.time_of_day || '', medication.patients);
                                      const times = medication.time_of_day?.split(',').filter(t => t.trim()) || [];
                                      
                                      if (times.length > 1) {
                                        return (
                                          <div>
                                            <div className="font-medium">{times.length} times daily</div>
                                            <div className="text-xs text-gray-500">{timeDisplay}</div>
                                          </div>
                                        );
                                      } else {
                                        return timeDisplay;
                                      }
                                    })()}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(medication.status)}`}>
                                  {medication.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {getWarningIcons(medication)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEditMedication(medication)}
                                    className="bg-black text-white border-black hover:bg-gray-800"
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDeleteMedication(medication.id)}
                                    className="bg-red-600 text-white border-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {expandedRows.has(medication.id) && (
                              <tr>
                                <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Patient Details</h4>
                                      <div className="text-sm text-gray-600">
                                        <p><strong>Name:</strong> {medication.patients?.first_name} {medication.patients?.last_name}</p>
                                        <p><strong>Timezone:</strong> {medication.patients?.timezone || 'Not set'}</p>
                                        <p><strong>Time Preferences:</strong></p>
                                        <ul className="ml-4 text-xs">
                                          <li>Morning: {medication.patients?.morning_time || '06:00'}</li>
                                          <li>Afternoon: {medication.patients?.afternoon_time || '12:00'}</li>
                                          <li>Evening: {medication.patients?.evening_time || '18:00'}</li>
                                        </ul>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Medication Details</h4>
                                      <div className="text-sm text-gray-600">
                                        <p><strong>Format:</strong> {medication.format}</p>
                                        <p><strong>Dose Count:</strong> {medication.dose_count}</p>
                                        <p><strong>Frequency:</strong> {medication.frequency} times per day</p>
                                        <p><strong>Created:</strong> {new Date(medication.created_at).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions & Warnings</h4>
                                      <div className="text-sm text-gray-600">
                                        {medication.special_instructions && (
                                          <p><strong>Instructions:</strong> {medication.special_instructions}</p>
                                        )}
                                        <div className="mt-2">
                                          <p><strong>Warnings:</strong></p>
                                          <ul className="ml-4 text-xs">
                                            {medication.with_food && <li>• Take with food</li>}
                                            {medication.avoid_alcohol && <li>• Avoid alcohol</li>}
                                            {medication.impairment_warning && <li>• May cause impairment</li>}
                                            {!medication.with_food && !medication.avoid_alcohol && !medication.impairment_warning && (
                                              <li>• No special warnings</li>
                                            )}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredMedications.length === 0 && (
                    <div className="text-center py-12">
                      <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No medications found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm ? 'Try adjusting your search terms.' : patients.length === 0 ? 'No patients assigned yet.' : 'No medications have been added yet.'}
                      </p>
                      {!searchTerm && patients.length > 0 && (
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setIsAddModalOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Medication
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
      <MedicationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleMedicationUpdated}
        mode="edit"
        medication={editingMedication}
      />
      <MedicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleMedicationUpdated}
        mode="add"
        medication={null}
      />
    </ProtectedRoute>
  );
} 