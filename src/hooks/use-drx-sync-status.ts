import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DRxSyncStatus {
  id: string;
  patient_id: string;
  drx_patient_id: string | null;
  drx_group_id: string | null;
  synced_at: string | null;
  last_sync_status: string | null;
  error_message: string | null;
  last_medication_sync_at: string | null;
}

export function useDRxSyncStatus(patientId: string | null) {
  const [syncStatus, setSyncStatus] = useState<DRxSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setSyncStatus(null);
      setLoading(false);
      return;
    }

    const fetchSyncStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('drx_patient_sync')
          .select('*')
          .eq('patient_id', patientId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
          throw fetchError;
        }

        setSyncStatus(data || null);
      } catch (err) {
        console.error('Error fetching DRx sync status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSyncStatus();
  }, [patientId]);

  return { syncStatus, loading, error };
}

