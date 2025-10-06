-- Debug: Check current policies on medication_scan_sessions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'medication_scan_sessions';

-- Test query as authenticated user
-- Replace YOUR_USER_ID and YOUR_PATIENT_ID with actual values
-- SELECT * FROM medication_scan_sessions 
-- WHERE patient_id = 'YOUR_PATIENT_ID' 
-- LIMIT 1;
