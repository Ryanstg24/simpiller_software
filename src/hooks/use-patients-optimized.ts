import { useDataCache } from './use-data-cache';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';
import { cacheManager } from './use-data-cache';

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_id_alt?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  assigned_provider_id?: string;
  organization_id?: string;
  facility_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  adherence_score?: number | string;
  rtm_status?: string;
  // Legacy single time fields (kept for backward compatibility)
  morning_time?: string;
  afternoon_time?: string;
  evening_time?: string;
  bedtime?: string;
  timezone?: string;
  // New multiple time slots (arrays of time strings in HH:MM format)
  morning_times?: string[];
  afternoon_times?: string[];
  evening_times?: string[];
  bedtime_times?: string[];
}

export function usePatientsOptimized() {
  const { user, isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId } = useAuthV2();

  const fetchPatients = async (): Promise<Patient[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('patients')
      .select(`
        id,
        first_name,
        last_name,
        patient_id_alt,
        email,
        phone,
        date_of_birth,
        gender,
        address,
        city,
        state,
        zip_code,
        country,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        assigned_provider_id,
        organization_id,
        facility_id,
        is_active,
        created_at,
        updated_at,
        adherence_score,
        rtm_status,
        morning_time,
        afternoon_time,
        evening_time,
        bedtime,
        timezone
      `)
      .eq('is_active', true);

    // Apply role-based filtering
    if (isSimpillerAdmin) {
      // Simpiller admins can see all patients
    } else if (isOrganizationAdmin && userOrganizationId) {
      // Organization admins can see patients in their organization
      query = query.eq('organization_id', userOrganizationId);
    } else if (isProvider) {
      // Providers can only see their assigned patients
      query = query.eq('assigned_provider_id', user.id);
    } else {
      // No access
      return [];
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }

    return data || [];
  };

  const cacheKey = `patients-${user?.id}-${isSimpillerAdmin ? 'admin' : isOrganizationAdmin ? `org-${userOrganizationId}` : 'provider'}`;

  const result = useDataCache({
    cacheKey,
    fetchFn: fetchPatients,
    staleTime: 2 * 60 * 1000, // 2 minutes - patients data changes less frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user
  });

  // Subscribe to cache invalidation events
  const invalidatePatientsCache = () => {
    cacheManager.invalidatePattern('patients-');
  };

  return {
    ...result,
    invalidateCache: invalidatePatientsCache
  };
}
