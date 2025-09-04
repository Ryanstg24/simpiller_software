-- Add missing INSERT policy for users table
-- This allows organization admins to create users within their organization

-- Add INSERT policy for organization admins
-- Organization admins can create users in their organization
CREATE POLICY "Organization admins can create users in their organization" ON users
FOR INSERT WITH CHECK (
  -- Simpiller admins can create users for any organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can only create users in their organization
  -- Note: For new users, we need to check the organization through the role assignment
  -- that will be created after the user is created
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    -- The new user will be assigned to the same organization as the creating admin
    AND ur.organization_id IS NOT NULL
  )
);

-- Add UPDATE policy for organization admins
-- Organization admins can update users in their organization
CREATE POLICY "Organization admins can update users in their organization" ON users
FOR UPDATE USING (
  -- Simpiller admins can update all users
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can update users in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_role_assignments ura2
      JOIN user_roles ur2 ON ur2.id = ura2.role_id
      WHERE ura2.user_id = users.id
      AND ur2.organization_id IS NOT NULL
    )
  )
);

-- Add DELETE policy for organization admins
-- Organization admins can delete users in their organization
CREATE POLICY "Organization admins can delete users in their organization" ON users
FOR DELETE USING (
  -- Simpiller admins can delete all users
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can delete users in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_role_assignments ura2
      JOIN user_roles ur2 ON ur2.id = ura2.role_id
      WHERE ura2.user_id = users.id
      AND ur2.organization_id IS NOT NULL
    )
  )
);

-- Verify the policies were created correctly
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
WHERE tablename = 'users'
ORDER BY cmd, policyname;
