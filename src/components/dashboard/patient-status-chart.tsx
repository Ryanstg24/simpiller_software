'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface PatientStatusData {
  name: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PatientStatusChartProps {
  className?: string;
}

export function PatientStatusChart({ className = '' }: PatientStatusChartProps) {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();

  const {
    data: statusData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['patient-status', user?.id, isSimpillerAdmin, userOrganizationId],
    queryFn: async (): Promise<PatientStatusData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Build patients query based on user role
      let patientsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients
        patientsQuery = supabase
          .from('patients')
          .select('id, is_active, rtm_status, cycle_start_date');

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

      // Categorize patients
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      let activeRTM = 0;
      let needsAttention = 0;
      let cycleEndingSoon = 0;
      let inactive = 0;

      patients?.forEach(patient => {
        if (!patient.is_active) {
          inactive++;
          return;
        }

        if (patient.rtm_status === 'active') {
          // Check if cycle is ending soon
          if (patient.cycle_start_date) {
            const cycleStart = new Date(patient.cycle_start_date);
            const cycleEnd = new Date(cycleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            if (cycleEnd <= sevenDaysFromNow) {
              cycleEndingSoon++;
            } else {
              activeRTM++;
            }
          } else {
            activeRTM++;
          }
        } else {
          needsAttention++;
        }
      });

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
        <h3 className="text-lg font-semibold text-gray-900">Patient Status Distribution</h3>
        <p className="text-sm text-gray-600">{totalPatients} total patients</p>
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
