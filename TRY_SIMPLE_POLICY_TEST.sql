-- SIMPLE POLICY TEST
-- This drops the complex policy and creates a very simple one
-- If this works, we know the issue is with the policy complexity

-- Step 1: Drop the current policy
DROP POLICY IF EXISTS "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions;

-- Step 2: Create the SIMPLEST possible policy for authenticated users
CREATE POLICY "Test: All authenticated can view all sessions" ON medication_scan_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 3: Verify it was created
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;

-- Step 4: Test the query
-- Replace with your patient ID
SELECT COUNT(*) as count
FROM medication_scan_sessions
WHERE patient_id = '6e176c8f-0e14-420f-a9e8-ec887ba8ae61';

-- ============================================
-- IF THIS WORKS (app loads adherence logs):
-- Then the issue is with the complex policy logic
-- We can then gradually add complexity to find the problem
--
-- IF THIS DOESN'T WORK:
-- Then the issue is NOT with the policy itself
-- It might be:
-- - Auth token issue
-- - Supabase client configuration
-- - Something else entirely
-- ============================================
