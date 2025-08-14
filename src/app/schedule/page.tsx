'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Pill, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUserDisplay } from "@/hooks/use-user-display";
import { usePatients } from "@/hooks/use-patients";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface ScheduleItem {
  id: string;
  time: string;
  patient: string;
  medication: string;
  dosage: string;
  status: "completed" | "overdue" | "upcoming";
  type: string;
  patientId: string;
  medicationId: string;
}

interface Medication {
  id: string;
  patient_id: string;
  name: string;
  strength: string;
  format: string;
  time_of_day?: string;
  custom_time?: string;
  status: string;
  patients?: {
    first_name: string;
    last_name: string;
    morning_time?: string;
    afternoon_time?: string;
    evening_time?: string;
    timezone?: string;
  };
}

export default function SchedulePage() {
  const userInfo = useUserDisplay();
  const { patients, loading: patientsLoading } = usePatients();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  // Fetch medications for the filtered patients
  useEffect(() => {
    const fetchMedications = async () => {
      if (patients.length === 0) {
        setMedications([]);
        setMedicationsLoading(false);
        return;
      }

      try {
        setMedicationsLoading(true);
        const patientIds = patients.map(p => p.id);
        
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
  }, [patients]);

  // Generate schedule items from medications
  useEffect(() => {
    if (medications.length === 0) {
      setScheduleItems([]);
      return;
    }

    const generateScheduleItems = (): ScheduleItem[] => {
      const items: ScheduleItem[] = [];
      let itemId = 1;

      medications.forEach((medication) => {
        const patient = medication.patients;
        if (!patient) return;

        const patientName = `${patient.first_name} ${patient.last_name}`;
        const dosage = `${medication.strength} ${medication.format}`;

        // Parse time_of_day to create schedule items
        if (medication.time_of_day) {
          const times = medication.time_of_day.split(',').map((t: string) => t.trim()).filter((t: string) => t);
          
          times.forEach((timeStr: string) => {
            let time = '';
            let type = '';

            // Extract time from format like "morning (06:00:00)"
            if (timeStr.includes('(') && timeStr.includes(')')) {
              const timeMatch = timeStr.match(/\(([^)]+)\)/);
              if (timeMatch) {
                time = timeMatch[1];
                type = timeStr.split('(')[0].trim();
              }
            } else if (timeStr === 'custom' && medication.custom_time) {
              time = medication.custom_time;
              type = 'custom';
            } else {
              // Fallback to patient's time preferences
              switch (timeStr.toLowerCase()) {
                case 'morning':
                  time = patient.morning_time || '06:00';
                  type = 'morning';
                  break;
                case 'afternoon':
                  time = patient.afternoon_time || '12:00';
                  type = 'afternoon';
                  break;
                case 'evening':
                  time = patient.evening_time || '18:00';
                  type = 'evening';
                  break;
                default:
                  return;
              }
            }

            // Determine status based on current time
            const now = new Date();
            const [hours, minutes] = time.split(':').map(Number);
            const medicationTime = new Date();
            medicationTime.setHours(hours, minutes, 0, 0);
            
            let status: "completed" | "overdue" | "upcoming" = "upcoming";
            const timeDiff = now.getTime() - medicationTime.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff > 2) {
              status = "overdue";
            } else if (hoursDiff > 0) {
              status = "completed";
            }

            items.push({
              id: `${medication.id}-${itemId++}`,
              time: time,
              patient: patientName,
              medication: medication.name,
              dosage: dosage,
              status: status,
              type: type,
              patientId: medication.patient_id,
              medicationId: medication.id
            });
          });
        }
      });

      // Sort by time
      return items.sort((a, b) => {
        const timeA = new Date(`2000-01-01T${a.time}`);
        const timeB = new Date(`2000-01-01T${b.time}`);
        return timeA.getTime() - timeB.getTime();
      });
    };

    setScheduleItems(generateScheduleItems());
  }, [medications]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'overdue': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'upcoming': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
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
    const alerts = overdue; // For now, alerts = overdue items

    return { completed, upcoming, overdue, alerts };
  }, [scheduleItems]);

  if (patientsLoading || medicationsLoading) {
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Alerts</p>
                      <p className="text-2xl font-bold text-gray-900">{summaryStats.alerts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Timeline */}
            <div className="space-y-6">
              {scheduleItems.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No Schedule Items</h3>
                  <p className="text-gray-600 mt-2">
                    {patients.length === 0 
                      ? "No patients found. Add patients to see their medication schedules."
                      : "No active medications found. Add medications to patients to see their schedules."
                    }
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
                              <Button size="sm" variant="outline">
                                View
                              </Button>
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