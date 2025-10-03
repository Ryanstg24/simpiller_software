-- Simpiller Improved Database Schema for Supabase
-- Multi-tenant healthcare medication management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ORGANIZATIONS (Multi-tenant top level)
-- =============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  subdomain VARCHAR(50) UNIQUE,
  acronym VARCHAR(20),
  brand_name VARCHAR(50),
  tagline VARCHAR(255),
  colors VARCHAR(255) DEFAULT 'ff6600,0da2b0,0066ff',
  
  -- Contact Info
  street1 VARCHAR(100),
  street2 VARCHAR(100),
  city VARCHAR(100),
  state CHAR(2),
  postal_code VARCHAR(20),
  country VARCHAR(10) DEFAULT 'US',
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(255),
  
  -- Healthcare Specific
  clia_id VARCHAR(10),
  taxonomy VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  
  -- Settings
  client_name VARCHAR(50) DEFAULT 'Client',
  patient_id_title VARCHAR(50) DEFAULT 'Client ID',
  clinician_title VARCHAR(50) DEFAULT 'Clinician',
  
  -- Billing
  setup_fee DECIMAL(10,2) DEFAULT 500.00,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FACILITIES (Locations within organizations)
-- =============================================
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  
  -- Address
  street1 VARCHAR(100),
  street2 VARCHAR(100),
  city VARCHAR(100),
  state CHAR(2),
  postal_code VARCHAR(20),
  country VARCHAR(10) DEFAULT 'US',
  
  -- Contact
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(100),
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PHARMACIES (Pharmacy management)
-- =============================================
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  npi VARCHAR(10) UNIQUE, -- National Provider Identifier for pharmacy
  
  -- Address
  street1 VARCHAR(100),
  street2 VARCHAR(100),
  city VARCHAR(100),
  state CHAR(2),
  postal_code VARCHAR(20),
  country VARCHAR(10) DEFAULT 'US',
  
  -- Contact
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(255),
  
  -- Pharmacy specific
  pharmacy_type VARCHAR(50) DEFAULT 'retail', -- retail, mail_order, specialty, etc.
  is_partner BOOLEAN DEFAULT false, -- Partner pharmacy gets priority
  is_default BOOLEAN DEFAULT false, -- Default pharmacy for organization
  
  -- Integration settings
  api_endpoint VARCHAR(255),
  api_key VARCHAR(255),
  integration_enabled BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER ROLES (Role-based access control)
-- =============================================
CREATE TYPE user_role AS ENUM (
  'simpiller_admin',    -- Can see all organizations
  'organization_admin', -- Can see their organization
  'provider',          -- Can see assigned patients
  'billing'            -- Can see billing data
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name user_role NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USERS (Authentication & profiles)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255),
  
  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  
  -- Healthcare specific
  npi VARCHAR(10), -- National Provider Identifier
  license_number VARCHAR(50),
  specialty VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sign_in_at TIMESTAMP WITH TIME ZONE
);

-- User role assignments
CREATE TABLE user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- =============================================
-- PATIENTS (Multi-tenant patient data)
-- =============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  assigned_provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  
  -- Patient Info
  patient_id_alt VARCHAR(100) UNIQUE, -- External patient ID
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  suffix VARCHAR(50),
  
  -- Demographics
  date_of_birth DATE,
  gender CHAR(1) CHECK (gender IN ('M', 'F', 'X', 'U')),
  gender_identity CHAR(1) CHECK (gender_identity IN ('M', 'F', 'X', 'U')),
  race VARCHAR(50),
  ethnicity VARCHAR(50),
  
  -- Contact Info
  phone1 VARCHAR(20),
  phone1_verified BOOLEAN DEFAULT false,
  phone2 VARCHAR(20),
  phone3 VARCHAR(20),
  email VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  
  -- Address
  street1 VARCHAR(100),
  street2 VARCHAR(100),
  city VARCHAR(100),
  state CHAR(2),
  postal_code VARCHAR(20),
  country VARCHAR(10) DEFAULT 'US',
  
  -- Medical
  ssn VARCHAR(20),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- MEDICATIONS (Enhanced medication tracking)
