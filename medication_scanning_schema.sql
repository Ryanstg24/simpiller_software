-- Medication Scanning System - Additional Schema
-- =============================================
-- This script adds the new tables and modifications needed for SMS alerts,
-- medication scanning, and compliance tracking without duplicating existing tables.

-- =============================================
-- PATIENT PHONE VERIFICATION (for SMS delivery)
-- =============================================
CREATE TABLE patient_phone_verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(6),
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  sms_opt_in BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, phone_number)
);

-- =============================================
-- MEDICATION ALERTS (scheduled SMS notifications)
-- =============================================
CREATE TABLE medication_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  alert_type VARCHAR(20) DEFAULT 'medication_reminder', -- medication_reminder, missed_dose, compliance_alert
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, cancelled
  sms_sid VARCHAR(100), -- Twilio SMS ID
  sms_status VARCHAR(20),
  link_token VARCHAR(255), -- Unique token for patient link
  link_expires_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COMPLIANCE SCORES (monthly patient compliance tracking)
-- =============================================
CREATE TABLE compliance_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  month_year DATE NOT NULL, -- First day of month (e.g., 2024-01-01)
  total_scheduled_medications INTEGER NOT NULL DEFAULT 0,
  total_completed_medications INTEGER NOT NULL DEFAULT 0,
  total_missed_medications INTEGER NOT NULL DEFAULT 0,
  total_late_medications INTEGER NOT NULL DEFAULT 0,
  compliance_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  streak_days INTEGER NOT NULL DEFAULT 0, -- Consecutive days with 100% compliance
  longest_streak INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, month_year)
);

-- =============================================
-- MEDICATION SCANNING SESSIONS (temporary session data)
-- =============================================
CREATE TABLE medication_scan_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  medication_ids UUID[] NOT NULL, -- Array of medication IDs for this session
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MODIFY EXISTING MEDICATION_LOGS TABLE
-- =============================================
-- Add new columns to existing medication_logs table for scanning functionality
ALTER TABLE medication_logs 
ADD COLUMN IF NOT EXISTS scan_method VARCHAR(20) DEFAULT 'qr_scan', -- qr_scan, camera, manual, api
ADD COLUMN IF NOT EXISTS scanned_medication_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS scanned_dosage VARCHAR(100),
ADD COLUMN IF NOT EXISTS scanned_time_from_label TIME,
ADD COLUMN IF NOT EXISTS image_url TEXT, -- URL to scanned image
ADD COLUMN IF NOT EXISTS ocr_data JSONB, -- Raw OCR extraction data
ADD COLUMN IF NOT EXISTS verification_score DECIMAL(3,2), -- 0.00 to 1.00 confidence score
ADD COLUMN IF NOT EXISTS session_token VARCHAR(255), -- Link to scan session
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =============================================
-- ENABLE RLS ON NEW TABLES
-- =============================================
ALTER TABLE patient_phone_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_scan_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_patient_phone_verification_patient ON patient_phone_verification(patient_id);
CREATE INDEX idx_patient_phone_verification_phone ON patient_phone_verification(phone_number);
CREATE INDEX idx_patient_phone_verification_verified ON patient_phone_verification(is_verified);

CREATE INDEX idx_medication_alerts_patient ON medication_alerts(patient_id);
CREATE INDEX idx_medication_alerts_scheduled_time ON medication_alerts(scheduled_time);
CREATE INDEX idx_medication_alerts_status ON medication_alerts(status);
CREATE INDEX idx_medication_alerts_link_token ON medication_alerts(link_token);

CREATE INDEX idx_compliance_scores_patient ON compliance_scores(patient_id);
CREATE INDEX idx_compliance_scores_month ON compliance_scores(month_year);
CREATE INDEX idx_compliance_scores_percentage ON compliance_scores(compliance_percentage);

CREATE INDEX idx_medication_scan_sessions_token ON medication_scan_sessions(session_token);
CREATE INDEX idx_medication_scan_sessions_patient ON medication_scan_sessions(patient_id);
CREATE INDEX idx_medication_scan_sessions_expires ON medication_scan_sessions(expires_at);

-- Add indexes to existing medication_logs table
CREATE INDEX IF NOT EXISTS idx_medication_logs_scan_method ON medication_logs(scan_method);
CREATE INDEX IF NOT EXISTS idx_medication_logs_session_token ON medication_logs(session_token);
CREATE INDEX IF NOT EXISTS idx_medication_logs_verification_score ON medication_logs(verification_score);

-- =============================================
-- CREATE UPDATED_AT TRIGGERS
-- =============================================
CREATE TRIGGER update_patient_phone_verification_updated_at BEFORE UPDATE ON patient_phone_verification FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medication_alerts_updated_at BEFORE UPDATE ON medication_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_scores_updated_at BEFORE UPDATE ON compliance_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medication_logs_updated_at BEFORE UPDATE ON medication_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================

-- RLS Policies for patient_phone_verification
CREATE POLICY "Simpiller admins can view all phone verifications" ON patient_phone_verification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() AND ur.name = 'simpiller_admin'
    )
  );

CREATE POLICY "Organization admins can view org phone verifications" ON patient_phone_verification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON patient_phone_verification.patient_id = p.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'organization_admin' 
        AND ur.organization_id = p.organization_id
    )
  );

