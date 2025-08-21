import { useState, useEffect } from 'react';
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
  const [stats, setStats] = useState<DashboardStats>({
    activePatients: 0,
    totalMedications: 0,
    todaysAlerts: 0,
    complianceRate: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isSimpillerAdmin, userOrganizationId, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      // Don't fetch if auth is still loading or user is not authenticated
      if (authLoading || !user) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let activePatients = 0;
        let totalMedications = 0;

        // Fetch patients based on user role
        if (isSimpillerAdmin) {
          // Simpiller Admin sees all patients
          const { data: patientsData, error: patientsError } = await supabase
            .from('patients')
            .select('id')
            .eq('is_active', true);

          if (patientsError) {
            console.error('Error fetching patients:', patientsError);
            throw new Error('Failed to fetch patient statistics');
          }

          activePatients = patientsData?.length || 0;

          // Simpiller Admin sees all medications
          const { data: medicationsData, error: medicationsError } = await supabase
            .from('medications')
            .select('id')
            .eq('status', 'active');

          if (medicationsError) {
            console.error('Error fetching medications:', medicationsError);
            throw new Error('Failed to fetch medication statistics');
          }

          totalMedications = medicationsData?.length || 0;

        } else if (userOrganizationId) {
          // Organization Admin sees their organization's patients
          const { data: patientsData, error: patientsError } = await supabase
            .from('patients')
            .select('id')
            .eq('is_active', true)
            .eq('organization_id', userOrganizationId);

          if (patientsError) {
            console.error('Error fetching patients:', patientsError);
            throw new Error('Failed to fetch patient statistics');
          }

          activePatients = patientsData?.length || 0;

          // Organization Admin sees their organization's medications
          const { data: medicationsData, error: medicationsError } = await supabase
            .from('medications')
            .select(`
              id,
              patients!inner(organization_id)
            `)
            .eq('status', 'active')
            .eq('patients.organization_id', userOrganizationId);

          if (medicationsError) {
            console.error('Error fetching medications:', medicationsError);
            throw new Error('Failed to fetch medication statistics');
          }

          totalMedications = medicationsData?.length || 0;

        } else {
          // Provider sees only their assigned patients
          const { data: patientsData, error: patientsError } = await supabase
            .from('patients')
            .select('id')
            .eq('is_active', true)
            .eq('assigned_provider_id', user.id);

          if (patientsError) {
            console.error('Error fetching patients:', patientsError);
            throw new Error('Failed to fetch patient statistics');
          }

          activePatients = patientsData?.length || 0;

          // Provider sees only their assigned patients' medications
          const { data: medicationsData, error: medicationsError } = await supabase
            .from('medications')
            .select(`
              id,
              patients!inner(assigned_provider_id)
            `)
            .eq('status', 'active')
            .eq('patients.assigned_provider_id', user.id);

          if (medicationsError) {
            console.error('Error fetching medications:', medicationsError);
            throw new Error('Failed to fetch medication statistics');
          }

          totalMedications = medicationsData?.length || 0;
        }

        // Calculate compliance rate (placeholder for now - will be based on medication logs)
        const complianceRate = 94.2; // This will be calculated from medication_logs table

        // Get today's alerts (placeholder for now - will be based on alerts table)
        const todaysAlerts = 0; // This will be calculated from alerts table

        // Generate recent activity based on available data
        const recentActivity = generateRecentActivity(activePatients, totalMedications);

        setStats({
          activePatients,
          totalMedications,
          todaysAlerts,
          complianceRate,
          recentActivity
        });

      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, isSimpillerAdmin, userOrganizationId, authLoading]);

  return { stats, loading, error };
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