'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface AdherenceTrendData {
  date: string;
  adherenceRate: number;
  totalScans: number;
  successfulScans: number;
  [key: string]: string | number; // Add index signature for Recharts compatibility
}

interface AdherenceTrendsChartProps {
  className?: string;
  selectedOrganizationId?: string | null;
}

export function AdherenceTrendsChart({ className = '', selectedOrganizationId }: AdherenceTrendsChartProps) {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();

  const {
    data: trendData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['adherence-trends-v2', user?.id, isSimpillerAdmin, userOrganizationId, selectedOrganizationId],
    queryFn: async (): Promise<AdherenceTrendData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the last 30 days of data including today (consistent with other charts)
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      console.log('[Adherence Trends] Fetching aggregated data using RPC function');
      console.log('[Adherence Trends] Date range:', thirtyDaysAgo.toISOString(), 'to', today.toISOString());

      // Use RPC function to get aggregated daily adherence data
      // This avoids the 1000-row limit by aggregating in the database
      const rpcParams: {
        start_date: string;
        end_date: string;
        org_id?: string;
        provider_id?: string;
      } = {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      };

      // Add role-based filtering
      if (isSimpillerAdmin && selectedOrganizationId) {
        rpcParams.org_id = selectedOrganizationId;
      } else if (userOrganizationId) {
        rpcParams.org_id = userOrganizationId;
      } else {
        // Provider - filter by assigned patients
        rpcParams.provider_id = user.id;
      }

      const { data: aggregatedData, error: rpcError } = await supabase
        .rpc('get_daily_adherence_stats', rpcParams);

      if (rpcError) {
        console.error('Error fetching adherence data via RPC:', rpcError);
        
        // Fallback to manual aggregation if RPC function doesn't exist yet
        console.log('[Adherence Trends] RPC function not found, using manual aggregation fallback');
        
        // Build medication logs query based on user role
        let logsQuery;

        if (isSimpillerAdmin) {
          logsQuery = supabase
            .from('medication_logs')
            .select('event_date, status, patients!inner(id, organization_id)')
            .gte('event_date', thirtyDaysAgo.toISOString())
            .lte('event_date', today.toISOString())
            .order('event_date', { ascending: true });

          if (selectedOrganizationId) {
            logsQuery = logsQuery.eq('patients.organization_id', selectedOrganizationId);
          }
        } else if (userOrganizationId) {
          logsQuery = supabase
            .from('medication_logs')
            .select('event_date, status, patients!inner(id, organization_id)')
            .gte('event_date', thirtyDaysAgo.toISOString())
            .lte('event_date', today.toISOString())
            .eq('patients.organization_id', userOrganizationId)
            .order('event_date', { ascending: true });
        } else {
          logsQuery = supabase
            .from('medication_logs')
            .select('event_date, status, patients!inner(id, assigned_provider_id)')
            .gte('event_date', thirtyDaysAgo.toISOString())
            .lte('event_date', today.toISOString())
            .eq('patients.assigned_provider_id', user.id)
            .order('event_date', { ascending: true });
        }

        const { data: logs, error: logsError } = await logsQuery;

        if (logsError) {
          console.error('Error fetching medication logs:', logsError);
          throw new Error('Failed to fetch adherence data');
        }

        console.log('[Adherence Trends] Fallback: Fetched', logs?.length || 0, 'individual logs');

        // Manual aggregation
        const dailyAggregation: Record<string, { total: number; successful: number }> = {};
        
        logs?.forEach(log => {
          const date = new Date(log.event_date).toISOString().split('T')[0];
          if (!dailyAggregation[date]) {
            dailyAggregation[date] = { total: 0, successful: 0 };
          }
          dailyAggregation[date].total++;
          if (log.status === 'taken') {
            dailyAggregation[date].successful++;
          }
        });

        // Convert to RPC format
        const fallbackData = Object.entries(dailyAggregation).map(([date, stats]) => ({
          log_date: date,
          total_logs: stats.total,
          successful_logs: stats.successful
        }));

        console.log('[Adherence Trends] Fallback: Aggregated to', fallbackData.length, 'daily records');

        // Use fallback data
        const dailyData: Record<string, { total: number; successful: number }> = {};
        fallbackData.forEach(day => {
          dailyData[day.log_date] = {
            total: day.total_logs,
            successful: day.successful_logs
          };
        });

        console.log('Adherence Trends - Daily data (fallback):', dailyData);

        // Create trend data array
        const trendData: AdherenceTrendData[] = [];
        const currentDate = new Date(thirtyDaysAgo);
        
        while (currentDate <= today) {
          const dateString = currentDate.toISOString().split('T')[0];
          const dayData = dailyData[dateString];
          
          trendData.push({
            date: dateString,
            adherenceRate: dayData ? Math.round((dayData.successful / dayData.total) * 100) : 0,
            totalScans: dayData?.total || 0,
            successfulScans: dayData?.successful || 0
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return trendData;
      }

      console.log('[Adherence Trends] RPC returned', aggregatedData?.length || 0, 'daily records');

      // Process RPC data into daily stats
      const dailyData: Record<string, { total: number; successful: number }> = {};
      
      aggregatedData?.forEach((day: { log_date: string; total_logs: number; successful_logs: number }) => {
        dailyData[day.log_date] = {
          total: day.total_logs,
          successful: day.successful_logs
        };
      });

      console.log('Adherence Trends - Daily data:', dailyData);
      console.log('Adherence Trends - Unique dates with data:', Object.keys(dailyData).length);

      // Create array for all days in the 30-day range (including days with no logs)
      const trendData: AdherenceTrendData[] = [];
      const currentDate = new Date(thirtyDaysAgo);
      
      while (currentDate <= today) {
        const dateString = currentDate.toISOString().split('T')[0];
        const dayData = dailyData[dateString];
        
        trendData.push({
          date: dateString,
          adherenceRate: dayData ? Math.round((dayData.successful / dayData.total) * 100) : 0,
          totalScans: dayData?.total || 0,
          successfulScans: dayData?.successful || 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('Adherence Trends - Final trend data:', trendData.slice(0, 5));
      console.log('Adherence Trends - Total days with data:', trendData.filter(d => d.totalScans > 0).length);

      return trendData;
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // Calculate trend direction and percentage
  const calculateTrend = () => {
    if (trendData.length < 2) return { direction: 'neutral', percentage: 0 };
    
    const firstWeek = trendData.slice(0, 7);
    const lastWeek = trendData.slice(-7);
    
    const firstWeekAvg = firstWeek.reduce((sum, day) => sum + day.adherenceRate, 0) / firstWeek.length;
    const lastWeekAvg = lastWeek.reduce((sum, day) => sum + day.adherenceRate, 0) / lastWeek.length;
    
    const percentage = Math.round(((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100);
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
    
    return { direction, percentage: Math.abs(percentage) };
  };

  const trend = calculateTrend();
  const currentRate = trendData.length > 0 ? trendData[trendData.length - 1].adherenceRate : 0;

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
          <p className="text-red-600">Error loading adherence trends</p>
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
            <h3 className="text-lg font-semibold text-gray-900">Adherence Trends</h3>
            <p className="text-sm text-gray-600">Daily medication adherence rates</p>
          </div>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
              <div className="space-y-2">
                <div>Shows daily percentage of successful medication scans vs total scheduled scans over the last 30 days</div>
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
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{currentRate}%</div>
          <div className={`flex items-center text-sm ${
            trend.direction === 'up' ? 'text-green-600' : 
            trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend.direction === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
            {trend.direction === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
            {trend.percentage > 0 && `${trend.percentage}%`}
            {trend.direction === 'up' ? ' vs last week' : 
             trend.direction === 'down' ? ' vs last week' : 'No change'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === 'adherenceRate' ? 'Adherence Rate' : name
              ]}
            />
            <Line
              type="monotone"
              dataKey="adherenceRate"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Target Line Indicator */}
      <div className="mt-4 flex items-center justify-center">
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-3 h-0.5 bg-gray-300 mr-2"></div>
          <span>Target: 80%</span>
        </div>
      </div>
    </div>
  );
}
