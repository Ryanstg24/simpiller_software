-- Fix the facilities INSERT policy to properly restrict organization admins
-- to only create facilities for their own organization

-- First, drop the existing problematic INSERT policy
DROP POLICY IF EXISTS "Organization admins can create facilities in their organization" ON facilities;

-- Create the corrected INSERT policy with proper WITH CHECK clause
CREATE POLICY "Organization admins can create facilities in their organization" ON facilities
FOR INSERT WITH CHECK (
  -- Simpiller admins can create facilities for any organization
  is_simpiller_admin()
  OR
  -- Organization admins can only create facilities for their organization
  (
    is_organization_admin() 
    AND 
    -- Ensure the facility being created belongs to their organization
    organization_id IN (
      SELECT organization_id 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
    )
  )
);

-- Verify the policy was created correctly
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
AND cmd = 'INSERT'
ORDER BY policyname;
