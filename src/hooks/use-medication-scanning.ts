import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import OCRService, { OCRResult, MedicationLabelData } from '@/lib/ocr';

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

interface ComplianceScore {
  id: string;
  patient_id: string;
  month_year: string;
  total_scans: number;
  completed_scans: number;
  compliance_percentage: number;
  created_at: string;
  updated_at: string;
}

interface ProviderTimeLog {
  id: string;
  patient_id: string;
  provider_id: string;
  activity_type: string;
  description?: string;
  duration_minutes: number;
  date: string;
  billing_code?: string;
  created_at: string;
  updated_at: string;
}

export function useMedicationScanning() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Submit medication scan
  const submitScanMutation = useMutation({
    mutationFn: async (request: { 
      scanSessionId: string; 
      scanData: {
        medication_name?: string;
        dosage?: string;
        patient_name?: string;
        confidence: number;
        raw_text: string;
      };
    }) => {
      const { scanSessionId, scanData } = request;

      // Log the scan
      const { data: logData, error: logError } = await supabase
        .from('medication_scan_logs')
        .insert({
          scan_session_id: scanSessionId,
          medication_id: scanData.medication_name || 'unknown',
          patient_id: scanData.patient_name || 'unknown',
          scan_data: scanData,
          scan_result: 'success',
        })
        .select()
        .single();

      if (logError) {
        console.error('Error logging scan:', logError);
        throw logError;
      }

      // Update scan session status
      const { error: updateError } = await supabase
        .from('medication_scan_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', scanSessionId);

      if (updateError) {
        console.error('Error updating scan session:', updateError);
        throw updateError;
      }

      return logData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-scores'] });
    },
  });

  // Get compliance scores for a patient
  const getComplianceScores = useQuery({
    queryKey: ['compliance-scores'],
    queryFn: async (): Promise<ComplianceScore[]> => {
      const { data, error } = await supabase
        .from('compliance_scores')
        .select('*')
        .order('month_year', { ascending: false });

      if (error) {
        console.error('Error fetching compliance scores:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Get time logs for a patient
  const getTimeLogs = useQuery({
    queryKey: ['time-logs'],
    queryFn: async (): Promise<ProviderTimeLog[]> => {
      const { data, error } = await supabase
        .from('provider_time_logs')
        .select(`
          *,
          providers (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching time logs:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Helper functions
  const generateSessionToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const processImageOCR = async (imageData: string): Promise<OCRResult> => {
    // TODO: Implement OCR processing
    // This would integrate with a service like Google Vision API, AWS Textract, or similar
    console.log('Processing image with OCR...');
    return {
      medication_name: 'Sample Medication',
      dosage: '10mg',
      confidence_score: 0.85,
      raw_text: 'Sample medication label text'
    };
  };

  const verifyMedicationScan = async (
    expectedMedicationId: string,
    ocrResult: OCRResult,
    expectedMedications: MedicationLabelData[]
  ): Promise<any> => {
    // TODO: Implement medication verification logic
    const expectedMed = expectedMedications.find(m => m.id === expectedMedicationId);
    
    return {
      is_valid: true,
      confidence_score: ocrResult.confidence_score,
      expected_medication_name: expectedMed?.name || '',
      scanned_medication_name: ocrResult.medication_name || '',
      verification_notes: 'Medication verified successfully',
      discrepancies: []
    };
  };

  const verifyManualEntry = async (
    expectedMedicationId: string,
    manualMedicationName: string,
    manualDosage: string,
    expectedMedications: MedicationLabelData[]
  ): Promise<any> => {
    const expectedMed = expectedMedications.find(m => m.id === expectedMedicationId);
    
    return {
      is_valid: true,
      confidence_score: 0.9,
      expected_medication_name: expectedMed?.name || '',
      scanned_medication_name: manualMedicationName,
      verification_notes: 'Manual entry verified',
      discrepancies: []
    };
  };

  const createMedicationLog = async (logData: Partial<ScanLog>): Promise<ScanLog> => {
    const { data, error } = await supabase
      .from('medication_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create medication log');
    }

    return data;
  };

  const uploadScanImage = async (imageData: string): Promise<string> => {
    // TODO: Implement image upload to Supabase Storage
    console.log('Uploading scan image...');
    return 'https://example.com/scan-image.jpg';
  };

  const updateComplianceScore = async (patientId: string): Promise<any> => {
    // TODO: Implement compliance score calculation
    console.log('Updating compliance score...');
    return {
      current_score: 95.5,
      streak_days: 7
    };
  };

  const checkAndCompleteSession = async (sessionToken: string, patientId: string): Promise<void> => {
    // Check if all medications in session are completed
    const { data: logs, error } = await supabase
      .from('medication_logs')
      .select('medication_id, scan_status')
      .eq('patient_id', patientId)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

    if (error) {
      console.error('Error checking session completion:', error);
      return;
    }

    // TODO: Implement session completion logic
    console.log('Checking session completion...');
  };

  const calculateComplianceMetrics = async (patientId: string, monthYear: string): Promise<any> => {
    // TODO: Implement compliance calculation
    return {
      total_scheduled: 0,
      total_completed: 0,
      total_missed: 0,
      total_late: 0,
      compliance_percentage: 0,
      streak_days: 0,
      longest_streak: 0,
      monthly_trend: []
    };
  };

  return {
    loading,
    error,
    createScanSession,
    getScanSession,
    submitMedicationScan,
    getPatientCompliance
  };
} 