CREATE POLICY "Providers can view their patients' phone verifications" ON patient_phone_verification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON patient_phone_verification.patient_id = p.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'provider' 
        AND p.assigned_provider_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their own phone verifications" ON patient_phone_verification
  FOR SELECT USING (
    -- Note: Patients don't have user accounts, so this policy is for future patient portal access
    -- For now, only providers and admins can view phone verifications
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND (ur.name = 'provider' OR ur.name = 'organization_admin' OR ur.name = 'simpiller_admin')
    )
  );

-- RLS Policies for medication_alerts
CREATE POLICY "Simpiller admins can view all medication alerts" ON medication_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() AND ur.name = 'simpiller_admin'
    )
  );

CREATE POLICY "Organization admins can view org medication alerts" ON medication_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON medication_alerts.patient_id = p.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'organization_admin' 
        AND ur.organization_id = p.organization_id
    )
  );

CREATE POLICY "Providers can view their patients' medication alerts" ON medication_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON medication_alerts.patient_id = p.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'provider' 
        AND p.assigned_provider_id = auth.uid()
    )
  );

-- RLS Policies for compliance_scores
CREATE POLICY "Simpiller admins can view all compliance scores" ON compliance_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() AND ur.name = 'simpiller_admin'
    )
  );

CREATE POLICY "Organization admins can view org compliance scores" ON compliance_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON compliance_scores.patient_id = p.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'organization_admin' 
        AND ur.organization_id = p.organization_id
    )
  );

CREATE POLICY "Providers can view their patients' compliance scores" ON compliance_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON compliance_scores.patient_id = p.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'provider' 
        AND p.assigned_provider_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their own compliance scores" ON compliance_scores
  FOR SELECT USING (
    -- Note: Patients don't have user accounts, so this policy is for future patient portal access
    -- For now, only providers and admins can view compliance scores
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND (ur.name = 'provider' OR ur.name = 'organization_admin' OR ur.name = 'simpiller_admin')
    )
  );

-- RLS Policies for medication_scan_sessions
CREATE POLICY "Anyone can view scan sessions by token" ON medication_scan_sessions
  FOR SELECT USING (true); -- Sessions are accessed by token, not user ID

CREATE POLICY "System can insert scan sessions" ON medication_scan_sessions
  FOR INSERT WITH CHECK (true); -- Allow system to create sessions

CREATE POLICY "System can update scan sessions" ON medication_scan_sessions
  FOR UPDATE USING (true); -- Allow system to update sessions

-- =============================================
-- FUNCTIONS FOR COMPLIANCE CALCULATIONS
-- =============================================

-- Function to calculate compliance score for a patient and month
CREATE OR REPLACE FUNCTION calculate_compliance_score(
  p_patient_id UUID,
  p_month_year DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_scheduled INTEGER;
  total_completed INTEGER;
  compliance_percentage DECIMAL(5,2);
BEGIN
  -- Get total scheduled medications for the month
  SELECT COUNT(*) INTO total_scheduled
  FROM medication_logs
  WHERE patient_id = p_patient_id
    AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', p_month_year);
  
  -- Get total completed medications for the month
  SELECT COUNT(*) INTO total_completed
  FROM medication_logs
  WHERE patient_id = p_patient_id
    AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', p_month_year)
    AND status = 'taken';
  
  -- Calculate percentage
  IF total_scheduled > 0 THEN
    compliance_percentage := (total_completed::DECIMAL / total_scheduled::DECIMAL) * 100;
  ELSE
    compliance_percentage := 0;
  END IF;
  
  RETURN compliance_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to generate medication alerts (placeholder for Twilio integration)
CREATE OR REPLACE FUNCTION generate_medication_alerts() RETURNS VOID AS $$
DECLARE
  medication_record RECORD;
BEGIN
  -- Find medications that need alerts (within next 30 minutes)
  FOR medication_record IN
    SELECT 
      m.id as medication_id,
      m.patient_id,
      m.name as medication_name,
      m.time_of_day,
      p.first_name,
      p.last_name,
      p.phone1
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    WHERE m.status = 'active'
      AND p.is_active = true
      AND p.phone1 IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM patient_phone_verification ppv 
        WHERE ppv.patient_id = p.id 
          AND ppv.phone_number = p.phone1 
          AND ppv.is_verified = true
      )
  LOOP
    -- Create alert with unique token
    INSERT INTO medication_alerts (
      patient_id,
      medication_id,
      scheduled_time,
      alert_type,
      status,
      link_token
    ) VALUES (
      medication_record.patient_id,
      medication_record.medication_id,
      NOW() + INTERVAL '5 minutes', -- Placeholder time - will be calculated based on time_of_day
      'medication_reminder',
      'pending',
      encode(gen_random_bytes(32), 'hex') -- Generate random token for patient link
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS FOR TWILIO INTEGRATION REFERENCE
-- =============================================
/*
TWILIO INTEGRATION NOTES:
- medication_alerts.link_token: Used in SMS links like "https://simpiller.com/scan/{token}"
- medication_alerts.sms_sid: Store Twilio SMS SID for delivery tracking
- patient_phone_verification: Verify patient phone numbers before sending SMS
- medication_scan_sessions: Temporary sessions for secure patient access
- medication_logs.session_token: Links scans back to the alert session

SMS MESSAGE FORMAT:
"Hey {patient_name}, it's time to take {medication_names}. 
Please scan your medication: https://simpiller.com/scan/{link_token}"

COMPLIANCE CALCULATION:
- Monthly scores stored in compliance_scores table
- Real-time calculation using medication_logs.status = 'taken'
- Streak tracking for consecutive days of compliance
*/ 