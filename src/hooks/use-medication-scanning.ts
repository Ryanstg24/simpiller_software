import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { OCRResult } from '@/lib/ocr';

interface ScanSession {
  id: string;
  patient_id: string;
  medication_id: string;
  scan_token: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

interface ScanLog {
  id: string;
  scan_session_id: string;
  medication_id: string;
  patient_id: string;
  scan_data: {
    medication_name?: string;
    dosage?: string;
    patient_name?: string;
    confidence: number;
    raw_text: string;
  };
  scan_result: 'success' | 'failed' | 'partial';
  created_at: string;
}

interface PatientCompliance {
  patient_id: string;
  current_month_score: number;
  total_scheduled: number;
  total_completed: number;
  total_missed: number;
  recent_scans: ScanLog[];
}

export function useMedicationScanning() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createScanSession = useCallback(async (patientId: string, medicationId: string): Promise<ScanSession> => {
    try {
      setLoading(true);
      setError(null);

      // Generate a unique scan token
      const scanToken = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sessionData = {
        patient_id: patientId,
        medication_id: medicationId,
        scan_token: scanToken,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('medication_scan_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create scan session';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getScanSession = useCallback(async (token: string): Promise<ScanSession | null> => {
    try {
      const { data, error } = await supabase
        .from('medication_scan_sessions')
        .select('*')
        .eq('scan_token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No session found
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error fetching scan session:', err);
      return null;
    }
  }, []);

  const submitMedicationScan = useMutation({
    mutationFn: async (params: {
      sessionToken: string;
      imageData?: string;
      ocrResult?: OCRResult;
      manualEntry?: {
        medicationName: string;
        dosage: string;
        patientName: string;
      };
    }) => {
      try {
        setLoading(true);
        setError(null);

        // Get the scan session
        const session = await getScanSession(params.sessionToken);
        if (!session) {
          throw new Error('Invalid scan session');
        }

        let scanResult: 'success' | 'failed' | 'partial' = 'failed';
        let scanData: ScanLog['scan_data'];

        if (params.ocrResult) {
          // OCR scan submission
          scanData = {
            medication_name: '', // Will be extracted from parsed result
            dosage: '', // Will be extracted from parsed result
            patient_name: '', // Will be extracted from parsed result
            confidence: params.ocrResult.confidence,
            raw_text: params.ocrResult.text
          };
          scanResult = params.ocrResult.confidence > 0.7 ? 'success' : 'partial';
        } else if (params.manualEntry) {
          // Manual entry submission
          scanData = {
            medication_name: params.manualEntry.medicationName,
            dosage: params.manualEntry.dosage,
            patient_name: params.manualEntry.patientName,
            confidence: 0.9, // High confidence for manual entry
            raw_text: `Manual entry: ${params.manualEntry.medicationName} - ${params.manualEntry.dosage}`
          };
          scanResult = 'success';
        } else {
          throw new Error('No scan data provided');
        }

        // Create medication log
        const logData = {
          scan_session_id: session.id,
          medication_id: session.medication_id,
          patient_id: session.patient_id,
          scan_data: scanData,
          scan_result: scanResult,
          created_at: new Date().toISOString()
        };

        const { data: logResult, error: logError } = await supabase
          .from('medication_logs')
          .insert(logData)
          .select()
          .single();

        if (logError) throw logError;

        // Update session status
        await supabase
          .from('medication_scan_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', session.id);

        return logResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit scan';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-compliance'] });
    }
  });

  const getPatientCompliance = useQuery<PatientCompliance>({
    queryKey: ['patient-compliance'],
    queryFn: async (): Promise<PatientCompliance> => {
      // This would be implemented with actual database queries
      // For now, return mock data
      return {
        patient_id: '',
        current_month_score: 95.5,
        total_scheduled: 30,
        total_completed: 28,
        total_missed: 2,
        recent_scans: []
      };
    },
    enabled: false // Only run when explicitly called
  });

  return {
    loading,
    error,
    createScanSession,
    getScanSession,
    submitMedicationScan,
    getPatientCompliance
  };
} 