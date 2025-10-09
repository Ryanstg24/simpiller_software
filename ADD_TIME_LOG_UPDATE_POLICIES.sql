-- RLS Policies for Time Log Updates
-- These policies allow Organization Admins and Simpiller Admins to update time logs

-- 1. Organization Admins can update time logs for their organization
CREATE POLICY "Organization admins can update time logs" ON provider_time_logs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id = (
      SELECT organization_id FROM patients 
      WHERE id = provider_time_logs.patient_id
    )
  )
);

-- 2. Simpiller Admins can update all time logs
CREATE POLICY "Simpiller admins can update all time logs" ON provider_time_logs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
);

-- 3. Optional: Organization Admins can insert time logs for their organization
CREATE POLICY "Organization admins can insert time logs" ON provider_time_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id = (
      SELECT organization_id FROM patients 
      WHERE id = provider_time_logs.patient_id
    )
  )
);

-- 4. Optional: Simpiller Admins can insert time logs for any patient
CREATE POLICY "Simpiller admins can insert time logs" ON provider_time_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
);

-- 5. Optional: Organization Admins can delete time logs for their organization
CREATE POLICY "Organization admins can delete time logs" ON provider_time_logs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id = (
      SELECT organization_id FROM patients 
      WHERE id = provider_time_logs.patient_id
    )
  )
);

-- 6. Optional: Simpiller Admins can delete all time logs
CREATE POLICY "Simpiller admins can delete all time logs" ON provider_time_logs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
);
