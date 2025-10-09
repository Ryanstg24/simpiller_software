'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

interface CycleProgressData {
  range: string;
  count: number;
  color: string;
  [key: string]: string | number; // Add index signature for Recharts compatibility
}

interface CycleProgressChartProps {
  className?: string;
}

export function CycleProgressChart({ className = '' }: CycleProgressChartProps) {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();

  const {
    data: progressData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['cycle-progress', user?.id, isSimpillerAdmin, userOrganizationId],
    queryFn: async (): Promise<CycleProgressData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Build patients query based on user role
      let patientsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients
        patientsQuery = supabase
          .from('patients')
          .select('id, cycle_start_date, is_active');

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's patients
        patientsQuery = supabase
          .from('patients')
          .select('id, cycle_start_date, is_active')
          .eq('organization_id', userOrganizationId);

      } else {
        // Provider sees only their assigned patients
        patientsQuery = supabase
          .from('patients')
          .select('id, cycle_start_date, is_active')
          .eq('assigned_provider_id', user.id);
      }

      const { data: patients, error: patientsError } = await patientsQuery;

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
        throw new Error('Failed to fetch cycle progress data');
      }

      // Calculate cycle progress for each patient
      const now = new Date();
      const cycleProgress: Record<string, number> = {
        '0-7 days': 0,
        '8-14 days': 0,
        '15-21 days': 0,
        '22-28 days': 0,
        '29+ days': 0,
        'Completed': 0
      };

      patients?.forEach(patient => {
        if (!patient.is_active || !patient.cycle_start_date) {
          return;
        }

        const cycleStart = new Date(patient.cycle_start_date);
        const daysSinceStart = Math.floor((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceStart < 0) {
          // Cycle hasn't started yet
          return;
        } else if (daysSinceStart <= 7) {
          cycleProgress['0-7 days']++;
        } else if (daysSinceStart <= 14) {
          cycleProgress['8-14 days']++;
        } else if (daysSinceStart <= 21) {
          cycleProgress['15-21 days']++;
        } else if (daysSinceStart <= 28) {
          cycleProgress['22-28 days']++;
        } else if (daysSinceStart <= 30) {
          cycleProgress['29+ days']++;
        } else {
          // Cycle completed (over 30 days)
          cycleProgress['Completed']++;
        }
      });

      // Convert to array with colors
      return [
        {
          range: '0-7 days',
          count: cycleProgress['0-7 days'],
          color: '#ef4444' // red
        },
        {
          range: '8-14 days',
          count: cycleProgress['8-14 days'],
          color: '#f59e0b' // orange
        },
        {
          range: '15-21 days',
          count: cycleProgress['15-21 days'],
          color: '#eab308' // yellow
        },
        {
          range: '22-28 days',
          count: cycleProgress['22-28 days'],
          color: '#84cc16' // lime
        },
        {
          range: '29+ days',
          count: cycleProgress['29+ days'],
          color: '#22c55e' // green
        },
        {
          range: 'Completed',
          count: cycleProgress['Completed'],
          color: '#10b981' // emerald
        }
      ];
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const totalPatients = progressData.reduce((sum, item) => sum + item.count, 0);
  const completedCycles = progressData.find(item => item.range === 'Completed')?.count || 0;
  const completionRate = totalPatients > 0 ? Math.round((completedCycles / totalPatients) * 100) : 0;

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
          <p className="text-red-600">Error loading cycle progress data</p>
        </div>
      </div>
    );
  }

  if (totalPatients === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active patients found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cycle Progress Tracking</h3>
          <p className="text-sm text-gray-600">{totalPatients} active patients</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="range" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string) => [
                `${value} patients`,
                name === 'count' ? 'Patients' : name
              ]}
            />
            <Bar 
              dataKey="count" 
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-4 w-4 text-blue-600 mr-1" />
            <span className="text-sm font-medium text-gray-900">In Progress</span>
          </div>
          <div className="text-lg font-bold text-blue-600">
            {totalPatients - completedCycles}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-sm font-medium text-gray-900">Completed</span>
          </div>
          <div className="text-lg font-bold text-green-600">
            {completedCycles}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Calendar className="h-4 w-4 text-purple-600 mr-1" />
            <span className="text-sm font-medium text-gray-900">Total</span>
          </div>
          <div className="text-lg font-bold text-purple-600">
            {totalPatients}
          </div>
        </div>
      </div>
    </div>
  );
}
