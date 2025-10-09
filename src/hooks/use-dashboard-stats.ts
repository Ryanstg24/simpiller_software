import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';

interface DashboardStats {
  totalPatients: number;
  needsAttention: number;
  newPatientsThisMonth: number;
  activePatients: number;
  recentActivity: Array<{
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    time: string;
  }>;
}

export function useDashboardStats() {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuthV2();

  const {
    data: stats = {
      totalPatients: 0,
      needsAttention: 0,
      newPatientsThisMonth: 0,
      activePatients: 0,
      recentActivity: []
    },
    isLoading: loading,
    error
  } = useQuery({
    queryKey: ['dashboard-stats', user?.id, isSimpillerAdmin, userOrganizationId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      let totalPatients = 0;
      let activePatients = 0;
      let needsAttention = 0;
      let newPatientsThisMonth = 0;

      // Build queries based on user role
      let allPatientsQuery, activePatientsQuery, newPatientsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients
        allPatientsQuery = supabase
          .from('patients')
          .select('id, is_active, created_at');
        
        activePatientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true);

        newPatientsQuery = supabase
          .from('patients')
          .select('id')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's data
        allPatientsQuery = supabase
          .from('patients')
          .select('id, is_active, created_at')
          .eq('organization_id', userOrganizationId);
        
        activePatientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true)
          .eq('organization_id', userOrganizationId);

        newPatientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('organization_id', userOrganizationId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      } else {
        // Provider sees only their assigned patients
        allPatientsQuery = supabase
          .from('patients')
          .select('id, is_active, created_at')
          .eq('assigned_provider_id', user.id);
        
        activePatientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true)
          .eq('assigned_provider_id', user.id);

        newPatientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('assigned_provider_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      }

      // Execute queries in parallel
      const [allPatientsResult, activePatientsResult, newPatientsResult] = await Promise.all([
        allPatientsQuery,
        activePatientsQuery,
        newPatientsQuery
      ]);

      // Process results
      if (allPatientsResult.error) {
        console.error('Error fetching all patients:', allPatientsResult.error);
        throw new Error('Failed to fetch patient statistics');
      }
      totalPatients = allPatientsResult.data?.length || 0;

      if (activePatientsResult.error) {
        console.error('Error fetching active patients:', activePatientsResult.error);
        throw new Error('Failed to fetch active patient statistics');
      }
      activePatients = activePatientsResult.data?.length || 0;

      if (newPatientsResult.error) {
        console.error('Error fetching new patients:', newPatientsResult.error);
        throw new Error('Failed to fetch new patient statistics');
      }
      newPatientsThisMonth = newPatientsResult.data?.length || 0;

      // Calculate needs attention (placeholder for now - will be based on alert system)
      needsAttention = Math.floor(totalPatients * 0.15); // 15% of patients need attention

      // Generate recent activity based on available data
      const recentActivity = generateRecentActivity(totalPatients, activePatients, newPatientsThisMonth);

      return {
        totalPatients,
        needsAttention,
        newPatientsThisMonth,
        activePatients,
        recentActivity
      };
    },
    enabled: !authLoading && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return { 
    stats, 
    loading, 
    error: error?.message || null 
  };
}

function generateRecentActivity(totalPatients: number, activePatients: number, newPatientsThisMonth: number) {
  const activities: Array<{
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    time: string;
  }> = [];

  // Add some sample activities based on the data
  if (totalPatients > 0) {
    activities.push({
      type: 'info' as const,
      message: `${totalPatients} total patient${totalPatients > 1 ? 's' : ''} in your care`,
      time: 'Just now'
    });
  }

  if (activePatients > 0) {
    activities.push({
      type: 'success' as const,
      message: `${activePatients} active patient${activePatients > 1 ? 's' : ''} currently enrolled`,
      time: 'Just now'
    });
  }

  if (newPatientsThisMonth > 0) {
    activities.push({
      type: 'info' as const,
      message: `${newPatientsThisMonth} new patient${newPatientsThisMonth > 1 ? 's' : ''} added this month`,
      time: 'This month'
    });
  }

  // Add some placeholder activities for now
  activities.push(
    {
      type: 'info' as const,
      message: 'Dashboard data refreshed',
      time: 'Just now'
    }
  );

  return activities.slice(0, 4); // Return max 4 activities
}