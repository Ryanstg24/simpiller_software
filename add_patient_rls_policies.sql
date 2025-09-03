-- Add comprehensive RLS policies for patients table
-- This allows providers to create patients, org admins to manage their org's patients, and Simpiller admins to access all

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization admins can read patients in their org" ON patients;
DROP POLICY IF EXISTS "Providers can read their assigned patients" ON patients;
DROP POLICY IF EXISTS "Simpiller admins can read all patients" ON patients;

-- SELECT policies (read access)
CREATE POLICY "Organization admins can read patients in their org" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
      AND ur.organization_id = patients.organization_id
    )
  );

CREATE POLICY "Providers can read their assigned patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'provider'
      AND (
        ur.organization_id = patients.organization_id
        OR patients.assigned_provider_id = auth.uid()
      )
    )
  );

CREATE POLICY "Simpiller admins can read all patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
  );

-- INSERT policies (create access)
CREATE POLICY "Organization admins can create patients in their org" ON patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
      AND ur.organization_id = patients.organization_id
    )
  );

CREATE POLICY "Providers can create patients in their org" ON patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'provider'
      AND ur.organization_id = patients.organization_id
    )
  );

CREATE POLICY "Simpiller admins can create patients anywhere" ON patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
  );

-- UPDATE policies (edit access)
CREATE POLICY "Organization admins can update patients in their org" ON patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
      AND ur.organization_id = patients.organization_id
    )
  );

CREATE POLICY "Providers can update their assigned patients" ON patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'provider'
      AND (
        ur.organization_id = patients.organization_id
        OR patients.assigned_provider_id = auth.uid()
      )
    )
  );

CREATE POLICY "Simpiller admins can update all patients" ON patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
  );

-- DELETE policies (remove access)
CREATE POLICY "Organization admins can delete patients in their org" ON patients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
      AND ur.organization_id = patients.organization_id
    )
  );

CREATE POLICY "Simpiller admins can delete all patients" ON patients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
  );
