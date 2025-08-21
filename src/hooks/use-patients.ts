import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
}

export function usePatients() {
  const { isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId, user } = useAuth();

  const {
    data: patients = [],
    loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['patients', isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId, user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
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
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (isSimpillerAdmin) {
        // Simpiller Admin sees all patients
      } else if (isOrganizationAdmin && userOrganizationId) {
        // Organization Admin sees patients in their organization
        query = query.eq('organization_id', userOrganizationId);
      } else if (isProvider) {
        // Provider sees only their assigned patients
        query = query.eq('assigned_provider_id', user.id);
      } else {
        // Other roles see no patients
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching patients:', error);
        throw new Error('Failed to fetch patients');
      }

      return data || [];
    },
    enabled: !!user, // Only run query if user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();

  const invalidatePatients = () => {
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  };

  return {
    patients,
    loading,
    error: error?.message || null,
    refetch,
    invalidatePatients
  };
} 