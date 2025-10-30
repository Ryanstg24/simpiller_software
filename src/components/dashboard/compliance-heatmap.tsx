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
    queryKey: ['compliance-heatmap-v2', user?.id, isSimpillerAdmin, userOrganizationId, selectedOrganizationId, currentMonth.toISOString()],
    queryFn: async (): Promise<DayData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the first and last day of the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Use RPC function for aggregated data (same as Adherence Trends)
      const rpcParams: {
        start_date: string;
        end_date: string;
        org_id?: string;
        provider_id?: string;
      } = {
        start_date: firstDay.toISOString().split('T')[0],
        end_date: lastDay.toISOString().split('T')[0],
      };

      // Add role-based filtering (same logic as Adherence Trends)
      if (isSimpillerAdmin) {
        if (selectedOrganizationId) {
          rpcParams.org_id = selectedOrganizationId;
        }
      } else if (userOrganizationId) {
        rpcParams.org_id = userOrganizationId;
      } else {
        rpcParams.provider_id = user.id;
      }

      const { data: aggregatedData, error: rpcError } = await supabase
        .rpc('get_daily_adherence_stats', {
          start_date: rpcParams.start_date,
          end_date: rpcParams.end_date,
          org_id: rpcParams.org_id || null,
          provider_id: rpcParams.provider_id || null
        });

      if (rpcError) {
        console.error('Error fetching compliance heatmap data via RPC:', rpcError);
        throw new Error('Failed to fetch compliance data');
      }

      // Process RPC data into daily stats
      const dailyData: Record<string, { total: number; successful: number }> = {};
      
      aggregatedData?.forEach((day: { log_date: string; total_logs: number; successful_logs: number }) => {
        dailyData[day.log_date] = {
          total: day.total_logs,
          successful: day.successful_logs
        };
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
    retry: 1,
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
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
              <div className="space-y-2">
                <div>Calendar view showing daily medication adherence rates. Darker colors indicate higher compliance rates.</div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="font-medium mb-2">Adherence Score Metrics:</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>• Gray: 0% (no scans)</div>
                    <div>• Red: &lt;25%</div>
                    <div>• Orange: 25-49%</div>
                    <div>• Yellow: 50-74%</div>
                    <div>• Light Green: 75-89%</div>
                    <div>• Dark Green: 90-100%</div>
                  </div>
                </div>
              </div>
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
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
        <span className="order-2 sm:order-1">Less</span>
        <div className="flex items-center space-x-1 order-1 sm:order-2">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded" title="0%"></div>
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded" title="&lt;25%"></div>
          <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded" title="25-49%"></div>
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded" title="50-74%"></div>
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" title="75-89%"></div>
          <div className="w-3 h-3 bg-green-200 border border-green-300 rounded" title="90-100%"></div>
        </div>
        <span className="order-3">More</span>
      </div>
    </div>
  );
}
