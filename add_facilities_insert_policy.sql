-- Add missing INSERT policy for facilities table
-- This allows organization admins to create facilities for their organization

-- First, let's check the current table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_role_assignments'
ORDER BY ordinal_position;

-- Check if the table structure matches what we expect
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Add the INSERT policy for facilities
-- Organization admins can create facilities in their organization
CREATE POLICY "Organization admins can create facilities in their organization" ON facilities
FOR INSERT WITH CHECK (
  -- Simpiller admins can create facilities for any organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can create facilities in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.organization_id = facilities.organization_id
    AND ur.name = 'organization_admin'
  )
);

-- Verify the policy was created
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
WHERE tablename = 'facilities'
ORDER BY policyname;
