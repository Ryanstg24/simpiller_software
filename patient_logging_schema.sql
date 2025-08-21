-- Patient Logging Schema
-- This file contains the database schema for patient compliance tracking and provider time logging

-- Provider Time Logs Table
CREATE TABLE IF NOT EXISTS provider_time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  billing_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for provider_time_logs
CREATE INDEX IF NOT EXISTS idx_provider_time_logs_patient ON provider_time_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_logs_provider ON provider_time_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_logs_created_at ON provider_time_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_time_logs_activity_type ON provider_time_logs(activity_type);

-- Enable RLS on provider_time_logs
ALTER TABLE provider_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_time_logs
-- Providers can view their own time logs
CREATE POLICY "Providers can view their own time logs" ON provider_time_logs
  FOR SELECT USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND (ur.name = 'organization_admin' OR ur.name = 'simpiller_admin')
    )
  );

-- Providers can insert their own time logs
CREATE POLICY "Providers can insert their own time logs" ON provider_time_logs
  FOR INSERT WITH CHECK (
    provider_id = auth.uid()
  );

-- Providers can update their own time logs
CREATE POLICY "Providers can update their own time logs" ON provider_time_logs
  FOR UPDATE USING (
    provider_id = auth.uid()
  );

-- Providers can delete their own time logs
CREATE POLICY "Providers can delete their own time logs" ON provider_time_logs
  FOR DELETE USING (
    provider_id = auth.uid()
  );

-- Organization admins can view time logs for their organization's patients
CREATE POLICY "Organization admins can view time logs" ON provider_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN patients p ON p.id = provider_time_logs.patient_id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'organization_admin'
        AND p.organization_id = ur.organization_id
    )
  );

-- Simpiller admins can view all time logs
CREATE POLICY "Simpiller admins can view all time logs" ON provider_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() 
        AND ur.name = 'simpiller_admin'
    )
  );

-- Create updated_at trigger for provider_time_logs
CREATE TRIGGER update_provider_time_logs_updated_at 
  BEFORE UPDATE ON provider_time_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add billing_code column to existing medication_logs table if it doesn't exist
ALTER TABLE medication_logs 
ADD COLUMN IF NOT EXISTS billing_code VARCHAR(20);

-- Create index for billing_code in medication_logs
CREATE INDEX IF NOT EXISTS idx_medication_logs_billing_code ON medication_logs(billing_code);

-- Add activity_type column to medication_logs for better categorization
ALTER TABLE medication_logs 
ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50) DEFAULT 'medication_scan';

-- Create index for activity_type in medication_logs
CREATE INDEX IF NOT EXISTS idx_medication_logs_activity_type ON medication_logs(activity_type);

-- Update compliance_scores table to include more detailed metrics
ALTER TABLE compliance_scores 
ADD COLUMN IF NOT EXISTS total_medications INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_scans INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_scans INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_scans INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_verification_score DECIMAL(5,2) DEFAULT 0.00;

-- Create a view for patient compliance summary
CREATE OR REPLACE VIEW patient_compliance_summary AS
SELECT 
  p.id as patient_id,
  p.first_name,
  p.last_name,
  p.patient_id_alt,
  cs.month_year,
  cs.total_medications,
  cs.total_scans,
  cs.successful_scans,
  cs.failed_scans,
  cs.compliance_percentage as compliance_rate,
  cs.average_verification_score,
  cs.created_at as last_updated
FROM patients p
LEFT JOIN compliance_scores cs ON p.id = cs.patient_id
WHERE p.is_active = true;

-- Create a view for provider time summary
CREATE OR REPLACE VIEW provider_time_summary AS
SELECT 
  u.id as provider_id,
  u.first_name,
  u.last_name,
  u.email,
  p.id as patient_id,
  p.first_name as patient_first_name,
  p.last_name as patient_last_name,
  DATE_TRUNC('month', ptl.created_at) as month_year,
  COUNT(ptl.id) as total_entries,
  SUM(ptl.duration_minutes) as total_minutes,
  AVG(ptl.duration_minutes) as average_duration,
  STRING_AGG(DISTINCT ptl.activity_type, ', ') as activity_types
FROM users u
JOIN provider_time_logs ptl ON u.id = ptl.provider_id
JOIN patients p ON ptl.patient_id = p.id
GROUP BY u.id, u.first_name, u.last_name, u.email, p.id, p.first_name, p.last_name, DATE_TRUNC('month', ptl.created_at);

