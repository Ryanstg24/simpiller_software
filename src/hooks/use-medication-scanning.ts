import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  MedicationLog, 
  MedicationScanSession, 
  ScanSessionResponse,
  ScanSubmissionRequest,
  ScanSubmissionResponse,
  ComplianceMetrics 
} from '@/types/medication-scanning';

export function useMedicationScanning() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a scan session for a patient
  const createScanSession = async (
    patientId: string, 
    medicationIds: string[], 
    scheduledTime: string
  ): Promise<MedicationScanSession | null> => {
    try {
      setLoading(true);
      setError(null);

      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const { data, error } = await supabase
        .from('medication_scan_sessions')
        .insert({
          patient_id: patientId,
          session_token: sessionToken,
          medication_ids: medicationIds,
          scheduled_time: scheduledTime,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating scan session:', error);
        throw new Error('Failed to create scan session');
      }

      return data;
    } catch (err) {
      console.error('Error in createScanSession:', err);
      setError(err instanceof Error ? err.message : 'Failed to create scan session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get scan session by token
  const getScanSession = async (sessionToken: string): Promise<ScanSessionResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: session, error: sessionError } = await supabase
        .from('medication_scan_sessions')
        .select(`
          *,
          patients (
            first_name,
            last_name
          )
        `)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (sessionError || !session) {
        throw new Error('Invalid or expired session');
      }

      // Get medications for this session
      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select('id, name, dosage, time_of_day')
        .in('id', session.medication_ids);

      if (medError) {
        console.error('Error fetching medications:', medError);
        throw new Error('Failed to fetch medications');
      }

      return {
        session,
        medications: (medications || []).map(med => ({
          ...med,
          expected_time: session.scheduled_time
        })),
        patient: session.patients
      };
    } catch (err) {
      console.error('Error in getScanSession:', err);
      setError(err instanceof Error ? err.message : 'Failed to get scan session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Submit a medication scan
  const submitMedicationScan = async (
    request: ScanSubmissionRequest
  ): Promise<ScanSubmissionResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      // Get the session first
      const session = await getScanSession(request.session_token);
      if (!session) {
        throw new Error('Invalid session');
      }

      // Process the scan (OCR if camera, manual if manual)
      let ocrResult = null;
      let verificationResult = null;

      if (request.scan_method === 'camera' && request.image_data) {
        // Process image with OCR
        ocrResult = await processImageOCR(request.image_data);
        verificationResult = await verifyMedicationScan(
          request.medication_id,
          ocrResult,
          session.medications
        );
      } else if (request.scan_method === 'manual') {
        // Manual entry verification
        verificationResult = await verifyManualEntry(
          request.medication_id,
          request.manual_medication_name || '',
          request.manual_dosage || '',
          session.medications
        );
      }

      if (!verificationResult) {
        throw new Error('Failed to verify medication scan');
      }

      // Create medication log entry
      const medicationLog = await createMedicationLog({
        patient_id: session.session.patient_id,
        medication_id: request.medication_id,
        scheduled_time: session.session.scheduled_time,
        scan_method: request.scan_method,
        scanned_medication_name: verificationResult.scanned_medication_name,
        scanned_dosage: request.manual_dosage || ocrResult?.dosage,
        verification_score: verificationResult.confidence_score,
        scan_status: verificationResult.is_valid ? 'completed' : 'missed',
        image_url: request.image_data ? await uploadScanImage(request.image_data) : undefined,
        ocr_data: ocrResult,
        notes: verificationResult.verification_notes
      });

      // Update compliance score
      const complianceUpdate = await updateComplianceScore(session.session.patient_id);

      // Mark session as inactive if all medications are scanned
      await checkAndCompleteSession(request.session_token, session.session.patient_id);

      return {
        success: true,
        verification_result: verificationResult,
        medication_log: medicationLog,
        compliance_update: complianceUpdate,
        message: verificationResult.is_valid 
          ? 'Medication scan completed successfully!' 
          : 'Medication scan failed verification'
      };
    } catch (err) {
      console.error('Error in submitMedicationScan:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit medication scan');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get patient compliance metrics
  const getPatientCompliance = async (
    patientId: string, 
    monthYear?: string
  ): Promise<ComplianceMetrics | null> => {
    try {
      setLoading(true);
      setError(null);

      const targetMonth = monthYear || new Date().toISOString().slice(0, 7) + '-01';

      const { data, error } = await supabase
        .from('compliance_scores')
        .select('*')
        .eq('patient_id', patientId)
        .eq('month_year', targetMonth)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching compliance:', error);
        throw new Error('Failed to fetch compliance data');
      }

      if (!data) {
        // Calculate compliance if not exists
        return await calculateComplianceMetrics(patientId, targetMonth);
      }

      return {
        total_scheduled: data.total_scheduled_medications,
        total_completed: data.total_completed_medications,
        total_missed: data.total_missed_medications,
        total_late: data.total_late_medications,
        compliance_percentage: data.compliance_percentage,
        streak_days: data.streak_days,
        longest_streak: data.longest_streak,
        monthly_trend: [] // TODO: Implement monthly trend calculation
      };
    } catch (err) {
      console.error('Error in getPatientCompliance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const generateSessionToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const processImageOCR = async (imageData: string): Promise<any> => {
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
    ocrResult: any,
    expectedMedications: any[]
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
    expectedMedications: any[]
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

  const createMedicationLog = async (logData: Partial<MedicationLog>): Promise<MedicationLog> => {
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

  const calculateComplianceMetrics = async (patientId: string, monthYear: string): Promise<ComplianceMetrics> => {
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