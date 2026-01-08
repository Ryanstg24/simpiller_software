import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthV2 } from '@/contexts/auth-context-v2';

export const PARTNERED_PHARMACY_NAME = "Our Partnered Pharmacy";

export interface Pharmacy {
  id: string;
  organization_id: string | null; // Can be null for partner pharmacies
  name: string;
  npi?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  pharmacy_type?: string;
  is_partner: boolean;
  is_default: boolean;
  api_endpoint?: string;
  api_key?: string;
  integration_enabled: boolean;
  is_active: boolean;
  drx_group_name?: string;
  created_at: string;
  updated_at: string;
  organizations?: {
    name: string;
    acronym: string;
  };
}

export function usePharmacies() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSimpillerAdmin, isOrganizationAdmin, userOrganizationId } = useAuthV2();

  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setError('Request timed out. Please refresh the page.');
        setLoading(false);
      }, 30000); // 30 second timeout

      let query = supabase
        .from('pharmacies')
        .select(`
          *,
          organizations (
            name,
            acronym
          )
        `)
        .eq('is_active', true)
        .order('name');

      // Apply role-based filtering
      if (isSimpillerAdmin) {
        // Simpiller admins can see all pharmacies (including partner pharmacies)
      } else if (isOrganizationAdmin && userOrganizationId) {
        // Organization admins can see their organization's pharmacies + partner pharmacies
        query = query.or(`organization_id.eq.${userOrganizationId},is_partner.eq.true`);
      } else {
        // Providers and others can't see pharmacies (they'll see them through patients)
        setPharmacies([]);
        setLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      const { data, error } = await query;

      // Clear timeout on successful response
      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching pharmacies:', error);
        setError('Failed to fetch pharmacies');
        return;
      }

      let pharmaciesList = data || [];
      
      // Ensure "Our Partnered Pharmacy" exists and appears first
      const partneredPharmacy = pharmaciesList.find(p => p.name === PARTNERED_PHARMACY_NAME);
      
      if (!partneredPharmacy) {
        // Create a virtual/hardcoded partnered pharmacy entry
        const hardcodedPharmacy: Pharmacy = {
          id: 'partnered-pharmacy-hardcoded',
          organization_id: '',
          name: PARTNERED_PHARMACY_NAME,
          is_partner: true,
          is_default: false,
          integration_enabled: true,
          is_active: true,
          drx_group_name: 'Simpiller',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        pharmaciesList = [hardcodedPharmacy, ...pharmaciesList];
      } else {
        // Move partnered pharmacy to the front
        pharmaciesList = pharmaciesList.filter(p => p.name !== PARTNERED_PHARMACY_NAME);
        pharmaciesList = [partneredPharmacy, ...pharmaciesList];
      }

      setPharmacies(pharmaciesList);
    } catch (err) {
      console.error('Error in fetchPharmacies:', err);
      setError('Failed to fetch pharmacies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacies();
  }, [isSimpillerAdmin, isOrganizationAdmin, userOrganizationId]);

  const createPharmacy = async (pharmacyData: Partial<Pharmacy>) => {
    try {
      // Only Simpiller admins can create partner pharmacies
      if (pharmacyData.is_partner && !isSimpillerAdmin) {
        throw new Error('Only Simpiller admins can create partner pharmacies');
      }

      const { data, error } = await supabase
        .from('pharmacies')
        .insert([pharmacyData])
        .select(`
          *,
          organizations (
            name,
            acronym
          )
        `)
        .single();

      if (error) {
        console.error('Error creating pharmacy:', error);
        throw new Error('Failed to create pharmacy');
      }

      setPharmacies(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error in createPharmacy:', err);
      throw err;
    }
  };

  const updatePharmacy = async (id: string, updates: Partial<Pharmacy>) => {
    try {
      // Check if trying to update a partner pharmacy
      const existingPharmacy = pharmacies.find(p => p.id === id);
      if (existingPharmacy?.is_partner && !isSimpillerAdmin) {
        throw new Error('Only Simpiller admins can modify partner pharmacies');
      }

      // Only Simpiller admins can change partner status
      if (updates.is_partner !== undefined && !isSimpillerAdmin) {
        throw new Error('Only Simpiller admins can change partner pharmacy status');
      }

      const { data, error } = await supabase
        .from('pharmacies')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          organizations (
            name,
            acronym
          )
        `)
        .single();

      if (error) {
        console.error('Error updating pharmacy:', error);
        throw new Error('Failed to update pharmacy');
      }

      setPharmacies(prev => prev.map(pharmacy => 
        pharmacy.id === id ? data : pharmacy
      ));
      return data;
    } catch (err) {
      console.error('Error in updatePharmacy:', err);
      throw err;
    }
  };

  const deletePharmacy = async (id: string) => {
    try {
      // Check if trying to delete a partner pharmacy
      const existingPharmacy = pharmacies.find(p => p.id === id);
      if (existingPharmacy?.is_partner) {
        throw new Error('Partner pharmacies cannot be deleted');
      }

      const { error } = await supabase
        .from('pharmacies')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting pharmacy:', error);
        throw new Error('Failed to delete pharmacy');
      }

      setPharmacies(prev => prev.filter(pharmacy => pharmacy.id !== id));
    } catch (err) {
      console.error('Error in deletePharmacy:', err);
      throw err;
    }
  };

  return {
    pharmacies,
    loading,
    error,
    createPharmacy,
    updatePharmacy,
    deletePharmacy,
    refresh: fetchPharmacies
  };
} 