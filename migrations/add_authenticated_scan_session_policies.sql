-- Migration: Add authenticated user policies for medication_scan_sessions
-- The existing policies are for public (unauthenticated) access via QR codes
-- We need additional policies for authenticated users (admins, providers)

-- First, drop the policy if it exists (in case it was created incorrectly before)
DROP POLICY IF EXISTS "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions;

-- Add policy for authenticated users to view scan sessions for their patients
-- Using EXISTS pattern (same as medications table policies - this pattern is proven to work!)
CREATE POLICY "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions
  FOR SELECT
  TO authenticated
  USING (
    -- Simpiller admins can view all scan sessions
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Organization admins can view scan sessions for patients in their organization
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = medication_scan_sessions.patient_id
      AND ur.name = 'organization_admin'
      AND p.organization_id = ur.organization_id
    )
    OR
    -- Providers can view scan sessions for their assigned patients
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_scan_sessions.patient_id
      AND p.assigned_provider_id = auth.uid()
    )
  );

-- Verify all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;
