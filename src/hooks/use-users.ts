import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  npi?: string;
  is_active: boolean;
  created_at: string;
  organizations?: {
    name: string;
    acronym: string;
  };
  user_roles?: {
    name: string;
    organization_id?: string;
    organization?: {
      name: string;
      acronym: string;
    };
  }[];
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone,
            npi,
            is_active,
            created_at,
            user_role_assignments (
              user_roles (
                name,
                organization_id,
                organizations (
                  name,
                  acronym
                )
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users:', error);
          setError('Failed to fetch users');
          return;
        }

        // Transform the data to flatten the nested structure
        const transformedUsers = data?.map(user => {
          const userRoles = (user.user_role_assignments as any[])?.map((assignment: any) => ({
            name: assignment.user_roles.name,
            organization_id: assignment.user_roles.organization_id,
            organization: assignment.user_roles.organizations
          })) || [];

          return {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            npi: user.npi,
            is_active: user.is_active,
            created_at: user.created_at,
            user_roles: userRoles
          };
        }) || [];

        setUsers(transformedUsers);
      } catch (err) {
        console.error('Error in fetchUsers:', err);
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
} 