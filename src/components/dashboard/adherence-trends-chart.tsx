'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AdherenceTrendData {
  date: string;
  adherenceRate: number;
  totalScans: number;
  successfulScans: number;
  [key: string]: any; // Add index signature for Recharts compatibility
}

interface AdherenceTrendsChartProps {
  className?: string;
}

export function AdherenceTrendsChart({ className = '' }: AdherenceTrendsChartProps) {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();

  const {
    data: trendData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['adherence-trends', user?.id, isSimpillerAdmin, userOrganizationId],
    queryFn: async (): Promise<AdherenceTrendData[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Build medication logs query based on user role
      let logsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all medication logs
        logsQuery = supabase
          .from('medication_logs')
          .select(`
            event_date,
            status,
            patients!inner(id)
          `)
          .gte('event_date', thirtyDaysAgo.toISOString())
          .order('event_date', { ascending: true });

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's logs
        logsQuery = supabase
          .from('medication_logs')
          .select(`
            event_date,
            status,
            patients!inner(id, organization_id)
          `)
          .gte('event_date', thirtyDaysAgo.toISOString())
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
          .gte('event_date', thirtyDaysAgo.toISOString())
          .eq('patients.assigned_provider_id', user.id)
          .order('event_date', { ascending: true });
      }

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching medication logs:', logsError);
        throw new Error('Failed to fetch adherence data');
      }

      // Group logs by date and calculate adherence rates
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

      // Convert to array and calculate adherence rates
      const trendData: AdherenceTrendData[] = Object.entries(dailyData).map(([date, data]) => ({
        date,
        adherenceRate: data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0,
        totalScans: data.total,
        successfulScans: data.successful
      }));

      // Sort by date
      trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return trendData;
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Adherence Trends</h3>
          <p className="text-sm text-gray-600">Daily medication adherence rates</p>
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
