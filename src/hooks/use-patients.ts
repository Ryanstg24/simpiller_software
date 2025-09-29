import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface Patient {
  id: string;
  organization_id: string;
  facility_id?: string;
  assigned_provider_id?: string;
  assigned_pharmacy_id?: string;
  patient_id_alt?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth?: string;
  gender?: string;
  gender_identity?: string;
  race?: string;
  ethnicity?: string;
  phone1?: string;
  phone1_verified: boolean;
  phone2?: string;
  phone3?: string;
  email?: string;
  email_verified: boolean;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  ssn?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  
  // Medical Information
  adherence_score?: number | string;
  rtm_status?: string;
  risk_level?: string;
  notes?: string;
  
  // Time Preferences
  timezone?: string;
  morning_time?: string;
  afternoon_time?: string;
  evening_time?: string;
  bedtime?: string;
  
  // Joined data
  facilities?: {
    name: string;
    code?: string;
  };
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  pharmacies?: {
    name: string;
    npi?: string;
  };
  organizations?: {
    name: string;
  };
}

export function usePatients() {
  const { isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId, user } = useAuth();
  const queryClient = useQueryClient();

  // Simple timeout wrapper for queries to avoid indefinite loading
  function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Request timed out'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  const {
    data: patients = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['patients', user?.id, userOrganizationId], // Remove role flags from query key to prevent re-runs on auth timeout
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // If we have no role information but user is still authenticated,
      // this might be a temporary auth timeout - try to use cached data if available
      if (!isSimpillerAdmin && !isOrganizationAdmin && !isProvider && !userOrganizationId) {
        console.log('No role information available - this might be a temporary auth timeout');
        
        // Try to get existing cached data for this user
        const existingData = queryClient.getQueryData(['patients', user.id, userOrganizationId]);
        if (existingData && Array.isArray(existingData) && existingData.length > 0) {
          console.log('Using cached patients data during auth timeout');
          return existingData;
        }
        
        // If no cached data, try to fetch with a basic query (no role filtering)
        console.log('No cached data available, attempting basic query');
        const { data, error } = await supabase
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
          
        if (error) {
          console.log('Basic query failed, returning empty array');
          return [];
        }
        
        console.log('Basic query succeeded, returning data');
        return data || [];
      }

      let query = supabase
        .from('patients')
        .select(`
          *,
          facilities (
            name,
            code
          ),
          users (
            first_name,
            last_name,
            email
          ),
          pharmacies (
            name,
            npi
          ),
          organizations (
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply role-based filtering with fallback for auth timeouts
      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients
      } else if (isOrganizationAdmin && userOrganizationId) {
        // Organization Admin sees patients in their organization
        query = query.eq('organization_id', userOrganizationId);
      } else if (isProvider) {
        // Provider sees only their assigned patients
        query = query.eq('assigned_provider_id', user.id);
      } else {
        // If no roles are detected (likely auth timeout), try to fetch with user's organization
        // This prevents showing 0 patients when auth context is temporarily unavailable
        if (userOrganizationId) {
          console.log('No roles detected, falling back to organization-based query');
          query = query.eq('organization_id', userOrganizationId);
        } else {
          // Last resort: return empty array but don't throw error
          console.log('No roles or organization detected, returning empty patients list');
          return [];
        }
      }

      type SupabaseResponse<T> = { data: T[] | null; error: unknown };
      const { data, error } = await withTimeout(
        query as unknown as Promise<SupabaseResponse<Patient>>,
        15000,
        'Patients load timed out'
      );

      if (error) {
        console.error('Error fetching patients:', error);
        // If it's an auth-related error, return empty array instead of throwing
        // This prevents the entire patients list from breaking due to auth timeouts
        if (error instanceof Error && (
          error.message.includes('timeout') || 
          error.message.includes('auth') ||
          error.message.includes('permission')
        )) {
          console.log('Auth-related error detected, returning empty patients list');
          return [];
        }
        throw new Error('Failed to fetch patients');
      }

      return data || [];
    },
    enabled: !!user, // Only run query if user is authenticated
    retry: (failureCount: number, error: unknown) => {
      // Don't retry on auth-related errors to prevent infinite loops
      if (error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('auth') ||
        error.message.includes('permission')
      )) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attempt: number) => Math.min(2000 * attempt, 4000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 5 * 60 * 1000, // 5 minutes - keep data fresh longer
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache much longer to prevent disappearing
  });

  const invalidatePatients = () => {
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  };

  return {
    patients,
    loading,
    error: error instanceof Error ? error.message : (error ? String(error) : null),
    refetch,
    invalidatePatients
  };
} 