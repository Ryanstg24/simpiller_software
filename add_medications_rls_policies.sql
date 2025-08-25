-- Add RLS policies for medications table
-- This fixes the "Failed to create medication" error

-- RLS Policies for medications table
CREATE POLICY "Users can view medications for patients in their organization" ON medications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = medications.patient_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert medications for patients in their organization" ON medications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = medications.patient_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update medications for patients in their organization" ON medications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = medications.patient_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete medications for patients in their organization" ON medications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = medications.patient_id
      AND ur.user_id = auth.uid()
    )
  );
