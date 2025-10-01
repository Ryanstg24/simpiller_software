'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';

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
  adherence_score?: number;
  rtm_status?: string;
  morning_time?: string;
  afternoon_time?: string;
  evening_time?: string;
  bedtime?: string;
  timezone?: string;
  
  // Joined data
  facilities?: {
    name: string;
    code: string;
  };
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  pharmacies?: {
    name: string;
    npi: string;
  };
  organizations?: {
    name: string;
  };
}

export function usePatientsV2() {
  const { user, isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId } = useAuthV2();

  const {
    data: patients = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['patients-v2', user?.id], // Simplified query key
    queryFn: async (): Promise<Patient[]> => {
      if (!user) {
        return [];
      }

      console.log('[Patients V2] Fetching patients for user:', user.id);

      let query = supabase
        .from('patients')
        .select(`
          *,
          facilities (name, code),
          users (first_name, last_name, email),
          pharmacies (name, npi),
          organizations (name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients
        console.log('[Patients V2] Fetching all patients (Simpiller Admin)');
      } else if (isOrganizationAdmin && userOrganizationId) {
        // Organization Admin sees patients in their organization
        query = query.eq('organization_id', userOrganizationId);
        console.log('[Patients V2] Fetching patients for organization:', userOrganizationId);
      } else if (isProvider) {
        // Provider sees only their assigned patients
        query = query.eq('assigned_provider_id', user.id);
        console.log('[Patients V2] Fetching patients for provider:', user.id);
      } else {
        // No access - return empty array
        console.log('[Patients V2] No access - returning empty array');
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Patients V2] Error fetching patients:', error);
        throw new Error(`Failed to fetch patients: ${error.message}`);
      }

      console.log('[Patients V2] Successfully fetched patients:', data?.length || 0);
      return data || [];
    },
    enabled: !!user, // Only run if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Don't refetch on mount if we have recent data
    refetchOnMount: false,
  });

  return {
    patients,
    loading,
    error: error?.message || null,
    refetch
  };
}
