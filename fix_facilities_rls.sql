-- Fix facilities RLS policies - add INSERT permission for organization admins
-- This allows organization admins to create facilities for their organization

-- Enable RLS on facilities table if not already enabled
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy for organization admins
-- Organization admins can create facilities for their organization
CREATE POLICY "Organization admins can create facilities for their organization" ON facilities
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.user_role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.organization_id = facilities.organization_id
    AND ur.role = 'organization_admin'
  )
);

-- Add INSERT policy for Simpiller admins (they can create facilities for any organization)
CREATE POLICY "Simpiller admins can create facilities for any organization" ON facilities
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.user_role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.role = 'simpiller_admin'
  )
);

-- Verify the policies
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
