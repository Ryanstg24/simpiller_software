import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

interface DashboardStats {
  activePatients: number;
  totalMedications: number;
  todaysAlerts: number;
  complianceRate: number;
  recentActivity: Array<{
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    time: string;
  }>;
}

export function useDashboardStats() {
  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuth();

  const {
    data: stats = {
      activePatients: 0,
      totalMedications: 0,
      todaysAlerts: 0,
      complianceRate: 0,
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

      let activePatients = 0;
      let totalMedications = 0;

      // Build queries based on user role
      let patientsQuery, medicationsQuery;

      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients and medications
        patientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true);
        
        medicationsQuery = supabase
          .from('medications')
          .select('id')
          .eq('status', 'active');

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's data
        patientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true)
          .eq('organization_id', userOrganizationId);
        
        medicationsQuery = supabase
          .from('medications')
          .select(`
            id,
            patients!inner(organization_id)
          `)
          .eq('status', 'active')
          .eq('patients.organization_id', userOrganizationId);

      } else {
        // Provider sees only their assigned patients
        patientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true)
          .eq('assigned_provider_id', user.id);
        
        medicationsQuery = supabase
          .from('medications')
          .select(`
            id,
            patients!inner(assigned_provider_id)
          `)
          .eq('status', 'active')
          .eq('patients.assigned_provider_id', user.id);
      }

      // Execute both queries in parallel
      const [patientsResult, medicationsResult] = await Promise.all([
        patientsQuery,
        medicationsQuery
      ]);

      // Process results
      if (patientsResult.error) {
        console.error('Error fetching patients:', patientsResult.error);
        throw new Error('Failed to fetch patient statistics');
      }
      activePatients = patientsResult.data?.length || 0;

      if (medicationsResult.error) {
        console.error('Error fetching medications:', medicationsResult.error);
        throw new Error('Failed to fetch medication statistics');
      }
      totalMedications = medicationsResult.data?.length || 0;

      // Calculate compliance rate (placeholder for now - will be based on medication logs)
      const complianceRate = 94.2; // This will be calculated from medication_logs table

      // Get today's alerts (placeholder for now - will be based on alerts table)
      const todaysAlerts = 0; // This will be calculated from alerts table

      // Generate recent activity based on available data
      const recentActivity = generateRecentActivity(activePatients, totalMedications);

      return {
        activePatients,
        totalMedications,
        todaysAlerts,
        complianceRate,
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

function generateRecentActivity(activePatients: number, totalMedications: number) {
  const activities = [];

  // Add some sample activities based on the data
  if (activePatients > 0) {
    activities.push({
      type: 'info' as const,
      message: `${activePatients} active patient${activePatients > 1 ? 's' : ''} in your care`,
      time: 'Just now'
    });
  }

  if (totalMedications > 0) {
    activities.push({
      type: 'success' as const,
      message: `${totalMedications} active medication${totalMedications > 1 ? 's' : ''} being tracked`,
      time: 'Just now'
    });
  }

  // Add some placeholder activities for now
  activities.push(
    {
      type: 'info' as const,
      message: 'Dashboard data refreshed',
      time: 'Just now'
    },
    {
      type: 'warning' as const,
      message: 'Medication scanning system ready for implementation',
      time: 'System status'
    }
  );

  return activities.slice(0, 4); // Return max 4 activities
} 