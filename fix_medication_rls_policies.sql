-- Fix RLS policies for medications table using correct table relationships
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view medications for patients in their organization" ON medications;
DROP POLICY IF EXISTS "Users can insert medications for patients in their organization" ON medications;
DROP POLICY IF EXISTS "Users can update medications for patients in their organization" ON medications;
DROP POLICY IF EXISTS "Users can delete medications for patients in their organization" ON medications;

-- Create corrected RLS policies for medications table
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
