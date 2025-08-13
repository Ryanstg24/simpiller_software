import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

export interface Facility {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organizations?: {
    name: string;
    acronym: string;
  };
}

export function useFacilities() {
  const { user, isSimpillerAdmin } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let facilitiesQuery = supabase
          .from('facilities')
          .select(`
            *,
            organizations (
              name,
              acronym
            )
          `)
          .eq('is_active', true)
          .order('name');

        if (isSimpillerAdmin) {
          // Simpiller Admins can see all facilities across all organizations
          console.log('Fetching all facilities for Simpiller Admin');
        } else {
          // Other users need to get their organization through role assignments
          const { data: userRoles, error: roleError } = await supabase
            .from('user_role_assignments')
            .select(`
              user_roles (
                organization_id
              )
            `)
            .eq('user_id', user.id);

          if (roleError) {
            console.error('Error fetching user roles:', roleError);
            setError('Failed to fetch user organization');
            return;
          }

          if (!userRoles || userRoles.length === 0) {
            setError('No organization found for user');
            return;
          }

          // Get the organization ID from the first role assignment
          const organizationId = (userRoles[0].user_roles as any)?.organization_id;
          
          if (!organizationId) {
            setError('No organization found for user');
            return;
          }

          // Filter facilities by organization
          facilitiesQuery = facilitiesQuery.eq('organization_id', organizationId);
        }

        const { data: facilitiesData, error: facilitiesError } = await facilitiesQuery;

        if (facilitiesError) {
          console.error('Error fetching facilities:', facilitiesError);
          setError('Failed to fetch facilities');
          return;
        }

        setFacilities(facilitiesData || []);
      } catch (err) {
        console.error('Error in fetchFacilities:', err);
        setError('Failed to fetch facilities');
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [user, isSimpillerAdmin]);

  return { facilities, loading, error };
} 