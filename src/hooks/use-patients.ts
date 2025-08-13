import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface Patient {
  id: string;
  organization_id: string;
  facility_id?: string;
  assigned_provider_id?: string;
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
  adherence_score?: string;
  rtm_status?: string;
  risk_level?: string;
  notes?: string;
  morning_time?: string;
  afternoon_time?: string;
  evening_time?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  facilities?: {
    name: string;
    code?: string;
  };
  organizations?: {
    name: string;
    acronym: string;
  };
  users?: {
    first_name: string;
    last_name: string;
  };
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId, user } = useAuth();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching patients with:', { 
          isSimpillerAdmin, 
          isOrganizationAdmin,
          isProvider,
          userOrganizationId, 
          userId: user?.id,
          isAuthenticated: !!user 
        });

        // Check if user is authenticated
        if (!user) {
          console.log('User not authenticated, skipping fetch');
          setPatients([]);
          return;
        }

        // Try a simple query first to test if RLS is the issue
        console.log('Testing simple query...');
        console.log('Current user:', user);
        console.log('User ID:', user?.id);
        
        // First, let's check if we can access the users table to verify authentication
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', user?.id)
          .single();

        if (userError) {
          console.error('User query failed:', userError);
          console.error('User error details:', {
            message: userError.message,
            details: userError.details,
            hint: userError.hint,
            code: userError.code
          });
        } else {
          console.log('User query succeeded:', userData);
        }

        const { data: testData, error: testError } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .limit(1);

        if (testError) {
          console.error('Simple query failed:', testError);
          console.error('Test error details:', {
            message: testError.message,
            details: testError.details,
            hint: testError.hint,
            code: testError.code,
            fullError: JSON.stringify(testError, null, 2)
          });
          // Don't set error here, just log it and continue with empty array
          console.log('Continuing with empty patients array due to database access issue');
          setPatients([]);
          return;
        }

        console.log('Simple query succeeded, proceeding with full query...');

        let patientsQuery = supabase
          .from('patients')
          .select(`
            *,
            facilities (
              name,
              code
            ),
            organizations (
              name,
              acronym
            ),
            users!patients_assigned_provider_id_fkey (
              first_name,
              last_name
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        // Apply role-based filtering
        if (isSimpillerAdmin) {
          // Simpiller Admin sees all patients
          console.log('Simpiller Admin: showing all patients');
        } else if (isOrganizationAdmin && userOrganizationId) {
          // Organization Admin sees patients in their organization
          console.log('Organization Admin: filtering by organization:', userOrganizationId);
          patientsQuery = patientsQuery.eq('organization_id', userOrganizationId);
        } else if (isProvider) {
          // Provider sees only their assigned patients
          console.log('Provider: filtering by assigned provider:', user.id);
          patientsQuery = patientsQuery.eq('assigned_provider_id', user.id);
        } else {
          // Other roles see no patients
          console.log('Other role: showing no patients');
          setPatients([]);
          return;
        }

        const { data, error } = await patientsQuery;

        if (error) {
          console.error('Error fetching patients:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: JSON.stringify(error, null, 2)
          });
          
          // If it's an RLS error, show a more helpful message
          if (error.code === '42501' || error.message?.includes('permission')) {
            console.log('RLS permission error - this is expected if RLS is enabled without proper policies');
            setError('Access denied. Please check RLS policies or contact administrator.');
          } else {
            setError(`Failed to fetch patients: ${error.message}`);
          }
          return;
        }

        console.log('Patients fetched successfully:', data?.length || 0, 'patients');
        setPatients(data || []);
      } catch (err) {
        console.error('Error in fetchPatients:', err);
        // Don't set error here, just log it and continue with empty array
        console.log('Continuing with empty patients array due to exception');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [isSimpillerAdmin, isOrganizationAdmin, isProvider, userOrganizationId, user]);

  return { patients, loading, error };
} 