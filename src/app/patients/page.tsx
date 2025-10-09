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
import { Search, Plus, Users, Activity, AlertTriangle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/loading-skeleton";
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { refreshPatientData } from '@/lib/data-refresh';

interface PatientAlert {
  type: 'critical' | 'warning';
  message: string;
  icon: string;
}

interface PatientCycleProgress {
  communicationMinutes: number;
  adherenceMinutes: number;
  adherenceDays: number; // distinct days with taken logs in cycle
  cycleStart: string | null;
  cycleEnd: string | null;
  daysLeft: number; // days left in current cycle
  lastScanDate: string | null; // Most recent medication scan
  lastCommDate: string | null; // Most recent patient communication
  lastReviewDate: string | null; // Most recent adherence review
  alerts: PatientAlert[]; // What needs attention
}

export default function PatientsPage() {
  const userInfo = useUserDisplay();
  const { patients, loading, error } = usePatients();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [rtmStatusFilter, setRtmStatusFilter] = useState<string>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [progressByPatientId, setProgressByPatientId] = useState<Record<string, PatientCycleProgress>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [needsAttentionExpanded, setNeedsAttentionExpanded] = useState(true);
  const [onTrackExpanded, setOnTrackExpanded] = useState(false);

  const filteredPatients = useMemo(() => {
    let filtered = patients;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((patient: Patient) => {
        const nameMatch = `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchLower);
        const idMatch = patient.patient_id_alt?.toLowerCase().includes(searchLower);
        const emailMatch = patient.email?.toLowerCase().includes(searchLower);
        return nameMatch || idMatch || emailMatch;
      });
    }
    
    // Filter by RTM status
    if (rtmStatusFilter !== 'all') {
      filtered = filtered.filter((patient: Patient) => {
        const status = patient.rtm_status?.toLowerCase() || 'inactive';
        return status === rtmStatusFilter;
      });
    }
    
    return filtered;
  }, [patients, searchTerm, rtmStatusFilter]);

  // Categorize patients into "Needs Attention" vs "On Track"
  const { needsAttention, onTrack } = useMemo(() => {
    const needsAttention: Patient[] = [];
    const onTrack: Patient[] = [];

    filteredPatients.forEach((patient: Patient) => {
      const progress = progressByPatientId[patient.id];
      if (progress && progress.alerts && progress.alerts.length > 0) {
        needsAttention.push(patient);
      } else {
        onTrack.push(patient);
      }
    });

    return { needsAttention, onTrack };
  }, [filteredPatients, progressByPatientId]);

  // Calculate metrics
  const activePatients = patients.filter((p: Patient) => p.is_active).length;
  const needsAttentionCount = needsAttention.length;
  const cycleEndingSoonCount = Object.values(progressByPatientId).filter(p => p.daysLeft > 0 && p.daysLeft < 7).length;

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handlePatientUpdated = async () => {
    // Force refresh of patients so modal shows latest values without closing
    await refreshPatientData(queryClient, {
      invalidateRelated: true,
      refetchImmediately: true,
      timeout: 8000
    });
  };

  const getStatusColor = (rtmStatus: string) => {
    switch (rtmStatus?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (rtmStatus: string) => {
    return rtmStatus || 'Inactive';
  };

  // Render alert badges for patient
  const renderAlertBadges = (patientId: string) => {
    const progress = progressByPatientId[patientId];
    if (!progress || !progress.alerts || progress.alerts.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-2 mb-3">
        {progress.alerts.map((alert, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              alert.type === 'critical'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            <span className="mr-1">{alert.icon}</span>
            {alert.message}
          </span>
        ))}
      </div>
    );
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

  const handleAddSuccess = async () => {
    await refreshPatientData(queryClient, {
      invalidateRelated: true,
      refetchImmediately: true,
      timeout: 8000
    });
  };

  // Keep selectedPatient in sync with latest data from React Query so the modal reflects updates immediately
  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find((p: Patient) => p.id === selectedPatient.id);
      if (updated && (updated !== selectedPatient)) {
        setSelectedPatient(updated);
      }
    }
  }, [patients]);

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
              // Use cycle_start_date if available, otherwise fall back to earliest medication
              let cycleAnchor: string | null = null;
              
              if (patient.cycle_start_date) {
                cycleAnchor = patient.cycle_start_date;
              } else {
                // Fallback: Find earliest medication for this patient to anchor the cycle
                const { data: med, error: medErr } = await supabase
                  .from('medications')
                  .select('created_at')
                  .eq('patient_id', patient.id)
                  .order('created_at', { ascending: true })
                  .limit(1)
                  .single();

                if (medErr || !med) {
                  return [patient.id, { 
                    communicationMinutes: 0, 
                    adherenceMinutes: 0, 
                    adherenceDays: 0, 
                    cycleStart: null, 
                    cycleEnd: null, 
                    daysLeft: 0,
                    lastScanDate: null,
                    lastCommDate: null,
                    lastReviewDate: null,
                    alerts: []
                  }];
                }
                
                cycleAnchor = med.created_at as string;
              }

              const { cycleStart, cycleEnd } = computeCurrentCycle(cycleAnchor);

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

                if (logsErr) {
                  console.log(`[Progress] Error fetching time logs:`, logsErr);
                  // If there's an error, keep values at 0
                  communicationMinutes = 0;
                  adherenceMinutes = 0;
                } else if (logs && logs.length > 0) {
                  console.log(`[Progress] Found ${logs.length} time logs in cycle`);
                  for (const log of logs as Array<{ activity_type: string; duration_minutes: number; start_time: string }>) {
                    console.log(`[Progress] Log: ${log.activity_type} - ${log.duration_minutes} minutes at ${log.start_time}`);
                    if (log.activity_type === 'patient_communication') {
                      communicationMinutes += Number(log.duration_minutes || 0);
                    }
                    if (log.activity_type === 'adherence_review') {
                      adherenceMinutes += Number(log.duration_minutes || 0);
                    }
                  }
                } else {
                  console.log(`[Progress] No time logs found for patient ${patient.first_name} ${patient.last_name} - setting to 0`);
                  // Explicitly set to 0 when no logs found
                  communicationMinutes = 0;
                  adherenceMinutes = 0;
                }
              } catch (e) {
                console.log(`[Progress] Exception fetching time logs:`, e);
                // If there's an exception, keep values at 0
                communicationMinutes = 0;
                adherenceMinutes = 0;
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
                    const s = entry.status || '';
                    if ((s.startsWith('taken') || s === 'taken') && entry.event_date) {
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

              // Fetch last scan date (most recent medication_log with status='taken')
              let lastScanDate: string | null = null;
              try {
                const { data: lastScan } = await supabase
                  .from('medication_logs')
                  .select('event_date')
                  .eq('patient_id', patient.id)
                  .eq('status', 'taken')
                  .order('event_date', { ascending: false })
                  .limit(1)
                  .single();
                lastScanDate = lastScan?.event_date || null;
              } catch {}

              // Fetch last communication date (most recent patient_communication log)
              let lastCommDate: string | null = null;
              try {
                const { data: lastComm } = await supabase
                  .from('provider_time_logs')
                  .select('start_time')
                  .eq('patient_id', patient.id)
                  .eq('activity_type', 'patient_communication')
                  .order('start_time', { ascending: false })
                  .limit(1)
                  .single();
                lastCommDate = lastComm?.start_time || null;
              } catch {}

              // Fetch last adherence review date
              let lastReviewDate: string | null = null;
              try {
                const { data: lastReview } = await supabase
                  .from('provider_time_logs')
                  .select('start_time')
                  .eq('patient_id', patient.id)
                  .eq('activity_type', 'adherence_review')
                  .order('start_time', { ascending: false })
                  .limit(1)
                  .single();
                lastReviewDate = lastReview?.start_time || null;
              } catch {}

              // Calculate alerts
              const alerts: PatientAlert[] = [];
              
              // Critical: No scans in 3+ days (if RTM active)
              if (patient.rtm_status === 'active' && lastScanDate) {
                const daysSinceScan = Math.floor((nowLocal.getTime() - new Date(lastScanDate).getTime()) / msPerDay);
                if (daysSinceScan >= 3) {
                  alerts.push({
                    type: 'critical',
                    message: `No scans ${daysSinceScan}d`,
                    icon: '🚨'
                  });
                }
              } else if (patient.rtm_status === 'active' && !lastScanDate) {
                alerts.push({
                  type: 'critical',
                  message: 'No scans recorded',
                  icon: '🚨'
                });
              }

              // Warning: Communication overdue (7+ days)
              if (lastCommDate) {
                const daysSinceComm = Math.floor((nowLocal.getTime() - new Date(lastCommDate).getTime()) / msPerDay);
                if (daysSinceComm >= 7) {
                  alerts.push({
                    type: 'warning',
                    message: `Comm overdue ${daysSinceComm}d`,
                    icon: '⚠️'
                  });
                }
              } else if (communicationMinutes < 20) {
                alerts.push({
                  type: 'warning',
                  message: 'Comm not started',
                  icon: '⚠️'
                });
              }

              // Warning: Adherence review overdue (7+ days)
              if (lastReviewDate) {
                const daysSinceReview = Math.floor((nowLocal.getTime() - new Date(lastReviewDate).getTime()) / msPerDay);
                if (daysSinceReview >= 7) {
                  alerts.push({
                    type: 'warning',
                    message: `Review overdue ${daysSinceReview}d`,
                    icon: '⚠️'
                  });
                }
              } else if (adherenceMinutes < 20) {
                alerts.push({
                  type: 'warning',
                  message: 'Review not started',
                  icon: '⚠️'
                });
              }

              // Warning: Cycle ending soon (< 7 days)
              if (daysLeft < 7 && daysLeft > 0) {
                alerts.push({
                  type: 'warning',
                  message: `Cycle ends ${daysLeft}d`,
                  icon: '⏰'
                });
              }

              // Critical: Behind on requirements with little time left
              if (daysLeft < 7) {
                if (communicationMinutes < 20) {
                  alerts.push({
                    type: 'critical',
                    message: 'Comm not met',
                    icon: '🔴'
                  });
                }
                if (adherenceMinutes < 80) {
                  alerts.push({
                    type: 'critical',
                    message: 'Review mins low',
                    icon: '🔴'
                  });
                }
                if (adherenceDays < 16) {
                  alerts.push({
                    type: 'critical',
                    message: 'Adherence days low',
                    icon: '🔴'
                  });
                }
              }

              const result = {
                communicationMinutes,
                adherenceMinutes,
                adherenceDays,
                cycleStart: cycleStart.toISOString(),
                cycleEnd: cycleEnd.toISOString(),
                daysLeft,
                lastScanDate,
                lastCommDate,
                lastReviewDate,
                alerts,
              };
              
              return [patient.id, result];
            } catch (error) {
              return [patient.id, { 
                communicationMinutes: 0, 
                adherenceMinutes: 0, 
                adherenceDays: 0, 
                cycleStart: null, 
                cycleEnd: null, 
                daysLeft: 0,
                lastScanDate: null,
                lastCommDate: null,
                lastReviewDate: null,
                alerts: []
              }];
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
                        <p className="text-2xl font-bold text-gray-900">{patients.filter((p: Patient) => p.is_active).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Needs Attention</p>
                        <p className="text-2xl font-bold text-gray-900">{needsAttentionCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-orange-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Cycle Ending Soon</p>
                        <p className="text-2xl font-bold text-gray-900">{cycleEndingSoonCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients by name, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>
                <select
                  value={rtmStatusFilter}
                  onChange={(e) => setRtmStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="all">All RTM Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (Opted Out)</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
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
                    {searchTerm || rtmStatusFilter !== 'all' ? 'No patients found' : 'No patients yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || rtmStatusFilter !== 'all'
                      ? 'Try adjusting your search terms or filters.' 
                      : 'Get started by adding your first patient.'
                    }
                  </p>
                  {!searchTerm && rtmStatusFilter === 'all' && (
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
              <>
                {/* Needs Attention Section */}
                {needsAttention.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border mb-6">
                    <button
                      onClick={() => setNeedsAttentionExpanded(!needsAttentionExpanded)}
                      className="w-full p-6 border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {needsAttentionExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h2 className="text-lg font-medium text-gray-900">
                          Needs Attention ({needsAttention.length})
                        </h2>
                      </div>
                    </button>
                    {needsAttentionExpanded && (
                      <div className="divide-y">
                        {needsAttention.map((patient: Patient) => (
                          <div key={patient.id} className="p-6 hover:bg-gray-50 transition-colors">
                            {/* Alert Badges */}
                            {renderAlertBadges(patient.id)}
                            
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
                                    {patient.email && (
                                      <span>{patient.email}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Inline compact progress + actions */}
                              <div className="flex items-center justify-end gap-4 flex-1 ml-8">
                                {renderProgressBars(patient.id)}
                                {/* Adherence days and cycle remaining */}
                                {(() => {
                                  const p: PatientCycleProgress | undefined = progressByPatientId[patient.id];
                                  return (
                                    <>
                                      <div className="text-xs text-gray-700 whitespace-nowrap">Adherence: {(p?.adherenceDays ?? 0)}/16</div>
                                      <div className="text-xs text-gray-700 whitespace-nowrap ml-4">Cycle: {(p?.daysLeft ?? 0)}d</div>
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.rtm_status || '')}`}>
                                  {getStatusText(patient.rtm_status || '')}
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
                    )}
                  </div>
                )}

                {/* On Track Section */}
                {onTrack.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border">
                    <button
                      onClick={() => setOnTrackExpanded(!onTrackExpanded)}
                      className="w-full p-6 border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {onTrackExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <Activity className="h-5 w-5 text-green-500" />
                        <h2 className="text-lg font-medium text-gray-900">
                          On Track ({onTrack.length})
                        </h2>
                      </div>
                    </button>
                    {onTrackExpanded && (
                      <div className="divide-y">
                        {onTrack.map((patient: Patient) => (
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
                                    {patient.email && (
                                      <span>{patient.email}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Inline compact progress + actions */}
                              <div className="flex items-center justify-end gap-4 flex-1 ml-8">
                                {renderProgressBars(patient.id)}
                                {/* Adherence days and cycle remaining */}
                                {(() => {
                                  const p: PatientCycleProgress | undefined = progressByPatientId[patient.id];
                                  return (
                                    <>
                                      <div className="text-xs text-gray-700 whitespace-nowrap">Adherence: {(p?.adherenceDays ?? 0)}/16</div>
                                      <div className="text-xs text-gray-700 whitespace-nowrap ml-4">Cycle: {(p?.daysLeft ?? 0)}d</div>
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.rtm_status || '')}`}>
                                  {getStatusText(patient.rtm_status || '')}
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
                    )}
                  </div>
                )}
              </>
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