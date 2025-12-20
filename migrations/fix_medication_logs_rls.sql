-- Fix RLS policy for medication_logs
-- This policy is simple: if the user can SELECT patients, they can SELECT medication_logs
-- No org checks, no rtm_status checks, no role logic - just check if patient exists
-- This ensures consistency: if a patient is visible, their logs are visible

-- Drop the existing complex policy
DROP POLICY IF EXISTS "Organization admins can view organization medication logs" ON medication_logs;
DROP POLICY IF EXISTS "logs_visible_if_patient_visible" ON medication_logs;

-- Create the simple policy
CREATE POLICY "logs_visible_if_patient_visible"
ON medication_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM patients
    WHERE patients.id = medication_logs.patient_id
  )
);

-- Note: This policy relies on the patients table RLS to enforce access control.
-- If a user can see a patient (via patients RLS), they can see that patient's logs.
-- If this policy seems too permissive, the issue is with the patients RLS, not this policy.

