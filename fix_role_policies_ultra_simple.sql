-- Ultra-simple fix: Just allow organization admins to manage role assignments
-- This avoids all circular dependency issues

-- Drop all existing policies on user_role_assignments
DROP POLICY IF EXISTS "Organization admins can assign roles to users in their organization" ON user_role_assignments;
DROP POLICY IF EXISTS "Organization admins can update role assignments in their organization" ON user_role_assignments;
DROP POLICY IF EXISTS "Organization admins can delete role assignments in their organization" ON user_role_assignments;

-- Create very simple policies that use the existing functions
-- These functions already exist and work (is_simpiller_admin, is_organization_admin)

-- INSERT policy - allow organization admins to create role assignments
CREATE POLICY "Allow organization admins to create role assignments" ON user_role_assignments
FOR INSERT WITH CHECK (
  is_simpiller_admin() OR is_organization_admin()
);

-- UPDATE policy - allow organization admins to update role assignments  
CREATE POLICY "Allow organization admins to update role assignments" ON user_role_assignments
FOR UPDATE USING (
  is_simpiller_admin() OR is_organization_admin()
);

-- DELETE policy - allow organization admins to delete role assignments
CREATE POLICY "Allow organization admins to delete role assignments" ON user_role_assignments
FOR DELETE USING (
  is_simpiller_admin() OR is_organization_admin()
);

-- Verify the policies were created
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
WHERE tablename = 'user_role_assignments'
ORDER BY cmd, policyname;
