'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface PatientCycleProgress {
  communicationMinutes: number;
  adherenceMinutes: number;
  adherenceDays: number; // distinct days with taken logs in cycle
  cycleStart: string | null;
  cycleEnd: string | null;
  daysLeft: number; // days left in current cycle
}

export default function PatientsPage() {
  const userInfo = useUserDisplay();
  const { patients, loading, error } = usePatients();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [progressByPatientId, setProgressByPatientId] = useState<Record<string, PatientCycleProgress>>({});
  const [progressLoading, setProgressLoading] = useState(false);

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
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  };

  // Helper to compute the current 30-day cycle window given a start date
  const computeCurrentCycle = (startISO: string) => {
    const start = new Date(startISO);
    const now = new Date();
    const cycleMs = 30 * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - start.getTime();
    const cyclesPassed = Math.floor(elapsed / cycleMs);
    const cycleStart = new Date(start.getTime() + cyclesPassed * cycleMs);
    const cycleEnd = new Date(cycleStart.getTime() + cycleMs);
    return { cycleStart, cycleEnd };
  };

  // Load cycle-based progress for each patient
  useEffect(() => {
    const loadProgress = async () => {
      if (!patients || patients.length === 0) {
        setProgressByPatientId({});
        return;
      }
      setProgressLoading(true);
      try {
        const results = await Promise.all(
          patients.map(async (patient: Patient) => {
            try {
              // Find earliest medication for this patient to anchor the cycle
              const { data: med, error: medErr } = await supabase
                .from('medications')
                .select('created_at')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

              if (medErr || !med) {
                return [patient.id, { communicationMinutes: 0, adherenceMinutes: 0, adherenceDays: 0, cycleStart: null, cycleEnd: null, daysLeft: 0 }] as const;
              }

              const { cycleStart, cycleEnd } = computeCurrentCycle(med.created_at as string);

              // Fetch provider_time_logs within the cycle window
              let communicationMinutes = 0;
              let adherenceMinutes = 0;
              let adherenceDays = 0;
              try {
                const { data: logs, error: logsErr } = await supabase
                  .from('provider_time_logs')
                  .select('activity_type, duration_minutes, start_time')
                  .eq('patient_id', patient.id)
                  .gte('start_time', cycleStart.toISOString())
                  .lt('start_time', cycleEnd.toISOString());

                if (!logsErr && logs) {
                  for (const log of logs as Array<{ activity_type: string; duration_minutes: number }>) {
                    if (log.activity_type === 'patient_communication') communicationMinutes += Number(log.duration_minutes || 0);
                    if (log.activity_type === 'adherence_review') adherenceMinutes += Number(log.duration_minutes || 0);
                  }
                }
              } catch (e) {
                // Table might not exist yet in some environments; default to zero
              }

              // Fetch medication_logs to compute adherance days (distinct days with status 'taken')
              try {
                const { data: mlogs } = await supabase
                  .from('medication_logs')
                  .select('event_date, status')
                  .eq('patient_id', patient.id)
                  .gte('event_date', cycleStart.toISOString())
                  .lt('event_date', cycleEnd.toISOString());
                if (mlogs && mlogs.length > 0) {
                  const daySet = new Set<string>();
                  for (const entry of mlogs as Array<{ event_date: string; status: string }>) {
                    if (entry.status === 'taken' && entry.event_date) {
                      const d = new Date(entry.event_date);
                      const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
                      daySet.add(dayKey);
                    }
                  }
                  adherenceDays = daySet.size;
                }
              } catch {}

              const nowLocal = new Date();
              const msPerDay = 24 * 60 * 60 * 1000;
              const daysLeft = Math.max(0, Math.ceil((cycleEnd.getTime() - nowLocal.getTime()) / msPerDay));

              return [patient.id, {
                communicationMinutes,
                adherenceMinutes,
                adherenceDays,
                cycleStart: cycleStart.toISOString(),
                cycleEnd: cycleEnd.toISOString(),
                daysLeft,
              }] as const;
            } catch {
              return [patient.id, { communicationMinutes: 0, adherenceMinutes: 0, adherenceDays: 0, cycleStart: null, cycleEnd: null, daysLeft: 0 }] as const;
            }
          })
        );

        const map: Record<string, PatientCycleProgress> = {};
        for (const [id, val] of results) {
          map[id] = val;
        }
        setProgressByPatientId(map);
      } finally {
        setProgressLoading(false);
      }
    };

    loadProgress();
  }, [patients]);

  const renderProgressBars = (patientId: string) => {
    const progress = progressByPatientId[patientId];
    const comm = Math.min(progress?.communicationMinutes || 0, 20);
    const adher = Math.min(progress?.adherenceMinutes || 0, 80);
    const commPct = Math.round((comm / 20) * 100);
    const adherPct = Math.round((adher / 80) * 100);

    return (
      <div className="flex items-center gap-4 w-full">
        {/* Patient Communication tiny bar (hover label) */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="w-40 h-1.5 bg-gray-200 rounded" title="Patient Communication">
            <div className="h-1.5 bg-blue-600 rounded" style={{ width: `${commPct}%` }} />
          </div>
          <span className="text-xs text-gray-600 whitespace-nowrap">{progress?.communicationMinutes || 0}/20</span>
        </div>

        {/* Adherence Review tiny bar with ticks (hover label) */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="relative w-56 h-1.5 bg-gray-200 rounded" title="Adherence Review">
            <div className="h-1.5 bg-purple-600 rounded" style={{ width: `${adherPct}%` }} />
            <div className="absolute inset-0 flex justify-between">
              {[20,40,60,80].map((tick) => (
                <div key={tick} className="h-1.5 w-px bg-white/70" style={{ left: `${(tick/80)*100}%` }} />
              ))}
            </div>
          </div>
          <span className="text-xs text-gray-600 whitespace-nowrap">{progress?.adherenceMinutes || 0}/80</span>
        </div>
      </div>
    );
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
                              {/* Age removed per request */}
                              {patient.email && (
                                <span>{patient.email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Inline compact progress + actions */}
                        <div className="flex items-center justify-end gap-4 flex-1">
                          {renderProgressBars(patient.id)}
                          {/* Adherance days and cycle remaining */}
                          {(() => {
                            const p = progressByPatientId[patient.id];
                            return (
                              <>
                                <div className="text-xs text-gray-700 whitespace-nowrap">Adherance: {(p?.adherenceDays ?? 0)}/16</div>
                                <div className="text-xs text-gray-700 whitespace-nowrap">Cycle: {(p?.daysLeft ?? 0)}d</div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.is_active)}`}>
                            {getStatusText(patient.is_active)}
                          </div>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsModalOpen(true);
                              // open directly to Time Log tab
                              setTimeout(() => {
                                const el = document.querySelector('[data-time-log-tab]') as HTMLButtonElement | null;
                                el?.click();
                              }, 0);
                            }}
                          >
                            Add Time Log
                          </Button>
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
        initialTab={'timeLog'}
      />

      <AddPatientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </ProtectedRoute>
  );
} 