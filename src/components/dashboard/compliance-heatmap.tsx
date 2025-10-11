'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';

interface ComplianceHeatmapProps {
  className?: string;
  selectedOrganizationId?: string | null;
}

interface DayData {
  date: Date;
  adherenceRate: number;
  totalScans: number;
  successfulScans: number;
}

export function ComplianceHeatmap({ className = '', selectedOrganizationId }: ComplianceHeatmapProps) {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const {
    data: heatmapData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['compliance-heatmap', user?.id, isSimpillerAdmin, userOrganizationId, selectedOrganizationId, currentMonth.toISOString()],
    queryFn: async (): Promise<DayData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the first and last day of the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Build medication logs query based on user role
      let logsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all medication logs or filtered by organization
        logsQuery = supabase
          .from('medication_logs')
          .select(`
            event_date,
            status,
            patients!inner(id, organization_id)
          `)
          .gte('event_date', firstDay.toISOString())
          .lte('event_date', lastDay.toISOString())
          .order('event_date', { ascending: true });

        // Apply organization filter if selected
        if (selectedOrganizationId) {
          logsQuery = logsQuery.eq('patients.organization_id', selectedOrganizationId);
        }

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's logs
        logsQuery = supabase
          .from('medication_logs')
          .select(`
            event_date,
            status,
            patients!inner(id, organization_id)
          `)
          .gte('event_date', firstDay.toISOString())
          .lte('event_date', lastDay.toISOString())
          .eq('patients.organization_id', userOrganizationId)
          .order('event_date', { ascending: true });

      } else {
        // Provider sees only their assigned patients' logs
        logsQuery = supabase
          .from('medication_logs')
          .select(`
            event_date,
            status,
            patients!inner(id, assigned_provider_id)
          `)
          .gte('event_date', firstDay.toISOString())
          .lte('event_date', lastDay.toISOString())
          .eq('patients.assigned_provider_id', user.id)
          .order('event_date', { ascending: true });
      }

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching medication logs:', logsError);
        throw new Error('Failed to fetch compliance data');
      }

      // Group logs by date
      const dailyData: Record<string, { total: number; successful: number }> = {};

      logs?.forEach(log => {
        const date = new Date(log.event_date).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { total: 0, successful: 0 };
        }
        dailyData[date].total++;
        if (log.status === 'taken') {
          dailyData[date].successful++;
        }
      });

      // Create array for all days in the month
      const daysInMonth = lastDay.getDate();
      const heatmapData: DayData[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = date.toISOString().split('T')[0];
        const dayData = dailyData[dateString];

        heatmapData.push({
          date,
          adherenceRate: dayData ? Math.round((dayData.successful / dayData.total) * 100) : 0,
          totalScans: dayData?.total || 0,
          successfulScans: dayData?.successful || 0
        });
      }

      return heatmapData;
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const getIntensityColor = (rate: number) => {
    if (rate === 0) return 'bg-gray-100';
    if (rate < 25) return 'bg-red-100';
    if (rate < 50) return 'bg-orange-100';
    if (rate < 75) return 'bg-yellow-100';
    if (rate < 90) return 'bg-green-100';
    return 'bg-green-200';
  };

  const getIntensityBorder = (rate: number) => {
    if (rate === 0) return 'border-gray-200';
    if (rate < 25) return 'border-red-200';
    if (rate < 50) return 'border-orange-200';
    if (rate < 75) return 'border-yellow-200';
    if (rate < 90) return 'border-green-200';
    return 'border-green-300';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.

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
          <p className="text-red-600">Error loading compliance heatmap</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Medication Compliance Heatmap</h3>
            <p className="text-sm text-gray-600">Daily adherence rates for {monthName}</p>
          </div>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Calendar view showing daily medication adherence rates. Darker colors indicate higher compliance rates
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[120px] text-center">
            {monthName}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mb-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first day of the month */}
          {Array.from({ length: startingDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="h-8"></div>
          ))}
          
          {/* Days of the month */}
          {heatmapData.map((day, index) => (
            <div
              key={index}
              className={`
                h-8 w-8 rounded border-2 flex items-center justify-center text-xs font-medium cursor-pointer text-gray-900
                ${getIntensityColor(day.adherenceRate)}
                ${getIntensityBorder(day.adherenceRate)}
                hover:ring-2 hover:ring-blue-300
              `}
              title={`${day.date.toLocaleDateString()}: ${day.adherenceRate}% adherence (${day.successfulScans}/${day.totalScans} scans)`}
            >
              {day.date.getDate()}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Less</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
