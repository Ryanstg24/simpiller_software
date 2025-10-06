-- TEST: Drop the policy we just created and try a simpler one
DROP POLICY IF EXISTS "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions;

-- Create a VERY simple policy for testing - allows all authenticated users
-- (We'll make it more restrictive once we confirm it works)
CREATE POLICY "Authenticated users can view all scan sessions" ON medication_scan_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify
SELECT policyname, cmd, roles, permissive
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;
