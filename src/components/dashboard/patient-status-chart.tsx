'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

interface PatientStatusData {
  name: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  [key: string]: string | number | React.ComponentType<{ className?: string }>; // Add index signature for Recharts compatibility
}

interface PatientStatusChartProps {
  className?: string;
  selectedOrganizationId?: string | null;
}

export function PatientStatusChart({ className = '', selectedOrganizationId }: PatientStatusChartProps) {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();

  const {
    data: statusData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['patient-status', user?.id, isSimpillerAdmin, userOrganizationId, selectedOrganizationId],
    queryFn: async (): Promise<PatientStatusData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Build patients query based on user role
      let patientsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients or filtered by organization
        patientsQuery = supabase
          .from('patients')
          .select('id, is_active, rtm_status, cycle_start_date');

        // Apply organization filter if selected
        if (selectedOrganizationId) {
          patientsQuery = patientsQuery.eq('organization_id', selectedOrganizationId);
        }

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's patients
        patientsQuery = supabase
          .from('patients')
          .select('id, is_active, rtm_status, cycle_start_date')
          .eq('organization_id', userOrganizationId);

      } else {
        // Provider sees only their assigned patients
        patientsQuery = supabase
          .from('patients')
          .select('id, is_active, rtm_status, cycle_start_date')
          .eq('assigned_provider_id', user.id);
      }

      const { data: patients, error: patientsError } = await patientsQuery;

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
        throw new Error('Failed to fetch patient data');
      }

      // Use the same alert logic as the Patients page
      const now = new Date();
      let activeRTM = 0;
      let needsAttention = 0;
      let cycleEndingSoon = 0;
      let inactive = 0;

      // Fetch alert data for each patient (same logic as Patients page)
      for (const patient of patients || []) {
        if (!patient.is_active) {
          inactive++;
          continue;
        }

        // Calculate cycle progress
        let daysLeft = 0;
        if (patient.cycle_start_date) {
          const cycleStart = new Date(patient.cycle_start_date);
          const cycleEnd = new Date(cycleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
          daysLeft = Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        // Fetch last scan date
        const { data: lastScanData } = await supabase
          .from('medication_logs')
          .select('event_date')
          .eq('patient_id', patient.id)
          .eq('status', 'taken')
          .order('event_date', { ascending: false })
          .limit(1);

        // Fetch last communication date
        const { data: lastCommData } = await supabase
          .from('provider_time_logs')
          .select('start_time')
          .eq('patient_id', patient.id)
          .eq('activity_type', 'patient_communication')
          .order('start_time', { ascending: false })
          .limit(1);

        // Fetch last review date
        const { data: lastReviewData } = await supabase
          .from('provider_time_logs')
          .select('start_time')
          .eq('patient_id', patient.id)
          .eq('activity_type', 'adherence_review')
          .order('start_time', { ascending: false })
          .limit(1);

        const lastScanDate = lastScanData?.[0]?.event_date;
        const lastCommDate = lastCommData?.[0]?.start_time;
        const lastReviewDate = lastReviewData?.[0]?.start_time;

        // Calculate alerts (same logic as Patients page)
        const alerts = [];
        
        // No scans in 3+ days
        if (lastScanDate) {
          const daysSinceScan = Math.floor((now.getTime() - new Date(lastScanDate).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceScan >= 3) {
            alerts.push({ type: 'warning', message: `No scans in ${daysSinceScan} days` });
          }
        } else {
          alerts.push({ type: 'warning', message: 'No scans recorded' });
        }

        // Communication overdue (7+ days)
        if (lastCommDate) {
          const daysSinceComm = Math.floor((now.getTime() - new Date(lastCommDate).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceComm >= 7) {
            alerts.push({ type: 'warning', message: `Comm overdue ${daysSinceComm} days` });
          }
        } else {
          alerts.push({ type: 'warning', message: 'Comm not recorded' });
        }

        // Review overdue (7+ days)
        if (lastReviewDate) {
          const daysSinceReview = Math.floor((now.getTime() - new Date(lastReviewDate).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceReview >= 7) {
            alerts.push({ type: 'warning', message: `Review overdue ${daysSinceReview} days` });
          }
        } else {
          alerts.push({ type: 'warning', message: 'Review not recorded' });
        }

        // Cycle ending soon (< 7 days)
        if (daysLeft > 0 && daysLeft < 7) {
          alerts.push({ type: 'critical', message: `Cycle ends in ${daysLeft} days` });
        }

        // Categorize based on alerts
        if (alerts.length > 0) {
          if (daysLeft > 0 && daysLeft < 7) {
            cycleEndingSoon++;
          } else {
            needsAttention++;
          }
        } else {
          activeRTM++;
        }
      }

      return [
        {
          name: 'Active RTM',
          value: activeRTM,
          color: '#10b981',
          icon: CheckCircle
        },
        {
          name: 'Needs Attention',
          value: needsAttention,
          color: '#f59e0b',
          icon: AlertTriangle
        },
        {
          name: 'Cycle Ending Soon',
          value: cycleEndingSoon,
          color: '#ef4444',
          icon: Clock
        },
        {
          name: 'Inactive',
          value: inactive,
          color: '#6b7280',
          icon: Users
        }
      ].filter(item => item.value > 0); // Only show categories with patients
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const totalPatients = statusData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-600">Error loading patient status data</p>
        </div>
      </div>
    );
  }

  if (totalPatients === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No patients found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Patient Status Distribution</h3>
            <p className="text-sm text-gray-600">{totalPatients} total patients</p>
          </div>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Shows distribution of patients by their current status: On Track, Needs Attention, or Cycle Ending Soon
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string) => [
                `${value} patients`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {statusData.map((item, index) => {
          const Icon = item.icon;
          const percentage = Math.round((item.value / totalPatients) * 100);
          
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: item.color }}
                ></div>
                <Icon className="h-4 w-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                <div className="text-xs text-gray-600">{percentage}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