-- =============================================
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescribed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pharmacy_npi VARCHAR(10),
  
  -- Medication Details
  name VARCHAR(100) NOT NULL,
  generic_name VARCHAR(100),
  ndc_id VARCHAR(50),
  medispan_id VARCHAR(50),
  drug_class VARCHAR(50),
  
  -- Dosage
  strength VARCHAR(50),
  format VARCHAR(50) DEFAULT 'UNSPECIFIED',
  dose_count INTEGER DEFAULT 1, -- pills per dose
  max_daily INTEGER DEFAULT 1,
  quantity INTEGER DEFAULT 0,
  frequency INTEGER DEFAULT 1, -- times per day
  
  -- Instructions
  time_of_day VARCHAR(50),
  with_food BOOLEAN DEFAULT false,
  avoid_alcohol BOOLEAN DEFAULT false,
  impairment_warning BOOLEAN DEFAULT false,
  special_instructions TEXT,
  
  -- Prescription
  rx_number VARCHAR(50),
  rx_filled_date DATE,
  rx_refills INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'on_hold')),
  start_date DATE,
  end_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_dose_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- MEDICATION SCHEDULES (When to take meds)
-- =============================================
CREATE TABLE medication_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  
  -- Schedule
  time_of_day TIME NOT NULL,
  days_of_week INTEGER DEFAULT 127, -- Bitmap: 1=Sunday, 2=Monday, etc.
  is_active BOOLEAN DEFAULT true,
  
  -- Alert settings
  alert_email BOOLEAN DEFAULT true,
  alert_sms BOOLEAN DEFAULT true,
  alert_advance_minutes INTEGER DEFAULT 15,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SESSION COMPLIANCE LOG (Session-level tracking)
-- =============================================
CREATE TABLE session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES medication_scan_sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Event details
  event_key VARCHAR(20), -- YYYYMMDDH format
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'partial')),
  
  -- Session details
  total_medications INTEGER NOT NULL DEFAULT 0,
  scanned_medications INTEGER NOT NULL DEFAULT 0,
  missed_medications INTEGER NOT NULL DEFAULT 0,
  
  -- QR Code tracking (for the first scanned medication)
  qr_code_scanned VARCHAR(255),
  raw_scan_data TEXT,
  
  -- Alert tracking
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  alert_type VARCHAR(20), -- 'sms', 'email'
  alert_response VARCHAR(255),
  
  -- Metadata
  source VARCHAR(50), -- 'qr_scan', 'manual', 'api', 'expired_session'
  completion_time TIMESTAMP WITH TIME ZONE, -- When session was completed
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEDICATION COMPLIANCE LOG (Individual medication tracking - kept for detailed tracking)
-- =============================================
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_log_id UUID REFERENCES session_logs(id) ON DELETE CASCADE, -- Link to session log
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES medication_schedules(id) ON DELETE SET NULL,
  
  -- Event details
  event_key VARCHAR(20), -- YYYYMMDDH format
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'taken' CHECK (status IN ('taken', 'missed', 'skipped')),
  
  -- QR Code tracking
  qr_code_scanned VARCHAR(255),
  raw_scan_data TEXT,
  
  -- Alert tracking
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  alert_type VARCHAR(20), -- 'sms', 'email'
  alert_response VARCHAR(255),
  
  -- Metadata
  source VARCHAR(50), -- 'qr_scan', 'manual', 'api'
  error_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEDICATION SCAN SESSIONS (QR code scan sessions)
-- =============================================
CREATE TABLE medication_scan_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_ids UUID[] NOT NULL, -- Array of medication IDs for this session
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for medication_scan_sessions updated_at
CREATE TRIGGER update_medication_scan_sessions_updated_at
  BEFORE UPDATE ON medication_scan_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ALERTS (Medication reminders)
-- =============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES medication_schedules(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('sms', 'email', 'push')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Content
  message TEXT,
  recipient VARCHAR(255), -- phone or email
  response VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PATIENT PROVIDER ASSIGNMENTS
-- =============================================
CREATE TABLE patient_provider_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  
  -- Assignment details
  assignment_type VARCHAR(20) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary', 'consultant')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(patient_id, provider_id, assignment_type)
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_provider_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medications table
-- Simpiller admins can access all medications, regular users only their organization
CREATE POLICY "Users can view medications for patients in their organization" ON medications
  FOR SELECT USING (
    -- Simpiller admins can view all medications
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Regular users can view medications for patients in their organization
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = medications.patient_id
      AND ur.organization_id = p.organization_id
    )
  );

CREATE POLICY "Users can insert medications for patients in their organization" ON medications
  FOR INSERT WITH CHECK (
    -- Simpiller admins can insert medications for any patient
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Regular users can insert medications for patients in their organization
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = medications.patient_id
      AND ur.organization_id = p.organization_id
    )
  );