-- Create function to calculate monthly compliance scores
CREATE OR REPLACE FUNCTION calculate_monthly_compliance_score(
  patient_id_param UUID,
  month_year_param VARCHAR(7)
) RETURNS VOID AS $$
DECLARE
  total_meds INTEGER;
  total_scans INTEGER;
  successful_scans INTEGER;
  failed_scans INTEGER;
  avg_score DECIMAL(5,2);
  compliance_rate DECIMAL(5,2);
BEGIN
  -- Get total active medications for the month
  SELECT COUNT(*) INTO total_meds
  FROM medications
  WHERE patient_id = patient_id_param
    AND status = 'active'
    AND DATE_TRUNC('month', created_at) <= TO_DATE(month_year_param || '-01', 'YYYY-MM-DD');

  -- Get scan statistics for the month
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN status = 'verified' THEN 1 END),
    COUNT(CASE WHEN status = 'failed' THEN 1 END),
    AVG(verification_score)
  INTO 
    total_scans,
    successful_scans,
    failed_scans,
    avg_score
  FROM medication_logs
  WHERE patient_id = patient_id_param
    AND DATE_TRUNC('month', created_at) = TO_DATE(month_year_param || '-01', 'YYYY-MM-DD');

  -- Calculate compliance rate
  IF total_scans > 0 THEN
    compliance_rate := (successful_scans::DECIMAL / total_scans::DECIMAL) * 100;
  ELSE
    compliance_rate := 0;
  END IF;

  -- Insert or update compliance score
  INSERT INTO compliance_scores (
    patient_id, 
    month_year, 
    total_medications,
    total_scans,
    successful_scans,
    failed_scans,
    compliance_percentage,
    average_verification_score
  ) VALUES (
    patient_id_param,
    TO_DATE(month_year_param || '-01', 'YYYY-MM-DD'),
    total_meds,
    total_scans,
    successful_scans,
    failed_scans,
    compliance_rate,
    COALESCE(avg_score, 0)
  )
  ON CONFLICT (patient_id, month_year)
  DO UPDATE SET
    total_medications = EXCLUDED.total_medications,
    total_scans = EXCLUDED.total_scans,
    successful_scans = EXCLUDED.successful_scans,
    failed_scans = EXCLUDED.failed_scans,
    compliance_percentage = EXCLUDED.compliance_percentage,
    average_verification_score = EXCLUDED.average_verification_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get patient compliance report
CREATE OR REPLACE FUNCTION get_patient_compliance_report(
  patient_id_param UUID,
  months_back INTEGER DEFAULT 6
) RETURNS TABLE (
  month_year VARCHAR(7),
  total_medications INTEGER,
  total_scans INTEGER,
  successful_scans INTEGER,
  failed_scans INTEGER,
  compliance_rate DECIMAL(5,2),
  average_verification_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(cs.month_year, 'YYYY-MM') as month_year,
    cs.total_medications,
    cs.total_scans,
    cs.successful_scans,
    cs.failed_scans,
    cs.compliance_percentage as compliance_rate,
    cs.average_verification_score
  FROM compliance_scores cs
  WHERE cs.patient_id = patient_id_param
    AND cs.month_year >= CURRENT_DATE - INTERVAL '1 month' * months_back
  ORDER BY cs.month_year DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get provider time report
CREATE OR REPLACE FUNCTION get_provider_time_report(
  provider_id_param UUID,
  months_back INTEGER DEFAULT 6
) RETURNS TABLE (
  month_year VARCHAR(7),
  total_entries INTEGER,
  total_minutes INTEGER,
  average_duration DECIMAL(5,2),
  activity_types TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', ptl.created_at), 'YYYY-MM') as month_year,
    COUNT(ptl.id) as total_entries,
    SUM(ptl.duration_minutes) as total_minutes,
    AVG(ptl.duration_minutes) as average_duration,
    STRING_AGG(DISTINCT ptl.activity_type, ', ') as activity_types
  FROM provider_time_logs ptl
  WHERE ptl.provider_id = provider_id_param
    AND ptl.created_at >= CURRENT_DATE - INTERVAL '1 month' * months_back
  GROUP BY DATE_TRUNC('month', ptl.created_at)
  ORDER BY month_year DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_time_logs TO authenticated;
GRANT SELECT ON patient_compliance_summary TO authenticated;
GRANT SELECT ON provider_time_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_monthly_compliance_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_compliance_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_time_report TO authenticated; 