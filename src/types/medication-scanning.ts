// Medication Scanning and Compliance System Types
// =============================================

export interface MedicationLog {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_time: string;
  scanned_time?: string;
  scan_status: 'pending' | 'completed' | 'missed' | 'late';
  scan_method: 'camera' | 'manual' | 'api';
  scanned_medication_name?: string;
  scanned_dosage?: string;
  scanned_time_from_label?: string;
  image_url?: string;
  ocr_data?: Record<string, unknown>;
  verification_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  medications?: {
    name: string;
    dosage: string;
    time_of_day: string;
  };
  patients?: {
    first_name: string;
    last_name: string;
  };
}

export interface PatientPhoneVerification {
  id: string;
  patient_id: string;
  phone_number: string;
  is_verified: boolean;
  verification_code?: string;
  verification_expires_at?: string;
  sms_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationAlert {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_time: string;
  alert_type: 'medication_reminder' | 'missed_dose' | 'compliance_alert';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  sms_sid?: string;
  sms_status?: string;
  link_token: string;
  link_expires_at?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  medications?: {
    name: string;
    dosage: string;
    time_of_day: string;
  };
  patients?: {
    first_name: string;
    last_name: string;
    phone1?: string;
  };
}

export interface ComplianceScore {
  id: string;
  patient_id: string;
  month_year: string;
  total_scans: number;
  completed_scans: number;
  compliance_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface MedicationScanSession {
  id: string;
  patient_id: string;
  medication_id: string;
  scan_token: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  
  // Joined data
  patients?: {
    first_name: string;
    last_name: string;
  };
  medications?: {
    medication_name: string;
    dosage: string;
  };
}

export interface MedicationScanLog {
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

export interface ProviderTimeLog {
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
  
  // Joined data
  providers?: {
    first_name: string;
    last_name: string;
  };
}

// OCR and Image Processing Types
export interface OCRResult {
  medication_name?: string;
  dosage?: string;
  time?: string;
  manufacturer?: string;
  lot_number?: string;
  expiration_date?: string;
  confidence_score: number;
  raw_text: string;
  extracted_fields: Record<string, unknown>;
}

export interface ScanVerificationResult {
  is_valid: boolean;
  confidence_score: number;
  matched_medication_id?: string;
  expected_medication_name: string;
  scanned_medication_name: string;
  verification_notes?: string;
  discrepancies: string[];
}

// SMS and Alert Types
export interface SMSMessage {
  to: string;
  from: string;
  body: string;
  link_token?: string;
  patient_name?: string;
  medication_names?: string[];
  scheduled_time?: string;
}

export interface AlertGenerationRequest {
  patient_id: string;
  medication_ids: string[];
  scheduled_time: string;
  alert_type: 'medication_reminder' | 'missed_dose' | 'compliance_alert';
}

// Compliance Calculation Types
export interface ComplianceMetrics {
  total_scheduled: number;
  total_completed: number;
  total_missed: number;
  total_late: number;
  compliance_percentage: number;
  streak_days: number;
  longest_streak: number;
  monthly_trend: Array<{
    date: string;
    compliance: number;
  }>;
}

export interface PatientComplianceReport {
  patient_id: string;
  patient_name: string;
  month_year: string;
  metrics: ComplianceMetrics;
  medication_breakdown: Array<{
    medication_name: string;
    scheduled_count: number;
    completed_count: number;
    missed_count: number;
    compliance_percentage: number;
  }>;
  recent_activity: Array<{
    date: string;
    medication_name: string;
    status: 'completed' | 'missed' | 'late';
    scanned_time?: string;
  }>;
}

// API Response Types
export interface ScanSessionResponse {
  session: MedicationScanSession;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    time_of_day: string;
    expected_time: string;
  }>;
  patient: {
    first_name: string;
    last_name: string;
  };
}

export interface ScanSubmissionRequest {
  session_token: string;
  medication_id: string;
  image_data: string; // Base64 encoded image
  scan_method: 'camera' | 'manual';
  manual_medication_name?: string;
  manual_dosage?: string;
}

export interface ScanSubmissionResponse {
  success: boolean;
  verification_result: ScanVerificationResult;
  medication_log: MedicationLog;
  compliance_update?: {
    current_score: number;
    streak_days: number;
  };
  message: string;
} 