CREATE POLICY "Users can update medications for patients in their organization" ON medications
  FOR UPDATE USING (
    -- Simpiller admins can update all medications
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Regular users can update medications for patients in their organization
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = medications.patient_id
      AND ur.organization_id = p.organization_id
    )
  );

CREATE POLICY "Users can delete medications for patients in their organization" ON medications
  FOR DELETE USING (
    -- Simpiller admins can delete all medications
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Regular users can delete medications for patients in their organization
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = medications.patient_id
      AND ur.organization_id = p.organization_id
    )
  );

-- RLS Policies for facilities table
-- Organization admins can manage facilities in their organization
CREATE POLICY "Organization admins can view facilities in their organization" ON facilities
  FOR SELECT USING (
    -- Simpiller admins can view all facilities
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Organization admins can view facilities in their organization
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.organization_id = facilities.organization_id
      AND ur.name = 'organization_admin'
    )
  );

CREATE POLICY "Organization admins can create facilities in their organization" ON facilities
  FOR INSERT WITH CHECK (
    -- Simpiller admins can create facilities for any organization
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Organization admins can create facilities in their organization
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.organization_id = facilities.organization_id
      AND ur.name = 'organization_admin'
    )
  );

CREATE POLICY "Organization admins can update facilities in their organization" ON facilities
  FOR UPDATE USING (
    -- Simpiller admins can update all facilities
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Organization admins can update facilities in their organization
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.organization_id = facilities.organization_id
      AND ur.name = 'organization_admin'
    )
  );

CREATE POLICY "Organization admins can delete facilities in their organization" ON facilities
  FOR DELETE USING (
    -- Simpiller admins can delete all facilities
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Organization admins can delete facilities in their organization
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.organization_id = facilities.organization_id
      AND ur.name = 'organization_admin'
    )
  );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Organizations
CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Facilities
CREATE INDEX idx_facilities_organization ON facilities(organization_id);
CREATE INDEX idx_facilities_active ON facilities(is_active);

-- Pharmacies
CREATE INDEX idx_pharmacies_organization ON pharmacies(organization_id);
CREATE INDEX idx_pharmacies_npi ON pharmacies(npi);
CREATE INDEX idx_pharmacies_active ON pharmacies(is_active);
CREATE INDEX idx_pharmacies_partner ON pharmacies(is_partner);
CREATE INDEX idx_pharmacies_default ON pharmacies(is_default);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_npi ON users(npi);
CREATE INDEX idx_users_active ON users(is_active);

-- Patients
CREATE INDEX idx_patients_organization ON patients(organization_id);
CREATE INDEX idx_patients_facility ON patients(facility_id);
CREATE INDEX idx_patients_provider ON patients(assigned_provider_id);
CREATE INDEX idx_patients_pharmacy ON patients(assigned_pharmacy_id);
CREATE INDEX idx_patients_alt_id ON patients(patient_id_alt);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_active ON patients(is_active);

-- Medications
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_medications_prescribed_by ON medications(prescribed_by_id);
CREATE INDEX idx_medications_status ON medications(status);
CREATE INDEX idx_medications_last_dose ON medications(last_dose_at);

-- Medication Logs
CREATE INDEX idx_medication_logs_patient ON medication_logs(patient_id);
CREATE INDEX idx_medication_logs_medication ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_event_date ON medication_logs(event_date);
CREATE INDEX idx_medication_logs_status ON medication_logs(status);

-- Alerts
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_scheduled_time ON alerts(scheduled_time);
CREATE INDEX idx_alerts_status ON alerts(status);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medication_schedules_updated_at BEFORE UPDATE ON medication_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional)
-- =============================================

-- Insert sample organization
INSERT INTO organizations (name, subdomain, acronym, brand_name) 
VALUES ('Sample Healthcare Organization', 'sample', 'SHO', 'Sample Health');

-- Insert sample facility
INSERT INTO facilities (organization_id, name, code) 
VALUES ((SELECT id FROM organizations WHERE subdomain = 'sample'), 'Main Clinic', 'MC001');

-- Insert sample user roles
INSERT INTO user_roles (name, organization_id) VALUES 
('organization_admin', (SELECT id FROM organizations WHERE subdomain = 'sample')),
('provider', (SELECT id FROM organizations WHERE subdomain = 'sample')),
('billing', (SELECT id FROM organizations WHERE subdomain = 'sample')); 