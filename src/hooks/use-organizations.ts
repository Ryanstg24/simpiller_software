import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Organization {
  id: string;
  name: string;
  acronym: string;
  subdomain: string;
  brand_name?: string;
  tagline?: string;
  is_active: boolean;
}

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, acronym, subdomain, is_active')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching organizations:', error);
          setError('Failed to fetch organizations');
          return;
        }

        setOrganizations(data || []);
      } catch (err) {
        console.error('Error in fetchOrganizations:', err);
        setError('Failed to fetch organizations');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return { organizations, loading, error };
} 