-- COMPREHENSIVE DEBUGGING FOR SCAN SESSIONS 400 ERROR
-- Run each section separately to diagnose the issue

-- ============================================
-- SECTION 1: Check Current User and Roles
-- ============================================
SELECT 'Current User ID:' as check_type, auth.uid() as value;

SELECT 
  'User Roles:' as check_type,
  ura.user_id,
  ur.name as role_name,
  ur.organization_id,
  ur.facility_id
FROM user_role_assignments ura
JOIN user_roles ur ON ur.id = ura.role_id
WHERE ura.user_id = auth.uid();

-- ============================================
-- SECTION 2: Check All Policies on medication_scan_sessions
-- ============================================
SELECT 
  'Policies:' as check_type,
  policyname,
  cmd,
  roles,
  permissive,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;

-- ============================================
-- SECTION 3: Check if RLS is Enabled
-- ============================================
SELECT 
  'RLS Status:' as check_type,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'medication_scan_sessions';

-- ============================================
-- SECTION 4: Test if ANY scan sessions exist
-- ============================================
-- This bypasses RLS to see if data exists at all
-- (Will only work if you're using service role or RLS is disabled)
SELECT 'Total Scan Sessions:' as check_type, COUNT(*) as count
FROM medication_scan_sessions;

-- ============================================
-- SECTION 5: Test Direct Query (Same as App)
-- ============================================
-- Replace this patient_id with your actual patient ID
-- This will show if the RLS policy is blocking or if there's no data
SELECT 
  'Direct Query Result:' as check_type,
  id,
  patient_id,
  status,
  scheduled_time
FROM medication_scan_sessions
WHERE patient_id = '6e176c8f-0e14-420f-a9e8-ec887ba8ae61' -- Replace with your patient ID
ORDER BY scheduled_time DESC
LIMIT 5;

-- ============================================
-- SECTION 6: Test Policy Logic for Simpiller Admin
-- ============================================
-- Check if you're a simpiller_admin
SELECT 
  'Is Simpiller Admin:' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    ) THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- ============================================
-- SECTION 7: Test Policy Logic for Org Admin
-- ============================================
-- Replace patient_id with your actual patient ID
SELECT 
  'Is Org Admin for Patient:' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = '6e176c8f-0e14-420f-a9e8-ec887ba8ae61' -- Replace with your patient ID
      AND ur.name = 'organization_admin'
      AND p.organization_id = ur.organization_id
    ) THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- ============================================
-- SECTION 8: Test Policy Logic for Provider
-- ============================================
SELECT 
  'Is Provider for Patient:' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = '6e176c8f-0e14-420f-a9e8-ec887ba8ae61' -- Replace with your patient ID
      AND p.assigned_provider_id = auth.uid()
    ) THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- ============================================
-- SECTION 9: Test Medications Query (Working Comparison)
-- ============================================
-- This should work - use it to compare
SELECT 
  'Medications Query:' as check_type,
  COUNT(*) as count
FROM medications
WHERE patient_id = '6e176c8f-0e14-420f-a9e8-ec887ba8ae61' -- Replace with your patient ID
AND status = 'active';

-- ============================================
-- SECTION 10: Check if Scan Sessions Exist for Patient
-- ============================================
SELECT 
  'Scan Sessions for Patient:' as check_type,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM medication_scan_sessions
WHERE patient_id = '6e176c8f-0e14-420f-a9e8-ec887ba8ae61'; -- Replace with your patient ID
