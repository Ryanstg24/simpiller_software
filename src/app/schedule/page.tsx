'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Pill, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface ScheduleItem {
  id: string;
  scheduleId: string;
  time: string;
  patient: string;
  medication: string;
  dosage: string;
  status: "completed" | "overdue" | "upcoming" | "missed";
  type: string;
  patientId: string;
  medicationId: string;
}

// Raw response from Supabase (joins return arrays)
interface RawMedicationSchedule {
  id: string;
  medication_id: string;
  time_of_day: string; // This field stores the actual scheduled time in HH:MM:SS format
  is_active: boolean;
  medications?: Array<{
    id: string;
    name: string;
    strength: string;
    format: string;
    status: string;
    patient_id: string;
    patients: Array<{
      first_name: string;
      last_name: string;
      timezone?: string;
    }>;
  }>;
}

// Normalized interface for use in component
interface MedicationSchedule {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_time: string; // We'll use time_of_day as scheduled_time for consistency
  is_active: boolean;
  medications?: {
    name: string;
    strength: string;
    format: string;
    status: string;
  };
  patients?: {
    first_name: string;
    last_name: string;
    timezone?: string;
  };
}

export default function SchedulePage() {
  const userInfo = useUserDisplay();
  const [medicationSchedules, setMedicationSchedules] = useState<MedicationSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [takenTodayByScheduleId, setTakenTodayByScheduleId] = useState<Record<string, boolean>>({});

  // Fetch medication schedules directly (RLS handles role-based filtering)
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setSchedulesLoading(true);
        
        console.log('[Schedule Page] Querying medication schedules...');
        const { data, error } = await supabase
          .from('medication_schedules')
          .select(`
            id,
            medication_id,
            time_of_day,
            is_active,
            medications (
              id,
              name,
              strength,
              format,
              status,
              patient_id,
              patients (
                first_name,
                last_name,
                timezone
              )
            )
          `)
          .eq('is_active', true)
          .order('time_of_day', { ascending: true });

        console.log('[Schedule Page] Query result:', { error, dataCount: data?.length });
        if (error) {
          console.error('[Schedule Page] Error fetching medication schedules:', error);
          setMedicationSchedules([]);
        } else {
          // Normalize Supabase response (joins return arrays) and filter inactive medications
          const normalizedSchedules: MedicationSchedule[] = (data || []).map((schedule: RawMedicationSchedule) => {
            const medicationData = Array.isArray(schedule.medications) ? schedule.medications[0] : schedule.medications;
            const patientData = medicationData?.patients ? 
              (Array.isArray(medicationData.patients) ? medicationData.patients[0] : medicationData.patients) 
              : undefined;
            
            return {
              id: schedule.id,
              medication_id: schedule.medication_id,
              patient_id: medicationData?.patient_id || '', // Get patient_id from medications
              scheduled_time: schedule.time_of_day, // time_of_day is the actual scheduled time
              is_active: schedule.is_active,
              medications: medicationData ? {
                name: medicationData.name,
                strength: medicationData.strength,
                format: medicationData.format,
                status: medicationData.status
              } : undefined,
              patients: patientData
            };
          });
          
          // Filter out schedules where medication is inactive
          const activeSchedules = normalizedSchedules.filter(
            (schedule) => 
              schedule.medications && schedule.medications.status === 'active'
          );
          console.log('[Schedule Page] Active schedules after filtering:', activeSchedules.length);
          setMedicationSchedules(activeSchedules);
        }
      } catch (error) {
        console.error('Error fetching medication schedules:', error);
        setMedicationSchedules([]);
      } finally {
        setSchedulesLoading(false);
      }
    };

    fetchSchedules();
  }, []); // Only fetch once on mount

  // Pull today's logs to determine completed status by schedule_id
  useEffect(() => {
    const fetchLogs = async () => {
      if (medicationSchedules.length === 0) { 
        setTakenTodayByScheduleId({}); 
        return; 
      }
      
      const scheduleIds = medicationSchedules.map(s => s.id);
      const start = new Date(); 
      start.setHours(0, 0, 0, 0);
      const end = new Date(); 
      end.setHours(23, 59, 59, 999);
      
      const { data } = await supabase
        .from('medication_logs')
        .select('schedule_id, status, event_date')
        .in('schedule_id', scheduleIds)
        .gte('event_date', start.toISOString())
        .lt('event_date', end.toISOString());
      
      const map: Record<string, boolean> = {};
      (data || []).forEach((row: { schedule_id: string; status?: string }) => {
        if (row.schedule_id) {
          const s = row.status || '';
          if (s.startsWith('taken') || s === 'taken') {
            map[row.schedule_id] = true;
          }
        }
      });
      
      setTakenTodayByScheduleId(map);
    };
    fetchLogs();
  }, [medicationSchedules]);

  // Generate schedule items from medication_schedules
  useEffect(() => {
    if (medicationSchedules.length === 0) {
      setScheduleItems([]);
      return;
    }

    const generateScheduleItems = (): ScheduleItem[] => {
      const items: ScheduleItem[] = [];

      medicationSchedules.forEach((schedule) => {
        const medication = schedule.medications;
        const patient = schedule.patients;
        
        if (!medication || !patient) return;

        const patientName = `${patient.first_name} ${patient.last_name}`;
        const dosage = `${medication.strength} ${medication.format}`;
        const time = schedule.scheduled_time.substring(0, 5); // Extract HH:MM from HH:MM:SS

        // Determine period type from time
        const hour = parseInt(time.split(':')[0]);
        let type = 'morning';
        if (hour >= 5 && hour < 12) {
          type = 'morning';
        } else if (hour >= 12 && hour < 17) {
          type = 'afternoon';
        } else if (hour >= 17 && hour < 22) {
          type = 'evening';
        } else {
          type = 'bedtime';
        }

        // Determine status based on current time and logs
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        let status: "completed" | "overdue" | "upcoming" | "missed" = "upcoming";
        const timeDiffMin = (now.getTime() - scheduledTime.getTime()) / 60000;
        const taken = takenTodayByScheduleId[schedule.id] === true;
        
        if (taken) {
          status = "completed";
        } else if (timeDiffMin <= 0) {
          status = "upcoming";
        } else if (timeDiffMin > 120) { // More than 2 hours past scheduled time
          status = "missed";
        } else if (timeDiffMin > 60) { // 1-2 hours past scheduled time
          status = "overdue";
        } else {
          status = "upcoming";
        }

        items.push({
          id: `${schedule.id}`,
          scheduleId: schedule.id,
          time: time,
          patient: patientName,
          medication: medication.name,
          dosage: dosage,
          status: status,
          type: type,
          patientId: schedule.patient_id,
          medicationId: schedule.medication_id
        });
      });

      // Sort by time
      return items.sort((a, b) => {
        const timeA = new Date(`2000-01-01T${a.time}`);
        const timeB = new Date(`2000-01-01T${b.time}`);
        return timeA.getTime() - timeB.getTime();
      });
    };

    setScheduleItems(generateScheduleItems());
  }, [medicationSchedules, takenTodayByScheduleId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'overdue': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'missed': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'upcoming': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'missed': return 'bg-red-200 text-red-900';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTimeGroup = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const groupedSchedule = useMemo(() => {
    return scheduleItems.reduce((groups, item) => {
      const group = getTimeGroup(item.time);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, ScheduleItem[]>);
  }, [scheduleItems]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const completed = scheduleItems.filter(item => item.status === 'completed').length;
    const upcoming = scheduleItems.filter(item => item.status === 'upcoming').length;
    const overdue = scheduleItems.filter(item => item.status === 'overdue').length;
    return { completed, upcoming, overdue };
  }, [scheduleItems]);

  if (schedulesLoading) {
    return (
      <ProtectedRoute requiredRoles={['simpiller_admin', 'organization_admin', 'provider']}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar currentPage="/schedule" />
          <div className="flex-1 overflow-auto">
            <Header 
              title="Schedule" 
              subtitle="View medication schedules and upcoming doses"
              user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
            />
            <main className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading schedule...</div>
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
        <Sidebar currentPage="/schedule" />

        <div className="flex-1 overflow-auto">
          <Header 
            title="Schedule" 
            subtitle="View medication schedules and upcoming doses"
            user={{ name: userInfo.name, initials: userInfo.initials, role: userInfo.role }}
          />

          <main className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                <p className="text-gray-800">View medication schedules and upcoming doses</p>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryStats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryStats.upcoming}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <XCircle className="h-8 w-8 text-red-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryStats.overdue}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Alerts card removed as requested */}
            </div>

            {/* Schedule Timeline */}
            <div className="space-y-6">
              {scheduleItems.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No Schedule Items</h3>
                  <p className="text-gray-600 mt-2">
                    No medication schedules found for today. Add medications to patients to see their schedules.
                  </p>
                </div>
              ) : (
                Object.entries(groupedSchedule).map(([timeGroup, items]) => (
                  <Card key={timeGroup}>
                    <CardHeader>
                      <CardTitle className="text-gray-900">
                        {timeGroup === 'morning' && 'Morning (6:00 AM - 12:00 PM)'}
                        {timeGroup === 'afternoon' && 'Afternoon (12:00 PM - 6:00 PM)'}
                        {timeGroup === 'evening' && 'Evening (6:00 PM - 10:00 PM)'}
                        {timeGroup === 'night' && 'Night (10:00 PM - 6:00 AM)'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                {getStatusIcon(item.status)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.time}</p>
                                <p className="text-xs text-gray-600">{item.patient}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Pill className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-900">{item.medication}</span>
                                <span className="text-sm text-gray-600">({item.dosage})</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 