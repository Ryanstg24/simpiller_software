import { useDataCache } from './use-data-cache';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { usePatientsOptimized } from './use-patients-optimized';
import { cacheManager } from './use-data-cache';

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  strength: string;
  format: string;
  dose_count: number;
  quantity: number;
  frequency: number;
  time_of_day?: string;
  with_food: boolean;
  avoid_alcohol: boolean;
  impairment_warning: boolean;
  special_instructions?: string;
  rx_number?: string;
  rx_filled_date?: string;
  rx_refills: number;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  last_dose_at?: string;
  patients?: {
    first_name: string;
    last_name: string;
    morning_time?: string;
    afternoon_time?: string;
    evening_time?: string;
    bedtime?: string;
    timezone?: string;
  };
}

export function useMedicationsOptimized() {
  const { user } = useAuth();
  const { data: patients, loading: patientsLoading } = usePatientsOptimized();

  const fetchMedications = async (): Promise<Medication[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (patientsLoading || patients.length === 0) {
      return [];
    }

    const patientIds = patients.map(p => p.id);
    
    const { data, error } = await supabase
      .from('medications')
      .select(`
        *,
        patients (
          first_name,
          last_name,
          morning_time,
          afternoon_time,
          evening_time,
          bedtime,
          timezone
        )
      `)
      .in('patient_id', patientIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }

    return data || [];
  };

  const cacheKey = `medications-${user?.id}-${patients.length}`;

  const result = useDataCache({
    cacheKey,
    fetchFn: fetchMedications,
    staleTime: 1 * 60 * 1000, // 1 minute - medications change more frequently
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user && !patientsLoading
  });

  // Subscribe to cache invalidation events
  const invalidateMedicationsCache = () => {
    cacheManager.invalidatePattern('medications-');
  };

  return {
    ...result,
    invalidateCache: invalidateMedicationsCache
  };
}
