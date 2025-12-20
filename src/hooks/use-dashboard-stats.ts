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

export function useDashboardStats(selectedOrganizationId?: string | null) {
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
    queryKey: ['dashboard-stats', user?.id, isSimpillerAdmin, userOrganizationId, selectedOrganizationId],
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
        // Simpiller Admin sees all patients or filtered by organization
        allPatientsQuery = supabase
          .from('patients')
          .select('id, is_active, created_at, rtm_status, cycle_start_date');
        
        activePatientsQuery = supabase
          .from('patients')
          .select('id')
          .eq('is_active', true);

        newPatientsQuery = supabase
          .from('patients')
          .select('id')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        // Apply organization filter if selected
        if (selectedOrganizationId) {
          allPatientsQuery = allPatientsQuery.eq('organization_id', selectedOrganizationId);
          activePatientsQuery = activePatientsQuery.eq('organization_id', selectedOrganizationId);
          newPatientsQuery = newPatientsQuery.eq('organization_id', selectedOrganizationId);
        }

      } else if (userOrganizationId) {
        // Organization Admin sees their organization's data
        allPatientsQuery = supabase
          .from('patients')
          .select('id, is_active, created_at, rtm_status, cycle_start_date')
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
          .select('id, is_active, created_at, rtm_status, cycle_start_date')
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

      // Calculate needs attention using the actual alert system logic
      needsAttention = await calculateNeedsAttentionCount(allPatientsResult.data || []);

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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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

async function calculateNeedsAttentionCount(patients: Array<{ id: string; is_active: boolean; rtm_status: string; cycle_start_date: string | null }>): Promise<number> {
  if (!patients || patients.length === 0) return 0;

  let needsAttentionCount = 0;
  const nowLocal = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  // Process patients in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < patients.length; i += batchSize) {
    const batch = patients.slice(i, i + batchSize);
    
    const promises = batch.map(async (patient) => {
      if (!patient.is_active) return false;

      // Fetch last scan date (most recent medication_log with status='taken')
      let lastScanDate: string | null = null;
      try {
        const { data: lastScan } = await supabase
          .from('medication_logs')
          .select('event_date')
          .eq('patient_id', patient.id)
          .eq('status', 'taken')
          .order('event_date', { ascending: false })
          .limit(1);

        lastScanDate = lastScan?.[0]?.event_date || null;
      } catch {}

      // Fetch last communication date (most recent patient_communication log)
      let lastCommDate: string | null = null;
      try {
        const { data: lastComm } = await supabase
          .from('provider_time_logs')
          .select('start_time')
          .eq('patient_id', patient.id)
          .eq('activity_type', 'patient_communication')
          .order('start_time', { ascending: false })
          .limit(1);

        lastCommDate = lastComm?.[0]?.start_time || null;
      } catch {}

      // Fetch last adherence review date
      let lastReviewDate: string | null = null;
      try {
        const { data: lastReview } = await supabase
          .from('provider_time_logs')
          .select('start_time')
          .eq('patient_id', patient.id)
          .eq('activity_type', 'adherence_review')
          .order('start_time', { ascending: false })
          .limit(1);

        lastReviewDate = lastReview?.[0]?.start_time || null;
      } catch {}

      // Check for alerts using the same logic as the Patients page
      const alerts: string[] = [];

      // Critical: No scans in 3+ days (if RTM active)
      if (patient.rtm_status === 'active' && lastScanDate) {
        const daysSinceScan = Math.floor((nowLocal.getTime() - new Date(lastScanDate).getTime()) / msPerDay);
        if (daysSinceScan >= 3) {
          alerts.push('no-scans');
        }
      } else if (patient.rtm_status === 'active' && !lastScanDate) {
        alerts.push('no-scans');
      }

      // Warning: Communication overdue (7+ days)
      if (lastCommDate) {
        const daysSinceComm = Math.floor((nowLocal.getTime() - new Date(lastCommDate).getTime()) / msPerDay);
        if (daysSinceComm >= 7) {
          alerts.push('comm-overdue');
        }
      } else {
        // Check if patient has any communication logs at all
        const { data: commLogs } = await supabase
          .from('provider_time_logs')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('activity_type', 'patient_communication')
          .limit(1);
        
        if (!commLogs || commLogs.length === 0) {
          alerts.push('comm-not-started');
        }
      }

      // Warning: Adherence review overdue (7+ days)
      if (lastReviewDate) {
        const daysSinceReview = Math.floor((nowLocal.getTime() - new Date(lastReviewDate).getTime()) / msPerDay);
        if (daysSinceReview >= 7) {
          alerts.push('review-overdue');
        }
      } else {
        // Check if patient has any review logs at all
        const { data: reviewLogs } = await supabase
          .from('provider_time_logs')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('activity_type', 'adherence_review')
          .limit(1);
        
        if (!reviewLogs || reviewLogs.length === 0) {
          alerts.push('review-not-started');
        }
      }

      // Warning: Cycle ending soon (< 7 days)
      if (patient.cycle_start_date) {
        const cycleStart = new Date(patient.cycle_start_date);
        const cycleEnd = new Date(cycleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil((cycleEnd.getTime() - nowLocal.getTime()) / msPerDay);
        
        if (daysLeft > 0 && daysLeft < 7) {
          alerts.push('cycle-ending-soon');
        }
      }

      return alerts.length > 0;
    });

    const batchResults = await Promise.all(promises);
    needsAttentionCount += batchResults.filter(Boolean).length;
  }

  return needsAttentionCount;
}