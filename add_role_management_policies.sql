-- Add missing INSERT policies for role management tables
-- This allows organization admins to create and assign roles within their organization

-- =============================================
-- USER_ROLES TABLE POLICIES
-- =============================================

-- Add INSERT policy for user_roles table
-- Organization admins can create roles in their organization
CREATE POLICY "Organization admins can create roles in their organization" ON user_roles
FOR INSERT WITH CHECK (
  -- Simpiller admins can create roles for any organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can only create roles in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id = user_roles.organization_id
  )
);

-- Add UPDATE policy for user_roles table
-- Organization admins can update roles in their organization
CREATE POLICY "Organization admins can update roles in their organization" ON user_roles
FOR UPDATE USING (
  -- Simpiller admins can update all roles
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can update roles in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id = user_roles.organization_id
  )
);

-- Add DELETE policy for user_roles table
-- Organization admins can delete roles in their organization
CREATE POLICY "Organization admins can delete roles in their organization" ON user_roles
FOR DELETE USING (
  -- Simpiller admins can delete all roles
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can delete roles in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id = user_roles.organization_id
  )
);

-- =============================================
-- USER_ROLE_ASSIGNMENTS TABLE POLICIES
-- =============================================

-- Add INSERT policy for user_role_assignments table
-- Organization admins can assign roles to users in their organization
CREATE POLICY "Organization admins can assign roles to users in their organization" ON user_role_assignments
FOR INSERT WITH CHECK (
  -- Simpiller admins can assign any roles
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can only assign roles within their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_roles ur2
      WHERE ur2.id = user_role_assignments.role_id
      AND ur2.organization_id IS NOT NULL
    )
  )
);

-- Add UPDATE policy for user_role_assignments table
-- Organization admins can update role assignments in their organization
CREATE POLICY "Organization admins can update role assignments in their organization" ON user_role_assignments
FOR UPDATE USING (
  -- Simpiller admins can update all role assignments
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can update role assignments in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_roles ur2
      WHERE ur2.id = user_role_assignments.role_id
      AND ur2.organization_id IS NOT NULL
    )
  )
);

-- Add DELETE policy for user_role_assignments table
-- Organization admins can delete role assignments in their organization
CREATE POLICY "Organization admins can delete role assignments in their organization" ON user_role_assignments
FOR DELETE USING (
  -- Simpiller admins can delete all role assignments
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'simpiller_admin'
  )
  OR
  -- Organization admins can delete role assignments in their organization
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND ur.name = 'organization_admin'
    AND ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_roles ur2
      WHERE ur2.id = user_role_assignments.role_id
      AND ur2.organization_id IS NOT NULL
    )
  )
);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify user_roles policies
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
WHERE tablename = 'user_roles'
ORDER BY cmd, policyname;

-- Verify user_role_assignments policies
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
